// ScrapiBatchAutomation.js - Final version: submits individual jobs to Oxylabs and records job IDs + result URLs
const fs = require('fs');
const path = require('path');
const { makeRequest } = require('../../utils/connection-helper');
require('dotenv').config();

const BATCH_SIZE = 10;
const DELAY_MS = 30000;

const logsDir = path.join(process.cwd(), 'SCRAPI', 'output-staging', 'logs');
if (!fs.existsSync(logsDir)) fs.mkdirSync(logsDir, { recursive: true });

const logFile = path.join(logsDir, `scrapi-batch-${new Date().toISOString().replace(/[:.]/g, '-')}.log`);
function log(message) {
  const timestamp = new Date().toISOString();
  const logMessage = `[${timestamp}] ${message}`;
  console.log(logMessage);
  fs.appendFileSync(logFile, logMessage + '\n');
}

function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function submitSingleQuery(entry) {
  const username = process.env.OXYLABS_USERNAME;
  const password = process.env.OXYLABS_PASSWORD;

  const payload = {
    source: "google_ads",
    query: entry.query,
    geo_location: entry.geo_location,
    device: "desktop",
    parse: true,
    start_page: 1,
    pages: 1,
    locale: "en-US",
    user_agent_type: "desktop",
    context: [
      {
        key: "ad_extraction",
        value: "true"
      }
    ]
  };

  log(`\n📤 Sending query: "${entry.query}" in ${entry.geo_location}`);
  log(JSON.stringify(payload, null, 2));

  try {
    // Use the enhanced request function
    const response = await makeRequest({
      url: 'https://data.oxylabs.io/v1/queries',
      method: 'POST',
      data: payload,
      auth: {
        username,
        password
      },
      headers: {
        'Content-Type': 'application/json'
      },
      maxRetries: 3,
      timeout: 60000
    });

    const data = response.data;
    const jobId = data.id || data.query_id;
    const resultUrl = `http://data.oxylabs.io/v1/queries/${jobId}/results`;
    log(`✅ Submitted: ${jobId} → ${resultUrl}`);
    return {
      id: jobId,
      query: entry.query,
      geo_location: entry.geo_location,
      resultUrl
    };
  } catch (error) {
    log(`❌ Submission failed: ${error.message}`);
    if (error.response) {
      log(`Response status: ${error.response.status}`);
      log(`Response data: ${JSON.stringify(error.response.data)}`);
    }
    throw error;
  }
}

async function submitBatch() {
  const masterPath = path.join(process.cwd(), 'SCRAPI/b-keyword-feeder', 'master-queries.json');
  const outputPath = path.join(process.cwd(), 'SCRAPI/a-job-scheduling', 'batch-submitted.json');
  const backupPath = path.join(process.cwd(), 'SCRAPI/a-job-scheduling', 'batch-submitted-backup.json');

  if (!fs.existsSync(masterPath)) {
    log(`❌ master-queries.json not found at ${masterPath}`);
    process.exit(1);
  }

  const allQueries = JSON.parse(fs.readFileSync(masterPath, 'utf8'));
  log(`📋 Loaded ${allQueries.length} queries from master-queries.json`);
  log(`📦 Submitting in batches of ${BATCH_SIZE}`);

  const submitted = [];

  for (let i = 0; i < allQueries.length; i += BATCH_SIZE) {
    const chunk = allQueries.slice(i, i + BATCH_SIZE);
    log(`\n🚀 Submitting batch ${Math.floor(i / BATCH_SIZE) + 1}`);

    for (const entry of chunk) {
      try {
        const result = await submitSingleQuery(entry);
        submitted.push(result);
      } catch (err) {
        log(err.message);
      }
    }

    fs.writeFileSync(outputPath, JSON.stringify({ queries: submitted }, null, 2));
    fs.writeFileSync(backupPath, JSON.stringify({ queries: submitted }, null, 2));
    log(`📄 Saved ${submitted.length} total submitted jobs to: ${outputPath}`);

    if (i + BATCH_SIZE < allQueries.length) {
      log(`⏱ Waiting ${DELAY_MS / 1000} seconds before next batch...`);
      await delay(DELAY_MS);
    }
  }
}

if (require.main === module) {
  submitBatch().catch(error => {
    log(`❌ Fatal error: ${error.message}`);
    process.exit(1);
  });
}

module.exports = { submitBatch };