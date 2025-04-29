// Google Scraper with Oxylabs Web Unblocker using correct city format
const http = require('http');
const https = require('https');
const cheerio = require('cheerio');
const fs = require('fs/promises');
const path = require('path');
const { Storage } = require('@google-cloud/storage');

// Get Oxylabs credentials from environment variables or use defaults
const getCredentials = () => {
  return {
    username: process.env.OXYLABS_USERNAME || 'your_username',
    password: process.env.OXYLABS_PASSWORD || 'your_password'
  };
};

/**
 * Make HTTP request through Oxylabs proxy
 * @param {string} url - Target URL
 * @param {Object} headers - HTTP headers
 * @param {boolean} returnBuffer - Whether to return a buffer instead of text
 * @returns {Promise<Object>} - Response object with statusCode and data
 */
function requestThroughProxy(url, headers = {}, returnBuffer = false) {
  return new Promise((resolve, reject) => {
    const { username, password } = getCredentials();
    
    // Auth credentials base64 encoded
    const auth = Buffer.from(`${username}:${password}`).toString('base64');
    
    // Request options
    const options = {
      host: 'unblock.oxylabs.io',
      port: 60000,
      path: url,
      headers: {
        'Proxy-Authorization': `Basic ${auth}`,
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/91.0.4472.124 Safari/537.36',
        'Accept-Language': 'en-US,en;q=0.9',
        ...headers
      },
      method: 'GET',
      rejectUnauthorized: false // Disable SSL verification
    };
    
    // Create the request
    const req = https.request(options, (res) => {
      const chunks = [];
      
      // Collect data chunks
      res.on('data', (chunk) => {
        chunks.push(chunk);
      });
      
      // Handle end of response
      res.on('end', () => {
        const buffer = Buffer.concat(chunks);
        let data;
        
        if (returnBuffer) {
          data = buffer;
        } else {
          data = buffer.toString('utf8');
        }
        
        resolve({
          statusCode: res.statusCode,
          headers: res.headers,
          data
        });
      });
    });
    
    // Handle errors
    req.on('error', (error) => {
      reject(error);
    });
    
    // End the request
    req.end();
  });
}

/**
 * Scrape Google search results
 * @param {string} keyword - Search keyword
 * @param {string} location - Location in format "city, state, United States"
 * @param {boolean} captureScreenshot - Whether to capture a screenshot
 * @param {boolean} uploadToGCS - Whether to upload results to Google Cloud Storage
 * @param {string} bucketName - Google Cloud Storage bucket name
 * @param {boolean} debug - Enable debug mode with detailed logging
 */
