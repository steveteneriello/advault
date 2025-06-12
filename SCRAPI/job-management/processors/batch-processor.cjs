// batch-processor.cjs - Modernized batch job processor
const fs = require('fs');
const path = require('path');
const axios = require('axios');
const { spawn } = require('child_process');

// Import our modular components
const { Logger } = require('../../utils/logging/logger.cjs');
const { ErrorHandler } = require('../../utils/error-handling/error-handlers.cjs');
const { validateAllConfigs } = require('../../config/environment.cjs');

class BatchProcessor {
  constructor() {
    // Validate environment first
    const envValidation = validateAllConfigs();
    if (!envValidation.isValid) {
      throw new Error(`Environment validation failed: ${envValidation.errors.join(', ')}`);
    }

    this.logger = new Logger('BatchProcessor');
    this.errorHandler = new ErrorHandler();
    
    // Oxylabs credentials
    this.username = process.env.OXYLABS_USERNAME;
    this.password = process.env.OXYLABS_PASSWORD;
    
    // File paths
    this.inputFile = path.join(__dirname, '../../a-job-scheduling/batch-submitted.json');
    this.inProgressFile = path.join(__dirname, '../../a-job-scheduling/batch-in-progress.json');
    this.completedFile = path.join(__dirname, '../../a-job-scheduling/batch-completed.json');
    this.backupFile = path.join(__dirname, '../../a-job-scheduling/batch-submitted-backup.json');
    this.outputDir = path.join(__dirname, '../../output-staging/scraper-results');
    
    // Ensure output directory exists
    if (!fs.existsSync(this.outputDir)) {
      fs.mkdirSync(this.outputDir, { recursive: true });
    }
  }

  extractLocationFromQuery(query) {
    const match = query.match(/in (.*?, .*?, United States)$/);
    return match ? match[1] : 'United States';
  }

  async runAdvaultAutomation(query, location) {
    return new Promise((resolve) => {
      this.logger.log(`🚀 Running automation for: "${query}" in "${location}"`);
      
      const proc = spawn('node', [
        path.join(__dirname, '../../d-automations/2-advault-process/a-advault-automation-master.js'),
        query,
        location
      ], {
        stdio: 'inherit'
      });
      
      proc.on('close', (code) => {
        if (code === 0) {
          this.logger.log(`✅ Automation complete: "${query}"`);
        } else {
          this.logger.error(`❌ Automation failed: "${query}" (code ${code})`);
        }
        resolve();
      });
    });
  }

  async fetchParsedResults(job) {
    const jobId = job.id;
    const query = job.query;
    const location = this.extractLocationFromQuery(query);

    this.logger.log(`⏳ Fetching parsed results for job ${jobId}: "${query}"`);

    const url = `https://data.oxylabs.io/v1/queries/${jobId}/results?type=parsed`;
    
    for (let attempt = 1; attempt <= 15; attempt++) {
      try {
        this.logger.log(`📡 Attempt ${attempt}: Fetching results for job ${jobId}`);

        const response = await axios.get(url, {
          timeout: 20000,
          auth: { 
            username: this.username, 
            password: this.password 
          },
          httpsAgent: new (require('https').Agent)({ keepAlive: false })
        });

        if (response.status === 200 && response.data) {
          // Save results to file
          const resultFile = path.join(this.outputDir, `ads-results-${jobId}.json`);
          fs.writeFileSync(resultFile, JSON.stringify(response.data, null, 2));
          this.logger.log(`✅ Saved parsed data for: "${query}"`);
          
          // Run the automation pipeline
          await this.runAdvaultAutomation(query, location);
          
          // Move job to completed
          this.moveJobToCompleted(job);
          
          return true;
        }
      } catch (error) {
        this.logger.error(`❌ Error while fetching job ${jobId}: ${error.message}`);
      }

      await new Promise(resolve => setTimeout(resolve, 4000));
    }

    this.logger.error(`❌ Timed out fetching results for job ${jobId}`);
    return false;
  }

  moveJobToInProgress(job) {
    try {
      this.logger.log(`📋 Moving job ${job.id} to in-progress...`);
      
      // Read current files
      const batch = JSON.parse(fs.readFileSync(this.inputFile, 'utf-8'));
      const inProgress = fs.existsSync(this.inProgressFile) 
        ? JSON.parse(fs.readFileSync(this.inProgressFile, 'utf-8')) 
        : { queries: [] };
      
      // Find and remove job from batch
      const jobIndex = batch.queries.findIndex(j => j.id === job.id);
      if (jobIndex === -1) {
        this.logger.error(`❌ Job ${job.id} not found in batch-submitted.json`);
        return false;
      }
      
      // Add job to in-progress with timestamp
      const inProgressJob = { ...job, started_at: new Date().toISOString() };
      inProgress.queries.push(inProgressJob);
      
      // Remove job from batch
      batch.queries.splice(jobIndex, 1);
      
      // Save updated files
      fs.writeFileSync(this.inputFile, JSON.stringify(batch, null, 2));
      fs.writeFileSync(this.inProgressFile, JSON.stringify(inProgress, null, 2));
      fs.writeFileSync(this.backupFile, JSON.stringify(batch, null, 2));
      
      this.logger.log(`✅ Job ${job.id} moved to in-progress`);
      return true;
    } catch (error) {
      this.logger.error(`❌ Error moving job to in-progress: ${error.message}`);
      return false;
    }
  }

