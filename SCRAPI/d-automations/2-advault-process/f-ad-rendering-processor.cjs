// Ad Rendering Processor: Processes ad URLs to capture HTML and PNG renderings
const fs = require('fs');
const path = require('path');
const axios = require('axios');
const { createClient } = require('@supabase/supabase-js');
const { getJobDirectories } = require('../../utils/job-directory-manager.cjs');
require('dotenv').config();

// Initialize Supabase clients
const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Supabase credentials not found in environment variables');
  process.exit(1);
}

// Create regular client for read operations
const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false
  }
});

// Create admin client with service role key for write operations
const supabaseAdmin = supabaseServiceKey ? 
  createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false
    }
  }) : 
  supabase;

// Oxylabs credentials
const OXYLABS_USERNAME = process.env.OXYLABS_USERNAME;
const OXYLABS_PASSWORD = process.env.OXYLABS_PASSWORD;

// Helper functions for URL validation
function normalizeUrl(url) {
  if (!url.startsWith('http://') && !url.startsWith('https://')) {
    console.warn('⚠️ URL missing protocol, prepending https://');
    return 'https://' + url;
  }
  return url;
}

function isValidUrl(url) {
  try {
    new URL(url); // built-in validation
    return true;
  } catch (err) {
    return false;
  }
}

// Test Supabase connection
async function testSupabaseConnection() {
  try {
    console.log('Testing Supabase connection...');
    
    // Try a simple query first
    const { data, error } = await supabase
      .from('advertisers')
      .select('count', { count: 'exact', head: true });
    
    if (error) {
      console.error('Supabase connection test failed:', error);
      return false;
    }
    
    console.log('Supabase connection successful!');
    
    // Test admin connection if service key is available
    if (supabaseServiceKey) {
      console.log('Testing Supabase admin connection...');
      const { data: adminData, error: adminError } = await supabaseAdmin
        .from('advertisers')
        .select('count', { count: 'exact', head: true });
        
      if (adminError) {
        console.error('Supabase admin connection test failed:', adminError);
        console.log('⚠️ Will proceed with regular client only');
      } else {
        console.log('✅ Supabase admin connection successful!');
      }
    } else {
      console.log('⚠️ No service role key provided, some operations may fail');
    }
    
    return true;
  } catch (error) {
    console.error('Supabase connection test error:', error);
    return false;
  }
}

