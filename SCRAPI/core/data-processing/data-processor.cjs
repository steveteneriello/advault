// Data Processing Engine - Handles SERP result processing and staging
const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

// Import new centralized systems
const { validateAllConfigs, getSupabaseConfig } = require('../../config/environment.cjs');
const { Logger } = require('../../utils/logging/logger.cjs');
const { handleError } = require('../../utils/error-handling/error-handlers.cjs');

class DataProcessor {
  constructor() {
    // Validate configurations first
    const validation = validateAllConfigs();
    if (!validation.isValid) {
      throw new Error(`Configuration validation failed: ${validation.errors.join(', ')}`);
    }
    
    this.config = {
      supabase: getSupabaseConfig()
    };
    this.logger = new Logger('DataProcessor');
    this.supabase = createClient(this.config.supabase.url, this.config.supabase.anonKey);
  }

  /**
   * Test Supabase connection
   */
  async testConnection() {
    try {
      this.logger.info('Testing Supabase connection');
      
      const { data, error } = await this.supabase
        .from('advertisers')
        .select('count', { count: 'exact', head: true });
      
      if (error) {
        this.logger.error('Supabase connection test failed', { error: error.message });
        return false;
      }
      
      this.logger.info('Supabase connection successful');
      return true;
    } catch (error) {
      this.logger.error('Supabase connection test error', { error: error.message });
      return false;
    }
  }

  /**
   * Check if a file is a valid results file
   */
  isResultsFile(filename) {
    return filename.startsWith('ads-results-') && filename.endsWith('.json');
  }

  /**
   * Process a single results file
   */
  async processFile(filePath) {
    const startTime = Date.now();
    this.logger.info('Processing file', { filePath });
    
    try {
      // Read and parse file
      const data = await this._readAndParseFile(filePath);
      if (!data) return;

      // Validate job data
      if (!data?.job) {
        this.logger.warn('No job data found in file, skipping', { filePath });
        return;
      }

      const { jobId, query, location, timestamp } = this._extractJobMetadata(data);
      this.logger.info('Processing job', { jobId, query, location });

      // Check for existing staging record
      const existingStaging = await this._checkExistingStaging(jobId);
      if (existingStaging) {
        this._handleExistingStaging(existingStaging);
        return;
      }

      // Analyze data structure
      this._analyzeDataStructure(data);

      // Create enhanced content
      const enhancedContent = this._createEnhancedContent(data);

      // Insert into staging table
      const stagingResult = await this._insertIntoStaging(jobId, query, location, timestamp, enhancedContent);
      if (!stagingResult) return;

      // Monitor processing
      await this._monitorProcessing(stagingResult.id, jobId);

      // Trigger rendering if successful
      await this._triggerRenderingIfReady(jobId);

      const executionTime = Date.now() - startTime;
      this.logger.info('File processing completed', { 
        filePath, 
        jobId, 
        executionTime: `${executionTime}ms` 
      });

    } catch (error) {
      const executionTime = Date.now() - startTime;
      this.logger.error('File processing failed', {
        filePath,
        error: error.message,
        executionTime: `${executionTime}ms`
      });
    }
  }

