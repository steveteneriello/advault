// verify-job-processing.js - Verify that a job has been processed correctly
const fs = require('fs');
const path = require('path');
const { supabase } = require('../../utils/supabase-helper');
require('dotenv').config();

// Directory for logs
const LOGS_DIR = path.join(process.cwd(), 'SCRAPI', 'output-staging', 'logs');
if (!fs.existsSync(LOGS_DIR)) {
  fs.mkdirSync(LOGS_DIR, { recursive: true });
}

// Log file for verification
const VERIFY_LOG_FILE = path.join(LOGS_DIR, `job-verification-${new Date().toISOString().replace(/[:.]/g, '-')}.log`);

/**
 * Log message to both console and file
 * @param {string} message - Message to log
 */
function log(message) {
  const timestamp = new Date().toISOString();
  const logMessage = `[${timestamp}] ${message}`;
  
  console.log(logMessage);
  fs.appendFileSync(VERIFY_LOG_FILE, logMessage + '\n');
}

/**
 * Verify that a job has been processed correctly
 * @param {string} jobId - The job ID to verify
 * @returns {Promise<Object>} - Verification result
 */
async function verifyJobProcessing(jobId) {
  log(`Verifying job processing for job ${jobId}...`);
  
  try {
    // Check if the job exists in the staging table
    const { data: stagingRecord, error: stagingError } = await supabase
      .from('staging_serps')
      .select('id, status, error_message, processed_at')
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
    log(`Status: ${stagingRecord.status}`);
    
    if (stagingRecord.error_message) {
      log(`Error message: ${stagingRecord.error_message}`);
    }
    
    if (stagingRecord.processed_at) {
      log(`Processed at: ${new Date(stagingRecord.processed_at).toLocaleString()}`);
    }
    
    // Check if the job exists in the serps table
    const { data: serp, error: serpError } = await supabase
      .from('serps')
      .select('id, query, location, timestamp')
      .eq('job_id', jobId)
      .maybeSingle();
      
    if (serpError) {
      log(`❌ Error checking SERP record: ${serpError.message}`);
      return {
        success: false,
        error: `Error checking SERP record: ${serpError.message}`
      };
    }
    
    if (!serp) {
      log(`❌ No SERP record found for job ${jobId}`);
      return {
        success: false,
        error: `No SERP record found for job ${jobId}`
      };
    }
    
    log(`Found SERP record: ${serp.id}`);
    log(`Query: ${serp.query}`);
    log(`Location: ${serp.location}`);
    log(`Timestamp: ${new Date(serp.timestamp).toLocaleString()}`);
    
    // Check for SERP-Ad relationships
    const { data: serpAds, error: serpAdsError } = await supabase
      .from('serp_ads')
      .select('ad_id, position, position_overall')
      .eq('serp_id', serp.id);
      
    if (serpAdsError) {
      log(`❌ Error checking SERP-Ad relationships: ${serpAdsError.message}`);
      return {
        success: false,
        error: `Error checking SERP-Ad relationships: ${serpAdsError.message}`
      };
    }
    
    if (!serpAds || serpAds.length === 0) {
      log(`❌ No SERP-Ad relationships found for SERP ${serp.id}`);
      return {
        success: false,
        error: `No SERP-Ad relationships found for SERP ${serp.id}`
      };
    }
    
    log(`Found ${serpAds.length} SERP-Ad relationships`);
    
    // Get ad details
    const adIds = serpAds.map(sa => sa.ad_id);
    const { data: ads, error: adsError } = await supabase
      .from('ads')
      .select('id, advertiser_domain, title, url, data_rw')
      .in('id', adIds);
      
    if (adsError) {
      log(`❌ Error fetching ads: ${adsError.message}`);
      return {
        success: false,
        error: `Error fetching ads: ${adsError.message}`
      };
    }
    
    if (!ads || ads.length === 0) {
      log(`❌ No ads found for these relationships`);
      return {
        success: false,
        error: `No ads found for these relationships`
      };
    }
    
    log(`Found ${ads.length} ads:`);
    
    // Check if ads have data_rw field
    const adsWithDataRw = ads.filter(ad => ad.data_rw);
    log(`${adsWithDataRw.length} out of ${ads.length} ads have data_rw field`);
    
    // Check for ad renderings
    const { data: renderings, error: renderingsError } = await supabase
      .from('ad_renderings')
      .select('ad_id, rendering_type, binary_content')
      .eq('serp_id', serp.id);
      
    if (renderingsError) {
      log(`❌ Error checking ad renderings: ${renderingsError.message}`);
      return {
        success: false,
        error: `Error checking ad renderings: ${renderingsError.message}`
      };
    }
    
    const renderingCount = renderings?.length || 0;
    log(`Found ${renderingCount} ad renderings`);
    
    // Check if job tracking record exists
    const { data: jobTracking, error: trackingError } = await supabase
      .from('job_tracking')
      .select('*')
      .eq('job_id', jobId)
      .maybeSingle();
      
    if (trackingError) {
      log(`❌ Error checking job tracking record: ${trackingError.message}`);
      return {
        success: false,
        error: `Error checking job tracking record: ${trackingError.message}`
      };
    }
    
    if (jobTracking) {
      log(`Found job tracking record: ${jobTracking.id}`);
      log(`Status: ${jobTracking.status}`);
      log(`API call status: ${jobTracking.api_call_status}`);
      log(`SERP processing status: ${jobTracking.serp_processing_status}`);
      log(`Ads extraction status: ${jobTracking.ads_extraction_status}`);
      log(`Rendering status: ${jobTracking.rendering_status}`);
      
      if (jobTracking.error_message) {
        log(`Error message: ${jobTracking.error_message}`);
      }
    } else {
      log(`No job tracking record found for job ${jobId}`);
    }
    
    // Verification summary
    const isProcessed = stagingRecord.status === 'processed';
    const hasSerp = !!serp;
    const hasAds = ads.length > 0;
    const hasRelationships = serpAds.length > 0;
    const hasRenderings = renderingCount > 0;
    
    const isFullyProcessed = isProcessed && hasSerp && hasAds && hasRelationships;
    
    log(`\n📊 Verification Summary:`);
    log(`   Staging record processed: ${isProcessed ? '✅' : '❌'}`);
    log(`   SERP record exists: ${hasSerp ? '✅' : '❌'}`);
    log(`   Ads exist: ${hasAds ? '✅' : '❌'}`);
    log(`   SERP-Ad relationships exist: ${hasRelationships ? '✅' : '❌'}`);
    log(`   Ad renderings exist: ${hasRenderings ? '✅' : '❌'}`);
    log(`   Overall status: ${isFullyProcessed ? '✅ Fully processed' : '❌ Not fully processed'}`);
    
    return {
      success: true,
      isFullyProcessed,
      stagingRecord,
      serp,
      adCount: ads.length,
      relationshipCount: serpAds.length,
      renderingCount,
      jobTracking
    };
  } catch (error) {
    log(`❌ Error verifying job processing: ${error.message}`);
    return {
      success: false,
      error: `Error verifying job processing: ${error.message}`
    };
  }
}

