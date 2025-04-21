// batch-job-tracker.js - Track and manage batch jobs across different states
const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

// File paths for batch job tracking
const BATCH_SUBMITTED_PATH = path.join(process.cwd(), 'SCRAPI', 'a-job-scheduling', 'batch-submitted.json');
const BATCH_IN_PROGRESS_PATH = path.join(process.cwd(), 'SCRAPI', 'a-job-scheduling', 'batch-in-progress.json');
const BATCH_COMPLETED_PATH = path.join(process.cwd(), 'SCRAPI', 'a-job-scheduling', 'batch-completed.json');
const BATCH_BACKUP_PATH = path.join(process.cwd(), 'SCRAPI', 'a-job-scheduling', 'batch-submitted-backup.json');

// Directory for logs
const LOGS_DIR = path.join(process.cwd(), 'SCRAPI', 'output-staging', 'logs');
if (!fs.existsSync(LOGS_DIR)) {
  fs.mkdirSync(LOGS_DIR, { recursive: true });
}

// Log file for batch job tracker
const TRACKER_LOG_FILE = path.join(LOGS_DIR, `batch-job-tracker-${new Date().toISOString().replace(/[:.]/g, '-')}.log`);

/**
 * Log message to both console and file
 * @param {string} message - Message to log
 */
function log(message) {
  const timestamp = new Date().toISOString();
  const logMessage = `[${timestamp}] ${message}`;
  
  console.log(logMessage);
  fs.appendFileSync(TRACKER_LOG_FILE, logMessage + '\n');
}

/**
 * Initialize batch tracking files if they don't exist
 */
function initializeTrackingFiles() {
  log('Initializing batch tracking files...');
  
  const emptyBatch = { queries: [] };
  
  // Create batch-submitted.json if it doesn't exist
  if (!fs.existsSync(BATCH_SUBMITTED_PATH)) {
    fs.writeFileSync(BATCH_SUBMITTED_PATH, JSON.stringify(emptyBatch, null, 2));
    log(`Created ${BATCH_SUBMITTED_PATH}`);
  }
  
  // Create batch-in-progress.json if it doesn't exist
  if (!fs.existsSync(BATCH_IN_PROGRESS_PATH)) {
    fs.writeFileSync(BATCH_IN_PROGRESS_PATH, JSON.stringify(emptyBatch, null, 2));
    log(`Created ${BATCH_IN_PROGRESS_PATH}`);
  }
  
  // Create batch-completed.json if it doesn't exist
  if (!fs.existsSync(BATCH_COMPLETED_PATH)) {
    fs.writeFileSync(BATCH_COMPLETED_PATH, JSON.stringify(emptyBatch, null, 2));
    log(`Created ${BATCH_COMPLETED_PATH}`);
  }
  
  // Create batch-submitted-backup.json if it doesn't exist
  if (!fs.existsSync(BATCH_BACKUP_PATH)) {
    fs.writeFileSync(BATCH_BACKUP_PATH, JSON.stringify(emptyBatch, null, 2));
    log(`Created ${BATCH_BACKUP_PATH}`);
  }
  
  log('Batch tracking files initialized');
}

/**
 * Load batch data from a file
 * @param {string} filePath - Path to the batch file
 * @returns {Object} - Batch data
 */
