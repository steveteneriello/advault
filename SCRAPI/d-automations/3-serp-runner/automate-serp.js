// src/SERP-RUNNER/automate-serp.js - Automation script for SERP collection (local-only)
const path = require('path');
const { spawn } = require('child_process');
const fs = require('fs');
require('dotenv').config();

// Directory where Google SERP images are stored
const GOOGLE_SERP_DIR = path.join(process.cwd(), 'SCRAPI', 'output-staging', 'google-serps');

// Create directory if it doesn't exist
if (!fs.existsSync(GOOGLE_SERP_DIR)) {
  fs.mkdirSync(GOOGLE_SERP_DIR, { recursive: true });
  console.log(`📁 Created output directory: ${GOOGLE_SERP_DIR}`);
}

// Function to run a command and return a promise
function runCommand(command, args, options = {}) {
  return new Promise((resolve, reject) => {
    console.log(`\n🚀 Running command: ${command} ${args.join(' ')}`);

    const childProcess = spawn(command, args, {
      stdio: options.silent ? 'ignore' : 'inherit',
      ...options
    });

    childProcess.on('close', (code) => {
      if (code === 0 || options.ignoreErrors) {
        console.log(`✅ Command completed successfully: ${command} ${args.join(' ')}`);
        resolve({ success: true });
      } else {
        console.error(`❌ Command failed with code ${code}: ${command} ${args.join(' ')}`);
        resolve({ success: false, code });
      }
    });

    childProcess.on('error', (err) => {
      console.error(`❌ Error running command: ${err.message}`);
      resolve({ success: false, error: err });
    });
  });
}

// Main function to run the automation
async function runAutomation() {
  console.log('🤖 Starting SERP Automation');

  try {
    const args = process.argv.slice(2);
    let query = 'plumbers near me';
    let location = 'Boston, Massachusetts, United States';

    if (args.length >= 1) query = args[0];
    if (args.length >= 2) location = args.slice(1).join(' ');

    console.log(`Query: "${query}"`);
    console.log(`Location: "${location}"`);

    // Step 1: Run serp-runner-now.js to collect SERP data
    console.log('\n📊 Step 1: Collecting SERP data with serp-runner-now.js');
    const serpResult = await runCommand('node', [
      'SCRAPI/d-automations/3-serp-runner/serp-runner-now.js',
      query,
      ...location.split(' ')
    ]);

    if (!serpResult.success) {
      console.error('❌ SERP collection failed');
    }

    console.log('\n✅ Automation completed successfully');
  } catch (error) {
    console.error('❌ Automation failed:', error);
  }
}

if (require.main === module) {
  runAutomation().catch(error => {
    console.error('❌ Fatal error:', error);
    process.exit(1);
  });
}

module.exports = {
  runAutomation,
  runCommand
};