async function scrapeGoogle(keyword, location, captureScreenshot = true, uploadToGCS = false, bucketName = '', debug = false) {
  try {
    console.log(`Scraping Google for keyword: "${keyword}" in location: "${location}"`);
    
    // Append "near me" for local searches that might not have local intent already
    let searchTerm = keyword;
    if (location && location.trim() !== 'United States' && 
        !keyword.toLowerCase().includes('near me') && 
        !keyword.toLowerCase().includes('in ')) {
      // If searching for a local service but didn't specify location in the query
      if (keyword.match(/plumber|electrician|carpenter|dentist|doctor|restaurant|shop|store|barber|salon/i)) {
        searchTerm = `${keyword} near me`;
        console.log(`Enhancing local search intent: "${searchTerm}"`);
      }
    }
    
    // Create URL with encoded keyword and search parameters
    const searchUrl = `https://www.google.com/search?q=${encodeURIComponent(searchTerm)}&gl=us&hl=en&pws=0`;
    
    if (debug) {
      console.log('Debug Mode: ON');
      console.log('Search URL:', searchUrl);
    }
    
    // Set up base headers
    const baseHeaders = {};
    
    // Format location according to Oxylabs documentation
    if (location && location.trim() !== '') {
      // Handle different location formats
      if (location.includes(',')) {
        // Location already has commas, use it directly but ensure no spaces after commas
        const parts = location.split(',').map(part => part.trim());
        const formattedLocation = parts.join(',');
        baseHeaders['x-oxylabs-geo-location'] = formattedLocation;
        
        if (debug) {
          console.log('Using formatted geo-location:', formattedLocation);
        }
      } else if (location.toLowerCase() === 'cambridge' || location.toLowerCase().includes('cambridge')) {
        // Special case for Cambridge, MA
        baseHeaders['x-oxylabs-geo-location'] = 'Cambridge,Massachusetts,United States';
        
        if (debug) {
          console.log('Using Cambridge,Massachusetts,United States geo-location');
        }
      } else if (location.toLowerCase() === 'boston' || location.toLowerCase().includes('boston')) {
        // Special case for Boston, MA
        baseHeaders['x-oxylabs-geo-location'] = 'Boston,Massachusetts,United States';
        
        if (debug) {
          console.log('Using Boston,Massachusetts,United States geo-location');
        }
      } else {
        // Just use the location as is
        baseHeaders['x-oxylabs-geo-location'] = location.trim();
        
        if (debug) {
          console.log('Using geo-location:', location.trim());
        }
      }
    }
    
    // First check IP location if in debug mode
    if (debug) {
      console.log('Checking IP location...');
      try {
        const ipCheckResponse = await requestThroughProxy('https://ip.oxylabs.io/location');
        
        if (ipCheckResponse.statusCode === 200) {
          console.log('IP Location Data:', ipCheckResponse.data);
        } else {
          console.warn('Failed to check IP location:', ipCheckResponse.statusCode);
        }
      } catch (error) {
        console.warn('Error checking IP location:', error.message);
      }
    }
    
    // For HTML content - get this first since it's most important
    console.log('Fetching HTML content...');
    const htmlHeaders = {
      ...baseHeaders,
      'X-Oxylabs-Render': 'html'
    };
    
    const htmlResponse = await requestThroughProxy(searchUrl, htmlHeaders);
    
    if (htmlResponse.statusCode !== 200) {
      throw new Error(`HTML fetch failed with status: ${htmlResponse.statusCode}`);
    }
    
    const html = htmlResponse.data;
    
    // For debug mode, save the raw HTML for inspection
    if (debug) {
      const debugDir = path.join(process.cwd(), 'debug');
      await fs.mkdir(debugDir, { recursive: true });
      const debugHtmlPath = path.join(debugDir, `raw_html_${Date.now()}.html`);
      await fs.writeFile(debugHtmlPath, html);
      console.log(`Debug HTML saved to ${debugHtmlPath}`);
    }
    
    // Parse HTML with Cheerio
    const $ = cheerio.load(html);
    
    // For capturing screenshot if requested - do this after we confirm HTML works
    let screenshotBuffer;
    if (captureScreenshot) {
      console.log('Capturing screenshot...');
      try {
        const screenshotHeaders = {
          ...baseHeaders,
          'X-Oxylabs-Render': 'png'
        };
        
        const screenshotResponse = await requestThroughProxy(searchUrl, screenshotHeaders, true);
        
        if (screenshotResponse.statusCode === 200) {
          screenshotBuffer = screenshotResponse.data;
        } else {
          console.error(`Screenshot capture failed with status: ${screenshotResponse.statusCode}`);
        }
      } catch (error) {
        console.error('Error capturing screenshot:', error.message);
      }
    }
    
    // Check if we're getting ads in debug mode
    if (debug) {
      const adElements = $('div[data-text-ad="1"]');
      console.log(`Found ${adElements.length} potential ad elements`);
      
      // Log some ad details if found
      adElements.each((i, el) => {
        const adElement = $(el);
        const titleElement = adElement.find('div[role="heading"]').first();
        console.log(`Ad ${i+1} title: ${titleElement.text().trim()}`);
      });
    }
    
    // Extract ads and search results
    const results = {
      keyword,
      location,
      timestamp: new Date().toISOString(),
      ads: {
        top: extractTopAds($),
        bottom: extractBottomAds($)
      },
      organicResults: extractOrganicResults($),
      localPack: extractLocalPack($),
      // Adding metadata about the response
      meta: {
        language: $('html').attr('lang') || 'unknown',
        url: searchUrl
      }
    };
    
    // Create a directory for results if it doesn't exist
    const resultsDir = path.join(process.cwd(), 'results');
    await fs.mkdir(resultsDir, { recursive: true });
    
    // Generate a filename based on keyword and timestamp
    const sanitizedKeyword = keyword.replace(/[^a-z0-9]/gi, '_').toLowerCase();
    const sanitizedLocation = location ? location.replace(/[^a-z0-9]/gi, '_').toLowerCase() : 'no_location';
    const timestamp = Date.now();
    const fileBaseName = `${sanitizedKeyword}_${sanitizedLocation}_${timestamp}`;
    
    // Save JSON results
    const jsonPath = path.join(resultsDir, `${fileBaseName}.json`);
    await fs.writeFile(jsonPath, JSON.stringify(results, null, 2));
    console.log(`Results saved to ${jsonPath}`);
    
    // Save screenshot if captured
    let screenshotPath;
    if (captureScreenshot && screenshotBuffer) {
      screenshotPath = path.join(resultsDir, `${fileBaseName}.png`);
      await fs.writeFile(screenshotPath, screenshotBuffer);
      console.log(`Screenshot saved to ${screenshotPath}`);
    }
    
    // Upload to Google Cloud Storage if requested
    if (uploadToGCS && bucketName) {
      await uploadToGoogleCloudStorage(bucketName, jsonPath, screenshotPath);
    }
    
    return {
      results,
      jsonPath,
      screenshotPath
    };
  } catch (error) {
    console.error('Error scraping Google:', error);
    throw error;
  }
}

