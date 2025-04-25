// supabase-helper.js - Enhanced Supabase client with connection handling
const { createClient } = require('@supabase/supabase-js');
const axios = require('axios');
const fs = require('fs');
const path = require('path');
const { validateSupabaseConfig, getSupabaseConfig } = require('./validateSupabaseConfig');
require('dotenv').config();

// Directory for logs
const LOGS_DIR = path.join(process.cwd(), 'SCRAPI', 'output-staging', 'logs');
if (!fs.existsSync(LOGS_DIR)) {
  fs.mkdirSync(LOGS_DIR, { recursive: true });
}

// Log file for Supabase connection issues
const SUPABASE_LOG_FILE = path.join(LOGS_DIR, `supabase-connection-${new Date().toISOString().replace(/[:.]/g, '-')}.log`);

/**
 * Log message to both console and file
 * @param {string} message - Message to log
 * @param {Object} [data] - Optional data to log
 */
function log(message, data = null) {
  const timestamp = new Date().toISOString();
  let logMessage = `[${timestamp}] ${message}`;
  
  if (data) {
    logMessage += `\nData: ${JSON.stringify(data, null, 2)}`;
  }
  
  console.log(logMessage);
  fs.appendFileSync(SUPABASE_LOG_FILE, logMessage + '\n');
}

/**
 * Validate Supabase credentials
 * @param {string} url - Supabase URL
 * @param {string} key - Supabase API key
 * @returns {boolean} - Whether credentials are valid
 */
function validateSupabaseCredentials(url, key) {
  if (!url || typeof url !== 'string' || !url.startsWith('https://')) {
    log('❌ Invalid Supabase URL format');
    return false;
  }

  if (!key || typeof key !== 'string' || key.length < 30) {
    log('❌ Invalid Supabase API key format');
    return false;
  }

  return true;
}

/**
 * Create a custom fetch implementation using axios
 * @param {Object} options - Configuration options
 * @returns {Function} - Custom fetch implementation
 */
function createCustomFetch(options = {}) {
  // Create axios instance with enhanced error handling
  const instance = axios.create({
    timeout: options.timeout || 60000,
    maxRedirects: 5,
    validateStatus: (status) => {
      return status >= 200 && status < 500; // Don't reject if status is 4xx
    },
    headers: {
      'Content-Type': 'application/json',
      ...options.headers
    }
  });

  // Add request interceptor for logging
  instance.interceptors.request.use(
    (config) => {
      log(`Making request to ${config.url}`, {
        method: config.method,
        headers: config.headers
      });
      return config;
    },
    (error) => {
      log(`Request setup failed: ${error.message}`);
      return Promise.reject(error);
    }
  );

  // Add response interceptor for error handling
  instance.interceptors.response.use(
    (response) => {
      if (response.status >= 400) {
        log(`Supabase request returned ${response.status}`, {
          data: response.data,
          headers: response.headers
        });
      }
      return response;
    },
    async (error) => {
      log(`Supabase request failed: ${error.message}`, {
        config: error.config,
        response: error.response?.data
      });
      
      // Check if we should retry
      const shouldRetry = error.config?.retry?.retries > 0;
      
      if (shouldRetry) {
        error.config.retry.retries--;
        
        // Calculate delay with exponential backoff
        const delay = Math.min(
          1000 * Math.pow(2, error.config.retry.maxRetries - error.config.retry.retries),
          error.config.retry.maxDelayMs
        );

        log(`Retrying Supabase request in ${delay}ms... (${error.config.retry.retries} attempts remaining)`);
        await new Promise(resolve => setTimeout(resolve, delay));
        
        return instance(error.config);
      }

      return Promise.reject(error);
    }
  );

  // Return custom fetch implementation with enhanced error handling
  return async (url, fetchOptions = {}) => {
    try {
      // Validate request data
      if (fetchOptions.body) {
        try {
          JSON.parse(fetchOptions.body);
        } catch (e) {
          log('Invalid JSON in request body', { body: fetchOptions.body });
          throw new Error('Invalid JSON in request body');
        }
      }

      // Convert fetch options to axios options
      const axiosOptions = {
        url,
        method: fetchOptions.method || 'GET',
        headers: fetchOptions.headers,
        data: fetchOptions.body,
        responseType: 'json',
        retry: {
          retries: 3,
          maxRetries: 3,
          maxDelayMs: 10000
        }
      };

      // Make request
      const response = await instance(axiosOptions);

      // Convert axios response to fetch response
      return {
        ok: response.status >= 200 && response.status < 300,
        status: response.status,
        statusText: response.statusText,
        headers: response.headers,
        json: async () => response.data,
        text: async () => JSON.stringify(response.data)
      };
    } catch (error) {
      log(`Supabase fetch error: ${error.message}`, {
        error: error,
        response: error.response?.data
      });
      
      // Create error response
      const errorResponse = {
        ok: false,
        status: error.response?.status || 0,
        statusText: error.response?.statusText || error.message,
        headers: error.response?.headers || {},
        json: async () => ({ error: error.message }),
        text: async () => error.message
      };

      throw errorResponse;
    }
  };
}

