// Oxylabs API Integration - Handles all Oxylabs API interactions
const axios = require('axios');
const https = require('https');

// Import new centralized systems
const { validateAllConfigs, getOxylabsConfig, getSupabaseConfig } = require('../../config/environment.cjs');
const { Logger } = require('../../utils/logging/logger.cjs');
const { handleError, RetryableError } = require('../../utils/error-handling/error-handlers.cjs');

class OxylabsAPI {
  constructor() {
    const validation = validateAllConfigs();
    if (!validation.isValid) {
      throw new Error(`Configuration validation failed: ${validation.errors.join(", ")}`);
    }
    this.config = {
      oxylabs: getOxylabsConfig(),
      supabase: getSupabaseConfig()
    };
    this.logger = new Logger('OxylabsAPI');
    
    // Base configuration
    this.baseURL = 'https://data.oxylabs.io/v1';
    this.realtimeURL = 'https://realtime.oxylabs.io/v1';
    
    // Default timeouts and retry settings
    this.defaultTimeout = 180000; // 3 minutes
    this.defaultMaxRetries = 5;
    this.defaultDelayMs = 2000;
    
    // Validate configuration
    this._validateConfiguration();
  }

  _validateConfiguration() {
    const validation = getOxylabsConfig();
    if (!validation.username || !validation.password) {
      this.logger.error('Invalid Oxylabs configuration');
      this.logger.error('- Missing required Oxylabs configuration values');
      throw new Error('Oxylabs configuration validation failed');
    }
  }

  /**
   * Create a fresh HTTPS agent to avoid socket hang-up issues
   * @private
   */
  _createHTTPSAgent() {
    return new https.Agent({ 
      keepAlive: false,
      timeout: this.defaultTimeout
    });
  }

  /**
   * Make authenticated request to Oxylabs API
   * @param {string} method - HTTP method
   * @param {string} endpoint - API endpoint
   * @param {Object} data - Request data
   * @param {Object} options - Request options
   * @returns {Promise<Object>} API response
   */
  async makeRequest(method, endpoint, data = null, options = {}) {
    const startTime = Date.now();
    const url = endpoint.startsWith('http') ? endpoint : `${this.baseURL}${endpoint}`;
    
    this.logger.info('Making Oxylabs API request', {
      method,
      url,
      hasData: Boolean(data),
      options
    });

    try {
      const config = {
        method,
        url,
        auth: {
          username: this.config.oxylabs.username,
          password: this.config.oxylabs.password
        },
        timeout: options.timeout || this.defaultTimeout,
        httpsAgent: this._createHTTPSAgent(),
        headers: {
          'Content-Type': 'application/json',
          ...options.headers
        },
        ...options
      };

      if (data) {
        config.data = data;
      }

      const response = await axios(config);
      
      const executionTime = Date.now() - startTime;
      this.logger.info('Oxylabs API request successful', {
        method,
        url,
        status: response.status,
        executionTime: `${executionTime}ms`
      });

      return {
        success: true,
        data: response.data,
        status: response.status,
        executionTime
      };

    } catch (error) {
      const executionTime = Date.now() - startTime;
      this.logger.error('Oxylabs API request failed', {
        method,
        url,
        error: error.message,
        status: error.response?.status,
        executionTime: `${executionTime}ms`
      });

      return handleError(error, 'OxylabsAPI.makeRequest', {
        method,
        url,
        executionTime
      });
    }
  }

  /**
   * Submit a scraping job
   * @param {Object} payload - Job payload
   * @param {Object} options - Submission options
   * @returns {Promise<Object>} Job submission result
   */
  async submitJob(payload, options = {}) {
    const startTime = Date.now();
    this.logger.info('Submitting scraping job', { payload });

    try {
      const result = await this.makeRequest('POST', '/queries', payload, options);
      
      if (!result.success) {
        throw new Error(`Job submission failed: ${result.error}`);
      }

      const jobId = result.data.id;
      if (!jobId) {
        throw new Error('No job ID returned from Oxylabs');
      }

      const executionTime = Date.now() - startTime;
      this.logger.info('Scraping job submitted successfully', {
        jobId,
        executionTime: `${executionTime}ms`
      });

      return {
        success: true,
        jobId,
        data: result.data,
        executionTime
      };

    } catch (error) {
      const executionTime = Date.now() - startTime;
      this.logger.error('Job submission failed', {
        payload,
        error: error.message,
        executionTime: `${executionTime}ms`
      });

      return handleError(error, 'OxylabsAPI.submitJob', {
        payload,
        executionTime
      });
    }
  }

