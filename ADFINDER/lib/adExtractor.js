/**
 * Advanced Google Ads Extractor
 * 
 * This module provides functions to extract Google Ads data from HTML content
 * scraped from search engine results pages (SERPs).
 */

/**
 * Extract all ad-related data from HTML content
 * @param {string} html - The HTML content from the SERP
 * @returns {Object} - An object containing extracted ad data
 */
function extractAdsFromHtml(html) {
  if (!html || typeof html !== 'string') {
    return { 
      adMetrics: { 
        hasAds: false, 
        totalAds: 0 
      } 
    };
  }
  
  // Initialize results object
  const adsData = {
    topAds: [],
    bottomAds: [],
    shoppingAds: [],
    allAdsParams: {},
    adMetrics: {
      totalAds: 0,
      hasAds: false,
      adPositions: [],
      adDomains: new Set(),
      hasSitelinks: false,
      hasPhoneNumber: false,
      avgTitleLength: 0,
      avgDescriptionLength: 0
    }
  };
  
  // Check if there are any ads in the HTML (common markers)
  const hasAds = html.includes('data-text-ad') || 
                html.includes('commercial') || 
                html.includes('shopping-results') ||
                html.includes('Sponsored') ||
                html.includes('ads-ad') ||
                html.includes('adsbygoogle');
                
  adsData.adMetrics.hasAds = hasAds;
  
  if (!hasAds) {
    return adsData;
  }
  
  // Extract text ads (both top and bottom)
  extractTextAds(html, adsData);
  
  // Extract shopping ads
  extractShoppingAds(html, adsData);
  
  // Extract ad parameters (gclid, etc.)
  extractAdParameters(html, adsData);
  
  // Calculate additional metrics
  calculateAdMetrics(adsData);
  
  return adsData;
}

/**
 * Extract text ads from HTML
 * @param {string} html - The HTML content
 * @param {Object} adsData - The results object to be updated
 */
