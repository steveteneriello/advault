// batch-tracker.cjs - Modernized batch job tracker
const fs = require('fs');
const path = require('path');

// Import our modular components
const { Logger } = require('../../utils/logging/logger.cjs');
const { validateAllConfigs } = require('../../config/environment.cjs');

class BatchJobTracker {
  constructor() {
    // Validate environment
    const envValidation = validateAllConfigs();
    if (!envValidation.isValid) {
      throw new Error(`Environment validation failed: ${envValidation.errors.join(', ')}`);
    }

    this.logger = new Logger('BatchJobTracker');
    
    // File paths for batch job tracking
    this.batchSubmittedPath = path.join(__dirname, '../../a-job-scheduling/batch-submitted.json');
    this.batchInProgressPath = path.join(__dirname, '../../a-job-scheduling/batch-in-progress.json');
    this.batchCompletedPath = path.join(__dirname, '../../a-job-scheduling/batch-completed.json');
    this.batchBackupPath = path.join(__dirname, '../../a-job-scheduling/batch-submitted-backup.json');
    
    this.initializeTrackingFiles();
  }

  /**
   * Initialize batch tracking files if they don't exist
   */
  initializeTrackingFiles() {
    this.logger.log('🔧 Initializing batch tracking files...');
    
    const emptyBatch = { 
      queries: [],
      created_at: new Date().toISOString(),
      total_count: 0
    };
    
    const files = [
      { path: this.batchSubmittedPath, name: 'batch-submitted.json' },
      { path: this.batchInProgressPath, name: 'batch-in-progress.json' },
      { path: this.batchCompletedPath, name: 'batch-completed.json' },
      { path: this.batchBackupPath, name: 'batch-submitted-backup.json' }
    ];
    
    files.forEach(file => {
      if (!fs.existsSync(file.path)) {
        fs.writeFileSync(file.path, JSON.stringify(emptyBatch, null, 2));
        this.logger.log(`📄 Created ${file.name}`);
      }
    });
    
    this.logger.log('✅ Batch tracking files initialized');
  }

  /**
   * Load batch data from a file safely
   * @param {string} filePath - Path to the batch file
   * @returns {Object} - Batch data
   */
  loadBatchFile(filePath) {
    try {
      if (!fs.existsSync(filePath)) {
        return { queries: [], total_count: 0 };
      }
      
      const data = fs.readFileSync(filePath, 'utf8');
      const parsed = JSON.parse(data);
      
      // Ensure structure
      if (!parsed.queries) parsed.queries = [];
      if (!parsed.total_count) parsed.total_count = parsed.queries.length;
      
      return parsed;
    } catch (error) {
      this.logger.error(`❌ Error loading batch file ${filePath}: ${error.message}`);
      return { queries: [], total_count: 0 };
    }
  }

  /**
   * Save batch data to a file safely
   * @param {string} filePath - Path to the batch file
   * @param {Object} data - Batch data to save
   */
  saveBatchFile(filePath, data) {
    try {
      // Ensure metadata
      data.updated_at = new Date().toISOString();
      data.total_count = data.queries.length;
      
      fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
      this.logger.log(`💾 Saved batch file: ${path.basename(filePath)}`);
    } catch (error) {
      this.logger.error(`❌ Error saving batch file ${filePath}: ${error.message}`);
    }
  }

  /**
   * Move a job from submitted to in-progress
   * @param {string} jobId - The job ID to move
   * @returns {boolean} - Whether the job was moved successfully
   */
  moveJobToInProgress(jobId) {
    this.logger.log(`📋 Moving job ${jobId} to in-progress...`);
    
    try {
      // Load batch files
      const submitted = this.loadBatchFile(this.batchSubmittedPath);
      const inProgress = this.loadBatchFile(this.batchInProgressPath);
      
      // Find the job in submitted
      const jobIndex = submitted.queries.findIndex(job => job.id === jobId);
      
      if (jobIndex === -1) {
        this.logger.error(`❌ Job ${jobId} not found in submitted batch`);
        return false;
      }
      
      // Move the job to in-progress with timestamp
      const job = { 
        ...submitted.queries[jobIndex], 
        started_at: new Date().toISOString(),
        status: 'in-progress'
      };
      
      inProgress.queries.push(job);
      submitted.queries.splice(jobIndex, 1);
      
      // Save batch files
      this.saveBatchFile(this.batchSubmittedPath, submitted);
      this.saveBatchFile(this.batchInProgressPath, inProgress);
      this.saveBatchFile(this.batchBackupPath, submitted);
      
      this.logger.log(`✅ Job ${jobId} moved to in-progress`);
      return true;
    } catch (error) {
      this.logger.error(`❌ Error moving job to in-progress: ${error.message}`);
      return false;
    }
  }

