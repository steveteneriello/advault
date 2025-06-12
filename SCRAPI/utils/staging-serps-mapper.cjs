// staging-serps-mapper.cjs - Map raw Oxylabs output to staging_serps table
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

/**
 * Map raw Oxylabs API response to staging_serps table format
 * 
 * Schema: staging_serps
 * - id: uuid (auto-generated)
 * - job_id: text (required - Oxylabs job ID)
 * - query: text (required - search query)
 * - location: text (required - geo location)
 * - timestamp: timestamp (required - when job was created)
 * - content: jsonb (required - full Oxylabs response)
 * - status: text (default 'pending')
 * - error_message: text (null)
 * - created_at: timestamp (auto-generated)
 * - processed_at: timestamp (null)
 * - device: text (optional - desktop/mobile)
 * - raw_html: text (optional - raw HTML if available)
 * - landing_pages: text[] (optional - array of landing page URLs)
 * - updated_at: timestamp (null)
 * - pages: integer (optional - number of pages scraped)
 * - start_page: integer (optional - starting page number)
 * - locale: text (optional - locale used)
 * - extra_params: jsonb (optional - additional parameters)
 */

class StagingSerpMapper {
  constructor() {
    this.supabase = createClient(
      process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL,
      process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY
    );
  }

  /**
   * Map raw Oxylabs response to staging_serps format
   * @param {Object} oxylabsResponse - Raw response from Oxylabs API
   * @param {Object} requestParams - Original request parameters
   * @returns {Object} Mapped data ready for staging_serps table
   */
  mapToStagingFormat(oxylabsResponse, requestParams = {}) {
    // Extract job information from response
    const jobData = oxylabsResponse.job || {};
    const results = oxylabsResponse.results || [];
    
    // Build the staging record
    const stagingRecord = {
      // Required fields
      job_id: jobData.id || requestParams.jobId || `realtime-${Date.now()}`,
      query: jobData.query || requestParams.query || '',
      location: jobData.geo_location || requestParams.location || requestParams.geo_location || '',
      timestamp: jobData.created_at || new Date().toISOString(),
      content: this._enhanceContent(oxylabsResponse),
      status: 'pending',
      
      // Optional fields from job data
      device: jobData.device || requestParams.device || null,
      pages: jobData.pages || requestParams.pages || null,
      start_page: jobData.start_page || requestParams.start_page || null,
      locale: jobData.locale || requestParams.locale || null,
      
      // Extract additional data
      raw_html: this._extractRawHtml(results),
      landing_pages: this._extractLandingPages(results),
      extra_params: this._buildExtraParams(jobData, requestParams)
    };

    return stagingRecord;
  }

  /**
   * Enhanced content with better structure for database processing
   * @private
   */
  _enhanceContent(oxylabsResponse) {
    const results = oxylabsResponse.results || [];
    
    // Create enhanced structure that preserves all data but improves accessibility
    const enhancedContent = {
      job: oxylabsResponse.job || {},
      results: results.map(result => ({
        content: {
          url: result.content?.url,
          results: {
            // Enhanced paid ads with all available fields
            paid: this._enhancePaidAds(result.content?.results?.paid || []),
            
            // Enhanced organic results
            organic: this._enhanceOrganicResults(result.content?.results?.organic || []),
            
            // Other result types
            local: result.content?.results?.local || [],
            shopping: result.content?.results?.shopping || [],
            related_searches: result.content?.results?.related_searches || [],
            knowledge_graph: result.content?.results?.knowledge_graph || null,
            featured_snippet: result.content?.results?.featured_snippet || null
          },
          
          // Additional content fields
          total_results: result.content?.total_results,
          page_number: result.content?.page_number,
          search_information: result.content?.search_information,
          related_questions: result.content?.related_questions || [],
          images: result.content?.images || [],
          videos: result.content?.videos || [],
          news: result.content?.news || [],
          favicon_text: result.content?.favicon_text,
          sitelinks: result.content?.sitelinks || []
        },
        created_at: result.created_at,
        job_id: result.job_id,
        status_code: result.status_code,
        url: result.url,
        parse_time_ms: result.parse_time_ms
      }))
    };

    return enhancedContent;
  }