// Function to render a URL as PNG only (optimized version)
async function renderUrl(url, renderType = 'png', jobId = null) {
  console.log(`\n🔄 Rendering ${url} as ${renderType}...`);
  
  // Normalize + validate URL first
  url = normalizeUrl(url);
  if (!isValidUrl(url)) {
    console.error('❌ Invalid URL. Skipping:', url);
    return {
      success: false,
      error: 'Invalid URL'
    };
  }
  
  // Check for unsupported domains
  const unsupportedDomains = ['example.com', 'localhost', '127.0.0.1'];
  const hostname = new URL(url).hostname;
  if (unsupportedDomains.includes(hostname)) {
    console.error(`❌ Skipping unsupported URL: ${hostname}`);
    return {
      success: false,
      error: 'Unsupported domain'
    };
  }
  
  console.log(`Using validated URL: ${url}`);
  
  // Create payload with simplified structure
  const payload = {
    source: 'universal',
    url: url,
    render: 'png',
  };

  console.log('Making request to Oxylabs API...');
  console.log('Oxylabs credentials available:', !!OXYLABS_USERNAME && !!OXYLABS_PASSWORD);
  console.log('OXYLABS_USERNAME length:', OXYLABS_USERNAME ? OXYLABS_USERNAME.length : 0);
  console.log('OXYLABS_PASSWORD length:', OXYLABS_PASSWORD ? OXYLABS_PASSWORD.length : 0);
  
  try {
    const response = await axios.post('https://realtime.oxylabs.io/v1/queries', payload, {
      auth: {
        username: OXYLABS_USERNAME,
        password: OXYLABS_PASSWORD
      },
      headers: {
        'Content-Type': 'application/json'
      },
      timeout: 300000 // 5 minutes
    });

    console.log('Response received from Oxylabs API');
    console.log('Response status:', response.status);
    
    if (!response.data || !response.data.results || !response.data.results[0]) {
      console.error('❌ Unexpected response structure:', JSON.stringify(response.data, null, 2));
      return {
        success: false,
        error: 'Unexpected response structure'
      };
    }

    const result = response.data;
    console.log('✅ Rendering completed successfully');

    if (!result.results || !result.results[0] || !result.results[0].content) {
      console.error('❌ No image content found in response');
      console.error('Result content structure:', result.results[0] ? Object.keys(result.results[0]) : 'No results[0]');
      return {
        success: false,
        error: 'No image content found in response'
      };
    }
    
    try {
      const base64Image = result.results[0].content;
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      
      // Determine output path based on jobId
      let outputPath;
      if (jobId) {
        // Use job-specific directory
        const jobDirs = getJobDirectories(jobId);
        outputPath = path.join(jobDirs.rendered, `rendered-${hostname}-${timestamp}.png`);
      } else {
        // Use standard directory for backward compatibility
        const standardDir = path.join(process.cwd(), 'SCRAPI', 'output-staging', 'scraper-results');
        if (!fs.existsSync(standardDir)) {
          fs.mkdirSync(standardDir, { recursive: true });
        }
        outputPath = path.join(standardDir, `rendered-${hostname}-${timestamp}.png`);
      }
      
      // Check if the content is actually base64 data
      if (typeof base64Image !== 'string') {
        console.error('❌ Invalid base64 image data received - not a string');
        console.log('Content type:', typeof base64Image);
        
        // Save the raw content for debugging
        const debugPath = path.join(path.dirname(outputPath), `debug-content-${timestamp}.txt`);
        fs.writeFileSync(debugPath, JSON.stringify(result.results[0], null, 2));
        console.log(`📄 Debug content saved to ${debugPath}`);
        
        return {
          success: false,
          error: 'Invalid base64 image data - not a string',
          debugPath
        };
      }
      
      // Try to decode and save the image
      try {
        console.log('Creating buffer from base64 string...');
        const buffer = Buffer.from(base64Image, 'base64');
        console.log('Buffer created, length:', buffer.length);
        
        // Ensure the directory exists
        if (!fs.existsSync(path.dirname(outputPath))) {
          fs.mkdirSync(path.dirname(outputPath), { recursive: true });
        }
        
        console.log('Writing buffer to file:', outputPath);
        fs.writeFileSync(outputPath, buffer);
        console.log(`🖼️ Screenshot saved to ${outputPath}`);
        
        // Verify the file was created
        if (fs.existsSync(outputPath)) {
          const stats = fs.statSync(outputPath);
          console.log(`File created successfully, size: ${stats.size} bytes`);
        } else {
          console.error('❌ File was not created');
        }
        
        return {
          success: true,
          outputPath,
          content: base64Image
        };
      } catch (decodeError) {
        console.error('❌ Error decoding base64 image:', decodeError);
        
        // Fallback: save the raw content for debugging
        const fallbackPath = path.join(path.dirname(outputPath), `raw-content-${timestamp}.txt`);
        fs.writeFileSync(fallbackPath, base64Image.substring(0, 5000));
        console.log(`⚠️ Saved raw content preview to ${fallbackPath}`);
        
        return {
          success: false,
          error: `Error decoding base64 image: ${decodeError.message}`,
          rawPath: fallbackPath
        };
      }
    } catch (writeError) {
      console.error('❌ Error writing image file:', writeError);
      return {
        success: false,
        error: `Error writing image file: ${writeError.message}`
      };
    }
  } catch (error) {
    console.error(`Error during rendering:`, error.message);
    
    // More detailed error logging
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response data:', error.response.data);
    } else if (error.request) {
      console.error('No response received. Request details:', error.request);
    } else {
      console.error('Error setting up request:', error.message);
    }
    
    return {
      success: false,
      error: error.message
    };
  }
}

