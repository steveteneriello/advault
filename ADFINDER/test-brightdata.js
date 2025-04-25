/**
 * Bright Data proxy debugging script
 * 
 * This script tests different configurations to find what works with your Bright Data account
 * 
 * Usage: node test-brightdata.js [method]
 * Methods:
 *   1 - Test brd_json in URL params
 *   2 - Test brd_json in username
 *   3 - Test known working format
 *   4 - Test all combinations
 */

const request = require('request-promise');
const fs = require('fs');
require('dotenv').config();

// Get test method from command line
const testMethod = process.argv[2] || '4';  // Default to all tests

// Set up test parameters
const QUERY = 'car insurance';
const LOCATION = 'country-us-state-ma-city-boston';

// Bright Data credentials
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

/**
 * Make a request with the specified configuration
 */
async function makeRequest(config) {
  console.log('\n=============================================');
  console.log(`TEST CONFIGURATION: ${config.name}`);
  console.log('=============================================');
  console.log(`Proxy username: ${config.username}`);
  console.log(`URL parameters: ${JSON.stringify(config.parameters)}`);
  
  const proxyUrl = `http://${config.username}:${BRIGHT_DATA_PASSWORD}@${BRIGHT_DATA_HOST}:${BRIGHT_DATA_PORT}`;
  
  const options = {
    url: 'https://www.google.com/search',
    qs: config.parameters,
    proxy: proxyUrl,
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/98.0.4758.87 Safari/537.36',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
      'Accept-Language': 'en-US,en;q=0.5'
    },
    timeout: 60000,
    simple: false,
    resolveWithFullResponse: true,
    encoding: 'utf8'
  };
  
  // Add certificate if available
  if (ca) {
    options.ca = ca;
  } else {
    options.rejectUnauthorized = false;
  }
  
  try {
    console.log('Making request...');
    const response = await request(options);
    console.log(`Status: ${response.statusCode}`);
    
    if (response.statusCode === 200) {
      const bodyStart = response.body.trim().substring(0, 20);
      console.log(`Response starts with: ${bodyStart}`);
      
      // Check if it's JSON
      let isJson = false;
      if (bodyStart.startsWith('{') || bodyStart.startsWith('[')) {
        try {
          const jsonData = JSON.parse(response.body);
          isJson = true;
          console.log('✅ SUCCESSFUL JSON RESPONSE');
          console.log(`Top-level keys: ${Object.keys(jsonData).join(', ')}`);
          
          // Save to file for analysis
          const filename = `success_${config.name.replace(/\s+/g, '_').toLowerCase()}_${Date.now()}.json`;
          fs.writeFileSync(filename, JSON.stringify(jsonData, null, 2));
          console.log(`Full JSON saved to ${filename}`);
          
          // Return success indicator
          return {
            success: true,
            isJson: true,
            config: config.name,
            statusCode: response.statusCode,
            filename
          };
        } catch (e) {
          console.log(`❌ Looks like JSON but failed to parse: ${e.message}`);
          isJson = false;
        }
      }
      
      if (!isJson) {
        console.log('❌ Response is HTML, not JSON');
        
        // Save HTML for debugging
        const filename = `html_${config.name.replace(/\s+/g, '_').toLowerCase()}_${Date.now()}.html`;
        fs.writeFileSync(filename, response.body);
        console.log(`HTML saved to ${filename}`);
        
        return {
          success: true,
          isJson: false,
          config: config.name,
          statusCode: response.statusCode,
          filename
        };
      }
    } else {
      console.log(`❌ Request failed with status: ${response.statusCode}`);
      console.log(response.body);
      
      return {
        success: false,
        isJson: false,
        config: config.name,
        statusCode: response.statusCode,
        error: response.body
      };
    }
  } catch (error) {
    console.log(`❌ Request failed with error: ${error.message}`);
    
    return {
      success: false,
      isJson: false,
      config: config.name,
      error: error.message
    };
  }
}

/**
 * Run all the tests and summarize results
 */
async function runTests() {
  // Test configurations
  const tests = [
    {
      name: 'Method 1: brd_json as URL parameter',
      username: `brd-customer-${BRIGHT_DATA_USER}-zone-${BRIGHT_DATA_ZONE}-${LOCATION}`,
      parameters: {
        q: QUERY,
        brd_json: 1,
        hl: 'en',
        gl: 'us'
      }
    },
    {
      name: 'Method 2: brd_json in username',
      username: `brd-customer-${BRIGHT_DATA_USER}-zone-${BRIGHT_DATA_ZONE}-brd_json-1-${LOCATION}`,
      parameters: {
        q: QUERY,
        hl: 'en',
        gl: 'us'
      }
    },
    {
      name: 'Method 3: Known working username format',
      username: `brd-customer-${BRIGHT_DATA_USER}-zone-${BRIGHT_DATA_ZONE}-${LOCATION}`,
      parameters: {
        q: QUERY,
        hl: 'en',
        gl: 'us'
      }
    },
    {
      name: 'Method 4: Plain request (no JSON)',
      username: `brd-customer-${BRIGHT_DATA_USER}-zone-${BRIGHT_DATA_ZONE}-${LOCATION}`,
      parameters: {
        q: QUERY,
        hl: 'en',
        gl: 'us'
      }
    },
    {
      name: 'Method 5: Different JSON parameter',
      username: `brd-customer-${BRIGHT_DATA_USER}-zone-${BRIGHT_DATA_ZONE}-${LOCATION}`,
      parameters: {
        q: QUERY,
        hl: 'en',
        gl: 'us',
        json: 1
      }
    }
  ];
  
  console.log('Starting Bright Data proxy tests...');
  
  const results = [];
  
  if (testMethod === '1') {
    // Just test Method 1
    results.push(await makeRequest(tests[0]));
  } else if (testMethod === '2') {
    // Just test Method 2
    results.push(await makeRequest(tests[1]));
  } else if (testMethod === '3') {
    // Just test Method 3
    results.push(await makeRequest(tests[2]));
  } else {
    // Run all tests
    for (const test of tests) {
      results.push(await makeRequest(test));
    }
  }
  
  // Summary
  console.log('\n=============================================');
  console.log('TEST RESULTS SUMMARY');
  console.log('=============================================');
  
  let successfulJsonMethod = null;
  
  results.forEach((result, index) => {
    const status = result.success ? (result.isJson ? '✅ JSON' : '⚠️ HTML') : '❌ FAILED';
    console.log(`${status} - ${result.config} - Status code: ${result.statusCode || 'Error'}`);
    
    if (result.success && result.isJson) {
      successfulJsonMethod = result.config;
    }
  });
  
  console.log('\n=============================================');
  if (successfulJsonMethod) {
    console.log(`✅ SUCCESS: Found working JSON method: ${successfulJsonMethod}`);
  } else {
    console.log('❌ No successful JSON method found');
  }
  console.log('=============================================');
}

// Run the tests
runTests();