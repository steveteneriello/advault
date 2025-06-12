// Rendering Engine - Handles HTML and PNG rendering of ad landing pages
const fs = require('fs');
const path = require('path');
const axios = require('axios');
const { createClient } = require('@supabase/supabase-js');

// Import new centralized systems
const { validateAllConfigs, getOxylabsConfig, getSupabaseConfig } = require('../../config/environment.cjs');
const { Logger } = require('../../utils/logging/logger.cjs');
const { handleError, RetryableError } = require('../../utils/error-handling/error-handlers.cjs');

// Legacy compatibility imports
const { getJobDirectories } = require('../../utils/job-directory-manager.cjs');

class RenderingEngine {
  constructor() {
    const validation = validateAllConfigs();
    if (!validation.isValid) {
      throw new Error(`Configuration validation failed: ${validation.errors.join(", ")}`);
    }
    this.config = {
      oxylabs: getOxylabsConfig(),
      supabase: getSupabaseConfig()
    };
    this.logger = new Logger('RenderingEngine');
    
    // Initialize Supabase clients
    this.supabase = createClient(this.config.supabase.url, this.config.supabase.anonKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false
      }
    });

    this.supabaseAdmin = this.config.supabase.serviceRoleKey ? 
      createClient(this.config.supabase.url, this.config.supabase.serviceRoleKey, {
        auth: {
          persistSession: false,
          autoRefreshToken: false
        }
      }) : 
      this.supabase;

    // Validate configurations
    this._validateConfigurations();
    
    // Define unsupported domains
    this.unsupportedDomains = ['example.com', 'localhost', '127.0.0.1'];
  }

  _validateConfigurations() {
    const validation = validateAllConfigs();
    if (!validation.isValid) {
      this.logger.error('Invalid configuration detected');
      validation.errors.forEach(error => this.logger.error(`- ${error}`));
      throw new Error('Configuration validation failed');
    }
  }

  /**
   * Test Supabase connections
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
      
      // Test admin connection if service key is available
      if (this.config.supabase.serviceRoleKey) {
        this.logger.info('Testing Supabase admin connection');
        const { data: adminData, error: adminError } = await this.supabaseAdmin
          .from('advertisers')
          .select('count', { count: 'exact', head: true });
          
        if (adminError) {
          this.logger.warn('Supabase admin connection failed, will proceed with regular client only', {
            error: adminError.message
          });
        } else {
          this.logger.info('Supabase admin connection successful');
        }
      } else {
        this.logger.warn('No service role key provided, some operations may fail');
      }
      
      return true;
    } catch (error) {
      this.logger.error('Supabase connection test error', { error: error.message });
      return false;
    }
  }

  /**
   * Normalize and validate URL
   */
  normalizeUrl(url) {
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      this.logger.warn('URL missing protocol, prepending https://', { url });
      return 'https://' + url;
    }
    return url;
  }

  /**
   * Check if URL is valid
   */
  isValidUrl(url) {
    try {
      new URL(url);
      return true;
    } catch (err) {
      return false;
    }
  }

  /**
   * Check if domain is supported
   */
  isSupportedDomain(url) {
    try {
      const hostname = new URL(url).hostname;
      return !this.unsupportedDomains.includes(hostname);
    } catch (error) {
      return false;
    }
  }

  /**
   * Render a URL as PNG or HTML
   * @param {string} url - URL to render
   * @param {string} renderType - Type of rendering (png, html)
   * @param {string|null} jobId - Optional job ID for directory organization
   * @returns {Promise<Object>} Rendering result
   */
  async renderUrl(url, renderType = 'png', jobId = null) {
    const startTime = Date.now();
    this.logger.info('Starting URL rendering', { url, renderType, jobId });
    
    try {
      // Validate URL
      url = this.normalizeUrl(url);
      if (!this.isValidUrl(url)) {
        throw new Error('Invalid URL format');
      }

      if (!this.isSupportedDomain(url)) {
        const hostname = new URL(url).hostname;
        throw new Error(`Unsupported domain: ${hostname}`);
      }

      this.logger.info('URL validation passed', { validatedUrl: url });

      // Create rendering payload
      const payload = {
        source: 'universal',
        url: url,
        render: renderType === 'html' ? 'html' : 'png'
      };

      this.logger.info('Sending rendering request to Oxylabs', {
        payload,
        credentialsConfigured: Boolean(this.config.oxylabs.username && this.config.oxylabs.password)
      });

      // Make request to Oxylabs
      const response = await axios.post('https://realtime.oxylabs.io/v1/queries', payload, {
        auth: {
          username: this.config.oxylabs.username,
          password: this.config.oxylabs.password
        },
        headers: {
          'Content-Type': 'application/json'
        },
        timeout: 300000 // 5 minutes
      });

      this.logger.info('Received response from Oxylabs', { 
        status: response.status,
        hasResults: Boolean(response.data?.results?.[0])
      });

      // Validate response structure
      if (!response.data?.results?.[0]?.content) {
        throw new Error('No content found in response');
      }

      // Process and save result
      const result = await this._processRenderingResult(response.data, url, renderType, jobId);
      
      const executionTime = Date.now() - startTime;
      this.logger.info('URL rendering completed successfully', {
        url,
        renderType,
        jobId,
        executionTime: `${executionTime}ms`,
        outputPath: result.outputPath
      });

      return {
        success: true,
        ...result,
        executionTime
      };

    } catch (error) {
      const executionTime = Date.now() - startTime;
      this.logger.error('URL rendering failed', {
        url,
        renderType,
        jobId,
        error: error.message,
        executionTime: `${executionTime}ms`
      });

      return handleError(error, 'RenderingEngine.renderUrl', {
        url,
        renderType,
        jobId,
        executionTime
      });
    }
  }

  /**
   * Process and save rendering result
   * @private
   */
  async _processRenderingResult(responseData, url, renderType, jobId) {
    const content = responseData.results[0].content;
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const hostname = new URL(url).hostname;

    // Determine output path
    let outputPath;
    if (jobId) {
      const jobDirs = getJobDirectories(jobId);
      const extension = renderType === 'html' ? 'html' : 'png';
      outputPath = path.join(jobDirs.rendered, `rendered-${hostname}-${timestamp}.${extension}`);
    } else {
      // Use standard directory for backward compatibility
      const standardDir = path.join(process.cwd(), 'SCRAPI', 'output-staging', 'scraper-results');
      if (!fs.existsSync(standardDir)) {
        fs.mkdirSync(standardDir, { recursive: true });
      }
      const extension = renderType === 'html' ? 'html' : 'png';
      outputPath = path.join(standardDir, `rendered-${hostname}-${timestamp}.${extension}`);
    }

    // Save content based on type
    if (renderType === 'html') {
      if (typeof content !== 'string') {
        throw new Error('Invalid HTML content received - not a string');
      }
      fs.writeFileSync(outputPath, content, 'utf8');
    } else {
      // PNG rendering
      if (typeof content !== 'string') {
        // Save debug information
        const debugPath = path.join(path.dirname(outputPath), `debug-content-${timestamp}.txt`);
        fs.writeFileSync(debugPath, JSON.stringify(responseData.results[0], null, 2));
        this.logger.warn('Invalid PNG content - saved debug info', { debugPath });
        throw new Error('Invalid PNG content received - not a string');
      }

      // Decode and save base64 PNG
      const imageBuffer = Buffer.from(content, 'base64');
      fs.writeFileSync(outputPath, imageBuffer);
    }

    this.logger.info('Rendering result saved', { 
      outputPath, 
      renderType,
      contentType: typeof content,
      contentSize: content.length 
    });

    return {
      outputPath,
      hostname,
      contentType: renderType,
      contentSize: content.length
    };
  }

  /**
   * Process ads from a SERP for rendering
   * @param {string} serpId - SERP ID
   * @param {number} maxAds - Maximum number of ads to process
   * @param {string} renderType - Type of rendering (png, html)
   * @returns {Promise<Object>} Processing result
   */
  async processAdsFromSerp(serpId, maxAds = 3, renderType = 'png') {
    const startTime = Date.now();
    this.logger.info('Starting SERP ad processing', { serpId, maxAds, renderType });

    try {
      // Test connection first
      const connectionOk = await this.testConnection();
      if (!connectionOk) {
        throw new Error('Supabase connection failed');
      }

      // Get ads from SERP
      const { data: serpAds, error: serpAdsError } = await this.supabase
        .from('serp_ads')
        .select(`
          ad_id,
          position,
          ads (
            id,
            title,
            url,
            advertiser_id
          )
        `)
        .eq('serp_id', serpId)
        .order('position', { ascending: true })
        .limit(maxAds);

      if (serpAdsError) {
        throw new Error(`Failed to fetch SERP ads: ${serpAdsError.message}`);
      }

      if (!serpAds || serpAds.length === 0) {
        this.logger.warn('No ads found for SERP', { serpId });
        return {
          success: true,
          processedCount: 0,
          skippedCount: 0,
          results: []
        };
      }

      this.logger.info('Found ads to process', { 
        serpId, 
        adCount: serpAds.length,
        maxAds 
      });

      // Process each ad
      const results = [];
      let processedCount = 0;
      let skippedCount = 0;

      for (const serpAd of serpAds) {
        try {
          const ad = serpAd.ads;
          if (!ad || !ad.url) {
            this.logger.warn('Skipping ad without URL', { adId: serpAd.ad_id });
            skippedCount++;
            continue;
          }

          this.logger.info('Processing ad', {
            adId: ad.id,
            title: ad.title,
            url: ad.url,
            position: serpAd.position
          });

          // Render the ad URL
          const renderResult = await this.renderUrl(ad.url, renderType, `serp-${serpId}`);
          
          if (renderResult.success) {
            // Save rendering record to database
            await this._saveRenderingRecord(ad.id, renderResult, renderType);
            processedCount++;
            results.push({
              adId: ad.id,
              url: ad.url,
              renderResult
            });
          } else {
            this.logger.error('Failed to render ad', {
              adId: ad.id,
              url: ad.url,
              error: renderResult.error
            });
            skippedCount++;
          }

        } catch (adError) {
          this.logger.error('Error processing individual ad', {
            adId: serpAd.ad_id,
            error: adError.message
          });
          skippedCount++;
        }
      }

      const executionTime = Date.now() - startTime;
      this.logger.info('SERP ad processing completed', {
        serpId,
        processedCount,
        skippedCount,
        totalAds: serpAds.length,
        executionTime: `${executionTime}ms`
      });

      return {
        success: true,
        processedCount,
        skippedCount,
        totalAds: serpAds.length,
        results,
        executionTime
      };

    } catch (error) {
      const executionTime = Date.now() - startTime;
      this.logger.error('SERP ad processing failed', {
        serpId,
        error: error.message,
        executionTime: `${executionTime}ms`
      });

      return handleError(error, 'RenderingEngine.processAdsFromSerp', {
        serpId,
        maxAds,
        renderType,
        executionTime
      });
    }
  }

  /**
   * Save rendering record to database
   * @private
   */
  async _saveRenderingRecord(adId, renderResult, renderType) {
    try {
      const renderingRecord = {
        ad_id: adId,
        rendering_type: renderType,
        status: 'completed',
        file_path: renderResult.outputPath,
        content_size: renderResult.contentSize,
        rendered_at: new Date().toISOString(),
        metadata: {
          hostname: renderResult.hostname,
          executionTime: renderResult.executionTime
        }
      };

      const { data, error } = await this.supabaseAdmin
        .from('ad_renderings')
        .insert(renderingRecord)
        .select();

      if (error) {
        this.logger.error('Failed to save rendering record', {
          adId,
          error: error.message
        });
      } else {
        this.logger.info('Rendering record saved', {
          adId,
          renderingId: data[0]?.id,
          renderType
        });
      }
    } catch (error) {
      this.logger.error('Error saving rendering record', {
        adId,
        error: error.message
      });
    }
  }

  /**
   * Get rendering engine statistics
   */
  getStats() {
    return {
      configurationValid: this.config.validateAll().isValid,
      oxylabsConfigured: Boolean(this.config.oxylabs.username),
      supabaseConfigured: Boolean(this.config.supabase.url),
      adminClientAvailable: Boolean(this.config.supabase.serviceRoleKey)
    };
  }
}

// Export both class and convenience functions for backward compatibility
const renderingEngine = new RenderingEngine();

/**
 * Legacy compatibility functions
 */
async function renderUrl(url, renderType = 'png', jobId = null) {
  return await renderingEngine.renderUrl(url, renderType, jobId);
}

async function processAdsFromSerp(serpId, maxAds = 3) {
  return await renderingEngine.processAdsFromSerp(serpId, maxAds, 'png');
}

module.exports = {
  RenderingEngine,
  renderUrl,
  processAdsFromSerp
};

// CLI support for direct execution
if (require.main === module) {
  const url = process.argv[2];
  const renderType = process.argv[3] || 'png';
  
  if (!url) {
    console.error('❌ Usage: node rendering-engine.cjs <url> [renderType]');
    process.exit(1);
  }

  renderUrl(url, renderType).then(result => {
    if (result.success) {
      console.log(`✅ Rendering completed: ${result.outputPath}`);
    } else {
      console.error(`❌ Rendering failed: ${result.error}`);
      process.exit(1);
    }
  }).catch(error => {
    console.error('❌ Unhandled error:', error);
    process.exit(1);
  });
}
