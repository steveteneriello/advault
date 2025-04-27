// Validate Oxylabs configuration
require('dotenv').config();

/**
 * Validates Oxylabs API credentials from environment variables
 * @returns {Object} Validation result
 */
function validateOxylabsConfig() {
  const errors = [];

  if (!process.env.OXYLABS_USERNAME) {
    errors.push('OXYLABS_USERNAME is not set in environment variables');
  }

  if (!process.env.OXYLABS_PASSWORD) {
    errors.push('OXYLABS_PASSWORD is not set in environment variables');
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * Gets Oxylabs configuration from environment variables
 * @returns {Object} Oxylabs configuration
 */
function getOxylabsConfig() {
  return {
    username: process.env.OXYLABS_USERNAME,
    password: process.env.OXYLABS_PASSWORD
  };
}

module.exports = {
  validateOxylabsConfig,
  getOxylabsConfig
};