/**
 * Extract top ads from Google search results with improved detail parsing
 * @param {CheerioStatic} $ - Cheerio instance
 * @returns {Array} - Array of ad objects
 */
function extractTopAds($) {
  const ads = [];
  
  // Method 1: Standard data-text-ad attribute
  $('div[data-text-ad="1"]').each((i, el) => {
    const adElement = $(el);
    // Skip if this is in the bottom ads section
    if (adElement.parents('#bottomads').length) {
      return;
    }
    
    const titleElement = adElement.find('div[role="heading"]').first();
    
    // Try multiple selectors for the URL element
    let urlElement = adElement.find('a[data-pcu]').first();
    if (!urlElement.length) {
      urlElement = adElement.find('a[ping]').first();
    }
    if (!urlElement.length) {
      urlElement = adElement.find('a').first();
    }
    
    // Look for description elements in different ways
    let descriptionElement = adElement.find('div[data-dtld="true"]').first();
    if (!descriptionElement.length) {
      descriptionElement = adElement.find('div:not([role])').eq(1);
    }
    if (!descriptionElement.length) {
      // Try to find any other text container that might have description
      descriptionElement = adElement.find('div').filter(function() {
        const text = $(this).text().trim();
        return text.length > 20 && !$(this).find('div[role="heading"]').length;
      }).first();
    }
    
    // Look for display URL in more ways
    let displayUrl = '';
    const citeElement = adElement.find('cite').first();
    if (citeElement.length) {
      displayUrl = citeElement.text().trim();
    } else {
      const urlTextElement = adElement.find('span[role="text"]').first();
      if (urlTextElement.length) {
        displayUrl = urlTextElement.text().trim();
      }
    }
    
    // Look for any additional data like sitelinks, callouts, etc.
    const sitelinks = [];
    adElement.find('a[data-pcu]').each((j, link) => {
      const linkElement = $(link);
      const linkTitle = linkElement.text().trim();
      const linkUrl = linkElement.attr('href') || '';
      
      // Only add if it's not the main link and has a title
      if (j > 0 && linkTitle && linkTitle !== titleElement.text().trim()) {
        sitelinks.push({
          title: linkTitle,
          url: linkUrl
        });
      }
    });
    
    // Look for other ad extensions like callouts, structured snippets, etc.
    const extensions = [];
    adElement.find('div:not([role])').each((j, ext) => {
      const extElement = $(ext);
      const extText = extElement.text().trim();
      
      // Skip if it's empty, too short, or likely a part of the description
      if (extText && extText.length > 3 && extText.length < 50 && 
          extText !== descriptionElement.text().trim() &&
          !extText.includes(titleElement.text().trim())) {
        extensions.push(extText);
      }
    });
    
    // Try to identify the advertiser name/domain
    let advertiser = '';
    const domainMatch = displayUrl.match(/https?:\/\/(?:www\.)?([^\/]+)/i);
    if (domainMatch && domainMatch[1]) {
      advertiser = domainMatch[1];
    }
    
    if (titleElement.length && urlElement.length) {
      ads.push({
        title: titleElement.text().trim(),
        url: urlElement.attr('href') || urlElement.attr('data-pcu') || '',
        displayUrl: displayUrl,
        description: descriptionElement.text().trim(),
        position: i + 1,
        containerType: 'standard',
        advertiser: advertiser,
        sitelinks: sitelinks.length > 0 ? sitelinks : undefined,
        extensions: extensions.length > 0 ? extensions : undefined
      });
    }
  });
  
  // Method 2: Look for ads in specific containers like 'commercial unit'
  $('div#tads a').each((i, el) => {
    const adElement = $(el);
    const titleElement = adElement.find('div[role="heading"]').first();
    const descriptionElement = adElement.find('div:not([role])').eq(1);
    
    // Only add if not already found by Method 1
    if (titleElement.length && ads.findIndex(ad => ad.title === titleElement.text().trim()) === -1) {
      // Try to get display URL
      let displayUrl = '';
      const urlTextElement = adElement.find('span[role="text"]').first();
      if (urlTextElement.length) {
        displayUrl = urlTextElement.text().trim();
      } else {
        const citeElement = adElement.find('cite').first();
        if (citeElement.length) {
          displayUrl = citeElement.text().trim();
        }
      }
      
      // Try to identify the advertiser name/domain
      let advertiser = '';
      const domainMatch = displayUrl.match(/https?:\/\/(?:www\.)?([^\/]+)/i);
      if (domainMatch && domainMatch[1]) {
        advertiser = domainMatch[1];
      }
      
      ads.push({
        title: titleElement.text().trim(),
        url: adElement.attr('href') || '',
        displayUrl: displayUrl,
        description: descriptionElement.text().trim(),
        position: i + 1,
        containerType: 'tads',
        advertiser: advertiser
      });
    }
  });
  
  // Method 3: Try other common ad containers
  $('div[aria-label="Ads"]').each((i, el) => {
    const adContainer = $(el);
    adContainer.find('a').each((j, linkEl) => {
      const adElement = $(linkEl);
      const titleElement = adElement.find('div[role="heading"]').first();
      const descriptionElement = adElement.find('div:not([role])').eq(1);
      
      // Only add if not already found by other methods
      if (titleElement.length && ads.findIndex(ad => ad.title === titleElement.text().trim()) === -1) {
        // Try to get display URL
        let displayUrl = '';
        const urlTextElement = adElement.find('span[role="text"]').first();
        if (urlTextElement.length) {
          displayUrl = urlTextElement.text().trim();
        } else {
          const citeElement = adElement.find('cite').first();
          if (citeElement.length) {
            displayUrl = citeElement.text().trim();
          }
        }
        
        // Try to identify the advertiser name/domain
        let advertiser = '';
        const domainMatch = displayUrl.match(/https?:\/\/(?:www\.)?([^\/]+)/i);
        if (domainMatch && domainMatch[1]) {
          advertiser = domainMatch[1];
        }
        
        ads.push({
          title: titleElement.text().trim(),
          url: adElement.attr('href') || '',
          displayUrl: displayUrl,
          description: descriptionElement.text().trim(),
          position: ads.length + 1,
          containerType: 'aria-label-ads',
          advertiser: advertiser
        });
      }
    });
  });
  
  return ads;
}

