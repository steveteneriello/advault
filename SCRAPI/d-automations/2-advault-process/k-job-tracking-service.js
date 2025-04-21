// JobTrackingService.js - Service for tracking job status in the database
const fs = require('fs');
const path = require('path');
const { supabase, supabaseAdmin } = require('../../utils/supabase-helper');
require('dotenv').config();

// Directory for logs
const LOGS_DIR = path.join(process.cwd(), 'SCRAPI', 'output-staging', 'logs');
if (!fs.existsSync(LOGS_DIR)) {
  fs.mkdirSync(LOGS_DIR, { recursive: true });
}

// Log file for job tracking
const JOB_TRACKING_LOG_FILE = path.join(LOGS_DIR, `job-tracking-${new Date().toISOString().replace(/[:.]/g, '-')}.log`);

/**
 * Log message to both console and file
 * @param {string} message - Message to log
 * @param {Object} [data] - Optional data to log
 */
function log(message, data = null) {
  const timestamp = new Date().toISOString();
  let logMessage = `[${timestamp}] ${message}`;
  
  if (data) {
    logMessage += `\nData: ${JSON.stringify(data, null, 2)}`;
  }
  
  console.log(logMessage);
  fs.appendFileSync(JOB_TRACKING_LOG_FILE, logMessage + '\n');
}

/**
 * Validate job tracking data
 * @param {string} jobId - The Oxylabs job ID
 * @param {string} query - The search query
 * @param {string} location - The search location
 * @returns {Object} - Validation result
 */
