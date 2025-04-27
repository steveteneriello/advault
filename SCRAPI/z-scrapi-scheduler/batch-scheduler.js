// SCRAPI/z-scrapi-scheduler/batch-scheduler.js
const fs = require('fs');
const path = require('path');
const axios = require('axios');
const dotenv = require('dotenv');
const { getCallSites } = require('util');

// Load environment variables from the correct location
dotenv.config({ path: path.resolve('/workspaces/advault/.env') });

// Simple Oxylabs scheduler class
class OxylabsScheduler {
  constructor() {
    this.username = process.env.OXYLABS_USERNAME;
    this.password = process.env.OXYLABS_PASSWORD;
    this.baseUrl = 'https://data.oxylabs.io/v1/schedules';
    
    console.log(`Using Oxylabs API with username: ${this.username}`);
  }

  // Make a request with retries
  async makeRequest(options) {
    const {
      url,
      method = 'GET',
      data = null,
      maxRetries = 3,
      timeout = 30000
    } = options;

    let retries = 0;

    while (retries <= maxRetries) {
      try {
        const response = await axios({
          url,
          method,
          data,
          auth: {
            username: this.username,
            password: this.password
          },
          timeout
        });

        return response;
      } catch (error) {
        const isTimeoutError = error.code === 'ECONNABORTED';
        const isServerError = error.response && error.response.status >= 500;
        
        if ((isTimeoutError || isServerError) && retries < maxRetries) {
          retries++;
          const delay = Math.pow(2, retries) * 1000; // Exponential backoff
          console.log(`Request failed. Retrying (${retries}/${maxRetries}) in ${delay / 1000}s...`);
          await new Promise(resolve => setTimeout(resolve, delay));
        } else {
          throw error;
        }
      }
    }
  }

  // Create a new schedule
  async createSchedule(cronExpression, items, endTime, name) {
    console.log(`🚀 Creating schedule "${name}" with cron: "${cronExpression}"`);
    console.log(`📦 Schedule contains ${items.length} items`);
    console.log(`⏰ End time: ${endTime}`);

    const payload = {
      cron: cronExpression,
      items: items,
      end_time: endTime
    };

    try {
      const response = await this.makeRequest({
        url: this.baseUrl,
        method: 'POST',
        data: payload
      });

      console.log(`✅ Schedule created with ID: ${response.data.schedule_id}`);
      return {
        success: true,
        scheduleId: response.data.schedule_id,
        details: response.data
      };
    } catch (error) {
      console.error('❌ Error creating schedule:', error.message);
      if (error.response) {
        console.error('Response status:', error.response.status);
        console.error('Response data:', error.response.data);
      }
      return {
        success: false,
        error: error.message
      };
    }
  }
}

// Function to split items into batches
function splitIntoBatches(items, batchSize) {
  const batches = [];
  for (let i = 0; i < items.length; i += batchSize) {
    batches.push(items.slice(i, i + batchSize));
  }
  return batches;
}

// Function to generate Oxylabs items from master queries
function prepareOxylabsItems(masterQueries) {
  return masterQueries.map(entry => ({
    source: "google_ads",
    query: entry.query,
    geo_location: entry.geo_location,
    device: "desktop",
    parse: true,
    start_page: 1,
    pages: 1,
    storage_type: "gcs",
    storage_url: "gs://oxyserps",
    render: "png",
    locale: "en-US",
    user_agent_type: "desktop",
    context: [
      {
        key: "ad_extraction",
        value: "true"
      }
    ]
  }));
}

// Function to calculate end date
function calculateEndDate(daysFromNow) {
  const endDate = new Date();
  endDate.setDate(endDate.getDate() + daysFromNow);
  return endDate.toISOString().replace('T', ' ').substring(0, 19);
}

