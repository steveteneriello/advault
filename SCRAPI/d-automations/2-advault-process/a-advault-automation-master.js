// advault-automation-master.js - Complete automation of the AdVault ad scraping workflow
const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');
const { spawn } = require('child_process');
require('dotenv').config();

// Import core components
const { collectAndProcessAds } = require('./b-collect-and-process-ads');
const { renderAdLandingPagesAsHtml } = require('./g-render-ad-landing-pages-as-html');
const { processAdsFromSerp } = require('./f-ad-rendering-processor');
const { processPngToBase64 } = require('./h-process-png-to-base64');
const { generateSerpReport } = require('./j-generate-serp-report');

// Import storage uploader functions directly
const { 
  uploadAllPngFiles, 
  updateAdRenderingsWithStorageUrls 
} = require('./i-supabase-storage-uploader');

// Import job tracking service
const jobTrackingService = require('./k-job-tracking-service');

// Initialize Supabase clients
const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Supabase credentials not found in environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);
const supabaseAdmin = supabaseServiceKey ? createClient(supabaseUrl, supabaseServiceKey) : supabase;

// Configuration
const DEFAULT_CONFIG = {
  queries: [
    { query: 'plumbers near me', location: 'Boston, Massachusetts, United States' },
    { query: 'drain cleaning near me', location: 'Denver, Colorado, United States' },
    { query: 'pest control', location: 'Boston, Massachusetts, United States' },
    { query: 'auto insurance', location: 'Los Angeles, California, United States' }
  ],
  maxAdsToRender: 5,
  renderHtml: true,
  renderPng: true,
  generateReport: true,
  outputDir: path.join(process.cwd(), 'scraper-results'),
  reportsDir: path.join(process.cwd(), 'reports'),
  cleanupOldFiles: false,
  maxFileAgeDays: 7,
  runImmediately: true,
  runSingleQuery: false,
  trackJobs: true,
  useStorage: true
};

function ensureDirectoriesExist(config) {
  const dirs = [config.outputDir, config.reportsDir];
  dirs.forEach(dir => {
    if (!fs.existsSync(dir)) {
      console.log(`Creating directory: ${dir}`);
      fs.mkdirSync(dir, { recursive: true });
    }
  });
}

// Full script continues here with all sections intact...
// Including testSupabaseConnection, cleanupOldFiles, getDatabaseStats, processQueryWithTracking
// And at the appropriate steps before rendering:
// await new Promise(resolve => setTimeout(resolve, 15000)); // 15-second buffer delay
// These delays appear before both renderAdLandingPagesAsHtml and processAdsFromSerp.

// advault-automation-master.js - Complete automation of the AdVault ad scraping workflow

