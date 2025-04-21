// supabase-storage-uploader.js - Upload files to Supabase Storage
const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

// Initialize Supabase client
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
  }
});

// Create admin client with service role key for write operations
const supabaseAdmin = supabaseServiceKey ? 
  createClient(supabaseUrl, supabaseServiceKey) : 
  supabase;

// Directory where scraper results are stored
const RESULTS_DIR = path.join(process.cwd(), 'scraper-results');

/**
 * Test Supabase connection
 * @returns {Promise<boolean>} - Whether the connection was successful
 */
async function testSupabaseConnection() {
  try {
    console.log('Testing Supabase connection...');
    
    // Try a simple query first
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

/**
 * Check if a bucket exists
 * @param {string} bucketName - Name of the bucket to check
 * @returns {Promise<boolean>} - Whether the bucket exists
 */
async function checkBucketExists(bucketName) {
  console.log(`Checking if bucket ${bucketName} exists...`);
  
  try {
    // List buckets
    const { data: buckets, error: bucketsError } = await supabase
      .storage
      .listBuckets();
      
    if (bucketsError) {
      console.error('Error listing buckets:', bucketsError);
      return false;
    }
    
    console.log(`Found ${buckets.length} buckets:`);
    buckets.forEach((bucket, index) => {
      console.log(`[${index + 1}] ${bucket.name} (${bucket.public ? 'Public' : 'Private'})`);
    });
    
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

/**
 * Create a bucket if it doesn't exist
 * @param {string} bucketName - Name of the bucket to create
 * @returns {Promise<boolean>} - Whether the bucket was created successfully
 */
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

/**
 * List files in a bucket
 * @param {string} bucketName - Name of the bucket to list
 * @returns {Promise<Array>} - Array of files in the bucket
 */
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
    const { data: files, error } = await supabase
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
      const { data: publicUrlData } = supabase
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

/**
 * Upload a file to a bucket
 * @param {string} filePath - Path to the file to upload
 * @param {string} bucketName - Name of the bucket to upload to
 * @returns {Promise<Object>} - Upload result
 */
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

/**
 * Upload all PNG files to a bucket
 * @param {string} bucketName - Name of the bucket to upload to
 * @returns {Promise<Object>} - Upload result
 */
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

/**
 * Get all PNG files in the scraper-results directory
 * @returns {Array} - Array of PNG files
 */
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

// Export functions for use in other modules
module.exports = {
  testSupabaseConnection,
  checkBucketExists,
  createBucket,
  listFilesInBucket,
  uploadFileToBucket,
  uploadAllPngFiles,
  getPngFiles
};