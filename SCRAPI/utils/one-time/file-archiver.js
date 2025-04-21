// file-archiver.js - Archive processed files to database and clean up local storage
const fs = require('fs');
const path = require('path');
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
const supabase = supabaseServiceKey ? 
  createClient(supabaseUrl, supabaseServiceKey) : 
  createClient(supabaseUrl, supabaseKey);

// Directories to process
const SCRAPI_DIR = path.join(process.cwd(), 'SCRAPI', 'output-staging');
const DIRS_TO_PROCESS = [
  'scraper-results',
  'google-serps',
  'rendered',
  'reports'
].map(dir => path.join(SCRAPI_DIR, dir));

// Directory for unprocessed files
const UNPROCESSED_DIR = path.join(SCRAPI_DIR, 'unprocessed-files');

// Ensure directories exist
[...DIRS_TO_PROCESS, UNPROCESSED_DIR].forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
    console.log(`Created directory: ${dir}`);
  }
});

// Test Supabase connection thoroughly
async function testConnection() {
  console.log('Testing Supabase connection...');
  
  try {
    // Try to select from file_backups
    const { data, error } = await supabase
      .from('file_backups')
      .select('count', { count: 'exact', head: true });
      
    if (error) {
      if (error.message.includes('does not exist')) {
        console.log('File backups table does not exist yet - will create');
        return true;
      }
      console.error('❌ Supabase connection failed:', error);
      return false;
    }
    
    // Try a write operation
    const { error: writeError } = await supabase
      .from('file_backups')
      .insert({
        file_path: '_test_connection',
        content: 'test'
      });
      
    if (writeError && !writeError.message.includes('duplicate key')) {
      console.error('❌ Write test failed:', writeError);
      return false;
    }
    
    console.log('✅ Supabase connection and permissions verified');
    return true;
  } catch (err) {
    console.error('❌ Connection test failed:', err);
    return false;
  }
}

// Create file_backups table if it doesn't exist
async function ensureTableExists() {
  try {
    const { error } = await supabase.rpc('execute_sql', {
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
        DO $$ 
        BEGIN
          IF NOT EXISTS (
            SELECT 1 FROM pg_policies 
            WHERE tablename = 'file_backups' 
            AND policyname = 'Users can insert file backups'
          ) THEN
            CREATE POLICY "Users can insert file backups"
              ON public.file_backups
              FOR INSERT
              TO authenticated
              WITH CHECK (true);
          END IF;
          
          IF NOT EXISTS (
            SELECT 1 FROM pg_policies 
            WHERE tablename = 'file_backups' 
            AND policyname = 'Users can read all file backups'
          ) THEN
            CREATE POLICY "Users can read all file backups"
              ON public.file_backups
              FOR SELECT
              TO authenticated
              USING (true);
          END IF;
        END $$;
      `
    });

    if (error) {
      console.error('Error creating table:', error);
      return false;
    }

    console.log('✅ File backups table ready');
    return true;
  } catch (err) {
    console.error('Failed to create table:', err);
    return false;
  }
}

async function archiveFile(filePath, content) {
  try {
    console.log(`Archiving file: ${filePath}`);
    
    // Check if already archived
    const { data: existing } = await supabase
      .from('file_backups')
      .select('id')
      .eq('file_path', filePath)
      .maybeSingle();
      
    if (existing) {
      console.log(`File already archived with ID: ${existing.id}`);
      return true;
    }
    
    const { data, error } = await supabase
      .from('file_backups')
      .insert({
        file_path: filePath,
        content: content
      })
      .select()
      .single();

    if (error) {
      console.error(`Error archiving file ${filePath}:`, error);
      return false;
    }

    console.log(`✅ Successfully archived: ${filePath} (ID: ${data.id})`);
    return true;
  } catch (err) {
    console.error(`Failed to archive file ${filePath}:`, err);
    return false;
  }
}

async function processDirectory(directory) {
  console.log(`\nProcessing directory: ${directory}`);
  
  try {
    if (!fs.existsSync(directory)) {
      console.log(`Directory ${directory} does not exist, skipping`);
      return { successCount: 0, errorCount: 0 };
    }
    
    const files = fs.readdirSync(directory);
    console.log(`Found ${files.length} files to process`);
    
    let successCount = 0;
    let errorCount = 0;
    
    for (const file of files) {
      const filePath = path.join(directory, file);
      const stats = fs.statSync(filePath);

      if (stats.isDirectory()) {
        console.log(`Found subdirectory: ${file}`);
        const subResult = await processDirectory(filePath);
        successCount += subResult.successCount;
        errorCount += subResult.errorCount;
      } else {
        console.log(`Processing file: ${file}`);
        
        try {
          const content = fs.readFileSync(filePath, 'utf8');
          const archived = await archiveFile(filePath, content);
          
          if (archived) {
            successCount++;
          } else {
            // Move failed file to unprocessed directory
            const unprocessedPath = path.join(UNPROCESSED_DIR, file);
            fs.renameSync(filePath, unprocessedPath);
            console.log(`Moved to unprocessed: ${unprocessedPath}`);
            errorCount++;
          }
        } catch (err) {
          console.error(`Error processing file ${file}:`, err);
          errorCount++;
          
          // Move failed file to unprocessed directory
          try {
            const unprocessedPath = path.join(UNPROCESSED_DIR, file);
            fs.renameSync(filePath, unprocessedPath);
            console.log(`Moved to unprocessed: ${unprocessedPath}`);
          } catch (moveErr) {
            console.error(`Failed to move file to unprocessed directory:`, moveErr);
          }
        }
      }
    }
    
    console.log(`\nDirectory Summary (${directory}):`);
    console.log(`Successfully archived: ${successCount}`);
    console.log(`Failed/Unprocessed: ${errorCount}`);
    
    return { successCount, errorCount };
  } catch (err) {
    console.error(`Error processing directory ${directory}:`, err);
    return { successCount: 0, errorCount: 1 };
  }
}

// Main execution
async function main() {
  console.log('🚀 Starting file archival process...');
  
  try {
    // Test connection first
    const connectionOk = await testConnection();
    if (!connectionOk) {
      console.error('❌ Supabase connection test failed - aborting');
      return;
    }
    
    // Ensure table exists
    const tableReady = await ensureTableExists();
    if (!tableReady) {
      console.error('❌ Failed to create/verify file_backups table');
      return;
    }
    
    // Process each directory
    let totalSuccess = 0;
    let totalErrors = 0;
    
    for (const dir of DIRS_TO_PROCESS) {
      const result = await processDirectory(dir);
      totalSuccess += result.successCount;
      totalErrors += result.errorCount;
    }
    
    console.log('\n📊 Final Summary:');
    console.log(`Total files archived: ${totalSuccess}`);
    console.log(`Total unprocessed/failed: ${totalErrors}`);
    
    if (totalErrors > 0) {
      console.log(`\nUnprocessed files can be found in: ${UNPROCESSED_DIR}`);
      console.log('You can:');
      console.log('1. Check the logs above for specific errors');
      console.log('2. Run the command again to retry failed files');
      console.log('3. Use npm run view-backups to manage archived files');
    }
  } catch (err) {
    console.error('❌ Fatal error:', err);
  }
}

// Run if executed directly
if (require.main === module) {
  main().catch(err => {
    console.error('❌ Fatal error:', err);
    process.exit(1);
  });
}

module.exports = {
  archiveFile,
  processDirectory,
  DIRS_TO_PROCESS,
  UNPROCESSED_DIR
};