// ProcessPngToBase64.js - Process PNG files and store them as base64 in the database
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

// Create regular client for read operations
const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false
  }
});

// Create admin client with service role key for write operations
const supabaseAdmin = supabaseServiceKey ? 
  createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false
    }
  }) : 
  supabase;

// Directory where scraper results are stored
const RESULTS_DIR = path.join(process.cwd(), 'SCRAPI', 'output-staging', 'scraper-results');

// Test Supabase connection
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

// Extract domain from filename
function extractDomainFromFilename(filename) {
  // Filenames are typically in the format: rendered-domain-timestamp.png or alt-rendered-domain-timestamp.png
  const parts = filename.split('-');
  
  // Handle different filename formats
  if (parts.length < 2) {
    return null;
  }
  
  // If it starts with "alt-rendered", the domain is in the 3rd position
  if (parts[0] === 'alt' && parts[1] === 'rendered' && parts.length >= 3) {
    return parts[2];
  }
  
  // If it starts with "rendered", the domain is in the 2nd position
  if (parts[0] === 'rendered' && parts.length >= 2) {
    return parts[1];
  }
  
  return null;
}

// Create test data if needed
async function createTestDataIfNeeded(maxDomains = 3) {
  console.log('Checking if test data needs to be created...');
  
  try {
    // Check if any ads exist - USE ADMIN CLIENT FOR CONSISTENT ACCESS
    const { data: adsData, error: adsError } = await supabaseAdmin
      .from('ads')
      .select('*');
      
    if (adsError) {
      console.error('Error checking for ads:', adsError);
      return false;
    }
    
    // Handle the case where data might be null
    const adCount = adsData?.length || 0;
    
    if (adCount > 0) {
      console.log(`Found ${adCount} existing ads, no need to create test data`);
      return true;
    }
    
    console.log('No ads found, creating test data...');
    
    // Ensure the directory exists
    if (!fs.existsSync(RESULTS_DIR)) {
      fs.mkdirSync(RESULTS_DIR, { recursive: true });
      console.log(`Created directory: ${RESULTS_DIR}`);
    }
    
    // Get all PNG files
    const files = fs.readdirSync(RESULTS_DIR);
    const pngFiles = files.filter(file => file.endsWith('.png'));
    
    if (pngFiles.length === 0) {
      console.error('No PNG files found to create test data from');
      return false;
    }
    
    console.log(`Found ${pngFiles.length} PNG files for test data creation`);
    
    // Create a test SERP using admin client
    const { data: serp, error: serpError } = await supabaseAdmin
      .from('serps')
      .insert({
        job_id: `test-${Date.now()}`,
        query: 'test query',
        location: 'test location',
        timestamp: new Date().toISOString(),
        content: { test: true }
      })
      .select()
      .single();
      
    if (serpError) {
      console.error('Error creating test SERP:', serpError);
      return false;
    }
    
    console.log(`Created test SERP with ID: ${serp.id}`);
    
    // Create test advertisers and ads for each PNG file
    let successCount = 0;
    const processedDomains = new Set();
    
    for (const file of pngFiles) {
      const domain = extractDomainFromFilename(file);
      
      if (!domain) {
        console.log(`Could not extract domain from filename: ${file}, skipping`);
        continue;
      }
      
      // Skip if we've already processed this domain
      if (processedDomains.has(domain)) {
        continue;
      }
      
      processedDomains.add(domain);
      
      // Create advertiser using admin client
      const { error: advertiserError } = await supabaseAdmin
        .from('advertisers')
        .insert({
          domain: domain,
          first_seen: new Date().toISOString(),
          last_seen: new Date().toISOString()
        });
        
      if (advertiserError && !advertiserError.message?.includes('duplicate key')) {
        console.error(`Error creating advertiser for ${domain}:`, advertiserError);
        continue;
      }
      
      // Create ad using admin client
      const adId = require('crypto').createHash('sha256').update(`test-${domain}-${Date.now()}`).digest('hex');
      
      const { error: adError } = await supabaseAdmin
        .from('ads')
        .insert({
          id: adId,
          advertiser_domain: domain,
          title: `Test Ad for ${domain}`,
          description: 'This is a test ad created for PNG processing',
          url: `https://${domain}`,
          timestamp: new Date().toISOString()
        });
        
      if (adError) {
        console.error(`Error creating ad for ${domain}:`, adError);
        continue;
      }
      
      // Link ad to SERP using admin client
      const { error: serpAdError } = await supabaseAdmin
        .from('serp_ads')
        .insert({
          serp_id: serp.id,
          ad_id: adId,
          position: successCount + 1,
          position_overall: successCount + 1
        });
        
      if (serpAdError) {
        console.error(`Error linking ad to SERP for ${domain}:`, serpAdError);
        continue;
      }
      
      console.log(`✅ Created test data for ${domain}`);
      successCount++;
      
      // Only create a few test records to avoid overwhelming the database
      if (successCount >= maxDomains) {
        console.log('Created enough test data, stopping');
        break;
      }
    }
    
    console.log(`Created test data for ${successCount} domains`);
    return successCount > 0;
  } catch (error) {
    console.error('Unexpected error creating test data:', error);
    return false;
  }
}

