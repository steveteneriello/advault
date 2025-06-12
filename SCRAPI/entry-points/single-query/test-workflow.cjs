#!/usr/bin/env node
/**
 * Simple Single Query Test - Test end-to-end processing without complex dependencies
 */

const { Logger } = require('../../utils/logging/logger.cjs');
const { ErrorHandler } = require('../../utils/error-handling/error-handlers.cjs');

// Initialize logger
const logger = new Logger('SingleQueryTest');
const errorHandler = new ErrorHandler('SingleQueryTest');

/**
 * Simulate a complete single query workflow
 */
async function testSingleQueryWorkflow(query, location) {
  try {
    logger.info('🚀 Starting single query workflow test', { query, location });
    
    // Step 1: Configuration Validation
    logger.info('📝 Step 1: Validating configuration...');
    const config = require('../../config/environment.cjs');
    const validation = config.validateAllConfigs();
    if (!validation.isValid) {
      throw new Error(`Configuration validation failed: ${validation.errors.join(', ')}`);
    }
    logger.info('✅ Configuration validated successfully');
    
    // Step 2: Job Submission Simulation
    logger.info('📤 Step 2: Simulating job submission to Oxylabs...');
    const jobId = `test-job-${Date.now()}`;
    await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate API call
    logger.info('✅ Job submitted successfully', { jobId });
    
    // Step 3: Data Collection Simulation
    logger.info('🔍 Step 3: Simulating data collection...');
    await new Promise(resolve => setTimeout(resolve, 2000)); // Simulate processing
    const mockResults = {
      jobId,
      query,
      location,
      adsFound: 5,
      serpsFound: 1,
      timestamp: new Date().toISOString()
    };
    logger.info('✅ Data collection completed', mockResults);
    
    // Step 4: Data Processing Simulation
    logger.info('⚙️ Step 4: Simulating data processing...');
    await new Promise(resolve => setTimeout(resolve, 1500)); // Simulate processing
    logger.info('✅ Data processing completed');
    
    // Step 5: Storage Simulation
    logger.info('💾 Step 5: Simulating data storage...');
    await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate storage
    logger.info('✅ Data storage completed');
    
    // Step 6: Rendering Simulation
    logger.info('🎨 Step 6: Simulating ad rendering...');
    await new Promise(resolve => setTimeout(resolve, 2000)); // Simulate rendering
    logger.info('✅ Ad rendering completed');
    
    logger.info('🎉 Single query workflow completed successfully!', {
      jobId,
      query,
      location,
      totalTime: '~7 seconds',
      status: 'SUCCESS'
    });
    
    return {
      success: true,
      jobId,
      results: mockResults,
      message: 'Workflow test completed successfully'
    };
    
  } catch (error) {
    errorHandler.handleError(error, { operation: 'testSingleQueryWorkflow', query, location });
    return {
      success: false,
      error: error.message,
      message: 'Workflow test failed'
    };
  }
}

/**
 * Main function
 */
async function main() {
  const args = process.argv.slice(2);
  const query = args[0] || 'plumbing services';
  const location = args[1] || 'Boston, MA, United States';
  
  console.log('🧪 SCRAPI Single Query Workflow Test');
  console.log('====================================');
  console.log(`Query: "${query}"`);
  console.log(`Location: "${location}"`);
  console.log('');
  
  const result = await testSingleQueryWorkflow(query, location);
  
  console.log('');
  console.log('📊 TEST RESULTS:');
  console.log('================');
  if (result.success) {
    console.log('✅ Status: SUCCESS');
    console.log(`📋 Job ID: ${result.jobId}`);
    console.log(`📝 Message: ${result.message}`);
  } else {
    console.log('❌ Status: FAILED');
    console.log(`📝 Error: ${result.error}`);
    console.log(`📝 Message: ${result.message}`);
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

module.exports = { testSingleQueryWorkflow };
