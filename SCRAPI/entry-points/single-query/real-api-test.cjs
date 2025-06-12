#!/usr/bin/env node
/**
 * Real Single Query Test - Make actual API calls to Oxylabs and Supabase
 */

const { Logger } = require('../../utils/logging/logger.cjs');
const { ErrorHandler } = require('../../utils/error-handling/error-handlers.cjs');
const { GoogleAdsScraper } = require('../../core/data-collection/google-ads-scraper.cjs');

// Initialize logger
const logger = new Logger('RealSingleQueryTest');
const errorHandler = new ErrorHandler('RealSingleQueryTest');

/**
 * Run a real single query test with actual API calls
 */
async function runRealSingleQuery(query, location) {
  try {
    logger.info('🚀 Starting REAL single query workflow', { query, location });
    
    // Step 1: Configuration Validation
    logger.info('📝 Step 1: Validating configuration...');
    const config = require('../../config/environment.cjs');
    const validation = config.validateAllConfigs();
    if (!validation.isValid) {
      throw new Error(`Configuration validation failed: ${validation.errors.join(', ')}`);
    }
    logger.info('✅ Configuration validated successfully');
    
    // Step 2: Initialize Google Ads Scraper
    logger.info('🔧 Step 2: Initializing Google Ads Scraper...');
    const scraper = new GoogleAdsScraper();
    logger.info('✅ Google Ads Scraper initialized');
    
    // Step 3: Submit Real Job to Oxylabs
    logger.info('📤 Step 3: Submitting REAL job to Oxylabs API...');
    const jobResult = await scraper.scrapeGoogleAds(query, location);
    
    if (jobResult.success) {
      logger.info('✅ Real job submitted and completed successfully!', {
        jobId: jobResult.jobId,
        adsFound: jobResult.adsFound,
        query,
        location,
        processingTime: jobResult.processingTime
      });
      
      console.log('\n🎉 REAL API TEST RESULTS:');
      console.log('========================');
      console.log(`✅ Status: SUCCESS`);
      console.log(`📋 Job ID: ${jobResult.jobId}`);
      console.log(`🔍 Query: "${query}"`);
      console.log(`📍 Location: "${location}"`);
      console.log(`📊 Ads Found: ${jobResult.adsFound}`);
      console.log(`⏱️  Processing Time: ${jobResult.processingTime}ms`);
      console.log(`📁 Results Saved: ${jobResult.outputPath}`);
      
      return {
        success: true,
        jobId: jobResult.jobId,
        results: jobResult,
        message: 'Real API test completed successfully'
      };
      
    } else {
      throw new Error(`Job failed: ${jobResult.error}`);
    }
    
  } catch (error) {
    errorHandler.handleError(error, { operation: 'runRealSingleQuery', query, location });
    
    console.log('\n❌ REAL API TEST RESULTS:');
    console.log('========================');
    console.log(`❌ Status: FAILED`);
    console.log(`📝 Error: ${error.message}`);
    console.log(`🔍 Query: "${query}"`);
    console.log(`📍 Location: "${location}"`);
    
    return {
      success: false,
      error: error.message,
      message: 'Real API test failed'
    };
  }
}

/**
 * Main function
 */
async function main() {
  const args = process.argv.slice(2);
  const query = args[0] || 'plumber near me';
  const location = args[1] || 'Sacramento, CA, United States';
  
  console.log('🧪 SCRAPI Real Single Query API Test');
  console.log('====================================');
  console.log(`Query: "${query}"`);
  console.log(`Location: "${location}"`);
  console.log('');
  console.log('⚠️  This will make REAL API calls to Oxylabs and Supabase!');
  console.log('');
  
  const result = await runRealSingleQuery(query, location);
  
  if (result.success) {
    console.log('\n🎯 Next Steps:');
    console.log('- Check the output folder for scraped data');
    console.log('- Verify data was saved to Supabase staging tables');
    console.log('- Review the detailed logs for processing information');
  } else {
    console.log('\n🔧 Troubleshooting:');
    console.log('- Verify Oxylabs credentials are correct');
    console.log('- Check Supabase connection settings');
    console.log('- Review logs for detailed error information');
  }
  
  console.log('');
}

// Run if executed directly
if (require.main === module) {
  main().catch(error => {
    console.error(`❌ Test Error: ${error.message}`);
    process.exit(1);
  });
}

module.exports = { runRealSingleQuery };
