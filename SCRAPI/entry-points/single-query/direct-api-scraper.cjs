#!/usr/bin/env node
/**
 * Direct Single Query API Scraper - Bypasses batch automation for real single queries
 */

const axios = require('axios');
const { createClient } = require('@supabase/supabase-js');
const path = require('path');
require('dotenv').config();

// Configuration
const OXYLABS_USERNAME = process.env.OXYLABS_USERNAME;
const OXYLABS_PASSWORD = process.env.OXYLABS_PASSWORD;
const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;

// Validation
if (!OXYLABS_USERNAME || !OXYLABS_PASSWORD) {
  console.error('❌ Missing Oxylabs credentials');
  process.exit(1);
}

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('❌ Missing Supabase credentials');
  process.exit(1);
}

// Initialize Supabase
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

/**
 * Submit a single query directly to Oxylabs Realtime API
 */
async function submitSingleQuery(query, location) {
  console.log(`\n🚀 Submitting DIRECT query to Oxylabs...`);
  console.log(`📋 Query: "${query}"`);
  console.log(`📍 Location: "${location}"`);
  
  const payload = {
    source: "google_ads",
    query: query,
    geo_location: location,
    device: "desktop",
    parse: true,
    start_page: 1,
    pages: 1,
    locale: "en-US",
    user_agent_type: "desktop",
    context: [
      {
        key: "ad_extraction", 
        value: "true"
      }
    ]
  };

  console.log('\n📤 Payload:');
  console.log(JSON.stringify(payload, null, 2));

  try {
    const startTime = Date.now();
    
    // Make realtime API call to Oxylabs
    const response = await axios.post('https://realtime.oxylabs.io/v1/queries', payload, {
      auth: {
        username: OXYLABS_USERNAME,
        password: OXYLABS_PASSWORD
      },
      headers: {
        'Content-Type': 'application/json'
      },
      timeout: 300000 // 5 minutes timeout for realtime API
    });

    const endTime = Date.now();
    const processingTime = endTime - startTime;

    console.log(`\n✅ Oxylabs realtime response received (${processingTime}ms)`);
    console.log(`🔍 Response status: ${response.status}`);
    
    if (response.data && response.data.results && response.data.results.length > 0) {
      const result = response.data.results[0];
      const content = result.content;
      
      if (content && content.results && content.results.paid) {
        const ads = content.results.paid;
        console.log(`📊 Found ${ads.length} ads in response`);
        
        // Debug: Show first ad structure
        if (ads.length > 0) {
          console.log('\n🔍 First ad structure:');
          console.log(JSON.stringify(ads[0], null, 2));
        }
        
        // Debug: Show all ad URLs
        console.log('\n🔗 Ad URLs found:');
        ads.forEach((ad, index) => {
          console.log(`  ${index + 1}. ${ad.url || ad.link || 'No URL'} - ${ad.title || 'No title'}`);
        });
        
        // Stage the SERP for processing
        const stagingResult = await stageSerpForProcessing(
          `realtime-${Date.now()}`,
          query,
          location,
          new Date().toISOString(),
          JSON.stringify(content)
        );
        
        if (stagingResult.success) {
          console.log(`✅ SERP staged successfully with ID: ${stagingResult.stagingId}`);
          
          // Wait a moment for database trigger to process
          console.log('⏳ Waiting for database processing...');
          await new Promise(resolve => setTimeout(resolve, 5000));
          
          // Check if processing completed
          const processingStatus = await checkSerpProcessingStatus(stagingResult.stagingId);
          console.log('📋 Processing status:', processingStatus);
          
          // Debug: Check what was actually processed in the database
          await debugDatabaseProcessing(stagingResult.stagingId);
        }
        
        return {
          success: true,
          jobId: `realtime-${Date.now()}`,
          adsFound: ads.length,
          query,
          location,
          processingTime,
          stagingId: stagingResult.stagingId,
          rawData: content
        };
      } else {
        console.log('⚠️ No ads found in response');
        
        // Debug: Let's see what the content structure actually looks like
        console.log('\n🔍 Full content structure:');
        console.log(JSON.stringify(content, null, 2));
        
        // Debug: Check if ads are in a different location
        if (content && content.results) {
          console.log('\n🔍 Available result types:');
          console.log(Object.keys(content.results));
        }
        
        return {
          success: true,
          jobId: `realtime-${Date.now()}`,
          adsFound: 0,
          query,
          location,
          processingTime,
          message: 'No ads found'
        };
      }
    } else {
      throw new Error('Invalid response structure from Oxylabs');
    }

  } catch (error) {
    console.error('❌ Error calling Oxylabs realtime API:', error.message);
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response data:', JSON.stringify(error.response.data, null, 2));
    }
    throw error;
  }
}

/**
 * Stage a SERP for processing in Supabase
 */
