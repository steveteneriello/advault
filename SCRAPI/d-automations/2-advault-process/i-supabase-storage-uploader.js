// SupabaseStorageUploader.js - Upload files to Supabase Storage
const fs = require('fs');
const path = require('path');
const https = require('https');
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

// Create regular client for read operations
const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false
  },
  // Add timeout configuration to prevent socket hang up
  global: {
    headers: { 'x-client-info': 'supabase-js/2.39.7' }
  },
  realtime: {
    timeout: 60000 // 60 seconds timeout
  }
});

// Create admin client with service role key for write operations
const supabaseAdmin = supabaseServiceKey ? 
  createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false
    },
    // Add timeout configuration to prevent socket hang up
    global: {
      headers: { 'x-client-info': 'supabase-js/2.39.7' }
    },
    realtime: {
      timeout: 60000 // 60 seconds timeout
    }
  }) : 
  supabase;

// Directory where scraper results are stored
const RESULTS_DIR = path.join(process.cwd(), 'scraper-results');

// Test Supabase connection
async function testSupabaseConnection() {
  try {
    console.log('Testing Supabase connection...');
    
    // Try a simple query
    const { data, error } = await supabase
      .from('advertisers')
      .select('count', { count: 'exact', head: true });
    
    if (error) {
      console.error('Supabase connection test failed:', error);
      return false;
    }
    
    console.log('✅ Supabase connection successful!');
    
    // Test admin connection if service key is available
    if (supabaseServiceKey) {
      console.log('Testing Supabase admin connection...');
      const { data: adminData, error: adminError } = await supabaseAdmin
        .from('advertisers')
        .select('count', { count: 'exact', head: true });
        
      if (adminError) {
        console.error('Supabase admin connection test failed:', adminError);
        console.log('⚠️ Will proceed with regular client only');
      } else {
        console.log('✅ Supabase admin connection successful!');
      }
    } else {
      console.log('⚠️ No service role key provided, some operations may fail');
    }
    
    return true;
  } catch (error) {
    console.error('Supabase connection test error:', error);
    return false;
  }
}

// Check if a bucket exists
async function checkBucketExists(bucketName) {
  console.log(`Checking if bucket ${bucketName} exists...`);
  
  try {
    // List buckets
    const { data: buckets, error: bucketsError } = await supabaseAdmin
      .storage
      .listBuckets();
      
    if (bucketsError) {
      console.error('Error listing buckets:', bucketsError);
      return false;
    }
    
    const bucketExists = buckets.some(bucket => bucket.name === bucketName);
    
    if (bucketExists) {
      console.log(`✅ Bucket ${bucketName} exists`);
      return true;
    } else {
      console.log(`❌ Bucket ${bucketName} does not exist`);
      return false;
    }
  } catch (error) {
    console.error('Error checking if bucket exists:', error);
    return false;
  }
}

// Create a bucket if it doesn't exist
async function createBucket(bucketName) {
  console.log(`Creating bucket ${bucketName}...`);
  
  try {
    // Check if the bucket already exists
    const bucketExists = await checkBucketExists(bucketName);
    
    if (bucketExists) {
      console.log(`Bucket ${bucketName} already exists`);
      return true;
    }
    
    // Create the bucket
    const { error } = await supabaseAdmin
      .storage
      .createBucket(bucketName, {
        public: true
      });
      
    if (error) {
      console.error(`Error creating bucket ${bucketName}:`, error);
      return false;
    }
    
    console.log(`✅ Bucket ${bucketName} created successfully`);
    return true;
  } catch (error) {
    console.error(`Error creating bucket ${bucketName}:`, error);
    return false;
  }
}

