const axios = require('axios');
const fs = require('fs');
const path = require('path');
const https = require('https');
const { getJobDirectories } = require('../../utils/job-directory-manager');
const { makeOxylabsRequest } = require('../../utils/connection-helper');
const crypto = require('crypto');
const { log } = require('../../utils/logger');
require('dotenv').config();

// Create an HTTPS Agent with proper configurations
const httpsAgent = new https.Agent({
  keepAlive: true,  // Reuse connections for better performance
  maxSockets: 10,    // Allow up to 10 concurrent requests
  timeout: 30000     // Set timeout for each request to 30 seconds
});

// Function to fetch the SERP PNG from Oxylabs with retries and exponential backoff
async function fetchSerpPng(query, location) {
  console.log('🚀 Fetching real-time SERP PNG from Oxylabs...');
  console.log(`Query: "${query}"`);
  console.log(`Location: "${location}"`);

  const payload = {
    source: 'google_search',
    query,
    geo_location: location,
    render: 'png',
    render_type: 'full',
    locale: 'en-US',
    user_agent_type: 'desktop'
  };

  try {
    // Create job-specific directories for this query
    const jobId = crypto
      .createHash('md5')
      .update(`${query}-${location}-${new Date().toISOString().split('T')[0]}`)
      .digest('hex');
    
    // Ensure that directories for jobId are created correctly
    const jobDirs = getJobDirectories(jobId);

    // Ensure that the directory for PNG rendering exists
    const pngDir = path.join(jobDirs.jobDir, 'png');
    if (!fs.existsSync(pngDir)) {
      fs.mkdirSync(pngDir, { recursive: true });
    }

    // Request Oxylabs to render the SERP PNG
    const response = await makeOxylabsRequest(payload);

    // Ensure the PNG file is saved to the correct path
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const pngPath = path.join(pngDir, `serp-${jobId}-${timestamp}.png`);
    const content = response.data?.results?.[0]?.content;

    if (content?.url) {
      // Download and save the PNG if the URL is available
      const pngBuffer = await axios.get(content.url, { responseType: 'arraybuffer' });
      fs.writeFileSync(pngPath, pngBuffer.data);

      console.log(`✅ PNG rendered and saved to: ${pngPath}`);
    }
  } catch (error) {
    console.error('❌ Error fetching SERP PNG:', error.message);
  }
}

// Example of exponential backoff retry logic for fetching job results
async function getJobResultsEnhanced(jobId, options = {}) {
  const maxAttempts = options.maxAttempts || 15;
  let delayMs = options.delayMs || 5000; // Initial delay of 5 seconds
  const endpoint = `https://data.oxylabs.io/v1/queries/${jobId}/results?type=parsed`;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      log(`📡 Attempt ${attempt}: Fetching results for job ${jobId}`);

      const response = await axios.get(endpoint, {
        timeout: 30000, // Increased timeout (30 seconds)
        auth: {
          username: process.env.OXYLABS_USERNAME,
          password: process.env.OXYLABS_PASSWORD
        },
        httpsAgent  // Ensure HTTPS agent is used for all requests
      });

      if (response?.status === 200 && response?.data?.results?.length > 0) {
        log(`✅ Results retrieved for job ${jobId}`);
        return response.data;
      }

      log(`🕒 Job ${jobId} not ready yet. Retrying in ${delayMs / 1000}s...`);
      
      // Exponential backoff: Increase delay for each attempt
      const newDelay = Math.min(delayMs * 2, 60000); // Cap delay to 60 seconds
      await new Promise(res => setTimeout(res, delayMs));
      delayMs = newDelay; // Update delay for the next retry
    } catch (err) {
      if (err.response?.status === 404) {
        log(`🕒 Job ${jobId} not found yet (404). Retrying in ${delayMs / 1000}s...`);
      } else {
        log(`❌ Error while fetching job ${jobId}: ${err.message}`);
      }
      await new Promise(res => setTimeout(res, delayMs));

      // Increase the retry delay (exponential backoff)
      delayMs = Math.min(delayMs * 2, 60000); // Exponential backoff increase
    }
  }

  throw new Error(`Timed out waiting for results from job ${jobId} after ${maxAttempts} polling attempts.`);
}

module.exports = { fetchSerpPng, getJobResultsEnhanced };
