// batch-job-processor.cjs - Modernized batch job processor with enhanced capabilities
const { spawn } = require('child_process');
const path = require('path');
const config = require('../../config/environment.cjs');
const { Logger } = require('../../utils/logging/logger.cjs');
const { ErrorHandler } = require('../../utils/error-handling/error-handlers.cjs');
const { BatchJobTracker } = require('../tracking/batch-job-tracker.cjs');
const { ComprehensiveWorkflow } = require('../../workflows/comprehensive-workflow.cjs');

/**
 * Batch Job Processor - Enhanced batch job processing with monitoring and error handling
 */
class BatchJobProcessor {
  constructor() {
    this.config = config;
    this.logger = new Logger('BatchJobProcessor');
    this.errorHandler = new ErrorHandler('BatchJobProcessor');
    this.batchTracker = new BatchJobTracker();
    this.workflow = new ComprehensiveWorkflow();
    
    this.isRunning = false;
    this.processedCount = 0;
    this.failedCount = 0;
    this.startTime = null;
    
    this.logger.info('BatchJobProcessor initialized', {
      component: 'BatchJobProcessor',
      version: '2.0.0'
    });
  }

  /**
   * Extract location from query string
   * @param {string} query - The search query
   * @returns {string} - Extracted location
   */
  extractLocationFromQuery(query) {
    const match = query.match(/in (.*?, .*?, United States)$/);
    return match ? match[1] : 'United States';
  }

  /**
   * Process a single job using the comprehensive workflow
   * @param {Object} job - The job to process
   * @returns {Promise<boolean>} - Whether processing was successful
   */
  async processSingleJob(job) {
    return handleAsyncError(async () => {
      const jobId = job.id;
      const query = job.query;
      const location = this.extractLocationFromQuery(query);

      this.logger.info('Processing single job', { jobId, query, location });

      try {
        // Use the comprehensive workflow to process the job
        const result = await this.workflow.executeWorkflow({
          query,
          location,
          jobId,
          trackJob: true,
          renderImages: true,
          uploadToStorage: true
        });

        if (result.success) {
          this.logger.info('Job processed successfully', { 
            jobId, 
            results: result.summary 
          });
          
          // Move job to completed with results
          await this.batchTracker.moveJobToCompleted(jobId, {
            processed_with: 'comprehensive_workflow',
            results: result.summary,
            processing_time_ms: result.metrics?.totalTime || 0
          });
          
          this.processedCount++;
          return true;
        } else {
          this.logger.error('Job processing failed', { 
            jobId, 
            error: result.error 
          });
          
          this.failedCount++;
          return false;
        }
      } catch (error) {
        this.logger.error('Unexpected error processing job', { 
          jobId, 
          error: error.message,
          stack: error.stack
        });
        
        this.failedCount++;
        return false;
      }
    }, this.errorHandler, 'processSingleJob', false);
  }

  /**
   * Process a job using legacy automation (fallback method)
   * @param {string} query - The search query
   * @param {string} location - The search location
   * @returns {Promise<boolean>} - Whether processing was successful
   */
  async runLegacyAutomation(query, location) {
    return handleAsyncError(async () => {
      this.logger.info('Running legacy automation', { query, location });
      
      return new Promise((resolve) => {
        const proc = spawn('node', [
          path.join(process.cwd(), 'SCRAPI', 'entry-points', 'single-query', 'scrapi-automation.cjs'),
          query,
          location
        ], {
          stdio: 'inherit',
          cwd: process.cwd()
        });
        
        proc.on('close', (code) => {
          if (code === 0) {
            this.logger.info('Legacy automation completed successfully', { query, location });
            resolve(true);
          } else {
            this.logger.error('Legacy automation failed', { 
              query, 
              location, 
              exitCode: code 
            });
            resolve(false);
          }
        });
        
        proc.on('error', (error) => {
          this.logger.error('Legacy automation process error', { 
            query, 
            location, 
            error: error.message 
          });
          resolve(false);
        });
      });
    }, this.errorHandler, 'runLegacyAutomation', false);
  }

