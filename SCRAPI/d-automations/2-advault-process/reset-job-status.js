// reset-job-status.js - Reset job status for reprocessing
const fs = require('fs');
const path = require('path');
const { supabase, supabaseAdmin } = require('../../utils/supabase-helper');
require('dotenv').config();

// Directory for logs
const LOGS_DIR = path.join(process.cwd(), 'SCRAPI', 'output-staging', 'logs');
if (!fs.existsSync(LOGS_DIR)) {
  fs.mkdirSync(LOGS_DIR, { recursive: true });
}

// Log file for reset operations
const RESET_LOG_FILE = path.join(LOGS_DIR, `job-reset-${new Date().toISOString().replace(/[:.]/g, '-')}.log`);

/**
 * Log message to both console and file
 * @param {string} message - Message to log
 */
function log(message) {
  const timestamp = new Date().toISOString();
  const logMessage = `[${timestamp}] ${message}`;
  
  console.log(logMessage);
  fs.appendFileSync(RESET_LOG_FILE, logMessage + '\n');
}

/**
 * Reset a job to pending status
 * @param {string} jobId - The job ID to reset
 * @returns {Promise<Object>} - Reset result
 */
async function resetJob(jobId) {
  log(`Resetting job ${jobId} to pending status...`);
  
  try {
    // First, check if the staging record exists
    const { data: stagingRecord, error: stagingError } = await supabase
      .from('staging_serps')
      .select('id, status, error_message')
      .eq('job_id', jobId)
      .maybeSingle();
      
    if (stagingError) {
      log(`❌ Error checking staging record: ${stagingError.message}`);
      return {
        success: false,
        error: `Error checking staging record: ${stagingError.message}`
      };
    }
    
    if (!stagingRecord) {
      log(`❌ No staging record found for job ${jobId}`);
      return {
        success: false,
        error: `No staging record found for job ${jobId}`
      };
    }
    
    log(`Found staging record: ${stagingRecord.id}`);
    log(`Current status: ${stagingRecord.status}`);
    
    if (stagingRecord.error_message) {
      log(`Error message: ${stagingRecord.error_message}`);
    }
    
    // Reset the staging record to pending
    const { error: resetError } = await supabaseAdmin
      .from('staging_serps')
      .update({
        status: 'pending',
        processed_at: null,
        error_message: null
      })
      .eq('id', stagingRecord.id);
      
    if (resetError) {
      log(`❌ Error resetting staging record: ${resetError.message}`);
      return {
        success: false,
        error: `Error resetting staging record: ${resetError.message}`
      };
    }
    
    log(`✅ Successfully reset staging record ${stagingRecord.id} to pending status`);
    
    // Check if there's a job tracking record
    const { data: jobTracking, error: trackingError } = await supabase
      .from('job_tracking')
      .select('*')
      .eq('job_id', jobId)
      .maybeSingle();
      
    if (trackingError) {
      log(`❌ Error checking job tracking record: ${trackingError.message}`);
    } else if (jobTracking) {
      log(`Found job tracking record: ${jobTracking.id}`);
      
      // Reset the job tracking record
      const { error: trackingResetError } = await supabaseAdmin
        .from('job_tracking')
        .update({
          status: 'pending',
          api_call_status: 'pending',
          serp_processing_status: 'pending',
          ads_extraction_status: 'pending',
          rendering_status: 'pending',
          completed_at: null,
          error_message: null
        })
        .eq('id', jobTracking.id);
        
      if (trackingResetError) {
        log(`❌ Error resetting job tracking record: ${trackingResetError.message}`);
      } else {
        log(`✅ Successfully reset job tracking record ${jobTracking.id}`);
      }
    } else {
      log(`No job tracking record found for job ${jobId}`);
    }
    
    return {
      success: true,
      message: `Successfully reset job ${jobId}`
    };
  } catch (error) {
    log(`❌ Failed to reset job: ${error.message}`);
    return {
      success: false,
      error: `Failed to reset job: ${error.message}`
    };
  }
}

/**
 * Reset all jobs with errors
 * @returns {Promise<Object>} - Reset result
 */
async function resetAllErrorJobs() {
  log('Resetting all jobs with errors...');
  
  try {
    // Get all staging records with error status
    const { data: errorRecords, error: errorError } = await supabase
      .from('staging_serps')
      .select('id, job_id, query, location, status, error_message')
      .eq('status', 'error')
      .order('created_at', { ascending: false });
      
    if (errorError) {
      log(`❌ Error fetching error records: ${errorError.message}`);
      return {
        success: false,
        error: `Error fetching error records: ${errorError.message}`
      };
    }
    
    if (!errorRecords || errorRecords.length === 0) {
      log('No error records found');
      return {
        success: true,
        message: 'No error records found',
        count: 0
      };
    }
    
    log(`Found ${errorRecords.length} error records`);
    
    // Reset each record
    let successCount = 0;
    let errorCount = 0;
    
    for (const record of errorRecords) {
      log(`Resetting job ${record.job_id} (${record.query} in ${record.location})...`);
      
      // Reset the staging record to pending
      const { error: resetError } = await supabaseAdmin
        .from('staging_serps')
        .update({
          status: 'pending',
          processed_at: null,
          error_message: null
        })
        .eq('id', record.id);
        
      if (resetError) {
        log(`❌ Error resetting staging record ${record.id}: ${resetError.message}`);
        errorCount++;
      } else {
        log(`✅ Successfully reset staging record ${record.id}`);
        successCount++;
      }
    }
    
    log(`\n📊 Reset Summary:`);
    log(`   Total error records: ${errorRecords.length}`);
    log(`   Successfully reset: ${successCount}`);
    log(`   Failed to reset: ${errorCount}`);
    
    return {
      success: true,
      totalCount: errorRecords.length,
      successCount,
      errorCount
    };
  } catch (error) {
    log(`❌ Failed to reset error jobs: ${error.message}`);
    return {
      success: false,
      error: `Failed to reset error jobs: ${error.message}`
    };
  }
}

