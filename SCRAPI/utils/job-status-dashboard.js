const fs = require('fs');
const path = require('path');
const { supabase } = require('./supabase-helper');
require('dotenv').config();

// Directory for logs
const LOGS_DIR = path.join(process.cwd(), 'SCRAPI', 'output-staging', 'logs');
if (!fs.existsSync(LOGS_DIR)) {
  fs.mkdirSync(LOGS_DIR, { recursive: true });
}

// Log file for job status dashboard
const DASHBOARD_LOG_FILE = path.join(LOGS_DIR, `job-status-dashboard-${new Date().toISOString().replace(/[:.]/g, '-')}.log`);

/**
 * Log message to both console and file
 * @param {string} message - Message to log
 */
function log(message) {
  const timestamp = new Date().toISOString();
  const logMessage = `[${timestamp}] ${message}`;
  
  console.log(logMessage);
  fs.appendFileSync(DASHBOARD_LOG_FILE, logMessage + '\n');
}

/**
 * Get job status summary
 * @returns {Promise<Object>} - Job status summary
 */
async function getJobStatusSummary() {
  log('Getting job status summary...');
  
  try {
    // Get counts by status from job_tracking table
    const { data: statusCounts, error: statusError } = await supabase
      .rpc('execute_sql', {
        sql_statement: `
          SELECT status, COUNT(*) as count
          FROM job_tracking
          GROUP BY status
          ORDER BY 
            CASE 
              WHEN status = 'in_progress' THEN 1
              WHEN status = 'pending' THEN 2
              WHEN status = 'failed' THEN 3
              WHEN status = 'partial_success' THEN 4
              WHEN status = 'completed' THEN 5
              ELSE 6
            END
        `
      });
      
    if (statusError) {
      log('❌ Error getting status counts: ' + statusError.message);
      return {
        success: false,
        error: statusError.message
      };
    }
    
    // Get counts by step status
    const { data: stepCounts, error: stepError } = await supabase
      .rpc('execute_sql', {
        sql_statement: `
          SELECT 
            'api_call' as step,
            api_call_status as status,
            COUNT(*) as count
          FROM job_tracking
          GROUP BY api_call_status
          UNION ALL
          SELECT 
            'serp_processing' as step,
            serp_processing_status as status,
            COUNT(*) as count
          FROM job_tracking
          GROUP BY serp_processing_status
          UNION ALL
          SELECT 
            'ads_extraction' as step,
            ads_extraction_status as status,
            COUNT(*) as count
          FROM job_tracking
          GROUP BY ads_extraction_status
          UNION ALL
          SELECT 
            'rendering' as step,
            rendering_status as status,
            COUNT(*) as count
          FROM job_tracking
          GROUP BY rendering_status
          ORDER BY step, status
        `
      });
      
    if (stepError) {
      log('❌ Error getting step counts: ' + stepError.message);
      return {
        success: false,
        error: stepError.message
      };
    }
    
    // Get recent jobs
    const { data: recentJobs, error: recentError } = await supabase
      .from('job_tracking')
      .select(`
        id,
        job_id,
        query,
        location,
        status,
        api_call_status,
        serp_processing_status,
        ads_extraction_status,
        rendering_status,
        started_at,
        completed_at,
        error_message,
        new_ads_count,
        new_advertisers_count,
        serp_id
      `)
      .order('started_at', { ascending: false })
      .limit(10);
      
    if (recentError) {
      log('❌ Error getting recent jobs: ' + recentError.message);
      return {
        success: false,
        error: recentError.message
      };
    }
    
    // Get jobs in progress
    const { data: inProgressJobs, error: inProgressError } = await supabase
      .from('job_tracking')
      .select(`
        id,
        job_id,
        query,
        location,
        status,
        api_call_status,
        serp_processing_status,
        ads_extraction_status,
        rendering_status,
        started_at
      `)
      .eq('status', 'in_progress')
      .order('started_at', { ascending: false });
      
    if (inProgressError) {
      log('❌ Error getting in-progress jobs: ' + inProgressError.message);
      return {
        success: false,
        error: inProgressError.message
      };
    }
    
    // Get failed jobs
    const { data: failedJobs, error: failedError } = await supabase
      .from('job_tracking')
      .select(`
        id,
        job_id,
        query,
        location,
        status,
        api_call_status,
        serp_processing_status,
        ads_extraction_status,
        rendering_status,
        started_at,
        error_message
      `)
      .eq('status', 'failed')
      .order('started_at', { ascending: false })
      .limit(10);
      
    if (failedError) {
      log('❌ Error getting failed jobs: ' + failedError.message);
      return {
        success: false,
        error: failedError.message
      };
    }
    
    // Get pending jobs
    const { data: pendingJobs, error: pendingError } = await supabase
      .from('job_tracking')
      .select(`
        id,
        job_id,
        query,
        location,
        status,
        api_call_status,
        serp_processing_status,
        ads_extraction_status,
        rendering_status,
        started_at
      `)
      .eq('status', 'pending')
      .order('started_at', { ascending: false });
      
    if (pendingError) {
      log('❌ Error getting pending jobs: ' + pendingError.message);
      return {
        success: false,
        error: pendingError.message
      };
    }
    
    // Get completed jobs
    const { data: completedJobs, error: completedError } = await supabase
      .from('job_tracking')
      .select(`
        id,
        job_id,
        query,
        location,
        status,
        started_at,
        completed_at,
        new_ads_count,
        new_advertisers_count,
        serp_id
      `)
      .or('status.eq.completed,status.eq.partial_success')
      .order('completed_at', { ascending: false })
      .limit(10);
      
    if (completedError) {
      log('❌ Error getting completed jobs: ' + completedError.message);
      return {
        success: false,
        error: completedError.message
      };
    }
    
    // Get total job count
    const { count: totalCount, error: countError } = await supabase
      .from('job_tracking')
      .select('*', { count: 'exact', head: true });
      
    if (countError) {
      log('❌ Error getting total job count: ' + countError.message);
      return {
        success: false,
        error: countError.message
      };
    }
    
    // Get staging_serps status counts
    const { data: stagingCounts, error: stagingError } = await supabase
      .rpc('execute_sql', {
        sql_statement: `
          SELECT status, COUNT(*) as count
          FROM staging_serps
          GROUP BY status
          ORDER BY 
            CASE 
              WHEN status = 'pending' THEN 1
              WHEN status = 'error' THEN 2
              WHEN status = 'processed' THEN 3
              ELSE 4
            END
        `
      });
      
    if (stagingError) {
      log('❌ Error getting staging counts: ' + stagingError.message);
      return {
        success: false,
        error: stagingError.message
      };
    }
    
    return {
      success: true,
      data: {
        totalCount: totalCount || 0,
        statusCounts: Array.isArray(statusCounts) ? statusCounts : [],
        stepCounts: Array.isArray(stepCounts) ? stepCounts : [],
        stagingCounts: Array.isArray(stagingCounts) ? stagingCounts : [],
        recentJobs: Array.isArray(recentJobs) ? recentJobs : [],
        inProgressJobs: Array.isArray(inProgressJobs) ? inProgressJobs : [],
        failedJobs: Array.isArray(failedJobs) ? failedJobs : [],
        pendingJobs: Array.isArray(pendingJobs) ? pendingJobs : [],
        completedJobs: Array.isArray(completedJobs) ? completedJobs : []
      }
    };
  } catch (error) {
    log('❌ Unexpected error getting job status summary: ' + error.message);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Format duration from milliseconds
 * @param {number} ms - Duration in milliseconds
 * @returns {string} - Formatted duration
 */
function formatDuration(ms) {
  if (!ms) return 'N/A';
  
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  
  if (hours > 0) {
    return `${hours}h ${minutes % 60}m ${seconds % 60}s`;
  } else if (minutes > 0) {
    return `${minutes}m ${seconds % 60}s`;
  } else {
    return `${seconds}s`;
  }
}

/**
 * Display job status dashboard
 * @param {Object} summary - Job status summary
 */
function displayDashboard(summary) {
  if (!summary || !summary.data) {
    console.log('No data available to display');
    return;
  }

  const data = summary.data;
  
  // Display header
  console.log('\n=======================================================');
  console.log('               JOB STATUS DASHBOARD                    ');
  console.log('=======================================================');
  console.log(`Generated at: ${new Date().toLocaleString()}`);
  console.log(`Total Jobs: ${data.totalCount}`);
  console.log('=======================================================\n');
  
  // Display status counts
  console.log('JOB STATUS SUMMARY:');
  console.log('-------------------');
  
  if (!Array.isArray(data.statusCounts) || data.statusCounts.length === 0) {
    console.log('No job status data available');
  } else {
    data.statusCounts.forEach(status => {
      const statusSymbol = 
        status.status === 'in_progress' ? '🔄' :
        status.status === 'pending' ? '⏳' :
        status.status === 'failed' ? '❌' :
        status.status === 'partial_success' ? '⚠️' :
        status.status === 'completed' ? '✅' : '❓';
        
      console.log(`${statusSymbol} ${status.status}: ${status.count}`);
    });
  }
  
  console.log('\nSTAGING STATUS SUMMARY:');
  console.log('----------------------');
  
  if (!Array.isArray(data.stagingCounts) || data.stagingCounts.length === 0) {
    console.log('No staging status data available');
  } else {
    data.stagingCounts.forEach(status => {
      const statusSymbol = 
        status.status === 'pending' ? '⏳' :
        status.status === 'error' ? '❌' :
        status.status === 'processed' ? '✅' : '❓';
        
      console.log(`${statusSymbol} ${status.status}: ${status.count}`);
    });
  }
  
  // Display step status counts
  console.log('\nPROCESSING STEP STATUS:');
  console.log('----------------------');
  
  if (!Array.isArray(data.stepCounts) || data.stepCounts.length === 0) {
    console.log('No step status data available');
  } else {
    // Group by step
    const stepGroups = {};
    data.stepCounts.forEach(step => {
      if (!stepGroups[step.step]) {
        stepGroups[step.step] = [];
      }
      stepGroups[step.step].push(step);
    });
    
    // Display each step group
    Object.entries(stepGroups).forEach(([stepName, steps]) => {
      console.log(`\n${stepName.toUpperCase()}:`);
      
      steps.forEach(step => {
        const statusSymbol = 
          step.status === 'in_progress' ? '🔄' :
          step.status === 'pending' ? '⏳' :
          step.status === 'failed' ? '❌' :
          step.status === 'success' ? '✅' : '❓';
          
        console.log(`  ${statusSymbol} ${step.status}: ${step.count}`);
      });
    });
  }
  
  // Display in-progress jobs
  console.log('\n=======================================================');
  console.log('JOBS IN PROGRESS:');
  console.log('=======================================================');
  
  if (!Array.isArray(data.inProgressJobs) || data.inProgressJobs.length === 0) {
    console.log('No jobs currently in progress');
  } else {
    data.inProgressJobs.forEach((job, index) => {
      const startedAt = new Date(job.started_at).toLocaleString();
      const duration = formatDuration(Date.now() - new Date(job.started_at).getTime());
      
      console.log(`${index + 1}. Job ID: ${job.job_id}`);
      console.log(`   Query: "${job.query}" in ${job.location}`);
      console.log(`   Started: ${startedAt} (Running for: ${duration})`);
      console.log(`   API Call: ${job.api_call_status} | SERP Processing: ${job.serp_processing_status}`);
      console.log(`   Ads Extraction: ${job.ads_extraction_status} | Rendering: ${job.rendering_status}`);
      console.log('-------------------------------------------------------');
    });
  }
  
  // Display pending jobs
  console.log('\n=======================================================');
  console.log('PENDING JOBS:');
  console.log('=======================================================');
  
  if (!Array.isArray(data.pendingJobs) || data.pendingJobs.length === 0) {
    console.log('No pending jobs');
  } else {
    data.pendingJobs.forEach((job, index) => {
      const startedAt = new Date(job.started_at).toLocaleString();
      
      console.log(`${index + 1}. Job ID: ${job.job_id}`);
      console.log(`   Query: "${job.query}" in ${job.location}`);
      console.log(`   Started: ${startedAt}`);
      console.log(`   API Call: ${job.api_call_status} | SERP Processing: ${job.serp_processing_status}`);
      console.log(`   Ads Extraction: ${job.ads_extraction_status} | Rendering: ${job.rendering_status}`);
      console.log('-------------------------------------------------------');
    });
  }
  
  // Display failed jobs
  console.log('\n=======================================================');
  console.log('FAILED JOBS:');
  console.log('=======================================================');
  
  if (!Array.isArray(data.failedJobs) || data.failedJobs.length === 0) {
    console.log('No failed jobs');
  } else {
    data.failedJobs.forEach((job, index) => {
      const startedAt = new Date(job.started_at).toLocaleString();
      
      console.log(`${index + 1}. Job ID: ${job.job_id}`);
      console.log(`   Query: "${job.query}" in ${job.location}`);
      console.log(`   Started: ${startedAt}`);
      console.log(`   Error: ${job.error_message || 'No error message'}`);
      console.log(`   API Call: ${job.api_call_status} | SERP Processing: ${job.serp_processing_status}`);
      console.log(`   Ads Extraction: ${job.ads_extraction_status} | Rendering: ${job.rendering_status}`);
      console.log('-------------------------------------------------------');
    });
  }
  
  // Display completed jobs
  console.log('\n=======================================================');
  console.log('COMPLETED JOBS:');
  console.log('=======================================================');
  
  if (!Array.isArray(data.completedJobs) || data.completedJobs.length === 0) {
    console.log('No completed jobs');
  } else {
    data.completedJobs.forEach((job, index) => {
      const startedAt = new Date(job.started_at).toLocaleString();
      const completedAt = job.completed_at ? new Date(job.completed_at).toLocaleString() : 'N/A';
      const duration = job.completed_at ? 
        formatDuration(new Date(job.completed_at).getTime() - new Date(job.started_at).getTime()) : 
        'N/A';
      
      console.log(`${index + 1}. Job ID: ${job.job_id}`);
      console.log(`   Query: "${job.query}" in ${job.location}`);
      console.log(`   Started: ${startedAt} | Completed: ${completedAt}`);
      console.log(`   Duration: ${duration}`);
      console.log(`   Status: ${job.status}`);
      console.log(`   New Ads: ${job.new_ads_count || 0} | New Advertisers: ${job.new_advertisers_count || 0}`);
      console.log(`   SERP ID: ${job.serp_id || 'N/A'}`);
      console.log('-------------------------------------------------------');
    });
  }
  
  // Display recent jobs
  console.log('\n=======================================================');
  console.log('RECENT JOBS:');
  console.log('=======================================================');
  
  if (!Array.isArray(data.recentJobs) || data.recentJobs.length === 0) {
    console.log('No recent jobs');
  } else {
    data.recentJobs.forEach((job, index) => {
      const startedAt = new Date(job.started_at).toLocaleString();
      const completedAt = job.completed_at ? new Date(job.completed_at).toLocaleString() : 'N/A';
      const duration = job.completed_at ? 
        formatDuration(new Date(job.completed_at).getTime() - new Date(job.started_at).getTime()) : 
        'N/A';
      
      const statusSymbol = 
        job.status === 'in_progress' ? '🔄' :
        job.status === 'pending' ? '⏳' :
        job.status === 'failed' ? '❌' :
        job.status === 'partial_success' ? '⚠️' :
        job.status === 'completed' ? '✅' : '❓';
      
      console.log(`${index + 1}. ${statusSymbol} Job ID: ${job.job_id}`);
      console.log(`   Query: "${job.query}" in ${job.location}`);
      console.log(`   Started: ${startedAt} | Completed: ${completedAt}`);
      console.log(`   Duration: ${duration}`);
      console.log(`   Status: ${job.status}`);
      
      if (job.error_message) {
        console.log(`   Error: ${job.error_message}`);
      }
      
      console.log('-------------------------------------------------------');
    });
  }
  
  // Display footer with commands
  console.log('\n=======================================================');
  console.log('COMMANDS:');
  console.log('=======================================================');
  console.log('To view job details:');
  console.log('  node SCRAPI/utils/active/job-status-dashboard.js job <job_id>');
  console.log('\nTo reset a failed job:');
  console.log('  node SCRAPI/utils/one-time/reset-job-status.js <job_id>');
  console.log('\nTo run a new job:');
  console.log('  npm run scrapi "query" "location"');
  console.log('=======================================================');
}

/**
 * Get details for a specific job
 * @param {string} jobId - The job ID to get details for
 * @returns {Promise<Object>} - Job details
 */
async function getJobDetails(jobId) {
  log(`Getting details for job ${jobId}...`);
  
  try {
    // Get job tracking record
    const { data: job, error: jobError } = await supabase
      .from('job_tracking')
      .select('*')
      .eq('job_id', jobId)
      .maybeSingle();
      
    if (jobError) {
      log('❌ Error getting job tracking record: ' + jobError.message);
      return {
        success: false,
        error: jobError.message
      };
    }
    
    if (!job) {
      log(`❌ No job tracking record found for job ID: ${jobId}`);
      return {
        success: false,
        error: 'Job not found'
      };
    }
    
    // Get SERP record if available
    let serp = null;
    if (job.serp_id) {
      const { data: serpData, error: serpError } = await supabase
        .from('serps')
        .select('*')
        .eq('id', job.serp_id)
        .maybeSingle();
        
      if (serpError) {
        log('❌ Error getting SERP record: ' + serpError.message);
      } else {
        serp = serpData;
      }
    }
    
    // Get SERP-Ad relationships if SERP is available
    let serpAds = [];
    if (serp) {
      const { data: serpAdsData, error: serpAdsError } = await supabase
        .from('serp_ads')
        .select(`
          ad_id,
          position,
          position_overall,
          ads (
            id,
            advertiser_domain,
            title,
            url
          )
        `)
        .eq('serp_id', serp.id);
        
      if (serpAdsError) {
        log('❌ Error getting SERP-Ad relationships: ' + serpAdsError.message);
      } else {
        serpAds = serpAdsData || [];
      }
    }
    
    // Get staging record
    const { data: staging, error: stagingError } = await supabase
      .from('staging_serps')
      .select('*')
      .eq('job_id', jobId)
      .maybeSingle();
      
    if (stagingError) {
      log('❌ Error getting staging record: ' + stagingError.message);
    }
    
    // Get processing logs if staging record is available
    let logs = [];
    if (staging) {
      const { data: logsData, error: logsError } = await supabase
        .from('processing_logs')
        .select('*')
        .eq('staging_id', staging.id)
        .order('created_at', { ascending: true });
        
      if (logsError) {
        log('❌ Error getting processing logs: ' + logsError.message);
      } else {
        logs = logsData || [];
      }
    }
    
    // Get ad renderings if SERP is available
    let renderings = [];
    if (serp) {
      const { data: renderingsData, error: renderingsError } = await supabase
        .from('ad_renderings')
        .select('*')
        .eq('serp_id', serp.id);
        
      if (renderingsError) {
        log('❌ Error getting ad renderings: ' + renderingsError.message);
      } else {
        renderings = renderingsData || [];
      }
    }
    
    return {
      success: true,
      data: {
        job,
        serp,
        serpAds,
        staging,
        logs,
        renderings
      }
    };
  } catch (error) {
    log('❌ Unexpected error getting job details: ' + error.message);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Display job details
 * @param {Object} details - Job details
 */
function displayJobDetails(details) {
  if (!details || !details.data || !details.data.job) {
    console.log('No job details available to display');
    return;
  }

  const data = details.data;
  const job = data.job;
  
  // Display header
  console.log('\n=======================================================');
  console.log(`               JOB DETAILS: ${job.job_id}              `);
  console.log('=======================================================');
  
  // Display job tracking info
  console.log('\nJOB TRACKING INFO:');
  console.log('------------------');
  console.log(`Query: "${job.query}" in ${job.location}`);
  console.log(`Status: ${job.status}`);
  console.log(`Started: ${new Date(job.started_at).toLocaleString()}`);
  
  if (job.completed_at) {
    console.log(`Completed: ${new Date(job.completed_at).toLocaleString()}`);
    const duration = new Date(job.completed_at).getTime() - new Date(job.started_at).getTime();
    console.log(`Duration: ${formatDuration(duration)}`);
  }
  
  console.log(`API Call Status: ${job.api_call_status}`);
  console.log(`SERP Processing Status: ${job.serp_processing_status}`);
  console.log(`Ads Extraction Status: ${job.ads_extraction_status}`);
  console.log(`Rendering Status: ${job.rendering_status}`);
  
  if (job.error_message) {
    console.log(`Error: ${job.error_message}`);
  }
  
  console.log(`New Ads: ${job.new_ads_count || 0}`);
  console.log(`New Advertisers: ${job.new_advertisers_count || 0}`);
  
  // Display SERP info if available
  if (data.serp) {
    const serp = data.serp;
    
    console.log('\nSERP INFO:');
    console.log('----------');
    console.log(`SERP ID: ${serp.id}`);
    console.log(`Timestamp: ${new Date(serp.timestamp).toLocaleString()}`);
    
    // Display SERP-Ad relationships
    if (Array.isArray(data.serpAds) && data.serpAds.length > 0) {
      console.log(`\nAds (${data.serpAds.length}):`);
      
      data.serpAds.forEach((serpAd, index) => {
        const ad = serpAd.ads;
        console.log(`${index + 1}. [Pos ${serpAd.position}] ${ad.title || 'No title'} (${ad.advertiser_domain})`);
        console.log(`   URL: ${ad.url}`);
      });
    } else {
      console.log('\nNo ads found for this SERP');
    }
    
    // Display ad renderings
    if (Array.isArray(data.renderings) && data.renderings.length > 0) {
      console.log(`\nRenderings (${data.renderings.length}):`);
      
      // Group by rendering type
      const renderingsByType = {};
      data.renderings.forEach(rendering => {
        if (!renderingsByType[rendering.rendering_type]) {
          renderingsByType[rendering.rendering_type] = [];
        }
        renderingsByType[rendering.rendering_type].push(rendering);
      });
      
      // Display each type
      Object.entries(renderingsByType).forEach(([type, renderings]) => {
        console.log(`\n${type.toUpperCase()} Renderings (${renderings.length}):`);
        
        renderings.forEach((rendering, index) => {
          console.log(`${index + 1}. Ad ID: ${rendering.ad_id}`);
          console.log(`   Status: ${rendering.status}`);
          
          if (rendering.processed_at) {
            console.log(`   Processed: ${new Date(rendering.processed_at).toLocaleString()}`);
          }
          
          if (rendering.storage_url) {
            console.log(`   Storage URL: ${rendering.storage_url}`);
          }
          
          if (rendering.content_path) {
            console.log(`   Content Path: ${rendering.content_path}`);
          }
        });
      });
    } else {
      console.log('\nNo renderings found for this SERP');
    }
  } else {
    console.log('\nNo SERP record found for this job');
  }
  
  // Display staging info if available
  if (data.staging) {
    const staging = data.staging;
    
    console.log('\nSTAGING INFO:');
    console.log('-------------');
    console.log(`Staging ID: ${staging.id}`);
    console.log(`Status: ${staging.status}`);
    console.log(`Created: ${new Date(staging.created_at).toLocaleString()}`);
    
    if (staging.processed_at) {
      console.log(`Processed: ${new Date(staging.processed_at).toLocaleString()}`);
    }
    
    if (staging.error_message) {
      console.log(`Error: ${staging.error_message}`);
    }
  } else {
    console.log('\nNo staging record found for this job');
  }
  
  // Display processing logs if available
  if (Array.isArray(data.logs) && data.logs.length > 0) {
    console.log('\nPROCESSING LOGS:');
    console.log('---------------');
    
    data.logs.forEach(logEntry => {
      const timestamp = new Date(logEntry.created_at).toLocaleString();
      const statusSymbol = 
        logEntry.status === 'error' ? '❌' :
        logEntry.status === 'warning' ? '⚠️' :
        logEntry.status === 'success' ? '✅' :
        logEntry.status === 'info' ? 'ℹ️' : '❓';
        
      console.log(`${statusSymbol} [${timestamp}] ${logEntry.operation}: ${logEntry.message}`);
    });
  } else {
    console.log('\nNo processing logs found for this job');
  }
  
  // Display footer with commands
  console.log('\n=======================================================');
  console.log('COMMANDS:');
  console.log('=======================================================');
  console.log('To reset this job:');
  console.log(`  node SCRAPI/utils/one-time/reset-job-status.js ${job.job_id}`);
  console.log('\nTo view the job status dashboard:');
  console.log('  node SCRAPI/utils/active/job-status-dashboard.js');
  console.log('=======================================================');
}

/**
 * Main function
 */
async function main() {
  log('🚀 Starting Job Status Dashboard');
  
  // Check command line arguments
  const command = process.argv[2];
  const jobId = process.argv[3];
  
  if (command === 'job' && jobId) {
    // Get details for a specific job
    const details = await getJobDetails(jobId);
    
    if (details.success) {
      displayJobDetails(details);
    } else {
      log('❌ Error getting job details: ' + details.error);
    }
  } else {
    // Get job status summary
    const summary = await getJobStatusSummary();
    
    if (summary.success) {
      displayDashboard(summary);
    } else {
      log('❌ Error getting job status summary: ' + summary.error);
    }
  }
}

// Run the main function if this file is executed directly
if (require.main === module) {
  main().catch(error => {
    log('❌ Fatal error: ' + error.message);
    process.exit(1);
  });
}

// Export functions for use in other modules
module.exports = {
  getJobStatusSummary,
  getJobDetails,
  displayDashboard,
  displayJobDetails
};