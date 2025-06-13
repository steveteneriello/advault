// Database migrations
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');
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
 * Run database migrations
 */
async function runMigrations() {
  try {
    console.log('Running database migrations...');
    
    // Get migration files
    const migrationsDir = path.join(__dirname, '..', '..', 'supabase', 'migrations');
    
    if (!fs.existsSync(migrationsDir)) {
      console.error('Migrations directory does not exist:', migrationsDir);
      return false;
    }
    
    const migrationFiles = fs.readdirSync(migrationsDir)
      .filter(file => file.endsWith('.sql'))
      .sort();
    
    console.log(`Found ${migrationFiles.length} migration files`);
    
    // Get applied migrations
    const { data: appliedMigrations, error: migrationsError } = await supabase
      .from('migrations')
      .select('name')
      .order('applied_at', { ascending: true });
      
    if (migrationsError) {
      // If the migrations table doesn't exist, create it
      if (migrationsError.message.includes('does not exist')) {
        console.log('Creating migrations table...');
        
        const { error: createError } = await supabase.rpc('execute_sql', {
          sql_statement: `
            CREATE TABLE IF NOT EXISTS migrations (
              id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
              name TEXT NOT NULL UNIQUE,
              applied_at TIMESTAMPTZ NOT NULL DEFAULT now()
            );
          `
        });
        
        if (createError) {
          console.error('Error creating migrations table:', createError);
          return false;
        }
      } else {
        console.error('Error fetching applied migrations:', migrationsError);
        return false;
      }
    }
    
    const appliedMigrationNames = appliedMigrations ? appliedMigrations.map(m => m.name) : [];
    
    // Run migrations
    for (const file of migrationFiles) {
      if (appliedMigrationNames.includes(file)) {
        console.log(`Migration ${file} already applied, skipping`);
        continue;
      }
      
      console.log(`Applying migration ${file}...`);
      
      const migrationPath = path.join(migrationsDir, file);
      const migrationSql = fs.readFileSync(migrationPath, 'utf8');
      
      const { error: sqlError } = await supabase.rpc('execute_sql', {
        sql_statement: migrationSql
      });
      
      if (sqlError) {
        console.error(`Error applying migration ${file}:`, sqlError);
        return false;
      }
      
      // Record migration
      const { error: recordError } = await supabase
        .from('migrations')
        .insert({ name: file });
        
      if (recordError) {
        console.error(`Error recording migration ${file}:`, recordError);
        return false;
      }
      
      console.log(`Migration ${file} applied successfully`);
    }
    
    console.log('Database migrations completed successfully');
    return true;
  } catch (error) {
    console.error('Error running database migrations:', error);
    return false;
  }
}

module.exports = {
  runMigrations
};