// job-tracking-service.cjs - Modernized job tracking service with enhanced capabilities
const path = require('path');
const { validateAllConfigs, getOxylabsConfig, getSupabaseConfig } = require('../../config/environment.cjs');
const { createLogger } = require('../../utils/logging/logger.cjs');
const { ErrorHandler, handleAsyncError } = require('../../utils/error-handling/error-handlers.cjs');
const { SupabaseAPI } = require('../../api/supabase/supabase-api.cjs');

/**
 * Job Tracking Service - Manages job status tracking in the database
 */
class JobTrackingService {
  constructor() {
    const validation = validateAllConfigs();
    if (!validation.isValid) {
      throw new Error(`Configuration validation failed: ${validation.errors.join(", ")}`);
    }
    this.config = {
      oxylabs: getOxylabsConfig(),
      supabase: getSupabaseConfig()
    };
    this.logger = createLogger('JobTrackingService');
    this.errorHandler = new ErrorHandler(this.logger);
    this.supabaseAPI = new SupabaseAPI(this.config, this.logger);
    
    this.logger.info('JobTrackingService initialized', {
      component: 'JobTrackingService',
      version: '2.0.0'
    });
  }

  /**
   * Validate job tracking data
   * @param {string} jobId - The Oxylabs job ID
   * @param {string} query - The search query
   * @param {string} location - The search location
   * @returns {Object} - Validation result
   */
  validateJobTrackingData(jobId, query, location) {
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
  async createJobTracking(jobId, query, location) {
    return handleAsyncError(async () => {
      // Validate input data
      const validation = this.validateJobTrackingData(jobId, query, location);
      if (!validation.isValid) {
        this.logger.error('Invalid job tracking data', { 
          jobId, 
          query, 
          location, 
          errors: validation.errors 
        });
        return { success: false, error: { message: validation.errors.join(', ') } };
      }

      this.logger.info('Creating job tracking record', { jobId, query, location });
      
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

      this.logger.debug('Inserting job tracking record', { data: insertData });

      // Create job tracking record
      const result = await this.supabaseAPI.insertJobTracking(insertData);
      
      if (!result.success) {
        this.logger.error('Failed to create job tracking record', { 
          error: result.error,
          jobId,
          query,
          location
        });
        return result;
      }
      
      this.logger.info('Job tracking record created successfully', { 
        jobId,
        recordId: result.data.id 
      });
      
      return result;
    }, this.errorHandler, 'createJobTracking');
  }

  /**
   * Update the API call status for a job
   * @param {string} jobId - The Oxylabs job ID
   * @param {string} status - The API call status (success, failed, in_progress)
   * @param {string} errorMessage - Optional error message
   * @returns {Promise<Object>} - The updated job tracking record
   */
  async updateApiCallStatus(jobId, status, errorMessage = null) {
    return handleAsyncError(async () => {
      if (!jobId || typeof jobId !== 'string') {
        this.logger.error('Invalid job ID provided for API call status update', { jobId });
        return { success: false, error: { message: 'Invalid job ID' } };
      }

      this.logger.info('Updating API call status', { jobId, status, errorMessage });
      
      const updateData = {
        api_call_status: status,
        ...(status === 'in_progress' && { status: 'in_progress' }),
        ...(errorMessage && { error_message: errorMessage })
      };

      const result = await this.supabaseAPI.updateJobTracking(jobId, updateData);
      
      if (!result.success) {
        this.logger.error('Failed to update API call status', { 
          error: result.error,
          jobId,
          status
        });
        return result;
      }
      
      this.logger.info('API call status updated successfully', { jobId, status });
      return result;
    }, this.errorHandler, 'updateApiCallStatus');
  }

  /**
   * Update the SERP processing status for a job
   * @param {string} jobId - The Oxylabs job ID
   * @param {string} status - The SERP processing status (success, failed, in_progress)
   * @param {number} serpId - The SERP ID (optional)
   * @param {string} errorMessage - Optional error message
   * @returns {Promise<Object>} - The updated job tracking record
   */
  async updateSerpProcessingStatus(jobId, status, serpId = null, errorMessage = null) {
    return handleAsyncError(async () => {
      if (!jobId || typeof jobId !== 'string') {
        this.logger.error('Invalid job ID provided for SERP processing status update', { jobId });
        return { success: false, error: { message: 'Invalid job ID' } };
      }

      this.logger.info('Updating SERP processing status', { jobId, status, serpId, errorMessage });
      
      const updateData = {
        serp_processing_status: status,
        ...(serpId && { serp_id: serpId }),
        ...(errorMessage && { error_message: errorMessage })
      };

      const result = await this.supabaseAPI.updateJobTracking(jobId, updateData);
      
      if (!result.success) {
        this.logger.error('Failed to update SERP processing status', { 
          error: result.error,
          jobId,
          status
        });
        return result;
      }
      
      this.logger.info('SERP processing status updated successfully', { jobId, status, serpId });
      return result;
    }, this.errorHandler, 'updateSerpProcessingStatus');
  }

  /**
   * Update the ads extraction status for a job
   * @param {string} jobId - The Oxylabs job ID
   * @param {string} status - The ads extraction status (success, failed, in_progress, partial_success)
   * @param {number} newAdsCount - Number of new ads found
   * @param {number} newAdvertisersCount - Number of new advertisers found
   * @param {string} errorMessage - Optional error message
   * @returns {Promise<Object>} - The updated job tracking record
   */
  async updateAdsExtractionStatus(jobId, status, newAdsCount = 0, newAdvertisersCount = 0, errorMessage = null) {
    return handleAsyncError(async () => {
      if (!jobId || typeof jobId !== 'string') {
        this.logger.error('Invalid job ID provided for ads extraction status update', { jobId });
        return { success: false, error: { message: 'Invalid job ID' } };
      }

      this.logger.info('Updating ads extraction status', { 
        jobId, 
        status, 
        newAdsCount, 
        newAdvertisersCount, 
        errorMessage 
      });
      
      const updateData = {
        ads_extraction_status: status,
        new_ads_count: newAdsCount,
        new_advertisers_count: newAdvertisersCount,
        ...(errorMessage && { error_message: errorMessage })
      };

      const result = await this.supabaseAPI.updateJobTracking(jobId, updateData);
      
      if (!result.success) {
        this.logger.error('Failed to update ads extraction status', { 
          error: result.error,
          jobId,
          status
        });
        return result;
      }
      
      this.logger.info('Ads extraction status updated successfully', { 
        jobId, 
        status, 
        newAdsCount, 
        newAdvertisersCount 
      });
      return result;
    }, this.errorHandler, 'updateAdsExtractionStatus');
  }

  /**
   * Update the rendering status for a job
   * @param {string} jobId - The Oxylabs job ID
   * @param {string} status - The rendering status (success, failed, in_progress, partial_success)
   * @param {string} errorMessage - Optional error message
   * @returns {Promise<Object>} - The updated job tracking record
   */
  async updateRenderingStatus(jobId, status, errorMessage = null) {
    return handleAsyncError(async () => {
      if (!jobId || typeof jobId !== 'string') {
        this.logger.error('Invalid job ID provided for rendering status update', { jobId });
        return { success: false, error: { message: 'Invalid job ID' } };
      }

      this.logger.info('Updating rendering status', { jobId, status, errorMessage });
      
      const updateData = {
        rendering_status: status,
        ...(status === 'success' && { 
          status: 'completed',
          completed_at: new Date().toISOString()
        }),
        ...(status === 'failed' && { 
          status: 'failed',
          completed_at: new Date().toISOString()
        }),
        ...(errorMessage && { error_message: errorMessage })
      };

      const result = await this.supabaseAPI.updateJobTracking(jobId, updateData);
      
      if (!result.success) {
        this.logger.error('Failed to update rendering status', { 
          error: result.error,
          jobId,
          status
        });
        return result;
      }
      
      this.logger.info('Rendering status updated successfully', { jobId, status });
      return result;
    }, this.errorHandler, 'updateRenderingStatus');
  }

  /**
   * Get a job tracking record by job ID
   * @param {string} jobId - The Oxylabs job ID
   * @returns {Promise<Object>} - The job tracking record
   */
  async getJobTracking(jobId) {
    return handleAsyncError(async () => {
      if (!jobId || typeof jobId !== 'string') {
        this.logger.error('Invalid job ID provided for job tracking retrieval', { jobId });
        return { success: false, error: { message: 'Invalid job ID' } };
      }

      this.logger.debug('Getting job tracking record', { jobId });
      
      const result = await this.supabaseAPI.getJobTracking(jobId);
      
      if (!result.success) {
        this.logger.error('Failed to get job tracking record', { 
          error: result.error,
          jobId
        });
        return result;
      }
      
      this.logger.debug('Job tracking record retrieved successfully', { jobId });
      return result;
    }, this.errorHandler, 'getJobTracking');
  }

  /**
   * Get all job tracking records with pagination
   * @param {number} limit - Optional limit of records to return
   * @param {number} offset - Optional offset for pagination
   * @returns {Promise<Object>} - The job tracking records
   */
  async getAllJobTracking(limit = 100, offset = 0) {
    return handleAsyncError(async () => {
      if (!Number.isInteger(limit) || limit < 1) {
        this.logger.error('Invalid limit provided', { limit });
        return { success: false, error: { message: 'Invalid limit' } };
      }

      if (!Number.isInteger(offset) || offset < 0) {
        this.logger.error('Invalid offset provided', { offset });
        return { success: false, error: { message: 'Invalid offset' } };
      }

      this.logger.debug('Getting all job tracking records', { limit, offset });
      
      const result = await this.supabaseAPI.getAllJobTracking(limit, offset);
      
      if (!result.success) {
        this.logger.error('Failed to get job tracking records', { 
          error: result.error,
          limit,
          offset
        });
        return result;
      }
      
      this.logger.debug('Job tracking records retrieved successfully', { 
        count: result.data?.length || 0,
        limit,
        offset
      });
      return result;
    }, this.errorHandler, 'getAllJobTracking');
  }

  /**
   * Get job tracking statistics
   * @returns {Promise<Object>} - The job tracking statistics
   */
  async getJobTrackingStats() {
    return handleAsyncError(async () => {
      this.logger.debug('Getting job tracking statistics');
      
      const result = await this.supabaseAPI.getJobTrackingStats();
      
      if (!result.success) {
        this.logger.error('Failed to get job tracking statistics', { 
          error: result.error
        });
        return result;
      }
      
      this.logger.debug('Job tracking statistics retrieved successfully', {
        totalCount: result.data?.totalCount || 0
      });
      return result;
    }, this.errorHandler, 'getJobTrackingStats');
  }

  /**
   * Update job status to completed or failed
   * @param {string} jobId - The Oxylabs job ID
   * @param {string} status - The final status (completed, failed, partial_success)
   * @param {string} errorMessage - Optional error message
   * @returns {Promise<Object>} - The updated job tracking record
   */
  async completeJob(jobId, status = 'completed', errorMessage = null) {
    return handleAsyncError(async () => {
      if (!jobId || typeof jobId !== 'string') {
        this.logger.error('Invalid job ID provided for job completion', { jobId });
        return { success: false, error: { message: 'Invalid job ID' } };
      }

      this.logger.info('Completing job', { jobId, status, errorMessage });
      
      const updateData = {
        status: status,
        completed_at: new Date().toISOString(),
        ...(errorMessage && { error_message: errorMessage })
      };

      const result = await this.supabaseAPI.updateJobTracking(jobId, updateData);
      
      if (!result.success) {
        this.logger.error('Failed to complete job', { 
          error: result.error,
          jobId,
          status
        });
        return result;
      }
      
      this.logger.info('Job completed successfully', { jobId, status });
      return result;
    }, this.errorHandler, 'completeJob');
  }
}

module.exports = {
  JobTrackingService
};
