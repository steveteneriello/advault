// Basic connection helper for Oxylabs Scheduler
const axios = require('axios');

/**
 * Make an enhanced HTTP request with retries and timeout
 * @param {Object} options - Request options
 * @param {string} options.url - Request URL
 * @param {string} options.method - HTTP method (GET, POST, etc.)
 * @param {Object} options.data - Request data (for POST, PUT, etc.)
 * @param {Object} options.auth - Authentication credentials
 * @param {Object} options.headers - Request headers
 * @param {number} options.maxRetries - Maximum number of retries (default: 3)
 * @param {number} options.timeout - Request timeout in milliseconds (default: 30000)
 * @returns {Promise<Object>} - Response data
 */
async function makeRequest(options) {
  const {
    url,
    method = 'GET',
    data = null,
    auth = null,
    headers = {},
    maxRetries = 3,
    timeout = 30000
  } = options;

  let retries = 0;

  while (retries <= maxRetries) {
    try {
      const response = await axios({
        url,
        method,
        data,
        auth,
        headers,
        timeout
      });

      return response;
    } catch (error) {
      const isTimeoutError = error.code === 'ECONNABORTED';
      const isServerError = error.response && error.response.status >= 500;
      
      if ((isTimeoutError || isServerError) && retries < maxRetries) {
        retries++;
        const delay = Math.pow(2, retries) * 1000; // Exponential backoff
        console.log(`Request failed. Retrying (${retries}/${maxRetries}) in ${delay / 1000}s...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      } else {
        throw error;
      }
    }
  }
}

/**
 * Gets job results with enhanced polling and retries
 * @param {string} jobId - The job ID to get results for
 * @param {Object} options - Options for polling
 * @param {Object} options.username - Oxylabs username
 * @param {Object} options.password - Oxylabs password
 * @param {number} options.maxAttempts - Maximum polling attempts (default: 10)
 * @param {number} options.baseDelay - Base delay between attempts in ms (default: 1000)
 * @param {number} options.timeout - Request timeout in ms (default: 30000)
 * @returns {Promise<Object>} - Job results
 */
async function getJobResultsEnhanced(jobId, options = {}) {
  const {
    username,
    password,
    maxAttempts = 10,
    baseDelay = 1000,
    timeout = 30000
  } = options;

  let attempts = 0;

  while (attempts < maxAttempts) {
    try {
      const response = await makeRequest({
        url: `https://data.oxylabs.io/v1/queries/${jobId}/results`,
        method: 'GET',
        auth: {
          username,
          password
        },
        timeout
      });

      // Check if the job is still pending
      if (response.data && response.data.status === 'pending') {
        attempts++;
        // Calculate delay with exponential backoff
        const delay = baseDelay * Math.pow(1.5, attempts);
        console.log(`Job ${jobId} still pending. Waiting ${delay / 1000}s before next check...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      } else {
        return response.data;
      }
    } catch (error) {
      if (error.response && error.response.status === 404) {
        attempts++;
        const delay = baseDelay * Math.pow(1.5, attempts);
        console.log(`Job ${jobId} not found or not ready. Waiting ${delay / 1000}s before next check...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      } else {
        throw error;
      }
    }
  }

  throw new Error(`Failed to get results for job ${jobId} after ${maxAttempts} attempts`);
}

module.exports = {
  makeRequest,
  getJobResultsEnhanced
};