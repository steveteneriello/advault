// adfinder.js - Main application file with enhanced HTML parsing
const express = require('express');
const bodyParser = require('body-parser');
const request = require('request-promise');
const cors = require('cors');
const fs = require('fs');
const cheerio = require('cheerio');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

// Create Express app
const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(express.static('public'));

// Load CA certificate
let ca;
try {
  // Update this path to where your .crt file is located
  ca = fs.readFileSync('./brightdata.crt');
  console.log('Successfully loaded Bright Data certificate');
} catch (error) {
  console.warn('Warning: Could not load certificate file:', error.message);
  console.warn('Will try to proceed without certificate validation (less secure)');
  ca = null;
}

// Bright Data credentials
const BRIGHT_DATA_USER = process.env.BRIGHT_DATA_USER || 'hl_45067457';
const BRIGHT_DATA_ZONE = process.env.BRIGHT_DATA_ZONE || 'residential';
const BRIGHT_DATA_PASSWORD = process.env.BRIGHT_DATA_PASSWORD || 'ob9i9f9ad65g';
const BRIGHT_DATA_HOST = process.env.BRIGHT_DATA_HOST || 'brd.superproxy.io';
const BRIGHT_DATA_PORT = process.env.BRIGHT_DATA_PORT || '33335';

// Optional Supabase integration
let supabase = null;
if (process.env.SUPABASE_URL && process.env.SUPABASE_KEY) {
  supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);
}

/**
 * Extract ad data from JSON response
 */
function extractAdsDataFromJson(jsonData) {
  if (!jsonData || !jsonData.ads) {
    return { 
      adMetrics: { 
        hasAds: false, 
        totalAds: 0 
      } 
    };
  }
  
  return {
    topAds: jsonData.ads.top || [],
    bottomAds: jsonData.ads.bottom || [],
    shoppingAds: jsonData.shopping_results || [],
    allAdsParams: jsonData.ads.adwords_data || {},
    adMetrics: {
      totalAds: (jsonData.ads.top?.length || 0) + 
               (jsonData.ads.bottom?.length || 0) + 
               (jsonData.shopping_results?.length || 0),
      hasAds: !!(jsonData.ads.top?.length || 
                jsonData.ads.bottom?.length || 
                jsonData.shopping_results?.length),
      adPositions: [...(jsonData.ads.top || []), ...(jsonData.ads.bottom || [])].map((ad, i) => ad.position || i + 1),
      adDomains: [...(jsonData.ads.top || []), ...(jsonData.ads.bottom || [])].map(ad => {
        try {
          return new URL(ad.link || ad.url || "https://example.com").hostname;
        } catch (e) {
          return 'unknown';
        }
      })
    }
  };
}

/**
 * Enhanced HTML parsing function for ads and search results
 * @param {string} html - The HTML content to parse
 * @returns {Object} Structured data extracted from HTML
 */
