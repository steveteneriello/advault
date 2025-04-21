// process-batch-jobs-from-oxylabs.js - Standalone version using axios
const fs = require('fs');
const path = require('path');
const axios = require('axios');
const { spawn } = require('child_process');
require('dotenv').config();

const username = process.env.OXYLABS_USERNAME;
const password = process.env.OXYLABS_PASSWORD;

const inputFile = path.join(__dirname, '../a-job-scheduling/batch-submitted.json');
const inProgressFile = path.join(__dirname, '../a-job-scheduling/batch-in-progress.json');
const completedFile = path.join(__dirname, '../a-job-scheduling/batch-completed.json');
const backupFile = path.join(__dirname, '../a-job-scheduling/batch-submitted-backup.json');
const outputDir = path.join(process.cwd(), 'SCRAPI', 'output-staging', 'scraper-results');

if (!username || !password) {
  console.error('❌ Missing Oxylabs credentials');
  process.exit(1);
}

if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

function extractLocationFromQuery(query) {
  const match = query.match(/in (.*?, .*?, United States)$/);
  return match ? match[1] : 'United States';
}

function runAdvaultAutomation(query, location) {
  return new Promise((resolve) => {
    const proc = spawn('node', ['SCRAPI/d-automations/2-advault-process/a-advault-automation-master.js', query, location], {
      stdio: 'inherit'
    });
    proc.on('close', (code) => {
      code === 0
        ? console.log(`✅ Automation complete: "${query}"`)
        : console.error(`❌ Automation failed: "${query}" (code ${code})`);
      resolve();
    });
  });
}

async function fetchParsedResults(job) {
  const jobId = job.id;
  const query = job.query;
  const location = extractLocationFromQuery(query);

  const url = `https://data.oxylabs.io/v1/queries/${jobId}/results?type=parsed`;
  console.log(`⏳ Fetching parsed results for job ${jobId}`);

  for (let attempt = 1; attempt <= 15; attempt++) {
    try {
      console.log(`📡 Attempt ${attempt}: Fetching results for job ${jobId}`);

      const response = await axios.get(url, {
        timeout: 20000,
        auth: { username, password },
        httpsAgent: new (require('https').Agent)({ keepAlive: false })
      });

      if (response.status === 200 && response.data) {
        fs.writeFileSync(path.join(outputDir, `ads-results-${jobId}.json`), JSON.stringify(response.data, null, 2));
        console.log(`✅ Saved parsed data: ${query}`);
        await runAdvaultAutomation(query, location);
        
        // Move job from in-progress to completed
        moveJobToCompleted(job);
        
        return true;
      }
    } catch (err) {
      console.error(`❌ Error while fetching job ${jobId}: ${err.message}`);
    }

    await new Promise(res => setTimeout(res, 4000));
  }

  console.error(`❌ Timed out fetching results for job ${jobId}`);
  return false;
}

function moveJobToInProgress(job) {
  console.log(`Moving job ${job.id} to in-progress...`);
  
  // Read the current files
  const batch = JSON.parse(fs.readFileSync(inputFile, 'utf-8'));
  const inProgress = fs.existsSync(inProgressFile) 
    ? JSON.parse(fs.readFileSync(inProgressFile, 'utf-8')) 
    : { queries: [] };
  
  // Find and remove the job from batch
  const jobIndex = batch.queries.findIndex(j => j.id === job.id);
  if (jobIndex === -1) {
    console.error(`❌ Job ${job.id} not found in batch-submitted.json`);
    return false;
  }
  
  // Add job to in-progress
  inProgress.queries.push(job);
  
  // Remove job from batch
  batch.queries.splice(jobIndex, 1);
  
  // Save the updated files
  fs.writeFileSync(inputFile, JSON.stringify(batch, null, 2));
  fs.writeFileSync(inProgressFile, JSON.stringify(inProgress, null, 2));
  fs.writeFileSync(backupFile, JSON.stringify(batch, null, 2));
  
  console.log(`✅ Job ${job.id} moved to in-progress`);
  return true;
}

function moveJobToCompleted(job) {
  console.log(`Moving job ${job.id} to completed...`);
  
  // Read the current files
  const inProgress = fs.existsSync(inProgressFile) 
    ? JSON.parse(fs.readFileSync(inProgressFile, 'utf-8')) 
    : { queries: [] };
  const completed = fs.existsSync(completedFile) 
    ? JSON.parse(fs.readFileSync(completedFile, 'utf-8')) 
    : { queries: [] };
  
  // Find and remove the job from in-progress
  const jobIndex = inProgress.queries.findIndex(j => j.id === job.id);
  if (jobIndex === -1) {
    console.error(`❌ Job ${job.id} not found in batch-in-progress.json`);
    return false;
  }
  
  // Add job to completed with timestamp
  const completedJob = { ...job, completed_at: new Date().toISOString() };
  completed.queries.push(completedJob);
  
  // Remove job from in-progress
  inProgress.queries.splice(jobIndex, 1);
  
  // Save the updated files
  fs.writeFileSync(inProgressFile, JSON.stringify(inProgress, null, 2));
  fs.writeFileSync(completedFile, JSON.stringify(completed, null, 2));
  
  console.log(`✅ Job ${job.id} moved to completed`);
  return true;
}

async function runBatchLoop() {
  // Initialize files if they don't exist
  if (!fs.existsSync(inProgressFile)) {
    fs.writeFileSync(inProgressFile, JSON.stringify({ queries: [] }, null, 2));
    console.log(`📄 Created ${inProgressFile}`);
  }
  
  if (!fs.existsSync(completedFile)) {
    fs.writeFileSync(completedFile, JSON.stringify({ queries: [] }, null, 2));
    console.log(`📄 Created ${completedFile}`);
  }

  while (true) {
    if (!fs.existsSync(inputFile)) {
      console.log('📭 No batch-submitted.json found. Retrying in 60s...');
      await new Promise(res => setTimeout(res, 60000));
      continue;
    }

    const batch = JSON.parse(fs.readFileSync(inputFile, 'utf-8'));
    const inProgress = fs.existsSync(inProgressFile)
      ? JSON.parse(fs.readFileSync(inProgressFile, 'utf-8'))
      : { queries: [] };

    if (!batch.queries.length && !inProgress.queries.length) {
      console.log('📭 No jobs to process. Waiting 60s...');
      await new Promise(res => setTimeout(res, 60000));
      continue;
    }

    // Process submitted jobs first
    if (batch.queries.length > 0) {
      fs.copyFileSync(inputFile, backupFile);
      console.log(`🧾 Backup created at ${backupFile}`);
      
      // Take the first job from the batch
      const job = batch.queries[0];
      console.log(`➡️ Processing: ${job.query}`);
      
      // Move job to in-progress
      moveJobToInProgress(job);
      
      // Process the job
      await fetchParsedResults(job);
    }
    
    // Process in-progress jobs
    if (inProgress.queries.length > 0) {
      const job = inProgress.queries[0];
      console.log(`🔄 Checking in-progress job: ${job.query}`);
      
      // Process the job
      await fetchParsedResults(job);
    }

    console.log(`✅ Completed batch cycle. Waiting 60s...`);
    await new Promise(res => setTimeout(res, 60000));
  }
}

runBatchLoop().catch(err => {
  console.error('❌ Batch processor crashed:', err);
  process.exit(1);
});