/**
 * Simple Batch Job Processor - Essential functionality for CLI testing
 */

const { Logger } = require('../../utils/logging/logger.cjs');
const { ErrorHandler } = require('../../utils/error-handling/error-handlers.cjs');
const { BatchJobTracker } = require('../tracking/batch-job-tracker.cjs');

class BatchJobProcessor {
  constructor() {
    this.logger = new Logger('BatchJobProcessor');
    this.errorHandler = new ErrorHandler('BatchJobProcessor');
    this.batchTracker = new BatchJobTracker();
    
    this.isRunning = false;
    this.processedCount = 0;
    this.failedCount = 0;
    
    this.logger.info('BatchJobProcessor initialized');
  }

  /**
   * Start processing batch jobs
   */
  async startProcessing(options = {}) {
    try {
      this.logger.info('Starting batch job processing', options);
      
      if (this.isRunning) {
        this.logger.warn('Batch processor is already running');
        return;
      }
      
      this.isRunning = true;
      this.startTime = Date.now();
      
      await this.batchTracker.initializeTrackingFiles();
      
      // Get submitted jobs
      const submitted = await this.batchTracker.loadBatchFile(this.batchTracker.batchPaths.submitted);
      
      if (submitted.queries.length === 0) {
        this.logger.info('No jobs to process');
        this.isRunning = false;
        return;
      }
      
      this.logger.info(`Found ${submitted.queries.length} jobs to process`);
      
      // Process jobs (simplified for now)
      for (const job of submitted.queries.slice(0, options.maxJobs || 5)) {
        try {
          this.logger.info(`Processing job: ${job.id}`);
          
          // Move to in-progress
          await this.batchTracker.moveJobToInProgress(job.id);
          
          // Simulate processing delay
          await new Promise(resolve => setTimeout(resolve, 2000));
          
          // Move to completed
          await this.batchTracker.moveJobToCompleted(job.id);
          
          this.processedCount++;
          this.logger.info(`Job ${job.id} completed successfully`);
          
        } catch (error) {
          this.failedCount++;
          this.logger.error(`Job ${job.id} failed: ${error.message}`);
        }
      }
      
      this.isRunning = false;
      const duration = Math.round((Date.now() - this.startTime) / 1000);
      
      this.logger.info('Batch processing completed', {
        processed: this.processedCount,
        failed: this.failedCount,
        duration: `${duration}s`
      });
      
    } catch (error) {
      this.isRunning = false;
      this.errorHandler.handleError(error, { operation: 'startProcessing' });
      throw error;
    }
  }

  /**
   * Show processor status
   */
  async showStatus() {
    console.log('\n⚡ BATCH JOB PROCESSOR STATUS');
    console.log('=============================');
    console.log(`Status: ${this.isRunning ? '🟢 Running' : '🔴 Stopped'}`);
    console.log(`Processed: ${this.processedCount} jobs`);
    console.log(`Failed: ${this.failedCount} jobs`);
    
    if (this.startTime) {
      const duration = Math.round((Date.now() - this.startTime) / 1000);
      console.log(`Runtime: ${duration}s`);
    }
    
    console.log('');
    
    // Show current job status
    await this.batchTracker.displayBatchJobStatus();
  }

  /**
   * Process a single batch cycle
   */
  async processSingleCycle(maxJobs = 5) {
    try {
      this.logger.info(`Processing single cycle with max ${maxJobs} jobs`);
      await this.startProcessing({ maxJobs });
    } catch (error) {
      console.error(`❌ Single cycle processing failed: ${error.message}`);
    }
  }
}

/**
 * CLI Interface
 */
async function main() {
  const processor = new BatchJobProcessor();
  const args = process.argv.slice(2);
  const command = args[0];

  try {
    switch (command) {
      case 'start':
      case 'run':
        console.log('🚀 Starting continuous batch processing...');
        await processor.startProcessing();
        break;

      case 'once':
      case 'single':
        const maxJobs = parseInt(args[1]) || 5;
        console.log(`🔄 Processing single batch cycle (max ${maxJobs} jobs)...`);
        await processor.processSingleCycle(maxJobs);
        break;

      case 'status':
        await processor.showStatus();
        break;

      case '--help':
      case 'help':
        console.log('📦 Batch Job Processor Help');
        console.log('===========================');
        console.log('');
        console.log('Commands:');
        console.log('  start, run                    Start continuous processing');
        console.log('  once, single [max_jobs]      Process single batch cycle');
        console.log('  status                        Show processor status');
        console.log('  help, --help                  Show this help');
        console.log('');
        console.log('Examples:');
        console.log('  node batch-job-processor.cjs once 3      # Process max 3 jobs');
        console.log('  node batch-job-processor.cjs status      # Show current status');
        console.log('');
        break;

      default:
        await processor.showStatus();
        break;
    }

  } catch (error) {
    console.error(`❌ Error: ${error.message}`);
    process.exit(1);
  }
}

// Run if executed directly
if (require.main === module) {
  main();
}

module.exports = BatchJobProcessor;
