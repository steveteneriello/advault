#!/usr/bin/env node
// Simple SCRAPI Demo - Quick validation and usage examples
// filepath: /workspaces/advault/SCRAPI/quick-demo.cjs

console.log(`
🚀 SCRAPI Quick Demo & Validation
=====================================

Welcome to SCRAPI! Let's validate your system and show you what's possible.
`);

const { exec } = require('child_process');

function runCommand(command, description) {
  return new Promise((resolve, reject) => {
    console.log(`\n📋 ${description}`);
    console.log(`Running: ${command}\n`);
    
    const process = exec(command, { cwd: __dirname });
    
    process.stdout.on('data', (data) => {
      console.log(data.toString());
    });
    
    process.stderr.on('data', (data) => {
      console.log(data.toString());
    });
    
    process.on('close', (code) => {
      if (code === 0) {
        console.log(`✅ ${description} - SUCCESS\n`);
        resolve();
      } else {
        console.log(`❌ ${description} - FAILED (code ${code})\n`);
        resolve(); // Continue with other tests
      }
    });
  });
}

async function main() {
  console.log("🔧 Step 1: Validating Configuration...\n");
  
  await runCommand(
    'node config/validation/supabase-validator.cjs',
    'Supabase Configuration Check'
  );
  
  await runCommand(
    'node config/validation/oxylabs-validator.cjs',
    'Oxylabs Configuration Check'
  );
  
  console.log("🧪 Step 2: Testing Basic Automation...\n");
  
  await runCommand(
    'node test-basic-automation.cjs',
    'Basic System Test'
  );
  
  console.log(`
🎉 Demo Complete! Here's what you can do next:

📖 USAGE GUIDE:
   cat USAGE-INSTRUCTIONS.md | head -50

🔍 SINGLE SEARCH:
   node entry-points/single-query/single-query-handler.cjs "restaurants" "Miami, FL"

📦 BATCH PROCESSING:
   node test-complete-pipeline.cjs

📊 MONITORING:
   node monitoring/job-status-dashboard.cjs

📁 CHECK RESULTS:
   ls -la output-staging/jobs/

🏥 SYSTEM HEALTH:
   node config/environment.cjs

🎛️  INTERACTIVE DEMO:
   node demo.cjs

====================================
Your SCRAPI system is ready to use! 🚀
====================================
`);
}

main().catch(console.error);
