/**
 * Bright Data proxy JSON format test script
 * 
 * This script tests the Bright Data proxy's JSON output capability
 * by making a direct request to Google with the brd_json parameter.
 * 
 * Usage: node test-json.js [location] [query]
 * Example: node test-json.js "country-us-state-ma-city-boston" "masters degrees"
 */

const request = require('request-promise');
const fs = require('fs');
require('dotenv').config();

// Get command line arguments
const targetLocation = process.argv[2] || 'country-us-state-ma-city-boston';
const searchQuery = process.argv[3] || 'car insurance';

// Load credentials from environment variables
const BRIGHT_DATA_USER = process.env.BRIGHT_DATA_USER || 'hl_45067457';
const BRIGHT_DATA_ZONE = process.env.BRIGHT_DATA_ZONE || 'residential';
const BRIGHT_DATA_PASSWORD = process.env.BRIGHT_DATA_PASSWORD || 'ob9i9f9ad65g';
const BRIGHT_DATA_HOST = process.env.BRIGHT_DATA_HOST || 'brd.superproxy.io';
const BRIGHT_DATA_PORT = process.env.BRIGHT_DATA_PORT || '33335';

// Load certificate
let ca;
try {
  ca = fs.readFileSync('./brightdata.crt');
  console.log('Successfully loaded Bright Data certificate');
} catch (error) {
  console.warn('Warning: Could not load certificate file:', error.message);
  ca = null;
}

// Build proxy username with brd_json parameter in the username
let proxyUsername = `brd-customer-${BRIGHT_DATA_USER}-zone-${BRIGHT_DATA_ZONE}-brd_json-1`;

// Add location targeting
if (targetLocation) {
  proxyUsername += `-${targetLocation}`;
  console.log(`Using location targeting: ${targetLocation}`);
}

console.log(`Modified username: ${proxyUsername}`);
const proxyUrl = `http://${proxyUsername}:${BRIGHT_DATA_PASSWORD}@${BRIGHT_DATA_HOST}:${BRIGHT_DATA_PORT}`;

async function testGoogleSearch() {
  console.log('\n==== Testing Google Search with JSON output ====');
  console.log(`Searching for: "${searchQuery}"`);
  
  const options = {
    url: 'https://www.google.com/search',
    qs: {
      q: searchQuery,
      gl: 'us',
      hl: 'en',
      num: 10
    },
    proxy: proxyUrl,
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/98.0.4758.87 Safari/537.36',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
      'Accept-Language': 'en-US,en;q=0.5'
    },
    timeout: 60000,
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
      
      // Check if response is JSON
      const bodyStart = response.body.trim().substring(0, 20);
      console.log(`Response starts with: ${bodyStart}`);
      
      if (bodyStart.startsWith('{') || bodyStart.startsWith('[')) {
        console.log('Response appears to be JSON');
        try {
          const jsonData = JSON.parse(response.body);
          console.log('\nJSON data structure:');
          console.log('=======================');
          console.log(`Top-level keys: ${Object.keys(jsonData).join(', ')}`);
          
          // Look for location information
          if (jsonData.location) {
            console.log('\nLocation detected:');
            console.log(`${JSON.stringify(jsonData.location, null, 2)}`);
          } else if (jsonData.general && jsonData.general.location) {
            console.log('\nLocation detected:');
            console.log(`${jsonData.general.location}`);
          }
          
          // Look for ads
          if (jsonData.ads) {
            console.log('\nFound ads in response:');
            console.log(`Top ads: ${jsonData.ads.top?.length || 0}`);
            console.log(`Bottom ads: ${jsonData.ads.bottom?.length || 0}`);
            
            if (jsonData.ads.top && jsonData.ads.top.length > 0) {
              console.log('\nSample top ad:');
              console.log(JSON.stringify(jsonData.ads.top[0], null, 2));
            }
          } else {
            console.log('\nNo ads found in response');
          }
          
          // Save the JSON to a file for inspection
          const outputFile = `google_json_${Date.now()}.json`;
          fs.writeFileSync(outputFile, JSON.stringify(jsonData, null, 2));
          console.log(`\nFull JSON response saved to ${outputFile}`);
        } catch (error) {
          console.error('Failed to parse JSON:', error.message);
          console.log('First 500 characters of response:');
          console.log(response.body.substring(0, 500));
        }
      } else {
        console.log('Response is HTML, not JSON');
        console.log('First 200 characters:');
        console.log(response.body.substring(0, 200));
        
        // Save the HTML to a file
        const outputFile = `google_html_${Date.now()}.html`;
        fs.writeFileSync(outputFile, response.body);
        console.log(`\nHTML response saved to ${outputFile}`);
      }
    } else {
      console.error(`✗ Request failed with status: ${response.statusCode}`);
      console.error(response.body);
    }
  } catch (error) {
    console.error('✗ Request failed with error:');
    console.error(error.message);
  }
}

async function runTests() {
  console.log('Starting Google search test...');
  console.log(`Using proxy: ${proxyUrl.replace(BRIGHT_DATA_PASSWORD, '****')}`);
  
  await testGoogleSearch();
  
  console.log('\nTest completed.');
}

runTests();