// Server configuration
const path = require('path');
const fs = require('fs');
require('dotenv').config();

/**
 * Load configuration from environment variables
 * @returns {Object} Configuration object
 */
function loadConfig() {
  return {
    server: {
      port: process.env.PORT || 3000,
      environment: process.env.NODE_ENV || 'development',
      cors: {
        origin: process.env.CORS_ORIGIN || '*',
        methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
        allowedHeaders: ['Content-Type', 'Authorization']
      }
    },
    supabase: {
      url: process.env.SUPABASE_URL,
      anonKey: process.env.SUPABASE_ANON_KEY,
      serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY
    },
    oxylabs: {
      username: process.env.OXYLABS_USERNAME,
      password: process.env.OXYLABS_PASSWORD
    },
    scrapi: {
      maxConcurrentJobs: parseInt(process.env.MAX_CONCURRENT_JOBS || '5', 10),
      defaultBatchSize: parseInt(process.env.DEFAULT_BATCH_SIZE || '10', 10),
      defaultDelayBetweenQueries: parseInt(process.env.DEFAULT_DELAY_BETWEEN_QUERIES || '2', 10),
      maxRetries: parseInt(process.env.MAX_RETRIES || '3', 10)
    }
  };
}

/**
 * Validate configuration
 * @param {Object} config - Configuration object
 * @returns {Object} Validation result
 */
function validateConfig(config) {
  const errors = [];
  
  // Validate Supabase configuration
  if (!config.supabase.url) {
    errors.push('SUPABASE_URL is required');
  }
  
  if (!config.supabase.anonKey) {
    errors.push('SUPABASE_ANON_KEY is required');
  }
  
  if (!config.supabase.serviceRoleKey) {
    errors.push('SUPABASE_SERVICE_ROLE_KEY is required');
  }
  
  // Validate Oxylabs configuration
  if (!config.oxylabs.username) {
    errors.push('OXYLABS_USERNAME is required');
  }
  
  if (!config.oxylabs.password) {
    errors.push('OXYLABS_PASSWORD is required');
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
}

module.exports = {
  loadConfig,
  validateConfig
};