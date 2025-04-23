// ReprocessExtractionFailures.js - Reprocess ad extraction failures
const { reprocessExtractionFailures } = require('./AdExtractionFailuresService');
require('dotenv').config();

/**
 * Reprocess extraction failures for a specific job
 * @param {string} jobId - The job ID to reprocess
 */
async function reprocessFailuresForJob(jobId) {
  console.log(`🔄 Reprocessing extraction failures for job ${jobId}...`);
  
  try {
    const result = await reprocessExtractionFailures(jobId);
    
    if (result.success) {
      console.log(`✅ Successfully reprocessed extraction failures: ${result.message}`);
    } else {
      console.error(`❌ Failed to reprocess extraction failures: ${result.error.message}`);
    }
  } catch (error) {
    console.error('❌ Unexpected error reprocessing extraction failures:', error);
  }
}

// Main function
async function main() {
  console.log('🚀 Starting ReprocessExtractionFailures');
  
  // Get job ID from command line arguments
  const jobId = process.argv[2];
  
  if (!jobId) {
    console.error('❌ No job ID provided');
    console.log('Usage: node src/ReprocessExtractionFailures.js <jobId>');
    process.exit(1);
  }
  
  await reprocessFailuresForJob(jobId);
}

// Run the main function if this file is executed directly
if (require.main === module) {
    main().catch(error => {
      console.error('❌ Fatal error:', error);
      process.exit(1);
    });
  
  // Handle unhandled promise rejections globally
  process.on('unhandledRejection', (reason, promise) => {
    console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
    process.exit(1);
  });
}

// Export functions for use in other modules
module.exports = {
  reprocessFailuresForJob
};