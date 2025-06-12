#!/usr/bin/env node
// batch-status-dashboard.js - Real-time batch processing monitoring dashboard
const fs = require('fs');
const { Logger } = require('../../utils/logging/logger.cjs');
const { BATCH_FILES } = require('../../config/constants.cjs');

class BatchStatusDashboard {
  constructor() {
    this.logger = new Logger('batch-dashboard');
    this.refreshInterval = 5000; // 5 seconds
    this.isRunning = false;
  }
  
  /**
   * Start the monitoring dashboard
   * @param {Object} options - Dashboard options
   */
  async start(options = {}) {
    this.refreshInterval = options.refreshInterval || this.refreshInterval;
    const continuous = options.continuous !== false;
    
    console.log('📊 SCRAPI Batch Status Dashboard');
    console.log('================================');
    console.log('');
    
    if (continuous) {
      this.isRunning = true;
      console.log(`🔄 Continuous monitoring mode (refresh every ${this.refreshInterval/1000}s)`);
      console.log('Press Ctrl+C to exit');
      console.log('');
      
      // Handle graceful shutdown
      process.on('SIGINT', () => {
        console.log('\n\n👋 Shutting down dashboard...');
        this.isRunning = false;
        process.exit(0);
      });
      
      // Start continuous monitoring
      while (this.isRunning) {
        this.displayStatus();
        await this.delay(this.refreshInterval);
        if (this.isRunning) {
          // Clear screen for next update
          console.clear();
          console.log('📊 SCRAPI Batch Status Dashboard');
          console.log('================================');
          console.log('');
        }
      }
    } else {
      // Single status check
      this.displayStatus();
    }
  }
  
  /**
   * Display current batch processing status
   */
  displayStatus() {
    const timestamp = new Date().toLocaleString();
    console.log(`🕐 Last updated: ${timestamp}`);
    console.log('');
    
    try {
      const stats = this.getBatchStats();
      
      // Overall summary
      console.log('📈 Overall Status:');
      console.log(`   Total jobs: ${stats.total}`);
      console.log(`   ⏳ Submitted: ${stats.submitted.length} (${this.getPercentage(stats.submitted.length, stats.total)}%)`);
      console.log(`   🔄 In Progress: ${stats.inProgress.length} (${this.getPercentage(stats.inProgress.length, stats.total)}%)`);
      console.log(`   ✅ Completed: ${stats.completed.length} (${this.getPercentage(stats.completed.length, stats.total)}%)`);
      console.log('');
      
      // Progress bar
      this.displayProgressBar(stats);
      console.log('');
      
      // Recent activity
      this.displayRecentActivity(stats);
      console.log('');
      
      // Queue status
      this.displayQueueStatus(stats);
      
    } catch (error) {
      console.error(`❌ Error reading batch status: ${error.message}`);
    }
  }
  
  /**
   * Get batch processing statistics
   * @returns {Object} - Statistics object
   */
  getBatchStats() {
    const stats = {
      submitted: [],
      inProgress: [],
      completed: [],
      total: 0
    };
    
    // Read submitted jobs
    if (fs.existsSync(BATCH_FILES.submitted)) {
      try {
        const content = fs.readFileSync(BATCH_FILES.submitted, 'utf8');
        const data = JSON.parse(content) || {};
        stats.submitted = Array.isArray(data) ? data : (data.queries || []);
      } catch (error) {
        this.logger.warn(`Error reading submitted jobs: ${error.message}`);
      }
    }
    
    // Read in-progress jobs
    if (fs.existsSync(BATCH_FILES.inProgress)) {
      try {
        const content = fs.readFileSync(BATCH_FILES.inProgress, 'utf8');
        const data = JSON.parse(content) || {};
        stats.inProgress = Array.isArray(data) ? data : (data.queries || []);
      } catch (error) {
        this.logger.warn(`Error reading in-progress jobs: ${error.message}`);
      }
    }
    
    // Read completed jobs
    if (fs.existsSync(BATCH_FILES.completed)) {
      try {
        const content = fs.readFileSync(BATCH_FILES.completed, 'utf8');
        const data = JSON.parse(content) || {};
        stats.completed = Array.isArray(data) ? data : (data.queries || []);
      } catch (error) {
        this.logger.warn(`Error reading completed jobs: ${error.message}`);
      }
    }
    
    stats.total = stats.submitted.length + stats.inProgress.length + stats.completed.length;
    
    return stats;
  }
  
