#!/usr/bin/env node
// main-cli.js - Main CLI interface for all SCRAPI operations
const path = require('path');

/**
 * Display the main menu
 */
function displayMainMenu() {
  console.log('🚀 SCRAPI - Automated Search & Ad Intelligence Platform');
  console.log('====================================================');
  console.log('');
  console.log('📌 Entry Points:');
  console.log('');
  
  console.log('🔍 Single Query Processing:');
  console.log('   node SCRAPI/entry-points/single-query/scrapi-automation.cjs "query" "location"');
  console.log('   Example: node SCRAPI/entry-points/single-query/scrapi-automation.cjs "disaster restoration" "Phoenix, Arizona, United States"');
  console.log('');
  
  console.log('📦 Batch Processing:');
  console.log('   node SCRAPI/entry-points/batch-processing/scrapi-batch-automation.cjs [options]');
  console.log('   node SCRAPI/job-management/processors/batch-processor.cjs  # Modern processor');
  console.log('   Example: node SCRAPI/entry-points/batch-processing/scrapi-batch-automation.cjs --file my-queries.json --batch-size 10');
  console.log('');
  
  console.log('📊 Monitoring & Dashboards:');
  console.log('   node SCRAPI/job-management/tracking/batch-status-dashboard.cjs live');
  console.log('   node SCRAPI/job-management/tracking/batch-tracker.cjs dashboard');
  console.log('   Example: node SCRAPI/job-management/tracking/batch-status-dashboard.cjs progress');
  console.log('');
  
  console.log('⏰ Scheduled Automation:');
  console.log('   node SCRAPI/z-scrapi-scheduler/scheduler-cli.js');
  console.log('   Interactive scheduler management interface');
  console.log('');
  
  console.log('📋 Legacy Commands (still supported):');
  console.log('');
  
  console.log('🏃 Quick Commands:');
  console.log('   npm run scrapi                    # Quick single query (interactive)');
  console.log('   npm run scrapi-batch              # Quick batch processing');
  console.log('   npm run batch-status              # Quick status check');
  console.log('');
  
  console.log('🔧 Core Operations:');
  console.log('   npm run collect:ads               # Collect ads using Google Ads Scraper');
  console.log('   npm run collect:render            # Trigger rendered HTML/PNG collection');
  console.log('   npm run collect:and-process       # Collect and process ads in one step');
  console.log('   npm run process:stage             # Process data into staging table');
  console.log('   npm run process:render            # Process ad rendering');
  console.log('');
  
  console.log('📊 Data & Reports:');
  console.log('   npm run serp                      # Run SERP automation');
  console.log('   npm run render:html               # Render ad landing pages as HTML');
  console.log('   npm run render:png                # Generate PNG screenshots');
  console.log('   npm run reports:generate          # Generate processing reports');
  console.log('');
  
  console.log('🛠️  File Management:');
  console.log('   npm run archive:files             # Archive processed files to database');
  console.log('   npm run cleanup:old               # Clean up old files');
  console.log('   npm run view:backups              # View and manage file backups');
  console.log('');
  
  console.log('🔍 Utilities:');
  console.log('   npm run scrape:ips                # Get notifier IP list');
  console.log('   npm run test:supabase             # Test Supabase connection');
  console.log('   npm run test:oxylabs              # Test Oxylabs connection');
  console.log('');
  
  console.log('📖 Documentation:');
  console.log('   npm run help                      # Show this help menu');
  console.log('   npm run help:scheduler            # Scheduler system help');
  console.log('   npm run help:batch                # Batch processing help');
  console.log('');
  
  console.log('💡 Tips:');
  console.log('   • Use --help flag with any command for detailed options');
  console.log('   • All entry points support configuration validation');
  console.log('   • Logs are automatically saved to SCRAPI/data/staging/logs/');
  console.log('   • Use monitoring dashboard for real-time batch processing status');
  console.log('');
}

/**
 * Show specific help for a topic
 * @param {string} topic - Help topic
 */
