// environment.js - Centralized environment configuration
require('dotenv').config();

const { validateSupabaseConfig, getSupabaseConfig } = require('./validation/supabase-validator.cjs');
const { validateOxylabsConfig, getOxylabsConfig } = require('./validation/oxylabs-validator.cjs');

/**
 * Validate all required configurations
 * @returns {Object} - Validation results
 */
function validateAllConfigs() {
  const supabaseValidation = validateSupabaseConfig();
  const oxylabsValidation = validateOxylabsConfig();
  
  const errors = [];
  
  if (!supabaseValidation.isValid) {
    errors.push(...supabaseValidation.errors.map(err => `Supabase: ${err}`));
  }
  
  if (!oxylabsValidation.isValid) {
    errors.push(...oxylabsValidation.errors.map(err => `Oxylabs: ${err}`));
  }
  
  return {
    isValid: errors.length === 0,
    errors,
    supabase: supabaseValidation,
    oxylabs: oxylabsValidation
  };
}

/**
 * Get all configurations
 * @returns {Object} - All configuration objects
 */
function getAllConfigs() {
  return {
    supabase: getSupabaseConfig(),
    oxylabs: getOxylabsConfig()
  };
}

/**
 * Create environment variables object for child processes
 * @returns {Object} - Environment variables
 */
function getEnvironmentVariables() {
  const configs = getAllConfigs();
  
  return {
    ...process.env,
    SUPABASE_URL: configs.supabase.url,
    VITE_SUPABASE_URL: configs.supabase.url,
    SUPABASE_ANON_KEY: configs.supabase.anonKey,
    VITE_SUPABASE_ANON_KEY: configs.supabase.anonKey,
    SUPABASE_SERVICE_ROLE_KEY: configs.supabase.serviceRoleKey,
    OXYLABS_USERNAME: configs.oxylabs.username,
    OXYLABS_PASSWORD: configs.oxylabs.password
  };
}

module.exports = {
  validateAllConfigs,
  getAllConfigs,
  getEnvironmentVariables,
  validateSupabaseConfig,
  validateOxylabsConfig,
  getSupabaseConfig,
  getOxylabsConfig
};
