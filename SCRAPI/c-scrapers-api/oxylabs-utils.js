// OxylabsUtils.js - Common Oxylabs utility functions
const axios = require('axios');
const fs = require('fs');
const path = require('path');
const https = require('https');
const { RESULTS_DIR, normalizeUrl, isValidUrl } = require('../utils/file-utils');
require('dotenv').config();

// Oxylabs credentials
const OXYLABS_USERNAME = process.env.OXYLABS_USERNAME;
const OXYLABS_PASSWORD = process.env.OXYLABS_PASSWORD;

if (!OXYLABS_USERNAME || !OXYLABS_PASSWORD) {
  console.error('❌ Oxylabs credentials not found in environment variables');
  process.exit(1);
}

// Function to wait for job completion and get results
async function getJobResults(jobId, maxAttempts = 90, delayMs = 2000) {
  console.log(`\n⏳ Waiting for job ${jobId} to complete...`);

  let attempts = 0;
  const axiosTimeout = 180000; // 3 minute timeout for axios requests

  while (attempts < maxAttempts) {
    attempts++;
    
    try {
      // Create a new https agent for each request to avoid socket hang-up
      const agent = new https.Agent({ keepAlive: false });
      
      const response = await axios.get(`https://data.oxylabs.io/v1/queries/${jobId}`, {
        auth: {
          username: OXYLABS_USERNAME,
          password: OXYLABS_PASSWORD
        },
        timeout: axiosTimeout, // Added timeout configuration
        httpsAgent: agent // Use custom agent to avoid socket hang-up
      });

      const status = response.data.status;
      console.log(`Current status: ${status} (attempt ${attempts}/${maxAttempts})`);

      if (status === 'completed' || status === 'done') {
        try {
          // Create a new https agent for each request
          const resultsAgent = new https.Agent({ keepAlive: false });
          
          const resultsResponse = await axios.get(
            `https://data.oxylabs.io/v1/queries/${jobId}/results?type=parsed`,
            {
              auth: {
                username: OXYLABS_USERNAME,
                password: OXYLABS_PASSWORD
              },
              timeout: axiosTimeout, // Added timeout configuration
              httpsAgent: resultsAgent // Use custom agent to avoid socket hang-up
            }
          );

          console.log('✅ Job completed, parsed results fetched.');
          return resultsResponse.data;
        } catch (parseError) {
          console.warn('⚠️ Parsed results not available. Trying raw results...');

          // Create a new https agent for raw results request
          const rawResultsAgent = new https.Agent({ keepAlive: false });
          
          const rawResultsResponse = await axios.get(
            `https://data.oxylabs.io/v1/queries/${jobId}/results`,
            {
              auth: {
                username: OXYLABS_USERNAME,
                password: OXYLABS_PASSWORD
              },
              timeout: axiosTimeout, // Added timeout configuration
              httpsAgent: rawResultsAgent // Use custom agent to avoid socket hang-up
            }
          );

          return rawResultsResponse.data;
        }
      } else if (status === 'failed') {
        throw new Error(`Job failed: ${JSON.stringify(response.data.statuses)}`);
      }

      // Wait before checking again
      await new Promise(resolve => setTimeout(resolve, delayMs));
    } catch (error) {
      console.error(`Error checking job status (attempt ${attempts}/${maxAttempts}):`, error.message);
      
      // If error is socket hang up, wait a bit longer before retrying
      if (error.message.includes('socket hang up')) {
        console.log('Socket hang up detected, waiting 3 seconds before retry...');
        await new Promise(resolve => setTimeout(resolve, 3000));
      }
      
      // If we've reached max attempts, throw the error
      if (attempts >= maxAttempts) {
        throw error;
      }
      
      // Otherwise wait and try again
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }

  throw new Error(`Job timed out after ${maxAttempts} attempts`);
}

// Function to render a URL as HTML or PNG
async function renderUrl(url, renderType = 'html') {
  console.log(`\n🔄 Rendering ${url} as ${renderType}...`);
  
  // Normalize + validate URL first
  url = normalizeUrl(url);
  if (!isValidUrl(url)) {
    console.error('❌ Invalid URL. Skipping:', url);
    return {
      success: false,
      error: 'Invalid URL'
    };
  }
  
  // Check for unsupported domains
  const unsupportedDomains = ['example.com', 'localhost', '127.0.0.1'];
  const hostname = new URL(url).hostname;
  if (unsupportedDomains.includes(hostname)) {
    console.error(`❌ Skipping unsupported URL: ${hostname}`);
    return {
      success: false,
      error: 'Unsupported domain'
    };
  }
  
  console.log(`Using validated URL: ${url}`);

  try {
    // Create a single query object (not an array)
    const payload = {
      source: 'universal',
      url: url,
      render: renderType
    };

    console.log('Making request to Oxylabs API...');
    
    // Create a new https agent for this request
    const agent = new https.Agent({ keepAlive: false });
    
    const response = await axios.post('https://realtime.oxylabs.io/v1/queries', payload, {
      auth: {
        username: OXYLABS_USERNAME,
        password: OXYLABS_PASSWORD
      },
      headers: {
        'Content-Type': 'application/json'
      },
      timeout: 300000, // 5 minutes
      httpsAgent: agent // Use custom agent to avoid socket hang-up
    });

    console.log('✅ Response received from Oxylabs API');
    
    if (!response.data || !response.data.results || !response.data.results[0]) {
      console.error('❌ Unexpected response structure:', JSON.stringify(response.data, null, 2));
      return {
        success: false,
        error: 'Unexpected response structure'
      };
    }

    const result = response.data;
    console.log(`✅ ${renderType.toUpperCase()} rendering completed successfully`);

    if (!result.results || !result.results[0] || !result.results[0].content) {
      console.error(`❌ No ${renderType} content found in response`);
      return {
        success: false,
        error: `No ${renderType} content found in response`
      };
    }
    
    // Ensure the results directory exists
    if (!fs.existsSync(RESULTS_DIR)) {
      fs.mkdirSync(RESULTS_DIR, { recursive: true });
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    
    if (renderType === 'html') {
      const outputPath = path.join(RESULTS_DIR, `rendered-${hostname}-${timestamp}.html`);
      fs.writeFileSync(outputPath, result.results[0].content);
      console.log(`📄 Rendered HTML saved to ${outputPath}`);
      
      return {
        success: true,
        outputPath,
        content: result.results[0].content
      };
    } else if (renderType === 'png') {
      try {
        const base64Image = result.results[0].content;
        const outputPath = path.join(RESULTS_DIR, `rendered-${hostname}-${timestamp}.png`);
        
        // Check if the content is actually base64 data
        if (typeof base64Image !== 'string') {
          console.error('❌ Invalid base64 image data received - not a string');
          console.log('Content type:', typeof base64Image);
          
          // Save the raw content for debugging
          const debugPath = path.join(RESULTS_DIR, `debug-content-${timestamp}.txt`);
          fs.writeFileSync(debugPath, JSON.stringify(result.results[0], null, 2));
          console.log(`📄 Debug content saved to ${debugPath}`);
          
          return {
            success: false,
            error: 'Invalid base64 image data - not a string',
            debugPath
          };
        }
        
        // Try to decode and save the image
        try {
          const buffer = Buffer.from(base64Image, 'base64');
          fs.writeFileSync(outputPath, buffer);
          console.log(`🖼️ Screenshot saved to ${outputPath}`);
          
          return {
            success: true,
            outputPath,
            content: base64Image
          };
        } catch (decodeError) {
          console.error('❌ Error decoding base64 image:', decodeError);
          
          // Fallback: save the raw content for debugging
          const fallbackPath = path.join(RESULTS_DIR, `raw-content-${timestamp}.txt`);
          fs.writeFileSync(fallbackPath, base64Image.substring(0, 1000) + '...');
          console.log(`⚠️ Saved raw content preview to ${fallbackPath}`);
          
          return {
            success: false,
            error: `Error decoding base64 image: ${decodeError.message}`,
            rawPath: fallbackPath
          };
        }
      } catch (writeError) {
        console.error('❌ Error writing image file:', writeError);
        return {
          success: false,
          error: `Error writing image file: ${writeError.message}`
        };
      }
    }

    return {
      success: false,
      error: `Unsupported render type: ${renderType}`
    };
  } catch (error) {
    console.error(`Error during rendering:`, error.message);
    
    // More detailed error logging
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response data:', error.response.data);
    } else if (error.request) {
      console.error('No response received. Request details:', error.request);
    } else {
      console.error('Error setting up request:', error.message);
    }
    
    return {
      success: false,
      error: error.message
    };
  }
}

// Alternative rendering method with simpler payload
async function renderUrlAlternative(url, renderType = 'png') {
  console.log(`\n🧪 Testing alternative render method for ${url} as ${renderType}...`);
  
  // Normalize + validate URL first
  url = normalizeUrl(url);
  if (!isValidUrl(url)) {
    console.error('❌ Invalid URL. Skipping:', url);
    return {
      success: false,
      error: 'Invalid URL'
    };
  }
  
  console.log(`Using validated URL: ${url}`);
  
  // Create a simpler payload without browser_instructions
  const payload = {
    source: 'universal',
    url: url,
    render: renderType
  };

  console.log('Alternative payload:', JSON.stringify(payload, null, 2));

  try {
    // Create a new https agent for this request
    const agent = new https.Agent({ keepAlive: false });
    
    const response = await axios.post('https://realtime.oxylabs.io/v1/queries', payload, {
      auth: {
        username: OXYLABS_USERNAME,
        password: OXYLABS_PASSWORD
      },
      headers: {
        'Content-Type': 'application/json'
      },
      timeout: 300000, // 5 minutes
      httpsAgent: agent // Use custom agent to avoid socket hang-up
    });

    console.log('✅ Response received from alternative method');
    
    if (!response.data || !response.data.results || !response.data.results[0] || !response.data.results[0].content) {
      console.error('❌ No content in response');
      console.error('Response data structure:', JSON.stringify(Object.keys(response.data), null, 2));
      return {
        success: false,
        error: 'No content in response'
      };
    }
    
    const result = response.data.results[0];
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const hostname = new URL(url).hostname;
    
    // Ensure the results directory exists
    if (!fs.existsSync(RESULTS_DIR)) {
      fs.mkdirSync(RESULTS_DIR, { recursive: true });
    }
    
    if (renderType === 'png') {
      try {
        const outputPath = path.join(RESULTS_DIR, `alt-rendered-${hostname}-${timestamp}.png`);
        console.log('Creating buffer from base64 string...');
        const buffer = Buffer.from(result.content, 'base64');
        console.log('Buffer created, length:', buffer.length);
        
        console.log('Writing buffer to file:', outputPath);
        fs.writeFileSync(outputPath, buffer);
        console.log(`🖼️ Alternative screenshot saved to ${outputPath}`);
        
        // Verify the file was created
        if (fs.existsSync(outputPath)) {
          const stats = fs.statSync(outputPath);
          console.log(`File created successfully, size: ${stats.size} bytes`);
        } else {
          console.error('❌ File was not created');
        }
        
        return {
          success: true,
          outputPath,
          content: result.content
        };
      } catch (writeError) {
        console.error('Error writing image file:', writeError);
        return {
          success: false,
          error: `Error writing image file: ${writeError.message}`
        };
      }
    } else {
      // HTML rendering
      const outputPath = path.join(RESULTS_DIR, `alt-rendered-${hostname}-${timestamp}.html`);
      fs.writeFileSync(outputPath, result.content);
      console.log(`📄 Alternative HTML saved to ${outputPath}`);
      
      return {
        success: true,
        outputPath,
        content: result.content
      };
    }
  } catch (error) {
    console.error('❌ Alternative render failed:', error.message);
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response data:', error.response.data);
    }
    return {
      success: false,
      error: error.message
    };
  }
}

module.exports = {
  OXYLABS_USERNAME,
  OXYLABS_PASSWORD,
  getJobResults,
  renderUrl,
  renderUrlAlternative
};