function showSpecificHelp(topic) {
  switch (topic) {
    case 'single':
    case 'single-query':
      console.log('🔍 Single Query Processing Help');
      console.log('==============================');
      console.log('');
      console.log('Purpose: Process a single search query and location through the complete SCRAPI pipeline');
      console.log('');
      console.log('Usage:');
      console.log('   node SCRAPI/entry-points/single-query/scrapi-automation.cjs "query" "location"');
      console.log('');
      console.log('Examples:');
      console.log('   node SCRAPI/entry-points/single-query/scrapi-automation.cjs "disaster restoration" "Phoenix, Arizona, United States"');
      console.log('   node SCRAPI/entry-points/single-query/scrapi-automation.cjs "plumbing services"');
      console.log('');
      console.log('Notes:');
      console.log('   • If location is omitted, defaults to "Boston, Massachusetts, United States"');
      console.log('   • Quotes around multi-word queries/locations are recommended');
      console.log('   • Process includes: data collection → staging → rendering → storage');
      break;
      
    case 'batch':
    case 'batch-processing':
      console.log('📦 Batch Processing Help');
      console.log('========================');
      console.log('');
      console.log('Purpose: Process multiple queries from a JSON file in controlled batches');
      console.log('');
      console.log('Usage:');
      console.log('   node SCRAPI/entry-points/batch-processing/scrapi-batch-automation.cjs [options]');
      console.log('');
      console.log('Options:');
      console.log('   --file, -f <path>        Path to queries JSON file');
      console.log('   --batch-size, -b <size>  Queries per batch (default: 10, max: 100)');
      console.log('   --delay, -d <seconds>    Delay between batches (default: 30, max: 300)');
      console.log('');
      console.log('Examples:');
      console.log('   node SCRAPI/entry-points/batch-processing/scrapi-batch-automation.cjs');
      console.log('   node SCRAPI/entry-points/batch-processing/scrapi-batch-automation.cjs --file custom-queries.json --batch-size 5');
      console.log('');
      console.log('Query File Format:');
      console.log('   [');
      console.log('     { "query": "plumbing services", "location": "New York, NY, United States" },');
      console.log('     { "query": "disaster restoration", "location": "Los Angeles, CA, United States" }');
      console.log('   ]');
      break;
      
    case 'monitoring':
    case 'dashboard':
      console.log('📊 Monitoring Dashboard Help');
      console.log('============================');
      console.log('');
      console.log('Purpose: Real-time monitoring of batch processing status and job queues');
      console.log('');
      console.log('Modern Usage:');
      console.log('   node SCRAPI/job-management/tracking/batch-status-dashboard.cjs [command]');
      console.log('');
      console.log('Commands:');
      console.log('   live          Real-time dashboard (default)');
      console.log('   compact       Single-line status');
      console.log('   progress      Progress bar view');
      console.log('   stats         Detailed JSON statistics');
      console.log('   export [file] Export stats to file');
      console.log('   watch         Watch for file changes');
      console.log('');
      console.log('Job Tracking:');
      console.log('   node SCRAPI/job-management/tracking/batch-tracker.cjs [command]');
      console.log('');
      console.log('Tracker Commands:');
      console.log('   dashboard     Show job status dashboard');
      console.log('   find <id>     Find a specific job');
      console.log('   archive [n]   Archive completed jobs');
      console.log('');
      console.log('Legacy Usage:');
      console.log('   node SCRAPI/entry-points/monitoring/batch-status-dashboard.cjs [options]');
      console.log('');
      console.log('Options:');
      console.log('   --once, -o               Show status once and exit');
      console.log('   --refresh, -r <seconds>  Refresh interval (default: 5 seconds)');
      console.log('');
      console.log('Examples:');
      console.log('   node SCRAPI/entry-points/monitoring/batch-status-dashboard.cjs');
      console.log('   node SCRAPI/entry-points/monitoring/batch-status-dashboard.cjs --once');
      console.log('   node SCRAPI/entry-points/monitoring/batch-status-dashboard.cjs --refresh 10');
      console.log('');
      console.log('Features:');
      console.log('   • Real-time job status updates');
      console.log('   • Progress visualization');
      console.log('   • Queue status and recent activity');
      console.log('   • Automatic refresh with customizable intervals');
      break;
      
    case 'scheduler':
      console.log('⏰ Scheduler System Help');
      console.log('========================');
      console.log('');
      console.log('Purpose: Schedule and automate SCRAPI jobs using cron expressions');
      console.log('');
      console.log('Usage:');
      console.log('   node SCRAPI/z-scrapi-scheduler/scheduler-cli.js');
      console.log('');
      console.log('Features:');
      console.log('   • Interactive menu system');
      console.log('   • Create schedules from query files');
      console.log('   • Manage configurations');
      console.log('   • Monitor schedule execution');
      console.log('   • Automatic result processing');
      console.log('');
      console.log('Documentation:');
      console.log('   See SCRAPI/z-scrapi-scheduler/README.md for detailed information');
      break;
      
    case 'job-management':
    case 'jobs':
      console.log('🛠️ Job Management Commands Help');
      console.log('==============================');
      console.log('');
      console.log('Purpose: Manage and monitor batch jobs and processing status');
      console.log('');
      console.log('Commands:');
      console.log('   scrapi batch-tracker status                     - Show batch job status');
      console.log('   scrapi batch-tracker move-to-progress <job_id>  - Move job to in-progress');
      console.log('   scrapi batch-tracker move-to-completed <job_id> - Move job to completed');
      console.log('');
      console.log('   scrapi batch-processor                 - Start continuous processing');
      console.log('   scrapi batch-processor once            - Run single processing cycle');
      console.log('   scrapi batch-processor status          - Show processor status');
      console.log('   scrapi batch-processor continuous 5    - Run 5 cycles then stop');
      console.log('');
      console.log('   scrapi job-dashboard                    - Show job status dashboard');
      console.log('   scrapi job-dashboard detailed           - Show detailed metrics');
      console.log('   scrapi job-dashboard job <job_id>       - Show specific job details');
      console.log('   scrapi job-dashboard export [path]     - Export job data to JSON');
      console.log('');
      console.log('   scrapi batch-dashboard                  - Show batch status dashboard');
      console.log('   scrapi batch-dashboard detailed         - Show detailed information');
      console.log('   scrapi batch-dashboard export [path]   - Export batch data to JSON');
      console.log('');
      console.log('Notes:');
      console.log('   • Use "scrapi <command> --help" for detailed command options');
      console.log('   • Job and batch dashboards provide real-time monitoring');
      console.log('   • Batch processor can run continuously or in single cycles');
      break;
      
    default:
      console.log('❓ Unknown help topic. Available topics:');
      console.log('   • single-query, single');
      console.log('   • batch-processing, batch');
      console.log('   • monitoring, dashboard');
      console.log('   • scheduler');
      console.log('   • job-management, jobs');
  }
  console.log('');
}



