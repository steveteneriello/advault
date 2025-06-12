/**
 * Batch Job Tracker - Clean implementation with proper error handling
 * Tracks and manages batch jobs across different states
 */

const fs = require('fs').promises;
const fsSync = require('fs');
const path = require('path');
const { Logger } = require('../../utils/logging/logger.cjs');
const { ErrorHandler } = require('../../utils/error-handling/error-handlers.cjs');

class BatchJobTracker {
  constructor() {
    this.logger = new Logger('BatchJobTracker');
    this.errorHandler = new ErrorHandler('BatchJobTracker');
    
    // File paths for batch job tracking using existing structure
    this.batchPaths = {
      submitted: path.join(process.cwd(), 'SCRAPI', 'a-job-scheduling', 'batch-submitted.json'),
      inProgress: path.join(process.cwd(), 'SCRAPI', 'a-job-scheduling', 'batch-in-progress.json'),
      completed: path.join(process.cwd(), 'SCRAPI', 'a-job-scheduling', 'batch-completed.json'),
      backup: path.join(process.cwd(), 'SCRAPI', 'a-job-scheduling', 'batch-submitted-backup.json')
    };
    
    this.logger.info('BatchJobTracker initialized');
  }

  /**
   * Initialize batch tracking files if they don't exist
   */
  async initializeTrackingFiles() {
    try {
      this.logger.info('Initializing batch tracking files');
      
      const emptyBatch = { queries: [] };
      
      // Ensure directories exist
      for (const filePath of Object.values(this.batchPaths)) {
        const dir = path.dirname(filePath);
        if (!fsSync.existsSync(dir)) {
          await fs.mkdir(dir, { recursive: true });
          this.logger.debug('Created directory', { directory: dir });
        }
      }
      
      // Create batch tracking files if they don't exist
      for (const [type, filePath] of Object.entries(this.batchPaths)) {
        if (!fsSync.existsSync(filePath)) {
          await fs.writeFile(filePath, JSON.stringify(emptyBatch, null, 2));
          this.logger.info('Created batch tracking file', { type, filePath });
        }
      }
      
      this.logger.info('Batch tracking files initialized successfully');
    } catch (error) {
      this.errorHandler.handleError(error, { operation: 'initializeTrackingFiles' });
      throw error;
    }
  }

  /**
   * Load batch data from a file
   * @param {string} filePath - Path to the batch file
   * @returns {Promise<Object>} - Batch data
   */
  async loadBatchFile(filePath) {
    try {
      if (!fsSync.existsSync(filePath)) {
        this.logger.warn('Batch file does not exist, returning empty batch', { filePath });
        return { queries: [] };
      }
      
      const data = await fs.readFile(filePath, 'utf8');
      const batchData = JSON.parse(data);
      
      this.logger.debug('Batch file loaded successfully', { 
        filePath, 
        jobCount: batchData.queries?.length || 0 
      });
      
      return batchData;
    } catch (error) {
      this.logger.error('Failed to load batch file', { 
        filePath, 
        error: error.message 
      });
      return { queries: [] };
    }
  }

  /**
   * Save batch data to a file
   * @param {string} filePath - Path to the batch file
   * @param {Object} data - Batch data to save
   */
  async saveBatchFile(filePath, data) {
    try {
      await fs.writeFile(filePath, JSON.stringify(data, null, 2));
      this.logger.info('Batch file saved successfully', { filePath });
    } catch (error) {
      this.logger.error('Failed to save batch file', { filePath, error: error.message });
      throw error;
    }
  }

  /**
   * Move a job from submitted to in-progress
   * @param {string} jobId - The job ID to move
   * @returns {Promise<boolean>} - Whether the job was moved successfully
   */
  async moveJobToInProgress(jobId) {
    try {
      this.logger.info('Moving job to in-progress', { jobId });
      
      // Load batch files
      const submitted = await this.loadBatchFile(this.batchPaths.submitted);
      const inProgress = await this.loadBatchFile(this.batchPaths.inProgress);
      
      // Find the job in submitted
      const jobIndex = submitted.queries.findIndex(job => job.id === jobId);
      
      if (jobIndex === -1) {
        this.logger.warn('Job not found in submitted batch', { jobId });
        return false;
      }
      
      // Move the job to in-progress
      const job = submitted.queries[jobIndex];
      job.movedToInProgressAt = new Date().toISOString();
      
      inProgress.queries.push(job);
      submitted.queries.splice(jobIndex, 1);
      
      // Save batch files
      await this.saveBatchFile(this.batchPaths.submitted, submitted);
      await this.saveBatchFile(this.batchPaths.inProgress, inProgress);
      await this.saveBatchFile(this.batchPaths.backup, submitted);
      
      this.logger.info('Job moved to in-progress successfully', { jobId });
      return true;
      
    } catch (error) {
      this.errorHandler.handleError(error, { operation: 'moveJobToInProgress', jobId });
      return false;
    }
  }

