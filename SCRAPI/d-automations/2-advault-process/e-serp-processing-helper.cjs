// SerpProcessingHelper.js: Utilities for working with SERP processing
const { createClient } = require('@supabase/supabase-js');
const { validateSupabaseConfig, getSupabaseConfig } = require('../../utils/validateSupabaseConfig.cjs');
const { getSupabaseHeaders } = require('../../utils/getSupabaseHeaders.cjs');
const fs = require('fs');
const path = require('path');
const axios = require('axios');
require('dotenv').config();

// Validate Supabase configuration
const validationResult = validateSupabaseConfig();
if (!validationResult.isValid) {
  console.error('❌ Invalid Supabase configuration:');
  validationResult.errors.forEach(error => console.error(`- ${error}`));
  process.exit(1);
}

// Get Supabase configuration
const config = getSupabaseConfig();

// Initialize Supabase clients
const supabase = createClient(config.url, config.anonKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false
  },
  global: {
    headers: {
      'apikey': config.anonKey,
      'Authorization': `Bearer ${config.anonKey}`
    }
  }
});

// Create admin client with service role key if available
const supabaseAdmin = config.serviceRoleKey ? 
  createClient(config.url, config.serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false
    },
    global: {
      headers: {
        'apikey': config.serviceRoleKey,
        'Authorization': `Bearer ${config.serviceRoleKey}`
      }
    }
  }) : 
  supabase;

// Directory for logs
const LOGS_DIR = path.join(process.cwd(), 'SCRAPI', 'output-staging', 'logs');
if (!fs.existsSync(LOGS_DIR)) {
  fs.mkdirSync(LOGS_DIR, { recursive: true });
}

// Log file for SERP processing
const SERP_LOG_FILE = path.join(LOGS_DIR, `serp-processing-${new Date().toISOString().replace(/[:.]/g, '-')}.log`);

/**
 * Log message to both console and file
 * @param {string} message - Message to log
 */
function log(message) {
  const timestamp = new Date().toISOString();
  const logMessage = `[${timestamp}] ${message}`;
  
  console.log(logMessage);
  fs.appendFileSync(SERP_LOG_FILE, logMessage + '\n');
}