  /**
   * Check job status
   * @param {string} jobId - Job ID
   * @returns {Promise<Object>} Job status result
   */
  async getJobStatus(jobId) {
    try {
      const result = await this.makeRequest('GET', `/queries/${jobId}`);
      
      if (!result.success) {
        throw new Error(`Failed to get job status: ${result.error}`);
      }

      const status = result.data.status;
      this.logger.info('Retrieved job status', { jobId, status });

      return {
        success: true,
        jobId,
        status,
        data: result.data
      };

    } catch (error) {
      this.logger.error('Failed to get job status', {
        jobId,
        error: error.message
      });

      return handleError(error, 'OxylabsAPI.getJobStatus', { jobId });
    }
  }

  /**
   * Get job results
   * @param {string} jobId - Job ID
   * @param {string} resultType - Type of results (parsed, raw)
   * @returns {Promise<Object>} Job results
   */
  async getJobResults(jobId, resultType = 'parsed') {
    try {
      const endpoint = `/queries/${jobId}/results?type=${resultType}`;
      const result = await this.makeRequest('GET', endpoint);
      
      if (!result.success) {
        throw new Error(`Failed to get job results: ${result.error}`);
      }

      this.logger.info('Retrieved job results', { 
        jobId, 
        resultType,
        hasResults: Boolean(result.data.results)
      });

      return {
        success: true,
        jobId,
        resultType,
        data: result.data
      };

    } catch (error) {
      this.logger.error('Failed to get job results', {
        jobId,
        resultType,
        error: error.message
      });

      return handleError(error, 'OxylabsAPI.getJobResults', { jobId, resultType });
    }
  }

  /**
   * Wait for job completion and retrieve results
   * @param {string} jobId - Job ID
   * @param {Object} options - Wait options
   * @returns {Promise<Object>} Complete job results
   */
  async waitForCompletion(jobId, options = {}) {
    const startTime = Date.now();
    const maxAttempts = options.maxAttempts || 90;
    const delayMs = options.delayMs || this.defaultDelayMs;
    
    this.logger.info('Waiting for job completion', { 
      jobId, 
      maxAttempts, 
      delayMs 
    });

    let attempts = 0;

    while (attempts < maxAttempts) {
      attempts++;
      
      try {
        // Check job status
        const statusResult = await this.getJobStatus(jobId);
        
        if (!statusResult.success) {
          this.logger.warn('Failed to check job status, retrying', {
            jobId,
            attempt: attempts,
            error: statusResult.error
          });
          await this._delay(delayMs);
          continue;
        }

        const status = statusResult.status;
        this.logger.info('Job status check', { 
          jobId, 
          status, 
          attempt: attempts, 
          maxAttempts 
        });

        // Check if job is complete
        if (status === 'completed' || status === 'done') {
          // Get results
          const resultsResult = await this.getJobResults(jobId, options.resultType || 'parsed');
          
          if (!resultsResult.success) {
            throw new Error(`Failed to retrieve results: ${resultsResult.error}`);
          }

          const executionTime = Date.now() - startTime;
          this.logger.info('Job completed successfully', {
            jobId,
            attempts,
            executionTime: `${executionTime}ms`
          });

          return {
            success: true,
            jobId,
            status,
            data: resultsResult.data,
            attempts,
            executionTime
          };
        }

        // Check for failure states
        if (status === 'failed' || status === 'error') {
          throw new Error(`Job failed with status: ${status}`);
        }

        // Wait before next attempt
        await this._delay(delayMs);

      } catch (error) {
        if (attempts >= maxAttempts) {
          const executionTime = Date.now() - startTime;
          this.logger.error('Job completion wait failed - max attempts reached', {
            jobId,
            attempts,
            error: error.message,
            executionTime: `${executionTime}ms`
          });

          return handleError(error, 'OxylabsAPI.waitForCompletion', {
            jobId,
            attempts,
            maxAttempts,
            executionTime
          });
        }

        this.logger.warn('Error during job wait, retrying', {
          jobId,
          attempt: attempts,
          error: error.message
        });
        
        await this._delay(delayMs);
      }
    }

    // Max attempts reached without completion
    const executionTime = Date.now() - startTime;
    const errorMessage = `Job did not complete within ${maxAttempts} attempts`;
    
    this.logger.error('Job completion timeout', {
      jobId,
      maxAttempts,
      executionTime: `${executionTime}ms`
    });

    return {
      success: false,
      error: errorMessage,
      jobId,
      attempts: maxAttempts,
      executionTime
    };
  }

