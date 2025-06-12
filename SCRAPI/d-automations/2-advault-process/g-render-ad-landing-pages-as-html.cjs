// RenderAdLandingPagesAsHtml.js - Render ad landing pages as HTML
const fs = require('fs');
const path = require('path');
const axios = require('axios');
const { createClient } = require('@supabase/supabase-js');
const cheerio = require('cheerio');
const sanitizeHtml = require('sanitize-html');
const { getJobDirectories } = require('../../utils/job-directory-manager');
require('dotenv').config();

// Environment variables
const OXYLABS_USERNAME = process.env.OXYLABS_USERNAME;
const OXYLABS_PASSWORD = process.env.OXYLABS_PASSWORD;

// Initialize Supabase client
const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Supabase credentials not found in environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

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
    
    console.log('✅ Supabase connection successful!');
    return true;
  } catch (error) {
    console.error('Supabase connection test error:', error);
    return false;
  }
}

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

// Function to render a URL as HTML
async function renderUrlAsHtml(url, jobId) {
  console.log(`\n🔄 Rendering ${url} as HTML...`);
  
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

  try {
    // Create a single query object (not an array)
    const payload = {
      source: 'universal',
      url: url,
      render: 'html'
    };

    console.log('Making request to Oxylabs API...');
    
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

    console.log('✅ Response received from Oxylabs API');
    
    if (!response.data || !response.data.results || !response.data.results[0]) {
      console.error('❌ Unexpected response structure:', JSON.stringify(response.data, null, 2));
      return {
        success: false,
        error: 'Unexpected response structure'
      };
    }

    const result = response.data;
    console.log('✅ HTML rendering completed successfully');

    if (!result.results || !result.results[0] || !result.results[0].content) {
      console.error('❌ No HTML content found in response');
      return {
        success: false,
        error: 'No HTML content found in response'
      };
    }
    
    // Get the HTML content
    let htmlContent = result.results[0].content;

    // Clean and sanitize the HTML
    try {
      // Load the HTML with cheerio
      const $ = cheerio.load(htmlContent);

      // Remove scripts for security
      $('script').remove();

      // Remove external resources that might cause CORS issues
      $('link[rel="stylesheet"]').each(function() {
        const href = $(this).attr('href');
        if (href && (href.startsWith('http://') || href.startsWith('https://'))) {
          $(this).remove();
        }
      });

      // Convert all relative URLs to absolute URLs
      $('a').each(function() {
        const href = $(this).attr('href');
        if (href && !href.startsWith('http://') && !href.startsWith('https://') && !href.startsWith('#')) {
          try {
            $(this).attr('href', new URL(href, url).href);
          } catch (e) {
            // If URL construction fails, leave as is
          }
        }
      });

      $('img').each(function() {
        const src = $(this).attr('src');
        if (src && !src.startsWith('http://') && !src.startsWith('https://') && !src.startsWith('data:')) {
          try {
            $(this).attr('src', new URL(src, url).href);
          } catch (e) {
            // If URL construction fails, leave as is
          }
        }
      });

      // Get the cleaned HTML
      htmlContent = $.html();

      // Further sanitize the HTML
      htmlContent = sanitizeHtml(htmlContent, {
        allowedTags: sanitizeHtml.defaults.allowedTags.concat(['img', 'style']),
        allowedAttributes: {
          ...sanitizeHtml.defaults.allowedAttributes,
          '*': ['class', 'id', 'style']
        }
      });
    } catch (cleanError) {
      console.error('❌ Error cleaning HTML:', cleanError.message);
      // Continue with the original HTML
    }

    // Save the HTML to a file
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    
    // If jobId is provided, save to job-specific directory
    let outputPath;
    if (jobId) {
      const jobDirs = getJobDirectories(jobId);
      outputPath = path.join(jobDirs.rendered, `rendered-${hostname}-${timestamp}.html`);
    } else {
      // Save to standard directory for backward compatibility
      const standardDir = path.join(process.cwd(), 'SCRAPI', 'output-staging', 'scraper-results');
      if (!fs.existsSync(standardDir)) {
        fs.mkdirSync(standardDir, { recursive: true });
      }
      outputPath = path.join(standardDir, `rendered-${hostname}-${timestamp}.html`);
    }
    
    // Ensure the directory exists
    const outputDir = path.dirname(outputPath);
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }
    
    fs.writeFileSync(outputPath, htmlContent);
    console.log(`✅ HTML saved to ${outputPath}`);
    
    return {
      success: true,
      outputPath,
      content: htmlContent
    };
  } catch (error) {
    console.error('❌ Error during rendered universal scrape:', error.message);
    
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

// Function to render ad landing pages as HTML
async function renderAdLandingPagesAsHtml(serpId, maxAds = 2) {
  console.log(`\n🔄 Rendering ad landing pages as HTML for SERP ${serpId}...`);

  try {
    // Get the SERP to determine the job ID
    const { data: serp, error: serpError } = await supabase
      .from('serps')
      .select('job_id, query, location')
      .eq('id', serpId)
      .single();
      
    if (serpError) {
      console.error('Error fetching SERP:', serpError);
      return {
        success: false,
        error: serpError.message
      };
    }
    
    const jobId = serp?.job_id;
    
    // Get the ads for this SERP
    const { data: serpAds, error: serpAdsError } = await supabase
      .from('serp_ads')
      .select(`
        ad_id,
        position,
        ads (
          id,
          advertiser_domain,
          title,
          url
        )
      `)
      .eq('serp_id', serpId)
      .order('position', { ascending: true })
      .limit(maxAds);

    if (serpAdsError) {
      console.error('❌ Error fetching SERP-Ad relationships:', serpAdsError);
      return {
        success: false,
        error: serpAdsError.message
      };
    }

    if (!serpAds || serpAds.length === 0) {
      console.log('No ads found for this SERP');
      return {
        success: true,
        message: 'No ads found for this SERP'
      };
    }

    console.log(`Found ${serpAds.length} ads to render`);

    // Process each ad
    for (let i = 0; i < serpAds.length; i++) {
      const serpAd = serpAds[i];
      const ad = serpAd.ads;
      
      if (!ad || !ad.url) {
        console.log(`Skipping ad ${i+1}/${serpAds.length}: No URL available`);
        continue;
      }

      console.log(`\n[${i+1}/${serpAds.length}] Rendering ad: ${ad.title || 'Untitled'} (${ad.url})`);

      // Check if this ad already has a rendering
      const { data: existingRenderings, error: checkError } = await supabase
        .from('ad_renderings')
        .select('id')
        .eq('ad_id', ad.id)
        .eq('serp_id', serpId)
        .eq('rendering_type', 'html');

      if (checkError) {
        console.error('❌ Error checking for existing renderings:', checkError);
        continue;
      }

      if (existingRenderings && existingRenderings.length > 0) {
        console.log(`✅ Ad already has an HTML rendering, skipping`);
        continue;
      }

      // Render the ad landing page as HTML
      const renderResult = await renderUrlAsHtml(ad.url, jobId);
      
      if (!renderResult.success) {
        console.error('❌ Failed to render ad landing page:', renderResult.error);
        continue;
      }

      // Store the rendering in the database
      const { error: insertError } = await supabase
        .from('ad_renderings')
        .insert({
          ad_id: ad.id,
          serp_id: serpId,
          rendering_type: 'html',
          content_path: renderResult.outputPath,
          content_html: renderResult.content,
          content_size: renderResult.content.length,
          status: 'processed',
          processed_at: new Date().toISOString()
        });

      if (insertError) {
        console.error('❌ Error storing rendering in database:', insertError);
        continue;
      }

      console.log('✅ HTML rendering stored in database');

      // Add a delay between rendering different ads to avoid rate limiting
      if (i < serpAds.length - 1) {
        console.log('Waiting 5 seconds before rendering next ad...');
        await new Promise(resolve => setTimeout(resolve, 5000));
      }
    }

    return {
      success: true,
      message: `Rendered ${serpAds.length} ad landing pages as HTML`
    };
  } catch (error) {
    console.error('❌ Unexpected error during rendering:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

// Main function
async function main() {
  console.log('🚀 Starting RenderAdLandingPagesAsHtml');
  
  // Test Supabase connection
  const connectionOk = await testSupabaseConnection();
  if (!connectionOk) {
    console.error('❌ Supabase connection failed, aborting');
    return;
  }
  
  // Get command line arguments
  const serpId = process.argv[2]; // Required SERP ID
  const maxAds = parseInt(process.argv[3] || '2', 10); // Max ads to process, default 2
  
  if (!serpId) {
    console.error('❌ No SERP ID provided');
    console.log('Usage: node SCRAPI/d-automations/2-advault-process/g-render-ad-landing-pages-as-html.js <serpId> [maxAds]');
    return;
  }
  
  // Render ad landing pages as HTML
  const result = await renderAdLandingPagesAsHtml(serpId, maxAds);
  
  if (result.success) {
    console.log('\n✅ Rendering completed successfully');
    console.log(result.message);
  } else {
    console.error('\n❌ Rendering failed');
    if (result.error) {
      console.error(`Error: ${result.error}`);
    }
  }
}

// Run the main function if this file is executed directly
if (require.main === module) {
  main().catch(error => {
    console.error('❌ Fatal error:', error);
    process.exit(1);
  });
}

// Export functions for use in other modules
module.exports = {
  testSupabaseConnection,
  renderUrlAsHtml,
  renderAdLandingPagesAsHtml
};