// List files in a bucket
async function listFilesInBucket(bucketName) {
  console.log(`Listing files in bucket ${bucketName}...`);
  
  try {
    // Check if the bucket exists
    const bucketExists = await checkBucketExists(bucketName);
    
    if (!bucketExists) {
      console.log(`Bucket ${bucketName} does not exist`);
      return [];
    }
    
    // List files in the bucket
    const { data: files, error } = await supabaseAdmin
      .storage
      .from(bucketName)
      .list();
      
    if (error) {
      console.error(`Error listing files in bucket ${bucketName}:`, error);
      return [];
    }
    
    if (!files || files.length === 0) {
      console.log(`No files found in bucket ${bucketName}`);
      return [];
    }
    
    console.log(`Found ${files.length} files in bucket ${bucketName}:`);
    
    // Print details of each file
    files.forEach((file, index) => {
      console.log(`[${index + 1}] ${file.name}`);
      console.log(`   Size: ${file.metadata.size} bytes`);
      console.log(`   Created: ${new Date(file.created_at).toLocaleString()}`);
      
      // Get public URL
      const { data: publicUrlData } = supabaseAdmin
        .storage
        .from(bucketName)
        .getPublicUrl(file.name);
        
      console.log(`   Public URL: ${publicUrlData.publicUrl}`);
    });
    
    return files;
  } catch (error) {
    console.error(`Error listing files in bucket ${bucketName}:`, error);
    return [];
  }
}

// Get all PNG files in the scraper-results directory
function getPngFiles() {
  console.log('Getting PNG files from scraper-results directory...');
  
  try {
    // Check if the directory exists
    if (!fs.existsSync(RESULTS_DIR)) {
      console.error(`❌ Directory ${RESULTS_DIR} does not exist`);
      return [];
    }
    
    // Get all PNG files
    const files = fs.readdirSync(RESULTS_DIR)
      .filter(file => file.endsWith('.png'))
      .map(file => ({
        name: file,
        path: path.join(RESULTS_DIR, file)
      }));
      
    console.log(`Found ${files.length} PNG files`);
    
    return files;
  } catch (error) {
    console.error('Error getting PNG files:', error);
    return [];
  }
}

// Upload a file to a bucket
async function uploadFileToBucket(filePath, bucketName) {
  console.log(`Uploading file ${filePath} to bucket ${bucketName}...`);
  
  try {
    // Check if the file exists
    if (!fs.existsSync(filePath)) {
      console.error(`❌ File ${filePath} does not exist`);
      return {
        success: false,
        error: 'File does not exist'
      };
    }
    
    // Check if the bucket exists
    const bucketExists = await checkBucketExists(bucketName);
    
    if (!bucketExists) {
      console.log(`Bucket ${bucketName} does not exist, creating it...`);
      const bucketCreated = await createBucket(bucketName);
      
      if (!bucketCreated) {
        console.error(`❌ Failed to create bucket ${bucketName}`);
        return {
          success: false,
          error: 'Failed to create bucket'
        };
      }
    }
    
    // Read the file
    const fileContent = fs.readFileSync(filePath);
    const fileName = path.basename(filePath);
    
    // Upload the file
    const { data, error } = await supabaseAdmin
      .storage
      .from(bucketName)
      .upload(fileName, fileContent, {
        contentType: 'image/png',
        upsert: true
      });
      
    if (error) {
      console.error(`Error uploading file ${filePath} to bucket ${bucketName}:`, error);
      return {
        success: false,
        error: error.message
      };
    }
    
    // Get public URL
    const { data: publicUrlData } = supabaseAdmin
      .storage
      .from(bucketName)
      .getPublicUrl(fileName);
      
    const publicUrl = publicUrlData.publicUrl;
    
    console.log(`✅ File ${filePath} uploaded successfully`);
    console.log(`   Public URL: ${publicUrl}`);
    
    return {
      success: true,
      path: data.path,
      publicUrl
    };
  } catch (error) {
    console.error(`Error uploading file ${filePath} to bucket ${bucketName}:`, error);
    return {
      success: false,
      error: error.message
    };
  }
}