/**
 * Extract bottom ads from Google search results with improved detail parsing
 * @param {CheerioStatic} $ - Cheerio instance
 * @returns {Array} - Array of ad objects
 */
function extractBottomAds($) {
  const ads = [];
  
  // Method 1: Standard approach for bottom ads
  $('div[data-text-ad="1"]').each((i, el) => {
    const adElement = $(el);
    // Only include if in bottom ads section
    if (adElement.parents('#bottomads').length) {
      const titleElement = adElement.find('div[role="heading"]').first();
      let urlElement = adElement.find('a[data-pcu]').first();
      if (!urlElement.length) {
        urlElement = adElement.find('a[ping]').first();
      }
      if (!urlElement.length) {
        urlElement = adElement.find('a').first();
      }
      
      // Look for description elements in different ways
      let descriptionElement = adElement.find('div[data-dtld="true"]').first();
      if (!descriptionElement.length) {
        descriptionElement = adElement.find('div:not([role])').eq(1);
      }
      if (!descriptionElement.length) {
        // Try to find any other text container that might have description
        descriptionElement = adElement.find('div').filter(function() {
          const text = $(this).text().trim();
          return text.length > 20 && !$(this).find('div[role="heading"]').length;
        }).first();
      }
      
      // Look for display URL in more ways
      let displayUrl = '';
      const citeElement = adElement.find('cite').first();
      if (citeElement.length) {
        displayUrl = citeElement.text().trim();
      } else {
        const urlTextElement = adElement.find('span[role="text"]').first();
        if (urlTextElement.length) {
          displayUrl = urlTextElement.text().trim();
        }
      }
      
      // Try to identify the advertiser name/domain
      let advertiser = '';
      const domainMatch = displayUrl.match(/https?:\/\/(?:www\.)?([^\/]+)/i);
      if (domainMatch && domainMatch[1]) {
        advertiser = domainMatch[1];
      }
      
      // Look for any additional data like sitelinks, callouts, etc.
      const sitelinks = [];
      adElement.find('a[data-pcu]').each((j, link) => {
        const linkElement = $(link);
        const linkTitle = linkElement.text().trim();
        const linkUrl = linkElement.attr('href') || '';
        
        // Only add if it's not the main link and has a title
        if (j > 0 && linkTitle && linkTitle !== titleElement.text().trim()) {
          sitelinks.push({
            title: linkTitle,
            url: linkUrl
          });
        }
      });
      
      if (titleElement.length && urlElement.length) {
        ads.push({
          title: titleElement.text().trim(),
          url: urlElement.attr('href') || urlElement.attr('data-pcu') || '',
          displayUrl: displayUrl,
          description: descriptionElement.text().trim(),
          position: i + 1,
          containerType: 'standard',
          advertiser: advertiser,
          sitelinks: sitelinks.length > 0 ? sitelinks : undefined
        });
      }
    }
  });
  
  // Method 2: Look for specific bottom ad containers
  $('#bottomads a').each((i, el) => {
    const adElement = $(el);
    const titleElement = adElement.find('div[role="heading"]').first();
    const descriptionElement = adElement.find('div:not([role])').eq(1);
    
    // Only add if not already found by Method 1
    if (titleElement.length && ads.findIndex(ad => ad.title === titleElement.text().trim()) === -1) {
      // Try to get display URL
      let displayUrl = '';
      const urlTextElement = adElement.find('span[role="text"]').first();
      if (urlTextElement.length) {
        displayUrl = urlTextElement.text().trim();
      } else {
        const citeElement = adElement.find('cite').first();
        if (citeElement.length) {
          displayUrl = citeElement.text().trim();
        }
      }
      
      // Try to identify the advertiser name/domain
      let advertiser = '';
      const domainMatch = displayUrl.match(/https?:\/\/(?:www\.)?([^\/]+)/i);
      if (domainMatch && domainMatch[1]) {
        advertiser = domainMatch[1];
      }
      
      ads.push({
        title: titleElement.text().trim(),
        url: adElement.attr('href') || '',
        displayUrl: displayUrl,
        description: descriptionElement.text().trim(),
        position: i + 1,
        containerType: 'bottomads',
        advertiser: advertiser
      });
    }
  });
  
  return ads;
}

