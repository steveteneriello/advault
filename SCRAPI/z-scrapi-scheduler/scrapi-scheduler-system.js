// SCRAPI/z-scrapi-scheduler/scrapi-scheduler-system.js
// Main system combining all scheduler components
const fs = require('fs');
const path = require('path');
const OxylabsScheduler = require('./oxylabs-scheduler');
const SchedulerConfigManager = require('./scheduler-config-manager');
const SchedulerJobPreparer = require('./scheduler-job-preparer');
const ScheduleTracker = require('./schedule-tracker');
const ScheduleChecker = require('./schedule-checker');
const { submitBatch } = require('../a-job-scheduling/ScrapiBatchAutomation');
const { collectAndProcessAds } = require('../b-collect-and-process-ads');
require('dotenv').config();

class ScrapiSchedulerSystem {
  constructor() {
    console.log('🚀 Initializing SCRAPI Scheduler System');
    
    this.scheduler = new OxylabsScheduler();
    this.configManager = new SchedulerConfigManager();
    this.jobPreparer = new SchedulerJobPreparer();
    this.tracker = new ScheduleTracker();
    this.checker = new ScheduleChecker();
    
    // Flag to track if periodic checking is running
    this.isCheckingPeriodically = false;
    this.checkInterval = null;
  }
  
  // Create a schedule from master queries
  async createScheduleFromMasterQueries(options) {
    const {
      masterQueriesPath, 
      cronExpression, 
      endTime,
      configName = null,
      batchSize = null  // If set, split into batches
    } = options;
    
    console.log('\n🚀 Creating schedule from master queries');
    console.log(`📄 Master queries path: ${masterQueriesPath}`);
    console.log(`⏰ Cron expression: ${cronExpression}`);
    console.log(`📅 End time: ${endTime}`);
    
    // Prepare jobs from master queries
    const prepareResult = this.jobPreparer.prepareFromMasterQueries(masterQueriesPath);
    
    if (!prepareResult.success) {
      console.error(`❌ Failed to prepare jobs: ${prepareResult.error}`);
      return prepareResult;
    }
    
    // Handle batching if requested
    let allSchedules = [];
    
    if (batchSize && batchSize > 0 && prepareResult.items.length > batchSize) {
      // Split into batches and create multiple schedules
      console.log(`📦 Splitting ${prepareResult.items.length} items into batches of ${batchSize}`);
      
      const batches = this.jobPreparer.splitItemsIntoBatches(prepareResult.items, batchSize);
      
      for (let i = 0; i < batches.length; i++) {
        const batchItems = batches[i];
        const batchConfigName = configName ? `${configName}-batch-${i+1}` : null;
        
        console.log(`\n📦 Creating schedule for batch ${i+1} with ${batchItems.length} items`);
        
        // Create a schedule configuration
        const scheduleConfig = this.jobPreparer.createScheduleConfig(
          batchItems,
          cronExpression,
          endTime
        );
        
        // Save configuration if a name is provided
        if (batchConfigName) {
          this.configManager.saveConfig(batchConfigName, scheduleConfig);
          console.log(`💾 Saved batch configuration as '${batchConfigName}'`);
        }
        
        // Create the schedule in Oxylabs
        console.log(`🔄 Creating batch schedule in Oxylabs...`);
        const createResult = await this.scheduler.createSchedule(
          scheduleConfig.cron,
          scheduleConfig.items,
          scheduleConfig.end_time
        );
        
        if (!createResult.success) {
          console.error(`❌ Failed to create batch schedule: ${createResult.error}`);
          // Continue with other batches
          continue;
        }
        
        console.log(`✅ Batch schedule created with ID: ${createResult.scheduleId}`);
        
        // Track the created schedule
        this.tracker.trackSchedule(createResult.scheduleId, {
          configName: batchConfigName,
          masterQueriesPath,
          cronExpression,
          endTime,
          itemCount: batchItems.length,
          batchNumber: i + 1,
          totalBatches: batches.length,
          createdAt: new Date().toISOString()
        });
        
        allSchedules.push({
          scheduleId: createResult.scheduleId,
          batchNumber: i + 1,
          itemCount: batchItems.length
        });
      }
      
      return {
        success: true,
        message: `Created ${allSchedules.length} batch schedules`,
        schedules: allSchedules
      };
      
    } else {
      // Create a single schedule with all items
      
      // Create a schedule configuration
      const scheduleConfig = this.jobPreparer.createScheduleConfig(
        prepareResult.items,
        cronExpression,
        endTime
      );
      
      // Save configuration if a name is provided
      if (configName) {
        this.configManager.saveConfig(configName, scheduleConfig);
        console.log(`💾 Saved configuration as '${configName}'`);
      }
      
      // Create the schedule in Oxylabs
      console.log('🔄 Creating schedule in Oxylabs...');
      const createResult = await this.scheduler.createSchedule(
        scheduleConfig.cron,
        scheduleConfig.items,
        scheduleConfig.end_time
      );
      
      if (!createResult.success) {
        console.error(`❌ Failed to create schedule: ${createResult.error}`);
        return createResult;
      }
      
      console.log(`✅ Schedule created with ID: ${createResult.scheduleId}`);
      
      // Track the created schedule
      this.tracker.trackSchedule(createResult.scheduleId, {
        configName,
        masterQueriesPath,
        cronExpression,
        endTime,
        itemCount: prepareResult.count,
        createdAt: new Date().toISOString()
      });
      
      return {
        success: true,
        scheduleId: createResult.scheduleId,
        itemCount: prepareResult.count
      };
    }
  }
  
