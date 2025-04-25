/**
 * Simple test script for the AdFinder API
 * 
 * Usage:
 *   node scripts/test-api.js
 */

const axios = require('axios');

// Configuration
const API_URL = 'http://localhost:3000/api/search';
const TEST_KEYWORDS = ['car insurance', 'home insurance'];
const LOCATION = 'us';
const TEST_OPTIONS = {
  numResults: 20,
  searchType: '', // Regular search
  deviceType: 'mobile',
  language: 'en',
  page: 1,
  // uule: 'w+CAIQICINVW5pdGVkK1N0YXRlcw', // Optional UULE encoding
};

async function testApi() {
  console.log('Testing Google Ads Scraper API...');
  console.log(`URL: ${API_URL}`);
  console.log(`Keywords: ${TEST_KEYWORDS.join(', ')}`);
  console.log(`Location: ${LOCATION}`);
  console.log(`Options: ${JSON.stringify(TEST_OPTIONS, null, 2)}`);
  console.log('-----------------------------------');

  try {
    console.time('Request time');
    const response = await axios.post(API_URL, {
      keywords: TEST_KEYWORDS,
      location: LOCATION,
      useParallel: true,
      ...TEST_OPTIONS
    });
    console.timeEnd('Request time');

    const { results, timestamp } = response.data;
    
    console.log('\nRequest successful!');
    console.log(`Timestamp: ${timestamp}`);
    console.log(`Total results: ${results.length}`);
    
    // Print summary for each result
    results.forEach((result, index) => {
      console.log(`\n--- Result ${index + 1}: ${result.keyword} ---`);
      
      if (result.error) {
        console.log(`Error: ${result.error}`);
        return;
      }
      
      const adsData = result.data?.extractedAdsData;
      if (!adsData) {
        console.log('No ad data extracted');
        return;
      }
      
      // Print ad metrics
      console.log(`Has ads: ${adsData.adMetrics.hasAds}`);
      console.log(`Total ads: ${adsData.adMetrics.totalAds}`);
      
      // Print top ads
      if (adsData.topAds && adsData.topAds.length > 0) {
        console.log(`\nTop ads: ${adsData.topAds.length}`);
        adsData.topAds.forEach((ad, i) => {
          console.log(`  ${i+1}. Position: ${ad.position}, Domain: ${ad.domain || 'unknown'}`);
          if (ad.title) console.log(`     Title: ${ad.title}`);
        });
      }
      
      // Print bottom ads
      if (adsData.bottomAds && adsData.bottomAds.length > 0) {
        console.log(`\nBottom ads: ${adsData.bottomAds.length}`);
        adsData.bottomAds.forEach((ad, i) => {
          console.log(`  ${i+1}. Position: ${ad.position}, Domain: ${ad.domain || 'unknown'}`);
          if (ad.title) console.log(`     Title: ${ad.title}`);
        });
      }
      
      // Print shopping ads
      if (adsData.shoppingAds && adsData.shoppingAds.length > 0) {
        console.log(`\nShopping ads: ${adsData.shoppingAds.length}`);
        adsData.shoppingAds.forEach((ad, i) => {
          console.log(`  ${i+1}. Position: ${ad.position}, Domain: ${ad.domain || 'unknown'}`);
          if (ad.titles && ad.titles.length > 0) {
            console.log(`     Titles: ${ad.titles.join(', ')}`);
          }
        });
      }
      
      // Print ad parameters
      if (adsData.allAdsParams && Object.keys(adsData.allAdsParams).length > 0) {
        console.log('\nAd parameters:');
        for (const [param, values] of Object.entries(adsData.allAdsParams)) {
          if (Array.isArray(values) && values.length > 0) {
            console.log(`  ${param}: ${values.length} values (first: ${values[0]})`);
          }
        }
      }
      
      // Print SERP data
      if (result.data?.serp) {
        console.log('\nSERP Details:');
        
        // Organic results count
        if (result.data.serp.organic_results) {
          console.log(`  Organic Results: ${result.data.serp.organic_results.length}`);
        }
        
        // Local results
        if (result.data.serp.local_results) {
          console.log(`  Local Results: ${result.data.serp.local_results.length}`);
        }
        
        // Related searches
        if (result.data.serp.related_searches) {
          console.log(`  Related Searches: ${result.data.serp.related_searches.length}`);
          console.log(`    First few: ${result.data.serp.related_searches.slice(0, 3).map(s => s.query).join(', ')}`);
        }
        
        // Knowledge graph
        if (result.data.serp.knowledge_graph) {
          console.log(`  Knowledge Graph: ${result.data.serp.knowledge_graph.title || 'Present'}`);
        }
      }
      
      // Print HTML length
      if (result.data?.htmlLength) {
        console.log(`\nHTML length: ${result.data.htmlLength} characters`);
      }
    });
    
  } catch (error) {
    console.error('\nError testing API:');
    
    if (error.response) {
      console.error(`Status: ${error.response.status}`);
      console.error('Response data:', error.response.data);
    } else {
      console.error(error.message);
    }
  }
}

// Run the test
testApi();