/**
 * Create enhanced Supabase client with retry logic
 * @param {string} url - Supabase URL
 * @param {string} key - Supabase API key
 * @param {Object} options - Additional options
 * @returns {Object} - Supabase client
 */
function createEnhancedSupabaseClient(url, key, options = {}) {
  // Validate credentials
  if (!validateSupabaseCredentials(url, key)) {
    throw new Error('Invalid Supabase credentials');
  }

  // Create custom fetch implementation
  const customFetch = createCustomFetch({
    headers: {
      'apikey': key,
      'Authorization': `Bearer ${key}`
    },
    ...options
  });

  // Create Supabase client with custom fetch
  return createClient(url, key, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      ...options.auth
    },
    global: {
      fetch: customFetch,
      headers: {
        'apikey': key,
        'Authorization': `Bearer ${key}`
      },
      ...options.global
    }
  });
}

// Validate Supabase configuration
const validationResult = validateSupabaseConfig();
if (!validationResult.isValid) {
  console.error('❌ Invalid Supabase configuration:');
  validationResult.errors.forEach(error => console.error(`- ${error}`));
  process.exit(1);
}

// Get Supabase configuration
const config = getSupabaseConfig();

// Initialize Supabase clients with validation
const supabaseUrl = config.url;
const supabaseKey = config.anonKey;
const supabaseServiceKey = config.serviceRoleKey;

if (!validateSupabaseCredentials(supabaseUrl, supabaseKey)) {
  console.error('❌ Invalid Supabase credentials in environment variables');
  process.exit(1);
}

// Create regular client for read operations
const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false
  },
  global: {
    headers: {
      'apikey': supabaseKey,
      'Authorization': `Bearer ${supabaseKey}`
    }
  }
});

// Create admin client with service role key for write operations
const supabaseAdmin = supabaseServiceKey ? 
  createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false
    },
    global: {
      headers: {
        'apikey': supabaseServiceKey,
        'Authorization': `Bearer ${supabaseServiceKey}`
      }
    }
  }) : 
  supabase;

/**
 * Test Supabase connection
 * @returns {Promise<boolean>} - Whether the connection was successful
 */
async function testSupabaseConnection() {
  try {
    log('Testing Supabase connection...');
    log(`Using Supabase URL: ${supabaseUrl}`);
    log(`Using Supabase Key: ${supabaseKey ? '✓ Set' : '✗ Not set'}`);
    
    // Try a simple query first
    const { data, error } = await supabase
      .from('advertisers')
      .select('count', { count: 'exact', head: true });
    
    if (error) {
      log(`Supabase connection test failed: ${error.message}`, { error });
      return false;
    }
    
    log('✅ Supabase connection successful!');
    
    // Test admin connection if service key is available
    if (supabaseServiceKey) {
      log('Testing Supabase admin connection...');
      const { data: adminData, error: adminError } = await supabaseAdmin
        .from('advertisers')
        .select('count', { count: 'exact', head: true });
        
      if (adminError) {
        log(`Supabase admin connection test failed: ${adminError.message}`, { error: adminError });
        log('⚠️ Will proceed with regular client only');
      } else {
        log('✅ Supabase admin connection successful!');
      }
    } else {
      log('⚠️ No service role key provided, some operations may fail');
    }
    
    return true;
  } catch (error) {
    log(`Supabase connection test error: ${error.message}`, { error });
    return false;
  }
}

module.exports = {
  supabase,
  supabaseAdmin,
  createEnhancedSupabaseClient,
  testSupabaseConnection,
  log,
  validateSupabaseCredentials,
  getSupabaseConfig: () => config
};