  // Create a schedule from custom items
  async createScheduleFromItems(options) {
    const {
      items,
      cronExpression,
      endTime,
      configName = null
    } = options;
    
    console.log('\n🚀 Creating schedule from custom items');
    console.log(`📦 Items count: ${items.length}`);
    console.log(`⏰ Cron expression: ${cronExpression}`);
    console.log(`📅 End time: ${endTime}`);
    
    // Create a schedule configuration
    const scheduleConfig = this.jobPreparer.createScheduleConfig(
      items,
      cronExpression,
      endTime
    );
    
    // Save configuration if a name is provided
    if (configName) {
      this.configManager.saveConfig(configName, scheduleConfig);
      console.log(`💾 Saved configuration as '${configName}'`);
    }
    
    // Create the schedule in Oxylabs
    console.log('🔄 Creating schedule in Oxylabs...');
    const createResult = await this.scheduler.createSchedule(
      scheduleConfig.cron,
      scheduleConfig.items,
      scheduleConfig.end_time
    );
    
    if (!createResult.success) {
      console.error(`❌ Failed to create schedule: ${createResult.error}`);
      return createResult;
    }
    
    console.log(`✅ Schedule created with ID: ${createResult.scheduleId}`);
    
    // Track the created schedule
    this.tracker.trackSchedule(createResult.scheduleId, {
      configName,
      cronExpression,
      endTime,
      itemCount: items.length,
      createdAt: new Date().toISOString()
    });
    
    return {
      success: true,
      scheduleId: createResult.scheduleId,
      itemCount: items.length
    };
  }
  
  // Create a schedule from a saved configuration
  async createScheduleFromConfig(configName) {
    console.log(`\n🚀 Creating schedule from saved configuration: ${configName}`);
    
    // Load the configuration
    const configResult = this.configManager.loadConfig(configName);
    
    if (!configResult.success) {
      console.error(`❌ Failed to load configuration: ${configResult.error}`);
      return configResult;
    }
    
    const config = configResult.config;
    
    // Create the schedule in Oxylabs
    console.log('🔄 Creating schedule in Oxylabs...');
    const createResult = await this.scheduler.createSchedule(
      config.cron,
      config.items,
      config.end_time
    );
    
    if (!createResult.success) {
      console.error(`❌ Failed to create schedule: ${createResult.error}`);
      return createResult;
    }
    
    console.log(`✅ Schedule created with ID: ${createResult.scheduleId}`);
    
    // Track the created schedule
    this.tracker.trackSchedule(createResult.scheduleId, {
      configName,
      cronExpression: config.cron,
      endTime: config.end_time,
      itemCount: config.items.length,
      createdAt: new Date().toISOString()
    });
    
    return {
      success: true,
      scheduleId: createResult.scheduleId,
      itemCount: config.items.length
    };
  }
  