// Wait for a SERP to be processed
async function waitForSerpProcessing(jobId, maxAttempts = 60, delayMs = 1000) {
  log(`Waiting for SERP processing for job ${jobId}...`);
  
  let attempts = 0;
  
  while (attempts < maxAttempts) {
    attempts++;
    
    try {
      // First check if the SERP exists directly
      const { data: serp, error: serpError } = await supabase
        .from('serps')
        .select('id')
        .eq('job_id', jobId)
        .maybeSingle();
        
      if (serpError) {
        log(`Error checking for SERP (attempt ${attempts}/${maxAttempts}): ${serpError.message}`);
      } else if (serp) {
        log(`✅ SERP found with ID: ${serp.id}`);
        
        // Check for SERP-Ad relationships
        const { data: serpAds, error: serpAdsError } = await supabase
          .from('serp_ads')
          .select('ad_id')
          .eq('serp_id', serp.id);
          
        if (serpAdsError) {
          log(`Error checking for SERP-Ad relationships: ${serpAdsError.message}`);
        } else {
          log(`✅ Found ${serpAds.length} ads linked to SERP`);
          
          // Log the first few ad IDs
          if (serpAds.length > 0) {
            const adIdsToShow = serpAds.slice(0, 3).map(sa => sa.ad_id);
            log(`   Sample ad IDs: ${adIdsToShow.join(', ')}${serpAds.length > 3 ? '...' : ''}`);
            
            // Get ad details for the first few ads
            const { data: ads, error: adsError } = await supabase
              .from('ads')
              .select('id, advertiser_domain, title')
              .in('id', adIdsToShow);
              
            if (!adsError && ads && ads.length > 0) {
              log('   Sample ads:');
              ads.forEach(ad => {
                log(`   - ${ad.title} (${ad.advertiser_domain})`);
              });
            }
          }
        }
        
        return {
          success: true,
          serpId: serp.id,
          adCount: serpAds?.length || 0
        };
      }
      
      // If SERP not found directly, check the staging status using REST API
      try {
        const response = await axios.get(
          `${config.url}/rest/v1/staging_serps?select=id,status,error_message,processed_at,content&job_id=eq.${jobId}`,
          { headers: getSupabaseHeaders() }
        );
        
        if (response.data && response.data.length > 0) {
          const staging = response.data[0];
          log(`Staging status: ${staging.status} (attempt ${attempts}/${maxAttempts})`);
          
          // Check if the content has paid ads
          if (staging.content) {
            try {
              const paidAds = staging.content.results[0].content.results.paid;
              if (paidAds && paidAds.length > 0) {
                log(`   Found ${paidAds.length} paid ads in content`);
                log(`   First ad: ${paidAds[0].title} (${paidAds[0].url})`);
              } else {
                log(`   No paid ads found in content`);
              }
            } catch (e) {
              log(`   Error extracting paid ads from content: ${e.message}`);
              
              // Try to log the content structure
              log(`   Content structure: ${JSON.stringify(Object.keys(staging.content))}`);
              if (staging.content.results && staging.content.results.length > 0) {
                log(`   Results structure: ${JSON.stringify(Object.keys(staging.content.results[0]))}`);
                if (staging.content.results[0].content) {
                  log(`   Content.results structure: ${JSON.stringify(Object.keys(staging.content.results[0].content))}`);
                  if (staging.content.results[0].content.results) {
                    log(`   Results.results structure: ${JSON.stringify(Object.keys(staging.content.results[0].content.results))}`);
                  }
                }
              }
            }
          }
          
          if (staging.status === 'error') {
            log(`❌ Processing failed: ${staging.error_message}`);
            
            // Check processing logs for more details
            try {
              const logsResponse = await axios.get(
                `${config.url}/rest/v1/processing_logs?select=*&staging_id=eq.${staging.id}&order=created_at.asc`,
                { headers: getSupabaseHeaders() }
              );
              
              if (logsResponse.data && logsResponse.data.length > 0) {
                log('   Processing logs:');
                logsResponse.data.forEach(logEntry => {
                  const timestamp = new Date(logEntry.created_at).toLocaleString();
                  const statusSymbol = logEntry.status === 'error' ? '❌' : 
                                      logEntry.status === 'warning' ? '⚠️' : 
                                      logEntry.status === 'success' ? '✅' : 'ℹ️';
                  log(`   ${statusSymbol} [${timestamp}] ${logEntry.operation}: ${logEntry.message}`);
                });
              }
            } catch (logsError) {
              log(`   Error fetching processing logs: ${logsError.message}`);
            }
            
            // Try to reprocess the staging record
            log('   Attempting to reprocess the staging record...');
            try {
              const reprocessResponse = await axios.post(
                `${config.url}/rest/v1/rpc/reprocess_staged_serp`,
                { p_staging_id: staging.id },
                { headers: getSupabaseHeaders(true) }
              );
              
              if (reprocessResponse.data) {
                log(`   ✅ Reprocessing initiated: ${reprocessResponse.data}`);
              } else {
                log(`   ❌ Reprocessing failed: No response data`);
              }
            } catch (reprocessError) {
              log(`   ❌ Reprocessing failed: ${reprocessError.message}`);
            }
            
            return {
              success: false,
              error: staging.error_message
            };
          } else if (staging.status === 'skipped') {
            log(`⏭️ Processing skipped: ${staging.error_message}`);
            
            // Try to get the existing SERP
            try {
              const existingResponse = await axios.get(
                `${config.url}/rest/v1/serps?select=id&job_id=eq.${jobId}`,
                { headers: getSupabaseHeaders() }
              );
              
              if (existingResponse.data && existingResponse.data.length > 0) {
                return {
                  success: true,
                  serpId: existingResponse.data[0].id,
                  skipped: true
                };
              }
            } catch (existingError) {
              log(`Error checking for existing SERP: ${existingError.message}`);
            }
            
            return {
              success: false,
              skipped: true,
              error: staging.error_message
            };
          } else if (staging.status === 'processed') {
            // If status is processed, but we didn't find the SERP directly above,
            // there might be a delay in database consistency. Let's check again for the SERP.
            try {
              const processedResponse = await axios.get(
                `${config.url}/rest/v1/serps?select=id&job_id=eq.${jobId}`,
                { headers: getSupabaseHeaders() }
              );
              
              if (processedResponse.data && processedResponse.data.length > 0) {
                log(`✅ SERP found with ID: ${processedResponse.data[0].id} after checking staging status`);
                
                // Check for SERP-Ad relationships
                try {
                  const serpAdsResponse = await axios.get(
                    `${config.url}/rest/v1/serp_ads?select=ad_id&serp_id=eq.${processedResponse.data[0].id}`,
                    { headers: getSupabaseHeaders() }
                  );
                  
                  if (serpAdsResponse.data) {
                    log(`✅ Found ${serpAdsResponse.data.length} ads linked to SERP`);
                  }
                  
                  return {
                    success: true,
                    serpId: processedResponse.data[0].id,
                    adCount: serpAdsResponse.data?.length || 0
                  };
                } catch (serpAdsError) {
                  log(`Error checking for SERP-Ad relationships: ${serpAdsError.message}`);
                  
                  return {
                    success: true,
                    serpId: processedResponse.data[0].id,
                    adCount: 0
                  };
                }
              } else {
                log('Staging status is processed but SERP not found yet. Continuing to wait...');
              }
            } catch (processedError) {
              log(`Error checking for processed SERP: ${processedError.message}`);
            }
          }
        } else {
          log(`No staging record found for job ${jobId} (attempt ${attempts}/${maxAttempts})`);
        }
      } catch (apiError) {
        log(`Error checking staging status (attempt ${attempts}/${maxAttempts}): ${apiError.message}`);
        if (apiError.response) {
          log(`Response status: ${apiError.response.status}`);
          log(`Response data: ${JSON.stringify(apiError.response.data || {})}`);
        }
      }
      
      // Wait before checking again
      await new Promise(resolve => setTimeout(resolve, delayMs));
    } catch (error) {
      log(`Unexpected error (attempt ${attempts}/${maxAttempts}): ${error.message}`);
      
      // Wait before checking again
      await new Promise(resolve => setTimeout(resolve, delayMs));
    }
  }
  
  log(`❌ Timed out waiting for SERP processing after ${maxAttempts} attempts`);
  return {
    success: false,
    error: 'Timed out waiting for SERP processing'
  };
}

