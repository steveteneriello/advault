// create-file-backup-table.js - Create the file_backups table if it doesn't exist
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

// Initialize Supabase clients
const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Supabase credentials not found in environment variables');
  process.exit(1);
}

// Create admin client with service role key for write operations
const supabaseAdmin = supabaseServiceKey ? 
  createClient(supabaseUrl, supabaseServiceKey) : 
  createClient(supabaseUrl, supabaseKey);

/**
 * Create the file_backups table if it doesn't exist
 * @returns {Promise<Object>} - Creation result
 */
async function createFileBackupsTable() {
  console.log('Creating file_backups table if it doesn\'t exist...');
  
  try {
    // Check if the table already exists
    const { data: tableExists, error: checkError } = await supabaseAdmin
      .rpc('execute_sql', {
        sql_statement: `
          SELECT EXISTS (
            SELECT 1 FROM information_schema.tables 
            WHERE table_schema = 'public' 
            AND table_name = 'file_backups'
          );
        `
      });
      
    if (checkError) {
      console.error('Error checking if table exists:', checkError);
      return {
        success: false,
        error: checkError.message
      };
    }
    
    // If the table already exists, we're done
    if (tableExists && tableExists.length > 0 && tableExists[0].exists) {
      console.log('✅ file_backups table already exists');
      return {
        success: true,
        message: 'Table already exists'
      };
    }
    
    // Create the table
    const { error: createError } = await supabaseAdmin
      .rpc('execute_sql', {
        sql_statement: `
          CREATE TABLE IF NOT EXISTS public.file_backups (
            id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
            file_path text NOT NULL,
            content text NOT NULL,
            created_at timestamptz DEFAULT now()
          );
          
          -- Create indexes
          CREATE INDEX IF NOT EXISTS idx_file_backups_file_path ON public.file_backups USING btree (file_path);
          CREATE INDEX IF NOT EXISTS idx_file_backups_created_at ON public.file_backups USING btree (created_at);
          
          -- Enable Row Level Security (RLS)
          ALTER TABLE public.file_backups ENABLE ROW LEVEL SECURITY;
          
          -- Create policies
          CREATE POLICY "Users can insert file backups"
          ON public.file_backups
          FOR INSERT
          TO authenticated
          WITH CHECK (true);
          
          CREATE POLICY "Users can read all file backups"
          ON public.file_backups
          FOR SELECT
          TO authenticated
          USING (true);
        `
      });
      
    if (createError) {
      console.error('Error creating table:', createError);
      return {
        success: false,
        error: createError.message
      };
    }
    
    console.log('✅ file_backups table created successfully');
    return {
      success: true,
      message: 'Table created successfully'
    };
  } catch (error) {
    console.error('Error creating file_backups table:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Main function
 */
async function main() {
  console.log('🚀 Starting Create File Backup Table');
  
  // Create the table
  const result = await createFileBackupsTable();
  
  if (result.success) {
    console.log('✅ Operation completed successfully');
  } else {
    console.error('❌ Operation failed:', result.error);
  }
}

// Run the main function if this file is executed directly
if (require.main === module) {
  main().catch(error => {
    console.error('❌ Fatal error:', error);
    process.exit(1);
  });
}

// Export functions for use in other modules
module.exports = {
  createFileBackupsTable
};