  // Get all schedules from Oxylabs and update local tracking
  async syncSchedules() {
    console.log('\n🔄 Syncing schedules with Oxylabs...');
    
    // Get all schedules from Oxylabs
    const scheduleResult = await this.scheduler.getAllSchedules();
    
    if (!scheduleResult.success) {
      console.error(`❌ Failed to get schedules: ${scheduleResult.error}`);
      return scheduleResult;
    }
    
    const schedules = scheduleResult.schedules || [];
    
    if (schedules.length === 0) {
      console.log('ℹ️ No schedules found in Oxylabs');
      return { 
        success: true, 
        message: "No schedules found" 
      };
    }
    
    console.log(`📋 Found ${schedules.length} schedules in Oxylabs`);
    
    // Get details for each schedule and update local tracking
    const results = [];
    
    for (const scheduleId of schedules) {
      console.log(`\n🔍 Getting details for schedule ${scheduleId}...`);
      
      // Get schedule info from Oxylabs
      const infoResult = await this.scheduler.getScheduleInfo(scheduleId);
      
      if (!infoResult.success) {
        console.error(`❌ Failed to get schedule info: ${infoResult.error}`);
        results.push({
          scheduleId,
          success: false,
          error: infoResult.error
        });
        continue;
      }
      
      const scheduleInfo = infoResult.details;
      
      // Check if we already have this schedule in our tracking
      const trackedResult = this.tracker.getTrackedSchedule(scheduleId);
      
      if (!trackedResult.success) {
        // This is a new schedule, track it
        console.log(`📝 Adding new schedule ${scheduleId} to tracking`);
        
        this.tracker.trackSchedule(scheduleId, {
          synced: true,
          active: scheduleInfo.active,
          itemCount: scheduleInfo.items_count,
          cronExpression: scheduleInfo.cron,
          endTime: scheduleInfo.end_time,
          nextRunAt: scheduleInfo.next_run_at,
          syncedAt: new Date().toISOString()
        });
        
        results.push({
          scheduleId,
          status: 'added',
          active: scheduleInfo.active,
          nextRunAt: scheduleInfo.next_run_at,
          itemCount: scheduleInfo.items_count
        });
      } else {
        // Update existing tracking
        console.log(`✏️ Updating tracking for schedule ${scheduleId}`);
        
        this.tracker.updateTrackedSchedule(scheduleId, {
          synced: true,
          active: scheduleInfo.active,
          itemCount: scheduleInfo.items_count,
          cronExpression: scheduleInfo.cron,
          endTime: scheduleInfo.end_time,
          nextRunAt: scheduleInfo.next_run_at,
          syncedAt: new Date().toISOString()
        });
        
        results.push({
          scheduleId,
          status: 'updated',
          active: scheduleInfo.active,
          nextRunAt: scheduleInfo.next_run_at,
          itemCount: scheduleInfo.items_count
        });
      }
    }
    
    console.log(`✅ Synced ${results.length} schedules`);
    
    return {
      success: true,
      results
    };
  }
  
  // Start periodic checking
  startChecking(interval = 15 * 60 * 1000) { // Default to 15 minutes
    if (this.isCheckingPeriodically) {
      console.log('ℹ️ Periodic checking is already running');
      return {
        success: true,
        message: "Already checking periodically"
      };
    }
    
    console.log(`\n🔄 Starting periodic schedule checks every ${interval / 60000} minutes`);
    
    this.checkInterval = this.checker.startPeriodicCheck(interval);
    this.isCheckingPeriodically = true;
    
    return {
      success: true,
      message: `Started periodic checking every ${interval / 60000} minutes`
    };
  }
  
  // Stop periodic checking
  stopChecking() {
    if (!this.isCheckingPeriodically) {
      console.log('ℹ️ Periodic checking is not running');
      return {
        success: true,
        message: "Not checking periodically"
      };
    }
    
    console.log('\n⏹️ Stopping periodic schedule checks');
    
    clearInterval(this.checkInterval);
    this.isCheckingPeriodically = false;
    
    return {
      success: true,
      message: "Stopped periodic checking"
    };
  }
  
