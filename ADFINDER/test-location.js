/**
 * Enhanced test script for Bright Data proxy with location targeting
 * 
 * Usage: node test-location.js [location]
 * Example: node test-location.js "us-ca-sacramento"
 */

const request = require('request-promise');
const fs = require('fs');
require('dotenv').config();

// Get location from command line arguments
const targetLocation = process.argv[2] || '';

// Load the environment variables - make sure these match your .env file
const BRIGHT_DATA_USERNAME = process.env.BRIGHT_DATA_USERNAME || 'brd-customer-hl_45067457-zone-residential';
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

// Build the base connection string
let proxyUsername = BRIGHT_DATA_USERNAME;

// Add location targeting according to Bright Data format
if (targetLocation) {
  if (targetLocation.includes("-")) {
    // Already in the right format like "us-ca-sacramento"
    proxyUsername += `-${targetLocation}`;
  } else {
    // Convert from human readable format
    const parts = targetLocation.split(',').map(p => p.trim().toLowerCase());
    
    if (parts.length === 3) {
      // city, state, country = "sacramento,ca,us"
      const [city, state, country] = parts;
      if (country === 'us') {
        proxyUsername += `-country-us-state-${state}-city-${city.replace(/\s+/g, '_')}`;
      } else {
        proxyUsername += `-country-${country}-city-${city.replace(/\s+/g, '_')}`;
      }
    } else if (parts.length === 2) {
      // city, state = "sacramento,ca"
      const [city, state] = parts;
      proxyUsername += `-country-us-state-${state}-city-${city.replace(/\s+/g, '_')}`;
    } else {
      // Just add as location
      proxyUsername += `-location-${encodeURIComponent(targetLocation)}`;
    }
  }
  console.log(`Using location targeting: ${targetLocation}`);
  console.log(`Modified username: ${proxyUsername}`);
}

const proxyUrl = `http://${proxyUsername}:${BRIGHT_DATA_PASSWORD}@${BRIGHT_DATA_HOST}:${BRIGHT_DATA_PORT}`;

async function testGeoLocation() {
  console.log('\n==== Testing geo location via Bright Data ====');
  const options = {
    url: 'https://geo.brdtest.com/mygeo.json',
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
      
      try {
        // Parse the JSON response
        const geoData = JSON.parse(response.body);
        console.log('\nProxy location details:');
        console.log('=======================');
        console.log(`Country: ${geoData.country || 'Unknown'}`);
        console.log(`City: ${geoData.city || 'Unknown'}`);
        console.log(`Region: ${geoData.region || 'Unknown'}`);
        console.log(`Postal Code: ${geoData.postal_code || 'Unknown'}`);
        console.log(`ISP: ${geoData.asn_org || 'Unknown'}`);
        console.log(`IP: ${geoData.ip || 'Unknown'}`);
        console.log(`Timezone: ${geoData.timezone || 'Unknown'}`);
        console.log(`Coordinates: ${geoData.latitude || '?'}, ${geoData.longitude || '?'}`);
      } catch (parseError) {
        console.log('Could not parse JSON response. Raw response:');
        console.log(response.body);
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

// Run the tests
async function runTests() {
  console.log('Starting geo-location test...');
  console.log(`Using proxy: ${proxyUrl.replace(BRIGHT_DATA_PASSWORD, '****')}`);
  
  await testGeoLocation();
  
  console.log('\nTest completed.');
}

runTests();