// Alternative rendering method with simpler payload
async function renderUrlAlternative(url, renderType = 'png', jobId = null) {
  console.log(`\n🧪 Testing alternative render method for ${url} as ${renderType}...`);
  
  // Normalize + validate URL first
  url = normalizeUrl(url);
  if (!isValidUrl(url)) {
    console.error('❌ Invalid URL. Skipping:', url);
    return {
      success: false,
      error: 'Invalid URL'
    };
  }
  
  console.log(`Using validated URL: ${url}`);
  
  // Create a simpler payload without browser_instructions
  const payload = {
    source: 'universal',
    url: url,
    render: renderType
  };

  console.log('Alternative payload:', JSON.stringify(payload, null, 2));
  console.log('Oxylabs credentials available:', !!OXYLABS_USERNAME && !!OXYLABS_PASSWORD);
  console.log('OXYLABS_USERNAME length:', OXYLABS_USERNAME ? OXYLABS_USERNAME.length : 0);
  console.log('OXYLABS_PASSWORD length:', OXYLABS_PASSWORD ? OXYLABS_PASSWORD.length : 0);

  try {
    const response = await axios.post('https://realtime.oxylabs.io/v1/queries', payload, {
      auth: {
        username: OXYLABS_USERNAME,
        password: OXYLABS_PASSWORD
      },
      headers: {
        'Content-Type': 'application/json'
      },
      timeout: 300000 // 5 minutes
    });

    console.log('✅ Response received from alternative method');
    console.log('Response status:', response.status);
    
    if (!response.data || !response.data.results || !response.data.results[0] || !response.data.results[0].content) {
      console.error('❌ No content in response');
      console.error('Response data structure:', JSON.stringify(Object.keys(response.data), null, 2));
      return {
        success: false,
        error: 'No content in response'
      };
    }
    
    const result = response.data.results[0];
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const hostname = new URL(url).hostname;
    
    // Determine output path based on jobId
    let outputPath;
    if (jobId) {
      // Use job-specific directory
      const jobDirs = getJobDirectories(jobId);
      outputPath = path.join(jobDirs.rendered, `alt-rendered-${hostname}-${timestamp}.png`);
    } else {
      // Use standard directory for backward compatibility
      const standardDir = path.join(process.cwd(), 'SCRAPI', 'output-staging', 'scraper-results');
      if (!fs.existsSync(standardDir)) {
        fs.mkdirSync(standardDir, { recursive: true });
      }
      outputPath = path.join(standardDir, `alt-rendered-${hostname}-${timestamp}.png`);
    }
    
    try {
      console.log('Creating buffer from base64 string...');
      const buffer = Buffer.from(result.content, 'base64');
      console.log('Buffer created, length:', buffer.length);
      
      // Ensure the directory exists
      if (!fs.existsSync(path.dirname(outputPath))) {
        fs.mkdirSync(path.dirname(outputPath), { recursive: true });
      }
      
      console.log('Writing buffer to file:', outputPath);
      fs.writeFileSync(outputPath, buffer);
      console.log(`🖼️ Alternative screenshot saved to ${outputPath}`);
      
      // Verify the file was created
      if (fs.existsSync(outputPath)) {
        const stats = fs.statSync(outputPath);
        console.log(`File created successfully, size: ${stats.size} bytes`);
      } else {
        console.error('❌ File was not created');
      }
      
      return {
        success: true,
        outputPath,
        content: result.content
      };
    } catch (writeError) {
      console.error('❌ Error writing image file:', writeError);
      return {
        success: false,
        error: `Error writing image file: ${writeError.message}`
      };
    }
  } catch (error) {
    console.error('❌ Alternative render failed:', error.message);
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response data:', error.response.data);
    }
    return {
      success: false,
      error: error.message
    };
  }
}

// Process a single ad URL with PNG rendering only
async function processAdWithPngOnly(adId, serpId, url) {
  console.log(`\n🔄 Processing ad ${adId} for SERP ${serpId}: ${url}`);
  
  try {
    // Get the job ID from the SERP
    const { data: serp, error: serpError } = await supabase
      .from('serps')
      .select('job_id')
      .eq('id', serpId)
      .single();
      
    if (serpError) {
      console.error('Error fetching SERP:', serpError);
      return {
        url,
        png: { success: false, error: `Error fetching SERP: ${serpError.message}` }
      };
    }
    
    const jobId = serp?.job_id;
    
    // First, check if PNG rendering already exists
    const { data: existingRenderings, error: checkError } = await supabase
      .from('ad_renderings')
      .select('id, binary_content')
      .eq('ad_id', adId)
      .eq('serp_id', serpId)
      .eq('rendering_type', 'png');
      
    if (checkError) {
      console.error('Error checking for existing renderings:', checkError);
    } else if (existingRenderings && existingRenderings.length > 0) {
      console.log(`Found existing PNG rendering for this ad: ${existingRenderings[0].id}`);
      
      // If it doesn't have binary_content, we'll re-render it
      if (!existingRenderings[0].binary_content) {
        console.log('Existing rendering has no binary content, re-rendering...');
      } else {
        console.log('Existing rendering has binary content, skipping');
        return {
          url,
          png: { success: true, skipped: true, message: 'PNG rendering already exists with binary content' }
        };
      }
    }
    
    // Render as PNG
    console.log(`Rendering PNG for ${url}`);
    let pngResult = await renderUrl(url, 'png', jobId);

    // If primary rendering fails, try alternative method
    if (!pngResult.success && !pngResult.skipped) {
      console.log('Primary PNG rendering failed, trying alternative method');
      pngResult = await renderUrlAlternative(url, 'png', jobId);
    }
    
    if (pngResult.success) {
      console.log('PNG rendering successful, storing in database...');
      
      // Verify the file exists before trying to get its size
      let fileSize = 0;
      if (fs.existsSync(pngResult.outputPath)) {
        fileSize = fs.statSync(pngResult.outputPath).size;
      } else {
        console.warn(`⚠️ File ${pngResult.outputPath} does not exist, using size 0`);
      }
      
      // Store the base64 content directly in the database
      const { error: insertPngError } = await supabaseAdmin
        .from('ad_renderings')
        .insert({
          ad_id: adId,
          serp_id: serpId,
          rendering_type: 'png',
          content_path: pngResult.outputPath,
          content_size: fileSize,
          binary_content: pngResult.content, // Store the base64 content directly
          status: 'processed',
          processed_at: new Date().toISOString()
        });
        
      if (insertPngError) {
        console.error('Error storing PNG rendering in database:', insertPngError);
        pngResult.dbError = insertPngError.message;
      } else {
        console.log('PNG rendering stored in database successfully with binary content');
      }
    } else {
      console.error('PNG rendering failed:', pngResult.error);
    }
    
    return {
      url,
      png: pngResult
    };
  } catch (error) {
    console.error(`❌ Error processing ad URL ${url}:`, error.message);
    return {
      url,
      png: { success: false, error: error.message }
    };
  }
}