  /**
   * Move a job from in-progress to completed
   * @param {string} jobId - The job ID to move
   * @returns {boolean} - Whether the job was moved successfully
   */
  moveJobToCompleted(jobId) {
    this.logger.log(`🎉 Moving job ${jobId} to completed...`);
    
    try {
      // Load batch files
      const inProgress = this.loadBatchFile(this.batchInProgressPath);
      const completed = this.loadBatchFile(this.batchCompletedPath);
      
      // Find the job in in-progress
      const jobIndex = inProgress.queries.findIndex(job => job.id === jobId);
      
      if (jobIndex === -1) {
        this.logger.error(`❌ Job ${jobId} not found in in-progress batch`);
        return false;
      }
      
      // Move the job to completed with timestamp and processing time
      const job = inProgress.queries[jobIndex];
      const completedJob = {
        ...job,
        completed_at: new Date().toISOString(),
        status: 'completed',
        processing_time_ms: job.started_at ? 
          new Date().getTime() - new Date(job.started_at).getTime() : null
      };
      
      completed.queries.push(completedJob);
      inProgress.queries.splice(jobIndex, 1);
      
      // Save batch files
      this.saveBatchFile(this.batchInProgressPath, inProgress);
      this.saveBatchFile(this.batchCompletedPath, completed);
      
      this.logger.log(`🎊 Job ${jobId} moved to completed`);
      return true;
    } catch (error) {
      this.logger.error(`❌ Error moving job to completed: ${error.message}`);
      return false;
    }
  }

  /**
   * Get comprehensive batch statistics
   * @returns {Object} - Batch statistics
   */
  getBatchStatistics() {
    try {
      const submitted = this.loadBatchFile(this.batchSubmittedPath);
      const inProgress = this.loadBatchFile(this.batchInProgressPath);
      const completed = this.loadBatchFile(this.batchCompletedPath);
      
      const stats = {
        submitted: {
          count: submitted.queries.length,
          queries: submitted.queries
        },
        inProgress: {
          count: inProgress.queries.length,
          queries: inProgress.queries
        },
        completed: {
          count: completed.queries.length,
          queries: completed.queries.slice(-10) // Last 10 completed jobs
        },
        total: submitted.queries.length + inProgress.queries.length + completed.queries.length,
        completionRate: 0,
        averageProcessingTime: null
      };
      
      // Calculate completion rate
      if (stats.total > 0) {
        stats.completionRate = ((stats.completed.count / stats.total) * 100).toFixed(2);
      }
      
      // Calculate average processing time
      const completedWithTiming = completed.queries.filter(job => job.processing_time_ms);
      if (completedWithTiming.length > 0) {
        const totalTime = completedWithTiming.reduce((sum, job) => sum + job.processing_time_ms, 0);
        stats.averageProcessingTime = Math.round(totalTime / completedWithTiming.length);
      }
      
      return stats;
    } catch (error) {
      this.logger.error(`❌ Error getting batch statistics: ${error.message}`);
      return {
        submitted: { count: 0, queries: [] },
        inProgress: { count: 0, queries: [] },
        completed: { count: 0, queries: [] },
        total: 0,
        completionRate: 0,
        averageProcessingTime: null
      };
    }
  }

  /**
   * Display a comprehensive dashboard
   */
  displayDashboard() {
    const stats = this.getBatchStatistics();
    
    console.log('\n' + '='.repeat(60));
    console.log('📊 BATCH JOB TRACKING DASHBOARD');
    console.log('='.repeat(60));
    console.log(`📝 Submitted Jobs: ${stats.submitted.count}`);
    console.log(`⚡ In Progress: ${stats.inProgress.count}`);
    console.log(`✅ Completed: ${stats.completed.count}`);
    console.log(`📈 Total Jobs: ${stats.total}`);
    console.log(`🎯 Completion Rate: ${stats.completionRate}%`);
    
    if (stats.averageProcessingTime) {
      console.log(`⏱️  Average Processing Time: ${(stats.averageProcessingTime / 1000).toFixed(1)}s`);
    }
    
    // Show recent activity
    if (stats.inProgress.count > 0) {
      console.log('\n🔄 Currently Processing:');
      stats.inProgress.queries.slice(0, 3).forEach(job => {
        const elapsed = job.started_at ? 
          Math.round((new Date().getTime() - new Date(job.started_at).getTime()) / 1000) : 0;
        console.log(`   • ${job.query.substring(0, 50)}... (${elapsed}s ago)`);
      });
    }
    
    if (stats.completed.count > 0) {
      console.log('\n🎉 Recently Completed:');
      stats.completed.queries.slice(-3).forEach(job => {
        const timeStr = job.processing_time_ms ? 
          `${(job.processing_time_ms / 1000).toFixed(1)}s` : 'Unknown';
        console.log(`   • ${job.query.substring(0, 50)}... (${timeStr})`);
      });
    }
    
    console.log('='.repeat(60) + '\n');
    
    return stats;
  }

