// file-archiver-scheduler.js - Schedule file archiving to run periodically
const cron = require('node-cron');
const { processAllFiles, cleanupOldFiles } = require('./file-archiver');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

// Directory for logs
const LOGS_DIR = path.join(process.cwd(), 'SCRAPI', 'output-staging', 'logs');
if (!fs.existsSync(LOGS_DIR)) {
  fs.mkdirSync(LOGS_DIR, { recursive: true });
}

// Log file for scheduler
const SCHEDULER_LOG_FILE = path.join(LOGS_DIR, `file-archiver-scheduler-${new Date().toISOString().replace(/[:.]/g, '-')}.log`);

/**
 * Log message to both console and file
 * @param {string} message - Message to log
 */
function log(message) {
  const timestamp = new Date().toISOString();
  const logMessage = `[${timestamp}] ${message}`;
  
  console.log(logMessage);
  fs.appendFileSync(SCHEDULER_LOG_FILE, logMessage + '\n');
}

/**
 * Run the file archiver
 * @returns {Promise<void>}
 */
async function runFileArchiver() {
  log('Running file archiver...');
  
  try {
    // Process all files
    const processResult = await processAllFiles();
    
    if (processResult.success) {
      log(`✅ Processed ${processResult.totalFiles} files`);
      log(`   Archived: ${processResult.archivedCount}`);
      log(`   Moved to extraction failures: ${processResult.movedToFailuresCount}`);
      log(`   Failed: ${processResult.failedCount}`);
    } else {
      log(`❌ Error processing files: ${processResult.error}`);
    }
    
    // Clean up old files
    const cleanupResult = await cleanupOldFiles();
    
    if (cleanupResult.success) {
      log(`✅ Cleaned up ${cleanupResult.totalDeleted} old files`);
    } else {
      log(`❌ Error cleaning up old files: ${cleanupResult.error}`);
    }
  } catch (error) {
    log(`❌ Error running file archiver: ${error.message}`);
  }
}

/**
 * Schedule the file archiver to run periodically
 * @param {string} cronExpression - Cron expression for scheduling
 * @returns {Object} - The scheduled job
 */
function scheduleFileArchiver(cronExpression = '0 0 * * *') {
  log(`Scheduling file archiver to run with cron expression: ${cronExpression}`);
  
  // Schedule the job
  const job = cron.schedule(cronExpression, () => {
    log(`Running scheduled file archiver at ${new Date().toISOString()}`);
    runFileArchiver().catch(error => {
      log(`❌ Error in scheduled run: ${error.message}`);
    });
  });
  
  log('File archiver scheduled successfully');
  
  return job;
}

/**
 * Main function
 */
async function main() {
  log('🚀 Starting File Archiver Scheduler');
  
  // Get command line arguments
  const cronExpression = process.argv[2] || '0 0 * * *'; // Default: run at midnight every day
  const runNow = process.argv.includes('--run-now');
  
  // Schedule the file archiver
  const job = scheduleFileArchiver(cronExpression);
  
  // Run immediately if requested
  if (runNow) {
    log('Running file archiver immediately...');
    await runFileArchiver();
  }
  
  log(`File archiver scheduled to run with cron expression: ${cronExpression}`);
  log('Press Ctrl+C to exit');
  
  // Handle graceful shutdown
  process.on('SIGINT', () => {
    log('Stopping scheduler...');
    job.stop();
    log('Scheduler stopped');
    process.exit(0);
  });
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
  runFileArchiver,
  scheduleFileArchiver
};