// Process multiple ads from a SERP
async function processAdsFromSerp(serpId, maxAds = 3) {
  console.log(`\n🔍 Processing ads for SERP ${serpId} (max ${maxAds} ads)`);
  
  try {
    // First, get the SERP data
    const { data: serp, error: serpError } = await supabase
      .from('serps')
      .select('id, job_id, query, location, content')
      .eq('id', serpId)
      .single();
      
    if (serpError) {
      console.error('Error fetching SERP:', serpError);
      return {
        success: false,
        error: serpError.message
      };
    }
    
    if (!serp) {
      console.error(`SERP ${serpId} not found`);
      return {
        success: false,
        error: 'SERP not found'
      };
    }
    
    console.log(`Found SERP for query "${serp.query}" in ${serp.location}`);
    console.log('SERP content structure:', Object.keys(serp.content));
    
    // Extract ads from SERP content
    let paidAds = [];
    try {
      paidAds = serp.content?.results?.[0]?.content?.results?.paid || [];
      console.log(`Found ${paidAds.length} paid ads in SERP content`);
      if (paidAds.length > 0) {
        console.log('First ad:', {
          title: paidAds[0].title,
          url: paidAds[0].url,
          position: paidAds[0].pos
        });
      }
    } catch (e) {
      console.error('Error extracting paid ads from SERP content:', e.message);
      console.log('SERP content structure:', JSON.stringify(Object.keys(serp.content), null, 2));
      if (serp.content.results && serp.content.results.length > 0) {
        console.log('Results structure:', JSON.stringify(Object.keys(serp.content.results[0]), null, 2));
        if (serp.content.results[0].content) {
          console.log('Content structure:', JSON.stringify(Object.keys(serp.content.results[0].content), null, 2));
        }
      }
    }
    
    if (paidAds.length === 0) {
      console.log('No paid ads found in SERP');
      return {
        success: true,
        message: 'No ads to process',
        results: []
      };
    }
    
    // Get the SERP-Ad relationships to get the ad IDs
    const { data: serpAds, error: relationshipError } = await supabase
      .from('serp_ads')
      .select('ad_id, position, position_overall')
      .eq('serp_id', serpId)
      .order('position', { ascending: true });
      
    if (relationshipError) {
      console.error('Error fetching SERP-Ad relationships:', relationshipError);
      return {
        success: false,
        error: relationshipError.message
      };
    }
    
    if (!serpAds || serpAds.length === 0) {
      console.log('No SERP-Ad relationships found');
      return {
        success: true,
        message: 'No SERP-Ad relationships to process',
        results: []
      };
    }
    
    console.log(`Found ${serpAds.length} SERP-Ad relationships`);
    
    // Get the ad details
    const adIds = serpAds.map(sa => sa.ad_id);
    const { data: ads, error: adsError } = await supabase
      .from('ads')
      .select('id, advertiser_domain, title, url')
      .in('id', adIds);
      
    if (adsError) {
      console.error('Error fetching ads:', adsError);
      return {
        success: false,
        error: adsError.message
      };
    }
    
    if (!ads || ads.length === 0) {
      console.log('No ads found with the given IDs');
      return {
        success: true,
        message: 'No ads found to process',
        results: []
      };
    }
    
    console.log(`Found ${ads.length} ads to process`);
    
    // Process only up to maxAds to avoid rate limiting
    const adsToProcess = ads.slice(0, maxAds);
    console.log(`Will process ${adsToProcess.length} ads`);
    
    const results = [];
    
    for (let i = 0; i < adsToProcess.length; i++) {
      const ad = adsToProcess[i];
      console.log(`Processing ad ${i+1}/${adsToProcess.length}: ${ad.title} (${ad.url})`);
      
      const result = await processAdWithPngOnly(ad.id, serpId, ad.url);
      results.push({
        ad_id: ad.id,
        advertiser_domain: ad.advertiser_domain,
        title: ad.title,
        url: ad.url,
        ...result
      });
      
      // Add a delay between processing different ads
      if (i < adsToProcess.length - 1) {
        console.log('Waiting 5 seconds before processing next ad...');
        await new Promise(resolve => setTimeout(resolve, 5000));
      }
    }
    
    return {
      success: true,
      serp_id: serpId,
      query: serp.query,
      location: serp.location,
      results
    };
  } catch (error) {
    console.error(`Error processing ads from SERP ${serpId}:`, error);
    return {
      success: false,
      error: error.message
    };
  }
}