/**
 * Extract organic search results from Google with improved detail parsing
 * @param {CheerioStatic} $ - Cheerio instance
 * @returns {Array} - Array of result objects
 */
function extractOrganicResults($) {
  const results = [];
  
  // Method 1: Standard organic result structure
  $('div.g').each((i, el) => {
    const resultElement = $(el);
    // Skip if this is part of a special feature or ad
    if (resultElement.parents('[data-feature="1"], [data-text-ad="1"], #bottomads, #tads').length) {
      return;
    }
    
    const titleElement = resultElement.find('h3').first();
    const urlElement = resultElement.find('a').first();
    
    // Try multiple approaches for description
    let descriptionElement = resultElement.find('div[data-sncf="1"] > div:not([class])').first();
    if (!descriptionElement.length) {
      descriptionElement = resultElement.find('div.VwiC3b').first();
    }
    if (!descriptionElement.length) {
      descriptionElement = resultElement.find('span.aCOpRe').first();
    }
    if (!descriptionElement.length) {
      descriptionElement = resultElement.find('div[style*="line-height"]').first();
    }
    
    if (titleElement.length && urlElement.length) {
      // Try to extract the real domain from the result
      let displayUrl = '';
      const citeElement = resultElement.find('cite').first();
      if (citeElement.length) {
        displayUrl = citeElement.text().trim();
      }
      
      // Check for rich snippets like ratings, dates, etc.
      const metadata = {};
      
      // Look for date
      const dateElement = resultElement.find('span[data-ved]').filter(function() {
        return /\d{1,2}\s+[a-z]{3,}\s+\d{4}/i.test($(this).text());
      }).first();
      if (dateElement.length) {
        metadata.date = dateElement.text().trim();
      }
      
      // Look for ratings
      const ratingElement = resultElement.find('span[aria-label*="stars"]').first();
      if (ratingElement.length) {
        const ratingMatch = ratingElement.attr('aria-label').match(/(\d+(\.\d+)?)\s+stars?/i);
        if (ratingMatch) {
          metadata.rating = parseFloat(ratingMatch[1]);
        }
        
        const reviewCountElement = ratingElement.parent().find('span:not([aria-label])').first();
        if (reviewCountElement.length) {
          const reviewMatch = reviewCountElement.text().match(/\((\d+)\)/);
          if (reviewMatch) {
            metadata.reviewCount = parseInt(reviewMatch[1], 10);
          }
        }
      }
      
      // Try to normalize the URL
      let normalizedUrl = urlElement.attr('href') || '';
      try {
        // If it's a Google redirect URL, try to extract the real URL
        if (normalizedUrl.startsWith('/url?')) {
          const urlObj = new URL('https://www.google.com' + normalizedUrl);
          const realUrl = urlObj.searchParams.get('url') || urlObj.searchParams.get('q');
          if (realUrl) {
            normalizedUrl = realUrl;
          }
        }
      } catch (e) {
        // If URL parsing fails, just use the original URL
      }
      
      // Create result object with all the data
      const resultObj = {
        title: titleElement.text().trim(),
        url: normalizedUrl,
        displayUrl: displayUrl,
        description: descriptionElement.text().trim(),
        position: results.length + 1,
        type: 'organic'
      };
      
      // Add metadata if we found any
      if (Object.keys(metadata).length > 0) {
        resultObj.metadata = metadata;
      }
      
      // Add to results
      results.push(resultObj);
    }
  });
  
  // Method 2: Alternative organic result structure
  $('div[data-sokoban-grid]').find('div[data-header-feature="0"]').each((i, el) => {
    const resultElement = $(el);
    // Skip if already processed or part of special features
    if (resultElement.parents('[data-feature="1"], [data-text-ad="1"], #bottomads, #tads').length) {
      return;
    }
    
    const titleElement = resultElement.find('h3').first();
    const urlElement = resultElement.find('a[href^="http"]').first();
    
    // Try multiple approaches for description
    let descriptionElement = resultElement.find('div[style^="line-height"]').first();
    if (!descriptionElement.length) {
      descriptionElement = resultElement.find('div.VwiC3b').first();
    }
    if (!descriptionElement.length) {
      descriptionElement = resultElement.find('div').filter(function() {
        const text = $(this).text().trim();
        return text.length > 20 && !$(this).find('h3').length;
      }).first();
    }
    
    if (titleElement.length && urlElement.length && 
        results.findIndex(r => r.title === titleElement.text().trim()) === -1) {
      // Try to extract the real domain from the result
      let displayUrl = '';
      const citeElement = resultElement.find('cite').first();
      if (citeElement.length) {
        displayUrl = citeElement.text().trim();
      }
      
      // Create result object
      const resultObj = {
        title: titleElement.text().trim(),
        url: urlElement.attr('href') || '',
        displayUrl: displayUrl,
        description: descriptionElement.text().trim(),
        position: results.length + 1,
        type: 'organic-alt'
      };
      
      // Add to results
      results.push(resultObj);
    }
  });
  
  // Method 3: Featured snippets and other special results
  $('div[data-tts="answers"]').each((i, el) => {
    const snippetElement = $(el);
    const titleElement = snippetElement.find('h3').first();
    const contentElement = snippetElement.find('div').filter(function() {
      return $(this).text().trim().length > 20;
    }).first();
    
    if (contentElement.length) {
      // Try to find the source
      const urlElement = snippetElement.find('a[href^="http"]').first();
      const citeElement = snippetElement.find('cite').first();
      
      results.push({
        title: titleElement.length ? titleElement.text().trim() : 'Featured Snippet',
        url: urlElement.length ? urlElement.attr('href') : '',
        displayUrl: citeElement.length ? citeElement.text().trim() : '',
        description: contentElement.text().trim(),
        position: results.length + 1,
        type: 'featured-snippet'
      });
    }
  });
  
  return results;
}