/**
 * Reset all jobs with processed status but no SERP-Ad relationships
 * @returns {Promise<Object>} - Reset result
 */
async function resetProcessedJobsWithoutRelationships() {
  log('Resetting all jobs with processed status but no SERP-Ad relationships...');
  
  try {
    // Get all staging records with processed status
    const { data: processedRecords, error: processedError } = await supabase
      .from('staging_serps')
      .select('id, job_id, query, location, status')
      .eq('status', 'processed')
      .order('created_at', { ascending: false });
      
    if (processedError) {
      log(`❌ Error fetching processed records: ${processedError.message}`);
      return {
        success: false,
        error: `Error fetching processed records: ${processedError.message}`
      };
    }
    
    if (!processedRecords || processedRecords.length === 0) {
      log('No processed records found');
      return {
        success: true,
        message: 'No processed records found',
        count: 0
      };
    }
    
    log(`Found ${processedRecords.length} processed records`);
    
    // Check each record for SERP-Ad relationships
    let resetCount = 0;
    let skippedCount = 0;
    let errorCount = 0;
    
    for (const record of processedRecords) {
      // Get the SERP for this job
      const { data: serp, error: serpError } = await supabase
        .from('serps')
        .select('id')
        .eq('job_id', record.job_id)
        .maybeSingle();
        
      if (serpError) {
        log(`❌ Error fetching SERP for job ${record.job_id}: ${serpError.message}`);
        errorCount++;
        continue;
      }
      
      if (!serp) {
        log(`No SERP found for job ${record.job_id}, resetting...`);
        
        // Reset this record
        const { error: resetError } = await supabaseAdmin
          .from('staging_serps')
          .update({
            status: 'pending',
            processed_at: null,
            error_message: null
          })
          .eq('id', record.id);
          
        if (resetError) {
          log(`❌ Error resetting staging record ${record.id}: ${resetError.message}`);
          errorCount++;
        } else {
          log(`✅ Reset staging record ${record.id}`);
          resetCount++;
        }
        
        continue;
      }
      
      // Check for SERP-Ad relationships
      const { count: relationshipCount, error: countError } = await supabase
        .from('serp_ads')
        .select('*', { count: 'exact', head: true })
        .eq('serp_id', serp.id);
        
      if (countError) {
        log(`❌ Error checking for SERP-Ad relationships for SERP ${serp.id}: ${countError.message}`);
        errorCount++;
        continue;
      }
      
      if (relationshipCount === 0) {
        log(`No SERP-Ad relationships found for SERP ${serp.id}, resetting...`);
        
        // Reset this record
        const { error: resetError } = await supabaseAdmin
          .from('staging_serps')
          .update({
            status: 'pending',
            processed_at: null,
            error_message: null
          })
          .eq('id', record.id);
          
        if (resetError) {
          log(`❌ Error resetting staging record ${record.id}: ${resetError.message}`);
          errorCount++;
        } else {
          log(`✅ Reset staging record ${record.id}`);
          resetCount++;
        }
      } else {
        log(`SERP ${serp.id} has ${relationshipCount} relationships, skipping`);
        skippedCount++;
      }
    }
    
    log(`\n📊 Reset Summary:`);
    log(`   Total processed records: ${processedRecords.length}`);
    log(`   Reset: ${resetCount}`);
    log(`   Skipped: ${skippedCount}`);
    log(`   Errors: ${errorCount}`);
    
    return {
      success: true,
      totalCount: processedRecords.length,
      resetCount,
      skippedCount,
      errorCount
    };
  } catch (error) {
    log(`❌ Failed to reset processed jobs: ${error.message}`);
    return {
      success: false,
      error: `Failed to reset processed jobs: ${error.message}`
    };
  }
}

// Main function
async function main() {
  log('🚀 Starting Job Status Reset');
  
  // Check command line arguments
  const command = process.argv[2];
  const jobId = process.argv[3];
  
  if (command === 'job' && jobId) {
    // Reset a specific job
    const result = await resetJob(jobId);
    
    if (result.success) {
      log(`✅ ${result.message}`);
    } else {
      log(`❌ ${result.error}`);
    }
  } else if (command === 'errors') {
    // Reset all jobs with errors
    const result = await resetAllErrorJobs();
    
    if (result.success) {
      log(`✅ Reset ${result.successCount} out of ${result.totalCount} error jobs`);
    } else {
      log(`❌ ${result.error}`);
    }
  } else if (command === 'missing') {
    // Reset all jobs with processed status but no SERP-Ad relationships
    const result = await resetProcessedJobsWithoutRelationships();
    
    if (result.success) {
      log(`✅ Reset ${result.resetCount} out of ${result.totalCount} processed jobs with no relationships`);
    } else {
      log(`❌ ${result.error}`);
    }
  } else {
    // Show usage
    log('Usage:');
    log('  node SCRAPI/d-automations/2-advault-process/reset-job-status.js job <job_id>');
    log('  node SCRAPI/d-automations/2-advault-process/reset-job-status.js errors');
    log('  node SCRAPI/d-automations/2-advault-process/reset-job-status.js missing');
  }
}

// Run the main function if this file is executed directly
if (require.main === module) {
  main().catch(error => {
    log(`❌ Fatal error: ${error.message}`);
    process.exit(1);
  });
}

// Export functions for use in other modules
module.exports = {
  resetJob,
  resetAllErrorJobs,
  resetProcessedJobsWithoutRelationships
};