// Process the most recent SERP
async function processLatestSerp(maxAds = 3) {
  console.log(`\n🔍 Processing the most recent SERP (max ${maxAds} ads)`);
  
  try {
    // Get the most recent SERP
    const { data: latestSerp, error: serpError } = await supabase
      .from('serps')
      .select('id, job_id, query, location, timestamp')
      .order('timestamp', { ascending: false })
      .limit(1)
      .single();
      
    if (serpError) {
      console.error('Error fetching latest SERP:', serpError);
      return {
        success: false,
        error: serpError.message
      };
    }
    
    if (!latestSerp) {
      console.log('No SERPs found');
      return {
        success: false,
        error: 'No SERPs found'
      };
    }
    
    console.log(`Found latest SERP: ${latestSerp.id} for query "${latestSerp.query}" in ${latestSerp.location}`);
    
    // Process the SERP
    return await processAdsFromSerp(latestSerp.id, maxAds);
  } catch (error) {
    console.error('Error processing latest SERP:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

// Main function
async function main() {
  console.log('🚀 Starting Ad Rendering Processor');
  
  // Test Supabase connection
  const connectionOk = await testSupabaseConnection();
  if (!connectionOk) {
    console.error('❌ Supabase connection failed, aborting');
    return;
  }
  
  // Get command line arguments
  const serpId = process.argv[2]; // Optional SERP ID
  const maxAds = parseInt(process.argv[3] || '3', 10); // Max ads to process, default 3
  
  let result;
  
  if (serpId) {
    console.log(`Processing specific SERP: ${serpId}`);
    result = await processAdsFromSerp(serpId, maxAds);
  } else {
    console.log('Processing the latest SERP');
    result = await processLatestSerp(maxAds);
  }
  
  if (result.success) {
    console.log('\n✅ Processing completed successfully');
    
    if (result.results && result.results.length > 0) {
      console.log(`\n📊 Results Summary:`);
      
      let pngSuccessCount = 0;
      let pngErrorCount = 0;
      let pngSkippedCount = 0;
      
      result.results.forEach((adResult, index) => {
        console.log(`\n🔍 Ad ${index + 1}: ${adResult.title}`);
        console.log(`   URL: ${adResult.url}`);
        
        // PNG results
        if (adResult.png.skipped) {
          console.log(`   ⏭️ PNG: Skipped - ${adResult.png.message}`);
          pngSkippedCount++;
        } else if (adResult.png.success) {
          console.log(`   ✅ PNG: Success - ${adResult.png.outputPath}`);
          pngSuccessCount++;
        } else {
          console.log(`   ❌ PNG: Failed - ${adResult.png.error}`);
          pngErrorCount++;
        }
      });
      
      console.log(`\n📈 Summary:`);
      console.log(`   PNG: ${pngSuccessCount} successful, ${pngErrorCount} failed, ${pngSkippedCount} skipped`);
    } else {
      console.log('No ads were processed');
    }
  } else {
    console.error(`\n❌ Processing failed: ${result.error}`);
  }
}

// If this file is run directly
if (require.main === module) {
  main().catch(error => {
    console.error('❌ Unhandled error in main process:', error);
    process.exit(1);
  });
}

// Export functions for use in other modules
module.exports = {
  renderUrl,
  renderUrlAlternative,
  processAdWithPngOnly,
  processAdsFromSerp,
  processLatestSerp
};