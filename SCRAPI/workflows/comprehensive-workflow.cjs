// Comprehensive Workflow - Orchestrates the entire SCRAPI pipeline using new modular components
const path = require('path');

// Import new centralized systems
const config = require('../config/environment.cjs');
const { Logger } = require('../utils/logging/logger.cjs');
const { ErrorHandler } = require('../utils/error-handling/error-handlers.cjs');
const { WorkflowCoordinator } = require('./workflow-coordinator.cjs');

// Import core processing components
const { GoogleAdsScraper } = require('../core/data-collection/google-ads-scraper.cjs');
const { DataProcessor } = require('../core/data-processing/data-processor.cjs');
const { RenderingEngine } = require('../core/rendering/rendering-engine.cjs');
const { StorageManager } = require('../core/storage/storage-manager.cjs');

// Import API integrations
const { SupabaseAPI } = require('../api/supabase/supabase-api.cjs');
const { OxylabsAPI } = require('../api/oxylabs/oxylabs-api.cjs');

class ComprehensiveWorkflow extends WorkflowCoordinator {
  constructor(options = {}) {
    super('ComprehensiveWorkflow', {
      steps: [
        'initialization',
        'validation',
        'data_collection',
        'data_processing', 
        'serp_processing_wait',
        'html_rendering',
        'png_rendering',
        'storage_upload',
        'completion'
      ],
      ...options
    });

    // Initialize components
    this.config = config;
    this.scraper = new GoogleAdsScraper();
    this.processor = new DataProcessor();
    this.renderer = new RenderingEngine();
    this.storage = new StorageManager();
    this.supabaseAPI = new SupabaseAPI();
    this.oxylabsAPI = new OxylabsAPI();

    // Workflow configuration
    this.workflowConfig = {
      maxAdsToRender: options.maxAdsToRender || 5,
      renderHtml: options.renderHtml !== false,
      renderPng: options.renderPng !== false,
      uploadToStorage: options.uploadToStorage !== false,
      trackJobs: options.trackJobs !== false,
      generateReport: options.generateReport !== false,
      ...options
    };
  }