// Upload all PNG files to a bucket
async function uploadAllPngFiles(bucketName = 'ad-renderings') {
  console.log(`\n🔍 Uploading all PNG files to bucket ${bucketName}...`);
  
  try {
    // Get all PNG files
    const pngFiles = getPngFiles();
    
    if (pngFiles.length === 0) {
      console.log('No PNG files to upload');
      return {
        success: true,
        message: 'No PNG files to upload'
      };
    }
    
    // Create the bucket if it doesn't exist
    const bucketExists = await checkBucketExists(bucketName);
    
    if (!bucketExists) {
      console.log(`Bucket ${bucketName} does not exist, creating it...`);
      const bucketCreated = await createBucket(bucketName);
      
      if (!bucketCreated) {
        console.error(`❌ Failed to create bucket ${bucketName}`);
        return {
          success: false,
          error: 'Failed to create bucket'
        };
      }
    }
    
    // Upload each file
    const results = [];
    
    for (const file of pngFiles) {
      console.log(`Uploading file ${file.path}...`);
      const result = await uploadFileToBucket(file.path, bucketName);
      
      results.push({
        file: file.name,
        success: result.success,
        publicUrl: result.publicUrl,
        error: result.error
      });
    }
    
    // Print summary
    console.log('\n📊 Upload Summary:');
    console.log(`   Total files: ${results.length}`);
    console.log(`   Successfully uploaded: ${results.filter(r => r.success).length}`);
    console.log(`   Failed: ${results.filter(r => !r.success).length}`);
    
    return {
      success: true,
      results
    };
  } catch (error) {
    console.error('Error uploading PNG files:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

// Check if the ad_renderings table exists
async function checkAdRenderingsTable() {
  console.log('Checking if ad_renderings table exists...');
  
  try {
    // Use a direct SQL query to check if the table exists
    const { data, error } = await supabaseAdmin
      .rpc('execute_sql', {
        sql_statement: `
          SELECT EXISTS (
            SELECT 1 FROM information_schema.tables 
            WHERE table_schema = 'public' 
            AND table_name = 'ad_renderings'
          );
        `
      });
      
    if (error) {
      console.error('Error checking if table exists:', error);
      return false;
    }
    
    // Check if the query returned a result and if the table exists
    const tableExists = data && data.length > 0 && data[0].exists;
    
    if (tableExists) {
      console.log('✅ ad_renderings table exists');
      return true;
    } else {
      console.log('❌ ad_renderings table does not exist');
      return false;
    }
  } catch (error) {
    console.error('Error checking if table exists:', error);
    return false;
  }
}

// Create ad_renderings table if it doesn't exist
async function createAdRenderingsTable() {
  console.log('Creating ad_renderings table...');
  
  try {
    const { error } = await supabaseAdmin
      .rpc('execute_sql', {
        sql_statement: `
          CREATE TABLE IF NOT EXISTS public.ad_renderings (
            id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
            ad_id text NOT NULL,
            serp_id uuid NOT NULL,
            rendering_type text NOT NULL CHECK (rendering_type = ANY (ARRAY['html'::text, 'png'::text])),
            content_path text,
            content_html text,
            content_size integer,
            created_at timestamp with time zone DEFAULT now(),
            processed_at timestamp with time zone,
            status text DEFAULT 'pending'::text CHECK ((status = ANY (ARRAY['pending'::text, 'processed'::text, 'error'::text, 'skipped'::text]))),
            error_message text,
            storage_url text NULL,
            binary_content text NULL,
            CONSTRAINT ad_renderings_ad_id_fkey FOREIGN KEY (ad_id) REFERENCES ads(id),
            CONSTRAINT ad_renderings_serp_id_fkey FOREIGN KEY (serp_id) REFERENCES serps(id)
          );
          
          -- Create indexes
          CREATE INDEX IF NOT EXISTS idx_ad_renderings_ad_id ON public.ad_renderings USING btree (ad_id);
          CREATE INDEX IF NOT EXISTS idx_ad_renderings_serp_id ON public.ad_renderings USING btree (serp_id);
          CREATE INDEX IF NOT EXISTS idx_ad_renderings_type ON public.ad_renderings USING btree (rendering_type);
          CREATE INDEX IF NOT EXISTS idx_ad_renderings_status ON public.ad_renderings USING btree (status);
          CREATE INDEX IF NOT EXISTS idx_ad_renderings_storage_url ON public.ad_renderings USING btree (storage_url);
          CREATE INDEX IF NOT EXISTS idx_ad_renderings_has_binary ON public.ad_renderings USING btree (((binary_content IS NOT NULL)));
          
          -- Enable Row Level Security (RLS)
          ALTER TABLE public.ad_renderings ENABLE ROW LEVEL SECURITY;
          
          -- Create policies
          DROP POLICY IF EXISTS "Allow authenticated users to read ad_renderings" ON public.ad_renderings;
          CREATE POLICY "Allow authenticated users to read ad_renderings" 
          ON public.ad_renderings 
          FOR SELECT TO authenticated 
          USING (true);
          
          DROP POLICY IF EXISTS "Allow service role full access to ad_renderings" ON public.ad_renderings;
          CREATE POLICY "Allow service role full access to ad_renderings" 
          ON public.ad_renderings 
          FOR ALL TO service_role 
          USING (true) 
          WITH CHECK (true);
        `
      });
      
    if (error) {
      console.error('Error creating table:', error);
      return false;
    }
    
    console.log('✅ ad_renderings table created successfully');
    return true;
  } catch (error) {
    console.error('Error creating table:', error);
    return false;
  }
}

// Update ad_renderings with storage URLs
async function updateAdRenderingsWithStorageUrls(bucketName = 'ad-renderings') {
  console.log('Updating ad_renderings with storage URLs...');
  
  try {
    // Check if the ad_renderings table exists
    const tableExists = await checkAdRenderingsTable();
    
    if (!tableExists) {
      console.log('Creating ad_renderings table...');
      const tableCreated = await createAdRenderingsTable();
      
      if (!tableCreated) {
        console.error('❌ Failed to create ad_renderings table');
        return {
          success: false,
          error: 'Failed to create ad_renderings table'
        };
      }
    }
    
    // Get all renderings without storage URLs
    const { data: renderings, error: renderingsError } = await supabaseAdmin
      .from('ad_renderings')
      .select(`
        id,
        content_path
      `)
      .eq('rendering_type', 'png')
      .is('storage_url', null)
      .not('content_path', 'is', null);
      
    if (renderingsError) {
      console.error('Error fetching renderings without storage URLs:', renderingsError);
      return {
        success: false,
        error: renderingsError.message
      };
    }
    
    if (!renderings || renderings.length === 0) {
      console.log('No renderings found without storage URLs');
      return {
        success: true,
        message: 'No renderings found without storage URLs'
      };
    }
    
    console.log(`Found ${renderings.length} renderings without storage URLs`);
    
    // Get all files in the bucket
    const { data: files, error: filesError } = await supabaseAdmin
      .storage
      .from(bucketName)
      .list();
      
    if (filesError) {
      console.error(`Error listing files in bucket ${bucketName}:`, filesError);
      return {
        success: false,
        error: filesError.message
      };
    }
    
    // Create a map of file names to public URLs
    const fileMap = {};
    
    if (files && files.length > 0) {
      files.forEach(file => {
        const { data: publicUrlData } = supabaseAdmin
          .storage
          .from(bucketName)
          .getPublicUrl(file.name);
          
        fileMap[file.name] = publicUrlData.publicUrl;
      });
    }
    
    // Update each rendering with retry logic
    const results = [];
    
    for (const rendering of renderings) {
      // Get the file name from the content path
      const fileName = path.basename(rendering.content_path);
      
      // Check if the file exists in the bucket
      if (fileMap[fileName]) {
        console.log(`Updating rendering ${rendering.id} with storage URL: ${fileMap[fileName]}`);
        
        // Update the rendering with retry logic
        let updateAttempts = 0;
        const maxUpdateAttempts = 3;
        let updateSuccess = false;
        
        while (!updateSuccess && updateAttempts < maxUpdateAttempts) {
          updateAttempts++;
          try {
            // Create a new https agent for each request
            const agent = new https.Agent({ keepAlive: false });
            
            const { error: updateError } = await supabaseAdmin
              .from('ad_renderings')
              .update({
                storage_url: fileMap[fileName]
              })
              .eq('id', rendering.id);
              
            if (updateError) {
              console.error(`Error updating rendering ${rendering.id} (attempt ${updateAttempts}):`, updateError);
              
              if (updateAttempts < maxUpdateAttempts) {
                console.log(`Retrying update in 2 seconds...`);
                await new Promise(resolve => setTimeout(resolve, 2000));
              } else {
                results.push({
                  id: rendering.id,
                  success: false,
                  error: updateError.message
                });
              }
            } else {
              console.log(`✅ Rendering ${rendering.id} updated successfully`);
              results.push({
                id: rendering.id,
                success: true,
                storageUrl: fileMap[fileName]
              });
              updateSuccess = true;
              break;
            }
          } catch (error) {
            console.error(`Unexpected error updating rendering ${rendering.id} (attempt ${updateAttempts}):`, error);
            
            if (updateAttempts < maxUpdateAttempts) {
              console.log(`Retrying update in 2 seconds...`);
              await new Promise(resolve => setTimeout(resolve, 2000));
            } else {
              results.push({
                id: rendering.id,
                success: false,
                error: error.message
              });
            }
          }
        }
      } else {
        console.log(`File ${fileName} not found in bucket, skipping`);
        results.push({
          id: rendering.id,
          success: false,
          error: 'File not found in bucket'
        });
      }
    }
    
    // Print summary
    console.log('\n📊 Update Summary:');
    console.log(`   Total renderings: ${results.length}`);
    console.log(`   Successfully updated: ${results.filter(r => r.success).length}`);
    console.log(`   Failed: ${results.filter(r => !r.success).length}`);
    
    return {
      success: true,
      results
    };
  } catch (error) {
    console.error('Error updating ad_renderings with storage URLs:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

// Main function
async function main() {
  console.log('🚀 Starting Supabase Storage Uploader');
  
  // Test Supabase connection
  const connectionOk = await testSupabaseConnection();
  if (!connectionOk) {
    console.error('❌ Supabase connection failed, aborting');
    return;
  }
  
  // Upload all PNG files
  console.log('Uploading all PNG files to ad-renderings bucket...');
  const uploadResult = await uploadAllPngFiles('ad-renderings');
  
  if (!uploadResult.success) {
    console.error('❌ Upload failed:', uploadResult.error);
    return;
  }
  
  // Update ad_renderings with storage URLs
  console.log('Updating ad_renderings with storage URLs...');
  const updateResult = await updateAdRenderingsWithStorageUrls('ad-renderings');
  
  if (!updateResult.success) {
    console.error('❌ Update failed:', updateResult.error);
    return;
  }
  
  console.log('✅ All operations completed successfully');
}

// If this file is run directly
if (require.main === module) {
  main().catch(error => {
    console.error('❌ Unhandled error in main process:', error);
    process.exit(1);
  });
}

// Export functions for use in other modules
module.exports = {
  testSupabaseConnection,
  checkBucketExists,
  createBucket,
  listFilesInBucket,
  getPngFiles,
  uploadFileToBucket,
  uploadAllPngFiles,
  checkAdRenderingsTable,
  createAdRenderingsTable,
  updateAdRenderingsWithStorageUrls,
  supabase,
  supabaseAdmin,
  supabaseServiceKey
};