// SCRAPI/z-scrapi-scheduler/quick-start.js
// Quick start example for SCRAPI Scheduler System
const fs = require('fs');
const path = require('path');
const ScrapiSchedulerSystem = require('./scrapi-scheduler-system');
const OxylabsScheduler = require('./oxylabs-scheduler');
require('dotenv').config();

// Sample queries for demonstration
const SAMPLE_QUERIES = [
  { query: 'plumbers near me', geo_location: 'Boston, Massachusetts, United States' },
  { query: 'emergency plumber', geo_location: 'Boston, Massachusetts, United States' },
  { query: 'pest control', geo_location: 'Denver, Colorado, United States' },
  { query: 'lawn care', geo_location: 'Denver, Colorado, United States' }
];

// Function to create sample master-queries.json
function createSampleMasterQueries() {
  const samplesDir = path.join(process.cwd(), 'SCRAPI', 'z-scrapi-scheduler', 'samples');
  
  if (!fs.existsSync(samplesDir)) {
    fs.mkdirSync(samplesDir, { recursive: true });
    console.log(`📁 Created samples directory: ${samplesDir}`);
  }
  
  const sampleMasterPath = path.join(samplesDir, 'sample-master-queries.json');
  fs.writeFileSync(sampleMasterPath, JSON.stringify(SAMPLE_QUERIES, null, 2));
  
  console.log(`📄 Created sample master queries at ${sampleMasterPath}`);
  return sampleMasterPath;
}

// Function to verify Oxylabs credentials
async function verifyOxylabsCredentials() {
  console.log('🔑 Verifying Oxylabs credentials...');
  
  try {
    const scheduler = new OxylabsScheduler();
    
    // Test connection by getting all schedules
    const result = await scheduler.getAllSchedules();
    
    if (result.success) {
      console.log('✅ Oxylabs credentials are valid!');
      return true;
    } else {
      console.error(`❌ Oxylabs credentials validation failed: ${result.error}`);
      return false;
    }
  } catch (error) {
    console.error(`❌ Error verifying Oxylabs credentials: ${error.message}`);
    return false;
  }
}

// Main quick start function
async function quickStart() {
  console.log('🚀 Starting SCRAPI Scheduler Quick Start Guide\n');
  
  // Step 1: Verify credentials
  console.log('Step 1: Verifying credentials and configuration');
  const credentialsValid = await verifyOxylabsCredentials();
  
  if (!credentialsValid) {
    console.error('\n❌ Please check your Oxylabs credentials in .env file');
    console.log('Required environment variables:');
    console.log('- OXYLABS_USERNAME');
    console.log('- OXYLABS_PASSWORD');
    return;
  }
  
  // Step 2: Create sample master queries
  console.log('\nStep 2: Creating sample master queries');
  const sampleMasterPath = createSampleMasterQueries();
  
  // Initialize the scheduler system
  const scrapiScheduler = new ScrapiSchedulerSystem();
  
  // Step 3: Create and save a sample configuration
  console.log('\nStep 3: Creating a sample configuration');
  
  try {
    // Load and prepare the sample queries
    const prepareResult = scrapiScheduler.jobPreparer.prepareFromMasterQueries(sampleMasterPath);
    
    if (!prepareResult.success) {
      console.error(`❌ Failed to prepare jobs: ${prepareResult.error}`);
      return;
    }
    
    // Create a sample configuration
    const sampleConfig = scrapiScheduler.jobPreparer.createScheduleConfig(
      prepareResult.items,
      '0 12 * * *', // Every day at 12:00
      '2025-12-31 23:59:59' // End at the end of 2025
    );
    
    // Save the configuration
    const saveResult = scrapiScheduler.configManager.saveConfig('sample-daily-schedule', sampleConfig);
    
    if (saveResult.success) {
      console.log('✅ Created and saved sample configuration "sample-daily-schedule"');
    } else {
      console.error(`❌ Failed to save configuration: ${saveResult.error}`);
      return;
    }
    
  } catch (error) {
    console.error(`❌ Error creating sample configuration: ${error.message}`);
    return;
  }
  
  // Step 4: List all saved configurations
  console.log('\nStep 4: Listing saved configurations');
  
  const configs = scrapiScheduler.configManager.listConfigs();
  console.log('Available configurations:');
  configs.forEach(config => console.log(`- ${config}`));
  
  // Step 5: Show how to create a schedule
  console.log('\nStep 5: How to create a schedule');
  console.log('To create a schedule using the CLI:');
  console.log('1. Run: node SCRAPI/z-scrapi-scheduler/scheduler-cli.js');
  console.log('2. Select option 1: "Create a new schedule"');
  console.log('3. Select option 2: "Create from saved configuration"');
  console.log('4. Select "sample-daily-schedule"');
  
  console.log('\nTo create a schedule programmatically:');
  console.log('const scheduler = new ScrapiSchedulerSystem();');
  console.log('await scheduler.createScheduleFromConfig("sample-daily-schedule");');
  
  // Step 6: Explain the next steps
  console.log('\nStep 6: Next steps');
  console.log('- To manage schedules: node SCRAPI/z-scrapi-scheduler/scheduler-cli.js');
  console.log('- To set up regular checks: Use option 8 in the CLI or set up a cron job');
  console.log('- Review the README.md file for more detailed instructions');
  
  console.log('\n✅ Quick start guide completed!');
}

// Run the quick start if this file is executed directly
if (require.main === module) {
  quickStart().catch(error => {
    console.error('❌ Fatal error:', error);
    process.exit(1);
  });
}

module.exports = { quickStart };