// Removed duplicate main function - keeping the async version below

/**
 * Main function to handle CLI commands
 */
async function main() {
  const args = process.argv.slice(2);
  const command = args[0];

  if (!command) {
    displayMainMenu();
    return;
  }

  if (command === 'help') {
    const topic = args[1];
    if (topic) {
      showSpecificHelp(topic);
    } else {
      displayMainMenu();
    }
    return;
  }

  // Job Management Commands
  const jobManagementCommands = [
    'batch-tracker', 'batch-processor', 'job-dashboard', 'batch-dashboard'
  ];

  if (jobManagementCommands.includes(command)) {
    await executeJobManagement(command, args);
    return;
  }

  // Unknown command
  console.log(`❓ Unknown command: ${command}`);
  console.log('Run without arguments to see the main menu.');
  console.log('Run with "help <topic>" for specific help.');
  process.exit(1);
}

/**
 * Execute job management commands
 * @param {string} command - The command to execute
 * @param {Array} args - Command arguments
 */
async function executeJobManagement(command, args) {
  const { spawn } = require('child_process');
  const path = require('path');

  let scriptPath;
  const commandArgs = args.slice(1); // Remove the command itself

  switch (command) {
    case 'batch-tracker':
      scriptPath = path.join(process.cwd(), 'SCRAPI', 'job-management', 'tracking', 'batch-job-tracker.cjs');
      break;
    case 'batch-processor':
      scriptPath = path.join(process.cwd(), 'SCRAPI', 'job-management', 'processors', 'batch-job-processor.cjs');
      break;
    case 'job-dashboard':
      scriptPath = path.join(process.cwd(), 'SCRAPI', 'entry-points', 'monitoring', 'batch-status-dashboard.cjs');
      break;
    case 'batch-dashboard':
      scriptPath = path.join(process.cwd(), 'SCRAPI', 'entry-points', 'monitoring', 'batch-status-dashboard.cjs');
      break;
    default:
      console.log(`❓ Unknown job management command: ${command}`);
      return;
  }

  const proc = spawn('node', [scriptPath, ...commandArgs], {
    stdio: 'inherit',
    cwd: process.cwd()
  });

  proc.on('close', (code) => {
    process.exit(code);
  });

  proc.on('error', (error) => {
    console.error(`❌ Failed to execute ${command}: ${error.message}`);
    process.exit(1);
  });
}

// Run if executed directly
if (require.main === module) {
  main().catch(error => {
    console.error(`❌ CLI Error: ${error.message}`);
    process.exit(1);
  });
}

module.exports = { displayMainMenu, showSpecificHelp, executeJobManagement };
