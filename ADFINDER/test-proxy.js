/**
 * Test script for verifying Bright Data proxy connectivity
 * 
 * This script makes a simple request to Bright Data's test endpoint
 * to verify that your proxy connection and certificate are working.
 */

const request = require('request-promise');
const fs = require('fs');
require('dotenv').config();

// Load the environment variables
const BRIGHT_DATA_USER = process.env.BRIGHT_DATA_USER || 'hl_45067457';
const BRIGHT_DATA_ZONE = process.env.BRIGHT_DATA_ZONE || 'residential';
const BRIGHT_DATA_PASSWORD = process.env.BRIGHT_DATA_PASSWORD || 'ob9i9f9ad65g';
const BRIGHT_DATA_HOST = process.env.BRIGHT_DATA_HOST || 'brd.superproxy.io';
const BRIGHT_DATA_PORT = process.env.BRIGHT_DATA_PORT || '33335';

// Load certificate
let ca;
try {
  // Update this path to where your .crt file is located
  ca = fs.readFileSync('./brightdata.crt');
  console.log('Successfully loaded Bright Data certificate');
} catch (error) {
  console.warn('Warning: Could not load certificate file:', error.message);
  console.warn('Will try to proceed without certificate validation (less secure)');
  ca = null;
}

// Build the connection string
const proxyUrl = `http://brd-customer-${BRIGHT_DATA_USER}-zone-${BRIGHT_DATA_ZONE}:${BRIGHT_DATA_PASSWORD}@${BRIGHT_DATA_HOST}:${BRIGHT_DATA_PORT}`;

// First test - Bright Data's official test URL
async function testBrightDataOfficial() {
  console.log('\n==== Testing connection to Bright Data official test endpoint ====');
  const options = {
    url: 'https://geo.brdtest.com/welcome.txt',
    proxy: proxyUrl,
    timeout: 30000,
    simple: false,
    resolveWithFullResponse: true
  };
  
  // Add certificate if available
  if (ca) {
    options.ca = ca;
  } else {
    options.rejectUnauthorized = false;
  }
  
  try {
    const response = await request(options);
    console.log(`Status code: ${response.statusCode}`);
    
    if (response.statusCode === 200) {
      console.log('✓ Connection successful!');
      console.log('Response:');
      console.log(response.body);
    } else {
      console.error(`✗ Request failed with status: ${response.statusCode}`);
      console.error(response.body);
    }
  } catch (error) {
    console.error('✗ Request failed with error:');
    console.error(error.message);
  }
}

// Second test - Google search with JSON
async function testGoogleSearch() {
  console.log('\n==== Testing connection to Google with JSON response ====');
  const options = {
    url: 'https://www.google.com/search',
    qs: {
      q: 'test query',
      brd_json: 1
    },
    proxy: proxyUrl,
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
    },
    timeout: 30000,
    simple: false,
    resolveWithFullResponse: true
  };
  
  // Add certificate if available
  if (ca) {
    options.ca = ca;
  } else {
    options.rejectUnauthorized = false;
  }
  
  try {
    const response = await request(options);
    console.log(`Status code: ${response.statusCode}`);
    
    if (response.statusCode === 200) {
      console.log('✓ Connection successful!');
      
      // Try to parse as JSON
      try {
        const jsonData = JSON.parse(response.body);
        console.log('Response parsed as JSON successfully.');
        console.log('SERP type:', jsonData.search_type || 'unknown');
        console.log('Query:', jsonData.general?.query || 'unknown');
        console.log('Result count:', jsonData.general?.results_cnt || 'unknown');
        console.log('Ads present:', !!jsonData.ads);
        if (jsonData.ads) {
          console.log('Top ads:', jsonData.ads.top?.length || 0);
          console.log('Bottom ads:', jsonData.ads.bottom?.length || 0);
        }
      } catch (parseError) {
        console.log('Response is not JSON. First 200 characters:');
        console.log(response.body.substring(0, 200));
      }
    } else {
      console.error(`✗ Request failed with status: ${response.statusCode}`);
      console.error(response.body.substring(0, 200));
    }
  } catch (error) {
    console.error('✗ Request failed with error:');
    console.error(error.message);
  }
}

// Run the tests
async function runTests() {
  console.log('Starting proxy connection tests...');
  console.log(`Using proxy: ${proxyUrl.replace(BRIGHT_DATA_PASSWORD, '****')}`);
  
  await testBrightDataOfficial();
  await testGoogleSearch();
  
  console.log('\nTests completed.');
}

runTests();