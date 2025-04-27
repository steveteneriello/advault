// schedule-job.js
const axios = require('axios');
const path = require('path');
require('dotenv').config({ path: path.resolve('/workspaces/advault/.env') });

class SimpleScheduler {
  constructor() {
    this.username = process.env.OXYLABS_USERNAME;
    this.password = process.env.OXYLABS_PASSWORD;
    this.baseUrl = 'https://data.oxylabs.io/v1/schedules';
    
    console.log(`Using Oxylabs API with username: ${this.username}`);
  }

  // Make a request to Oxylabs API with retries
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
  async createSchedule(cronExpression, items, endTime) {
    console.log(`🚀 Creating schedule with cron: "${cronExpression}"`);
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

  // Get all schedules
  async getAllSchedules() {
    console.log('📋 Fetching all schedules...');
    
    try {
      const response = await this.makeRequest({
        url: this.baseUrl,
        method: 'GET'
      });

      console.log(`✅ Found ${response.data.schedules?.length || 0} schedules`);
      return {
        success: true,
        schedules: response.data.schedules || []
      };
    } catch (error) {
      console.error('❌ Error fetching schedules:', error.message);
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

async function createSampleSchedule() {
  try {
    console.log('Creating a sample schedule...');
    const scheduler = new SimpleScheduler();
    
    // Define a cron expression (every day at 12:00 PM)
    const cronExpression = "0 12 * * *";
    
    // Define items to scrape
    const items = [
      {
        source: "google_ads",
        query: "plumbers near me",
        geo_location: "Boston, Massachusetts, United States",
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
      },
      {
        source: "google_ads",
        query: "emergency plumber",
        geo_location: "Boston, Massachusetts, United States",
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
      }
    ];
    
    // Define end time (one month from now)
    const endDate = new Date();
    endDate.setMonth(endDate.getMonth() + 1);
    const endTime = endDate.toISOString().replace('T', ' ').slice(0, 19);
    
    // Create the schedule
    const result = await scheduler.createSchedule(cronExpression, items, endTime);
    
    if (result.success) {
      console.log(`✅ Schedule created successfully!`);
      console.log(`Schedule ID: ${result.scheduleId}`);
      console.log(`Details:`, JSON.stringify(result.details, null, 2));
    } else {
      console.error(`❌ Failed to create schedule: ${result.error}`);
    }
    
    // Check all schedules to verify
    const allSchedules = await scheduler.getAllSchedules();
    console.log(`Total schedules after creation: ${allSchedules.success ? allSchedules.schedules.length : 0}`);
    
  } catch (error) {
    console.error(`❌ Error: ${error.message}`);
  }
}

createSampleSchedule();