  /**
   * Execute the complete workflow for a single query
   * @param {string} query - Search query
   * @param {string} location - Geographic location
   * @returns {Promise<Object>} Workflow result
   */
  async executeWorkflow(query, location) {
    const startTime = Date.now();
    
    this.logger.info('Starting comprehensive workflow', { 
      query, 
      location, 
      config: this.workflowConfig 
    });

    try {
      await this.initialize();

      // Step 1: Initialization
      this.startStep('initialization', 'Initializing workflow components');
      this.logger.info('Initializing workflow components');
      
      // Test all connections
      const connectionTests = await Promise.allSettled([
        this.supabaseAPI.testConnection(),
        this.processor.testConnection(),
        this.renderer.testConnection(),
        this.storage.testConnection()
      ]);

      const failedTests = connectionTests
        .map((result, index) => ({ result, component: ['supabase', 'processor', 'renderer', 'storage'][index] }))
        .filter(({ result }) => result.status === 'rejected' || !result.value?.success);

      if (failedTests.length > 0) {
        const failedComponents = failedTests.map(({ component }) => component).join(', ');
        throw new Error(`Component connection tests failed: ${failedComponents}`);
      }

      this.logger.info('All component connections verified');
      this.completeStep();

      // Step 2: Validation
      this.startStep('validation', 'Validating configurations and inputs');
      this.logger.info('Validating configurations and inputs');
      
      // Validate inputs
      if (!query || !location) {
        throw new Error('Query and location are required');
      }

      this.logger.info('Validation completed successfully');
      this.completeStep();

      // Step 3: Data Collection
      const scrapingResult = await this.executeStep('data_collection', async () => {
        this.logger.info('Starting data collection', { query, location });
        
        const result = await this.scraper.runScraper(query, location);
        
        if (!result.success) {
          throw new Error(`Data collection failed: ${result.error}`);
        }

        this.logger.info('Data collection completed successfully', {
          jobId: result.jobId,
          executionTime: result.executionTime
        });

        return result;
      });

      // Step 4: Data Processing
      await this.executeStep('data_processing', async () => {
        this.logger.info('Starting data processing');
        
        const result = await this.processor.processAllFiles();
        
        this.logger.info('Data processing completed');
        return { processed: true };
      });

      // Step 5: Wait for SERP Processing
      const serpResult = await this.executeStep('serp_processing_wait', async () => {
        this.logger.info('Waiting for SERP processing to complete', { 
          jobId: scrapingResult.jobId 
        });
        
        // Wait for SERP to be created
        let attempts = 0;
        const maxAttempts = 30;
        const delayMs = 2000;

        while (attempts < maxAttempts) {
          attempts++;
          
          const serpQuery = await this.supabaseAPI.select('serps', {
            filters: { job_id: scrapingResult.jobId },
            select: 'id'
          });

          if (serpQuery.success && serpQuery.data && serpQuery.data.length > 0) {
            const serpId = serpQuery.data[0].id;
            this.logger.info('SERP processing completed', { serpId, attempts });
            
            // Get associated ads
            const adsQuery = await this.supabaseAPI.select('serp_ads', {
              filters: { serp_id: serpId },
              select: 'ad_id, position'
            });

            const adCount = adsQuery.success ? adsQuery.data.length : 0;
            
            return { 
              serpId, 
              adCount,
              attempts
            };
          }

          if (attempts < maxAttempts) {
            await new Promise(resolve => setTimeout(resolve, delayMs));
          }
        }

        throw new Error('SERP processing timeout');
      });

      // Step 6: HTML Rendering (if enabled)
      let htmlRenderingResult = null;
      if (this.workflowConfig.renderHtml) {
        htmlRenderingResult = await this.executeStep('html_rendering', async () => {
          this.logger.info('Starting HTML rendering', { 
            serpId: serpResult.serpId,
            maxAds: this.workflowConfig.maxAdsToRender
          });
          
          const result = await this.renderer.processAdsFromSerp(
            serpResult.serpId, 
            this.workflowConfig.maxAdsToRender,
            'html'
          );

          if (!result.success) {
            this.logger.warn('HTML rendering failed', { error: result.error });
            // Don't fail the entire workflow for rendering issues
            return { skipped: true, reason: result.error };
          }

          this.logger.info('HTML rendering completed', { 
            processedCount: result.processedCount,
            skippedCount: result.skippedCount
          });

          return result;
        });
      } else {
        await this.executeStep('html_rendering', async () => {
          this.logger.info('HTML rendering skipped (disabled in config)');
          return { skipped: true, reason: 'disabled' };
        });
      }

      // Step 7: PNG Rendering (if enabled)
      let pngRenderingResult = null;
      if (this.workflowConfig.renderPng) {
        pngRenderingResult = await this.executeStep('png_rendering', async () => {
          this.logger.info('Starting PNG rendering', { 
            serpId: serpResult.serpId,
            maxAds: this.workflowConfig.maxAdsToRender
          });
          
          const result = await this.renderer.processAdsFromSerp(
            serpResult.serpId, 
            this.workflowConfig.maxAdsToRender,
            'png'
          );

          if (!result.success) {
            this.logger.warn('PNG rendering failed', { error: result.error });
            // Don't fail the entire workflow for rendering issues
            return { skipped: true, reason: result.error };
          }

          this.logger.info('PNG rendering completed', { 
            processedCount: result.processedCount,
            skippedCount: result.skippedCount
          });

          return result;
        });
      } else {
        await this.executeStep('png_rendering', async () => {
          this.logger.info('PNG rendering skipped (disabled in config)');
          return { skipped: true, reason: 'disabled' };
        });
      }

      // Step 8: Storage Upload (if enabled)
      let storageResult = null;
      if (this.workflowConfig.uploadToStorage) {
        storageResult = await this.executeStep('storage_upload', async () => {
          this.logger.info('Starting storage upload');
          
          // Check if bucket exists, create if needed
          const bucketName = 'ad-renderings';
          const bucketExists = await this.storage.checkBucketExists(bucketName);
          
          if (!bucketExists) {
            this.logger.info('Creating storage bucket', { bucketName });
            const createResult = await this.storage.createBucket(bucketName, {
              public: true,
              allowedMimeTypes: ['image/*', 'text/*']
            });
            
            if (!createResult.success) {
              throw new Error(`Failed to create bucket: ${createResult.error}`);
            }
          }

          // Upload rendered files (implementation would depend on file organization)
          // For now, just update existing rendering records with storage URLs
          const updateResult = await this.storage.updateAdRenderingsWithStorageUrls(bucketName);
          
          this.logger.info('Storage upload completed', {
            updatedCount: updateResult.updatedCount,
            skippedCount: updateResult.skippedCount
          });

          return updateResult;
        });
      } else {
        await this.executeStep('storage_upload', async () => {
          this.logger.info('Storage upload skipped (disabled in config)');
          return { skipped: true, reason: 'disabled' };
        });
      }

      // Step 9: Completion
      const finalResult = await this.executeStep('completion', async () => {
        const executionTime = Date.now() - startTime;
        
        // Get final statistics
        const dbStats = await this.supabaseAPI.getDatabaseStats();
        
        this.logger.info('Workflow completed successfully', {
          query,
          location,
          jobId: scrapingResult.jobId,
          serpId: serpResult.serpId,
          adCount: serpResult.adCount,
          totalExecutionTime: `${executionTime}ms`
        });

        return {
          success: true,
          jobId: scrapingResult.jobId,
          serpId: serpResult.serpId,
          adCount: serpResult.adCount,
          htmlRendering: htmlRenderingResult,
          pngRendering: pngRenderingResult,
          storageUpload: storageResult,
          databaseStats: dbStats,
          totalExecutionTime: executionTime
        };
      });

      await this.completeWorkflow();
      return finalResult;

    } catch (error) {
      const executionTime = Date.now() - startTime;
      this.logger.error('Workflow failed', {
        query,
        location,
        error: error.message,
        currentStep: this.currentStep,
        executionTime: `${executionTime}ms`
      });

      this.logger.error(`Workflow failed: ${error.message}`);
      
      return {
        success: false,
        error: error.message,
        query,
        location,
        currentStep: this.currentStep,
        executionTime
      };
    }
  }