  // Process a specific job from a schedule
  async processJob(jobId, processingMethod = 'basic') {
    console.log(`\n🔄 Processing job ${jobId} using method: ${processingMethod}`);
    
    // Get tracked job info
    const trackedJobResult = this.tracker.getTrackedJob(jobId);
    
    if (!trackedJobResult.success) {
      console.error(`❌ Job ${jobId} not found in tracking`);
      return trackedJobResult;
    }
    
    const jobInfo = trackedJobResult.data;
    
    // Get job results
    console.log(`📂 Loading results for job ${jobId}...`);
    
    const resultsPath = jobInfo.resultPath;
    
    if (!fs.existsSync(resultsPath)) {
      console.error(`❌ Results file not found: ${resultsPath}`);
      return {
        success: false,
        error: `Results file not found: ${resultsPath}`
      };
    }
    
    try {
      const results = JSON.parse(fs.readFileSync(resultsPath, 'utf8'));
      
      // Process based on method
      if (processingMethod === 'basic') {
        // Basic processing, just update tracking
        console.log(`✅ Basic processing completed for job ${jobId}`);
        
        this.tracker.trackJobResult(jobId, jobInfo.scheduleId, 'processed_basic', {
          processingMethod,
          processingTimestamp: new Date().toISOString()
        });
        
        return {
          success: true,
          jobId,
          method: processingMethod
        };
        
      } else if (processingMethod === 'full') {
        // Full processing using collectAndProcessAds
        console.log(`🔄 Performing full processing for job ${jobId}...`);
        
        // Extract query and location from results
        let query = 'unknown';
        let location = 'unknown';
        
        try {
          // Try to extract from results structure
          if (results.job && results.job.source_params) {
            query = results.job.source_params.query || 'unknown';
            location = results.job.source_params.geo_location || 'unknown';
          }
        } catch (error) {
          console.warn(`⚠️ Could not extract query and location from job: ${error.message}`);
        }
        
        console.log(`🔍 Query: ${query}`);
        console.log(`📍 Location: ${location}`);
        
        // Process using collectAndProcessAds
        const processResult = await collectAndProcessAds(query, location, 5);
        
        if (!processResult.success) {
          console.error(`❌ Processing failed: ${processResult.error}`);
          
          this.tracker.trackJobResult(jobId, jobInfo.scheduleId, 'processing_failed', {
            processingMethod,
            processingTimestamp: new Date().toISOString(),
            error: processResult.error
          });
          
          return {
            success: false,
            error: processResult.error
          };
        }
        
        console.log(`✅ Full processing completed for job ${jobId}`);
        console.log(`📊 SERP ID: ${processResult.serpId}`);
        console.log(`📊 Ad Count: ${processResult.adCount}`);
        
        this.tracker.trackJobResult(jobId, jobInfo.scheduleId, 'processed_full', {
          processingMethod,
          processingTimestamp: new Date().toISOString(),
          serpId: processResult.serpId,
          adCount: processResult.adCount
        });
        
        return {
          success: true,
          jobId,
          method: processingMethod,
          serpId: processResult.serpId,
          adCount: processResult.adCount
        };
      } else {
        console.error(`❌ Unknown processing method: ${processingMethod}`);
        return {
          success: false,
          error: `Unknown processing method: ${processingMethod}`
        };
      }
      
    } catch (error) {
      console.error(`❌ Error processing job ${jobId}: ${error.message}`);
      return {
        success: false,
        error: error.message
      };
    }
  }
  
  // Get a summary of all tracked schedules
  async getSchedulesSummary() {
    console.log('\n📊 Getting summary of all tracked schedules...');
    
    // Get all tracked schedules
    const trackedResult = this.tracker.listTrackedSchedules();
    
    if (!trackedResult.success) {
      console.error(`❌ Failed to list tracked schedules: ${trackedResult.error}`);
      return trackedResult;
    }
    
    const schedules = trackedResult.schedules;
    
    if (schedules.length === 0) {
      console.log('ℹ️ No tracked schedules found');
      return { 
        success: true, 
        schedules: [] 
      };
    }
    
    // Get current info from Oxylabs for each schedule
    const scheduleSummaries = [];
    
    for (const schedule of schedules) {
      const scheduleId = schedule.id;
      
      // Get schedule info from Oxylabs
      const infoResult = await this.scheduler.getScheduleInfo(scheduleId);
      
      let oxylabsInfo = null;
      if (infoResult.success) {
        oxylabsInfo = infoResult.details;
      }
      
      // Get jobs for this schedule
      const jobsResult = this.tracker.listScheduleJobs(scheduleId);
      const jobs = jobsResult.success ? jobsResult.jobs : [];
      
      // Calculate job stats
      const jobStats = {
        total: jobs.length,
        processed: jobs.filter(job => job.status.includes('processed')).length,
        errors: jobs.filter(job => job.status === 'error').length
      };
      
      scheduleSummaries.push({
        id: scheduleId,
        tracking: schedule,
        oxylabs: oxylabsInfo,
        jobs: jobStats,
        active: oxylabsInfo ? oxylabsInfo.active : schedule.active || false,
        nextRunAt: oxylabsInfo ? oxylabsInfo.next_run_at : schedule.nextRunAt
      });
    }
    
    console.log(`📋 Generated summary for ${scheduleSummaries.length} schedules`);
    
    return {
      success: true,
      schedules: scheduleSummaries
    };
  }
}

module.exports = ScrapiSchedulerSystem;