  /**
   * Fetch parsed results from Oxylabs for a job
   * @param {Object} job - The job to fetch results for
   * @returns {Promise<boolean>} - Whether fetch was successful
   */
  async fetchParsedResults(job) {
    return handleAsyncError(async () => {
      const jobId = job.id;
      const query = job.query;
      const location = this.extractLocationFromQuery(query);

      this.logger.info('Fetching parsed results', { jobId, query, location });

      try {
        // Check job status first
        const statusResult = await this.oxylabsAPI.getJobStatus(jobId);
        
        if (!statusResult.success) {
          this.logger.error('Failed to get job status', { 
            jobId, 
            error: statusResult.error 
          });
          return false;
        }

        const jobStatus = statusResult.data.status;
        
        if (jobStatus !== 'done') {
          this.logger.info('Job not ready yet', { jobId, status: jobStatus });
          return false; // Job not ready, will be retried later
        }

        // Fetch parsed results
        const resultsResult = await this.oxylabsAPI.getParsedResults(jobId);
        
        if (!resultsResult.success) {
          this.logger.error('Failed to fetch parsed results', { 
            jobId, 
            error: resultsResult.error 
          });
          return false;
        }

        this.logger.info('Parsed results fetched successfully', { 
          jobId, 
          resultCount: resultsResult.data?.results?.length || 0 
        });

        // Process the results using the comprehensive workflow
        const processResult = await this.processSingleJob(job);
        
        if (processResult) {
          this.logger.info('Job processed and moved to completed', { jobId });
          return true;
        } else {
          this.logger.error('Failed to process job after fetching results', { jobId });
          return false;
        }
      } catch (error) {
        this.logger.error('Unexpected error fetching parsed results', { 
          jobId, 
          error: error.message,
          stack: error.stack
        });
        return false;
      }
    }, this.errorHandler, 'fetchParsedResults', false);
  }

  /**
   * Process all jobs in the submitted queue
   * @returns {Promise<Object>} - Processing summary
   */
  async processSubmittedJobs() {
    return handleAsyncError(async () => {
      this.logger.info('Processing submitted jobs');
      
      const submittedJobs = await this.batchTracker.getJobsByStatus('submitted');
      
      if (submittedJobs.length === 0) {
        this.logger.info('No submitted jobs to process');
        return { processed: 0, failed: 0, skipped: 0 };
      }

      this.logger.info('Found submitted jobs', { count: submittedJobs.length });
      
      let processed = 0;
      let failed = 0;
      let skipped = 0;

      for (const job of submittedJobs.slice(0, 5)) { // Process max 5 at a time
        try {
          // Move job to in-progress
          const moved = await this.batchTracker.moveJobToInProgress(job.id);
          
          if (!moved) {
            this.logger.warn('Failed to move job to in-progress, skipping', { jobId: job.id });
            skipped++;
            continue;
          }

          this.logger.info('Processing submitted job', { jobId: job.id, query: job.query });
          
          // Process the job
          const success = await this.processSingleJob(job);
          
          if (success) {
            processed++;
          } else {
            failed++;
          }
        } catch (error) {
          this.logger.error('Error processing submitted job', { 
            jobId: job.id, 
            error: error.message 
          });
          failed++;
        }
      }

      const summary = { processed, failed, skipped };
      this.logger.info('Submitted jobs processing complete', summary);
      return summary;
    }, this.errorHandler, 'processSubmittedJobs', { processed: 0, failed: 0, skipped: 0 });
  }