// Process PNG files and store them as base64 in the database
async function processPngToBase64() {
  console.log('🔍 Processing PNG files and storing as base64 in the database...');
  
  try {
    // Check if the directory exists
    if (!fs.existsSync(RESULTS_DIR)) {
      console.error(`❌ Results directory ${RESULTS_DIR} does not exist`);
      fs.mkdirSync(RESULTS_DIR, { recursive: true });
      console.log(`Created directory: ${RESULTS_DIR}`);
      return false;
    }
    
    // Get all PNG files
    const files = fs.readdirSync(RESULTS_DIR);
    const pngFiles = files.filter(file => file.endsWith('.png'));
    
    console.log(`Found ${pngFiles.length} PNG files`);
    
    if (pngFiles.length === 0) {
      console.log('No PNG files to process');
      return true;
    }
    
    // Create test data if needed
    const testDataCreated = await createTestDataIfNeeded();
    if (!testDataCreated) {
      console.error('Failed to create test data');
      return false;
    }
    
    // Get all ads from the database
    const { data: ads, error: adsError } = await supabase
      .from('ads')
      .select('id, advertiser_domain, url, title');
      
    if (adsError) {
      console.error('Error fetching ads:', adsError);
      return false;
    }
    
    if (!ads || ads.length === 0) {
      console.error('No ads found in the database after creating test data');
      return false;
    }
    
    console.log(`Found ${ads.length} ads in the database`);
    
    // Get all SERPs from the database
    const { data: serps, error: serpsError } = await supabase
      .from('serps')
      .select('id, job_id, query, location');
      
    if (serpsError) {
      console.error('Error fetching SERPs:', serpsError);
      return false;
    }
    
    if (!serps || serps.length === 0) {
      console.error('No SERPs found in the database');
      return false;
    }
    
    console.log(`Found ${serps.length} SERPs in the database`);
    
    // Get all SERP-Ad relationships from the database
    const { data: serpAds, error: serpAdsError } = await supabase
      .from('serp_ads')
      .select('serp_id, ad_id, position, position_overall');
      
    if (serpAdsError) {
      console.error('Error fetching SERP-Ad relationships:', serpAdsError);
      return false;
    }
    
    if (!serpAds || serpAds.length === 0) {
      console.error('No SERP-Ad relationships found in the database');
      return false;
    }
    
    console.log(`Found ${serpAds.length} SERP-Ad relationships in the database`);
    
    // Process each PNG file
    let successCount = 0;
    let skippedCount = 0;
    let errorCount = 0;
    
    for (let i = 0; i < pngFiles.length; i++) {
      const file = pngFiles[i];
      const filePath = path.join(RESULTS_DIR, file);
      
      console.log(`\n[${i+1}/${pngFiles.length}] Processing ${file}...`);
      
      // Check if this file is already in the database
      const { data: existingRenderings, error: checkError } = await supabase
        .from('ad_renderings')
        .select('id, binary_content')
        .eq('content_path', filePath);
        
      if (checkError) {
        console.error('Error checking for existing renderings:', checkError);
        errorCount++;
        continue;
      }
      
      if (existingRenderings && existingRenderings.length > 0) {
        console.log(`File already exists in the database with ID: ${existingRenderings[0].id}`);
        
        // If it doesn't have binary_content, update it
        if (!existingRenderings[0].binary_content) {
          console.log('Updating with binary data...');
          
          try {
            // Check if the file exists
            if (!fs.existsSync(filePath)) {
              console.error(`File ${filePath} does not exist, skipping`);
              errorCount++;
              continue;
            }
            
            // Read file content as base64
            const fileContent = fs.readFileSync(filePath);
            const base64Content = fileContent.toString('base64');
            
            // Update the rendering with the binary data
            const { error: updateError } = await supabaseAdmin
              .from('ad_renderings')
              .update({
                binary_content: base64Content
              })
              .eq('id', existingRenderings[0].id);
              
            if (updateError) {
              console.error('Error updating rendering with binary data:', updateError);
              errorCount++;
              continue;
            }
            
            console.log(`✅ Updated rendering with binary data`);
            successCount++;
          } catch (error) {
            console.error('Error processing file:', error);
            errorCount++;
            continue;
          }
        } else {
          console.log(`Rendering already has binary data`);
          skippedCount++;
        }
        
        continue;
      }
      
      // Try to match the file to an ad based on the filename
      const domain = extractDomainFromFilename(file);
      
      if (!domain) {
        console.log('Cannot parse domain from filename, skipping');
        skippedCount++;
        continue;
      }
      
      console.log(`Extracted domain from filename: ${domain}`);
      
      // Find matching ads
      const matchingAds = ads.filter(ad => {
        const adDomain = ad.advertiser_domain || '';
        const adUrl = ad.url || '';
        return adDomain.includes(domain) || 
               domain.includes(adDomain) || 
               adUrl.includes(domain) || 
               domain.includes(adUrl);
      });
      
      if (matchingAds.length === 0) {
        console.log(`No matching ads found for domain: ${domain}`);
        skippedCount++;
        continue;
      }
      
      console.log(`Found ${matchingAds.length} matching ads for domain: ${domain}`);
      
      // Use the first matching ad
      const ad = matchingAds[0];
      console.log(`Using ad: ${ad.id} (${ad.advertiser_domain}) - ${ad.title || 'No title'}`);
      
      // Find SERP-Ad relationships for this ad
      const matchingSerpAds = serpAds.filter(sa => sa.ad_id === ad.id);
      
      if (matchingSerpAds.length === 0) {
        console.log(`No SERP-Ad relationships found for ad: ${ad.id}`);
        skippedCount++;
        continue;
      }
      
      console.log(`Found ${matchingSerpAds.length} SERP-Ad relationships for ad: ${ad.id}`);
      
      // Use the first SERP-Ad relationship
      const serpAd = matchingSerpAds[0];
      const serpId = serpAd.serp_id;
      
      try {
        // Check if the file exists
        if (!fs.existsSync(filePath)) {
          console.error(`File ${filePath} does not exist, skipping`);
          errorCount++;
          continue;
        }
        
        // Get file stats
        const stats = fs.statSync(filePath);
        const fileSize = stats.size;
        
        // Read file content as base64
        const fileContent = fs.readFileSync(filePath);
        const base64Content = fileContent.toString('base64');
        
        console.log(`File size: ${fileSize} bytes, Base64 length: ${base64Content.length}`);
        
        // Insert the rendering into the database with binary data
        const { error: insertError } = await supabaseAdmin
          .from('ad_renderings')
          .insert({
            ad_id: ad.id,
            serp_id: serpId,
            rendering_type: 'png',
            content_path: filePath,
            content_size: fileSize,
            binary_content: base64Content,
            status: 'processed',
            processed_at: new Date().toISOString()
          });
          
        if (insertError) {
          console.error('Error inserting rendering into database:', insertError);
          errorCount++;
          continue;
        }
        
        console.log('✅ Rendering with base64 data inserted into database successfully');
        successCount++;
      } catch (error) {
        console.error('Error processing file:', error);
        errorCount++;
        continue;
      }
    }
    
    // Print summary
    console.log('\n📊 Processing Summary:');
    console.log(`   Total PNG files: ${pngFiles.length}`);
    console.log(`   Successfully processed: ${successCount}`);
    console.log(`   Skipped: ${skippedCount}`);
    console.log(`   Errors: ${errorCount}`);
    
    // Verify results
    const { data: renderingsCount, error: countError } = await supabase
      .from('ad_renderings')
      .select('*', { count: 'exact', head: true });
      
    if (!countError) {
      console.log(`\nVerification: Found ${renderingsCount.count} total renderings in the database`);
    }
    
    // Check for renderings with binary content
    const { data: binaryCount, error: binaryError } = await supabase
      .from('ad_renderings')
      .select('*', { count: 'exact', head: true })
      .not('binary_content', 'is', null);
      
    if (!binaryError) {
      console.log(`Verification: Found ${binaryCount.count} renderings with binary content`);
    }
    
    return true;
  } catch (error) {
    console.error('Unexpected error during processing:', error);
    return false;
  }
}

// Main function
async function main() {
  console.log('🚀 Starting ProcessPngToBase64');
  
  // Test Supabase connection
  const connectionOk = await testSupabaseConnection();
  if (!connectionOk) {
    console.error('❌ Supabase connection failed, aborting');
    return;
  }
  
  // Process PNG files and store them as base64 in the database
  const success = await processPngToBase64();
  
  if (success) {
    console.log('\n✅ PNG processing completed successfully');
    console.log('\nThe PNG files have been stored in the database as base64-encoded data.');
    console.log('You can now view them using the ViewBase64Images.js script:');
    console.log('  node SCRAPI/g-reporting/ViewBase64Images.js');
  } else {
    console.error('\n❌ PNG processing failed');
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
  testSupabaseConnection,
  createTestDataIfNeeded,
  processPngToBase64
};