async function stageSerpForProcessing(jobId, query, location, timestamp, content) {
  try {
    const { data, error } = await supabase
      .from('staging_serps')
      .insert({
        job_id: jobId,
        query: query,
        location: location,
        timestamp: timestamp,
        content: content,
        status: 'pending'
      })
      .select();
      
    if (error) {
      console.error(`Error staging SERP: ${error.message}`);
      return {
        success: false,
        error: error.message
      };
    }
    
    return {
      success: true,
      stagingId: data[0].id
    };
  } catch (error) {
    console.error(`Unexpected error staging SERP: ${error.message}`);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Debug what was actually processed in the database
 */
async function debugDatabaseProcessing(stagingId) {
  try {
    console.log('\n🔍 DEBUGGING DATABASE PROCESSING:');
    console.log('==================================');
    
    // Check staging_serps table
    const { data: stagingData, error: stagingError } = await supabase
      .from('staging_serps')
      .select('*')
      .eq('id', stagingId)
      .single();
      
    if (stagingError) {
      console.error('❌ Error fetching staging data:', stagingError.message);
    } else {
      console.log(`📋 Staging record status: ${stagingData.status}`);
      console.log(`📋 Staging error message: ${stagingData.error_message || 'None'}`);
      console.log(`📋 Staging processed at: ${stagingData.processed_at || 'Not processed'}`);
    }
    
    // Check if any serps were created
    const { data: serpData, error: serpError } = await supabase
      .from('serps')
      .select('id, query, location, created_at')
      .eq('job_id', stagingData?.job_id || '')
      .order('created_at', { ascending: false })
      .limit(5);
      
    if (serpError) {
      console.error('❌ Error fetching SERP data:', serpError.message);
    } else {
      console.log(`📊 SERPs created: ${serpData?.length || 0}`);
      if (serpData && serpData.length > 0) {
        serpData.forEach((serp, index) => {
          console.log(`  ${index + 1}. SERP ID: ${serp.id} - Query: "${serp.query}" - Location: ${serp.location}`);
        });
        
        // Check ads for the most recent SERP
        const latestSerpId = serpData[0].id;
        const { data: adsData, error: adsError } = await supabase
          .from('ads')
          .select('id, title, url, advertiser_name')
          .eq('serp_id', latestSerpId)
          .limit(10);
          
        if (adsError) {
          console.error('❌ Error fetching ads data:', adsError.message);
        } else {
          console.log(`🎯 Ads created: ${adsData?.length || 0}`);
          if (adsData && adsData.length > 0) {
            adsData.forEach((ad, index) => {
              console.log(`  ${index + 1}. Ad ID: ${ad.id} - "${ad.title}" - ${ad.url} - ${ad.advertiser_name || 'Unknown advertiser'}`);
            });
          }
        }
      }
    }
    
    // Check if any advertisers were created
    const { data: advertiserData, error: advertiserError } = await supabase
      .from('advertisers')
      .select('id, name, website, created_at')
      .order('created_at', { ascending: false })
      .limit(5);
      
    if (advertiserError) {
      console.error('❌ Error fetching advertiser data:', advertiserError.message);
    } else {
      console.log(`🏢 Recent advertisers: ${advertiserData?.length || 0}`);
      if (advertiserData && advertiserData.length > 0) {
        advertiserData.forEach((advertiser, index) => {
          console.log(`  ${index + 1}. ${advertiser.name} - ${advertiser.website || 'No website'} - ${advertiser.created_at}`);
        });
      }
    }
    
  } catch (error) {
    console.error('❌ Error in database debugging:', error.message);
  }
}

/**
 * Check SERP processing status
 */
async function checkSerpProcessingStatus(stagingId) {
  try {
    const { data, error } = await supabase
      .from('staging_serps')
      .select('status, error_message, processed_at')
      .eq('id', stagingId)
      .single();
      
    if (error) {
      return {
        success: false,
        error: error.message
      };
    }
    
    return {
      success: true,
      status: data.status,
      errorMessage: data.error_message,
      processedAt: data.processed_at
    };
  } catch (error) {
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
  try {
    // Get command line arguments
    const args = process.argv.slice(2);
    
    if (args.length < 2) {
      console.error('❌ Usage: node direct-api-scraper.cjs "query" "location"');
      console.error('   Example: node direct-api-scraper.cjs "plumber near me" "Sacramento, CA, United States"');
      process.exit(1);
    }
    
    const query = args[0];
    const location = args[1];
    
    console.log('🔧 DIRECT SINGLE QUERY API SCRAPER');
    console.log('==================================');
    console.log(`📋 Query: "${query}"`);
    console.log(`📍 Location: "${location}"`);
    console.log('⚡ Mode: REALTIME (bypassing batch automation)');
    
    // Submit the query
    const result = await submitSingleQuery(query, location);
    
    // Display results
    console.log('\n🎉 DIRECT API RESULTS:');
    console.log('======================');
    if (result.success) {
      console.log(`✅ Status: SUCCESS`);
      console.log(`📋 Job ID: ${result.jobId}`);
      console.log(`🎯 Ads Found: ${result.adsFound}`);
      console.log(`⏱️ Processing Time: ${result.processingTime}ms`);
      if (result.stagingId) {
        console.log(`🗃️ Staging ID: ${result.stagingId}`);
      }
    } else {
      console.log(`❌ Status: FAILED`);
      console.log(`💬 Error: ${result.error}`);
    }
    
  } catch (error) {
    console.error('\n❌ FATAL ERROR:', error.message);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  main();
}

module.exports = {
  submitSingleQuery,
  stageSerpForProcessing,
  checkSerpProcessingStatus
};
