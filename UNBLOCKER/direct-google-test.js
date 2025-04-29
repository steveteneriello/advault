// Direct Google test using Oxylabs
const http = require('http');
const https = require('https');

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
 * Test Google search through Oxylabs
 */
async function testGoogleSearch() {
  try {
    console.log('Testing Google search through Oxylabs Web Unblocker...');
    
    // Oxylabs credentials
    const username = 'admachines_UHRr7';
    const password = 'TeddyRudy4123=';
    
    // Auth credentials base64 encoded
    const auth = Buffer.from(`${username}:${password}`).toString('base64');
    
    // Basic search for "shoes"
    const keyword = 'shoes';
    const searchUrl = `https://www.google.com/search?q=${encodeURIComponent(keyword)}`;
    
    // Request options
    const options = {
      host: 'unblock.oxylabs.io',
      port: 60000,
      path: searchUrl,
      headers: {
        'Proxy-Authorization': `Basic ${auth}`,
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/91.0.4472.124',
        // Try with minimal headers first
        'Accept-Language': 'en-US,en;q=0.9'
      },
      method: 'GET',
      rejectUnauthorized: false // Disable SSL verification
    };
    
    // Make the request
    console.log('Sending request to Google...');
    const response = await requestThroughProxy(options);
    
    console.log(`Status Code: ${response.statusCode}`);
    if (response.statusCode === 200) {
      console.log('Google search successful!');
      // Output the first 500 characters to check if we got search results
      console.log('First 500 characters of response:');
      console.log(response.data.substring(0, 500));
      
      // Check for common Google search elements in the HTML
      const hasSearchResults = response.data.includes('<div id="search">') || 
                              response.data.includes('<div class="g">');
      console.log('Has search results:', hasSearchResults);
    } else {
      console.error('Google search failed');
      console.error('Response headers:', response.headers);
      console.error('Response data:', response.data);
    }
    
    return response;
  } catch (error) {
    console.error('Error testing Google search:', error.message);
    return { error: error.message };
  }
}

// Run the test
testGoogleSearch();