  /**
   * Move a job from in-progress to completed
   * @param {string} jobId - The job ID to move
   * @returns {Promise<boolean>} - Whether the job was moved successfully
   */
  async moveJobToCompleted(jobId) {
    try {
      this.logger.info('Moving job to completed', { jobId });
      
      // Load batch files
      const inProgress = await this.loadBatchFile(this.batchPaths.inProgress);
      const completed = await this.loadBatchFile(this.batchPaths.completed);
      
      // Find the job in in-progress
      const jobIndex = inProgress.queries.findIndex(job => job.id === jobId);
      
      if (jobIndex === -1) {
        this.logger.warn('Job not found in in-progress batch', { jobId });
        return false;
      }
      
      // Move the job to completed
      const job = inProgress.queries[jobIndex];
      job.completedAt = new Date().toISOString();
      
      completed.queries.push(job);
      inProgress.queries.splice(jobIndex, 1);
      
      // Save batch files
      await this.saveBatchFile(this.batchPaths.inProgress, inProgress);
      await this.saveBatchFile(this.batchPaths.completed, completed);
      
      this.logger.info('Job moved to completed successfully', { jobId });
      return true;
      
    } catch (error) {
      this.errorHandler.handleError(error, { operation: 'moveJobToCompleted', jobId });
      return false;
    }
  }

  /**
   * Display batch job status dashboard
   */
  async displayBatchJobStatus() {
    try {
      this.logger.info('Displaying batch job status');
      
      // Load all batch files
      const submitted = await this.loadBatchFile(this.batchPaths.submitted);
      const inProgress = await this.loadBatchFile(this.batchPaths.inProgress);
      const completed = await this.loadBatchFile(this.batchPaths.completed);
      
      console.log('\n📊 BATCH JOB STATUS DASHBOARD');
      console.log('===============================');
      console.log(`📅 Updated: ${new Date().toLocaleString()}`);
      console.log('');
      
      // Submitted jobs
      console.log(`📝 SUBMITTED JOBS: ${submitted.queries.length}`);
      if (submitted.queries.length > 0) {
        submitted.queries.slice(0, 5).forEach((job, index) => {
          console.log(`   ${index + 1}. ${job.id || 'No ID'}: "${job.searchTerm || job.query || 'No query'}" - ${job.location || 'No location'}`);
        });
        if (submitted.queries.length > 5) {
          console.log(`   ... and ${submitted.queries.length - 5} more jobs`);
        }
      } else {
        console.log('   No jobs submitted');
      }
      console.log('');
      
      // In-progress jobs
      console.log(`⚡ IN-PROGRESS JOBS: ${inProgress.queries.length}`);
      if (inProgress.queries.length > 0) {
        inProgress.queries.forEach((job, index) => {
          const startTime = job.movedToInProgressAt ? new Date(job.movedToInProgressAt).toLocaleString() : 'Unknown';
          console.log(`   ${index + 1}. ${job.id || 'No ID'}: "${job.searchTerm || job.query || 'No query'}" (Started: ${startTime})`);
        });
      } else {
        console.log('   No jobs in progress');
      }
      console.log('');
      
      // Completed jobs
      console.log(`✅ COMPLETED JOBS: ${completed.queries.length}`);
      if (completed.queries.length > 0) {
        // Show last 5 completed jobs
        const recentCompleted = completed.queries.slice(-5).reverse();
        recentCompleted.forEach((job, index) => {
          const completedTime = job.completedAt ? new Date(job.completedAt).toLocaleString() : 'Unknown';
          console.log(`   ${index + 1}. ${job.id || 'No ID'}: "${job.searchTerm || job.query || 'No query'}" (Completed: ${completedTime})`);
        });
        if (completed.queries.length > 5) {
          console.log(`   ... and ${completed.queries.length - 5} more completed jobs`);
        }
      } else {
        console.log('   No completed jobs');
      }
      console.log('');
      
      // Summary
      const totalJobs = submitted.queries.length + inProgress.queries.length + completed.queries.length;
      console.log(`📈 SUMMARY: ${totalJobs} total jobs tracked`);
      console.log('');
      
    } catch (error) {
      this.errorHandler.handleError(error, { operation: 'displayBatchJobStatus' });
      console.error('❌ Failed to display batch job status');
    }
  }
}

/**
 * Main function for CLI usage
 */
async function main() {
  const tracker = new BatchJobTracker();
  
  try {
    await tracker.initializeTrackingFiles();
    
    // Get command line arguments
    const command = process.argv[2];
    const jobId = process.argv[3];
    
    switch (command) {
      case 'move-to-progress':
        if (!jobId) {
          console.log('❌ Please provide a job ID');
          console.log('Usage: node batch-job-tracker.cjs move-to-progress <job_id>');
          process.exit(1);
        }
        
        const successProgress = await tracker.moveJobToInProgress(jobId);
        if (successProgress) {
          console.log(`✅ Job ${jobId} moved to in-progress successfully`);
        } else {
          console.log(`❌ Failed to move job ${jobId} to in-progress`);
          process.exit(1);
        }
        break;
        
      case 'move-to-completed':
        if (!jobId) {
          console.log('❌ Please provide a job ID');
          console.log('Usage: node batch-job-tracker.cjs move-to-completed <job_id>');
          process.exit(1);
        }
        
        const successCompleted = await tracker.moveJobToCompleted(jobId);
        if (successCompleted) {
          console.log(`✅ Job ${jobId} moved to completed successfully`);
        } else {
          console.log(`❌ Failed to move job ${jobId} to completed`);
          process.exit(1);
        }
        break;
        
      case 'status':
      case 'dashboard':
      default:
        await tracker.displayBatchJobStatus();
        break;
    }
    
  } catch (error) {
    console.error(`❌ Fatal error: ${error.message}`);
    process.exit(1);
  }
}

// Run the main function if this file is executed directly
if (require.main === module) {
  main();
}

module.exports = {
  BatchJobTracker
};