/**
 * Extract local pack results from Google
 * @param {CheerioStatic} $ - Cheerio instance
 * @returns {Array} - Array of local business objects
 */
function extractLocalPack($) {
  const localResults = [];
  
  // Try multiple approaches for local pack extraction
  
  // Method 1: Standard local pack structure
  $('div[data-local-attribute="d3bn"] div[role="heading"]').each((i, el) => {
    const headingElement = $(el);
    const cardElement = headingElement.closest('div[jscontroller]');
    
    if (cardElement.length) {
      const addressElement = cardElement.find('div[data-local-attribute="d3adr"]').first();
      const ratingElement = cardElement.find('span[aria-label*="stars"]').first();
      const phoneElement = cardElement.find('span[aria-label*="phone"]').first();
      
      localResults.push({
        name: headingElement.text().trim(),
        address: addressElement.text().trim(),
        rating: ratingElement.length ? parseFloat(ratingElement.attr('aria-label').match(/[\d.]+/)[0]) : null,
        reviewCount: ratingElement.parent().text().match(/\d+/)?.[0] || null,
        phone: phoneElement.text().trim(),
        position: i + 1,
        type: 'standard'
      });
    }
  });
  
  // Method 2: Alternative local pack structure
  if (localResults.length === 0) {
    $('div[data-ved][role="heading"]').each((i, el) => {
      const headingElement = $(el);
      // Check if this is likely a local business
      const parentElement = headingElement.parent().parent();
      const hasAddress = parentElement.text().match(/\d+\s+\w+\s+(St|Ave|Blvd|Rd|Drive|Lane|Court|Way)/i);
      
      if (hasAddress) {
        const addressText = parentElement.text().replace(headingElement.text(), '').trim();
        
        // Try to extract rating if available
        let rating = null;
        let reviewCount = null;
        const ratingText = parentElement.find('span[aria-hidden="true"]').text();
        if (ratingText) {
          const ratingMatch = ratingText.match(/([\d.]+)/);
          if (ratingMatch) rating = parseFloat(ratingMatch[1]);
          
          const reviewMatch = parentElement.text().match(/\((\d+)\)/);
          if (reviewMatch) reviewCount = reviewMatch[1];
        }
        
        localResults.push({
          name: headingElement.text().trim(),
          address: addressText,
          rating: rating,
          reviewCount: reviewCount,
          position: i + 1,
          type: 'alternative'
        });
      }
    });
  }
  
  // Method 3: "Local Results" carousel
  if (localResults.length === 0) {
    $('div[aria-label="Local Results"] div[role="heading"]').each((i, el) => {
      const headingElement = $(el);
      const cardElement = headingElement.closest('div[jsname]');
      
      if (cardElement.length) {
        // Find address and other data
        const textElements = cardElement.find('div[role="text"]');
        const addressElement = textElements.eq(0);
        const additionalElement = textElements.eq(1);
        
        localResults.push({
          name: headingElement.text().trim(),
          address: addressElement.text().trim(),
          additionalInfo: additionalElement.text().trim(),
          position: i + 1,
          type: 'carousel'
        });
      }
    });
  }
  
  return localResults;
}