// Main function
async function main() {
  log('🚀 Starting Job Processing Verification');
  
  // Check command line arguments
  const jobId = process.argv[2];
  
  if (!jobId) {
    log('Usage: node SCRAPI/d-automations/2-advault-process/verify-job-processing.js <job_id>');
    
    // List recent jobs
    log('\nRecent jobs:');
    
    try {
      const { data: recentJobs, error: recentError } = await supabase
        .from('serps')
        .select('job_id, query, location, timestamp')
        .order('timestamp', { ascending: false })
        .limit(10);
        
      if (recentError) {
        log(`❌ Error fetching recent jobs: ${recentError.message}`);
      } else if (recentJobs && recentJobs.length > 0) {
        recentJobs.forEach((job, index) => {
          const timestamp = new Date(job.timestamp).toLocaleString();
          log(`${index + 1}. Job ID: ${job.job_id}`);
          log(`   Query: "${job.query}" in ${job.location}`);
          log(`   Timestamp: ${timestamp}`);
        });
        
        log('\nTo verify a specific job:');
        log(`node SCRAPI/d-automations/2-advault-process/verify-job-processing.js ${recentJobs[0].job_id}`);
      } else {
        log('No recent jobs found');
      }
    } catch (error) {
      log(`❌ Error listing recent jobs: ${error.message}`);
    }
    
    return;
  }
  
  // Verify job processing
  const result = await verifyJobProcessing(jobId);
  
  if (result.success) {
    if (result.isFullyProcessed) {
      log(`\n✅ Job ${jobId} has been fully processed`);
    } else {
      log(`\n❌ Job ${jobId} has not been fully processed`);
      log('To reset this job for reprocessing, run:');
      log(`node SCRAPI/d-automations/2-advault-process/reset-job-status.js job ${jobId}`);
    }
  } else {
    log(`\n❌ Error verifying job ${jobId}: ${result.error}`);
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
  verifyJobProcessing
};