  /**
   * Process all jobs in the in-progress queue
   * @returns {Promise<Object>} - Processing summary
   */
  async processInProgressJobs() {
    return handleAsyncError(async () => {
      this.logger.info('Processing in-progress jobs');
      
      const inProgressJobs = await this.batchTracker.getJobsByStatus('inProgress');
      
      if (inProgressJobs.length === 0) {
        this.logger.info('No in-progress jobs to process');
        return { processed: 0, failed: 0, skipped: 0 };
      }

      this.logger.info('Found in-progress jobs', { count: inProgressJobs.length });
      
      let processed = 0;
      let failed = 0;
      let skipped = 0;

      for (const job of inProgressJobs) {
        try {
          this.logger.info('Checking in-progress job', { jobId: job.id, query: job.query });
          
          // Try to fetch results and process
          const success = await this.fetchParsedResults(job);
          
          if (success) {
            processed++;
          } else {
            // Check if job has been in progress too long (> 1 hour)
            const startTime = job.moved_to_progress_at ? new Date(job.moved_to_progress_at) : new Date();
            const hoursSinceStart = (Date.now() - startTime.getTime()) / (1000 * 60 * 60);
            
            if (hoursSinceStart > 1) {
              this.logger.warn('Job has been in progress too long, marking as failed', { 
                jobId: job.id, 
                hours: hoursSinceStart.toFixed(2) 
              });
              
              await this.batchTracker.moveJobToCompleted(job.id, {
                status: 'failed',
                error: 'Job timeout - exceeded 1 hour processing limit'
              });
              
              failed++;
            } else {
              skipped++; // Will retry later
            }
          }
        } catch (error) {
          this.logger.error('Error processing in-progress job', { 
            jobId: job.id, 
            error: error.message 
          });
          failed++;
        }
      }

      const summary = { processed, failed, skipped };
      this.logger.info('In-progress jobs processing complete', summary);
      return summary;
    }, this.errorHandler, 'processInProgressJobs', { processed: 0, failed: 0, skipped: 0 });
  }

  /**
   * Run a single batch processing cycle
   * @returns {Promise<Object>} - Cycle summary
   */
  async runBatchCycle() {
    return handleAsyncError(async () => {
      this.logger.info('Starting batch processing cycle');
      
      const cycleStart = Date.now();
      
      // Process submitted jobs
      const submittedResults = await this.processSubmittedJobs();
      
      // Process in-progress jobs
      const inProgressResults = await this.processInProgressJobs();
      
      const cycleDuration = Date.now() - cycleStart;
      
      const cycleSummary = {
        submitted: submittedResults,
        inProgress: inProgressResults,
        total: {
          processed: submittedResults.processed + inProgressResults.processed,
          failed: submittedResults.failed + inProgressResults.failed,
          skipped: submittedResults.skipped + inProgressResults.skipped
        },
        duration: cycleDuration,
        timestamp: new Date().toISOString()
      };
      
      this.logger.info('Batch processing cycle complete', cycleSummary);
      return cycleSummary;
    }, this.errorHandler, 'runBatchCycle', {
      submitted: { processed: 0, failed: 0, skipped: 0 },
      inProgress: { processed: 0, failed: 0, skipped: 0 },
      total: { processed: 0, failed: 0, skipped: 0 },
      duration: 0
    });
  }

  /**
   * Run continuous batch processing loop
   * @param {Object} options - Processing options
   * @returns {Promise<void>}
   */
  async runBatchLoop(options = {}) {
    return handleAsyncError(async () => {
      const {
        maxCycles = 0, // 0 = infinite
        cyclePause = 60000, // 1 minute between cycles
        maxErrors = 10 // Stop after 10 consecutive errors
      } = options;

      this.isRunning = true;
      this.startTime = Date.now();
      this.processedCount = 0;
      this.failedCount = 0;
      
      let cycleCount = 0;
      let consecutiveErrors = 0;

      this.logger.info('Starting batch processing loop', { 
        maxCycles, 
        cyclePause, 
        maxErrors 
      });

      while (this.isRunning && (maxCycles === 0 || cycleCount < maxCycles)) {
        try {
          cycleCount++;
          
          this.logger.info('Starting batch cycle', { 
            cycle: cycleCount,
            totalProcessed: this.processedCount,
            totalFailed: this.failedCount
          });

          const cycleSummary = await this.runBatchCycle();
          
          this.processedCount += cycleSummary.total.processed;
          this.failedCount += cycleSummary.total.failed;
          
          // Reset consecutive errors on successful cycle
          consecutiveErrors = 0;
          
          // Check if there's work to do
          const stats = await this.batchTracker.getBatchJobStats();
          const hasWork = stats.submitted > 0 || stats.inProgress > 0;
          
          if (!hasWork && maxCycles === 0) {
            this.logger.info('No work available, pausing longer', { 
              pauseDuration: cyclePause * 2 
            });
            await this.sleep(cyclePause * 2);
          } else {
            this.logger.info('Cycle complete, pausing', { 
              duration: cyclePause,
              nextCycle: cycleCount + 1
            });
            await this.sleep(cyclePause);
          }
        } catch (error) {
          consecutiveErrors++;
          
          this.logger.error('Error in batch processing cycle', { 
            cycle: cycleCount,
            error: error.message,
            consecutiveErrors,
            maxErrors
          });

          if (consecutiveErrors >= maxErrors) {
            this.logger.error('Too many consecutive errors, stopping batch processor', {
              consecutiveErrors,
              maxErrors
            });
            break;
          }

          // Longer pause after errors
          await this.sleep(cyclePause * 2);
        }
      }

      this.isRunning = false;
      const totalDuration = Date.now() - this.startTime;
      
      this.logger.info('Batch processing loop stopped', {
        cycles: cycleCount,
        totalProcessed: this.processedCount,
        totalFailed: this.failedCount,
        totalDuration,
        reason: consecutiveErrors >= maxErrors ? 'too_many_errors' : 
                maxCycles > 0 ? 'max_cycles_reached' : 'stopped_manually'
      });
    }, this.errorHandler, 'runBatchLoop');
  }