// Get processing logs for a staging ID
async function getProcessingLogs(stagingId) {
  try {
    const { data: logs, error } = await supabase
      .from('processing_logs')
      .select('*')
      .eq('staging_id', stagingId)
      .order('created_at', { ascending: true });
      
    if (error) {
      log(`Error fetching processing logs: ${error.message}`);
      return [];
    }
    
    return logs;
  } catch (error) {
    log(`Unexpected error fetching logs: ${error.message}`);
    return [];
  }
}

// Manually reprocess a staged SERP
async function reprocessStagedSerp(stagingId) {
  try {
    const { data, error } = await supabase
      .rpc('reprocess_staged_serp', { p_staging_id: stagingId });
      
    if (error) {
      log(`Error reprocessing staged SERP: ${error.message}`);
      return {
        success: false,
        error: error.message
      };
    }
    
    return {
      success: true,
      message: data
    };
  } catch (error) {
    log(`Unexpected error reprocessing staged SERP: ${error.message}`);
    return {
      success: false,
      error: error.message
    };
  }
}

// Check SERP processing status
async function checkSerpProcessingStatus(jobId) {
  try {
    const { data, error } = await supabase
      .rpc('check_serp_processing_status', { p_job_id: jobId });
      
    if (error) {
      log(`Error checking SERP processing status: ${error.message}`);
      return {
        success: false,
        error: error.message
      };
    }
    
    return {
      success: true,
      data
    };
  } catch (error) {
    log(`Unexpected error checking SERP processing status: ${error.message}`);
    return {
      success: false,
      error: error.message
    };
  }
}

