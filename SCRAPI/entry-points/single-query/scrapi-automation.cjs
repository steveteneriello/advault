#!/usr/bin/env node
// scrapi-automation.js - Single query automation entry point (modernized with comprehensive workflow)
const { ComprehensiveWorkflow } = require('../../workflows/comprehensive-workflow.cjs');
const { Logger } = require('../../utils/logging/logger.cjs');

// Initialize logger
const logger = new Logger('SingleQueryAutomation');

/**
 * Run single query automation using the comprehensive workflow
 * @param {string} query - Search query
 * @param {string} location - Location for search
 * @param {Object} options - Automation options
 * @returns {Promise<Object>} - Workflow result
 */
async function runSingleQuery(query, location, options = {}) {
  logger.info('Starting single query automation', { query, location, options });
  
  const workflow = new ComprehensiveWorkflow({
    maxAdsToRender: options.maxAds || 3,
    renderHtml: options.html !== false,
    renderPng: options.png !== false,
    uploadToStorage: options.storage === true,
    trackJobs: options.tracking !== false,
    generateReport: options.report === true,
    ...options
  });
  
  const result = await workflow.executeWorkflow(query, location);
  
  if (result.success) {
    logger.info('Single query automation completed successfully', {
      jobId: result.jobId,
      serpId: result.serpId,
      adCount: result.adCount,
      executionTime: result.totalExecutionTime
    });
  } else {
    logger.error('Single query automation failed', { 
      error: result.error,
      currentStep: result.currentStep 
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
  if (args.length < 2) {
    throw new Error('Query and location are required');
  }
  
  const query = args[0];
  const location = args[1];
  
  // Parse options
  const options = {};
  for (let i = 2; i < args.length; i++) {
    const arg = args[i];
    if (arg.startsWith('--')) {
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
    }
  }
  
  return { query, location, options };
}

/**
 * Display help information
 */
function showHelp() {
  console.log(`
SCRAPI Single Query Automation (Enhanced)

Usage: node SCRAPI/entry-points/single-query/scrapi-automation.js "query" "location" [options]

Arguments:
  query      Search query (required)
  location   Geographic location in format "City, State, Country" (required)

Options:
  --maxAds=N     Maximum number of ads to render (default: 3)
  --html=true    Enable HTML rendering (default: true)
  --png=false    Disable PNG rendering 
  --storage      Enable storage upload
  --tracking     Enable job tracking (default: true)
  --report       Generate report
  --help         Show this help message

Examples:
  # Basic usage
  node SCRAPI/entry-points/single-query/scrapi-automation.js "plumbers near me" "Boston, Massachusetts, United States"
  
  # With options
  node SCRAPI/entry-points/single-query/scrapi-automation.js "disaster restoration" "Phoenix, Arizona, United States" --maxAds=5 --storage --png=false
  
  # Minimal rendering
  node SCRAPI/entry-points/single-query/scrapi-automation.js "auto insurance" "Los Angeles, California, United States" --html=false --png=false
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
    
    const { query, location, options } = parseArguments(args);
    
    // Execute workflow
    console.log('🚀 Starting SCRAPI Single Query Automation');
    console.log(`Query: "${query}"`);
    console.log(`Location: "${location}"`);
    console.log(`Options:`, JSON.stringify(options, null, 2));
    
    const result = await runSingleQuery(query, location, options);
    
    if (result.success) {
      console.log('\n✅ Single query automation completed successfully');
      console.log(`📊 Results Summary:`);
      console.log(`   Job ID: ${result.jobId}`);
      console.log(`   SERP ID: ${result.serpId}`);
      console.log(`   Ads Found: ${result.adCount}`);
      console.log(`   Execution Time: ${result.totalExecutionTime}ms`);
      
      if (result.htmlRendering && !result.htmlRendering.skipped) {
        console.log(`   HTML Rendered: ${result.htmlRendering.processedCount} ads`);
      }
      if (result.pngRendering && !result.pngRendering.skipped) {
        console.log(`   PNG Rendered: ${result.pngRendering.processedCount} ads`);
      }
      if (result.storageUpload && !result.storageUpload.skipped) {
        console.log(`   Storage Uploads: ${result.storageUpload.updatedCount} files`);
      }
      
      process.exit(0);
    } else {
      console.error('\n❌ Single query automation failed');
      console.error(`Error: ${result.error}`);
      if (result.currentStep) {
        console.error(`Failed at step: ${result.currentStep}`);
      }
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

module.exports = { runSingleQuery };
