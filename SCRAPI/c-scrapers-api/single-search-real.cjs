#!/usr/bin/env node
/**
 * Single Search - Real Oxylabs Google Ads API Test
 * Direct implementation for testing single queries with real API calls
 */

const axios = require('axios');
const fs = require('fs');
const path = require('path');
const https = require('https');
require('dotenv').config();

// Direct environment variables
const OXYLABS_USERNAME = process.env.OXYLABS_USERNAME;
const OXYLABS_PASSWORD = process.env.OXYLABS_PASSWORD;

// Create HTTPS Agent
const httpsAgent = new https.Agent({
  keepAlive: true,
  maxSockets: 10,
  timeout: 30000
});

/**
 * Make request to Oxylabs API
 */
async function makeOxylabsRequest(url, payload, options = {}) {
  const config = {
    method: 'POST',
    url,
    data: payload,
    auth: {
      username: options.username || OXYLABS_USERNAME,
      password: options.password || OXYLABS_PASSWORD
    },
    timeout: options.timeout || 300000, // 5 minutes
    httpsAgent,
    headers: {
      'Content-Type': 'application/json'
    }
  };

  try {
    const response = await axios(config);
    return response.data;
  } catch (error) {
    console.error('❌ Oxylabs API Error:', error.response?.data || error.message);
    throw error;
  }
}

/**
 * Poll for job completion
 */
async function pollJobResults(jobId, maxAttempts = 60, delayMs = 5000) {
  console.log(`🔄 Polling for job ${jobId} completion...`);
  
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const response = await axios.get(`https://data.oxylabs.io/v1/queries/${jobId}/results`, {
        auth: {
          username: OXYLABS_USERNAME,
          password: OXYLABS_PASSWORD
        },
        timeout: 30000,
        httpsAgent
      });

      if (response.data && response.data.results && response.data.results.length > 0) {
        console.log(`✅ Job ${jobId} completed after ${attempt} attempts`);
        return response.data;
      }

      console.log(`⏳ Attempt ${attempt}/${maxAttempts} - Job still processing...`);
      await new Promise(resolve => setTimeout(resolve, delayMs));
      
    } catch (error) {
      if (attempt === maxAttempts) {
        throw new Error(`Job polling failed after ${maxAttempts} attempts: ${error.message}`);
      }
      console.log(`⚠️  Attempt ${attempt} failed, retrying...`);
      await new Promise(resolve => setTimeout(resolve, delayMs));
    }
  }
  
  throw new Error(`Job ${jobId} did not complete within ${maxAttempts} attempts`);
}

/**
 * Save results to file
 */
function saveResults(jobId, results, query, location) {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const outputDir = path.join(process.cwd(), 'SCRAPI', 'output-staging', 'scraper-results');
  
  // Ensure directory exists
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }
  
  const filename = `google-ads-${jobId}-${timestamp}.json`;
  const filepath = path.join(outputDir, filename);
  
  const output = {
    jobId,
    query,
    location,
    timestamp: new Date().toISOString(),
    results
  };
  
  fs.writeFileSync(filepath, JSON.stringify(output, null, 2));
  console.log(`💾 Results saved to: ${filepath}`);
  
  return filepath;
}

/**
 * Extract ad information from results
 */
function extractAdInfo(results) {
  const ads = [];
  
  if (results.results && results.results[0] && results.results[0].content) {
    const content = results.results[0].content;
    
    if (content.ads) {
      content.ads.forEach((ad, index) => {
        ads.push({
          position: index + 1,
          title: ad.title || 'No title',
          url: ad.url || 'No URL',
          description: ad.description || 'No description',
          display_url: ad.display_url || 'No display URL'
        });
      });
    }
  }
  
  return ads;
}

/**
 * Run single Google Ads search
 */
async function runSingleSearch(query, location) {
  try {
    console.log('🚀 Starting Real Google Ads Search');
    console.log('==================================');
    console.log(`🔍 Query: "${query}"`);
    console.log(`📍 Location: "${location}"`);
    console.log('');

    // Validate credentials
    if (!OXYLABS_USERNAME || !OXYLABS_PASSWORD) {
      throw new Error('Missing Oxylabs credentials. Please check OXYLABS_USERNAME and OXYLABS_PASSWORD environment variables.');
    }

    console.log(`✅ Oxylabs Username: ${OXYLABS_USERNAME}`);
    console.log(`✅ Oxylabs Password: ${OXYLABS_PASSWORD ? '✓ Set' : '❌ Missing'}`);
    console.log('');

    // Prepare payload
    const payload = {
      source: 'google_ads',
      query: query,
      geo_location: location,
      device: 'desktop',
      parse: true,
      start_page: 1,
      pages: 1,
      locale: 'en-US',
      user_agent_type: 'desktop',
      context: [
        { key: 'ad_extraction', value: 'true' }
      ]
    };

    console.log('📤 Submitting job to Oxylabs...');
    console.log('Payload:', JSON.stringify(payload, null, 2));
    console.log('');

    // Submit job
    const startTime = Date.now();
    const jobResponse = await makeOxylabsRequest('https://data.oxylabs.io/v1/queries', payload);
    
    console.log(`✅ Job submitted successfully!`);
    console.log(`📋 Job ID: ${jobResponse.id}`);
    console.log(`🔗 Status URL: ${jobResponse.callback_url || 'Not provided'}`);
    console.log('');

    // Poll for results
    const results = await pollJobResults(jobResponse.id);
    const endTime = Date.now();
    const processingTime = endTime - startTime;

    console.log('📊 RESULTS SUMMARY:');
    console.log('==================');
    console.log(`⏱️  Total processing time: ${(processingTime / 1000).toFixed(2)} seconds`);
    
    // Extract ad information
    const ads = extractAdInfo(results);
    console.log(`📢 Ads found: ${ads.length}`);
    
    if (ads.length > 0) {
      console.log('\n🎯 AD DETAILS:');
      ads.forEach((ad, index) => {
        console.log(`\n${index + 1}. ${ad.title}`);
        console.log(`   URL: ${ad.url}`);
        console.log(`   Display: ${ad.display_url}`);
        console.log(`   Description: ${ad.description.substring(0, 100)}${ad.description.length > 100 ? '...' : ''}`);
      });
    }

    // Save results
    const filepath = saveResults(jobResponse.id, results, query, location);

    console.log('\n✅ SINGLE SEARCH COMPLETED SUCCESSFULLY!');
    console.log(`📁 Results file: ${filepath}`);
    console.log(`📊 Processing time: ${(processingTime / 1000).toFixed(2)}s`);
    console.log(`📢 Total ads: ${ads.length}`);

    return {
      success: true,
      jobId: jobResponse.id,
      query,
      location,
      adsFound: ads.length,
      processingTime,
      filepath,
      ads
    };

  } catch (error) {
    console.error('\n❌ SINGLE SEARCH FAILED:');
    console.error(`Error: ${error.message}`);
    
    return {
      success: false,
      error: error.message,
      query,
      location
    };
  }
}

/**
 * Main function
 */
async function main() {
  const args = process.argv.slice(2);
  const query = args[0] || 'plumber near me';
  const location = args[1] || 'Sacramento, CA, United States';

  const result = await runSingleSearch(query, location);
  
  if (!result.success) {
    process.exit(1);
  }
}

// Run if executed directly
if (require.main === module) {
  main().catch(error => {
    console.error(`❌ Fatal Error: ${error.message}`);
    process.exit(1);
  });
}

module.exports = { runSingleSearch };
