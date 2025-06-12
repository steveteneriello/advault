// batch-status-dashboard.cjs - Enhanced real-time batch job dashboard
const fs = require('fs');
const path = require('path');

// Import our modular components
const { BatchJobTracker } = require('../tracking/batch-tracker.cjs');
const { Logger } = require('../../utils/logging/logger.cjs');

class BatchStatusDashboard {
  constructor() {
    this.tracker = new BatchJobTracker();
    this.logger = new Logger('BatchStatusDashboard');
    this.refreshInterval = 5000; // 5 seconds
    this.isRunning = false;
  }

  /**
   * Display a comprehensive real-time dashboard
   */
  displayRealTimeDashboard() {
    // Clear screen
    console.clear();
    
    const stats = this.tracker.getBatchStatistics();
    const now = new Date().toLocaleString();
    
    console.log('╔' + '═'.repeat(78) + '╗');
    console.log('║' + ' '.repeat(20) + '🚀 SCRAPI BATCH JOB DASHBOARD' + ' '.repeat(19) + '║');
    console.log('║' + `Last Updated: ${now}`.padEnd(78) + '║');
    console.log('╠' + '═'.repeat(78) + '╣');
    
    // Job counts section
    console.log('║ 📊 JOB STATISTICS' + ' '.repeat(60) + '║');
    console.log('╠' + '─'.repeat(78) + '╣');
    console.log(`║ 📝 Submitted Jobs:     ${stats.submitted.count.toString().padStart(6)} jobs` + ' '.repeat(40) + '║');
    console.log(`║ ⚡ In Progress:        ${stats.inProgress.count.toString().padStart(6)} jobs` + ' '.repeat(40) + '║');
    console.log(`║ ✅ Completed Jobs:     ${stats.completed.count.toString().padStart(6)} jobs` + ' '.repeat(40) + '║');
    console.log(`║ 📈 Total Processed:    ${stats.total.toString().padStart(6)} jobs` + ' '.repeat(40) + '║');
    console.log(`║ 🎯 Completion Rate:    ${stats.completionRate.toString().padStart(6)}%` + ' '.repeat(44) + '║');
    
    if (stats.averageProcessingTime) {
      const avgTime = (stats.averageProcessingTime / 1000).toFixed(1);
      console.log(`║ ⏱️  Avg Processing:     ${avgTime.padStart(6)}s` + ' '.repeat(44) + '║');
    }
    
    console.log('╠' + '═'.repeat(78) + '╣');
    
    // Current activity section
    if (stats.inProgress.count > 0) {
      console.log('║ 🔄 CURRENTLY PROCESSING' + ' '.repeat(54) + '║');
      console.log('╠' + '─'.repeat(78) + '╣');
      
      stats.inProgress.queries.slice(0, 5).forEach((job, index) => {
        const elapsed = job.started_at ? 
          Math.round((new Date().getTime() - new Date(job.started_at).getTime()) / 1000) : 0;
        const timeStr = `${elapsed}s ago`;
        const query = job.query.substring(0, 50);
        const line = `║ ${(index + 1).toString().padStart(2)}. ${query.padEnd(50)} ${timeStr.padStart(10)} ║`;
        console.log(line);
      });
      
      if (stats.inProgress.count > 5) {
        console.log(`║     ... and ${stats.inProgress.count - 5} more jobs` + ' '.repeat(49) + '║');
      }
      
      console.log('╠' + '═'.repeat(78) + '╣');
    }
    
    // Recent completions
    if (stats.completed.count > 0) {
      console.log('║ 🎉 RECENTLY COMPLETED' + ' '.repeat(56) + '║');
      console.log('╠' + '─'.repeat(78) + '╣');
      
      stats.completed.queries.slice(-5).forEach((job, index) => {
        const timeStr = job.processing_time_ms ? 
          `${(job.processing_time_ms / 1000).toFixed(1)}s` : 'Unknown';
        const query = job.query.substring(0, 50);
        const line = `║ ${(index + 1).toString().padStart(2)}. ${query.padEnd(50)} ${timeStr.padStart(10)} ║`;
        console.log(line);
      });
      
      console.log('╠' + '═'.repeat(78) + '╣');
    }
    
    // System status
    const memUsage = process.memoryUsage();
    const memMB = Math.round(memUsage.rss / 1024 / 1024);
    const uptime = Math.round(process.uptime());
    
    console.log('║ 💻 SYSTEM STATUS' + ' '.repeat(61) + '║');
    console.log('╠' + '─'.repeat(78) + '╣');
    console.log(`║ Memory Usage:          ${memMB.toString().padStart(6)} MB` + ' '.repeat(43) + '║');
    console.log(`║ Uptime:                ${uptime.toString().padStart(6)} seconds` + ' '.repeat(38) + '║');
    console.log(`║ PID:                   ${process.pid.toString().padStart(6)}` + ' '.repeat(48) + '║');
    
    console.log('╚' + '═'.repeat(78) + '╝');
    console.log('\n🔄 Refreshing every 5 seconds... Press Ctrl+C to exit\n');
    
    return stats;
  }

  /**
   * Display a compact single-line status
   */
  displayCompactStatus() {
    const stats = this.tracker.getBatchStatistics();
    const timestamp = new Date().toLocaleTimeString();
    
    console.log(`[${timestamp}] 📊 Jobs: ${stats.submitted.count} submitted | ${stats.inProgress.count} processing | ${stats.completed.count} completed | ${stats.completionRate}% done`);
    
    return stats;
  }

