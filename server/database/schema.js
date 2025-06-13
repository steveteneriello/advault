// Database schema utilities
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
 * Create database schema
 */
async function createSchema() {
  try {
    console.log('Creating database schema...');
    
    // Create batch jobs table
    const { error: batchJobsError } = await supabase.rpc('execute_sql', {
      sql_statement: `
        CREATE TABLE IF NOT EXISTS scrapi_batch_jobs (
          id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
          name TEXT NOT NULL,
          description TEXT,
          status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
          created_by TEXT,
          created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
          started_at TIMESTAMPTZ,
          completed_at TIMESTAMPTZ,
          total_queries INTEGER NOT NULL DEFAULT 0,
          completed_queries INTEGER NOT NULL DEFAULT 0,
          failed_queries INTEGER NOT NULL DEFAULT 0,
          config JSONB DEFAULT '{}'::jsonb,
          error_message TEXT
        );
      `
    });
    
    if (batchJobsError) {
      console.error('Error creating batch jobs table:', batchJobsError);
      return false;
    }
    
    // Create search queries table
    const { error: searchQueriesError } = await supabase.rpc('execute_sql', {
      sql_statement: `
        CREATE TABLE IF NOT EXISTS scrapi_search_queries (
          id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
          batch_id UUID NOT NULL REFERENCES scrapi_batch_jobs(id) ON DELETE CASCADE,
          query TEXT NOT NULL,
          location TEXT NOT NULL,
          status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
          created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
          started_at TIMESTAMPTZ,
          completed_at TIMESTAMPTZ,
          oxylabs_job_id TEXT,
          error_message TEXT,
          priority INTEGER DEFAULT 0,
          retry_count INTEGER DEFAULT 0,
          max_retries INTEGER DEFAULT 3
        );
      `
    });
    
    if (searchQueriesError) {
      console.error('Error creating search queries table:', searchQueriesError);
      return false;
    }
    
    // Create SERP results table
    const { error: serpResultsError } = await supabase.rpc('execute_sql', {
      sql_statement: `
        CREATE TABLE IF NOT EXISTS scrapi_serp_results (
          id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
          query_id UUID NOT NULL REFERENCES scrapi_search_queries(id) ON DELETE CASCADE,
          oxylabs_job_id TEXT,
          query TEXT NOT NULL,
          location TEXT NOT NULL,
          timestamp TIMESTAMPTZ NOT NULL DEFAULT now(),
          total_results INTEGER,
          ads_count INTEGER DEFAULT 0,
          organic_count INTEGER DEFAULT 0,
          local_count INTEGER DEFAULT 0,
          content JSONB,
          raw_html TEXT,
          created_at TIMESTAMPTZ NOT NULL DEFAULT now()
        );
      `
    });
    
    if (serpResultsError) {
      console.error('Error creating SERP results table:', serpResultsError);
      return false;
    }
    
    console.log('Database schema created successfully');
    return true;
  } catch (error) {
    console.error('Error creating database schema:', error);
    return false;
  }
}

/**
 * Check if database schema exists
 */
async function checkSchema() {
  try {
    console.log('Checking database schema...');
    
    // Check if batch jobs table exists
    const { data: batchJobsData, error: batchJobsError } = await supabase.rpc('execute_sql', {
      sql_statement: `
        SELECT EXISTS (
          SELECT 1 FROM information_schema.tables 
          WHERE table_schema = 'public' 
          AND table_name = 'scrapi_batch_jobs'
        );
      `
    });
    
    if (batchJobsError) {
      console.error('Error checking batch jobs table:', batchJobsError);
      return false;
    }
    
    const batchJobsExists = batchJobsData && batchJobsData.length > 0 && batchJobsData[0].exists;
    
    // Check if search queries table exists
    const { data: searchQueriesData, error: searchQueriesError } = await supabase.rpc('execute_sql', {
      sql_statement: `
        SELECT EXISTS (
          SELECT 1 FROM information_schema.tables 
          WHERE table_schema = 'public' 
          AND table_name = 'scrapi_search_queries'
        );
      `
    });
    
    if (searchQueriesError) {
      console.error('Error checking search queries table:', searchQueriesError);
      return false;
    }
    
    const searchQueriesExists = searchQueriesData && searchQueriesData.length > 0 && searchQueriesData[0].exists;
    
    // Check if SERP results table exists
    const { data: serpResultsData, error: serpResultsError } = await supabase.rpc('execute_sql', {
      sql_statement: `
        SELECT EXISTS (
          SELECT 1 FROM information_schema.tables 
          WHERE table_schema = 'public' 
          AND table_name = 'scrapi_serp_results'
        );
      `
    });
    
    if (serpResultsError) {
      console.error('Error checking SERP results table:', serpResultsError);
      return false;
    }
    
    const serpResultsExists = serpResultsData && serpResultsData.length > 0 && serpResultsData[0].exists;
    
    const schemaExists = batchJobsExists && searchQueriesExists && serpResultsExists;
    
    console.log('Database schema check:', schemaExists ? 'exists' : 'does not exist');
    return schemaExists;
  } catch (error) {
    console.error('Error checking database schema:', error);
    return false;
  }
}

module.exports = {
  createSchema,
  checkSchema
};