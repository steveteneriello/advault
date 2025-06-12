// StagingProcessor.js - Process SERP results into the staging table
const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

// Initialize Supabase client
const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Supabase credentials not found in environment variables');
  process.exit(1);
}

console.log('Using Supabase URL:', supabaseUrl);
console.log('Using Supabase Key:', supabaseKey ? '✓ Set' : '✗ Not set');

const supabase = createClient(supabaseUrl, supabaseKey);

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
    
    console.log('Supabase connection successful!');
    return true;
  } catch (error) {
    console.error('Supabase connection test error:', error);
    return false;
  }
}

// Function to check if a file is a results file
const isResultsFile = (filename) => {
  return filename.startsWith('ads-results-') && filename.endsWith('.json');
};

// Process a single results file
const processFile = async (filePath) => {
  console.log(`\n📄 Processing ${filePath}...`);
  
  try {
    // Read and parse the file
    let fileContent;
    try {
      fileContent = fs.readFileSync(filePath, 'utf8');
    } catch (readError) {
      console.error(`Error reading file ${filePath}:`, readError);
      return;
    }
    
    let data;
    try {
      data = JSON.parse(fileContent);
    } catch (parseError) {
      console.error(`Error parsing JSON in ${filePath}:`, parseError);
      return;
    }
    
    // Validate job data
    if (!data?.job) {
      console.log(`No job data in ${filePath}, skipping`);
      return;
    }

    // Extract job metadata
    const jobId = data.job.id;
    const query = data.job.query || '';
    const location = data.job.geo_location || '';
    const timestamp = data.job.created_at || new Date().toISOString();
    
    console.log(`Processing job ${jobId} for query "${query}" in ${location}`);
    
    // Check if this job is already in the staging table
    const { data: existingStaging, error: checkError } = await supabase
      .from('staging_serps')
      .select('id, status')
      .eq('job_id', jobId)
      .maybeSingle();
    
    if (checkError) {
      console.error(`Error checking for existing staging record:`, checkError);
      return;
    }
    
    if (existingStaging) {
      console.log(`Job ${jobId} already exists in staging table with status: ${existingStaging.status}`);
      
      // If it's in error state, we could offer to reprocess
      if (existingStaging.status === 'error') {
        console.log(`This job is in error state. You can reprocess it using:`);
        console.log(`  SELECT reprocess_staged_serp('${existingStaging.id}');`);
      }
      
      return;
    }

    // Log the structure of the data to help debug
    console.log('Data structure:');
    console.log('- job:', Object.keys(data.job));
    console.log('- results:', data.results ? data.results.length : 0);
    
    if (data.results && data.results.length > 0) {
      console.log('- First result structure:', Object.keys(data.results[0]));
      if (data.results[0].content) {
        console.log('- Content structure:', Object.keys(data.results[0].content));
        if (data.results[0].content.results) {
          console.log('- Results structure:', Object.keys(data.results[0].content.results));
          
          // Check for paid ads
          const paidAds = data.results[0].content.results.paid || [];
          console.log(`- Found ${paidAds.length} paid ads`);
          
          if (paidAds.length > 0) {
            console.log('- First ad structure:', Object.keys(paidAds[0]));
            console.log('- First ad:', {
              title: paidAds[0].title,
              url: paidAds[0].url,
              position: paidAds[0].pos
            });
          }
        }
      }
    }

    // Create a comprehensive version of the content to capture all ad fields
    const enhancedContent = {
      job: {
        id: data.job.id,
        query: data.job.query,
        geo_location: data.job.geo_location,
        created_at: data.job.created_at,
        status: data.job.status
      },
      results: data.results.map(result => ({
        content: {
          url: result.content?.url,
          results: {
            paid: (result.content?.results?.paid || []).map(ad => ({
              // Basic ad fields
              pos: ad.pos,
              url: ad.url,
              title: ad.title,
              desc: ad.desc,
              url_shown: ad.url_shown,
              pos_overall: ad.pos_overall,
              
              // Additional fields
              data_rw: ad.data_rw,
              data_pcu: ad.data_pcu,
              sitelinks: ad.sitelinks,
              price: ad.price,
              seller: ad.seller,
              image_url: ad.url_image,
              call_extension: ad.call_extension,
              
              // Any other fields that might be present
              currency: ad.currency,
              rating: ad.rating,
              review_count: ad.review_count,
              previous_price: ad.previous_price
            })),
            organic: (result.content?.results?.organic || []).slice(0, 5).map(result => ({
              pos: result.pos,
              url: result.url,
              title: result.title,
              desc: result.desc,
              url_shown: result.url_shown,
              pos_overall: result.pos_overall,
              
              // Additional organic result fields
              rating: result.rating,
              review_count: result.review_count,
              favicon_text: result.favicon_text,
              images: result.images,
              sitelinks: result.sitelinks
            }))
          }
        },
        created_at: result.created_at,
        job_id: result.job_id
      }))
    };

    console.log('Inserting into staging table...');
    console.log(`Enhanced content size: ${JSON.stringify(enhancedContent).length} bytes`);
    console.log(`Number of paid ads in enhanced content: ${enhancedContent.results[0].content.results.paid.length}`);
    
    // Insert into staging table
    const { data: stagingData, error: stagingError } = await supabase
      .from('staging_serps')
      .insert({
        job_id: jobId,
        query: query,
        location: location,
        timestamp: timestamp,
        content: enhancedContent,
        status: 'pending'
      })
      .select();

    if (stagingError) {
      console.error('Error inserting into staging table:', stagingError);
      return;
    }

    if (!stagingData || stagingData.length === 0) {
      console.error('No data returned after insert into staging table');
      return;
    }

    console.log(`✅ Inserted job ${jobId} into staging table with ID: ${stagingData[0].id}`);
    console.log(`   Processing will happen automatically via database trigger`);
    
    // Wait a moment to allow the trigger to process
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Check the status of the processing
    const { data: statusData, error: statusError } = await supabase
      .from('staging_serps')
      .select('status, error_message, processed_at')
      .eq('id', stagingData[0].id)
      .single();
      
    if (statusError) {
      console.error('Error checking processing status:', statusError);
      return;
    }
    
    console.log(`   Current status: ${statusData.status}`);
    if (statusData.error_message) {
      console.error(`   Error message: ${statusData.error_message}`);
    }
    if (statusData.processed_at) {
      console.log(`   Processed at: ${new Date(statusData.processed_at).toLocaleString()}`);
    }
    
    // Check processing logs
    const { data: logs, error: logsError } = await supabase
      .from('processing_logs')
      .select('operation, status, message, created_at')
      .eq('staging_id', stagingData[0].id)
      .order('created_at', { ascending: true });
      
    if (logsError) {
      console.error('Error fetching processing logs:', logsError);
    } else if (logs && logs.length > 0) {
      console.log(`   Processing logs:`);
      logs.forEach(log => {
        const timestamp = new Date(log.created_at).toLocaleTimeString();
        const statusSymbol = log.status === 'error' ? '❌' : 
                            log.status === 'warning' ? '⚠️' : 
                            log.status === 'success' ? '✅' : 'ℹ️';
        console.log(`   ${statusSymbol} [${timestamp}] ${log.operation}: ${log.message}`);
      });
    } else {
      console.log('   No processing logs found. This may indicate the trigger is not working.');
    }
    
    // If processing was successful, trigger rendering of ad landing pages
    if (statusData.status === 'processed') {
      console.log('\n🔄 SERP processing completed successfully. Triggering ad rendering...');
      
      // Get the SERP ID
      const { data: serpData, error: serpError } = await supabase
        .from('serps')
        .select('id')
        .eq('job_id', jobId)
        .single();
        
      if (serpError) {
        console.error('Error fetching SERP ID:', serpError);
        return;
      }
      
      if (!serpData) {
        console.error('No SERP found for job ID:', jobId);
        return;
      }
      
      console.log(`Found SERP ID: ${serpData.id}`);
      
      // Check if there are any SERP-Ad relationships
      const { data: serpAds, error: serpAdsError } = await supabase
        .from('serp_ads')
        .select('ad_id, position')
        .eq('serp_id', serpData.id);
        
      if (serpAdsError) {
        console.error('Error fetching SERP-Ad relationships:', serpAdsError);
      } else {
        console.log(`Found ${serpAds ? serpAds.length : 0} SERP-Ad relationships`);
        
        if (serpAds && serpAds.length > 0) {
          // Import the AdRenderingProcessor
          const { processAdsFromSerp } = require('./f-ad-rendering-processor');
          
          // Process the ads from the SERP
          console.log('Starting ad rendering process...');
          try {
            const renderingResult = await processAdsFromSerp(serpData.id, 3); // Process up to 3 ads to reduce load
            
            if (renderingResult.success) {
              console.log('✅ Ad rendering completed successfully');
            } else {
              console.error('❌ Ad rendering failed:', renderingResult.error);
            }
          } catch (renderError) {
            console.error('❌ Error during ad rendering:', renderError);
          }
        } else {
          console.log('No SERP-Ad relationships found, skipping rendering');
        }
      }
    }

  } catch (error) {
    console.error(`Unexpected error processing ${filePath}:`, error);
  }
};