  /**
   * Submit and wait for job completion (convenience method)
   * @param {Object} payload - Job payload
   * @param {Object} options - Combined options for submission and waiting
   * @returns {Promise<Object>} Complete job result
   */
  async submitAndWait(payload, options = {}) {
    const startTime = Date.now();
    this.logger.info('Starting submit and wait operation', { payload });

    try {
      // Submit job
      const submitResult = await this.submitJob(payload, options);
      
      if (!submitResult.success) {
        throw new Error(`Job submission failed: ${submitResult.error}`);
      }

      // Wait for completion
      const completionResult = await this.waitForCompletion(submitResult.jobId, options);
      
      if (!completionResult.success) {
        throw new Error(`Job completion failed: ${completionResult.error}`);
      }

      const executionTime = Date.now() - startTime;
      this.logger.info('Submit and wait operation completed', {
        jobId: submitResult.jobId,
        totalExecutionTime: `${executionTime}ms`
      });

      return {
        success: true,
        jobId: submitResult.jobId,
        submissionTime: submitResult.executionTime,
        waitTime: completionResult.executionTime,
        totalExecutionTime: executionTime,
        data: completionResult.data
      };

    } catch (error) {
      const executionTime = Date.now() - startTime;
      this.logger.error('Submit and wait operation failed', {
        error: error.message,
        executionTime: `${executionTime}ms`
      });

      return handleError(error, 'OxylabsAPI.submitAndWait', {
        payload,
        executionTime
      });
    }
  }

  /**
   * Submit realtime query
   * @param {Object} payload - Query payload
   * @param {Object} options - Request options
   * @returns {Promise<Object>} Query result
   */
  async submitRealtimeQuery(payload, options = {}) {
    const startTime = Date.now();
    this.logger.info('Submitting realtime query', { payload });

    try {
      const result = await this.makeRequest('POST', 
        `${this.realtimeURL}/queries`, 
        payload, 
        { 
          timeout: options.timeout || 300000, // 5 minutes default for realtime
          ...options 
        }
      );
      
      if (!result.success) {
        throw new Error(`Realtime query failed: ${result.error}`);
      }

      const executionTime = Date.now() - startTime;
      this.logger.info('Realtime query completed', {
        executionTime: `${executionTime}ms`,
        hasResults: Boolean(result.data.results)
      });

      return {
        success: true,
        data: result.data,
        executionTime
      };

    } catch (error) {
      const executionTime = Date.now() - startTime;
      this.logger.error('Realtime query failed', {
        payload,
        error: error.message,
        executionTime: `${executionTime}ms`
      });

      return handleError(error, 'OxylabsAPI.submitRealtimeQuery', {
        payload,
        executionTime
      });
    }
  }

  /**
   * Delay helper function
   * @private
   */
  async _delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Get API statistics and health
   */
  getStats() {
    const config = getOxylabsConfig();
    return {
      configurationValid: Boolean(config.username && config.password),
      credentialsConfigured: Boolean(config.username && config.password),
      baseURL: this.baseURL,
      realtimeURL: this.realtimeURL,
      defaultTimeout: this.defaultTimeout,
      defaultMaxRetries: this.defaultMaxRetries
    };
  }
}

// Export both class and convenience functions for backward compatibility
const oxylabsAPI = new OxylabsAPI();

/**
 * Legacy compatibility functions
 */
async function makeOxylabsRequest(url, payload, options = {}) {
  const result = await oxylabsAPI.submitAndWait(payload, options);
  if (result.success) {
    return result.data;
  } else {
    throw new Error(result.error);
  }
}

async function getJobResultsEnhanced(jobId, options = {}) {
  const result = await oxylabsAPI.waitForCompletion(jobId, options);
  if (result.success) {
    return result.data;
  } else {
    throw new Error(result.error);
  }
}

module.exports = {
  OxylabsAPI,
  makeOxylabsRequest,
  getJobResultsEnhanced
};

// CLI support for direct execution
if (require.main === module) {
  const action = process.argv[2];
  
  if (action === 'test') {
    oxylabsAPI.getJobStatus('test-job-id').then(result => {
      console.log('Test result:', JSON.stringify(result, null, 2));
    }).catch(error => {
      console.error('Test failed:', error);
    });
  } else {
    console.log('Available actions: test');
    console.log('Usage: node oxylabs-api.cjs <action>');
  }
}
