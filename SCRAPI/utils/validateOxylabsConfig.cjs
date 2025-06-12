// validateOxylabsConfig.js - Utility to validate Oxylabs configuration
const fs = require('fs');
const path = require('path');
require('dotenv').config();

// Directory for logs
const LOGS_DIR = path.join(process.cwd(), 'SCRAPI', 'output-staging', 'logs');
if (!fs.existsSync(LOGS_DIR)) {
  fs.mkdirSync(LOGS_DIR, { recursive: true });
}

// Log file for validation
const VALIDATION_LOG_FILE = path.join(LOGS_DIR, `oxylabs-validation-${new Date().toISOString().replace(/[:.]/g, '-')}.log`);

/**
 * Log message to both console and file
 * @param {string} message - Message to log
 */
function log(message) {
  const timestamp = new Date().toISOString();
  const logMessage = `[${timestamp}] ${message}`;
  
  console.log(logMessage);
  fs.appendFileSync(VALIDATION_LOG_FILE, logMessage + '\n');
}

/**
 * Validate Oxylabs configuration
 * @returns {Object} - Validation result with status and details
 */
function validateOxylabsConfig() {
  log('Validating Oxylabs configuration...');
  
  const result = {
    isValid: true,
    errors: [],
    warnings: [],
    details: {
      username: null,
      password: null
    }
  };
  
  // Check username
  const username = process.env.OXYLABS_USERNAME;
  if (!username) {
    result.isValid = false;
    result.errors.push('OXYLABS_USERNAME is not defined in environment variables');
  } else {
    result.details.username = username;
    log(`Found Oxylabs username: ${username}`);
  }
  
  // Check password
  const password = process.env.OXYLABS_PASSWORD;
  if (!password) {
    result.isValid = false;
    result.errors.push('OXYLABS_PASSWORD is not defined in environment variables');
  } else {
    result.details.password = password;
    log(`Found Oxylabs password: ${password ? '✓ Set' : '✗ Not set'}`);
  }
  
  // Log validation result
  if (result.isValid) {
    log('✅ Oxylabs configuration is valid');
  } else {
    log('❌ Oxylabs configuration is invalid:');
    result.errors.forEach(error => log(`- ${error}`));
  }
  
  if (result.warnings.length > 0) {
    log('⚠️ Warnings:');
    result.warnings.forEach(warning => log(`- ${warning}`));
  }
  
  return result;
}

/**
 * Get Oxylabs configuration
 * @returns {Object} - Oxylabs configuration
 */
function getOxylabsConfig() {
  return {
    username: process.env.OXYLABS_USERNAME,
    password: process.env.OXYLABS_PASSWORD
  };
}

module.exports = {
  validateOxylabsConfig,
  getOxylabsConfig,
  log
};