// batch-status-dashboard.js - Display status of batch jobs
const fs = require('fs');
const path = require('path');
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

// Log file for batch status dashboard
const DASHBOARD_LOG_FILE = path.join(LOGS_DIR, `batch-status-dashboard-${new Date().toISOString().replace(/[:.]/g, '-')}.log`);

/**
 * Log message to both console and file
 * @param {string} message - Message to log
 */
function log(message) {
  const timestamp = new Date().toISOString();
  const logMessage = `[${timestamp}] ${message}`;
  
  console.log(logMessage);
  fs.appendFileSync(DASHBOARD_LOG_FILE, logMessage + '\n');
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
 * Format duration from milliseconds
 * @param {number} ms - Duration in milliseconds
 * @returns {string} - Formatted duration
 */
function formatDuration(ms) {
  if (!ms) return 'N/A';
  
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  
  if (hours > 0) {
    return `${hours}h ${minutes % 60}m ${seconds % 60}s`;
  } else if (minutes > 0) {
    return `${minutes}m ${seconds % 60}s`;
  } else {
    return `${seconds}s`;
  }
}

/**
 * Display batch job status dashboard
 */
function displayBatchJobStatus() {
  log('Displaying batch job status dashboard...');
  
  // Load batch files
  const submitted = loadBatchFile(BATCH_SUBMITTED_PATH);
  const inProgress = loadBatchFile(BATCH_IN_PROGRESS_PATH);
  const completed = loadBatchFile(BATCH_COMPLETED_PATH);
  
  // Calculate statistics
  const stats = getBatchJobStats();
  
  // Display header
  console.log('\n=======================================================');
  console.log('               BATCH JOB STATUS DASHBOARD              ');
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
  console.log('To view batch job status:');
  console.log('  node SCRAPI/e-job-management/batch-status-dashboard.js');
  console.log('\nTo process batch jobs:');
  console.log('  node SCRAPI/e-job-management/process-batch-jobs-from-oxylabs.js');
  console.log('\nTo track and manage batch jobs:');
  console.log('  node SCRAPI/e-job-management/batch-job-tracker.js');
  console.log('=======================================================');
}

/**
 * Main function
 */
function main() {
  log('🚀 Starting Batch Status Dashboard');
  
  // Display batch job status
  displayBatchJobStatus();
}

// Run the main function if this file is executed directly
if (require.main === module) {
  main();
}

// Export functions for use in other modules
module.exports = {
  getBatchJobStats,
  displayBatchJobStatus
};