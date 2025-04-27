#!/usr/bin/env node
// SCRAPI/z-scrapi-scheduler/scheduler-cli.js
// Command line interface for SCRAPI Scheduler
const fs = require('fs');
const path = require('path');
const readline = require('readline');
const dotenv = require('dotenv');

// Load environment variables from the correct location
dotenv.config({ path: path.resolve('/workspaces/advault/.env') });

// Check environment variables before requiring other modules
console.log('Environment variables check:');
console.log(`OXYLABS_USERNAME: ${process.env.OXYLABS_USERNAME ? 'Set (hidden)' : 'Not set'}`);
console.log(`OXYLABS_PASSWORD: ${process.env.OXYLABS_PASSWORD ? 'Set (hidden)' : 'Not set'}`);

// Create a special path resolver for utilities
const utilsPath = path.join('/workspaces/advault', 'utils');

// Patch require for utils files
const originalRequire = module.require;
module.require = function(path) {
  if (path === '../../../utils/connection-helper') {
    return originalRequire(utilsPath + '/connection-helper');
  } else if (path === '../../../utils/validateOxylabsConfig') {
    return originalRequire(utilsPath + '/validateOxylabsConfig');
  }
  return originalRequire(path);
};

// Now require the system
const ScrapiSchedulerSystem = require('./scrapi-scheduler-system');

// Initialize the scheduler system
const scrapiScheduler = new ScrapiSchedulerSystem();

// Create readline interface
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// Helper function to ask a question and get a response
function askQuestion(question) {
  return new Promise(resolve => {
    rl.question(question, answer => {
      resolve(answer);
    });
  });
}

// Helper function to pause until user presses Enter
async function pause() {
  console.log('\nPress Enter to continue...');
  await askQuestion('');
}

// Display main menu
async function displayMainMenu() {
  console.clear();
  console.log('\n==== SCRAPI Scheduler CLI ====');
  console.log('1. Create a new schedule');
  console.log('2. List all schedules');
  console.log('3. View schedule details');
  console.log('4. Activate/deactivate a schedule');
  console.log('5. View and process schedule results');
  console.log('6. Manage saved configurations');
  console.log('7. Sync schedules with Oxylabs');
  console.log('8. Start/stop automatic checking');
  console.log('9. Exit');
  
  const option = await askQuestion('\nSelect an option: ');
  await handleMainMenuSelection(option);
}

// Rest of the file stays the same as in your paste.txt
// ... [include all the other functions from your paste] ...

// Start the CLI
console.log('🚀 Starting SCRAPI Scheduler CLI...');

// Check if we have any command line arguments
if (process.argv.length > 2) {
  const command = process.argv[2];
  
  if (command === 'check') {
    // Run a check and exit
    console.log('\n🔄 Running one-time check of all schedules...');
    
    scrapiScheduler.checker.checkAllSchedules()
      .then(result => {
        if (result.success) {
          console.log('\n✅ Check completed successfully!');
          process.exit(0);
        } else {
          console.log(`\n❌ Check failed: ${result.error}`);
          process.exit(1);
        }
      })
      .catch(error => {
        console.error(`\n❌ Error during check: ${error.message}`);
        process.exit(1);
      });
  } else {
    displayMainMenu();
  }
} else {
  displayMainMenu();
}

rl.on('close', () => {
  console.log('Goodbye!');
  process.exit(0);
});