function validateJobTrackingData(jobId, query, location) {
  const errors = [];

  if (!jobId || typeof jobId !== 'string') {
    errors.push('Job ID is required and must be a string');
  }

  if (!query || typeof query !== 'string') {
    errors.push('Query is required and must be a string');
  }

  if (!location || typeof location !== 'string') {
    errors.push('Location is required and must be a string');
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * Create a new job tracking record
 * @param {string} jobId - The Oxylabs job ID
 * @param {string} query - The search query
 * @param {string} location - The search location
 * @returns {Promise<Object>} - The created job tracking record
 */
async function createJobTracking(jobId, query, location) {
  // Validate input data
  const validation = validateJobTrackingData(jobId, query, location);
  if (!validation.isValid) {
    log('Invalid job tracking data', { errors: validation.errors });
    return { success: false, error: { message: validation.errors.join(', ') } };
  }

  log(`Creating job tracking record for job ${jobId}`, { jobId, query, location });
  
  try {
    // Prepare insert data
    const insertData = {
      job_id: jobId,
      query: query,
      location: location,
      status: 'pending',
      api_call_status: 'pending',
      serp_processing_status: 'pending',
      ads_extraction_status: 'pending',
      rendering_status: 'pending'
    };

    log('Inserting job tracking record', { data: insertData });

    // Use admin client for write operations to bypass RLS
    const { data, error } = await supabaseAdmin
      .from('job_tracking')
      .insert(insertData)
      .select()
      .single();
      
    if (error) {
      log(`Error creating job tracking record: ${error.message}`, { error });
      return { success: false, error };
    }
    
    log(`✅ Job tracking record created with ID: ${data.id}`, { data });
    return { success: true, data };
  } catch (error) {
    log(`Unexpected error creating job tracking record: ${error.message}`, { error });
    return { success: false, error };
  }
}

/**
 * Update the API call status for a job
 * @param {string} jobId - The Oxylabs job ID
 * @param {string} status - The API call status (success, failed, in_progress)
 * @param {string} errorMessage - Optional error message
 * @returns {Promise<Object>} - The updated job tracking record
 */
async function updateApiCallStatus(jobId, status, errorMessage = null) {
  if (!jobId || typeof jobId !== 'string') {
    log('Invalid job ID provided', { jobId });
    return { success: false, error: { message: 'Invalid job ID' } };
  }

  if (!['success', 'failed', 'in_progress'].includes(status)) {
    log('Invalid status provided', { status });
    return { success: false, error: { message: 'Invalid status' } };
  }

  log(`Updating API call status for job ${jobId} to ${status}`, { jobId, status, errorMessage });
  
  try {
    const updateData = {
      api_call_status: status
    };
    
    if (errorMessage) {
      updateData.error_message = errorMessage;
    }
    
    log('Updating job tracking record', { data: updateData });

    // Use admin client for write operations to bypass RLS
    const { data, error } = await supabaseAdmin
      .from('job_tracking')
      .update(updateData)
      .eq('job_id', jobId)
      .select()
      .single();
      
    if (error) {
      log(`Error updating API call status: ${error.message}`, { error });
      return { success: false, error };
    }
    
    log(`✅ API call status updated to ${status}`, { data });
    return { success: true, data };
  } catch (error) {
    log(`Unexpected error updating API call status: ${error.message}`, { error });
    return { success: false, error };
  }
}

/**
 * Update the SERP processing status for a job
 * @param {string} jobId - The Oxylabs job ID
 * @param {string} status - The SERP processing status (success, failed, in_progress)
 * @param {string} serpId - Optional SERP ID if successful
 * @param {string} errorMessage - Optional error message
 * @returns {Promise<Object>} - The updated job tracking record
 */
async function updateSerpProcessingStatus(jobId, status, serpId = null, errorMessage = null) {
  if (!jobId || typeof jobId !== 'string') {
    log('Invalid job ID provided', { jobId });
    return { success: false, error: { message: 'Invalid job ID' } };
  }

  if (!['success', 'failed', 'in_progress'].includes(status)) {
    log('Invalid status provided', { status });
    return { success: false, error: { message: 'Invalid status' } };
  }

  log(`Updating SERP processing status for job ${jobId} to ${status}`, { 
    jobId, 
    status, 
    serpId, 
    errorMessage 
  });
  
  try {
    const updateData = {
      serp_processing_status: status
    };
    
    if (serpId) {
      updateData.serp_id = serpId;
    }
    
    if (errorMessage) {
      updateData.error_message = errorMessage;
    }
    
    log('Updating job tracking record', { data: updateData });

    // Use admin client for write operations to bypass RLS
    const { data, error } = await supabaseAdmin
      .from('job_tracking')
      .update(updateData)
      .eq('job_id', jobId)
      .select()
      .single();
      
    if (error) {
      log(`Error updating SERP processing status: ${error.message}`, { error });
      return { success: false, error };
    }
    
    log(`✅ SERP processing status updated to ${status}`, { data });
    return { success: true, data };
  } catch (error) {
    log(`Unexpected error updating SERP processing status: ${error.message}`, { error });
    return { success: false, error };
  }
}

/**
 * Update the ads extraction status for a job
 * @param {string} jobId - The Oxylabs job ID
 * @param {string} status - The ads extraction status (success, failed, in_progress)
 * @param {number} newAdsCount - Optional count of new ads
 * @param {number} newAdvertisersCount - Optional count of new advertisers
 * @param {string} errorMessage - Optional error message
 * @returns {Promise<Object>} - The updated job tracking record
 */
async function updateAdsExtractionStatus(jobId, status, newAdsCount = 0, newAdvertisersCount = 0, errorMessage = null) {
  if (!jobId || typeof jobId !== 'string') {
    log('Invalid job ID provided', { jobId });
    return { success: false, error: { message: 'Invalid job ID' } };
  }

  if (!['success', 'failed', 'in_progress'].includes(status)) {
    log('Invalid status provided', { status });
    return { success: false, error: { message: 'Invalid status' } };
  }

  log(`Updating ads extraction status for job ${jobId} to ${status}`, {
    jobId,
    status,
    newAdsCount,
    newAdvertisersCount,
    errorMessage
  });
  
  try {
    const updateData = {
      ads_extraction_status: status,
      new_ads_count: newAdsCount,
      new_advertisers_count: newAdvertisersCount
    };
    
    if (errorMessage) {
      updateData.error_message = errorMessage;
    }
    
    log('Updating job tracking record', { data: updateData });

    // Use admin client for write operations to bypass RLS
    const { data, error } = await supabaseAdmin
      .from('job_tracking')
      .update(updateData)
      .eq('job_id', jobId)
      .select()
      .single();
      
    if (error) {
      log(`Error updating ads extraction status: ${error.message}`, { error });
      return { success: false, error };
    }
    
    log(`✅ Ads extraction status updated to ${status}`, { data });
    return { success: true, data };
  } catch (error) {
    log(`Unexpected error updating ads extraction status: ${error.message}`, { error });
    return { success: false, error };
  }
}

/**
 * Update the rendering status for a job
 * @param {string} jobId - The Oxylabs job ID
 * @param {string} status - The rendering status (success, failed, in_progress, partial_success)
 * @param {string} errorMessage - Optional error message
 * @returns {Promise<Object>} - The updated job tracking record
 */
async function updateRenderingStatus(jobId, status, errorMessage = null) {
  if (!jobId || typeof jobId !== 'string') {
    log('Invalid job ID provided', { jobId });
    return { success: false, error: { message: 'Invalid job ID' } };
  }

  if (!['success', 'failed', 'in_progress', 'partial_success'].includes(status)) {
    log('Invalid status provided', { status });
    return { success: false, error: { message: 'Invalid status' } };
  }

  log(`Updating rendering status for job ${jobId} to ${status}`, {
    jobId,
    status,
    errorMessage
  });
  
  try {
    const updateData = {
      rendering_status: status
    };
    
    if (errorMessage) {
      updateData.error_message = errorMessage;
    }
    
    // If status is success or partial_success, set completed_at
    if (status === 'success' || status === 'partial_success') {
      updateData.completed_at = new Date().toISOString();
    }
    
    log('Updating job tracking record', { data: updateData });

    // Use admin client for write operations to bypass RLS
    const { data, error } = await supabaseAdmin
      .from('job_tracking')
      .update(updateData)
      .eq('job_id', jobId)
      .select()
      .single();
      
    if (error) {
      log(`Error updating rendering status: ${error.message}`, { error });
      return { success: false, error };
    }
    
    log(`✅ Rendering status updated to ${status}`, { data });
    return { success: true, data };
  } catch (error) {
    log(`Unexpected error updating rendering status: ${error.message}`, { error });
    return { success: false, error };
  }
}

/**
 * Get a job tracking record by job ID
 * @param {string} jobId - The Oxylabs job ID
 * @returns {Promise<Object>} - The job tracking record
 */
async function getJobTracking(jobId) {
  if (!jobId || typeof jobId !== 'string') {
    log('Invalid job ID provided', { jobId });
    return { success: false, error: { message: 'Invalid job ID' } };
  }

  log(`Getting job tracking record for job ${jobId}`, { jobId });
  
  try {
    const { data, error } = await supabase
      .from('job_tracking')
      .select('*')
      .eq('job_id', jobId)
      .single();
      
    if (error) {
      log(`Error getting job tracking record: ${error.message}`, { error });
      return { success: false, error };
    }
    
    return { success: true, data };
  } catch (error) {
    log(`Unexpected error getting job tracking record: ${error.message}`, { error });
    return { success: false, error };
  }
}

/**
 * Get all job tracking records
 * @param {number} limit - Optional limit of records to return
 * @param {number} offset - Optional offset for pagination
 * @returns {Promise<Object>} - The job tracking records
 */
async function getAllJobTracking(limit = 100, offset = 0) {
  if (!Number.isInteger(limit) || limit < 1) {
    log('Invalid limit provided', { limit });
    return { success: false, error: { message: 'Invalid limit' } };
  }

  if (!Number.isInteger(offset) || offset < 0) {
    log('Invalid offset provided', { offset });
    return { success: false, error: { message: 'Invalid offset' } };
  }

  log(`Getting all job tracking records (limit: ${limit}, offset: ${offset})`, {
    limit,
    offset
  });
  
  try {
    const { data, error, count } = await supabase
      .from('job_tracking')
      .select('*', { count: 'exact' })
      .order('started_at', { ascending: false })
      .range(offset, offset + limit - 1);
      
    if (error) {
      log(`Error getting job tracking records: ${error.message}`, { error });
      return { success: false, error };
    }
    
    return { success: true, data, count };
  } catch (error) {
    log(`Unexpected error getting job tracking records: ${error.message}`, { error });
    return { success: false, error };
  }
}

/**
 * Get job tracking statistics
 * @returns {Promise<Object>} - The job tracking statistics
 */
async function getJobTrackingStats() {
  log('Getting job tracking statistics');
  
  try {
    // Get total count
    const { count: totalCount, error: countError } = await supabase
      .from('job_tracking')
      .select('*', { count: 'exact', head: true });
      
    if (countError) {
      log(`Error getting total count: ${countError.message}`, { error: countError });
      return { success: false, error: countError };
    }
    
    // Get counts by status
    const { data: statusCounts, error: statusError } = await supabase
      .rpc('execute_sql', {
        sql_statement: `
          SELECT status, COUNT(*) as count
          FROM job_tracking
          GROUP BY status
        `
      });
      
    if (statusError) {
      log(`Error getting status counts: ${statusError.message}`, { error: statusError });
      return { success: false, error: statusError };
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
        `
      });
      
    if (stepError) {
      log(`Error getting step counts: ${stepError.message}`, { error: stepError });
      return { success: false, error: stepError };
    }
    
    // Get recent jobs
    const { data: recentJobs, error: recentError } = await supabase
      .from('job_tracking')
      .select('*')
      .order('started_at', { ascending: false })
      .limit(10);
      
    if (recentError) {
      log(`Error getting recent jobs: ${recentError.message}`, { error: recentError });
      return { success: false, error: recentError };
    }
    
    const stats = {
      totalCount,
      statusCounts: statusCounts || [],
      stepCounts: stepCounts || [],
      recentJobs: recentJobs || []
    };

    log('Successfully retrieved job tracking statistics', { stats });
    
    return { 
      success: true, 
      data: stats
    };
  } catch (error) {
    log(`Unexpected error getting job tracking statistics: ${error.message}`, { error });
    return { success: false, error };
  }
}

module.exports = {
  createJobTracking,
  updateApiCallStatus,
  updateSerpProcessingStatus,
  updateAdsExtractionStatus,
  updateRenderingStatus,
  getJobTracking,
  getAllJobTracking,
  getJobTrackingStats,
  log
};