  /**
   * Process all results files in the directory
   */
  async processAllFiles() {
    const startTime = Date.now();
    this.logger.info('Starting SERP staging process');

    // Test connection first
    const connectionOk = await this.testConnection();
    if (!connectionOk) {
      this.logger.error('Supabase connection failed, aborting');
      return;
    }

    try {
      const resultsDir = path.join(process.cwd(), 'SCRAPI', 'output-staging', 'scraper-results');
      
      if (!fs.existsSync(resultsDir)) {
        this.logger.error('Results directory does not exist', { resultsDir });
        return;
      }

      // Get and filter files
      const allFiles = fs.readdirSync(resultsDir);
      const resultFiles = allFiles.filter(f => this.isResultsFile(f));

      this.logger.info('Found files to process', { 
        totalFiles: allFiles.length, 
        resultFiles: resultFiles.length 
      });

      if (resultFiles.length === 0) {
        this.logger.warn('No results files to process');
        return;
      }

      // Process each file
      for (const file of resultFiles) {
        await this.processFile(path.join(resultsDir, file));
      }

      // Generate summary
      await this._generateProcessingSummary();

      const executionTime = Date.now() - startTime;
      this.logger.info('SERP staging process complete', { 
        executionTime: `${executionTime}ms`,
        processedFiles: resultFiles.length 
      });

    } catch (error) {
      const executionTime = Date.now() - startTime;
      this.logger.error('Process all files failed', {
        error: error.message,
        executionTime: `${executionTime}ms`
      });
    }
  }

  /**
   * Read and parse a JSON file
   * @private
   */
  async _readAndParseFile(filePath) {
    try {
      const fileContent = fs.readFileSync(filePath, 'utf8');
      return JSON.parse(fileContent);
    } catch (readError) {
      this.logger.error('Failed to read file', { filePath, error: readError.message });
      return null;
    }
  }

  /**
   * Extract job metadata from data
   * @private
   */
  _extractJobMetadata(data) {
    return {
      jobId: data.job.id,
      query: data.job.query || '',
      location: data.job.geo_location || '',
      timestamp: data.job.created_at || new Date().toISOString()
    };
  }

  /**
   * Check for existing staging record
   * @private
   */
  async _checkExistingStaging(jobId) {
    const { data: existingStaging, error: checkError } = await this.supabase
      .from('staging_serps')
      .select('id, status')
      .eq('job_id', jobId)
      .maybeSingle();
    
    if (checkError) {
      this.logger.error('Error checking for existing staging record', { 
        jobId, 
        error: checkError.message 
      });
      return null;
    }
    
    return existingStaging;
  }

  /**
   * Handle existing staging record
   * @private
   */
  _handleExistingStaging(existingStaging) {
    this.logger.info('Job already exists in staging table', { 
      stagingId: existingStaging.id,
      status: existingStaging.status 
    });
    
    if (existingStaging.status === 'error') {
      this.logger.info('Job is in error state, can be reprocessed', {
        reprocessCommand: `SELECT reprocess_staged_serp('${existingStaging.id}');`
      });
    }
  }

  /**
   * Analyze data structure for debugging
   * @private
   */
  _analyzeDataStructure(data) {
    const analysis = {
      job: data.job ? Object.keys(data.job) : null,
      resultsCount: data.results ? data.results.length : 0
    };

    if (data.results && data.results.length > 0) {
      const firstResult = data.results[0];
      analysis.firstResultStructure = Object.keys(firstResult);
      
      if (firstResult.content?.results) {
        analysis.resultsStructure = Object.keys(firstResult.content.results);
        
        const paidAds = firstResult.content.results.paid || [];
        analysis.paidAdsCount = paidAds.length;
        
        if (paidAds.length > 0) {
          analysis.firstAdStructure = Object.keys(paidAds[0]);
          analysis.firstAdSample = {
            title: paidAds[0].title,
            url: paidAds[0].url,
            position: paidAds[0].pos
          };
        }
      }
    }

    this.logger.info('Data structure analysis', analysis);
  }

  /**
   * Create enhanced content for storage
   * @private
   */
  _createEnhancedContent(data) {
    return {
      job: {
        id: data.job.id,
        query: data.job.query,
        geo_location: data.job.geo_location,
        created_at: data.job.created_at,
        status: data.job.status
      },
      results: data.results.map(result => ({
        content: {
          url: result.content?.url,
          results: {
            paid: this._enhancePaidAds(result.content?.results?.paid || []),
            organic: this._enhanceOrganicResults(result.content?.results?.organic || [])
          }
        },
        created_at: result.created_at,
        job_id: result.job_id
      }))
    };
  }

