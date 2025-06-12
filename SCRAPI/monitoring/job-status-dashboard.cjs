// job-status-dashboard.cjs - Enhanced job status dashboard with comprehensive monitoring
const { validateAllConfigs, getOxylabsConfig, getSupabaseConfig } = require('../../config/environment.cjs');
const { createLogger } = require('../../utils/logging/logger.cjs');
const { ErrorHandler, handleAsyncError } = require('../../utils/error-handling/error-handlers.cjs');
const { SupabaseAPI } = require('../../api/supabase/supabase-api.cjs');
const { JobTrackingService } = require('../tracking/job-tracking-service.cjs');
const { BatchJobTracker } = require('../tracking/batch-job-tracker.cjs');

/**
 * Enhanced Job Status Dashboard - Comprehensive monitoring with real-time data
 */
class JobStatusDashboard {
  constructor() {
    const validation = validateAllConfigs();
    if (!validation.isValid) {
      throw new Error(`Configuration validation failed: ${validation.errors.join(", ")}`);
    }
    this.config = {
      oxylabs: getOxylabsConfig(),
      supabase: getSupabaseConfig()
    };
    this.logger = createLogger('JobStatusDashboard');
    this.errorHandler = new ErrorHandler(this.logger);
    this.supabaseAPI = new SupabaseAPI(this.config, this.logger);
    this.jobTracker = new JobTrackingService();
    this.batchTracker = new BatchJobTracker();
    
    this.logger.info('JobStatusDashboard initialized', {
      component: 'JobStatusDashboard',
      version: '2.0.0'
    });
  }

  /**
   * Format duration from milliseconds
   * @param {number} ms - Duration in milliseconds
   * @returns {string} - Formatted duration
   */
  formatDuration(ms) {
    if (ms < 0) return 'N/A';
    
    const seconds = Math.floor((ms / 1000) % 60);
    const minutes = Math.floor((ms / (1000 * 60)) % 60);
    const hours = Math.floor((ms / (1000 * 60 * 60)) % 24);
    const days = Math.floor(ms / (1000 * 60 * 60 * 24));
    
    if (days > 0) {
      return `${days}d ${hours}h ${minutes}m`;
    } else if (hours > 0) {
      return `${hours}h ${minutes}m`;
    } else if (minutes > 0) {
      return `${minutes}m ${seconds}s`;
    } else {
      return `${seconds}s`;
    }
  }

  /**
   * Get emoji for status
   * @param {string} status - The status string
   * @returns {string} - Corresponding emoji
   */
  getStatusEmoji(status) {
    const emojiMap = {
      'pending': '⏳',
      'in_progress': '🔄',
      'success': '✅',
      'completed': '✅',
      'failed': '❌',
      'partial_success': '⚠️',
      'error': '❌'
    };
    
    return emojiMap[status] || '❓';
  }

  /**
   * Get comprehensive job status summary
   * @returns {Promise<Object>} - Enhanced job status summary
   */
  async getEnhancedJobStatusSummary() {
    return handleAsyncError(async () => {
      this.logger.debug('Getting enhanced job status summary');
      
      // Get database tracking statistics
      const trackingStatsResult = await this.jobTracker.getJobTrackingStats();
      const trackingStats = trackingStatsResult.success ? trackingStatsResult.data : null;
      
      // Get batch job statistics
      const batchStats = await this.batchTracker.getBatchJobStats();
      
      // Get recent jobs
      const recentJobsResult = await this.jobTracker.getAllJobTracking(20, 0);
      const recentJobs = recentJobsResult.success ? recentJobsResult.data : [];
      
      // Filter jobs by status
      const inProgressJobs = recentJobs.filter(job => job.status === 'in_progress');
      const failedJobs = recentJobs.filter(job => job.status === 'failed');
      const completedJobs = recentJobs.filter(job => 
        job.status === 'completed' || job.status === 'partial_success'
      );
      const pendingJobs = recentJobs.filter(job => job.status === 'pending');
      
      const summary = {
        tracking: trackingStats,
        batch: batchStats,
        jobs: {
          recent: recentJobs,
          inProgress: inProgressJobs,
          failed: failedJobs,
          completed: completedJobs,
          pending: pendingJobs
        },
        system: {
          databaseConnected: trackingStats !== null,
          totalActiveJobs: inProgressJobs.length + pendingJobs.length,
          totalProcessedToday: this.getJobsFromToday(completedJobs).length
        },
        lastUpdated: new Date().toISOString()
      };
      
      this.logger.debug('Enhanced job status summary calculated', {
        totalJobs: trackingStats?.totalCount || 0,
        inProgress: inProgressJobs.length,
        failed: failedJobs.length,
        completed: completedJobs.length
      });
      
      return summary;
    }, this.errorHandler, 'getEnhancedJobStatusSummary', {
      tracking: null,
      batch: { submitted: 0, inProgress: 0, completed: 0, total: 0 },
      jobs: { recent: [], inProgress: [], failed: [], completed: [], pending: [] },
      system: { databaseConnected: false, totalActiveJobs: 0, totalProcessedToday: 0 }
    });
  }

