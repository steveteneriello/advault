// SCRAPI/z-scrapi-scheduler/scheduler-job-preparer.js
// Prepares jobs for the Oxylabs Scheduler
const fs = require('fs');
const path = require('path');

class SchedulerJobPreparer {
  // Convert master-queries.json to scheduler items format
  prepareFromMasterQueries(masterQueriesPath) {
    const masterPath = path.resolve(masterQueriesPath);
    console.log(`📂 Loading master queries from: ${masterPath}`);
    
    if (!fs.existsSync(masterPath)) {
      console.error(`❌ File not found: ${masterPath}`);
      return {
        success: false,
        error: `File not found: ${masterPath}`
      };
    }
    
    try {
      const allQueries = JSON.parse(fs.readFileSync(masterPath, 'utf8'));
      console.log(`📋 Loaded ${allQueries.length} queries from master file`);
      
      // Convert to Oxylabs Scheduler items format
      const items = allQueries.map(entry => ({
        source: "google_ads",
        query: entry.query,
        geo_location: entry.geo_location,
        device: "desktop",
        parse: true,
        start_page: 1,
        pages: 1,
        locale: "en-US",
        user_agent_type: "desktop",
        context: [
          {
            key: "ad_extraction",
            value: "true"
          }
        ]
      }));
      
      console.log(`✅ Prepared ${items.length} scheduler items`);
      
      return {
        success: true,
        items,
        count: items.length
      };
    } catch (error) {
      console.error(`❌ Error parsing master queries: ${error.message}`);
      return {
        success: false,
        error: `Error parsing master queries: ${error.message}`
      };
    }
  }
  
  // Create a schedule configuration from items
  createScheduleConfig(items, cronExpression, endTime) {
    console.log(`⚙️ Creating schedule config with cron: "${cronExpression}"`);
    
    // Format the end time properly if it's a Date object
    let formattedEndTime = endTime;
    if (endTime instanceof Date) {
      formattedEndTime = endTime.toISOString().replace('T', ' ').substring(0, 19);
    }
    
    const config = {
      cron: cronExpression,
      items: items,
      end_time: formattedEndTime
    };
    
    console.log(`✅ Created schedule config with ${items.length} items`);
    console.log(`⏰ End time set to: ${formattedEndTime}`);
    
    return config;
  }
  
  // Generate a batch of items with different parameters
  generateBatchItems(options) {
    const {
      queries = ['plumbers near me'],
      locations = ['Boston, Massachusetts, United States'],
      source = 'google_ads',
      pages = 1,
      parse = true,
      locale = 'en-US',
      device = 'desktop',
      user_agent_type = 'desktop'
    } = options;
    
    const items = [];
    
    // Generate all combinations of queries and locations
    for (const query of queries) {
      for (const location of locations) {
        items.push({
          source,
          query,
          geo_location: location,
          device,
          parse,
          start_page: 1,
          pages,
          locale,
          user_agent_type,
          context: [
            {
              key: "ad_extraction",
              value: "true"
            }
          ]
        });
      }
    }
    
    console.log(`✅ Generated ${items.length} items from ${queries.length} queries and ${locations.length} locations`);
    
    return items;
  }
  
  // Split a large batch of items into smaller chunks for better management
  splitItemsIntoBatches(items, batchSize = 10) {
    const batches = [];
    
    for (let i = 0; i < items.length; i += batchSize) {
      batches.push(items.slice(i, i + batchSize));
    }
    
    console.log(`📦 Split ${items.length} items into ${batches.length} batches of ${batchSize}`);
    
    return batches;
  }
}

module.exports = SchedulerJobPreparer;