function extractAdsDataFromHtml(html) {
  if (!html) return { adMetrics: { hasAds: false, totalAds: 0 } };
  
  const $ = cheerio.load(html);
  
  // Enhanced ad data extraction
  const adsData = {
    topAds: [],
    bottomAds: [],
    shoppingAds: [],
    searchResults: [],
    organicResults: [],
    allAdsParams: {},
    adMetrics: {
      totalAds: 0,
      hasAds: false,
      adPositions: [],
      adDomains: []
    }
  };
  
  // Extract top and bottom text ads
  const extractAds = (selector) => {
    $(selector).each((index, element) => {
      const $ad = $(element);
      
      // Try to extract different ad components
      const title = $ad.find('h3').text().trim();
      const link = $ad.find('a').attr('href');
      const displayUrl = $ad.find('.ads-creative cite, .ads-label').text().trim();
      const description = $ad.find('.ads-creative, .ads-description').text().trim();
      
      if (title || link) {
        const adInfo = {
          title,
          link,
          displayUrl,
          description,
          position: index + 1
        };
        
        // Categorize ad position
        if (index < 3) {
          adsData.topAds.push(adInfo);
        } else {
          adsData.bottomAds.push(adInfo);
        }
        
        // Extract domain
        try {
          const domain = new URL(link || displayUrl).hostname;
          adsData.adMetrics.adDomains.push(domain);
        } catch (e) {
          adsData.adMetrics.adDomains.push('unknown');
        }
      }
    });
  };
  
  // Selectors for different types of ads
  const adSelectors = [
    'div[data-text-ad]',
    '.ads-creative',
    '.sponsored-content',
    '[aria-label="Ads"]'
  ];
  
  // Try multiple ad selectors
  adSelectors.forEach(selector => {
    extractAds(selector);
  });
  
  // Extract shopping ads
  $('.shopping-result, .product-card').each((index, element) => {
    const $product = $(element);
    const productInfo = {
      title: $product.find('.product-title').text().trim(),
      price: $product.find('.product-price').text().trim(),
      link: $product.find('a').attr('href'),
      source: $product.find('.product-source').text().trim()
    };
    
    if (productInfo.title || productInfo.price) {
      adsData.shoppingAds.push(productInfo);
    }
  });
  
  // Extract organic search results
  $('#search .g, .search-result').each((index, element) => {
    const $result = $(element);
    const resultInfo = {
      title: $result.find('h3').text().trim(),
      link: $result.find('a').attr('href'),
      snippet: $result.find('.snippet, .description').text().trim()
    };
    
    if (resultInfo.title) {
      adsData.organicResults.push(resultInfo);
    }
  });
  
  // Update ad metrics
  adsData.adMetrics.totalAds = adsData.topAds.length + adsData.bottomAds.length + adsData.shoppingAds.length;
  adsData.adMetrics.hasAds = adsData.adMetrics.totalAds > 0;
  adsData.adMetrics.adPositions = [...adsData.topAds, ...adsData.bottomAds].map((ad, i) => ad.position || i + 1);
  
  return adsData;
}

/**
 * Get browser-specific user agent and headers
 */
function getBrowserHeaders(browser = 'chrome', deviceType = 'desktop') {
  const headers = {
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
    'Accept-Language': 'en-US,en;q=0.5',
    'Connection': 'keep-alive',
    'Upgrade-Insecure-Requests': '1'
  };
  
  // Set User-Agent based on browser and device type
  switch(browser.toLowerCase()) {
    case 'firefox':
      if (deviceType === 'mobile') {
        headers['User-Agent'] = 'Mozilla/5.0 (Android 12; Mobile; rv:68.0) Gecko/68.0 Firefox/96.0';
      } else {
        headers['User-Agent'] = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:96.0) Gecko/20100101 Firefox/96.0';
      }
      break;
    case 'safari':
      if (deviceType === 'mobile') {
        headers['User-Agent'] = 'Mozilla/5.0 (iPhone; CPU iPhone OS 15_3 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/15.2 Mobile/15E148 Safari/604.1';
      } else {
        headers['User-Agent'] = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 12_2) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/15.2 Safari/605.1.15';
      }
      break;
    case 'edge':
      headers['User-Agent'] = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/98.0.4758.80 Safari/537.36 Edg/98.0.1108.43';
      break;
    case 'chrome':
    default:
      if (deviceType === 'mobile') {
        headers['User-Agent'] = 'Mozilla/5.0 (Linux; Android 12; SM-G991U) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/98.0.4758.87 Mobile Safari/537.36';
      } else {
        headers['User-Agent'] = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/98.0.4758.87 Safari/537.36';
      }
      break;
  }
  
  return headers;
}

/**
 * Main scraping function
 */