  /**
   * Find a job by ID across all batch files
   * @param {string} jobId - The job ID to find
   * @returns {Object|null} - Job data with location info
   */
  findJob(jobId) {
    const files = [
      { path: this.batchSubmittedPath, status: 'submitted' },
      { path: this.batchInProgressPath, status: 'in-progress' },
      { path: this.batchCompletedPath, status: 'completed' }
    ];
    
    for (const file of files) {
      const batch = this.loadBatchFile(file.path);
      const job = batch.queries.find(j => j.id === jobId);
      
      if (job) {
        return {
          ...job,
          currentStatus: file.status,
          filePath: file.path
        };
      }
    }
    
    return null;
  }

  /**
   * Clear completed jobs (archive them)
   * @param {number} keepLast - Number of recent jobs to keep
   * @returns {number} - Number of jobs archived
   */
  archiveCompletedJobs(keepLast = 100) {
    this.logger.log(`🗄️ Archiving completed jobs (keeping last ${keepLast})...`);
    
    try {
      const completed = this.loadBatchFile(this.batchCompletedPath);
      
      if (completed.queries.length <= keepLast) {
        this.logger.log(`📋 No jobs to archive (${completed.queries.length} <= ${keepLast})`);
        return 0;
      }
      
      // Keep only the most recent jobs
      const toArchive = completed.queries.slice(0, completed.queries.length - keepLast);
      completed.queries = completed.queries.slice(-keepLast);
      
      // Save the reduced completed file
      this.saveBatchFile(this.batchCompletedPath, completed);
      
      // Save archived jobs with timestamp
      const archiveFile = path.join(
        path.dirname(this.batchCompletedPath),
        `batch-archived-${new Date().toISOString().split('T')[0]}.json`
      );
      
      fs.writeFileSync(archiveFile, JSON.stringify({
        archived_at: new Date().toISOString(),
        job_count: toArchive.length,
        queries: toArchive
      }, null, 2));
      
      this.logger.log(`✅ Archived ${toArchive.length} jobs to ${path.basename(archiveFile)}`);
      return toArchive.length;
    } catch (error) {
      this.logger.error(`❌ Error archiving jobs: ${error.message}`);
      return 0;
    }
  }
}

module.exports = { BatchJobTracker };

// CLI interface
if (require.main === module) {
  const tracker = new BatchJobTracker();
  const command = process.argv[2];
  const jobId = process.argv[3];
  
  switch (command) {
    case 'dashboard':
    case 'status':
      tracker.displayDashboard();
      break;
      
    case 'stats':
      console.log(JSON.stringify(tracker.getBatchStatistics(), null, 2));
      break;
      
    case 'find':
      if (!jobId) {
        console.log('Usage: node batch-tracker.cjs find <job-id>');
        process.exit(1);
      }
      const job = tracker.findJob(jobId);
      if (job) {
        console.log(`Found job ${jobId}:`);
        console.log(JSON.stringify(job, null, 2));
      } else {
        console.log(`Job ${jobId} not found`);
      }
      break;
      
    case 'archive':
      const keepLast = parseInt(process.argv[3]) || 100;
      const archived = tracker.archiveCompletedJobs(keepLast);
      console.log(`Archived ${archived} jobs`);
      break;
      
    default:
      console.log('Batch Job Tracker Commands:');
      console.log('  dashboard     - Show job status dashboard');
      console.log('  stats         - Show detailed statistics (JSON)');
      console.log('  find <id>     - Find a specific job');
      console.log('  archive [n]   - Archive completed jobs (keep last n)');
      break;
  }
}
