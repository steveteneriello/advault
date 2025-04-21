// validateSupabaseConfig.js - Utility to validate Supabase configuration
const fs = require('fs');
const path = require('path');
require('dotenv').config();

// Directory for logs
const LOGS_DIR = path.join(process.cwd(), 'SCRAPI', 'output-staging', 'logs');
if (!fs.existsSync(LOGS_DIR)) {
  fs.mkdirSync(LOGS_DIR, { recursive: true });
}

// Log file for validation
const VALIDATION_LOG_FILE = path.join(LOGS_DIR, `supabase-validation-${new Date().toISOString().replace(/[:.]/g, '-')}.log`);

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
 * Validate Supabase configuration
 * @returns {Object} - Validation result with status and details
 */
function validateSupabaseConfig() {
  log('Validating Supabase configuration...');
  
  const result = {
    isValid: true,
    errors: [],
    warnings: [],
    details: {
      url: null,
      anonKey: null,
      serviceRoleKey: null
    }
  };
  
  // Check URL
  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  if (!supabaseUrl) {
    result.isValid = false;
    result.errors.push('SUPABASE_URL or VITE_SUPABASE_URL is not defined in environment variables');
  } else if (!supabaseUrl.startsWith('https://')) {
    result.isValid = false;
    result.errors.push('Supabase URL must start with https://');
  } else {
    result.details.url = supabaseUrl;
    log(`Found Supabase URL: ${supabaseUrl}`);
  }
  
  // Check anon key
  const anonKey = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;
  if (!anonKey) {
    result.isValid = false;
    result.errors.push('SUPABASE_ANON_KEY or VITE_SUPABASE_ANON_KEY is not defined in environment variables');
  } else if (anonKey.length < 30) {
    result.warnings.push('Anon key seems too short, it might be invalid');
  } else {
    result.details.anonKey = anonKey;
    log(`Found Supabase Anon Key: ${anonKey.substring(0, 5)}...${anonKey.substring(anonKey.length - 5)}`);
  }
  
  // Check service role key (optional but recommended)
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceRoleKey) {
    result.warnings.push('SUPABASE_SERVICE_ROLE_KEY is not defined in environment variables. Some operations may fail.');
  } else {
    result.details.serviceRoleKey = serviceRoleKey;
    log(`Found Supabase Service Role Key: ${serviceRoleKey.substring(0, 5)}...${serviceRoleKey.substring(serviceRoleKey.length - 5)}`);
  }
  
  // Log validation result
  if (result.isValid) {
    log('✅ Supabase configuration is valid');
  } else {
    log('❌ Supabase configuration is invalid:');
    result.errors.forEach(error => log(`- ${error}`));
  }
  
  if (result.warnings.length > 0) {
    log('⚠️ Warnings:');
    result.warnings.forEach(warning => log(`- ${warning}`));
  }
  
  return result;
}

/**
 * Get Supabase configuration
 * @returns {Object} - Supabase configuration
 */
function getSupabaseConfig() {
  return {
    url: process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL,
    anonKey: process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY,
    serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY
  };
}

module.exports = {
  validateSupabaseConfig,
  getSupabaseConfig,
  log
};