  /**
   * Display detailed statistics in JSON format
   */
  displayDetailedStats() {
    const stats = this.tracker.getBatchStatistics();
    console.log(JSON.stringify(stats, null, 2));
    return stats;
  }

  /**
   * Display a progress bar for batch completion
   */
  displayProgressBar() {
    const stats = this.tracker.getBatchStatistics();
    
    if (stats.total === 0) {
      console.log('📭 No jobs to track');
      return stats;
    }
    
    const barWidth = 50;
    const completedRatio = stats.completed.count / stats.total;
    const completedBars = Math.round(completedRatio * barWidth);
    const remainingBars = barWidth - completedBars;
    
    const progressBar = '█'.repeat(completedBars) + '░'.repeat(remainingBars);
    
    console.log(`\n📊 Batch Progress: [${progressBar}] ${stats.completionRate}%`);
    console.log(`   Completed: ${stats.completed.count}/${stats.total} jobs`);
    
    if (stats.inProgress.count > 0) {
      console.log(`   Currently processing: ${stats.inProgress.count} jobs`);
    }
    
    if (stats.averageProcessingTime && stats.submitted.count > 0) {
      const estimatedTimeRemaining = Math.round(
        (stats.submitted.count * stats.averageProcessingTime) / 1000 / 60
      );
      console.log(`   Estimated time remaining: ~${estimatedTimeRemaining} minutes`);
    }
    
    console.log('');
    return stats;
  }

  /**
   * Start real-time monitoring
   */
  startRealTimeMonitoring() {
    this.isRunning = true;
    this.logger.log('🚀 Starting real-time monitoring...');
    
    const monitorLoop = () => {
      if (!this.isRunning) return;
      
      try {
        this.displayRealTimeDashboard();
      } catch (error) {
        this.logger.error(`❌ Dashboard error: ${error.message}`);
      }
      
      setTimeout(monitorLoop, this.refreshInterval);
    };
    
    // Start monitoring
    monitorLoop();
    
    // Handle graceful shutdown
    process.on('SIGINT', () => {
      this.stopRealTimeMonitoring();
    });
  }

  /**
   * Stop real-time monitoring
   */
  stopRealTimeMonitoring() {
    this.isRunning = false;
    console.clear();
    console.log('\n🛑 Monitoring stopped. Final status:');
    this.displayCompactStatus();
    console.log('\nGoodbye! 👋\n');
    process.exit(0);
  }

  /**
   * Export statistics to a file
   */
  exportStats(outputPath = null) {
    const stats = this.tracker.getBatchStatistics();
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    
    if (!outputPath) {
      outputPath = path.join(__dirname, '../../output-staging/reports', `batch-stats-${timestamp}.json`);
    }
    
    // Ensure directory exists
    const dir = path.dirname(outputPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    
    const exportData = {
      exported_at: new Date().toISOString(),
      stats: stats,
      system_info: {
        node_version: process.version,
        platform: process.platform,
        memory_usage: process.memoryUsage(),
        uptime: process.uptime()
      }
    };
    
    fs.writeFileSync(outputPath, JSON.stringify(exportData, null, 2));
    this.logger.log(`📊 Statistics exported to: ${outputPath}`);
    
    return outputPath;
  }

  /**
   * Watch for file changes and display alerts
   */
  watchForChanges() {
    const filesToWatch = [
      this.tracker.batchSubmittedPath,
      this.tracker.batchInProgressPath,
      this.tracker.batchCompletedPath
    ];
    
    this.logger.log('👀 Watching for batch file changes...');
    
    filesToWatch.forEach(filePath => {
      if (fs.existsSync(filePath)) {
        fs.watchFile(filePath, (curr, prev) => {
          if (curr.mtime !== prev.mtime) {
            const fileName = path.basename(filePath);
            this.logger.log(`📝 ${fileName} was updated`);
            this.displayCompactStatus();
          }
        });
      }
    });
  }
}

module.exports = { BatchStatusDashboard };

// CLI interface
if (require.main === module) {
  const dashboard = new BatchStatusDashboard();
  const command = process.argv[2];
  
  switch (command) {
    case 'live':
    case 'realtime':
    case 'monitor':
      dashboard.startRealTimeMonitoring();
      break;
      
    case 'compact':
    case 'status':
      dashboard.displayCompactStatus();
      break;
      
    case 'progress':
    case 'bar':
      dashboard.displayProgressBar();
      break;
      
    case 'stats':
    case 'json':
      dashboard.displayDetailedStats();
      break;
      
    case 'export':
      const outputPath = process.argv[3];
      dashboard.exportStats(outputPath);
      break;
      
    case 'watch':
      dashboard.watchForChanges();
      dashboard.displayCompactStatus();
      // Keep process alive
      setInterval(() => {}, 1000);
      break;
      
    default:
      console.log('📊 Batch Status Dashboard Commands:');
      console.log('');
      console.log('  live          - Real-time dashboard (default)');
      console.log('  compact       - Single-line status');
      console.log('  progress      - Progress bar view');
      console.log('  stats         - Detailed JSON statistics');
      console.log('  export [file] - Export stats to file');
      console.log('  watch         - Watch for file changes');
      console.log('');
      console.log('Examples:');
      console.log('  node batch-status-dashboard.cjs live');
      console.log('  node batch-status-dashboard.cjs export ./my-stats.json');
      console.log('');
      
      // Default to compact status if no command
      dashboard.displayCompactStatus();
      break;
  }
}
