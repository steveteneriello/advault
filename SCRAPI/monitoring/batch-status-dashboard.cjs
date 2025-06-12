// batch-status-dashboard.cjs - Modernized batch status dashboard with enhanced visualization
const { validateAllConfigs, getOxylabsConfig, getSupabaseConfig } = require('../../config/environment.cjs');
const { createLogger } = require('../../utils/logging/logger.cjs');
const { ErrorHandler, handleAsyncError } = require('../../utils/error-handling/error-handlers.cjs');
const { BatchJobTracker } = require('./batch-job-tracker.cjs');
const { JobTrackingService } = require('./job-tracking-service.cjs');

/**
 * Batch Status Dashboard - Enhanced visualization of batch job status with real-time data
 */
class BatchStatusDashboard {
  constructor() {
    const validation = validateAllConfigs();
    if (!validation.isValid) {
      throw new Error(`Configuration validation failed: ${validation.errors.join(", ")}`);
    }
    this.config = {
      oxylabs: getOxylabsConfig(),
      supabase: getSupabaseConfig()
    };
    this.logger = createLogger('BatchStatusDashboard');
    this.errorHandler = new ErrorHandler(this.logger);
    this.batchTracker = new BatchJobTracker();
    this.jobTracker = new JobTrackingService();
    
    this.logger.info('BatchStatusDashboard initialized', {
      component: 'BatchStatusDashboard',
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
   * Get comprehensive batch job statistics including database tracking
   * @returns {Promise<Object>} - Enhanced batch job statistics
   */
  async getEnhancedBatchStats() {
    return handleAsyncError(async () => {
      this.logger.debug('Getting enhanced batch statistics');
      
      // Get file-based batch statistics
      const batchStats = await this.batchTracker.getBatchJobStats();
      
      // Get database job tracking statistics
      const trackingStatsResult = await this.jobTracker.getJobTrackingStats();
      const trackingStats = trackingStatsResult.success ? trackingStatsResult.data : null;
      
      // Combine statistics
      const enhancedStats = {
        batch: batchStats,
        tracking: trackingStats,
        combined: {
          totalJobs: batchStats.total + (trackingStats?.totalCount || 0),
          fileBasedJobs: batchStats.total,
          databaseTrackedJobs: trackingStats?.totalCount || 0
        },
        lastUpdated: new Date().toISOString()
      };
      
      this.logger.debug('Enhanced batch statistics calculated', { 
        fileJobs: batchStats.total,
        dbJobs: trackingStats?.totalCount || 0
      });
      
      return enhancedStats;
    }, this.errorHandler, 'getEnhancedBatchStats', {
      batch: { submitted: 0, inProgress: 0, completed: 0, total: 0 },
      tracking: null,
      combined: { totalJobs: 0, fileBasedJobs: 0, databaseTrackedJobs: 0 }
    });
  }

  /**
   * Display comprehensive batch job status dashboard
   * @param {boolean} showDetailed - Whether to show detailed job information
   * @returns {Promise<void>}
   */
  async displayComprehensiveDashboard(showDetailed = false) {
    return handleAsyncError(async () => {
      this.logger.info('Displaying comprehensive batch status dashboard', { showDetailed });
      
      // Get enhanced statistics
      const stats = await this.getEnhancedBatchStats();
      
      // Display header
      console.log('\n╔═══════════════════════════════════════════════════════════════╗');
      console.log('║                    BATCH STATUS DASHBOARD                    ║');
      console.log('╠═══════════════════════════════════════════════════════════════╣');
      console.log(`║ Generated: ${new Date().toLocaleString()}${' '.repeat(31 - new Date().toLocaleString().length)}║`);
      console.log('╚═══════════════════════════════════════════════════════════════╝\n');
      
      // Display combined statistics
      console.log('📊 OVERVIEW:');
      console.log('━━━━━━━━━━━━');
      console.log(`🎯 Total Jobs (All Systems): ${stats.combined.totalJobs}`);
      console.log(`📁 File-Based Jobs: ${stats.combined.fileBasedJobs}`);
      console.log(`🗄️  Database-Tracked Jobs: ${stats.combined.databaseTrackedJobs}`);
      
      // Display file-based batch statistics
      console.log('\n📁 BATCH FILE STATUS:');
      console.log('━━━━━━━━━━━━━━━━━━━━━');
      console.log(`📝 Submitted: ${stats.batch.submitted}`);
      console.log(`🔄 In Progress: ${stats.batch.inProgress}`);
      console.log(`✅ Completed: ${stats.batch.completed}`);
      console.log(`📊 Total: ${stats.batch.total}`);
      
      // Display database tracking statistics if available
      if (stats.tracking) {
        console.log('\n🗄️  DATABASE TRACKING STATUS:');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log(`📊 Total Tracked Jobs: ${stats.tracking.totalCount || 0}`);
        
        if (stats.tracking.statusCounts && stats.tracking.statusCounts.length > 0) {
          console.log('\nStatus Distribution:');
          stats.tracking.statusCounts.forEach(status => {
            const emoji = this.getStatusEmoji(status.status);
            console.log(`  ${emoji} ${status.status}: ${status.count}`);
          });
        }
        
        if (stats.tracking.stepCounts && stats.tracking.stepCounts.length > 0) {
          console.log('\nProcessing Step Status:');
          const stepGroups = {};
          stats.tracking.stepCounts.forEach(step => {
            if (!stepGroups[step.step]) {
              stepGroups[step.step] = [];
            }
            stepGroups[step.step].push(step);
          });
          
          Object.entries(stepGroups).forEach(([stepName, steps]) => {
            console.log(`\n  ${stepName.toUpperCase()}:`);
            steps.forEach(step => {
              const emoji = this.getStatusEmoji(step.status);
              console.log(`    ${emoji} ${step.status}: ${step.count}`);
            });
          });
        }
      }
      
      if (showDetailed) {
        await this.displayDetailedJobInformation();
      }
      
      // Display recent activity
      await this.displayRecentActivity();
      
      // Display commands
      console.log('\n🛠️  AVAILABLE COMMANDS:');
      console.log('━━━━━━━━━━━━━━━━━━━━━');
      console.log('• View batch status: node SCRAPI/monitoring/batch-status-dashboard.cjs');
      console.log('• View detailed info: node SCRAPI/monitoring/batch-status-dashboard.cjs detailed');
      console.log('• Manage batch jobs: node SCRAPI/job-management/tracking/batch-job-tracker.cjs');
      console.log('• Process batch jobs: node SCRAPI/job-management/processors/batch-job-processor.cjs');
      console.log('• View job tracking: node SCRAPI/monitoring/job-status-dashboard.cjs');
      
      console.log('\n═══════════════════════════════════════════════════════════════\n');
    }, this.errorHandler, 'displayComprehensiveDashboard');
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
   * Display detailed job information
   * @returns {Promise<void>}
   */
  async displayDetailedJobInformation() {
    return handleAsyncError(async () => {
      console.log('\n📋 DETAILED JOB INFORMATION:');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      
      // Get jobs by status
      const submittedJobs = await this.batchTracker.getJobsByStatus('submitted', 5);
      const inProgressJobs = await this.batchTracker.getJobsByStatus('inProgress', 5);
      const completedJobs = await this.batchTracker.getJobsByStatus('completed', 5);
      
      // Display submitted jobs
      if (submittedJobs.length > 0) {
        console.log('\n📝 Recent Submitted Jobs:');
        submittedJobs.forEach((job, index) => {
          console.log(`  ${index + 1}. ${job.id} - "${job.query}"`);
          console.log(`     📍 Location: ${job.geo_location || 'N/A'}`);
          console.log(`     ⏰ Submitted: ${job.submitted_at ? new Date(job.submitted_at).toLocaleString() : 'N/A'}`);
        });
      }
      
      // Display in-progress jobs
      if (inProgressJobs.length > 0) {
        console.log('\n🔄 Current In-Progress Jobs:');
        inProgressJobs.forEach((job, index) => {
          const startTime = job.moved_to_progress_at ? new Date(job.moved_to_progress_at) : null;
          const duration = startTime ? Date.now() - startTime.getTime() : 0;
          
          console.log(`  ${index + 1}. ${job.id} - "${job.query}"`);
          console.log(`     📍 Location: ${job.geo_location || 'N/A'}`);
          console.log(`     ⏰ Started: ${startTime ? startTime.toLocaleString() : 'N/A'}`);
          console.log(`     ⌛ Duration: ${this.formatDuration(duration)}`);
        });
      }
      
      // Display completed jobs
      if (completedJobs.length > 0) {
        console.log('\n✅ Recently Completed Jobs:');
        completedJobs.forEach((job, index) => {
          const completedTime = job.completed_at ? new Date(job.completed_at) : null;
          const startTime = job.moved_to_progress_at ? new Date(job.moved_to_progress_at) : null;
          const duration = completedTime && startTime ? completedTime.getTime() - startTime.getTime() : 0;
          
          console.log(`  ${index + 1}. ${job.id} - "${job.query}"`);
          console.log(`     📍 Location: ${job.geo_location || 'N/A'}`);
          console.log(`     ⏰ Completed: ${completedTime ? completedTime.toLocaleString() : 'N/A'}`);
          console.log(`     ⌛ Processing Time: ${this.formatDuration(duration)}`);
        });
      }
    }, this.errorHandler, 'displayDetailedJobInformation');
  }

  /**
   * Display recent activity summary
   * @returns {Promise<void>}
   */
  async displayRecentActivity() {
    return handleAsyncError(async () => {
      console.log('\n📈 RECENT ACTIVITY:');
      console.log('━━━━━━━━━━━━━━━━━━━');
      
      // Get recent database job tracking data
      const recentJobsResult = await this.jobTracker.getAllJobTracking(10, 0);
      
      if (recentJobsResult.success && recentJobsResult.data && recentJobsResult.data.length > 0) {
        console.log('\n🗄️  Recent Database-Tracked Jobs:');
        recentJobsResult.data.slice(0, 5).forEach((job, index) => {
          const startTime = job.started_at ? new Date(job.started_at) : null;
          const completedTime = job.completed_at ? new Date(job.completed_at) : null;
          const duration = completedTime && startTime ? completedTime.getTime() - startTime.getTime() : 
                          startTime ? Date.now() - startTime.getTime() : 0;
          
          console.log(`  ${index + 1}. ${job.job_id} - "${job.query}" in ${job.location}`);
          console.log(`     📊 Status: ${this.getStatusEmoji(job.status)} ${job.status}`);
          console.log(`     ⏰ ${completedTime ? 'Completed' : 'Started'}: ${(completedTime || startTime)?.toLocaleString() || 'N/A'}`);
          console.log(`     ⌛ Duration: ${this.formatDuration(duration)}`);
          
          if (job.new_ads_count || job.new_advertisers_count) {
            console.log(`     📊 Results: ${job.new_ads_count || 0} ads, ${job.new_advertisers_count || 0} advertisers`);
          }
        });
      }
      
      // Get recent batch activity
      const recentCompleted = await this.batchTracker.getJobsByStatus('completed', 5);
      if (recentCompleted.length > 0) {
        console.log('\n📁 Recent Batch Completions:');
        recentCompleted
          .sort((a, b) => new Date(b.completed_at || 0) - new Date(a.completed_at || 0))
          .slice(0, 3)
          .forEach((job, index) => {
            console.log(`  ${index + 1}. ${job.id} - "${job.query}"`);
            console.log(`     ⏰ Completed: ${job.completed_at ? new Date(job.completed_at).toLocaleString() : 'N/A'}`);
          });
      }
      
      // Display system health indicators
      const stats = await this.getEnhancedBatchStats();
      console.log('\n🏥 SYSTEM HEALTH:');
      console.log(`  📁 Batch Files: ${stats.batch.total > 0 ? '✅ Active' : '⚠️  No active jobs'}`);
      console.log(`  🗄️  Database: ${stats.tracking ? '✅ Connected' : '❌ No connection'}`);
      console.log(`  🔄 Processing: ${stats.batch.inProgress > 0 ? '✅ Active' : '💤 Idle'}`);
    }, this.errorHandler, 'displayRecentActivity');
  }

  /**
   * Export batch statistics to JSON
   * @param {string} outputPath - Path to save the export
   * @returns {Promise<boolean>} - Whether export was successful
   */
  async exportStatistics(outputPath) {
    return handleAsyncError(async () => {
      this.logger.info('Exporting batch statistics', { outputPath });
      
      const stats = await this.getEnhancedBatchStats();
      const exportData = {
        ...stats,
        exportedAt: new Date().toISOString(),
        version: '2.0.0'
      };
      
      const fs = require('fs').promises;
      const path = require('path');
      
      // Ensure directory exists
      const dir = path.dirname(outputPath);
      await fs.mkdir(dir, { recursive: true });
      
      await fs.writeFile(outputPath, JSON.stringify(exportData, null, 2));
      
      this.logger.info('Batch statistics exported successfully', { outputPath });
      return true;
    }, this.errorHandler, 'exportStatistics', false);
  }
}

/**
 * Main function for CLI usage
 */
async function main() {
  const dashboard = new BatchStatusDashboard();
  
  try {
    // Get command line arguments
    const command = process.argv[2];
    
    if (command === 'detailed') {
      // Display detailed dashboard
      await dashboard.displayComprehensiveDashboard(true);
    } else if (command === 'export') {
      // Export statistics
      const outputPath = process.argv[3] || path.join(process.cwd(), 'SCRAPI', 'data', 'output', 'batch-stats-export.json');
      const success = await dashboard.exportStatistics(outputPath);
      
      if (success) {
        console.log(`✅ Statistics exported to: ${outputPath}`);
      } else {
        console.log('❌ Failed to export statistics');
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
  BatchStatusDashboard
};