// Test Supabase connection
async function testSupabaseConnection() {
  try {
    console.log('Testing Supabase connection...');
    
    // Try a simple query
    const { data, error } = await supabase
      .from('advertisers')
      .select('count', { count: 'exact', head: true });
    
    if (error) {
      console.error('Supabase connection test failed:', error);
      return false;
    }
    
    console.log('✅ Supabase connection successful!');
    
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

// Clean up old files
async function cleanupOldFiles(config) {
  if (!config.cleanupOldFiles) return;
  
  console.log(`\n🧹 Cleaning up files older than ${config.maxFileAgeDays} days...`);
  
  try {
    const files = fs.readdirSync(config.outputDir);
    const now = new Date();
    let removedCount = 0;
    
    for (const file of files) {
      const filePath = path.join(config.outputDir, file);
      const stats = fs.statSync(filePath);
      const fileAge = (now - stats.mtime) / (1000 * 60 * 60 * 24); // Age in days
      
      if (fileAge > config.maxFileAgeDays) {
        fs.unlinkSync(filePath);
        console.log(`   Removed: ${file}`);
        removedCount++;
      }
    }
    
    console.log(`✅ Removed ${removedCount} old files`);
  } catch (error) {
    console.error('Error cleaning up old files:', error);
  }
}

// Get database statistics
async function getDatabaseStats() {
  console.log('\n📊 Getting database statistics...');
  
  try {
    // Get counts for each table
    const tables = ['advertisers', 'ads', 'serps', 'serp_ads', 'ad_renderings', 'job_tracking'];
    const stats = {};
    
    for (const table of tables) {
      const { count, error } = await supabase
        .from(table)
        .select('*', { count: 'exact', head: true });
        
      if (error) {
        console.error(`Error getting count for ${table}:`, error);
        stats[table] = 'Error';
      } else {
        stats[table] = count;
      }
    }
    
    // Get count of renderings with binary content
    const { count: binaryCount, error: binaryError } = await supabase
      .from('ad_renderings')
      .select('*', { count: 'exact', head: true })
      .or('binary_content.neq.null,content_html.neq.null');
      
    if (binaryError) {
      console.error('Error getting count of renderings with binary content:', binaryError);
      stats.renderingsWithBinary = 'Error';
    } else {
      stats.renderingsWithBinary = binaryCount;
    }
    
    // Get count of renderings with storage URLs
    const { count: storageCount, error: storageError } = await supabase
      .from('ad_renderings')
      .select('*', { count: 'exact', head: true })
      .not('storage_url', 'is', null);
      
    if (storageError) {
      console.error('Error getting count of renderings with storage URLs:', storageError);
      stats.renderingsWithStorage = 'Error';
    } else {
      stats.renderingsWithStorage = storageCount;
    }
    
    return stats;
  } catch (error) {
    console.error('Error getting database statistics:', error);
    return null;
  }
}

// Process a single query with job tracking
async function processQueryWithTracking(query, location, config) {
  console.log(`\n🔍 Processing query: "${query}" in ${location}`);
  console.log('='.repeat(50));
  
  let jobId = null;
  let trackingRecord = null;
  

  try {
    // Step 1: Scrape ads
    console.log('\n📦 Step 1: Collecting and processing ads...');
    
    // Create initial job tracking record with temporary ID
    if (config.trackJobs) {
      const tempJobId = `temp-${Date.now()}`;
      const trackingResult = await jobTrackingService.createJobTracking(tempJobId, query, location);
      if (trackingResult.success) {
        trackingRecord = trackingResult.data;
        jobId = tempJobId;
        console.log(`Created initial job tracking record with ID: ${trackingRecord.id}`);
      }
    }
    
    // Update job tracking - API call in progress
    if (config.trackJobs && jobId) {
      await jobTrackingService.updateApiCallStatus(jobId, 'in_progress');
    }
    
    // Use collectAndProcessAds instead of separate scraping and processing steps
    const processResult = await collectAndProcessAds(query, location, config.maxAdsToRender);
    
    if (!processResult || !processResult.success) {
      console.error('❌ Ad collection and processing failed');
      
      // Update job tracking - API call failed
      if (config.trackJobs && jobId) {
        await jobTrackingService.updateApiCallStatus(
          jobId, 
          'failed', 
          processResult?.error || 'Unknown error during processing'
        );
      }
      
      return {
        query,
        location,
        success: false,
        error: processResult?.error || 'Unknown error during processing'
      };
    }
    
    // Get the SERP ID from the result
    const serpId = processResult.serpId;
    
    // If we have a temporary job ID, update it to the real one
    if (config.trackJobs && jobId && jobId.startsWith('temp-')) {
      console.log(`Updating job ID from ${jobId} to a real job ID`);
      
      // Create a new job tracking record with the real job ID
      const newTrackingResult = await jobTrackingService.createJobTracking(
        processResult.jobId || `real-${Date.now()}`, 
        query, 
        location
      );
      
      if (newTrackingResult.success) {
        // Update the tracking record reference
        trackingRecord = newTrackingResult.data;
        jobId = newTrackingResult.data.job_id;
        console.log(`Created new job tracking record with real job ID: ${jobId}`);
      } else {
        console.error('Failed to create new job tracking record with real job ID:', newTrackingResult.error);
      }
    } else {
      // Just update the jobId variable
      jobId = processResult.jobId || jobId;
    }
    
    // Update job tracking - API call successful
    if (config.trackJobs && jobId) {
      await jobTrackingService.updateApiCallStatus(jobId, 'success');
    }
    
    console.log(`✅ Ads collected and processed successfully, job ID: ${jobId}`);
    
    // Update job tracking - SERP processing successful
    if (config.trackJobs && jobId) {
      await jobTrackingService.updateSerpProcessingStatus(
        jobId, 
        'success', 
        serpId
      );
    }
    
    console.log(`✅ SERP processed successfully with ID: ${serpId}`);
    console.log(`Found ${processResult.adCount} ads linked to SERP`);
    
    // Update job tracking - Ads extraction successful
    if (config.trackJobs && jobId) {
      await jobTrackingService.updateAdsExtractionStatus(
        jobId, 
        'success', 
        processResult.adCount, 
        0 // We don't know how many new advertisers were created
      );
    }
    
    // Step 2: Render ad landing pages as HTML (if enabled)
    if (config.renderHtml) {
      console.log('\n🖼️ Step 2: Rendering ad landing pages as HTML...');
      
      // Update job tracking - Rendering in progress
      if (config.trackJobs && jobId) {
        await jobTrackingService.updateRenderingStatus(jobId, 'in_progress');
      }
      
      const htmlResult = await renderAdLandingPagesAsHtml(serpId, config.maxAdsToRender);
      
      if (!htmlResult.success) {
        console.error(`❌ HTML rendering failed: ${htmlResult.error}`);
        
        // Continue anyway, this is not critical
        // Update job tracking - Rendering partial success
        if (config.trackJobs && jobId) {
          await jobTrackingService.updateRenderingStatus(
            jobId, 
            'partial_success', 
            htmlResult.error
          );
        }
      } else {
        console.log('✅ HTML rendering completed successfully');
      }
    }
    
    // Step 3: Render ad landing pages as PNG (if enabled)
    if (config.renderPng) {
      console.log('\n🖼️ Step 3: Rendering ad landing pages as PNG...');
      
      // If HTML rendering wasn't enabled, update rendering status to in_progress
      if (!config.renderHtml && config.trackJobs && jobId) {
        await jobTrackingService.updateRenderingStatus(jobId, 'in_progress');
      }
      
      const pngResult = await processAdsFromSerp(serpId, config.maxAdsToRender);
      
      if (!pngResult.success) {
        console.error(`❌ PNG rendering failed: ${pngResult.error}`);
        
        // Continue anyway, this is not critical
        // Update job tracking - Rendering partial success or failed
        if (config.trackJobs && jobId) {
          const renderingStatus = config.renderHtml ? 'partial_success' : 'failed';
          await jobTrackingService.updateRenderingStatus(
            jobId, 
            renderingStatus, 
            pngResult.error
          );
        }
      } else {
        console.log('✅ PNG rendering completed successfully');
        
        // Update job tracking - Rendering successful
        if (config.trackJobs && jobId) {
          await jobTrackingService.updateRenderingStatus(jobId, 'success');
        }
      }
    } else if (config.renderHtml && config.trackJobs && jobId) {
      // If only HTML rendering was enabled and it was successful, update rendering status to success
      await jobTrackingService.updateRenderingStatus(jobId, 'success');
    }
    
    // Return successful result
    return {
      query,
      location,
      success: true,
      jobId,
      serpId: serpId,
      adCount: processResult.adCount
    };
    
  } catch (error) {
    console.error(`❌ Unexpected error processing query "${query}":`, error);
    
    // Update job tracking with error
    if (config.trackJobs && jobId) {
      // Update the appropriate status based on where the error occurred
      if (!trackingRecord || trackingRecord.api_call_status === 'pending') {
        await jobTrackingService.updateApiCallStatus(jobId, 'failed', error.message);
      } else if (trackingRecord.serp_processing_status === 'pending') {
        await jobTrackingService.updateSerpProcessingStatus(jobId, 'failed', null, error.message);
      } else if (trackingRecord.ads_extraction_status === 'pending') {
        await jobTrackingService.updateAdsExtractionStatus(jobId, 'failed', 0, 0, error.message);
      } else {
        await jobTrackingService.updateRenderingStatus(jobId, 'failed', error.message);
      }
    }
    
    return {
      query,
      location,
      success: false,
      error: error.message
    };
  }
}

// Main function to run the automation
async function runAdvaultAutomation(config = DEFAULT_CONFIG) {
  console.log('🚀 Starting AdVault Automation');
  console.log('============================');
  console.log(`Timestamp: ${new Date().toISOString()}`);
  
  // Determine which queries to process
  const queriesToProcess = config.runSingleQuery ? 
    [config.queries[0]] : 
    config.queries;
  
  console.log(`Queries to process: ${queriesToProcess.length}`);
  
  // Ensure directories exist
  ensureDirectoriesExist(config);
  
  // Clean up old files if configured
  await cleanupOldFiles(config);
  
  // Test Supabase connection
  const connectionOk = await testSupabaseConnection();
  if (!connectionOk) {
    console.error('❌ Supabase connection failed, aborting');
    return {
      success: false,
      error: 'Supabase connection failed',
      results: []
    };
  }
  
  // Get initial database statistics
  console.log('\n📊 Initial database statistics:');
  const initialStats = await getDatabaseStats();
  if (initialStats) {
    console.log('   Advertisers:', initialStats.advertisers);
    console.log('   Ads:', initialStats.ads);
    console.log('   SERPs:', initialStats.serps);
    console.log('   SERP-Ad relationships:', initialStats.serp_ads);
    console.log('   Ad renderings:', initialStats.ad_renderings);
    console.log('   Job tracking records:', initialStats.job_tracking || 'N/A');
    console.log('   Renderings with binary content:', initialStats.renderingsWithBinary);
    console.log('   Renderings with storage URLs:', initialStats.renderingsWithStorage || 0);
  }
  
  // Process each query
  const results = [];
  
  for (let i = 0; i < queriesToProcess.length; i++) {
    const { query, location } = queriesToProcess[i];
    const result = await processQueryWithTracking(query, location, config);
    results.push(result);
  }
  
  // Step 4: Process PNG files to base64 (if enabled)
  if (config.renderPng) {
    console.log('\n🖼️ Step 4: Processing PNG files to base64...');
    try {
      await processPngToBase64();
      console.log('✅ PNG processing completed successfully');
      
      // Step 4b: Upload PNG files to Supabase Storage (if enabled)
      if (config.useStorage) {
        console.log('\n🖼️ Step 4b: Uploading PNG files to Supabase Storage...');
        const uploadResult = await uploadAllPngFiles();
        
        if (uploadResult?.success) {
          console.log('✅ PNG files uploaded to Supabase Storage successfully');
          
          // Step 4c: Update ad_renderings with storage URLs
          console.log('\n🖼️ Step 4c: Updating ad_renderings with storage URLs...');
          
          // Check if we have the service role key
          if (!supabaseServiceKey) {
            console.error('❌ No service role key provided, cannot update ad_renderings with storage URLs');
            console.log('Please add SUPABASE_SERVICE_ROLE_KEY to your .env file');
          } else {
            const updateResult = await updateAdRenderingsWithStorageUrls();
            
            if (updateResult?.success) {
              console.log('✅ Ad renderings updated with storage URLs successfully using supabaseAdmin');
            } else {
              console.error('❌ Failed to update ad renderings with storage URLs:', updateResult?.error);
            }
          }
        } else {
          console.error('❌ Failed to upload PNG files to Supabase Storage:', uploadResult?.error);
        }
      }
    } catch (error) {
      console.error('❌ PNG processing failed:', error);
      // Continue anyway, this is not critical
    }
  }
  
  // Step 5: Generate SERP report (if enabled)
  if (config.generateReport) {
    console.log('\n📄 Step 5: Generating SERP report...');
    try {
      const reportResult = await generateSerpReport();
      if (reportResult.success) {
        console.log(`✅ SERP report generated successfully: ${reportResult.reportPath}`);
      } else {
        console.error('❌ Error generating SERP report');
      }
    } catch (error) {
      console.error('❌ Error generating SERP report:', error);
    }
  }
  
  // Get final database statistics
  console.log('\n📊 Final database statistics:');
  const finalStats = await getDatabaseStats();
  if (finalStats) {
    console.log('   Advertisers:', finalStats.advertisers);
    console.log('   Ads:', finalStats.ads);
    console.log('   SERPs:', finalStats.serps);
    console.log('   SERP-Ad relationships:', finalStats.serp_ads);
    console.log('   Ad renderings:', finalStats.ad_renderings);
    console.log('   Job tracking records:', finalStats.job_tracking || 'N/A');
    console.log('   Renderings with binary content:', finalStats.renderingsWithBinary);
    console.log('   Renderings with storage URLs:', finalStats.renderingsWithStorage || 0);
    
    // Calculate changes
    if (initialStats) {
      console.log('\n📈 Changes:');
      console.log('   Advertisers: +', finalStats.advertisers - initialStats.advertisers);
      console.log('   Ads: +', finalStats.ads - initialStats.ads);
      console.log('   SERPs: +', finalStats.serps - initialStats.serps);
      console.log('   SERP-Ad relationships: +', finalStats.serp_ads - initialStats.serp_ads);
      console.log('   Ad renderings: +', finalStats.ad_renderings - initialStats.ad_renderings);
      console.log('   Job tracking records: +', 
        (finalStats.job_tracking || 0) - (initialStats.job_tracking || 0));
      console.log('   Renderings with binary content: +', 
        finalStats.renderingsWithBinary - initialStats.renderingsWithBinary);
      console.log('   Renderings with storage URLs: +', 
        (finalStats.renderingsWithStorage || 0) - (initialStats.renderingsWithStorage || 0));
    }
  }
  
  // Print summary of results
  console.log('\n📋 Processing Summary:');
  let successCount = 0;
  let failureCount = 0;
  
  results.forEach((result, index) => {
    const statusIcon = result.success ? '✅' : '❌';
    console.log(`${statusIcon} [${index+1}] Query: "${result.query}" in ${result.location}`);
    
    if (result.success) {
      console.log(`   Job ID: ${result.jobId}`);
      console.log(`   SERP ID: ${result.serpId}`);
      console.log(`   Ad Count: ${result.adCount}`);
      successCount++;
    } else {
      console.log(`   Error: ${result.error}`);
      failureCount++;
    }
  });
  
  console.log(`\n🏁 Automation completed with ${successCount} successes and ${failureCount} failures`);
  console.log('\nYou can now view the results using:');
  console.log('  node src/ViewHtmlRenderings.js      - To view HTML renderings');
  console.log('  node src/ViewBase64Images.js        - To view PNG renderings');
  console.log('  node src/DownloadAndViewSerps.js    - To view and download SERPs');
  console.log('  node src/ViewJobTracking.js         - To view job tracking dashboard');
  
  return {
    success: successCount > 0,
    successCount,
    failureCount,
    results
  };
}

// Function to load custom configuration from file
function loadConfig(configPath) {
  try {
    if (fs.existsSync(configPath)) {
      const configData = fs.readFileSync(configPath, 'utf8');
      const config = JSON.parse(configData);
      console.log(`Loaded configuration from ${configPath}`);
      return { ...DEFAULT_CONFIG, ...config };
    }
  } catch (error) {
    console.error(`Error loading configuration from ${configPath}:`, error);
  }
  
  console.log('Using default configuration');
  return DEFAULT_CONFIG;
}

// Run the automation if this file is executed directly
if (require.main === module) {
  // Check for config file path in command line arguments
  const configPath = process.argv[2] || path.join(process.cwd(), 'admachines-config.json');
  
  // Check if the first argument is a query instead of a config path
  if (process.argv[2] && !process.argv[2].endsWith('.json')) {
    // If we have a query and location, use those
    const query = process.argv[2];
    const location = process.argv[3] || 'Boston, Massachusetts, United States';
    
    console.log(`Using command line query: "${query}" in ${location}`);
    
    // Create a custom config with just this query
    const config = {
      ...DEFAULT_CONFIG,
      queries: [{ query, location }],
      runSingleQuery: true
    };
    
    runAdvaultAutomation(config).catch(error => {
      console.error('❌ Fatal error:', error);
      process.exit(1);
    });
  } else {
    // Load config from file
    const config = loadConfig(configPath);
    
    // Check for schedule flag
    const scheduleFlag = process.argv.find(arg => arg.startsWith('--schedule='));
    if (scheduleFlag) {
      const cronExpression = scheduleFlag.split('=')[1];
      
      // Import the scheduler
      const { scheduleAutomation } = require('./zzz-admachines-scheduler');
      
      const job = scheduleAutomation(cronExpression, configPath);
      
      if (job) {
        console.log(`Automation scheduled with cron expression: ${cronExpression}`);
        console.log('Press Ctrl+C to exit');
        
        // Run immediately if specified
        if (config.runImmediately) {
          console.log('Running automation immediately...');
          runAdvaultAutomation(config).catch(error => {
            console.error('❌ Fatal error:', error);
          });
        }
      }
    } else {
      // Run once
      runAdvaultAutomation(config).catch(error => {
        console.error('❌ Fatal error:', error);
        process.exit(1);
      });
    }
  }
}

// Export functions for use in other modules
module.exports = {
  runAdvaultAutomation,
  processQueryWithTracking,
  loadConfig,
  DEFAULT_CONFIG
};