// Stage a SERP for processing
async function stageSerpForProcessing(jobId, query, location, timestamp, content) {
  try {
    const { data, error } = await supabase
      .from('staging_serps')
      .insert({
        job_id: jobId,
        query: query,
        location: location,
        timestamp: timestamp,
        content: content,
        status: 'pending'
      })
      .select();
      
    if (error) {
      log(`Error staging SERP for processing: ${error.message}`);
      return {
        success: false,
        error: error.message
      };
    }
    
    return {
      success: true,
      stagingId: data[0].id
    };
  } catch (error) {
    log(`Unexpected error staging SERP for processing: ${error.message}`);
    return {
      success: false,
      error: error.message
    };
  }
}

// Debug function to check database trigger status
async function debugDatabaseTrigger() {
  try {
    log('Checking database trigger status...');
    
    // Check if the trigger exists
    const { data: triggers, error: triggerError } = await supabase
      .rpc('execute_sql', {
        sql_statement: `
          SELECT trigger_name, event_manipulation, action_statement
          FROM information_schema.triggers
          WHERE event_object_table = 'staging_serps'
        `
      });
      
    if (triggerError) {
      log(`Error checking trigger status: ${triggerError.message}`);
      return {
        success: false,
        error: triggerError.message
      };
    }
    
    log('Database triggers on staging_serps table:');
    if (triggers && triggers.length > 0) {
      triggers.forEach(trigger => {
        log(`- ${trigger.trigger_name} (${trigger.event_manipulation})`);
        log(`  Action: ${trigger.action_statement}`);
      });
    } else {
      log('No triggers found on staging_serps table');
      log('This is a critical issue - the automatic processing will not work!');
      
      // Suggest recreating the trigger
      log('\nRecommendation: Recreate the trigger with:');
      log(`
CREATE TRIGGER process_staged_serp_trigger
AFTER INSERT ON staging_serps
FOR EACH ROW
EXECUTE FUNCTION process_staged_serp();
      `);
    }
    
    // Check if the trigger function exists
    const { data: functions, error: functionError } = await supabase
      .rpc('execute_sql', {
        sql_statement: `
          SELECT proname, prosrc
          FROM pg_proc
          WHERE proname = 'process_staged_serp'
        `
      });
      
    if (functionError) {
      log(`Error checking trigger function: ${functionError.message}`);
      return {
        success: false,
        error: functionError.message
      };
    }
    
    log('\nTrigger function details:');
    if (functions && functions.length > 0) {
      log(`- Function name: ${functions[0].proname}`);
      
      // Check if the function has proper logging
      const functionBody = functions[0].prosrc;
      const hasLogging = functionBody.includes('INSERT INTO processing_logs');
      log(`- Has logging: ${hasLogging ? 'Yes' : 'No'}`);
      
      // Check if the function extracts paid ads correctly
      const extractsPaidAds = functionBody.includes('{results,0,content,results,paid}');
      log(`- Extracts paid ads correctly: ${extractsPaidAds ? 'Yes' : 'No'}`);
      
      // Check if the function handles domain extraction
      const handlesDomainExtraction = functionBody.includes('regexp_replace') && functionBody.includes('split_part');
      log(`- Handles domain extraction: ${handlesDomainExtraction ? 'Yes' : 'No'}`);
      
      // Check for common issues
      if (!hasLogging) {
        log('⚠️ Warning: Function does not have proper logging');
      }
      
      if (!extractsPaidAds) {
        log('⚠️ Warning: Function may not extract paid ads correctly');
      }
      
      if (!handlesDomainExtraction) {
        log('⚠️ Warning: Function may not handle domain extraction correctly');
      }
    } else {
      log('No process_staged_serp function found');
      log('This is a critical issue - the trigger will not work without this function!');
    }
    
    // Check for recent trigger executions
    const { data: recentLogs, error: logsError } = await supabase
      .from('processing_logs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(5);
      
    if (logsError) {
      log(`Error checking recent logs: ${logsError.message}`);
    } else if (recentLogs && recentLogs.length > 0) {
      log('\nRecent trigger executions:');
      recentLogs.forEach(log => {
        const timestamp = new Date(log.created_at).toLocaleString();
        log(`- ${timestamp}: ${log.operation} (${log.status})`);
      });
      
      // Check how recent the last log is
      const lastLogTime = new Date(recentLogs[0].created_at);
      const now = new Date();
      const minutesAgo = Math.round((now - lastLogTime) / (1000 * 60));
      
      log(`Last trigger execution was ${minutesAgo} minutes ago`);
      
      if (minutesAgo > 60) {
        log('⚠️ Warning: No recent trigger executions');
      }
    } else {
      log('No recent trigger executions found');
    }
    
    return {
      success: true,
      triggers,
      functions
    };
  } catch (error) {
    log(`Unexpected error debugging trigger: ${error.message}`);
    return {
      success: false,
      error: error.message
    };
  }
}

// Check for any errors in the staging_serps table
async function checkStagingErrors() {
  try {
    const { data, error } = await supabase
      .from('staging_serps')
      .select('id, job_id, query, status, error_message, processed_at, created_at, content')
      .eq('status', 'error')
      .order('processed_at', { ascending: false });
      
    if (error) {
      log(`Error checking staging errors: ${error.message}`);
      return {
        success: false,
        error: error.message
      };
    }
    
    log(`Found ${data.length} staging errors:`);
    
    if (data.length > 0) {
      // Group errors by error message
      const errorGroups = {};
      data.forEach(item => {
        const errorMessage = item.error_message || 'Unknown error';
        if (!errorGroups[errorMessage]) {
          errorGroups[errorMessage] = [];
        }
        errorGroups[errorMessage].push(item);
      });
      
      log('\nError groups:');
      Object.entries(errorGroups).forEach(([errorMessage, items]) => {
        log(`- ${errorMessage} (${items.length} occurrences)`);
        
        // Show details for the first few items
        const samplesToShow = Math.min(items.length, 3);
        log(`  Samples:`);
        for (let i = 0; i < samplesToShow; i++) {
          const item = items[i];
          const processedAt = new Date(item.processed_at).toLocaleString();
          log(`  - Job ${item.job_id} (${item.query}): Processed at ${processedAt}`);
          
          // Check if the content has paid ads
          if (item.content) {
            try {
              const paidAds = item.content.results[0].content.results.paid;
              if (paidAds && paidAds.length > 0) {
                log(`    Found ${paidAds.length} paid ads in content`);
              } else {
                log(`    No paid ads found in content`);
              }
            } catch (e) {
              log(`    Error extracting paid ads from content: ${e.message}`);
            }
          }
        }
        
        // Offer to reprocess one of the items
        if (items.length > 0) {
          log(`  To reprocess one of these items, run:`);
          log(`  node SCRAPI/utils/debug-serp-processing.js reprocess ${items[0].id}`);
        }
      });
      
      // Suggest solutions for common errors
      log('\nSuggested solutions for common errors:');
      log('- "No paid ads found": Try a different query or location that is more likely to have paid ads');
      log('- "Error extracting ads": Check the JSON path in the process_staged_serp function');
      log('- "Error inserting SERP": Check for database constraints or permission issues');
      log('- "Unhandled error": Check the function for syntax errors or missing exception handling');
    } else {
      log('No staging errors found');
    }
    
    return {
      success: true,
      errors: data
    };
  } catch (error) {
    log(`Unexpected error checking staging errors: ${error.message}`);
    return {
      success: false,
      error: error.message
    };
  }
}

// Reset a staging record to pending status
async function resetStagingRecord(stagingId) {
  try {
    log(`Resetting staging record ${stagingId} to pending status...`);
    
    // Update the record
    const { error: updateError } = await supabaseAdmin
      .from('staging_serps')
      .update({
        status: 'pending',
        processed_at: null,
        error_message: null
      })
      .eq('id', stagingId);
      
    if (updateError) {
      log(`❌ Error resetting staging record: ${updateError.message}`);
      return {
        success: false,
        error: updateError.message
      };
    }
    
    log(`✅ Successfully reset staging record ${stagingId} to pending status`);
    return {
      success: true,
      message: `Reset staging record ${stagingId} to pending status`
    };
  } catch (error) {
    log(`❌ Unexpected error resetting staging record: ${error.message}`);
    return {
      success: false,
      error: error.message
    };
  }
}

module.exports = {
  waitForSerpProcessing,
  getProcessingLogs,
  reprocessStagedSerp,
  checkSerpProcessingStatus,
  stageSerpForProcessing,
  debugDatabaseTrigger,
  checkStagingErrors,
  resetStagingRecord,
  log
};