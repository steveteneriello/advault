// Oxylabs Google Ads Scraper with Geolocation, Job Polling, and Integrated HTML Rendering
const axios = require('axios');
const fs = require('fs');
const path = require('path');
const https = require('https');
const { createClient } = require('@supabase/supabase-js');
const { waitForSerpProcessing } = require('./e-serp-processing-helper.cjs');
const { makeOxylabsRequest, getJobResultsEnhanced } = require('../../utils/connection-helper.cjs');
const { validateSupabaseConfig, getSupabaseConfig } = require('../../utils/validateSupabaseConfig.cjs');
const { validateOxylabsConfig, getOxylabsConfig } = require('../../utils/validateOxylabsConfig.cjs');
const { getSupabaseHeaders } = require('../../utils/getSupabaseHeaders.cjs');
const { getJobDirectories } = require('../../utils/job-directory-manager.cjs');
require('dotenv').config();

// Create an HTTPS Agent with proper configurations
const httpsAgent = new https.Agent({
  keepAlive: true,  // Reuse connections for better performance
  maxSockets: 10,    // Allow up to 10 concurrent requests
  timeout: 30000     // Set timeout for each request to 30 seconds
});

// Validate Supabase configuration
const supabaseValidation = validateSupabaseConfig();
if (!supabaseValidation.isValid) {
  console.error('❌ Invalid Supabase configuration:');
  supabaseValidation.errors.forEach(error => console.error(`- ${error}`));
  process.exit(1);
}

// Validate Oxylabs configuration
const oxylabsValidation = validateOxylabsConfig();
if (!oxylabsValidation.isValid) {
  console.error('❌ Invalid Oxylabs configuration:');
  oxylabsValidation.errors.forEach(error => console.error(`- ${error}`));
  process.exit(1);
}

// Get Supabase configuration
const supabaseConfig = getSupabaseConfig();

// Get Oxylabs configuration
const oxylabsConfig = getOxylabsConfig();
const OXYLABS_USERNAME = oxylabsConfig.username;
const OXYLABS_PASSWORD = oxylabsConfig.password;