  /**
   * Display progress bar
   * @param {Object} stats - Batch statistics
   */
  displayProgressBar(stats) {
    const width = 50;
    const completed = stats.completed.length;
    const total = stats.total;
    
    if (total === 0) {
      console.log('📊 Progress: No jobs found');
      return;
    }
    
    const progress = completed / total;
    const filledWidth = Math.round(progress * width);
    const emptyWidth = width - filledWidth;
    
    const progressBar = '█'.repeat(filledWidth) + '░'.repeat(emptyWidth);
    const percentage = Math.round(progress * 100);
    
    console.log(`📊 Progress: [${progressBar}] ${percentage}% (${completed}/${total})`);
  }
  
  /**
   * Display recent activity
   * @param {Object} stats - Batch statistics
   */
  displayRecentActivity(stats) {
    console.log('🕒 Recent Activity:');
    
    // Get recent completed jobs (last 5)
    const recentCompleted = stats.completed
      .sort((a, b) => new Date(b.completedAt || b.submittedAt) - new Date(a.completedAt || a.submittedAt))
      .slice(0, 5);
    
    if (recentCompleted.length > 0) {
      recentCompleted.forEach(job => {
        const time = new Date(job.completedAt || job.submittedAt).toLocaleTimeString();
        console.log(`   ✅ ${time} - "${job.query}" (${job.location})`);
      });
    } else {
      console.log('   No recent completed jobs');
    }
  }
  
  /**
   * Display queue status
   * @param {Object} stats - Batch statistics
   */
  displayQueueStatus(stats) {
    console.log('🔄 Queue Status:');
    
    if (stats.submitted.length > 0) {
      console.log(`   📋 ${stats.submitted.length} jobs waiting to be processed`);
      
      // Show next few jobs in queue
      const nextJobs = stats.submitted.slice(0, 3);
      nextJobs.forEach((job, index) => {
        console.log(`   ${index + 1}. "${job.query}" (${job.location})`);
      });
      
      if (stats.submitted.length > 3) {
        console.log(`   ... and ${stats.submitted.length - 3} more`);
      }
    } else {
      console.log('   📋 No jobs in queue');
    }
    
    if (stats.inProgress.length > 0) {
      console.log(`   ⚙️  ${stats.inProgress.length} jobs currently being processed`);
    }
  }
  
  /**
   * Calculate percentage
   * @param {number} value - Value
   * @param {number} total - Total
   * @returns {number} - Percentage
   */
  getPercentage(value, total) {
    if (total === 0) return 0;
    return Math.round((value / total) * 100);
  }
  
  /**
   * Add delay
   * @param {number} ms - Milliseconds to wait
   */
  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

/**
 * Parse command line arguments
 * @param {Array} args - Command line arguments
 * @returns {Object} - Parsed options
 */
function parseArguments(args) {
  const options = {
    continuous: true,
    refreshInterval: 5000
  };
  
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    
    if (arg === '--once' || arg === '-o') {
      options.continuous = false;
    } else if (arg === '--refresh' || arg === '-r') {
      options.refreshInterval = parseInt(args[i + 1]) * 1000;
      i++; // Skip next argument
    }
  }
  
  return options;
}

/**
 * Show usage information
 */
function showUsage() {
  console.log('Usage: node SCRAPI/entry-points/monitoring/batch-status-dashboard.js [options]');
  console.log('');
  console.log('Options:');
  console.log('  --once, -o               Show status once and exit (default: continuous monitoring)');
  console.log('  --refresh, -r <seconds>  Refresh interval in seconds (default: 5)');
  console.log('');
  console.log('Examples:');
  console.log('  node SCRAPI/entry-points/monitoring/batch-status-dashboard.js');
  console.log('  node SCRAPI/entry-points/monitoring/batch-status-dashboard.js --once');
  console.log('  node SCRAPI/entry-points/monitoring/batch-status-dashboard.js --refresh 10');
}

/**
 * Main execution function
 */
async function main() {
  try {
    const args = process.argv.slice(2);
    
    // Show help if requested
    if (args.includes('--help') || args.includes('-h')) {
      showUsage();
      process.exit(0);
    }
    
    const options = parseArguments(args);
    const dashboard = new BatchStatusDashboard();
    
    await dashboard.start(options);
    
  } catch (error) {
    console.error(`❌ Fatal error: ${error.message}`);
    process.exit(1);
  }
}

// Run if executed directly
if (require.main === module) {
  main().catch(error => {
    console.error(`❌ Fatal error: ${error.message}`);
    process.exit(1);
  });
}

module.exports = { BatchStatusDashboard };