/**
 * Upload files to Google Cloud Storage
 * @param {string} bucketName - Google Cloud Storage bucket name
 * @param {string} jsonPath - Path to JSON file
 * @param {string} screenshotPath - Path to screenshot file
 */
async function uploadToGoogleCloudStorage(bucketName, jsonPath, screenshotPath) {
  try {
    console.log(`Uploading files to Google Cloud Storage bucket: ${bucketName}`);
    
    // Create a storage client
    // Note: This assumes you have set up authentication via environment variable
    // GOOGLE_APPLICATION_CREDENTIALS pointing to your service account key file
    const storage = new Storage();
    const bucket = storage.bucket(bucketName);
    
    // Upload JSON file
    if (jsonPath) {
      const jsonFileName = path.basename(jsonPath);
      await bucket.upload(jsonPath, {
        destination: `google-scraper/${jsonFileName}`,
        metadata: {
          contentType: 'application/json',
        },
      });
      console.log(`JSON file uploaded to gs://${bucketName}/google-scraper/${jsonFileName}`);
    }
    
    // Upload screenshot file
    if (screenshotPath) {
      const screenshotFileName = path.basename(screenshotPath);
      await bucket.upload(screenshotPath, {
        destination: `google-scraper/${screenshotFileName}`,
        metadata: {
          contentType: 'image/png',
        },
      });
      console.log(`Screenshot uploaded to gs://${bucketName}/google-scraper/${screenshotFileName}`);
    }
    
    console.log('Upload to Google Cloud Storage completed successfully');
  } catch (error) {
    console.error('Error uploading to Google Cloud Storage:', error);
    throw error;
  }
}

// Export the main function
module.exports = {
  scrapeGoogle
};