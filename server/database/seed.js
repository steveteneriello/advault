// Database seed data
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

// Initialize Supabase client
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase credentials. Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

/**
 * Seed the database with initial data
 */
async function seedDatabase() {
  try {
    console.log('Seeding database...');
    
    // Seed system configuration
    const { error: configError } = await supabase
      .from('scrapi_system_config')
      .upsert([
        {
          key: 'max_concurrent_jobs',
          value: 5,
          description: 'Maximum number of concurrent jobs'
        },
        {
          key: 'default_batch_size',
          value: 10,
          description: 'Default batch size for batch processing'
        },
        {
          key: 'default_delay_between_queries',
          value: 2,
          description: 'Default delay between queries in seconds'
        },
        {
          key: 'max_retries',
          value: 3,
          description: 'Maximum number of retries for failed queries'
        }
      ]);
      
    if (configError) {
      console.error('Error seeding system configuration:', configError);
      return false;
    }
    
    // Seed API keys
    const { error: apiKeyError } = await supabase
      .from('scrapi_api_keys')
      .upsert([
        {
          name: 'Default API Key',
          key: `sk_${Math.random().toString(36).substring(2, 15)}${Math.random().toString(36).substring(2, 15)}`,
          permissions: ['read', 'write'],
          created_by: 'system'
        }
      ]);
      
    if (apiKeyError) {
      console.error('Error seeding API keys:', apiKeyError);
      return false;
    }
    
    console.log('Database seeded successfully');
    return true;
  } catch (error) {
    console.error('Error seeding database:', error);
    return false;
  }
}

module.exports = {
  seedDatabase
};