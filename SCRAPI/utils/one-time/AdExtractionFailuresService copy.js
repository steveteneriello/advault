// AdExtractionFailuresService.js - Service for managing ad extraction failures
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

// Initialize Supabase client
const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Supabase credentials not found in environment variables');
  process.exit(1);
}

// Create regular client for read operations
const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false
  }
});

// Create admin client with service role key for write operations
const supabaseAdmin = supabaseServiceKey ? 
  createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false
    }
  }) : 
  supabase;

/**
 * Get all extraction failures
 * @param {number} limit - Optional limit of records to return
 * @param {number} offset - Optional offset for pagination
 * @returns {Promise<Object>} - The extraction failures
 */
async function getAllExtractionFailures(limit = 100, offset = 0) {
  console.log(`Getting all extraction failures (limit: ${limit}, offset: ${offset})`);
  
  try {
    const { data, error, count } = await supabase
      .from('ad_extraction_failures')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);
      
    if (error) {
      console.error('Error getting extraction failures:', error);
      return { success: false, error };
    }
    
    return { success: true, data, count };
  } catch (error) {
    console.error('Unexpected error getting extraction failures:', error);
    return { success: false, error };
  }
}

/**
 * Get extraction failures for a specific job
 * @param {string} jobId - The job ID
 * @returns {Promise<Object>} - The extraction failures for the job
 */
async function getExtractionFailuresForJob(jobId) {
  console.log(`Getting extraction failures for job ${jobId}`);
  
  try {
    const { data, error } = await supabase
      .from('ad_extraction_failures')
      .select('*')
      .eq('job_id', jobId)
      .order('created_at', { ascending: false });
      
    if (error) {
      console.error('Error getting extraction failures for job:', error);
      return { success: false, error };
    }
    
    return { success: true, data };
  } catch (error) {
    console.error('Unexpected error getting extraction failures for job:', error);
    return { success: false, error };
  }
}

/**
 * Reprocess extraction failures for a job
 * @param {string} jobId - The job ID
 * @returns {Promise<Object>} - The result of the reprocessing
 */
async function reprocessExtractionFailures(jobId) {
  console.log(`Reprocessing extraction failures for job ${jobId}`);
  
  try {
    const { data, error } = await supabaseAdmin
      .rpc('reprocess_extraction_failures', { p_job_id: jobId });
      
    if (error) {
      console.error('Error reprocessing extraction failures:', error);
      return { success: false, error };
    }
    
    return { success: true, message: data };
  } catch (error) {
    console.error('Unexpected error reprocessing extraction failures:', error);
    return { success: false, error };
  }
}

/**
 * Get extraction failures statistics
 * @returns {Promise<Object>} - The extraction failures statistics
 */
async function getExtractionFailuresStats() {
  console.log('Getting extraction failures statistics');
  
  try {
    // Get total count
    const { count: totalCount, error: countError } = await supabase
      .from('ad_extraction_failures')
      .select('*', { count: 'exact', head: true });
      
    if (countError) {
      console.error('Error getting total count:', countError);
      return { success: false, error: countError };
    }
    
    // Get counts by processed status
    const { data: processedCounts, error: processedError } = await supabase
      .rpc('execute_sql', {
        sql_statement: `
          SELECT processed, COUNT(*) as count
          FROM ad_extraction_failures
          GROUP BY processed
        `
      });
      
    if (processedError) {
      console.error('Error getting processed counts:', processedError);
      return { success: false, error: processedError };
    }
    
    // Get counts by failure reason
    const { data: reasonCounts, error: reasonError } = await supabase
      .rpc('execute_sql', {
        sql_statement: `
          SELECT failure_reason, COUNT(*) as count
          FROM ad_extraction_failures
          GROUP BY failure_reason
          ORDER BY count DESC
        `
      });
      
    if (reasonError) {
      console.error('Error getting reason counts:', reasonError);
      return { success: false, error: reasonError };
    }
    
    // Get counts by job
    const { data: jobCounts, error: jobError } = await supabase
      .rpc('execute_sql', {
        sql_statement: `
          SELECT job_id, query, COUNT(*) as count
          FROM ad_extraction_failures
          GROUP BY job_id, query
          ORDER BY count DESC
        `
      });
      
    if (jobError) {
      console.error('Error getting job counts:', jobError);
      return { success: false, error: jobError };
    }
    
    // Get recent failures
    const { data: recentFailures, error: recentError } = await supabase
      .from('ad_extraction_failures')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(10);
      
    if (recentError) {
      console.error('Error getting recent failures:', recentError);
      return { success: false, error: recentError };
    }
    
    return { 
      success: true, 
      data: {
        totalCount,
        processedCounts: processedCounts || [],
        reasonCounts: reasonCounts || [],
        jobCounts: jobCounts || [],
        recentFailures: recentFailures || []
      }
    };
  } catch (error) {
    console.error('Unexpected error getting extraction failures statistics:', error);
    return { success: false, error };
  }
}

module.exports = {
  getAllExtractionFailures,
  getExtractionFailuresForJob,
  reprocessExtractionFailures,
  getExtractionFailuresStats,
  supabase,
  supabaseAdmin
};