  /**
   * Get jobs from today
   * @param {Array} jobs - Array of jobs
   * @returns {Array} - Jobs from today
   */
  getJobsFromToday(jobs) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    return jobs.filter(job => {
      const jobDate = new Date(job.completed_at || job.started_at);
      return jobDate >= today;
    });
  }

  /**
   * Display comprehensive job status dashboard
   * @param {boolean} showDetailed - Whether to show detailed information
   * @returns {Promise<void>}
   */
  async displayComprehensiveDashboard(showDetailed = false) {
    return handleAsyncError(async () => {
      this.logger.info('Displaying comprehensive job status dashboard', { showDetailed });
      
      const summary = await this.getEnhancedJobStatusSummary();
      
      // Display header
      console.log('\n╔═══════════════════════════════════════════════════════════════╗');
      console.log('║                    JOB STATUS DASHBOARD                      ║');
      console.log('╠═══════════════════════════════════════════════════════════════╣');
      console.log(`║ Generated: ${new Date().toLocaleString()}${' '.repeat(31 - new Date().toLocaleString().length)}║`);
      console.log('╚═══════════════════════════════════════════════════════════════╝\n');
      
      // Display system overview
      console.log('🖥️  SYSTEM OVERVIEW:');
      console.log('━━━━━━━━━━━━━━━━━━━');
      console.log(`🗄️  Database: ${summary.system.databaseConnected ? '✅ Connected' : '❌ Disconnected'}`);
      console.log(`🔄 Active Jobs: ${summary.system.totalActiveJobs}`);
      console.log(`📊 Processed Today: ${summary.system.totalProcessedToday}`);
      console.log(`📁 Batch Files: ${summary.batch.total} total jobs`);
      
      // Display database tracking statistics
      if (summary.tracking) {
        console.log('\n🗄️  DATABASE TRACKING:');
        console.log('━━━━━━━━━━━━━━━━━━━━━━');
        console.log(`📊 Total Jobs: ${summary.tracking.totalCount || 0}`);
        
        if (summary.tracking.statusCounts && summary.tracking.statusCounts.length > 0) {
          console.log('\nStatus Distribution:');
          summary.tracking.statusCounts.forEach(status => {
            const emoji = this.getStatusEmoji(status.status);
            console.log(`  ${emoji} ${status.status}: ${status.count}`);
          });
        }
        
        if (summary.tracking.stepCounts && summary.tracking.stepCounts.length > 0) {
          console.log('\nProcessing Steps:');
          const stepGroups = {};
          summary.tracking.stepCounts.forEach(step => {
            if (!stepGroups[step.step]) {
              stepGroups[step.step] = [];
            }
            stepGroups[step.step].push(step);
          });
          
          Object.entries(stepGroups).forEach(([stepName, steps]) => {
            console.log(`\n  ${stepName.replace('_', ' ').toUpperCase()}:`);
            steps.forEach(step => {
              const emoji = this.getStatusEmoji(step.status);
              console.log(`    ${emoji} ${step.status}: ${step.count}`);
            });
          });
        }
      }
      
      // Display batch file statistics
      console.log('\n📁 BATCH FILES:');
      console.log('━━━━━━━━━━━━━━━');
      console.log(`📝 Submitted: ${summary.batch.submitted}`);
      console.log(`🔄 In Progress: ${summary.batch.inProgress}`);
      console.log(`✅ Completed: ${summary.batch.completed}`);
      console.log(`📊 Total: ${summary.batch.total}`);
      
      // Display active jobs
      if (summary.jobs.inProgress.length > 0) {
        console.log('\n🔄 JOBS IN PROGRESS:');
        console.log('━━━━━━━━━━━━━━━━━━━━');
        
        summary.jobs.inProgress.slice(0, 5).forEach((job, index) => {
          const startedAt = new Date(job.started_at).toLocaleString();
          const duration = this.formatDuration(Date.now() - new Date(job.started_at).getTime());
          
          console.log(`${index + 1}. ${job.job_id} - "${job.query}" in ${job.location}`);
          console.log(`   ⏰ Started: ${startedAt} (${duration} ago)`);
          console.log(`   📊 API: ${this.getStatusEmoji(job.api_call_status)} | SERP: ${this.getStatusEmoji(job.serp_processing_status)} | Ads: ${this.getStatusEmoji(job.ads_extraction_status)} | Render: ${this.getStatusEmoji(job.rendering_status)}`);
          console.log('   ────────────────────────────────────────────────────────────');
        });
        
        if (summary.jobs.inProgress.length > 5) {
          console.log(`   ... and ${summary.jobs.inProgress.length - 5} more in-progress jobs`);
        }
      } else {
        console.log('\n🔄 JOBS IN PROGRESS:');
        console.log('━━━━━━━━━━━━━━━━━━━━');
        console.log('No jobs currently in progress');
      }
      
      // Display failed jobs
      if (summary.jobs.failed.length > 0) {
        console.log('\n❌ FAILED JOBS:');
        console.log('━━━━━━━━━━━━━━');
        
        summary.jobs.failed.slice(0, 3).forEach((job, index) => {
          const startedAt = new Date(job.started_at).toLocaleString();
          
          console.log(`${index + 1}. ${job.job_id} - "${job.query}" in ${job.location}`);
          console.log(`   ⏰ Started: ${startedAt}`);
          console.log(`   ❌ Error: ${job.error_message || 'No error message'}`);
          console.log('   ────────────────────────────────────────────────────────────');
        });
        
        if (summary.jobs.failed.length > 3) {
          console.log(`   ... and ${summary.jobs.failed.length - 3} more failed jobs`);
        }
      }
      
      // Display recent completions
      if (summary.jobs.completed.length > 0) {
        console.log('\n✅ RECENT COMPLETIONS:');
        console.log('━━━━━━━━━━━━━━━━━━━━━━');
        
        const recentCompleted = summary.jobs.completed
          .sort((a, b) => new Date(b.completed_at || 0) - new Date(a.completed_at || 0))
          .slice(0, 5);
        
        recentCompleted.forEach((job, index) => {
          const completedAt = job.completed_at ? new Date(job.completed_at).toLocaleString() : 'N/A';
          const startTime = job.started_at ? new Date(job.started_at) : null;
          const endTime = job.completed_at ? new Date(job.completed_at) : null;
          const duration = startTime && endTime ? endTime.getTime() - startTime.getTime() : 0;
          
          console.log(`${index + 1}. ${job.job_id} - "${job.query}" in ${job.location}`);
          console.log(`   ⏰ Completed: ${completedAt}`);
          console.log(`   ⌛ Duration: ${this.formatDuration(duration)}`);
          console.log(`   📊 Results: ${job.new_ads_count || 0} ads, ${job.new_advertisers_count || 0} advertisers`);
          console.log('   ────────────────────────────────────────────────────────────');
        });
      }
      
      if (showDetailed) {
        await this.displayDetailedMetrics(summary);
      }
      
      // Display commands
      console.log('\n🛠️  AVAILABLE COMMANDS:');
      console.log('━━━━━━━━━━━━━━━━━━━━━');
      console.log('• View job details: node SCRAPI/monitoring/job-status-dashboard.cjs job <job_id>');
      console.log('• View detailed metrics: node SCRAPI/monitoring/job-status-dashboard.cjs detailed');
      console.log('• Export data: node SCRAPI/monitoring/job-status-dashboard.cjs export');
      console.log('• View batch status: node SCRAPI/monitoring/batch-status-dashboard.cjs');
      console.log('• Process batch jobs: node SCRAPI/job-management/processors/batch-job-processor.cjs');
      
      console.log('\n═══════════════════════════════════════════════════════════════\n');
    }, this.errorHandler, 'displayComprehensiveDashboard');
  }

  /**
   * Display detailed metrics
   * @param {Object} summary - Job status summary
   * @returns {Promise<void>}
   */
  async displayDetailedMetrics(summary) {
    return handleAsyncError(async () => {
      console.log('\n📈 DETAILED METRICS:');
      console.log('━━━━━━━━━━━━━━━━━━━━');
      
      // Performance metrics
      if (summary.jobs.completed.length > 0) {
        const completedJobs = summary.jobs.completed;
        const durations = completedJobs
          .filter(job => job.started_at && job.completed_at)
          .map(job => new Date(job.completed_at).getTime() - new Date(job.started_at).getTime());
        
        if (durations.length > 0) {
          const avgDuration = durations.reduce((a, b) => a + b, 0) / durations.length;
          const minDuration = Math.min(...durations);
          const maxDuration = Math.max(...durations);
          
          console.log('\n⏱️  Processing Time Metrics:');
          console.log(`   Average: ${this.formatDuration(avgDuration)}`);
          console.log(`   Fastest: ${this.formatDuration(minDuration)}`);
          console.log(`   Slowest: ${this.formatDuration(maxDuration)}`);
        }
        
        // Success rate
        const totalProcessed = summary.jobs.completed.length + summary.jobs.failed.length;
        const successRate = totalProcessed > 0 ? (summary.jobs.completed.length / totalProcessed * 100) : 0;
        
        console.log(`\n📊 Success Rate: ${successRate.toFixed(1)}% (${summary.jobs.completed.length}/${totalProcessed})`);
        
        // Ads and advertisers metrics
        const totalAds = completedJobs.reduce((sum, job) => sum + (job.new_ads_count || 0), 0);
        const totalAdvertisers = completedJobs.reduce((sum, job) => sum + (job.new_advertisers_count || 0), 0);
        const avgAdsPerJob = completedJobs.length > 0 ? totalAds / completedJobs.length : 0;
        
        console.log(`\n📊 Collection Metrics:`);
        console.log(`   Total Ads Collected: ${totalAds}`);
        console.log(`   Total Advertisers: ${totalAdvertisers}`);
        console.log(`   Avg Ads per Job: ${avgAdsPerJob.toFixed(1)}`);
      }
      
      // Error analysis
      if (summary.jobs.failed.length > 0) {
        console.log('\n🔍 Error Analysis:');
        const errorTypes = {};
        summary.jobs.failed.forEach(job => {
          const error = job.error_message || 'Unknown error';
          const shortError = error.substring(0, 50);
          errorTypes[shortError] = (errorTypes[shortError] || 0) + 1;
        });
        
        Object.entries(errorTypes)
          .sort(([,a], [,b]) => b - a)
          .slice(0, 5)
          .forEach(([error, count]) => {
            console.log(`   ${count}x: ${error}${error.length > 50 ? '...' : ''}`);
          });
      }
      
      // System health indicators
      console.log('\n🏥 SYSTEM HEALTH:');
      const activeJobsHealth = summary.system.totalActiveJobs < 10 ? '✅' : 
                              summary.system.totalActiveJobs < 20 ? '⚠️' : '❌';
      console.log(`   Active Jobs Load: ${activeJobsHealth} ${summary.system.totalActiveJobs}/20`);
      
      const dbHealth = summary.system.databaseConnected ? '✅' : '❌';
      console.log(`   Database Connection: ${dbHealth}`);
      
      const batchHealth = summary.batch.total > 0 ? '✅' : '💤';
      console.log(`   Batch Queue: ${batchHealth} ${summary.batch.total} jobs`);
    }, this.errorHandler, 'displayDetailedMetrics');
  }

  /**
   * Get details for a specific job
   * @param {string} jobId - The job ID to get details for
   * @returns {Promise<Object>} - Job details
   */
  async getJobDetails(jobId) {
    return handleAsyncError(async () => {
      this.logger.debug('Getting job details', { jobId });
      
      // Get job tracking record
      const jobResult = await this.jobTracker.getJobTracking(jobId);
      
      if (!jobResult.success) {
        this.logger.error('Failed to get job details', { jobId, error: jobResult.error });
        return { success: false, error: jobResult.error };
      }
      
      const job = jobResult.data;
      
      // Get additional data from Supabase
      const serpResult = await this.supabaseAPI.getSerpByJobId(jobId);
      const serp = serpResult.success ? serpResult.data : null;
      
      const stagingResult = await this.supabaseAPI.getStagingByJobId(jobId);
      const staging = stagingResult.success ? stagingResult.data : null;
      
      // Get processing logs if staging exists
      let logs = [];
      if (staging) {
        const logsResult = await this.supabaseAPI.getProcessingLogs(staging.id);
        logs = logsResult.success ? logsResult.data : [];
      }
      
      // Get ad renderings if SERP exists
      let renderings = [];
      if (serp) {
        const renderingsResult = await this.supabaseAPI.getAdRenderings(serp.id);
        renderings = renderingsResult.success ? renderingsResult.data : [];
      }
      
      const details = {
        success: true,
        data: {
          job,
          serp,
          staging,
          logs,
          renderings
        }
      };
      
      this.logger.debug('Job details retrieved successfully', { 
        jobId,
        hasSerp: !!serp,
        hasStaging: !!staging,
        logsCount: logs.length,
        renderingsCount: renderings.length
      });
      
      return details;
    }, this.errorHandler, 'getJobDetails', { success: false, error: 'Failed to get job details' });
  }

  /**
   * Display detailed information for a specific job
   * @param {string} jobId - The job ID
   * @returns {Promise<void>}
   */
  async displayJobDetails(jobId) {
    return handleAsyncError(async () => {
      this.logger.info('Displaying job details', { jobId });
      
      const details = await this.getJobDetails(jobId);
      
      if (!details.success) {
        console.log(`❌ Error getting job details: ${details.error?.message || 'Unknown error'}`);
        return;
      }
      
      const { job, serp, staging, logs, renderings } = details.data;
      
      // Display header
      console.log('\n╔═══════════════════════════════════════════════════════════════╗');
      console.log(`║                  JOB DETAILS: ${jobId}${' '.repeat(26 - jobId.length)}║`);
      console.log('╚═══════════════════════════════════════════════════════════════╝\n');
      
      // Display job tracking info
      console.log('🔍 JOB TRACKING:');
      console.log('━━━━━━━━━━━━━━━━');
      console.log(`Query: "${job.query}" in ${job.location}`);
      console.log(`Status: ${this.getStatusEmoji(job.status)} ${job.status}`);
      console.log(`Started: ${new Date(job.started_at).toLocaleString()}`);
      
      if (job.completed_at) {
        console.log(`Completed: ${new Date(job.completed_at).toLocaleString()}`);
        const duration = new Date(job.completed_at).getTime() - new Date(job.started_at).getTime();
        console.log(`Duration: ${this.formatDuration(duration)}`);
      }
      
      console.log(`\nProcessing Steps:`);
      console.log(`  API Call: ${this.getStatusEmoji(job.api_call_status)} ${job.api_call_status}`);
      console.log(`  SERP Processing: ${this.getStatusEmoji(job.serp_processing_status)} ${job.serp_processing_status}`);
      console.log(`  Ads Extraction: ${this.getStatusEmoji(job.ads_extraction_status)} ${job.ads_extraction_status}`);
      console.log(`  Rendering: ${this.getStatusEmoji(job.rendering_status)} ${job.rendering_status}`);
      
      if (job.error_message) {
        console.log(`\n❌ Error: ${job.error_message}`);
      }
      
      console.log(`\nResults: ${job.new_ads_count || 0} ads, ${job.new_advertisers_count || 0} advertisers`);
      
      // Display SERP info
      if (serp) {
        console.log('\n🔍 SERP DATA:');
        console.log('━━━━━━━━━━━━━');
        console.log(`SERP ID: ${serp.id}`);
        console.log(`Query: "${serp.query}" in ${serp.geo_location}`);
        console.log(`Results Count: ${serp.results_count || 0}`);
        console.log(`Created: ${new Date(serp.created_at).toLocaleString()}`);
        
        if (serp.processed_at) {
          console.log(`Processed: ${new Date(serp.processed_at).toLocaleString()}`);
        }
      }
      
      // Display staging info
      if (staging) {
        console.log('\n📝 STAGING DATA:');
        console.log('━━━━━━━━━━━━━━━━');
        console.log(`Staging ID: ${staging.id}`);
        console.log(`Status: ${this.getStatusEmoji(staging.status)} ${staging.status}`);
        console.log(`Created: ${new Date(staging.created_at).toLocaleString()}`);
        
        if (staging.processed_at) {
          console.log(`Processed: ${new Date(staging.processed_at).toLocaleString()}`);
        }
        
        if (staging.error_message) {
          console.log(`Error: ${staging.error_message}`);
        }
      }
      
      // Display processing logs
      if (logs.length > 0) {
        console.log('\n📋 PROCESSING LOGS:');
        console.log('━━━━━━━━━━━━━━━━━━━');
        
        logs.slice(0, 10).forEach(logEntry => {
          const timestamp = new Date(logEntry.created_at).toLocaleString();
          const emoji = this.getStatusEmoji(logEntry.status);
          
          console.log(`${timestamp} ${emoji} [${logEntry.step || 'general'}] ${logEntry.message}`);
          
          if (logEntry.details) {
            console.log(`  Details: ${JSON.stringify(logEntry.details)}`);
          }
        });
        
        if (logs.length > 10) {
          console.log(`... and ${logs.length - 10} more log entries`);
        }
      }
      
      // Display renderings
      if (renderings.length > 0) {
        console.log('\n🎨 RENDERINGS:');
        console.log('━━━━━━━━━━━━━━');
        
        const renderingsByType = {};
        renderings.forEach(rendering => {
          if (!renderingsByType[rendering.rendering_type]) {
            renderingsByType[rendering.rendering_type] = [];
          }
          renderingsByType[rendering.rendering_type].push(rendering);
        });
        
        Object.entries(renderingsByType).forEach(([type, typeRenderings]) => {
          console.log(`\n${type.toUpperCase()} (${typeRenderings.length}):`);
          
          typeRenderings.slice(0, 5).forEach((rendering, index) => {
            console.log(`  ${index + 1}. Ad ${rendering.ad_id} - ${this.getStatusEmoji(rendering.status)} ${rendering.status}`);
            
            if (rendering.processed_at) {
              console.log(`     Processed: ${new Date(rendering.processed_at).toLocaleString()}`);
            }
            
            if (rendering.output_path) {
              console.log(`     Output: ${rendering.output_path}`);
            }
          });
          
          if (typeRenderings.length > 5) {
            console.log(`     ... and ${typeRenderings.length - 5} more ${type} renderings`);
          }
        });
      }
      
      console.log('\n═══════════════════════════════════════════════════════════════\n');
    }, this.errorHandler, 'displayJobDetails');
  }

  /**
   * Export job data to JSON
   * @param {string} outputPath - Path to save the export
   * @returns {Promise<boolean>} - Whether export was successful
   */
  async exportJobData(outputPath) {
    return handleAsyncError(async () => {
      this.logger.info('Exporting job data', { outputPath });
      
      const summary = await this.getEnhancedJobStatusSummary();
      const exportData = {
        ...summary,
        exportedAt: new Date().toISOString(),
        version: '2.0.0'
      };
      
      const fs = require('fs').promises;
      const path = require('path');
      
      // Ensure directory exists
      const dir = path.dirname(outputPath);
      await fs.mkdir(dir, { recursive: true });
      
      await fs.writeFile(outputPath, JSON.stringify(exportData, null, 2));
      
      this.logger.info('Job data exported successfully', { outputPath });
      return true;
    }, this.errorHandler, 'exportJobData', false);
  }
}

/**
 * Main function for CLI usage
 */
async function main() {
  const dashboard = new JobStatusDashboard();
  
  try {
    // Get command line arguments
    const command = process.argv[2];
    const argument = process.argv[3];
    
    if (command === 'job' && argument) {
      // Display details for a specific job
      await dashboard.displayJobDetails(argument);
      
    } else if (command === 'detailed') {
      // Display detailed dashboard
      await dashboard.displayComprehensiveDashboard(true);
      
    } else if (command === 'export') {
      // Export job data
      const outputPath = argument || path.join(process.cwd(), 'SCRAPI', 'data', 'output', 'job-data-export.json');
      const success = await dashboard.exportJobData(outputPath);
      
      if (success) {
        console.log(`✅ Job data exported to: ${outputPath}`);
      } else {
        console.log('❌ Failed to export job data');
        process.exit(1);
      }
      
    } else {
      // Display standard dashboard
      await dashboard.displayComprehensiveDashboard(false);
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
  JobStatusDashboard
};