// Main function to schedule a batch
async function scheduleBatch(options) {
  try {
    const {
      masterQueriesPath,
      cronExpression = "0 12 * * *", // Default: daily at noon
      daysToRun = 30,                // Default: run for 30 days
      batchSize = 100,               // Default: 100 items per batch
      batchName                      // Name prefix for the batch
    } = options;

    // 1. Load master queries
    console.log(`📂 Loading master queries from: ${masterQueriesPath}`);
    const masterQueries = JSON.parse(fs.readFileSync(masterQueriesPath, 'utf8'));
    console.log(`✅ Loaded ${masterQueries.length} queries`);

    // 2. Prepare Oxylabs items
    const oxylabsItems = prepareOxylabsItems(masterQueries);

    // 3. Split into batches if needed
    const batches = splitIntoBatches(oxylabsItems, batchSize);
    console.log(`📦 Split into ${batches.length} batches of max ${batchSize} items each`);

    // 4. Calculate end date
    const endDate = calculateEndDate(daysToRun);
    console.log(`📅 Schedules will end on: ${endDate}`);

    // 5. Initialize scheduler
    const scheduler = new OxylabsScheduler();

    // 6. Create schedules for each batch
    const results = [];
    for (let i = 0; i < batches.length; i++) {
      const batchItems = batches[i];
      const batchLabel = batches.length > 1 ? `${batchName}-${i+1}` : batchName;
      
      console.log(`\n🔄 Creating schedule for batch ${i+1} of ${batches.length}: ${batchLabel}`);
      const result = await scheduler.createSchedule(
        cronExpression,
        batchItems,
        endDate,
        batchLabel
      );
      
      results.push({
        batchNumber: i + 1,
        batchSize: batchItems.length,
        success: result.success,
        scheduleId: result.success ? result.scheduleId : null,
        error: result.success ? null : result.error
      });
    }

    // 7. Print summary
    console.log('\n📊 Scheduling Summary:');
    console.log(`Total queries: ${masterQueries.length}`);
    console.log(`Total batches: ${batches.length}`);
    console.log(`Successful schedules: ${results.filter(r => r.success).length}`);
    console.log(`Failed schedules: ${results.filter(r => !r.success).length}`);
    
    // Save summary to file
    const summaryPath = path.join(path.dirname(masterQueriesPath), `${batchName}-schedule-summary.json`);
    fs.writeFileSync(summaryPath, JSON.stringify({
      timestamp: new Date().toISOString(),
      name: batchName,
      totalQueries: masterQueries.length,
      totalBatches: batches.length,
      cronExpression,
      endDate,
      results
    }, null, 2));
    
    console.log(`✅ Summary saved to ${summaryPath}`);
    
    return {
      success: true,
      totalSchedules: batches.length,
      successfulSchedules: results.filter(r => r.success).length,
      results
    };
  } catch (error) {
    console.error('❌ Error scheduling batch:', error.message);
    return {
      success: false,
      error: error.message
    };
  }
}

// Parse command line arguments
function parseArgs() {
  const args = process.argv.slice(2);
  if (args.length < 2) {
    console.error('❌ Usage: node batch-scheduler.js <master-queries-path> <batch-name> [options]');
    console.error('   Options:');
    console.error('     --cron "0 12 * * *"     // Cron expression (default: "0 12 * * *" - daily at noon)');
    console.error('     --days 30               // Days to run (default: 30)');
    console.error('     --batch-size 100        // Items per batch (default: 100)');
    console.error('   Example:');
    console.error('     node batch-scheduler.js ../b-keyword-feeder/master-queries.json PAC-2-DISASTER --cron "0 12 * * *" --days 30 --batch-size 50');
    process.exit(1);
  }
  
  const masterQueriesPath = args[0];
  const batchName = args[1];
  const options = {
    masterQueriesPath,
    batchName,
    cronExpression: "0 12 * * *", // Default: daily at noon
    daysToRun: 30,                // Default: run for 30 days
    batchSize: 100                // Default: 100 items per batch
  };
  
  // Parse optional arguments
  for (let i = 2; i < args.length; i += 2) {
    const option = args[i];
    const value = args[i + 1];
    
    if (option === '--cron') {
      options.cronExpression = value;
    } else if (option === '--days') {
      options.daysToRun = parseInt(value);
    } else if (option === '--batch-size') {
      options.batchSize = parseInt(value);
    }
  }
  
  return options;
}

// Run if called directly
if (require.main === module) {
  const options = parseArgs();
  scheduleBatch(options).then(result => {
    if (result.success) {
      console.log('✅ Batch scheduling complete!');
    } else {
      console.error(`❌ Batch scheduling failed: ${result.error}`);
      process.exit(1);
    }
  });
}

module.exports = { scheduleBatch };