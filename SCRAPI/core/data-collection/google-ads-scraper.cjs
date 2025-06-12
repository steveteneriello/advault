// Google Ads Scraper - Core data collection component
const axios = require('axios');
const fs = require('fs');
const path = require('path');
const https = require('https');

// Import new centralized systems
const { validateAllConfigs, getOxylabsConfig, getSupabaseConfig } = require('../../config/environment.cjs');
const { Logger } = require('../../utils/logging/logger.cjs');
const { RetryableError, handleError } = require('../../utils/error-handling/error-handlers.cjs');

// Legacy compatibility imports
const { makeOxylabsRequest, getJobResultsEnhanced } = require('../../utils/connection-helper.cjs');
const { getSupabaseHeaders } = require('../../utils/getSupabaseHeaders.cjs');
const { getJobDirectories } = require('../../utils/job-directory-manager.cjs');

class GoogleAdsScraper {
  constructor() {
    // Validate configurations first
    const validation = validateAllConfigs();
    if (!validation.isValid) {
      throw new Error(`Configuration validation failed: ${validation.errors.join(', ')}`);
    }
    
    this.config = {
      oxylabs: getOxylabsConfig(),
      supabase: getSupabaseConfig()
    };
    this.logger = new Logger('GoogleAdsScraper');
    this.httpsAgent = new https.Agent({
      keepAlive: true,
      maxSockets: 10,
      timeout: 30000
    });
  }

  /**
   * Run the Google Ads scraper for a specific query and location
   * @param {string} query - Search query
   * @param {string} location - Geographic location
   * @returns {Promise<Object>} Scraping result
   */
  async runScraper(query = 'plumbers near me', location = 'Boston, Massachusetts, United States') {
    const startTime = Date.now();
    this.logger.info('Starting Google Ads scraper', { query, location });

    const payload = {
      source: 'google_ads',
      query: query,
      geo_location: location,
      device: 'desktop',
      parse: true,
      start_page: 1,
      pages: 2,
      locale: 'en-US',
      user_agent_type: 'desktop',
      context: [
        { key: 'ad_extraction', value: 'true' }
      ]
    };

    try {
      this.logger.info('Sending request to Oxylabs', {
        url: 'https://data.oxylabs.io/v1/queries',
        payload: JSON.stringify(payload, null, 2),
        oxylabsCredentialsAvailable: Boolean(this.config.oxylabs.username)
      });

      // Submit job to Oxylabs
      const response = await makeOxylabsRequest('https://data.oxylabs.io/v1/queries', payload, {
        username: this.config.oxylabs.username,
        password: this.config.oxylabs.password,
        timeout: 1200000, // 20 minutes
        maxRetries: 5
      });

      this.logger.info(`Job created successfully`, { jobId: response.id });
      
      // Wait for and retrieve results
      const results = await getJobResultsEnhanced(response.id, {
        username: this.config.oxylabs.username,
        password: this.config.oxylabs.password,
        maxAttempts: 120,
        baseDelay: 2000,
        timeout: 1200000
      });

      // Save results
      const savedPaths = await this._saveResults(response, results, query, location);
      
      // Stage results for processing
      await this._stageResults(response.id, query, location, results);

      const executionTime = Date.now() - startTime;
      this.logger.info('Scraping completed successfully', {
        jobId: response.id,
        executionTime: `${executionTime}ms`,
        resultsPaths: savedPaths
      });

      return {
        success: true,
        jobId: response.id,
        metadataPath: savedPaths.metadataPath,
        resultsPath: savedPaths.resultsPath,
        executionTime
      };

    } catch (error) {
      const executionTime = Date.now() - startTime;
      this.logger.error('Scraping failed', {
        error: error.message,
        executionTime: `${executionTime}ms`,
        query,
        location
      });

      return handleError(error, 'GoogleAdsScraper.runScraper', {
        query,
        location,
        executionTime
      });
    }
  }

