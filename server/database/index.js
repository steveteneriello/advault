// Database module
const { createClient } = require('@supabase/supabase-js');
const { createSchema, checkSchema } = require('./schema');
const { runMigrations } = require('./migrations');
const { seedDatabase } = require('./seed');
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
 * Initialize the database
 */
async function initializeDatabase() {
  try {
    console.log('Initializing database...');
    
    // Check if schema exists
    const schemaExists = await checkSchema();
    
    if (!schemaExists) {
      // Create schema
      const schemaCreated = await createSchema();
      
      if (!schemaCreated) {
        console.error('Failed to create database schema');
        return false;
      }
    }
    
    // Run migrations
    const migrationsRun = await runMigrations();
    
    if (!migrationsRun) {
      console.error('Failed to run database migrations');
      return false;
    }
    
    // Seed database
    const databaseSeeded = await seedDatabase();
    
    if (!databaseSeeded) {
      console.error('Failed to seed database');
      return false;
    }
    
    console.log('Database initialized successfully');
    return true;
  } catch (error) {
    console.error('Error initializing database:', error);
    return false;
  }
}

module.exports = {
  supabase,
  initializeDatabase
};