  /**
   * Execute workflow for multiple queries (batch processing)
   * @param {Array} queries - Array of {query, location} objects
   * @param {Object} options - Batch options
   * @returns {Promise<Object>} Batch result
   */
  async executeBatchWorkflow(queries, options = {}) {
    const startTime = Date.now();
    const concurrency = options.concurrency || 1;
    
    this.logger.info('Starting batch workflow', { 
      queryCount: queries.length,
      concurrency
    });

    const results = [];
    const errors = [];

    // Process queries with controlled concurrency
    for (let i = 0; i < queries.length; i += concurrency) {
      const batch = queries.slice(i, i + concurrency);
      
      this.logger.info('Processing batch', {
        batchNumber: Math.floor(i / concurrency) + 1,
        batchSize: batch.length,
        totalBatches: Math.ceil(queries.length / concurrency)
      });

      const batchPromises = batch.map(async ({ query, location }) => {
        try {
          const result = await this.executeWorkflow(query, location);
          return { query, location, result };
        } catch (error) {
          this.logger.error('Batch item failed', { query, location, error: error.message });
          return { query, location, error: error.message };
        }
      });

      const batchResults = await Promise.allSettled(batchPromises);
      
      batchResults.forEach((promiseResult) => {
        if (promiseResult.status === 'fulfilled') {
          const { query, location, result, error } = promiseResult.value;
          if (error) {
            errors.push({ query, location, error });
          } else {
            results.push({ query, location, result });
          }
        } else {
          errors.push({ 
            query: 'unknown', 
            location: 'unknown', 
            error: promiseResult.reason.message 
          });
        }
      });

      // Add delay between batches if specified
      if (options.delayMs && i + concurrency < queries.length) {
        await new Promise(resolve => setTimeout(resolve, options.delayMs));
      }
    }

    const executionTime = Date.now() - startTime;
    const successCount = results.length;
    const errorCount = errors.length;

    this.logger.info('Batch workflow completed', {
      totalQueries: queries.length,
      successCount,
      errorCount,
      executionTime: `${executionTime}ms`
    });

    return {
      success: true,
      totalQueries: queries.length,
      successCount,
      errorCount,
      results,
      errors,
      executionTime
    };
  }

  /**
   * Get workflow statistics
   */
  getStats() {
    return {
      ...super.getStats(),
      components: {
        scraper: this.scraper.getStats(),
        processor: this.processor.getStats(),
        renderer: this.renderer.getStats(),
        storage: this.storage.getStats(),
        supabaseAPI: this.supabaseAPI.getStats(),
        oxylabsAPI: this.oxylabsAPI.getStats()
      }
    };
  }
}

module.exports = {
  ComprehensiveWorkflow
};

// CLI support for direct execution
if (require.main === module) {
  const query = process.argv[2] || 'plumbers near me';
  const location = process.argv[3] || 'Boston, Massachusetts, United States';
  
  const workflow = new ComprehensiveWorkflow({
    maxAdsToRender: 3,
    renderHtml: true,
    renderPng: true,
    uploadToStorage: false // Disable by default for testing
  });

  workflow.executeWorkflow(query, location).then(result => {
    if (result.success) {
      console.log('\n✅ Comprehensive workflow completed successfully');
      console.log(`SERP ID: ${result.serpId}`);
      console.log(`Ad Count: ${result.adCount}`);
      console.log(`Total Execution Time: ${result.totalExecutionTime}ms`);
    } else {
      console.error('\n❌ Comprehensive workflow failed:', result.error);
      process.exit(1);
    }
  }).catch(error => {
    console.error('❌ Unhandled error:', error);
    process.exit(1);
  });
}
