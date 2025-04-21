// trigger-rendered.js
const path = require('path');
const fs = require('fs');
const { runScraper } = require('./c-google-ads-scraper.js');
const axios = require('axios');
require('dotenv').config();

const OXYLABS_USERNAME = process.env.OXYLABS_USERNAME;
const OXYLABS_PASSWORD = process.env.OXYLABS_PASSWORD;

// Trigger second render call using 'universal' source
const runRenderedUniversal = async (targetUrl, renderType = 'png') => {
  const payload = {
    source: 'universal',
    url: targetUrl,
    render: renderType
  };

  try {
    console.log('\n📸 Triggering rendered scrape for:', targetUrl);

    // Log credentials availability (not the actual values)
    console.log(`OXYLABS_USERNAME available: ${Boolean(OXYLABS_USERNAME)}`);
    console.log(`OXYLABS_PASSWORD available: ${Boolean(OXYLABS_PASSWORD)}`);

    // Make the request with proper error handling
    const response = await axios.post('https://realtime.oxylabs.io/v1/queries', payload, {
      auth: {
        username: OXYLABS_USERNAME,
        password: OXYLABS_PASSWORD
      },
      headers: {
        'Content-Type': 'application/json'
      },
      timeout: 180000 // 180 seconds as recommended
    });

    console.log('✅ Response received from Oxylabs API');
    
    // Check if response has the expected structure
    if (!response.data || !response.data.results) {
      console.error('❌ Unexpected response structure:', JSON.stringify(response.data, null, 2));
      return {
        success: false,
        error: 'Unexpected response structure'
      };
    }

    const result = response.data;
    console.log('✅ Rendered scrape completed successfully');

    const outputDir = path.join(process.cwd(), 'scraper-results');
    if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir);

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    
    if (renderType === 'html') {
      if (!result.results || !result.results[0] || !result.results[0].content) {
        console.error('❌ No HTML content found in response');
        return {
          success: false,
          error: 'No HTML content found in response'
        };
      }
      
      const outputPath = path.join(outputDir, `rendered-${timestamp}.html`);
      fs.writeFileSync(outputPath, result.results[0].content);
      console.log(`📄 Rendered HTML saved to ${outputPath}`);
      
      return {
        success: true,
        outputPath,
        content: result.results[0].content
      };
    } else if (renderType === 'png') {
      if (!result.results || !result.results[0] || !result.results[0].content) {
        console.error('❌ No image content found in response');
        return {
          success: false,
          error: 'No image content found in response'
        };
      }
      
      try {
        const base64Image = result.results[0].content;
        const outputPath = path.join(outputDir, `rendered-${timestamp}.png`);
        
        // Check if the content is actually base64 data
        if (typeof base64Image !== 'string' || !base64Image.match(/^[A-Za-z0-9+/=]+$/)) {
          console.error('❌ Invalid base64 image data received');
          console.log('Content type:', typeof base64Image);
          console.log('Content preview:', typeof base64Image === 'string' ? base64Image.substring(0, 100) : 'Not a string');
          return {
            success: false,
            error: 'Invalid base64 image data'
          };
        }
        
        fs.writeFileSync(outputPath, Buffer.from(base64Image, 'base64'));
        console.log(`🖼️ Screenshot saved to ${outputPath}`);
        
        return {
          success: true,
          outputPath,
          content: base64Image
        };
      } catch (writeError) {
        console.error('❌ Error writing image file:', writeError);
        return {
          success: false,
          error: `Error writing image file: ${writeError.message}`
        };
      }
    }

    return {
      success: false,
      error: `Unsupported render type: ${renderType}`
    };
  } catch (error) {
    console.error('❌ Error during rendered universal scrape:', error.message);
    
    // More detailed error logging
    if (error.response) {
      // The request was made and the server responded with a status code
      // that falls out of the range of 2xx
      console.error('Response status:', error.response.status);
      console.error('Response headers:', JSON.stringify(error.response.headers, null, 2));
      console.error('Response data:', JSON.stringify(error.response.data, null, 2));
    } else if (error.request) {
      // The request was made but no response was received
      console.error('No response received. Request details:', error.request);
    } else {
      // Something happened in setting up the request that triggered an Error
      console.error('Error setting up request:', error.message);
    }
    
    return {
      success: false,
      error: error.message
    };
  }
};

// Process a single ad URL with both HTML and PNG rendering
const processAdWithBothFormats = async (url, index, total) => {
  console.log(`\n🔄 Processing ad ${index+1}/${total}: ${url}`);
  
  try {
    // First render as HTML
    console.log(`Rendering HTML for ${url}`);
    const htmlResult = await runRenderedUniversal(url, 'html');
    
    // Then render as PNG
    console.log(`Rendering PNG for ${url}`);
    const pngResult = await runRenderedUniversal(url, 'png');
    
    return {
      url,
      html: {
        success: htmlResult.success,
        outputPath: htmlResult.outputPath,
        error: htmlResult.error
      },
      png: {
        success: pngResult.success,
        outputPath: pngResult.outputPath,
        error: pngResult.error
      }
    };
  } catch (error) {
    console.error(`❌ Error processing ad URL ${url}:`, error.message);
    return {
      url,
      html: { success: false, error: error.message },
      png: { success: false, error: error.message }
    };
  }
};