  /**
   * Enhance paid ads with all available fields
   * @private
   */
  _enhancePaidAds(paidAds) {
    return paidAds.map(ad => ({
      // Core ad fields
      pos: ad.pos,
      url: ad.url,
      title: ad.title,
      desc: ad.desc,
      url_shown: ad.url_shown,
      pos_overall: ad.pos_overall,
      
      // Additional ad fields
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
      previous_price: ad.previous_price,
      
      // Location and business info
      location: ad.location,
      phone: ad.phone,
      address: ad.address,
      hours: ad.hours,
      
      // Technical fields
      tracking_url: ad.tracking_url,
      source: ad.source,
      ad_type: ad.ad_type
    }));
  }

  /**
   * Enhance organic results with available fields
   * @private
   */
  _enhanceOrganicResults(organicResults) {
    return organicResults.map(result => ({
      pos: result.pos,
      url: result.url,
      title: result.title,
      desc: result.desc,
      url_shown: result.url_shown,
      pos_overall: result.pos_overall,
      
      // Additional organic fields
      rating: result.rating,
      review_count: result.review_count,
      favicon_text: result.favicon_text,
      images: result.images,
      sitelinks: result.sitelinks,
      date: result.date,
      source: result.source
    }));
  }

  /**
   * Extract raw HTML if available in response
   * @private
   */
  _extractRawHtml(results) {
    if (!results || results.length === 0) return null;
    
    // Look for raw HTML in various possible locations
    for (const result of results) {
      if (result.html) return result.html;
      if (result.content?.html) return result.content.html;
      if (result.raw_html) return result.raw_html;
    }
    
    return null;
  }

  /**
   * Extract landing page URLs from ads
   * @private
   */
  _extractLandingPages(results) {
    const landingPages = [];
    
    if (!results || results.length === 0) return null;
    
    for (const result of results) {
      const paidAds = result.content?.results?.paid || [];
      for (const ad of paidAds) {
        if (ad.url && !landingPages.includes(ad.url)) {
          landingPages.push(ad.url);
        }
      }
    }
    
    return landingPages.length > 0 ? landingPages : null;
  }

  /**
   * Build extra parameters object
   * @private
   */
  _buildExtraParams(jobData, requestParams) {
    const extraParams = {};
    
    // Add job-specific parameters
    if (jobData.user_agent_type) extraParams.user_agent_type = jobData.user_agent_type;
    if (jobData.context) extraParams.context = jobData.context;
    if (jobData.parse) extraParams.parse = jobData.parse;
    if (jobData.callback_url) extraParams.callback_url = jobData.callback_url;
    
    // Add request parameters
    if (requestParams.source) extraParams.source = requestParams.source;
    if (requestParams.render) extraParams.render = requestParams.render;
    if (requestParams.parse_instructions) extraParams.parse_instructions = requestParams.parse_instructions;
    
    return Object.keys(extraParams).length > 0 ? extraParams : null;
  }