function loadBatchFile(filePath) {
  try {
    if (!fs.existsSync(filePath)) {
      return { queries: [] };
    }
    
    const data = fs.readFileSync(filePath, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    log(`❌ Error loading batch file ${filePath}: ${error.message}`);
    return { queries: [] };
  }
}

/**
 * Save batch data to a file
 * @param {string} filePath - Path to the batch file
 * @param {Object} data - Batch data to save
 */
function saveBatchFile(filePath, data) {
  try {
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
    log(`Saved batch file: ${filePath}`);
  } catch (error) {
    log(`❌ Error saving batch file ${filePath}: ${error.message}`);
  }
}

/**
 * Move a job from submitted to in-progress
 * @param {string} jobId - The job ID to move
 * @returns {boolean} - Whether the job was moved successfully
 */
function moveJobToInProgress(jobId) {
  log(`Moving job ${jobId} to in-progress...`);
  
  // Load batch files
  const submitted = loadBatchFile(BATCH_SUBMITTED_PATH);
  const inProgress = loadBatchFile(BATCH_IN_PROGRESS_PATH);
  
  // Find the job in submitted
  const jobIndex = submitted.queries.findIndex(job => job.id === jobId);
  
  if (jobIndex === -1) {
    log(`❌ Job ${jobId} not found in submitted batch`);
    return false;
  }
  
  // Move the job to in-progress
  const job = submitted.queries[jobIndex];
  inProgress.queries.push(job);
  submitted.queries.splice(jobIndex, 1);
  
  // Save batch files
  saveBatchFile(BATCH_SUBMITTED_PATH, submitted);
  saveBatchFile(BATCH_IN_PROGRESS_PATH, inProgress);
  
  // Update backup file
  saveBatchFile(BATCH_BACKUP_PATH, submitted);
  
  log(`✅ Job ${jobId} moved to in-progress`);
  return true;
}

/**
 * Move a job from in-progress to completed
 * @param {string} jobId - The job ID to move
 * @returns {boolean} - Whether the job was moved successfully
 */
function moveJobToCompleted(jobId) {
  log(`Moving job ${jobId} to completed...`);
  
  // Load batch files
  const inProgress = loadBatchFile(BATCH_IN_PROGRESS_PATH);
  const completed = loadBatchFile(BATCH_COMPLETED_PATH);
  
  // Find the job in in-progress
  const jobIndex = inProgress.queries.findIndex(job => job.id === jobId);
  
  if (jobIndex === -1) {
    log(`❌ Job ${jobId} not found in in-progress batch`);
    return false;
  }
  
  // Move the job to completed
  const job = inProgress.queries[jobIndex];
  job.completed_at = new Date().toISOString();
  completed.queries.push(job);
  inProgress.queries.splice(jobIndex, 1);
  
  // Save batch files
  saveBatchFile(BATCH_IN_PROGRESS_PATH, inProgress);
  saveBatchFile(BATCH_COMPLETED_PATH, completed);
  
  log(`✅ Job ${jobId} moved to completed`);
  return true;
}

/**
 * Get batch job statistics
 * @returns {Object} - Batch job statistics
 */
function getBatchJobStats() {
  log('Getting batch job statistics...');
  
  // Load batch files
  const submitted = loadBatchFile(BATCH_SUBMITTED_PATH);
  const inProgress = loadBatchFile(BATCH_IN_PROGRESS_PATH);
  const completed = loadBatchFile(BATCH_COMPLETED_PATH);
  
  // Calculate statistics
  const stats = {
    submitted: submitted.queries.length,
    inProgress: inProgress.queries.length,
    completed: completed.queries.length,
    total: submitted.queries.length + inProgress.queries.length + completed.queries.length
  };
  
  log(`Batch job statistics: ${JSON.stringify(stats)}`);
  return stats;
}

/**
 * Display batch job status
 */
function displayBatchJobStatus() {
  log('Displaying batch job status...');
  
  // Load batch files
  const submitted = loadBatchFile(BATCH_SUBMITTED_PATH);
  const inProgress = loadBatchFile(BATCH_IN_PROGRESS_PATH);
  const completed = loadBatchFile(BATCH_COMPLETED_PATH);
  
  // Calculate statistics
  const stats = getBatchJobStats();
  
  // Display header
  console.log('\n=======================================================');
  console.log('               BATCH JOB STATUS                       ');
  console.log('=======================================================');
  console.log(`Generated at: ${new Date().toLocaleString()}`);
  console.log(`Total Jobs: ${stats.total}`);
  console.log('=======================================================\n');
  
  // Display statistics
  console.log('BATCH JOB STATISTICS:');
  console.log('--------------------');
  console.log(`Submitted: ${stats.submitted}`);
  console.log(`In Progress: ${stats.inProgress}`);
  console.log(`Completed: ${stats.completed}`);
  console.log(`Total: ${stats.total}`);
  
  // Display submitted jobs
  console.log('\n=======================================================');
  console.log('SUBMITTED JOBS:');
  console.log('=======================================================');
  
  if (submitted.queries.length === 0) {
    console.log('No submitted jobs');
  } else {
    submitted.queries.forEach((job, index) => {
      console.log(`${index + 1}. Job ID: ${job.id}`);
      console.log(`   Query: "${job.query}"`);
      console.log(`   Location: ${job.geo_location || 'N/A'}`);
      console.log(`   Result URL: ${job.resultUrl || 'N/A'}`);
      console.log('-------------------------------------------------------');
    });
  }
  
  // Display in-progress jobs
  console.log('\n=======================================================');
  console.log('IN-PROGRESS JOBS:');
  console.log('=======================================================');
  
  if (inProgress.queries.length === 0) {
    console.log('No in-progress jobs');
  } else {
    inProgress.queries.forEach((job, index) => {
      console.log(`${index + 1}. Job ID: ${job.id}`);
      console.log(`   Query: "${job.query}"`);
      console.log(`   Location: ${job.geo_location || 'N/A'}`);
      console.log(`   Result URL: ${job.resultUrl || 'N/A'}`);
      console.log('-------------------------------------------------------');
    });
  }
  
  // Display completed jobs
  console.log('\n=======================================================');
  console.log('COMPLETED JOBS:');
  console.log('=======================================================');
  
  if (completed.queries.length === 0) {
    console.log('No completed jobs');
  } else {
    // Show only the 10 most recent completed jobs
    const recentCompleted = completed.queries
      .sort((a, b) => new Date(b.completed_at || 0) - new Date(a.completed_at || 0))
      .slice(0, 10);
    
    recentCompleted.forEach((job, index) => {
      const completedAt = job.completed_at ? new Date(job.completed_at).toLocaleString() : 'N/A';
      
      console.log(`${index + 1}. Job ID: ${job.id}`);
      console.log(`   Query: "${job.query}"`);
      console.log(`   Location: ${job.geo_location || 'N/A'}`);
      console.log(`   Completed: ${completedAt}`);
      console.log(`   Result URL: ${job.resultUrl || 'N/A'}`);
      console.log('-------------------------------------------------------');
    });
    
    if (completed.queries.length > 10) {
      console.log(`... and ${completed.queries.length - 10} more completed jobs`);
    }
  }
  
  // Display footer with commands
  console.log('\n=======================================================');
  console.log('COMMANDS:');
  console.log('=======================================================');
  console.log('To move a job to in-progress:');
  console.log('  node SCRAPI/e-job-management/batch-job-tracker.js move-to-progress <job_id>');
  console.log('\nTo move a job to completed:');
  console.log('  node SCRAPI/e-job-management/batch-job-tracker.js move-to-completed <job_id>');
  console.log('\nTo view batch job status:');
  console.log('  node SCRAPI/e-job-management/batch-job-tracker.js status');
  console.log('=======================================================');
}

/**
 * Main function
 */
async function main() {
  log('🚀 Starting Batch Job Tracker');
  
  // Initialize tracking files
  initializeTrackingFiles();
  
  // Get command line arguments
  const command = process.argv[2];
  const jobId = process.argv[3];
  
  if (command === 'move-to-progress' && jobId) {
    // Move a job from submitted to in-progress
    const success = moveJobToInProgress(jobId);
    
    if (success) {
      log(`✅ Job ${jobId} moved to in-progress successfully`);
    } else {
      log(`❌ Failed to move job ${jobId} to in-progress`);
    }
  } else if (command === 'move-to-completed' && jobId) {
    // Move a job from in-progress to completed
    const success = moveJobToCompleted(jobId);
    
    if (success) {
      log(`✅ Job ${jobId} moved to completed successfully`);
    } else {
      log(`❌ Failed to move job ${jobId} to completed`);
    }
  } else if (command === 'status' || !command) {
    // Display batch job status
    displayBatchJobStatus();
  } else {
    // Invalid command
    console.log('Usage:');
    console.log('  node SCRAPI/e-job-management/batch-job-tracker.js                       - Display batch job status');
    console.log('  node SCRAPI/e-job-management/batch-job-tracker.js status                - Display batch job status');
    console.log('  node SCRAPI/e-job-management/batch-job-tracker.js move-to-progress <job_id>  - Move a job to in-progress');
    console.log('  node SCRAPI/e-job-management/batch-job-tracker.js move-to-completed <job_id> - Move a job to completed');
  }
}

// Run the main function if this file is executed directly
if (require.main === module) {
  main().catch(error => {
    log(`❌ Fatal error: ${error.message}`);
    process.exit(1);
  });
}

// Export functions for use in other modules
module.exports = {
  initializeTrackingFiles,
  moveJobToInProgress,
  moveJobToCompleted,
  getBatchJobStats,
  displayBatchJobStatus
};