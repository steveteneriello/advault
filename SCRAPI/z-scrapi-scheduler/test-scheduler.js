// test-scheduler.js
const axios = require('axios');
const path = require('path');
require('dotenv').config({ path: path.resolve('/workspaces/advault/.env') });

// Add debug logging to check environment variables
console.log('Debug - Environment variables:');
console.log(`OXYLABS_USERNAME: ${process.env.OXYLABS_USERNAME ? 'Set (value hidden)' : 'Not set'}`);
console.log(`OXYLABS_PASSWORD: ${process.env.OXYLABS_PASSWORD ? 'Set (value hidden)' : 'Not set'}`);

class SimpleScheduler {
  constructor() {
    this.username = process.env.OXYLABS_USERNAME;
    this.password = process.env.OXYLABS_PASSWORD;
    this.baseUrl = 'https://data.oxylabs.io/v1/schedules';
    
    console.log(`Using Oxylabs API with username: ${this.username ? this.username : 'Not set'}`);
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

async function testScheduler() {
  try {
    console.log('Testing SimpleScheduler...');
    const scheduler = new SimpleScheduler();
    
    // Test connection by listing all schedules
    const result = await scheduler.getAllSchedules();
    
    if (result.success) {
      console.log(`✅ Successfully connected to Oxylabs API`);
      console.log(`Found ${result.schedules.length} schedules`);
      return true;
    } else {
      console.error(`❌ Failed to connect: ${result.error}`);
      return false;
    }
  } catch (error) {
    console.error(`❌ Error: ${error.message}`);
    return false;
  }
}

testScheduler();