  /**
   * Insert mapped data into staging_serps table
   * @param {Object} stagingRecord - Mapped staging record
   * @returns {Promise<Object>} Insert result
   */
  async insertIntoStaging(stagingRecord) {
    try {
      console.log('🔄 Inserting into staging_serps table...');
      console.log(`📋 Job ID: ${stagingRecord.job_id}`);
      console.log(`🔍 Query: "${stagingRecord.query}"`);
      console.log(`📍 Location: ${stagingRecord.location}`);
      console.log(`📊 Content size: ${JSON.stringify(stagingRecord.content).length} bytes`);
      
      // Count paid ads
      const paidAdsCount = stagingRecord.content?.results?.[0]?.content?.results?.paid?.length || 0;
      console.log(`🎯 Paid ads: ${paidAdsCount}`);
      
      const { data, error } = await this.supabase
        .from('staging_serps')
        .insert(stagingRecord)
        .select();
        
      if (error) {
        console.error('❌ Error inserting into staging_serps:', error.message);
        return {
          success: false,
          error: error.message
        };
      }
      
      console.log(`✅ Successfully inserted into staging_serps with ID: ${data[0].id}`);
      
      return {
        success: true,
        stagingId: data[0].id,
        record: data[0]
      };
      
    } catch (error) {
      console.error('❌ Unexpected error inserting into staging_serps:', error.message);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Map and insert Oxylabs response in one step
   * @param {Object} oxylabsResponse - Raw Oxylabs response
   * @param {Object} requestParams - Original request parameters
   * @returns {Promise<Object>} Insert result
   */
  async mapAndInsert(oxylabsResponse, requestParams = {}) {
    const stagingRecord = this.mapToStagingFormat(oxylabsResponse, requestParams);
    return await this.insertIntoStaging(stagingRecord);
  }

  /**
   * Check if job already exists in staging
   * @param {string} jobId - Job ID to check
   * @returns {Promise<Object>} Check result
   */
  async checkExistingJob(jobId) {
    try {
      const { data, error } = await this.supabase
        .from('staging_serps')
        .select('id, status, error_message, created_at')
        .eq('job_id', jobId)
        .maybeSingle();
        
      if (error) {
        return {
          exists: false,
          error: error.message
        };
      }
      
      return {
        exists: !!data,
        record: data
      };
      
    } catch (error) {
      return {
        exists: false,
        error: error.message
      };
    }
  }

  /**
   * Validate staging record before insert
   * @param {Object} stagingRecord - Record to validate
   * @returns {Object} Validation result
   */
  validateStagingRecord(stagingRecord) {
    const errors = [];
    
    // Required fields validation
    if (!stagingRecord.job_id) errors.push('job_id is required');
    if (!stagingRecord.query) errors.push('query is required');
    if (!stagingRecord.location) errors.push('location is required');
    if (!stagingRecord.timestamp) errors.push('timestamp is required');
    if (!stagingRecord.content) errors.push('content is required');
    
    // Content structure validation
    if (stagingRecord.content && !stagingRecord.content.results) {
      errors.push('content.results is required');
    }
    
    return {
      isValid: errors.length === 0,
      errors
    };
  }
}

/**
 * Convenience function for quick mapping
 */
function mapOxylabsToStaging(oxylabsResponse, requestParams = {}) {
  const mapper = new StagingSerpMapper();
  return mapper.mapToStagingFormat(oxylabsResponse, requestParams);
}

/**
 * Convenience function for quick map and insert
 */
async function mapAndInsertOxylabsResponse(oxylabsResponse, requestParams = {}) {
  const mapper = new StagingSerpMapper();
  return await mapper.mapAndInsert(oxylabsResponse, requestParams);
}

module.exports = {
  StagingSerpMapper,
  mapOxylabsToStaging,
  mapAndInsertOxylabsResponse
};

// CLI support for testing
if (require.main === module) {
  const mapper = new StagingSerpMapper();
  
  // Example usage
  const exampleResponse = {
    job: {
      id: "example-job-123",
      query: "restaurants near me",
      geo_location: "Miami, FL",
      device: "desktop",
      created_at: "2025-06-12T10:30:00Z",
      user_agent_type: "desktop",
      context: [
        { key: "ad_extraction", value: "true" }
      ]
    },
    results: [
      {
        content: {
          url: "https://www.google.com/search?q=restaurants+near+me",
          results: {
            paid: [
              {
                pos: 1,
                url: "https://example-restaurant.com",
                title: "Best Restaurant in Miami",
                desc: "Authentic cuisine and great service",
                url_shown: "example-restaurant.com",
                pos_overall: 1,
                price: "$25-40",
                rating: 4.5,
                review_count: 120
              }
            ],
            organic: [
              {
                pos: 1,
                url: "https://yelp.com/restaurants-miami",
                title: "Top Restaurants in Miami - Yelp",
                desc: "Find the best restaurants in Miami",
                url_shown: "yelp.com"
              }
            ]
          }
        },
        status_code: 200,
        created_at: "2025-06-12T10:30:00Z"
      }
    ]
  };
  
  const requestParams = {
    source: "google_ads",
    locale: "en-US"
  };
  
  console.log('🧪 Testing staging mapper...');
  const mapped = mapper.mapToStagingFormat(exampleResponse, requestParams);
  console.log('✅ Mapping successful');
  console.log('📋 Mapped record keys:', Object.keys(mapped));
  console.log('📊 Content structure:', Object.keys(mapped.content));
  console.log('🎯 Paid ads count:', mapped.content.results[0].content.results.paid.length);
  
  const validation = mapper.validateStagingRecord(mapped);
  console.log('✅ Validation result:', validation);
}