// Process all results files
const processAllFiles = async () => {
  console.log('🔍 Starting SERP staging process...');

  // Test Supabase connection first
  const connectionOk = await testSupabaseConnection();
  if (!connectionOk) {
    console.error('❌ Supabase connection failed, aborting');
    return;
  }

  try {
    // Check if directory exists
    const RESULTS_DIR = path.join(process.cwd(), 'SCRAPI', 'output-staging', 'scraper-results');
    if (!fs.existsSync(RESULTS_DIR)) {
      console.error(`❌ Results directory ${RESULTS_DIR} does not exist`);
      return;
    }
    
    // Get list of all files in directory
    const allFiles = fs.readdirSync(RESULTS_DIR);
    console.log(`Found ${allFiles.length} files in directory`);
    
    // Filter for relevant files - only process actual results files
    const files = allFiles.filter(f => isResultsFile(f));

    console.log(`📋 Found ${files.length} results files to process`);

    if (files.length === 0) {
      console.log('❗ No results files to process');
      return;
    }

    // Process each file
    for (const file of files) {
      await processFile(path.join(RESULTS_DIR, file));
    }

    // Print summary
    try {
      const { data: stagingData, error: countError } = await supabase
        .from('staging_serps')
        .select('status', { count: 'exact' })
        .order('status');

      if (countError) {
        console.error('Error getting staging count:', countError);
      } else {
        console.log(`\n📊 Staging Table Summary:`);
        
        // Group by status
        const statusCounts = {};
        stagingData.forEach(item => {
          statusCounts[item.status] = (statusCounts[item.status] || 0) + 1;
        });
        
        // Print counts
        Object.entries(statusCounts).forEach(([status, count]) => {
          const statusSymbol = status === 'error' ? '❌' : 
                              status === 'skipped' ? '⏭️' : 
                              status === 'processed' ? '✅' : 
                              status === 'pending' ? '⏳' : '❓';
          console.log(`   ${statusSymbol} ${status}: ${count}`);
        });
        
        console.log(`   Total: ${stagingData.length}`);
      }

      // Check for any errors
      const { data: errorData, error: errorCountError } = await supabase
        .from('staging_serps')
        .select('id, job_id, error_message')
        .eq('status', 'error');

      if (errorCountError) {
        console.error('Error getting error count:', errorCountError);
      } else if (errorData && errorData.length > 0) {
        console.log(`\n⚠️ Found ${errorData.length} errors:`);
        errorData.forEach(item => {
          console.log(`   Job ${item.job_id}: ${item.error_message}`);
        });
      }
      
      // Check ad rendering stats
      try {
        const { data: renderingData, error: renderingError } = await supabase
          .from('ad_renderings')
          .select('rendering_type, status', { count: 'exact' });
          
        if (renderingError) {
          console.error('Error getting rendering stats:', renderingError);
        } else if (renderingData && renderingData.length > 0) {
          console.log(`\n🖼️ Ad Rendering Summary:`);
          
          // Group by type and status
          const renderingStats = {};
          renderingData.forEach(item => {
            const key = `${item.rendering_type}_${item.status}`;
            renderingStats[key] = (renderingStats[key] || 0) + 1;
          });
          
          // Print counts
          Object.entries(renderingStats).forEach(([key, count]) => {
            const [type, status] = key.split('_');
            const statusSymbol = status === 'error' ? '❌' : 
                                status === 'skipped' ? '⏭️' : 
                                status === 'processed' ? '✅' : 
                                status === 'pending' ? '⏳' : '❓';
            console.log(`   ${statusSymbol} ${type.toUpperCase()}: ${status} - ${count}`);
          });
          
          console.log(`   Total: ${renderingData.length}`);
        }
      } catch (renderingStatsError) {
        console.error('Error getting rendering stats:', renderingStatsError);
      }
    } catch (summaryError) {
      console.error('Error generating summary:', summaryError);
    }
    
    console.log('\n✅ SERP staging process complete');
  } catch (error) {
    console.error('❌ Unexpected error in processAllFiles:', error);
  }
};

// If this file is run directly
if (require.main === module) {
  processAllFiles().catch(error => {
    console.error('❌ Unhandled error in main process:', error);
    process.exit(1);
  });
}

// Export for use in other modules
module.exports = { processFile, processAllFiles };