function extractTextAds(html, adsData) {
  // Common patterns for ad containers
  const adContainerPatterns = [
    /<div[^>]*?(?:data-text-ad|commercial|ads-ad)[^>]*?>[\s\S]*?<\/div>/gi,
    /<div[^>]*?class="[^"]*?ad-container[^"]*?"[^>]*?>[\s\S]*?<\/div>/gi,
    /<div[^>]*?class="[^"]*?(?:ad_|adUnit)[^"]*?"[^>]*?>[\s\S]*?<\/div>/gi,
    /<div[^>]*?class="[^"]*?(?:Sponsored)[^"]*?"[^>]*?>[\s\S]*?<\/div>/gi
  ];
  
  // Try each pattern to find ad containers
  let adContainers = [];
  for (const pattern of adContainerPatterns) {
    const matches = html.match(pattern);
    if (matches && matches.length > 0) {
      adContainers = adContainers.concat(matches);
    }
  }
  
  if (adContainers.length === 0) {
    // Fallback to broader search if specific patterns don't match
    const sponsoredSections = html.split(/<div[^>]*>[\s\S]*?Sponsored[\s\S]*?<\/div>/gi);
    if (sponsoredSections.length > 1) {
      // Extract sections around "Sponsored" text
      for (let i = 1; i < sponsoredSections.length; i++) {
        const section = sponsoredSections[i-1].slice(-1000) + sponsoredSections[i].slice(0, 1000);
        adContainers.push(section);
      }
    }
  }
  
  // Process each ad container
  adContainers.forEach((adContainer, index) => {
    // Extract title
    const titleMatch = adContainer.match(/<h3[^>]*>([\s\S]*?)<\/h3>/i) || 
                      adContainer.match(/<a[^>]*?class="[^"]*?ad-title[^"]*?"[^>]*?>([\s\S]*?)<\/a>/i);
    const title = titleMatch ? cleanText(titleMatch[1]) : '';
    
    // Extract description
    const descMatch = adContainer.match(/<div[^>]*?class="[^"]*?ad-description[^"]*?"[^>]*?>([\s\S]*?)<\/div>/i) ||
                     adContainer.match(/<div[^>]*?class="[^"]*?ad-text[^"]*?"[^>]*?>([\s\S]*?)<\/div>/i) ||
                     adContainer.match(/<span[^>]*?class="[^"]*?ad-desc[^"]*?"[^>]*?>([\s\S]*?)<\/span>/i);
    const description = descMatch ? cleanText(descMatch[1]) : '';
    
    // Extract URL/domain
    const urlMatch = adContainer.match(/https?:\/\/(?:www\.)?([^\/]+)\/[^"'\s]*/i);
    const url = urlMatch ? urlMatch[0] : '';
    const domain = urlMatch ? urlMatch[1] : '';
    
    if (domain) {
      adsData.adMetrics.adDomains.add(domain);
    }
    
    // Check for sitelinks
    const hasSitelinks = adContainer.includes('sitelink') || 
                         adContainer.match(/<ul[^>]*?class="[^"]*?(?:sitelinks|ad-links)[^"]*?"[^>]*?>/i) !== null;
    
    if (hasSitelinks) {
      adsData.adMetrics.hasSitelinks = true;
    }
    
    // Check for phone numbers
    const hasPhoneNumber = adContainer.match(/(?:\+\d{1,4}[\s-]?)?\(?\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{4}/i) !== null;
    
    if (hasPhoneNumber) {
      adsData.adMetrics.hasPhoneNumber = true;
    }
    
    // Create ad object
    const ad = {
      position: index + 1,
      title,
      description,
      url,
      domain,
      hasSitelinks,
      hasPhoneNumber
    };
    
    // Determine if this is a top or bottom ad based on position
    if (index < 3) {
      adsData.topAds.push(ad);
    } else {
      adsData.bottomAds.push(ad);
    }
    
    adsData.adMetrics.adPositions.push(index + 1);
  });
  
  adsData.adMetrics.totalAds += adsData.topAds.length + adsData.bottomAds.length;
}

/**
 * Extract shopping ads from HTML
 * @param {string} html - The HTML content
 * @param {Object} adsData - The results object to be updated
 */
function extractShoppingAds(html, adsData) {
  // Common patterns for shopping ad containers
  const shoppingPatterns = [
    /<div[^>]*?shopping-results[^>]*?>[\s\S]*?<\/div>/gi,
    /<div[^>]*?class="[^"]*?(?:shopping|pla-unit)[^"]*?"[^>]*?>[\s\S]*?<\/div>/gi,
    /<div[^>]*?class="[^"]*?commercial-unit-desktop-shopping[^"]*?"[^>]*?>[\s\S]*?<\/div>/gi
  ];
  
  // Try each pattern to find shopping ad containers
  let shoppingContainers = [];
  for (const pattern of shoppingPatterns) {
    const matches = html.match(pattern);
    if (matches && matches.length > 0) {
      shoppingContainers = shoppingContainers.concat(matches);
    }
  }
  
  // Process each shopping ad container
  shoppingContainers.forEach((container, index) => {
    // Extract all URLs from the container
    const urlRegex = /https?:\/\/(?:www\.)?([^\/]+)\/[^"'\s]*/g;
    const urls = [];
    let match;
    while ((match = urlRegex.exec(container)) !== null) {
      urls.push(match[0]);
      
      // Add domain to the set of ad domains
      if (match[1]) {
        adsData.adMetrics.adDomains.add(match[1]);
      }
    }
    
    // Extract product titles
    const titleMatches = container.match(/<div[^>]*?class="[^"]*?(?:product-title|shopping-title)[^"]*?"[^>]*?>([\s\S]*?)<\/div>/gi);
    const titles = titleMatches ? titleMatches.map(m => {
      const innerText = m.replace(/<[^>]*>/g, '').trim();
      return cleanText(innerText);
    }) : [];
    
    // Create shopping ad object
    const shoppingAd = {
      position: `shopping-${index + 1}`,
      urls: urls,
      titles: titles,
      domain: urls[0] ? new URL(urls[0]).hostname : 'unknown'
    };
    
    adsData.shoppingAds.push(shoppingAd);
  });
  
  adsData.adMetrics.totalAds += adsData.shoppingAds.length;
}

/**
 * Extract ad parameters from HTML
 * @param {string} html - The HTML content
 * @param {Object} adsData - The results object to be updated
 */
function extractAdParameters(html, adsData) {
  // Extract Google Click ID (gclid)
  const gclidRegex = /gclid=([^&"'\s]+)/g;
  const gclidMatches = html.match(gclidRegex);
  if (gclidMatches) {
    adsData.allAdsParams.gclid = gclidMatches.map(match => match.replace('gclid=', ''));
  }
  
  // Extract Google Click Source (gclsrc)
  const gclsrcRegex = /gclsrc=([^&"'\s]+)/g;
  const gclsrcMatches = html.match(gclsrcRegex);
  if (gclsrcMatches) {
    adsData.allAdsParams.gclsrc = gclsrcMatches.map(match => match.replace('gclsrc=', ''));
  }
  
  // Extract campaign ID (campaignid)
  const campaignRegex = /(?:campaignid|campaign_id)=([^&"'\s]+)/g;
  const campaignMatches = html.match(campaignRegex);
  if (campaignMatches) {
    adsData.allAdsParams.campaignId = campaignMatches.map(match => 
      match.replace(/(?:campaignid|campaign_id)=/, ''));
  }
  
  // Extract ad group ID (adgroupid)
  const adGroupRegex = /(?:adgroupid|adgroup_id)=([^&"'\s]+)/g;
  const adGroupMatches = html.match(adGroupRegex);
  if (adGroupMatches) {
    adsData.allAdsParams.adGroupId = adGroupMatches.map(match => 
      match.replace(/(?:adgroupid|adgroup_id)=/, ''));
  }
  
  // Extract creative ID (creative)
  const creativeRegex = /creative=([^&"'\s]+)/g;
  const creativeMatches = html.match(creativeRegex);
  if (creativeMatches) {
    adsData.allAdsParams.creativeId = creativeMatches.map(match => match.replace('creative=', ''));
  }
  
  // Extract keyword parameter (keyword)
  const keywordRegex = /keyword=([^&"'\s]+)/g;
  const keywordMatches = html.match(keywordRegex);
  if (keywordMatches) {
    adsData.allAdsParams.keyword = keywordMatches.map(match => 
      decodeURIComponent(match.replace('keyword=', '')));
  }
  
  // Extract match type (matchtype)
  const matchTypeRegex = /matchtype=([^&"'\s]+)/g;
  const matchTypeMatches = html.match(matchTypeRegex);
  if (matchTypeMatches) {
    adsData.allAdsParams.matchType = matchTypeMatches.map(match => match.replace('matchtype=', ''));
  }
  
  // Extract network (network)
  const networkRegex = /network=([^&"'\s]+)/g;
  const networkMatches = html.match(networkRegex);
  if (networkMatches) {
    adsData.allAdsParams.network = networkMatches.map(match => match.replace('network=', ''));
  }
  
  // Extract device (device)
  const deviceRegex = /device=([^&"'\s]+)/g;
  const deviceMatches = html.match(deviceRegex);
  if (deviceMatches) {
    adsData.allAdsParams.device = deviceMatches.map(match => match.replace('device=', ''));
  }
  
  // Extract ad position (adposition)
  const adPositionRegex = /adposition=([^&"'\s]+)/g;
  const adPositionMatches = html.match(adPositionRegex);
  if (adPositionMatches) {
    adsData.allAdsParams.adPosition = adPositionMatches.map(match => match.replace('adposition=', ''));
  }
}

/**
 * Calculate additional ad metrics
 * @param {Object} adsData - The ad data object to update with metrics
 */
function calculateAdMetrics(adsData) {
  // Convert adDomains Set to array
  adsData.adMetrics.adDomains = Array.from(adsData.adMetrics.adDomains);
  
  // Calculate average title length
  let totalTitleLength = 0;
  let titleCount = 0;
  
  // Process text ads
  [...adsData.topAds, ...adsData.bottomAds].forEach(ad => {
    if (ad.title) {
      totalTitleLength += ad.title.length;
      titleCount++;
    }
  });
  
  // Process shopping ads
  adsData.shoppingAds.forEach(ad => {
    if (ad.titles && ad.titles.length) {
      ad.titles.forEach(title => {
        totalTitleLength += title.length;
        titleCount++;
      });
    }
  });
  
  if (titleCount > 0) {
    adsData.adMetrics.avgTitleLength = Math.round(totalTitleLength / titleCount);
  }
  
  // Calculate average description length
  let totalDescLength = 0;
  let descCount = 0;
  
  [...adsData.topAds, ...adsData.bottomAds].forEach(ad => {
    if (ad.description) {
      totalDescLength += ad.description.length;
      descCount++;
    }
  });
  
  if (descCount > 0) {
    adsData.adMetrics.avgDescriptionLength = Math.round(totalDescLength / descCount);
  }
}

/**
 * Clean HTML text by removing tags and normalizing whitespace
 * @param {string} text - The HTML text to clean
 * @returns {string} - Cleaned text
 */
function cleanText(text) {
  if (!text) return '';
  
  // Remove HTML tags
  let cleaned = text.replace(/<[^>]*>/g, '');
  
  // Decode HTML entities
  cleaned = cleaned.replace(/&amp;/g, '&')
                  .replace(/&lt;/g, '<')
                  .replace(/&gt;/g, '>')
                  .replace(/&quot;/g, '"')
                  .replace(/&#39;/g, "'")
                  .replace(/&nbsp;/g, ' ');
  
  // Normalize whitespace
  cleaned = cleaned.replace(/\s+/g, ' ').trim();
  
  return cleaned;
}

module.exports = {
  extractAdsFromHtml
};