  /**
   * Save scraping results to both new and legacy directories
   * @private
   */
  async _saveResults(response, results, query, location) {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    
    // Create job-specific directories (new structure)
    const jobDirs = getJobDirectories(response.id);
    this.logger.info(`Created job directories in: ${jobDirs.jobDir}`);

    // Save to new structure
    const metadataPath = path.join(jobDirs['scraper-results'], `job-metadata-${timestamp}.json`);
    const resultsPath = path.join(jobDirs['scraper-results'], `ads-results-${timestamp}.json`);
    
    fs.writeFileSync(metadataPath, JSON.stringify(response, null, 2));
    fs.writeFileSync(resultsPath, JSON.stringify(results, null, 2));

    // Also save to legacy directory for backward compatibility
    const standardDir = path.join(process.cwd(), 'SCRAPI', 'output-staging', 'scraper-results');
    if (!fs.existsSync(standardDir)) {
      fs.mkdirSync(standardDir, { recursive: true });
    }
    
    const standardMetadataPath = path.join(standardDir, `job-metadata-${timestamp}.json`);
    const standardResultsPath = path.join(standardDir, `ads-results-${timestamp}.json`);
    
    fs.writeFileSync(standardMetadataPath, JSON.stringify(response, null, 2));
    fs.writeFileSync(standardResultsPath, JSON.stringify(results, null, 2));

    this.logger.info('Results saved', {
      metadataPath,
      resultsPath,
      standardMetadataPath,
      standardResultsPath
    });

    return { metadataPath, resultsPath };
  }

  /**
   * Stage results for processing in the database
   * @private
   */
  async _stageResults(jobId, query, location, results) {
    this.logger.info('Staging results for processing', { jobId });
    
    // Log structure analysis
    this._logResultsStructure(results);
    
    try {
      const stagingResponse = await axios.post(
        `${this.config.supabase.url}/rest/v1/staging_serps`,
        {
          job_id: jobId,
          query: query,
          location: location,
          timestamp: new Date().toISOString(),
          content: results,
          status: 'pending'
        },
        {
          headers: getSupabaseHeaders()
        }
      );

      if (stagingResponse.data && stagingResponse.data.length > 0) {
        this.logger.info('Results staged successfully', { 
          stagingId: stagingResponse.data[0].id,
          jobId 
        });
      } else {
        this.logger.info('Results staged successfully', { jobId });
      }
    } catch (stagingError) {
      this.logger.error('Failed to stage results', {
        error: stagingError.message,
        jobId,
        status: stagingError.response?.status,
        responseData: stagingError.response?.data
      });
      // Don't throw - staging failure shouldn't break the entire process
    }
  }

  /**
   * Log the structure of scraping results for debugging
   * @private
   */
  _logResultsStructure(results) {
    if (!results) return;

    const structure = {
      job: results.job ? Object.keys(results.job) : null,
      resultsCount: results.results ? results.results.length : 0
    };

    if (results.results && results.results.length > 0) {
      const firstResult = results.results[0];
      structure.firstResultStructure = Object.keys(firstResult);
      
      if (firstResult.content) {
        structure.contentStructure = Object.keys(firstResult.content);
        
        if (firstResult.content.results) {
          structure.resultsStructure = Object.keys(firstResult.content.results);
          
          const paidAds = firstResult.content.results.paid || [];
          structure.paidAdsCount = paidAds.length;
          
          if (paidAds.length > 0) {
            structure.firstAdStructure = Object.keys(paidAds[0]);
            structure.firstAdSample = {
              title: paidAds[0].title,
              url: paidAds[0].url,
              position: paidAds[0].pos
            };
          }
        }
      }
    }

    this.logger.info('Results structure analysis', structure);
  }

  /**
   * Get scraper statistics
   */
  getStats() {
    return {
      configurationsValid: this.config.validateAll().isValid,
      oxylabsConfigured: Boolean(this.config.oxylabs.username),
      supabaseConfigured: Boolean(this.config.supabase.url)
    };
  }
}

// Export both class and convenience function for backward compatibility
const scraperInstance = new GoogleAdsScraper();

/**
 * Legacy compatibility function
 * @param {string} query 
 * @param {string} location 
 * @returns {Promise<Object>}
 */
async function runScraper(query, location) {
  return await scraperInstance.runScraper(query, location);
}

module.exports = {
  GoogleAdsScraper,
  runScraper
};

// CLI support for direct execution
if (require.main === module) {
  const query = process.argv[2] || 'plumbers near me';
  const location = process.argv[3] || 'Boston, Massachusetts, United States';
  
  runScraper(query, location).then(async result => {
    if (result.success) {
      console.log('\n✅ Scraping completed successfully');
      console.log(`Job ID: ${result.jobId}`);
      console.log(`Execution time: ${result.executionTime}ms`);
    } else {
      console.error('\n❌ Scraping failed:', result.error);
      process.exit(1);
    }
  }).catch(error => {
    console.error('❌ Unhandled error:', error);
    process.exit(1);
  });
}
