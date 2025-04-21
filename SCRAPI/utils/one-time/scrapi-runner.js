// SCRAPI Runner Utility - A simple utility to run SCRAPI commands
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

// Create logs directory if it doesn't exist
const logsDir = path.join(process.cwd(), 'SCRAPI', 'output-staging', 'logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

// Log file path
const logFile = path.join(logsDir, `scrapi-runner-${new Date().toISOString().replace(/[:.]/g, '-')}.log`);

// Function to log messages to both console and file
function log(message) {
  const timestamp = new Date().toISOString();
  const logMessage = `[${timestamp}] ${message}`;
  
  console.log(logMessage);
  fs.appendFileSync(logFile, logMessage + '\n');
}

// Function to run a command and return a promise
function runCommand(command, args) {
  return new Promise((resolve, reject) => {
    log(`Running command: ${command} ${args.join(' ')}`);
    
    const childProcess = spawn(command, args, { stdio: 'inherit' });
    
    childProcess.on('close', (code) => {
      if (code === 0) {
        log(`Command completed successfully: ${command} ${args.join(' ')}`);
        resolve();
      } else {
        const errorMessage = `Command failed with code ${code}: ${command} ${args.join(' ')}`;
        log(errorMessage);
        reject(new Error(errorMessage));
      }
    });
    
    childProcess.on('error', (err) => {
      const errorMessage = `Error running command: ${err.message}`;
      log(errorMessage);
      reject(new Error(errorMessage));
    });
  });
}

// Function to display help
function displayHelp() {
  console.log(`
SCRAPI Runner Utility
=====================

Usage:
  node SCRAPI/utils/scrapi-runner.js <command> [options]

Commands:
  scrapi <query> <location>       Run the SCRAPI automation for a single query
  batch                           Run the SCRAPI batch automation
  serp <query> <location>         Run the SERP automation
  keyword <batch_id> <keyword>    Generate search queries from locations
  process                         Process batch jobs from Oxylabs
  test                           Run connection tests to Oxylabs
  monitor [duration] [interval]   Monitor Oxylabs connections
  help                           Display this help message

Examples:
  node SCRAPI/utils/scrapi-runner.js scrapi "plumbers near me" "Boston, Massachusetts, United States"
  node SCRAPI/utils/scrapi-runner.js batch
  node SCRAPI/utils/scrapi-runner.js serp "pest control" "Denver, Colorado, United States"
  node SCRAPI/utils/scrapi-runner.js keyword EAS-1 "CITY plumber"
  node SCRAPI/utils/scrapi-runner.js process
  node SCRAPI/utils/scrapi-runner.js test
  node SCRAPI/utils/scrapi-runner.js monitor 300 30
  `);
}

// Main function to run the utility
async function main() {
  try {
    // Get command line arguments
    const args = process.argv.slice(2);
    
    if (args.length === 0 || args[0] === 'help') {
      displayHelp();
      return;
    }
    
    const command = args[0];
    
    switch (command) {
      case 'scrapi':
        if (args.length < 3) {
          log('❌ Error: Not enough arguments provided for scrapi command');
          log('Usage: node SCRAPI/utils/scrapi-runner.js scrapi <query> <location>');
          log('Example: node SCRAPI/utils/scrapi-runner.js scrapi "plumbers near me" "Boston, Massachusetts, United States"');
          return;
        }
        
        const query = args[1];
        const location = args[2];
        
        log('🚀 Running SCRAPI automation');
        log(`Query: "${query}"`);
        log(`Location: "${location}"`);
        
        await runCommand('node', [
          'SCRAPI/d-automations/1-automation-triggers/scrapi-automation.js',
          query,
          location
        ]);
        
        log('✅ SCRAPI automation completed successfully');
        break;
        
      case 'batch':
        log('🚀 Running SCRAPI batch automation');
        
        await runCommand('node', [
          'SCRAPI/d-automations/1-automation-triggers/scrapi-batch-automation.js'
        ]);
        
        log('✅ SCRAPI batch automation completed successfully');
        break;
        
      case 'serp':
        if (args.length < 3) {
          log('❌ Error: Not enough arguments provided for serp command');
          log('Usage: node SCRAPI/utils/scrapi-runner.js serp <query> <location>');
          log('Example: node SCRAPI/utils/scrapi-runner.js serp "pest control" "Denver, Colorado, United States"');
          return;
        }
        
        const serpQuery = args[1];
        const serpLocation = args[2];
        
        log('🚀 Running SERP automation');
        log(`Query: "${serpQuery}"`);
        log(`Location: "${serpLocation}"`);
        
        await runCommand('node', [
          'SCRAPI/d-automations/3-serp-runner/automate-serp.js',
          serpQuery,
          serpLocation
        ]);
        
        log('✅ SERP automation completed successfully');
        break;
        
      case 'keyword':
        if (args.length < 3) {
          log('❌ Error: Not enough arguments provided for keyword command');
          log('Usage: node SCRAPI/utils/scrapi-runner.js keyword <batch_id> <keyword>');
          log('Example: node SCRAPI/utils/scrapi-runner.js keyword EAS-1 "CITY plumber"');
          return;
        }
        
        const batchId = args[1];
        const keyword = args[2];
        
        log('🚀 Running keyword feeder');
        log(`Batch ID: "${batchId}"`);
        log(`Keyword: "${keyword}"`);
        
        await runCommand('node', [
          'SCRAPI/b-keyword-feeder/keyword-feeder.js',
          batchId,
          keyword
        ]);
        
        log('✅ Keyword feeder completed successfully');
        break;
        
      case 'process':
        log('🚀 Running batch job processor');
        
        await runCommand('node', [
          'SCRAPI/e-job-management/process-batch-jobs-from-oxylabs.js'
        ]);
        
        log('✅ Batch job processor completed successfully');
        break;
        
      case 'test':
        log('🚀 Running Oxylabs connection test');
        
        await runCommand('node', [
          'SCRAPI/utils/connection-monitor.js',
          'test'
        ]);
        
        log('✅ Connection test completed successfully');
        break;
        
      case 'monitor':
        const duration = args[1] || '300';
        const interval = args[2] || '30';
        
        log(`🚀 Monitoring Oxylabs connections for ${duration} seconds (interval: ${interval} seconds)`);
        
        await runCommand('node', [
          'SCRAPI/utils/connection-monitor.js',
          'monitor',
          duration,
          interval
        ]);
        
        log('✅ Connection monitoring completed successfully');
        break;
        
      default:
        log(`❌ Unknown command: ${command}`);
        displayHelp();
        break;
    }
  } catch (error) {
    log(`\n❌ Error: ${error.message}`);
    process.exit(1);
  }
}

// Run the main function
if (require.main === module) {
  main().catch(error => {
    log(`❌ Fatal error: ${error.message}`);
    process.exit(1);
  });
}

module.exports = { runCommand, log };