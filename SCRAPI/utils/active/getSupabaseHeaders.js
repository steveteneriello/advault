// getSupabaseHeaders.js - Utility to get consistent Supabase headers
const { getSupabaseConfig } = require('./validateSupabaseConfig');
require('dotenv').config();

/**
 * Get standard headers for Supabase API requests
 * @param {boolean} useServiceRole - Whether to use service role key instead of anon key
 * @returns {Object} - Headers object with apikey and Authorization
 */
function getSupabaseHeaders(useServiceRole = false) {
  const config = getSupabaseConfig();
  const key = useServiceRole ? config.serviceRoleKey : config.anonKey;
  
  if (!key) {
    throw new Error(`No Supabase ${useServiceRole ? 'service role' : 'anon'} key found in environment variables`);
  }
  
  return {
    'apikey': key,
    'Authorization': `Bearer ${key}`,
    'Content-Type': 'application/json'
  };
}

module.exports = { getSupabaseHeaders };