async function scrapeGoogleWithProxy(query, options = {}) {
  try {
    console.log(`Scraping Google for query: "${query}"`);
    
    // Build the base username using the EXACT format that works
    let baseUsername = `brd-customer-${BRIGHT_DATA_USER}-zone-${BRIGHT_DATA_ZONE}`;
    
    // Add location targeting if provided - using the exact working format
    if (options.locationName) {
      // Format directly like the working example
      if (options.locationName.includes('-')) {
        // Already formatted (e.g., "country-us-state-ma-city-boston")
        baseUsername = `brd-customer-${BRIGHT_DATA_USER}-zone-${BRIGHT_DATA_ZONE}-${options.locationName}`;
      } else {
        // Split location into parts
        const locationParts = options.locationName.split(',').map(part => part.trim().toLowerCase());
        
        if (locationParts.length >= 2) {
          // Format: city,state (e.g., "boston,ma")
          const city = locationParts[0].replace(/\s+/g, '_');
          const state = locationParts[1];
          const country = locationParts[2] || 'us';
          
          baseUsername = `brd-customer-${BRIGHT_DATA_USER}-zone-${BRIGHT_DATA_ZONE}-country-${country}-state-${state}-city-${city}`;
        } else {
          // Just a city name (e.g., "boston")
          const city = locationParts[0].replace(/\s+/g, '_');
          baseUsername = `brd-customer-${BRIGHT_DATA_USER}-zone-${BRIGHT_DATA_ZONE}-country-us-city-${city}`;
        }
      }
      
      console.log(`Using location-specific proxy for: ${options.locationName}`);
    } else if (options.country && options.country !== 'us') {
      baseUsername = `brd-customer-${BRIGHT_DATA_USER}-zone-${BRIGHT_DATA_ZONE}-country-${options.country.toLowerCase()}`;
      console.log(`Using country-specific proxy for: ${options.country}`);
    }
    
    console.log(`Base username: ${baseUsername}`);
    
    // Build the full proxy URL - use the exact format that's working for you
    const proxyUrl = `http://${baseUsername}:${BRIGHT_DATA_PASSWORD}@${BRIGHT_DATA_HOST}:${BRIGHT_DATA_PORT}`;
    
    // Build search URL and parameters
    let searchUrl = 'https://www.google.com/search';
    
    // Build query parameters
    const searchParams = {
      q: query,
      hl: options.language || 'en'
    };
    
    // Add optional parameters
    if (options.num) searchParams.num = options.num;
    if (options.page && options.page > 1) searchParams.start = (options.page - 1) * (options.num || 10);
    if (options.searchType) searchParams.tbm = options.searchType;
    if (options.country) searchParams.gl = options.country.toLowerCase();
    if (options.uule) searchParams.uule = options.uule;
    
    // Get browser-specific headers
    const headers = getBrowserHeaders(options.browser, options.deviceType);
    
    console.log(`Making request to Google with proxy: ${proxyUrl.replace(BRIGHT_DATA_PASSWORD, '****')}`);
    console.log(`Search URL: ${searchUrl}`);
    console.log(`Parameters:`, searchParams);
    console.log(`Using browser: ${options.browser || 'chrome'}, device: ${options.deviceType || 'desktop'}`);
    
    // Request options
    const requestOptions = {
      url: searchUrl,
      qs: searchParams,
      proxy: proxyUrl,
      headers: headers,
      timeout: 60000, // 60 second timeout
      resolveWithFullResponse: true,
      simple: false, // Don't reject on non-2xx status codes
      encoding: 'utf8' // Ensure proper encoding
    };
    
    // Add CA certificate if available
    if (ca) {
      requestOptions.ca = ca;
    } else {
      // If no CA certificate, disable certificate validation (less secure)
      requestOptions.rejectUnauthorized = false;
    }
    
    // Make the request
    const response = await request(requestOptions);
    
    console.log(`Received response with status: ${response.statusCode}`);
    
    // Check if the request was successful
    if (response.statusCode !== 200) {
      throw new Error(`HTTP error: ${response.statusCode} ${response.statusMessage || ''}`);
    }
    
    // Process response
    let result = {
      keyword: query,
      country: options.country || 'us',
      locationName: options.locationName,
      browser: options.browser || 'chrome',
      deviceType: options.deviceType || 'desktop',
      timestamp: new Date().toISOString()
    };
    
    // Check if response is JSON (starts with { or [)
    const responseBody = response.body.trim();
    let jsonData = null;
    // Existing parsing logic with enhanced error handling
    if (responseBody.startsWith('{') || responseBody.startsWith('[')) {
      try {
        jsonData = JSON.parse(responseBody);
        console.log('Successfully parsed JSON response');
        
        const adsData = extractAdsDataFromJson(jsonData);
        
        result.data = {
          extractedAdsData: adsData,
          serp: jsonData,
          fullResponse: jsonData
        };
      } catch (e) {
        console.warn(`Warning: Response looks like JSON but failed to parse: ${e.message}`);
        jsonData = null;
      }
    }
    
    // If not valid JSON, use HTML parsing
    if (!jsonData) {
      console.log('Response is HTML, length:', responseBody.length);
      console.log('Response begins with:', responseBody.substring(0, 100));
      
      // Save the HTML to a file for debugging
      const filename = `google_html_${Date.now()}.html`;
      fs.writeFileSync(filename, responseBody);
      console.log(`Saved HTML response to ${filename} for debugging`);
      
      // Use enhanced HTML parsing
      const extractedAdsData = extractAdsDataFromHtml(responseBody);
      
      result.data = {
        html: responseBody,
        htmlLength: responseBody.length,
        extractedAdsData: extractedAdsData,
        htmlFilename: filename
      };
    }
    
    return result;
  } catch (error) {
    console.error(`Error scraping Google for "${query}":`, error.message);
    
    if (error.statusCode) {
      console.error(`Status code: ${error.statusCode}`);
    }
    
    throw new Error(`Google scraping failed: ${error.message}`);
  }
}