// Function to run the scraping task
const runScraper = async (query = 'plumbers near me', location = 'Boston, Massachusetts, United States') => {
  console.log('🚀 Starting Google Ads scraper...');
  console.log(`📍 Location: ${location}`);
  console.log(`🔍 Query: ${query}`);

  const payload = {
    source: 'google_ads',
    query: query,
    geo_location: location,
    device: 'desktop',
    parse: true,
    start_page: 1,
    pages: 2,
    locale: 'en-US',
    user_agent_type: 'desktop',
    context: [
      { key: 'ad_extraction', value: 'true' }
    ]
  };

  try {
    console.log('\n📦 Request Details:');
    console.log('URL:', 'https://data.oxylabs.io/v1/queries');
    console.log('Payload:', JSON.stringify(payload, null, 2));

    // Log credentials availability (not the actual values)
    console.log(`OXYLABS_USERNAME available: ${Boolean(OXYLABS_USERNAME)}`);
    console.log(`OXYLABS_PASSWORD available: ${Boolean(OXYLABS_PASSWORD)}`);

    // Use the enhanced Oxylabs request function with increased timeout and retries
    const response = await makeOxylabsRequest('https://data.oxylabs.io/v1/queries', payload, {
      username: OXYLABS_USERNAME,
      password: OXYLABS_PASSWORD,
      timeout: 1200000, // 20 minutes
      maxRetries: 5
    });

    console.log(`✅ Job created with ID: ${response.id}`);
    
    // Use the enhanced job results function with increased attempts and timeout
    const results = await getJobResultsEnhanced(response.id, {
      username: OXYLABS_USERNAME,
      password: OXYLABS_PASSWORD,
      maxAttempts: 120,
      baseDelay: 2000,
      timeout: 1200000
    });

    // Create job-specific directories for this query
    const jobDirs = getJobDirectories(response.id);
    console.log(`\n📁 Created job directories in: ${jobDirs.jobDir}`);

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');

    // Save metadata to job directory
    const metadataPath = path.join(jobDirs['scraper-results'], `job-metadata-${timestamp}.json`);
    fs.writeFileSync(metadataPath, JSON.stringify(response, null, 2));
    console.log(`\n📄 Job metadata saved to ${metadataPath}`);

    // Save results to job directory
    const resultsPath = path.join(jobDirs['scraper-results'], `ads-results-${timestamp}.json`);
    fs.writeFileSync(resultsPath, JSON.stringify(results, null, 2));
    console.log(`\n✅ Ads results saved to ${resultsPath}`);

    // Also save to the standard directory for backward compatibility
    const standardDir = path.join(process.cwd(), 'SCRAPI', 'output-staging', 'scraper-results');
    if (!fs.existsSync(standardDir)) {
      fs.mkdirSync(standardDir, { recursive: true });
    }
    
    const standardMetadataPath = path.join(standardDir, `job-metadata-${timestamp}.json`);
    fs.writeFileSync(standardMetadataPath, JSON.stringify(response, null, 2));
    
    const standardResultsPath = path.join(standardDir, `ads-results-${timestamp}.json`);
    fs.writeFileSync(standardResultsPath, JSON.stringify(results, null, 2));

    // Stage the results for processing
    console.log('\n📦 Staging results for processing...');
    
    // Log the structure of the results to help debug
    console.log('Results structure:');
    console.log('- job:', Object.keys(results.job));
    console.log('- results:', results.results ? results.results.length : 0);
    
    if (results.results && results.results.length > 0) {
      console.log('- First result structure:', Object.keys(results.results[0]));
      if (results.results[0].content) {
        console.log('- Content structure:', Object.keys(results.results[0].content));
        if (results.results[0].content.results) {
          console.log('- Results structure:', Object.keys(results.results[0].content.results));
          
          // Check for paid ads
          const paidAds = results.results[0].content.results.paid || [];
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
    
    // Get Supabase configuration
    const supabaseUrl = supabaseConfig.url;
    const supabaseKey = supabaseConfig.anonKey;
    
    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Supabase credentials are not properly configured');
    }
    
    // Use direct REST API call with proper headers
    try {
      const stagingResponse = await axios.post(
        `${supabaseUrl}/rest/v1/staging_serps`,
        {
          job_id: response.id,
          query: query,
          location: location,
          timestamp: new Date().toISOString(),
          content: results,
          status: 'pending'
        },
        {
          headers: getSupabaseHeaders()
        }
      );

      if (stagingResponse.data && stagingResponse.data.length > 0) {
        console.log('✅ Results staged successfully with ID:', stagingResponse.data[0].id);
      } else {
        console.log('✅ Results staged successfully');
      }
    } catch (stagingError) {
      console.error('❌ Error staging results:', stagingError.message);
      if (stagingError.response) {
        console.error('Response status:', stagingError.response.status);
        console.error('Response data:', stagingError.response.data);
      }
    }

    return {
      success: true,
      jobId: response.id,
      metadataPath,
      resultsPath
    };

  } catch (error) {
    console.error('\n❌ Error occurred:');
    if (error.response) {
      console.error('API Error Details:');
      console.error('Status:', error.response.status);
      console.error('Error Data:', error.response.data);
    } else if (error.request) {
      console.error('No response received from the server');
      console.error('Request details:', error.request);
    } else {
      console.error('Error:', error.message);
      console.error('Stack:', error.stack);
    }
    return {
      success: false,
      error: error.message
    };
  }
};

// If this file is run directly
if (require.main === module) {
  // Get query and location from command line arguments, or use defaults
  const query = process.argv[2] || 'plumbers near me';
  const location = process.argv[3] || 'Boston, Massachusetts, United States';
  const maxAds = parseInt(process.argv[4] || '3', 10); // Max ads to process
  
  runScraper(query, location).then(async result => {
    if (result.success) {
      console.log('\n✅ Scraping completed successfully');
      
      // Wait for SERP processing to complete
      if (result.stagingId) {
        console.log('Waiting for SERP processing to complete...');
        
        // Wait for SERP processing with increased timeout
        const processingResult = await waitForSerpProcessing(result.jobId, 30, 500);
        
        if (processingResult.success) {
          console.log(`✅ SERP processed successfully with ID: ${processingResult.serpId}`);
          console.log(`Found ${processingResult.adCount} ads linked to SERP`);
          
          // Import the HTML renderer
          const { renderAdLandingPagesAsHtml } = require('./g-render-ad-landing-pages-as-html.js');
          
          // Process the ad renderings as HTML
          console.log('Processing ad renderings as HTML...');
          const renderingResult = await renderAdLandingPagesAsHtml(processingResult.serpId, maxAds);
          
          if (renderingResult.success) {
            console.log('✅ Ad HTML rendering completed successfully');
            console.log('\nYou can now view the HTML renderings using:');
            console.log('  node SCRAPI/g-reporting/ViewHtmlRenderings.js');
          } else {
            console.error('❌ Ad HTML rendering failed:', renderingResult.error);
          }
        } else {
          console.error('❌ SERP processing failed:', processingResult.error);
        }
      }
    }
  }).catch(error => {
    console.error('❌ Unhandled error in main process:', error);
    process.exit(1);
  });
}

// Export the runScraper function
module.exports = { runScraper };