  moveJobToCompleted(job) {
    try {
      this.logger.log(`✅ Moving job ${job.id} to completed...`);
      
      // Read current files
      const inProgress = fs.existsSync(this.inProgressFile) 
        ? JSON.parse(fs.readFileSync(this.inProgressFile, 'utf-8')) 
        : { queries: [] };
      const completed = fs.existsSync(this.completedFile) 
        ? JSON.parse(fs.readFileSync(this.completedFile, 'utf-8')) 
        : { queries: [] };
      
      // Find and remove job from in-progress
      const jobIndex = inProgress.queries.findIndex(j => j.id === job.id);
      if (jobIndex === -1) {
        this.logger.error(`❌ Job ${job.id} not found in batch-in-progress.json`);
        return false;
      }
      
      // Add job to completed with timestamp
      const completedJob = { 
        ...job, 
        completed_at: new Date().toISOString(),
        processing_time_ms: job.started_at ? 
          new Date().getTime() - new Date(job.started_at).getTime() : null
      };
      completed.queries.push(completedJob);
      
      // Remove job from in-progress
      inProgress.queries.splice(jobIndex, 1);
      
      // Save updated files
      fs.writeFileSync(this.inProgressFile, JSON.stringify(inProgress, null, 2));
      fs.writeFileSync(this.completedFile, JSON.stringify(completed, null, 2));
      
      this.logger.log(`🎉 Job ${job.id} completed successfully`);
      return true;
    } catch (error) {
      this.logger.error(`❌ Error moving job to completed: ${error.message}`);
      return false;
    }
  }

  initializeFiles() {
    // Initialize tracking files if they don't exist
    if (!fs.existsSync(this.inProgressFile)) {
      fs.writeFileSync(this.inProgressFile, JSON.stringify({ queries: [] }, null, 2));
      this.logger.log(`📄 Created ${this.inProgressFile}`);
    }
    
    if (!fs.existsSync(this.completedFile)) {
      fs.writeFileSync(this.completedFile, JSON.stringify({ queries: [] }, null, 2));
      this.logger.log(`📄 Created ${this.completedFile}`);
    }
  }

  async processNextJob() {
    // Check for submitted jobs first
    if (fs.existsSync(this.inputFile)) {
      const batch = JSON.parse(fs.readFileSync(this.inputFile, 'utf-8'));
      
      if (batch.queries.length > 0) {
        // Create backup
        fs.copyFileSync(this.inputFile, this.backupFile);
        
        // Take the first job
        const job = batch.queries[0];
        this.logger.log(`🎯 Processing submitted job: "${job.query}"`);
        
        // Move to in-progress and process
        if (this.moveJobToInProgress(job)) {
          await this.fetchParsedResults(job);
          return true;
        }
      }
    }

    // Check for in-progress jobs
    if (fs.existsSync(this.inProgressFile)) {
      const inProgress = JSON.parse(fs.readFileSync(this.inProgressFile, 'utf-8'));
      
      if (inProgress.queries.length > 0) {
        const job = inProgress.queries[0];
        this.logger.log(`🔄 Retrying in-progress job: "${job.query}"`);
        
        await this.fetchParsedResults(job);
        return true;
      }
    }

    return false; // No jobs to process
  }

  async start() {
    this.logger.log('🚀 Starting Batch Processor...');
    this.initializeFiles();
    
    let consecutiveEmptyRuns = 0;
    const maxConsecutiveEmpty = 10; // After 10 empty runs, increase wait time

    while (true) {
      try {
        const processedJob = await this.processNextJob();
        
        if (processedJob) {
          consecutiveEmptyRuns = 0;
          this.logger.log('✅ Job processed, checking for next job...');
          
          // Short delay between jobs
          await new Promise(resolve => setTimeout(resolve, 5000));
        } else {
          consecutiveEmptyRuns++;
          
          // Dynamic wait time based on how long we've been idle
          const waitTime = consecutiveEmptyRuns > maxConsecutiveEmpty ? 120000 : 30000; // 2 minutes or 30 seconds
          
          this.logger.log(`📭 No jobs to process. Waiting ${waitTime/1000}s... (empty runs: ${consecutiveEmptyRuns})`);
          await new Promise(resolve => setTimeout(resolve, waitTime));
        }
      } catch (error) {
        this.logger.error(`❌ Batch processor error: ${error.message}`);
        
        // Wait before retrying after an error
        await new Promise(resolve => setTimeout(resolve, 10000));
      }
    }
  }

  // Graceful shutdown
  async stop() {
    this.logger.log('🛑 Stopping Batch Processor...');
    // Add any cleanup logic here
  }
}

// Export the class
module.exports = { BatchProcessor };

// If run directly, start the processor
if (require.main === module) {
  const processor = new BatchProcessor();
  
  // Handle graceful shutdown
  process.on('SIGINT', async () => {
    console.log('\n🛑 Received SIGINT, shutting down gracefully...');
    await processor.stop();
    process.exit(0);
  });
  
  processor.start().catch(error => {
    console.error('❌ Batch processor crashed:', error);
    process.exit(1);
  });
}
