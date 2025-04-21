// CollectAndProcessAds.js - Collect and process ads in a single step
const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');
const { runScraper } = require('./c-google-ads-scraper.js');
const { processAllFiles } = require('./d-staging-processor.js');
const { waitForSerpProcessing } = require('./e-serp-processing-helper.js');
const { processAdsFromSerp } = require('./f-ad-rendering-processor.js');
const { validateSupabaseConfig, getSupabaseConfig } = require('../../utils/validateSupabaseConfig');
require('dotenv').config();

// Validate Supabase configuration
const validationResult = validateSupabaseConfig();
if (!validationResult.isValid) {
  console.error('❌ Invalid Supabase configuration:');
  validationResult.errors.forEach(error => console.error(`- ${error}`));
  process.exit(1);
}

// Get Supabase configuration
const config = getSupabaseConfig();

// Initialize Supabase client
const supabaseUrl = config.url;
const supabaseKey = config.anonKey;
const supabaseServiceKey = config.serviceRoleKey;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Supabase credentials not found in environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false
  },
  global: {
    headers: {
      'apikey': supabaseKey,
      'Authorization': `Bearer ${supabaseKey}`
    }
  }
});

const supabaseAdmin = supabaseServiceKey ? 
  createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false
    },
    global: {
      headers: {
        'apikey': supabaseServiceKey,
        'Authorization': `Bearer ${supabaseServiceKey}`
      }
    }
  }) : 
  supabase;

// Directory where scraper results are stored
const RESULTS_DIR = path.join(process.cwd(), 'SCRAPI', 'output-staging', 'scraper-results');
if (!fs.existsSync(RESULTS_DIR)) {
  fs.mkdirSync(RESULTS_DIR, { recursive: true });
}

// Test Supabase connection
async function testSupabaseConnection() {
  try {
    console.log('Testing Supabase connection...');
    console.log(`Using Supabase URL: ${supabaseUrl}`);
    console.log(`Using Supabase Key: ${supabaseKey ? '✓ Set' : '✗ Not set'}`);
    
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

// Main function to collect and process ads
async function collectAndProcessAds(query, location, maxAds = 3) {
  console.log('🚀 Starting Collect and Process Ads');
  console.log(`Query: ${query}`);
  console.log(`Location: ${location}`);
  console.log(`Max Ads to Render: ${maxAds}`);

  // Test Supabase connection
  const connectionOk = await testSupabaseConnection();
  if (!connectionOk) {
    console.error('❌ Supabase connection failed, aborting');
    return {
      success: false,
      error: 'Supabase connection failed'
    };
  }

  // Step 1: Collect ads
  console.log('\n📦 Step 1: Collecting ads...');
  const scrapeResult = await runScraper(query, location);
  
  if (!scrapeResult.success) {
    console.error('❌ Failed to collect ads');
    return scrapeResult;
  }

  // Step 2: Process ads
  console.log('\n📊 Step 2: Processing ads...');
  await processAllFiles();
  
  // Step 3: Wait for SERP processing to complete
  console.log('\n⏳ Step 3: Waiting for SERP processing to complete...');
  const processingResult = await waitForSerpProcessing(scrapeResult.jobId, 60, 1000);
  
  if (!processingResult.success) {
    console.error('❌ SERP processing failed:', processingResult.error);
    return {
      success: false,
      error: processingResult.error
    };
  }
  
  // Step 4: Process ad renderings
  console.log('\n🖼️ Step 4: Processing ad renderings...');
  try {
    const renderingResult = await processAdsFromSerp(processingResult.serpId, maxAds);
    if (renderingResult.success) {
      console.log('✅ Ad rendering completed successfully');
    } else {
      console.error('❌ Ad rendering failed:', renderingResult.error);
      // Continue anyway, this is not critical
    }
  } catch (error) {
    console.error('❌ Error during ad rendering:', error);
    // Continue anyway, this is not critical
  }

  console.log('\n✅ All steps completed successfully');
  return {
    success: true,
    jobId: scrapeResult.jobId,
    serpId: processingResult.serpId,
    adCount: processingResult.adCount,
    resultsPath: scrapeResult.resultsPath
  };
}

// Run the main function if this file is executed directly
if (require.main === module) {
  // Get query and location from command line arguments, or use defaults
  const query = process.argv[2] || 'plumbers near me';
  const location = process.argv[3] || 'Boston, Massachusetts, United States';
  const maxAds = parseInt(process.argv[4] || '3', 10);
  
  collectAndProcessAds(query, location, maxAds)
    .then(result => {
      if (result.success) {
        console.log('\n🎉 Collection and processing completed successfully');
        console.log(`SERP ID: ${result.serpId}`);
        console.log(`Ad Count: ${result.adCount}`);
        console.log(`Results saved to: ${result.resultsPath}`);
      } else {
        console.error('\n❌ Collection and processing failed');
        if (result.error) {
          console.error(`Error: ${result.error}`);
        }
      }
    })
    .catch(error => {
      console.error('❌ Unhandled error in main process:', error);
      process.exit(1);
    });
}

// Export functions for use in other modules
module.exports = {
  testSupabaseConnection,
  collectAndProcessAds
};