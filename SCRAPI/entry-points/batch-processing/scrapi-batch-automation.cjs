#!/usr/bin/env node
// scrapi-batch-automation.js - Batch processing automation entry point (modernized with comprehensive workflow)
const path = require('path');
const fs = require('fs');
const { ComprehensiveWorkflow } = require('../../workflows/comprehensive-workflow.cjs');
const { Logger } = require('../../utils/logging/logger.cjs');

// Initialize logger
const logger = new Logger('BatchProcessingAutomation');

/**
 * Run batch processing automation using the comprehensive workflow
 * @param {string} queriesFile - Path to queries JSON file
 * @param {Object} options - Processing options
 * @returns {Promise<Object>} - Workflow result
 */
async function runBatchProcessing(queriesFile, options = {}) {
  logger.info('Starting batch processing automation', { queriesFile, options });
  
  // Load queries from file
  if (!fs.existsSync(queriesFile)) {
    throw new Error(`Queries file not found: ${queriesFile}`);
  }
  
  const queriesData = JSON.parse(fs.readFileSync(queriesFile, 'utf8'));
  const queries = Array.isArray(queriesData) ? queriesData : queriesData.queries || [];
  
  if (queries.length === 0) {
    throw new Error('No queries found in file');
  }
  
  logger.info('Loaded queries from file', { 
    queriesFile, 
    queryCount: queries.length 
  });
  
  // Prepare queries in the expected format
  const formattedQueries = queries.map(q => ({
    query: q.query,
    location: q.geo_location || q.location
  }));
  
  // Create workflow with batch-appropriate settings
  const workflow = new ComprehensiveWorkflow({
    maxAdsToRender: options.maxAds || 3,
    renderHtml: options.html !== false,
    renderPng: options.png !== false,
    uploadToStorage: options.storage === true,
    trackJobs: options.tracking !== false,
    generateReport: options.report === true,
    ...options
  });
  
  // Execute batch workflow
  const result = await workflow.executeBatchWorkflow(formattedQueries, {
    concurrency: options.concurrency || 1,
    delayMs: (options.delaySeconds || 30) * 1000
  });
  
  if (result.success) {
    logger.info('Batch processing automation completed', {
      totalQueries: result.totalQueries,
      successCount: result.successCount,
      errorCount: result.errorCount,
      executionTime: result.executionTime
    });
  } else {
    logger.error('Batch processing automation failed', { 
      error: result.error
    });
  }
  
  return result;
}

/**
 * Parse command line arguments
 * @param {Array} args - Command line arguments
 * @returns {Object} - Parsed arguments
 */
function parseArguments(args) {
  const options = {
    queriesFile: null,
    concurrency: 1,
    delaySeconds: 30,
    maxAds: 3
  };
  
  // Parse arguments
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    
    if (arg === '--file' || arg === '-f') {
      options.queriesFile = args[i + 1];
      i++; // Skip next argument
    } else if (arg === '--concurrency' || arg === '-c') {
      options.concurrency = parseInt(args[i + 1]);
      i++; // Skip next argument
    } else if (arg === '--delay' || arg === '-d') {
      options.delaySeconds = parseInt(args[i + 1]);
      i++; // Skip next argument
    } else if (arg === '--max-ads' || arg === '-m') {
      options.maxAds = parseInt(args[i + 1]);
      i++; // Skip next argument
    } else if (arg.startsWith('--')) {
      // Handle other options
      const [key, value] = arg.substring(2).split('=');
      if (value === undefined || value === 'true') {
        options[key] = true;
      } else if (value === 'false') {
        options[key] = false;
      } else if (!isNaN(value)) {
        options[key] = parseInt(value);
      } else {
        options[key] = value;
      }
    } else if (!options.queriesFile && !arg.startsWith('-')) {
      // First non-flag argument is the queries file
      options.queriesFile = arg;
    }
  }
  
  // Default to master-queries.json if no file specified
  if (!options.queriesFile) {
    options.queriesFile = path.join(process.cwd(), 'SCRAPI', 'b-keyword-feeder', 'master-queries.json');
  }
  
  // Validate arguments
  if (!options.queriesFile) {
    throw new Error('Queries file is required');
  }
  
  if (options.concurrency < 1 || options.concurrency > 10) {
    throw new Error('Concurrency must be between 1 and 10');
  }
  
  if (options.delaySeconds < 0 || options.delaySeconds > 300) {
    throw new Error('Delay must be between 0 and 300 seconds');
  }
  
  if (options.maxAds < 1 || options.maxAds > 20) {
    throw new Error('Max ads must be between 1 and 20');
  }
  
  return options;
}

