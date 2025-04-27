#!/usr/bin/env node
// SCRAPI/z-scrapi-scheduler/simple-oxylabs-cli.js
const fs = require('fs');
const path = require('path');
const readline = require('readline');
const axios = require('axios');
const dotenv = require('dotenv');

// Load environment variables from the correct location
dotenv.config({ path: path.resolve('/workspaces/advault/.env') });

console.log('Environment variables check:');
console.log(`OXYLABS_USERNAME: ${process.env.OXYLABS_USERNAME ? 'Set' : 'Not set'}`);
console.log(`OXYLABS_PASSWORD: ${process.env.OXYLABS_PASSWORD ? 'Set' : 'Not set'}`);

// Create a simple Oxylabs scheduler class
class SimpleOxylabsScheduler {
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

  // Get schedule information
  async getScheduleInfo(scheduleId) {
    console.log(`🔍 Fetching info for schedule: ${scheduleId}`);
    
    try {
      const response = await this.makeRequest({
        url: `${this.baseUrl}/${scheduleId}`,
        method: 'GET'
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

  // Activate or deactivate a schedule
  async setScheduleState(scheduleId, active) {
    console.log(`${active ? '▶️' : '⏹️'} ${active ? 'Activating' : 'Deactivating'} schedule: ${scheduleId}`);
    
    try {
      await this.makeRequest({
        url: `${this.baseUrl}/${scheduleId}/state`,
        method: 'PUT',
        data: { active }
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

// Initialize the scheduler
const scheduler = new SimpleOxylabsScheduler();

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
  console.log('\n==== Oxylabs Scheduler CLI ====');
  console.log('1. Create a new schedule');
  console.log('2. List all schedules');
  console.log('3. View schedule details');
  console.log('4. Activate/deactivate a schedule');
  console.log('5. Exit');
  
  const option = await askQuestion('\nSelect an option: ');
  await handleMainMenuSelection(option);
}

// Handle main menu selection
async function handleMainMenuSelection(option) {
  switch (option) {
    case '1':
      await createSchedule();
      break;
    case '2':
      await listSchedules();
      break;
    case '3':
      await viewScheduleDetails();
      break;
    case '4':
      await activateDeactivateSchedule();
      break;
    case '5':
      console.log('Exiting...');
      rl.close();
      return;
    default:
      console.log('Invalid option');
      await pause();
      await displayMainMenu();
      return;
  }
}

// Create a new schedule
async function createSchedule() {
  console.clear();
  console.log('\n==== Create a New Schedule ====');
  
  // Get queries
  const queriesInput = await askQuestion('\nEnter comma-separated queries (e.g., "plumbers near me,pest control near me"): ');
  const queries = queriesInput.split(',').map(q => q.trim());
  
  // Get locations
  const locationsInput = await askQuestion('\nEnter comma-separated locations (e.g., "Boston, MA,Denver, CO"): ');
  const locations = locationsInput.split(',').map(l => l.trim());
  
  // Get cron expression
  const cronExpression = await askQuestion('\nEnter cron expression (e.g., "0 0 * * *" for daily at midnight): ');
  
  // Get end time
  const endTimeInput = await askQuestion('\nEnter end time (YYYY-MM-DD HH:MM:SS) or days from now: ');
  
  let endTime;
  if (/^\d+$/.test(endTimeInput)) {
    // If input is just a number, interpret as days from now
    const days = parseInt(endTimeInput);
    const endDate = new Date();
    endDate.setDate(endDate.getDate() + days);
    endTime = endDate.toISOString().replace('T', ' ').substring(0, 19);
  } else {
    endTime = endTimeInput;
  }
  
  // Generate items from queries and locations
  const items = [];
  for (const query of queries) {
    for (const location of locations) {
      items.push({
        source: "google_ads",
        query: query,
        geo_location: location,
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
      });
    }
  }
  
  console.log(`\n📦 Generated ${items.length} items from ${queries.length} queries and ${locations.length} locations`);
  console.log('\n🔄 Creating schedule...');
  
  const result = await scheduler.createSchedule(cronExpression, items, endTime);
  
  if (result.success) {
    console.log('\n✅ Schedule created successfully!');
    console.log(`Schedule ID: ${result.scheduleId}`);
    console.log(`Item count: ${items.length}`);
  } else {
    console.log(`\n❌ Failed to create schedule: ${result.error}`);
  }
  
  await pause();
  await displayMainMenu();
}

// List all schedules
async function listSchedules() {
  console.clear();
  console.log('\n==== All Schedules ====');
  
  console.log('\n🔄 Getting schedules...');
  
  const result = await scheduler.getAllSchedules();
  
  if (result.success) {
    const schedules = result.schedules;
    
    if (schedules.length === 0) {
      console.log('\nNo schedules found');
    } else {
      console.log(`\nFound ${schedules.length} schedules:\n`);
      
      for (const scheduleId of schedules) {
        const infoResult = await scheduler.getScheduleInfo(scheduleId);
        
        if (infoResult.success) {
          const info = infoResult.details;
          console.log(`ID: ${scheduleId}`);
          console.log(`Status: ${info.active ? 'Active' : 'Inactive'}`);
          console.log(`Items: ${info.items_count}`);
          console.log(`Cron: ${info.cron}`);
          console.log(`Next Run: ${info.next_run_at || 'Unknown'}`);
          console.log(`End Time: ${info.end_time}`);
          console.log('----------------------------');
        } else {
          console.log(`ID: ${scheduleId} (Error fetching details: ${infoResult.error})`);
          console.log('----------------------------');
        }
      }
    }
  } else {
    console.log(`\n❌ Failed to get schedules: ${result.error}`);
  }
  
  await pause();
  await displayMainMenu();
}

// View schedule details
async function viewScheduleDetails() {
  console.clear();
  console.log('\n==== View Schedule Details ====');
  
  const scheduleId = await askQuestion('\nEnter Schedule ID: ');
  
  if (!scheduleId) {
    console.log('\nInvalid Schedule ID');
    await pause();
    await displayMainMenu();
    return;
  }
  
  console.log(`\n🔄 Getting details for schedule ${scheduleId}...`);
  
  const infoResult = await scheduler.getScheduleInfo(scheduleId);
  
  if (!infoResult.success) {
    console.log(`\n❌ Failed to get schedule info: ${infoResult.error}`);
    await pause();
    await displayMainMenu();
    return;
  }
  
  const scheduleInfo = infoResult.details;
  
  console.log('\n=== Schedule Info ===');
  console.log(`ID: ${scheduleId}`);
  console.log(`Status: ${scheduleInfo.active ? 'Active' : 'Inactive'}`);
  console.log(`Items Count: ${scheduleInfo.items_count}`);
  console.log(`Cron Expression: ${scheduleInfo.cron}`);
  console.log(`End Time: ${scheduleInfo.end_time}`);
  console.log(`Next Run: ${scheduleInfo.next_run_at || 'Unknown'}`);
  
  await pause();
  await displayMainMenu();
}

// Activate or deactivate a schedule
async function activateDeactivateSchedule() {
  console.clear();
  console.log('\n==== Activate/Deactivate Schedule ====');
  
  const scheduleId = await askQuestion('\nEnter Schedule ID: ');
  
  if (!scheduleId) {
    console.log('\nInvalid Schedule ID');
    await pause();
    await displayMainMenu();
    return;
  }
  
  console.log(`\n🔄 Getting info for schedule ${scheduleId}...`);
  
  const infoResult = await scheduler.getScheduleInfo(scheduleId);
  
  if (!infoResult.success) {
    console.log(`\n❌ Failed to get schedule info: ${infoResult.error}`);
    await pause();
    await displayMainMenu();
    return;
  }
  
  const scheduleInfo = infoResult.details;
  const currentState = scheduleInfo.active;
  
  console.log(`\nSchedule ${scheduleId} is currently ${currentState ? 'ACTIVE' : 'INACTIVE'}`);
  
  const actionPrompt = currentState 
    ? 'Do you want to deactivate this schedule? (y/n): '
    : 'Do you want to activate this schedule? (y/n): ';
  
  const action = await askQuestion(actionPrompt);
  
  if (action.toLowerCase() !== 'y') {
    console.log('\nAction cancelled');
    await pause();
    await displayMainMenu();
    return;
  }
  
  const newState = !currentState;
  console.log(`\n🔄 ${newState ? 'Activating' : 'Deactivating'} schedule ${scheduleId}...`);
  
  const result = await scheduler.setScheduleState(scheduleId, newState);
  
  if (result.success) {
    console.log(`\n✅ Schedule ${newState ? 'activated' : 'deactivated'} successfully!`);
  } else {
    console.log(`\n❌ Failed to ${newState ? 'activate' : 'deactivate'} schedule: ${result.error}`);
  }
  
  await pause();
  await displayMainMenu();
}

// Start the CLI
console.log('🚀 Starting Oxylabs Scheduler CLI...');
displayMainMenu();

rl.on('close', () => {
  console.log('Goodbye!');
  process.exit(0);
});