// Process multiple ad URLs
const processMultipleAds = async (adUrls, maxAds = 3) => {
  console.log(`\n🔄 Processing ${Math.min(adUrls.length, maxAds)} ad URLs out of ${adUrls.length} total ads`);
  
  const results = [];
  // Process only up to maxAds to avoid rate limiting
  const urlsToProcess = adUrls.slice(0, maxAds);
  
  for (let i = 0; i < urlsToProcess.length; i++) {
    const url = urlsToProcess[i];
    const result = await processAdWithBothFormats(url, i, urlsToProcess.length);
    results.push(result);
    
    // Add a small delay between processing different ads to avoid rate limiting
    if (i < urlsToProcess.length - 1) {
      console.log('Waiting 3 seconds before processing next ad...');
      await new Promise(resolve => setTimeout(resolve, 3000));
    }
  }
  
  return results;
};

const main = async () => {
  try {
    const query = process.argv[2] || 'plumbers near me';
    const location = process.argv[3] || 'Boston, Massachusetts, United States';
    const maxAdsToProcess = parseInt(process.argv[4] || '3', 10); // Process up to 3 ads by default

    console.log(`🔍 Running Google Ads scraper for query: "${query}" in ${location}`);
    console.log(`📊 Will process up to ${maxAdsToProcess} ads with both HTML and PNG formats`);
    
    // Run the Google Ads scraper
    const result = await runScraper(query, location);
    
    if (!result || !result.success) {
      console.error('❌ Google Ads scraping failed. Aborting rendered scrape.');
      return;
    }

    console.log(`✅ Google Ads scraping completed successfully`);
    console.log(`📄 Results saved to ${result.resultsPath}`);

    // Try to load and parse ad URLs from results file
    try {
      if (!fs.existsSync(result.resultsPath)) {
        console.error(`❌ Results file not found: ${result.resultsPath}`);
        return;
      }
      
      const fileContent = fs.readFileSync(result.resultsPath, 'utf-8');
      const rawResults = JSON.parse(fileContent);
      
      // Navigate through the results structure to find ads
      const firstResult = rawResults.results?.[0];
      if (!firstResult) {
        console.warn('⚠️ No results found in the data');
        return;
      }
      
      const paidAds = firstResult.content?.results?.paid;
      if (!paidAds || paidAds.length === 0) {
        console.warn('⚠️ No paid ads found in results');
        return;
      }
      
      // Extract all ad URLs
      const adUrls = paidAds.map(ad => ad.url).filter(url => url);
      
      if (adUrls.length === 0) {
        console.warn('⚠️ No valid ad URLs found');
        return;
      }

      console.log(`✅ Found ${adUrls.length} ad URLs`);
      adUrls.forEach((url, index) => {
        console.log(`📊 Ad ${index + 1}: ${url}`);
      });
      
      // Process the SERP data into the database
      console.log('\n🔄 Processing SERP data into database...');
      
      // Use the staging approach for processing
      const { createClient } = require('@supabase/supabase-js');
      const supabase = createClient(
        process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL,
        process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY
      );
      
      const { data: stagingData, error: stagingError } = await supabase
        .from('staging_serps')
        .insert({
          job_id: rawResults.job.id,
          query: rawResults.job.query,
          location: rawResults.job.geo_location,
          timestamp: rawResults.job.created_at,
          content: rawResults,
          status: 'pending'
        })
        .select();
        
      if (stagingError) {
        console.error('❌ Error inserting into staging table:', stagingError);
      } else {
        console.log(`✅ SERP data inserted into staging table with ID: ${stagingData[0].id}`);
      }
      
      // Process multiple ad URLs with both HTML and PNG formats
      console.log(`\n🔄 Now attempting to render multiple ad landing pages in both HTML and PNG formats`);
      const renderResults = await processMultipleAds(adUrls, maxAdsToProcess);
      
      // Print summary of results
      console.log('\n📊 Rendering Results Summary:');
      renderResults.forEach((result, index) => {
        console.log(`\n🔍 Ad ${index + 1}: ${result.url}`);
        
        // HTML results
        const htmlStatusIcon = result.html.success ? '✅' : '❌';
        console.log(`${htmlStatusIcon} HTML: ${result.html.success ? 'Success' : 'Failed'}`);
        if (result.html.success) {
          console.log(`   Output: ${result.html.outputPath}`);
        } else {
          console.log(`   Error: ${result.html.error}`);
        }
        
        // PNG results
        const pngStatusIcon = result.png.success ? '✅' : '❌';
        console.log(`${pngStatusIcon} PNG: ${result.png.success ? 'Success' : 'Failed'}`);
        if (result.png.success) {
          console.log(`   Output: ${result.png.outputPath}`);
        } else {
          console.log(`   Error: ${result.png.error}`);
        }
      });
      
      const htmlSuccessCount = renderResults.filter(r => r.html.success).length;
      const pngSuccessCount = renderResults.filter(r => r.png.success).length;
      
      console.log(`\n🏁 Completed rendering ${htmlSuccessCount} HTML and ${pngSuccessCount} PNG files out of ${renderResults.length} ads`);
      
    } catch (err) {
      console.error('❌ Failed to extract or process ad URLs:', err.message);
      console.error(err.stack);
    }
  } catch (err) {
    console.error('❌ Unhandled error in main process:', err.message);
    console.error(err.stack);
  }
};

// Run the main function if this file is executed directly
if (require.main === module) {
  main().catch(error => {
    console.error('❌ Fatal error:', error);
    process.exit(1);
  });
}

// Export functions for use in other modules
module.exports = { runRenderedUniversal, processMultipleAds, processAdWithBothFormats };