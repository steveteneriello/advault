// oxylabsClient.js - Centralized Oxylabs client creation
const axios = require('axios');
const { validateOxylabsConfig, getOxylabsConfig } = require('./validateOxylabsConfig');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

// Directory for logs
const LOGS_DIR = path.join(process.cwd(), 'SCRAPI', 'output-staging', 'logs');
if (!fs.existsSync(LOGS_DIR)) {
  fs.mkdirSync(LOGS_DIR, { recursive: true });
}

// Log file for Oxylabs client
const OXYLABS_LOG_FILE = path.join(LOGS_DIR, `oxylabs-client-${new Date().toISOString().replace(/[:.]/g, '-')}.log`);

/**
 * Log message to both console and file
 * @param {string} message - Message to log
 */
function log(message) {
  const timestamp = new Date().toISOString();
  const logMessage = `[${timestamp}] ${message}`;
  
  console.log(logMessage);
  fs.appendFileSync(OXYLABS_LOG_FILE, logMessage + '\n');
}

// Validate Oxylabs configuration
const validationResult = validateOxylabsConfig();
if (!validationResult.isValid) {
  console.error('❌ Invalid Oxylabs configuration:');
  validationResult.errors.forEach(error => console.error(`- ${error}`));
  process.exit(1);
}

// Get Oxylabs configuration
const config = getOxylabsConfig();

/**
 * Create an axios instance for Oxylabs requests
 * @param {Object} options - Additional options
 * @returns {Object} - Axios instance
 */
function createOxylabsAxios(options = {}) {
  // Create axios instance
  const instance = axios.create({
    timeout: options.timeout || 300000,
    maxRedirects: 5,
    auth: {
      username: config.username,
      password: config.password
    },
    headers: {
      'Content-Type': 'application/json',
      ...options.headers
    }
  });

  // Add request interceptor for logging
  instance.interceptors.request.use(
    (config) => {
      log(`Making request to ${config.url}`);
      return config;
    },
    (error) => {
      log(`Request setup error: ${error.message}`);
      return Promise.reject(error);
    }
  );

  // Add response interceptor for error handling
  instance.interceptors.response.use(
    (response) => {
      log(`Response received: ${response.status}`);
      return response;
    },
    (error) => {
      if (error.response) {
        log(`Response error: ${error.response.status} - ${error.message}`);
        log(`Response data: ${JSON.stringify(error.response.data || {})}`);
      } else if (error.request) {
        log(`No response received: ${error.message}`);
      } else {
        log(`Request setup error: ${error.message}`);
      }
      return Promise.reject(error);
    }
  );

  return instance;
}

/**
 * Make a request to Oxylabs API
 * @param {string} url - API endpoint
 * @param {Object} data - Request payload
 * @param {Object} options - Additional options
 * @returns {Promise<Object>} - API response
 */
async function makeOxylabsRequest(url, data, options = {}) {
  const axiosInstance = createOxylabsAxios(options);
  
  try {
    log(`Making Oxylabs request to ${url}`);
    log(`Using username: ${config.username}`);
    log(`Using password: ${config.password ? '✓ Set' : '✗ Not set'}`);
    
    const response = await axiosInstance.post(url, data);
    log(`Request successful: ${response.status}`);
    
    return response.data;
  } catch (error) {
    log(`Request failed: ${error.message}`);
    throw error;
  }
}

/**
 * Test Oxylabs connection
 * @returns {Promise<boolean>} - Whether the connection was successful
 */
async function testOxylabsConnection() {
  try {
    log('Testing Oxylabs connection...');
    
    // Try a simple request
    const response = await makeOxylabsRequest('https://data.oxylabs.io/v1/notifier/ips', {});
    
    if (response) {
      log('✅ Oxylabs connection successful!');
      return true;
    } else {
      log('❌ Oxylabs connection failed: No response data');
      return false;
    }
  } catch (error) {
    log(`❌ Oxylabs connection failed: ${error.message}`);
    return false;
  }
}

module.exports = {
  makeOxylabsRequest,
  createOxylabsAxios,
  testOxylabsConnection,
  config,
  log
};