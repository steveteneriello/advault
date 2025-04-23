const axios = require('axios');
const https = require('https');
const fs = require('fs');
const path = require('path');
const { validateOxylabsConfig, getOxylabsConfig } = require('./validateOxylabsConfig');
require('dotenv').config();

// Setup log directory
const LOGS_DIR = path.join(process.cwd(), 'SCRAPI', 'output-staging', 'logs');
if (!fs.existsSync(LOGS_DIR)) {
  fs.mkdirSync(LOGS_DIR, { recursive: true });
}

const CONNECTION_LOG_FILE = path.join(LOGS_DIR, `connection-${new Date().toISOString().replace(/[:.]/g, '-')}.log`);

// Log helper
function log(message, data = null) {
  const timestamp = new Date().toISOString();
  let logMessage = `[${timestamp}] ${message}`;
  if (data) {
    logMessage += `\nData: ${JSON.stringify(data, null, 2)}`;
  }
  console.log(logMessage);
  fs.appendFileSync(CONNECTION_LOG_FILE, logMessage + '\n');
}

// Validate and load Oxylabs config
const validationResult = validateOxylabsConfig();
if (!validationResult.isValid) {
  log('❌ Invalid Oxylabs configuration:');
  validationResult.errors.forEach(error => log(`- ${error}`));
}
const oxylabsConfig = getOxylabsConfig();

// Global HTTPS agent with keepAlive disabled to avoid socket hangups
const defaultHttpsAgent = new https.Agent({ keepAlive: false });

// Generic axios request with retry metadata placeholder
async function makeRequest(config) {
  try {
    return await axios(config);
  } catch (error) {
    log(`All retry attempts failed: ${error.message}`);
    throw error;
  }
}

// POST request to Oxylabs (job submission)
async function makeOxylabsRequest(url, payload, options = {}) {
  const {
    maxRetries = 5,
    timeout = 600000,
    username = oxylabsConfig.username,
    password = oxylabsConfig.password
  } = options;

  if (!username || !password) {
    log('❌ Oxylabs credentials not found in options or environment variables');
    throw new Error('Oxylabs credentials not found');
  }

  log(`Making Oxylabs request to ${url}...`);

  const config = {
    url,
    method: 'POST',
    data: payload,
    timeout,
    auth: { username, password },
    httpsAgent: defaultHttpsAgent
  };

  const response = await makeRequest(config);
  return response.data;
}

// Polling for job results with socket hangup fix
async function getJobResultsEnhanced(jobId, options = {}) {
  const maxAttempts = options.maxAttempts || 15;
  const delayMs = options.delayMs || 4000;
  const endpoint = `https://data.oxylabs.io/v1/queries/${jobId}/results?type=parsed`;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      log(`📡 Attempt ${attempt}: Fetching results for job ${jobId}`);

      const response = await axios.get(endpoint, {
        timeout: 20000,
        auth: {
          username: oxylabsConfig.username,
          password: oxylabsConfig.password
        },
        httpsAgent: defaultHttpsAgent
      });

      if (response?.status === 200 && response?.data?.results?.length > 0) {
        log(`✅ Results retrieved for job ${jobId}`);
        return response.data;
      }

      log(`🕒 Job ${jobId} not ready yet. Retrying in ${delayMs / 1000}s...`);
      await new Promise(res => setTimeout(res, delayMs));
    } catch (err) {
      if (err.response?.status === 404) {
        log(`🕒 Job ${jobId} not found yet (404). Retrying in ${delayMs / 1000}s...`);
      } else {
        log(`❌ Error while fetching job ${jobId}: ${err.message}`);
      }
      await new Promise(res => setTimeout(res, delayMs));
    }
  }

  throw new Error(`Timed out waiting for results from job ${jobId} after ${maxAttempts} polling attempts.`);
}

module.exports = {
  makeOxylabsRequest,
  getJobResultsEnhanced
};
