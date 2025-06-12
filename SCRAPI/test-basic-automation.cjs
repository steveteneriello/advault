#!/usr/bin/env node

// Basic automation test to verify the pipeline is working
const { Logger } = require('./utils/logging/logger.cjs');
const { GoogleAdsScraper } = require('./core/data-collection/google-ads-scraper.cjs');

const logger = new Logger('BasicAutomationTest');

async function testBasicAutomation() {
  try {
    logger.info('🚀 Starting basic automation test');
    
    const scraper = new GoogleAdsScraper();
    const query = process.argv[2] || 'test query';
    const location = process.argv[3] || 'New York, NY';
    
    logger.info(`Testing with query: "${query}", location: "${location}"`);
    
    const result = await scraper.runScraper(query, location);
    
    if (result.success) {
      logger.info('✅ Basic automation test completed successfully!');
      logger.info(`Job ID: ${result.jobId}`);
      logger.info(`Execution time: ${result.executionTime}ms`);
      console.log('\n✅ SUCCESS: Basic automation is working!');
      process.exit(0);
    } else {
      logger.error('❌ Basic automation test failed');
      logger.error(`Error: ${result.error}`);
      console.log('\n❌ FAILED: Basic automation test failed');
      process.exit(1);
    }
    
  } catch (error) {
    logger.error('❌ Fatal error in basic automation test');
    logger.error(error.message);
    console.log('\n❌ FATAL ERROR: Basic automation test crashed');
    process.exit(1);
  }
}

testBasicAutomation();