/**
 * Process multiple queries
 */
async function processMultipleQueries(queries, options = {}, useParallel = true) {
  if (useParallel) {
    const promises = queries.map(query => scrapeGoogleWithProxy(query, options));
    return Promise.all(promises);
  } else {
    const results = [];
    for (const query of queries) {
      try {
        const result = await scrapeGoogleWithProxy(query, options);
        results.push(result);
      } catch (error) {
        results.push({
          keyword: query,
          country: options.country,
          locationName: options.locationName,
          browser: options.browser,
          deviceType: options.deviceType,
          error: error.message,
          timestamp: new Date().toISOString()
        });
      }
    }
    return results;
  }
}

// Main API route
app.post('/api/search', async (req, res) => {
  try {
    // Parse request body
    const { 
      keywords, 
      location, 
      locationName, 
      useParallel = true,
      numResults,
      searchType,
      uule,
      page,
      deviceType,
      browser,
      language
    } = req.body;
    
    // Validate request
    if (!keywords || (Array.isArray(keywords) && keywords.length === 0)) {
      return res.status(400).json({ error: "At least one keyword is required" });
    }

    console.log(`Request received for ${Array.isArray(keywords) ? keywords.length : 1} keywords`);
    
    // Combine options
    const searchOptions = {
      country: location,
      locationName,
      num: numResults,
      searchType,
      uule,
      page,
      deviceType,
      browser,
      language
    };
    
    // Process request
    let results;
    
    if (Array.isArray(keywords)) {
      results = await processMultipleQueries(keywords, searchOptions, useParallel);
    } else {
      results = await scrapeGoogleWithProxy(keywords, searchOptions);
    }
    
    // Store in Supabase if configured
    if (supabase) {
      try {
        const { error } = await supabase
          .from('serp_results')
          .insert(Array.isArray(results) ? 
            results.map(result => ({
              keyword: result.keyword,
              country: result.country,
              location_name: result.locationName || null,
              browser: result.browser || 'chrome',
              device_type: result.deviceType || 'desktop',
              results: result.data,
              created_at: new Date().toISOString()
            })) : 
            {
              keyword: results.keyword,
              country: results.country,
              location_name: results.locationName || null,
              browser: results.browser || 'chrome',
              device_type: results.deviceType || 'desktop',
              results: results.data,
              created_at: new Date().toISOString()
            }
          );
          
        if (error) {
          console.error("Error storing results in Supabase:", error);
        }
      } catch (dbError) {
        console.error("Database operation failed:", dbError);
      }
    }
    
    // Return results
    return res.json({
      results,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error("Error processing request:", error);
    return res.status(500).json({ 
      error: "Internal server error", 
      details: error.message 
    });
  }
});

// Simple health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Simple home page
app.get('/', (req, res) => {
  res.sendFile(__dirname + '/public/index.html');
});

// Start server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

// Export for testing
module.exports = {
  app,
  scrapeGoogleWithProxy,
  processMultipleQueries,
  extractAdsDataFromHtml,
  extractAdsDataFromJson
};