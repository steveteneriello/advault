// Simplified Oxylabs connectivity test
const http = require('http'); // Built-in Node.js module
const https = require('https'); // Built-in Node.js module

/**
 * Simple HTTP request through proxy
 */
function requestThroughProxy(options) {
  return new Promise((resolve, reject) => {
    // Create the request
    const req = https.request(options, (res) => {
      let data = '';
      
      // Collect data chunks
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      // Handle end of response
      res.on('end', () => {
        resolve({
          statusCode: res.statusCode,
          headers: res.headers,
          data: data
        });
      });
    });
    
    // Handle errors
    req.on('error', (error) => {
      reject(error);
    });
    
    // End the request
    req.end();
  });
}

/**
 * Test Oxylabs connection using built-in http module
 */
async function testBasicConnection() {
  try {
    console.log('Testing Oxylabs Web Unblocker basic connectivity...');
    
    // Oxylabs credentials
    const username = 'admachines_UHRr7';
    const password = 'TeddyRudy4123=';
    
    // Auth credentials base64 encoded
    const auth = Buffer.from(`${username}:${password}`).toString('base64');
    
    // Request options for a simple check
    const options = {
      host: 'unblock.oxylabs.io',
      port: 60000,
      path: 'https://ip.oxylabs.io/location',
      headers: {
        'Proxy-Authorization': `Basic ${auth}`,
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/91.0.4472.124'
      },
      method: 'GET',
      rejectUnauthorized: false // Disable SSL verification
    };
    
    // Make the request
    console.log('Sending request...');
    const response = await requestThroughProxy(options);
    
    console.log(`Status Code: ${response.statusCode}`);
    if (response.statusCode === 200) {
      console.log('Connection successful!');
      console.log('Response data:', response.data);
    } else {
      console.error('Connection failed');
      console.error('Response headers:', response.headers);
      console.error('Response data:', response.data);
    }
    
    return response;
  } catch (error) {
    console.error('Error testing connection:', error.message);
    return { error: error.message };
  }
}

// Run the test
testBasicConnection();