  /**
   * Enhance paid ads with all available fields
   * @private
   */
  _enhancePaidAds(paidAds) {
    return paidAds.map(ad => ({
      // Basic ad fields
      pos: ad.pos,
      url: ad.url,
      title: ad.title,
      desc: ad.desc,
      url_shown: ad.url_shown,
      pos_overall: ad.pos_overall,
      
      // Additional fields
      data_rw: ad.data_rw,
      data_pcu: ad.data_pcu,
      sitelinks: ad.sitelinks,
      price: ad.price,
      seller: ad.seller,
      image_url: ad.url_image,
      call_extension: ad.call_extension,
      
      // Extended fields
      currency: ad.currency,
      rating: ad.rating,
      review_count: ad.review_count,
      previous_price: ad.previous_price
    }));
  }

  /**
   * Enhance organic results
   * @private
   */
  _enhanceOrganicResults(organicResults) {
    return organicResults.slice(0, 5).map(result => ({
      pos: result.pos,
      url: result.url,
      title: result.title,
      desc: result.desc,
      url_shown: result.url_shown,
      pos_overall: result.pos_overall,
      rating: result.rating,
      review_count: result.review_count,
      favicon_text: result.favicon_text,
      images: result.images,
      sitelinks: result.sitelinks
    }));
  }

  /**
   * Insert data into staging table
   * @private
   */
  async _insertIntoStaging(jobId, query, location, timestamp, enhancedContent) {
    this.logger.info('Inserting into staging table', {
      jobId,
      contentSize: `${JSON.stringify(enhancedContent).length} bytes`,
      paidAdsCount: enhancedContent.results[0]?.content?.results?.paid?.length || 0
    });
    
    const { data: stagingData, error: stagingError } = await this.supabase
      .from('staging_serps')
      .insert({
        job_id: jobId,
        query: query,
        location: location,
        timestamp: timestamp,
        content: enhancedContent,
        status: 'pending'
      })
      .select();

    if (stagingError) {
      this.logger.error('Failed to insert into staging table', { 
        jobId, 
        error: stagingError.message 
      });
      return null;
    }

    if (!stagingData || stagingData.length === 0) {
      this.logger.error('No data returned after staging insert', { jobId });
      return null;
    }

    this.logger.info('Successfully inserted into staging table', { 
      jobId, 
      stagingId: stagingData[0].id 
    });

    return stagingData[0];
  }

  /**
   * Monitor processing status and logs
   * @private
   */
  async _monitorProcessing(stagingId, jobId) {
    // Wait for trigger to process
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Check status
    const { data: statusData, error: statusError } = await this.supabase
      .from('staging_serps')
      .select('status, error_message, processed_at')
      .eq('id', stagingId)
      .single();
      
    if (statusError) {
      this.logger.error('Failed to check processing status', { 
        stagingId, 
        error: statusError.message 
      });
      return;
    }
    
    this.logger.info('Processing status', {
      stagingId,
      status: statusData.status,
      errorMessage: statusData.error_message,
      processedAt: statusData.processed_at
    });

    // Check processing logs
    await this._checkProcessingLogs(stagingId);
  }

  /**
   * Check processing logs
   * @private
   */
  async _checkProcessingLogs(stagingId) {
    const { data: logs, error: logsError } = await this.supabase
      .from('processing_logs')
      .select('operation, status, message, created_at')
      .eq('staging_id', stagingId)
      .order('created_at', { ascending: true });
      
    if (logsError) {
      this.logger.error('Failed to fetch processing logs', { 
        stagingId, 
        error: logsError.message 
      });
      return;
    }

    if (logs && logs.length > 0) {
      this.logger.info('Processing logs', { 
        stagingId, 
        logCount: logs.length,
        logs: logs.map(log => ({
          operation: log.operation,
          status: log.status,
          message: log.message,
          timestamp: log.created_at
        }))
      });
    } else {
      this.logger.warn('No processing logs found - trigger may not be working', { stagingId });
    }
  }

