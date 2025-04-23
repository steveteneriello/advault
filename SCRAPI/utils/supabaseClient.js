// supabaseClient.js - Centralized Supabase client creation
const { createClient } = require('@supabase/supabase-js');
const { validateSupabaseConfig, getSupabaseConfig } = require('./validateSupabaseConfig');
require('dotenv').config();

// Validate Supabase configuration
const validationResult = validateSupabaseConfig();
if (!validationResult.isValid) {
  console.error('❌ Invalid Supabase configuration:');
  validationResult.errors.forEach(error => console.error(`- ${error}`));
  process.exit(1);
}

// Get Supabase configuration
const config = getSupabaseConfig();

// Create Supabase clients
const supabase = createClient(config.url, config.anonKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false
  },
  global: {
    headers: {
      'apikey': config.anonKey,
      'Authorization': `Bearer ${config.anonKey}`
    }
  }
});

// Create admin client with service role key if available
const supabaseAdmin = config.serviceRoleKey ? 
  createClient(config.url, config.serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false
    },
    global: {
      headers: {
        'apikey': config.serviceRoleKey,
        'Authorization': `Bearer ${config.serviceRoleKey}`
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
    console.log('Testing Supabase connection...');
    console.log(`Using Supabase URL: ${config.url}`);
    console.log(`Using Supabase Key: ${config.anonKey ? '✓ Set' : '✗ Not set'}`);
    
    // Try a simple query
    const { data, error } = await supabase
      .from('advertisers')
      .select('count', { count: 'exact', head: true });
    
    if (error) {
      console.error('Supabase connection test failed:', error);
      return false;
    }
    
    console.log('✅ Supabase connection successful!');
    return true;
  } catch (error) {
    console.error('Supabase connection test error:', error);
    return false;
  }
}

module.exports = {
  supabase,
  supabaseAdmin,
  config,
  testSupabaseConnection
};