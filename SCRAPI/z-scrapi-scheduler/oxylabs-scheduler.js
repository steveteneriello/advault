// SCRAPI/z-scrapi-scheduler/oxylabs-scheduler.js
// Core module for interacting with Oxylabs Scheduler API
const axios = require('axios');
const { makeRequest } = require('../utils/connection-helper');
require('dotenv').config();

class OxylabsScheduler {
  constructor() {
    this.username = process.env.OXYLABS_USERNAME;
    this.password = process.env.OXYLABS_PASSWORD;
    this.baseUrl = 'https://data.oxylabs.io/v1/schedules';
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
      const response = await makeRequest({
        url: this.baseUrl,
        method: 'POST',
        data: payload,
        auth: {
          username: this.username,
          password: this.password
        },
        headers: {
          'Content-Type': 'application/json'
        },
        maxRetries: 3,
        timeout: 30000
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
      const response = await makeRequest({
        url: this.baseUrl,
        method: 'GET',
        auth: {
          username: this.username,
          password: this.password
        },
        maxRetries: 3,
        timeout: 30000
      });

      console.log(`✅ Found ${response.data.schedules.length} schedules`);
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

  // Get schedule information
  async getScheduleInfo(scheduleId) {
    console.log(`🔍 Fetching info for schedule: ${scheduleId}`);
    
    try {
      const response = await makeRequest({
        url: `${this.baseUrl}/${scheduleId}`,
        method: 'GET',
        auth: {
          username: this.username,
          password: this.password
        },
        maxRetries: 3,
        timeout: 30000
      });

      console.log('✅ Schedule info retrieved successfully');
      return {
        success: true,
        details: response.data
      };
    } catch (error) {
      console.error(`❌ Error fetching schedule ${scheduleId}:`, error.message);
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

  // Get runs information
  async getScheduleRuns(scheduleId) {
    console.log(`📊 Fetching runs for schedule: ${scheduleId}`);
    
    try {
      const response = await makeRequest({
        url: `${this.baseUrl}/${scheduleId}/runs`,
        method: 'GET',
        auth: {
          username: this.username,
          password: this.password
        },
        maxRetries: 3,
        timeout: 30000
      });

      const runCount = response.data.runs ? response.data.runs.length : 0;
      console.log(`✅ Retrieved ${runCount} runs`);
      
      return {
        success: true,
        runs: response.data.runs || []
      };
    } catch (error) {
      console.error(`❌ Error fetching runs for schedule ${scheduleId}:`, error.message);
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

  // Get scheduled jobs
  async getScheduledJobs(scheduleId) {
    console.log(`🔍 Fetching jobs for schedule: ${scheduleId}`);
    
    try {
      const response = await makeRequest({
        url: `${this.baseUrl}/${scheduleId}/jobs`,
        method: 'GET',
        auth: {
          username: this.username,
          password: this.password
        },
        maxRetries: 3,
        timeout: 30000
      });

      const jobCount = response.data.jobs ? response.data.jobs.length : 0;
      console.log(`✅ Retrieved ${jobCount} jobs`);
      
      return {
        success: true,
        jobs: response.data.jobs || []
      };
    } catch (error) {
      console.error(`❌ Error fetching jobs for schedule ${scheduleId}:`, error.message);
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

  // Activate or deactivate a schedule
  async setScheduleState(scheduleId, active) {
    console.log(`${active ? '▶️' : '⏹️'} ${active ? 'Activating' : 'Deactivating'} schedule: ${scheduleId}`);
    
    try {
      await makeRequest({
        url: `${this.baseUrl}/${scheduleId}/state`,
        method: 'PUT',
        data: { active },
        auth: {
          username: this.username,
          password: this.password
        },
        headers: {
          'Content-Type': 'application/json'
        },
        maxRetries: 3,
        timeout: 30000
      });

      console.log(`✅ Schedule ${active ? 'activated' : 'deactivated'} successfully`);
      return {
        success: true,
        status: active ? 'activated' : 'deactivated'
      };
    } catch (error) {
      console.error(`❌ Error ${active ? 'activating' : 'deactivating'} schedule ${scheduleId}:`, error.message);
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

module.exports = OxylabsScheduler;