  /**
   * Stop the batch processing loop
   */
  stop() {
    this.logger.info('Stopping batch processor');
    this.isRunning = false;
  }

  /**
   * Get current processing status
   * @returns {Object} - Current status
   */
  getStatus() {
    return {
      isRunning: this.isRunning,
      processedCount: this.processedCount,
      failedCount: this.failedCount,
      startTime: this.startTime,
      uptime: this.startTime ? Date.now() - this.startTime : 0
    };
  }

  /**
   * Sleep for specified duration
   * @param {number} ms - Duration in milliseconds
   * @returns {Promise<void>}
   */
  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

/**
 * Main function for CLI usage
 */
async function main() {
  const processor = new BatchJobProcessor();
  
  try {
    // Get command line arguments
    const command = process.argv[2];
    const cycles = parseInt(process.argv[3]) || 0;
    
    if (command === 'once') {
      // Run a single cycle
      console.log('🚀 Running single batch processing cycle...');
      const result = await processor.runBatchCycle();
      
      console.log('\n📊 Cycle Results:');
      console.log(`✅ Processed: ${result.total.processed}`);
      console.log(`❌ Failed: ${result.total.failed}`);
      console.log(`⏭️  Skipped: ${result.total.skipped}`);
      console.log(`⏱️  Duration: ${(result.duration / 1000).toFixed(2)}s`);
      
    } else if (command === 'continuous' || !command) {
      // Run continuous processing
      console.log('🚀 Starting continuous batch processing...');
      console.log('Press Ctrl+C to stop');
      
      // Handle graceful shutdown
      process.on('SIGINT', () => {
        console.log('\n⏹️  Stopping batch processor...');
        processor.stop();
      });
      
      await processor.runBatchLoop({
        maxCycles: cycles || 0,
        cyclePause: 60000, // 1 minute
        maxErrors: 10
      });
      
    } else if (command === 'status') {
      // Show status
      const stats = await processor.batchTracker.getBatchJobStats();
      
      console.log('\n📊 Batch Job Status:');
      console.log(`📝 Submitted: ${stats.submitted}`);
      console.log(`🔄 In Progress: ${stats.inProgress}`);
      console.log(`✅ Completed: ${stats.completed}`);
      console.log(`📊 Total: ${stats.total}`);
      
    } else {
      // Show usage
      console.log('Usage:');
      console.log('  node SCRAPI/job-management/processors/batch-job-processor.cjs                 - Run continuous processing');
      console.log('  node SCRAPI/job-management/processors/batch-job-processor.cjs continuous     - Run continuous processing');
      console.log('  node SCRAPI/job-management/processors/batch-job-processor.cjs continuous 5   - Run 5 cycles then stop');
      console.log('  node SCRAPI/job-management/processors/batch-job-processor.cjs once           - Run single cycle');
      console.log('  node SCRAPI/job-management/processors/batch-job-processor.cjs status         - Show current status');
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
  BatchJobProcessor
};
