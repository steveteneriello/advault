// connection-monitor.js - Monitor and diagnose network connection issues
const fs = require('fs');
const path = require('path');
const axios = require('axios');
require('dotenv').config();

// Directory for logs
const LOGS_DIR = path.join(process.cwd(), 'SCRAPI', 'output-staging', 'logs');
if (!fs.existsSync(LOGS_DIR)) {
  fs.mkdirSync(LOGS_DIR, { recursive: true });
}

// Log file for connection monitoring
const MONITOR_LOG_FILE = path.join(LOGS_DIR, `connection-monitor-${new Date().toISOString().replace(/[:.]/g, '-')}.log`);

/**
 * Log message to both console and file
 * @param {string} message - Message to log
 */
function log(message) {
  const timestamp = new Date().toISOString();
  const logMessage = `[${timestamp}] ${message}`;
  
  console.log(logMessage);
  fs.appendFileSync(MONITOR_LOG_FILE, logMessage + '\n');
}

/**
 * Test connection to a specific endpoint
 * @param {string} url - URL to test
 * @param {Object} options - Test options
 * @returns {Promise<Object>} - Test results
 */
async function testConnection(url, options = {}) {
  const {
    timeout = 10000,
    method = 'GET',
    headers = {},
    auth = null
  } = options;
  
  log(`Testing connection to ${url}...`);
  
  const startTime = Date.now();
  
  try {
    const response = await axios({
      method,
      url,
      timeout,
      headers,
      auth
    });
    
    const endTime = Date.now();
    const duration = endTime - startTime;
    
    log(`✅ Connection successful (${duration}ms)`);
    log(`Status: ${response.status} ${response.statusText}`);
    
    return {
      success: true,
      duration,
      status: response.status,
      statusText: response.statusText
    };
  } catch (error) {
    const endTime = Date.now();
    const duration = endTime - startTime;
    
    log(`❌ Connection failed (${duration}ms)`);
    log(`Error: ${error.message}`);
    
    if (error.response) {
      log(`Status: ${error.response.status} ${error.response.statusText}`);
    }
    
    return {
      success: false,
      duration,
      error: error.message,
      status: error.response?.status,
      statusText: error.response?.statusText
    };
  }
}

/**
 * Run a comprehensive connection test to Oxylabs endpoints
 * @returns {Promise<Object>} - Test results
 */
async function runOxylabsConnectionTest() {
  log('🔍 Running comprehensive Oxylabs connection test...');
  
  const results = {
    timestamp: new Date().toISOString(),
    endpoints: {}
  };
  
  // Test Oxylabs endpoints
  const endpoints = [
    'https://data.oxylabs.io/v1/queries',
    'https://realtime.oxylabs.io/v1/queries',
    'https://data.oxylabs.io/v1/notifier/ips'
  ];
  
  for (const endpoint of endpoints) {
    const endpointName = new URL(endpoint).hostname;
    
    // Test with authentication
    results.endpoints[endpointName] = await testConnection(endpoint, {
      auth: {
        username: process.env.OXYLABS_USERNAME,
        password: process.env.OXYLABS_PASSWORD
      }
    });
  }
  
  // Save results to file
  const resultsPath = path.join(LOGS_DIR, `oxylabs-connection-test-${new Date().toISOString().replace(/[:.]/g, '-')}.json`);
  fs.writeFileSync(resultsPath, JSON.stringify(results, null, 2));
  log(`📄 Test results saved to ${resultsPath}`);
  
  // Print summary
  log('\n📊 Connection Test Summary:');
  for (const [endpoint, result] of Object.entries(results.endpoints)) {
    const status = result.success ? '✅ Success' : '❌ Failed';
    const duration = result.duration ? `${result.duration}ms` : 'N/A';
    log(`${endpoint}: ${status} (${duration})`);
  }
  
  return results;
}

/**
 * Monitor connections to Oxylabs endpoints over time
 * @param {number} duration - Duration to monitor in seconds
 * @param {number} interval - Interval between checks in seconds
 */
async function monitorOxylabsConnections(duration = 300, interval = 30) {
  log(`🔍 Monitoring Oxylabs connections for ${duration} seconds (checking every ${interval} seconds)...`);
  
  const endpoint = 'https://data.oxylabs.io/v1/queries';
  const startTime = Date.now();
  const endTime = startTime + (duration * 1000);
  
  const results = [];
  
  while (Date.now() < endTime) {
    const result = await testConnection(endpoint, {
      auth: {
        username: process.env.OXYLABS_USERNAME,
        password: process.env.OXYLABS_PASSWORD
      }
    });
    
    results.push({
      timestamp: new Date().toISOString(),
      ...result
    });
    
    // Wait for the next interval
    if (Date.now() < endTime) {
      log(`Waiting ${interval} seconds before next check...`);
      await new Promise(resolve => setTimeout(resolve, interval * 1000));
    }
  }
  
  // Save results to file
  const resultsPath = path.join(LOGS_DIR, `oxylabs-connection-monitor-${new Date().toISOString().replace(/[:.]/g, '-')}.json`);
  fs.writeFileSync(resultsPath, JSON.stringify(results, null, 2));
  log(`📄 Monitoring results saved to ${resultsPath}`);
  
  // Print summary
  log('\n📊 Connection Monitoring Summary:');
  log(`Total checks: ${results.length}`);
  log(`Successful: ${results.filter(r => r.success).length}`);
  log(`Failed: ${results.filter(r => !r.success).length}`);
  
  const durations = results.filter(r => r.success).map(r => r.duration);
  if (durations.length > 0) {
    const avgDuration = durations.reduce((sum, d) => sum + d, 0) / durations.length;
    const minDuration = Math.min(...durations);
    const maxDuration = Math.max(...durations);
    
    log(`Average response time: ${avgDuration.toFixed(2)}ms`);
    log(`Min response time: ${minDuration}ms`);
    log(`Max response time: ${maxDuration}ms`);
  }
  
  return results;
}

// Main function
async function main() {
  log('🚀 Starting Connection Monitor');
  
  // Get command line arguments
  const command = process.argv[2] || 'test';
  
  if (command === 'test') {
    // Run a single comprehensive test
    await runOxylabsConnectionTest();
  } else if (command === 'monitor') {
    // Monitor connections over time
    const duration = parseInt(process.argv[3] || '300', 10);
    const interval = parseInt(process.argv[4] || '30', 10);
    
    await monitorOxylabsConnections(duration, interval);
  } else {
    log(`❌ Unknown command: ${command}`);
    log('Usage: node SCRAPI/utils/connection-monitor.js [test|monitor] [duration] [interval]');
  }
  
  log('✅ Connection Monitor completed');
}

// Run the main function if this file is executed directly
if (require.main === module) {
  main().catch(error => {
    log(`❌ Fatal error: ${error.message}`);
    process.exit(1);
  });
}

module.exports = {
  testConnection,
  runOxylabsConnectionTest,
  monitorOxylabsConnections
};