/**
 * Display help information
 */
function showHelp() {
  console.log(`
SCRAPI Batch Processing Automation (Enhanced)

Usage: node SCRAPI/entry-points/batch-processing/scrapi-batch-automation.js [queriesFile] [options]

Arguments:
  queriesFile    Path to queries JSON file (default: master-queries.json)

Options:
  --concurrency=N, -c N   Number of queries to process simultaneously (default: 1, max: 10)
  --delay=N, -d N         Delay between batches in seconds (default: 30, max: 300)
  --max-ads=N, -m N       Maximum number of ads to render per query (default: 3, max: 20)
  --html=true             Enable HTML rendering (default: true)
  --png=false             Disable PNG rendering
  --storage               Enable storage upload
  --tracking              Enable job tracking (default: true)
  --report                Generate reports
  --help, -h              Show this help message

Examples:
  # Basic usage with default settings
  node SCRAPI/entry-points/batch-processing/scrapi-batch-automation.js
  
  # Custom queries file
  node SCRAPI/entry-points/batch-processing/scrapi-batch-automation.js my-queries.json
  
  # High throughput processing
  node SCRAPI/entry-points/batch-processing/scrapi-batch-automation.js --concurrency=3 --delay=10
  
  # Custom rendering settings
  node SCRAPI/entry-points/batch-processing/scrapi-batch-automation.js --max-ads=5 --png=false --storage
  
  # Minimal processing for testing
  node SCRAPI/entry-points/batch-processing/scrapi-batch-automation.js --concurrency=1 --max-ads=1 --html=false --png=false

Query File Format:
  The queries file should contain a JSON array or object with queries:
  
  Array format:
  [
    {"query": "plumbers near me", "geo_location": "Boston, MA, US"},
    {"query": "dentists", "location": "New York, NY, US"}
  ]
  
  Object format:
  {
    "queries": [
      {"query": "lawyers", "geo_location": "Chicago, IL, US"}
    ]
  }
`);
}

/**
 * Main execution function
 */
async function main() {
  try {
    // Parse command line arguments
    const args = process.argv.slice(2);
    
    // Check for help
    if (args.includes('--help') || args.includes('-h')) {
      showHelp();
      process.exit(0);
    }
    
    const options = parseArguments(args);
    
    console.log('🚀 Starting SCRAPI Batch Processing Automation');
    console.log(`📁 Queries file: ${options.queriesFile}`);
    console.log(`🔄 Concurrency: ${options.concurrency}`);
    console.log(`⏱️  Delay between batches: ${options.delaySeconds} seconds`);
    console.log(`🖼️  Max ads per query: ${options.maxAds}`);
    console.log(`Options:`, JSON.stringify({
      html: options.html,
      png: options.png,
      storage: options.storage,
      tracking: options.tracking,
      report: options.report
    }, null, 2));
    console.log('');
    
    // Execute workflow
    const result = await runBatchProcessing(options.queriesFile, options);
    
    if (result.success) {
      console.log('\n✅ Batch processing automation completed successfully');
      console.log(`📊 Results Summary:`);
      console.log(`   Total Queries: ${result.totalQueries}`);
      console.log(`   Successful: ${result.successCount}`);
      console.log(`   Failed: ${result.errorCount}`);
      console.log(`   Success Rate: ${((result.successCount / result.totalQueries) * 100).toFixed(1)}%`);
      console.log(`   Total Execution Time: ${result.executionTime}ms`);
      
      if (result.errorCount > 0) {
        console.log('\n⚠️  Failed Queries:');
        result.errors.slice(0, 5).forEach(error => {
          console.log(`   - "${error.query}" in ${error.location}: ${error.error}`);
        });
        if (result.errors.length > 5) {
          console.log(`   ... and ${result.errors.length - 5} more`);
        }
      }
      
      process.exit(0);
    } else {
      console.error('\n❌ Batch processing automation failed');
      console.error(`Error: ${result.error}`);
      process.exit(1);
    }
    
  } catch (error) {
    console.error(`❌ Fatal error: ${error.message}`);
    showHelp();
    process.exit(1);
  }
}

// Run if executed directly
if (require.main === module) {
  main().catch(error => {
    console.error(`❌ Fatal error: ${error.message}`);
    process.exit(1);
  });
}

module.exports = { runBatchProcessing };