  /**
   * Trigger rendering if SERP processing was successful
   * @private
   */
  async _triggerRenderingIfReady(jobId) {
    // Get SERP status
    const { data: serpData, error: serpError } = await this.supabase
      .from('serps')
      .select('id')
      .eq('job_id', jobId)
      .single();
      
    if (serpError || !serpData) {
      this.logger.info('SERP not found or not ready for rendering', { jobId });
      return;
    }

    // Check for SERP-Ad relationships
    const { data: serpAds, error: serpAdsError } = await this.supabase
      .from('serp_ads')
      .select('ad_id, position')
      .eq('serp_id', serpData.id);
      
    if (serpAdsError) {
      this.logger.error('Failed to fetch SERP-Ad relationships', { 
        serpId: serpData.id, 
        error: serpAdsError.message 
      });
      return;
    }

    this.logger.info('SERP processing completed', {
      jobId,
      serpId: serpData.id,
      serpAdsCount: serpAds ? serpAds.length : 0
    });

    if (serpAds && serpAds.length > 0) {
      this.logger.info('SERP ready for ad rendering', { 
        serpId: serpData.id,
        adCount: serpAds.length 
      });
      // Note: Actual rendering would be triggered here in a full implementation
    }
  }

  /**
   * Generate processing summary
   * @private
   */
  async _generateProcessingSummary() {
    try {
      // Staging table summary
      const { data: stagingData, error: stagingError } = await this.supabase
        .from('staging_serps')
        .select('status', { count: 'exact' });

      if (!stagingError && stagingData) {
        const statusCounts = {};
        stagingData.forEach(item => {
          statusCounts[item.status] = (statusCounts[item.status] || 0) + 1;
        });

        this.logger.info('Staging table summary', {
          statusCounts,
          totalRecords: stagingData.length
        });
      }

      // Error summary
      const { data: errorData, error: errorQueryError } = await this.supabase
        .from('staging_serps')
        .select('id, job_id, error_message')
        .eq('status', 'error');

      if (!errorQueryError && errorData && errorData.length > 0) {
        this.logger.warn('Found staging errors', {
          errorCount: errorData.length,
          errors: errorData.map(item => ({
            jobId: item.job_id,
            errorMessage: item.error_message
          }))
        });
      }

      // Rendering summary
      const { data: renderingData, error: renderingError } = await this.supabase
        .from('ad_renderings')
        .select('rendering_type, status', { count: 'exact' });
        
      if (!renderingError && renderingData && renderingData.length > 0) {
        const renderingStats = {};
        renderingData.forEach(item => {
          const key = `${item.rendering_type}_${item.status}`;
          renderingStats[key] = (renderingStats[key] || 0) + 1;
        });

        this.logger.info('Ad rendering summary', {
          renderingStats,
          totalRenderings: renderingData.length
        });
      }

    } catch (error) {
      this.logger.error('Failed to generate processing summary', { error: error.message });
    }
  }

  /**
   * Get processor statistics
   */
  getStats() {
    const config = getSupabaseConfig();
    return {
      configurationValid: Boolean(config.url && config.anonKey && config.serviceRoleKey),
      supabaseConfigured: Boolean(config.url)
    };
  }
}

// Export both class and convenience functions for backward compatibility
const processorInstance = new DataProcessor();

/**
 * Legacy compatibility functions
 */
async function processFile(filePath) {
  return await processorInstance.processFile(filePath);
}

async function processAllFiles() {
  return await processorInstance.processAllFiles();
}

module.exports = {
  DataProcessor,
  processFile,
  processAllFiles
};

// CLI support for direct execution
if (require.main === module) {
  processAllFiles().catch(error => {
    console.error('❌ Unhandled error in main process:', error);
    process.exit(1);
  });
}
