// getSupabaseHeaders.cjs - Utility for Supabase API headers
const { getSupabaseConfig } = require('../config/validation/supabase-validator.cjs');

/**
 * Generate headers for Supabase API requests
 * @param {boolean} useServiceRole - Whether to use service role key (default: false)
 * @returns {Object} - Headers object for Supabase requests
 */
function getSupabaseHeaders(useServiceRole = false) {
  const config = getSupabaseConfig();
  
  if (!config.isValid) {
    throw new Error('Invalid Supabase configuration: ' + config.errors.join(', '));
  }
  
  const apiKey = useServiceRole ? config.serviceRoleKey : config.anonKey;
  
  return {
    'apikey': apiKey,
    'Authorization': `Bearer ${apiKey}`,
    'Content-Type': 'application/json',
    'Prefer': 'return=minimal'
  };
}

module.exports = { getSupabaseHeaders };
