// SCRAPI/z-scrapi-scheduler/schedule-checker.js
// Periodically checks schedules and processes new results
const fs = require('fs');
const path = require('path');
const OxylabsScheduler = require('./oxylabs-scheduler');
const ScheduleTracker = require('./schedule-tracker');
const { getJobResultsEnhanced } = require('../../../utils/connection-helper');
const { validateOxylabsConfig, getOxylabsConfig } = require('../../../utils/validateOxylabsConfig');
require('dotenv').config();

class ScheduleChecker {
  constructor() {
    this.scheduler = new OxylabsScheduler();
    this.tracker = new ScheduleTracker();
    
    // Get Oxylabs configuration
    const oxylabsConfig = getOxylabsConfig();
    this.username = oxylabsConfig.username;
    this.password = oxylabsConfig.password;
    
    // Create results directory
    this.resultsDir = path.join(process.cwd(), 'SCRAPI', 'z-scrapi-scheduler', 'results');
    if (!fs.existsSync(this.resultsDir)) {
      fs.mkdirSync(this.resultsDir, { recursive: true });
      console.log(`📁 Created scheduler results directory: ${this.resultsDir}`);
    }
  }
  
  // Check a specific schedule for new results
  async checkSchedule(scheduleId) {
    console.log(`\n🔍 Checking schedule ${scheduleId} for new results...`);
    
    // Log the check
    this.tracker.logScheduleCheck(`Checking schedule ${scheduleId}`, { scheduleId });
    
    try {
      // Get schedule info from Oxylabs
      const scheduleResult = await this.scheduler.getScheduleInfo(scheduleId);
      
      if (!scheduleResult.success) {
        console.error(`❌ Failed to get schedule info: ${scheduleResult.error}`);
        return scheduleResult;
      }
      
      const scheduleInfo = scheduleResult.details;
      
      // Get tracked schedule info
      const trackedResult = this.tracker.getTrackedSchedule(scheduleId);
      
      // Update tracking data with latest info from API
      if (trackedResult.success) {
        this.tracker.updateTrackedSchedule(scheduleId, {
          active: scheduleInfo.active,
          nextRunAt: scheduleInfo.next_run_at,
          itemsCount: scheduleInfo.items_count
        });
      }
      
      // Get runs for this schedule
      const runsResult = await this.scheduler.getScheduleRuns(scheduleId);
      
      if (!runsResult.success) {
        console.error(`❌ Failed to get schedule runs: ${runsResult.error}`);
        return runsResult;
      }
      
      const runs = runsResult.runs || [];
      
      if (runs.length === 0) {
        console.log(`ℹ️ No runs found for schedule ${scheduleId}`);
        return { 
          success: true, 
          scheduleId, 
          message: "No runs found" 
        };
      }
      
      // Get jobs from the latest run
      const latestRun = runs[0];
      console.log(`📊 Found latest run with ID: ${latestRun.run_id}`);
      
      // Record this run
      this.tracker.recordScheduleRun(scheduleId, {
        runId: latestRun.run_id,
        jobCount: latestRun.jobs.length,
        successRate: latestRun.success_rate
      });
      
      // Process jobs from this run
      console.log(`🔄 Processing ${latestRun.jobs.length} jobs from run ${latestRun.run_id}`);
      
      const processedJobs = [];
      
      for (const job of latestRun.jobs) {
        // Check if we've already processed this job
        const trackedJobResult = this.tracker.getTrackedJob(job.id);
        
        if (trackedJobResult.success) {
          console.log(`ℹ️ Job ${job.id} already processed, skipping`);
          processedJobs.push({
            jobId: job.id,
            status: 'already_processed'
          });
          continue;
        }
        
        // Only process jobs that are done
        if (job.result_status !== 'done') {
          console.log(`ℹ️ Job ${job.id} not done yet (status: ${job.result_status}), skipping`);
          processedJobs.push({
            jobId: job.id,
            status: 'not_done',
            resultStatus: job.result_status
          });
          continue;
        }
        
        console.log(`🔄 Processing job ${job.id}...`);
        
        try {
          // Get job results
          const jobResults = await getJobResultsEnhanced(job.id, {
            username: this.username,
            password: this.password,
            maxAttempts: 3,
            baseDelay: 1000,
            timeout: 30000
          });
          
          // Save results to file
          const resultsPath = path.join(this.resultsDir, `job-${job.id}.json`);
          fs.writeFileSync(resultsPath, JSON.stringify(jobResults, null, 2));
          
          console.log(`✅ Saved results for job ${job.id} to ${resultsPath}`);
          
          // Track this job
          this.tracker.trackJobResult(job.id, scheduleId, 'processed', {
            resultPath: resultsPath,
            createdAt: job.created_at,
            resultCreatedAt: job.result_created_at
          });
          
          processedJobs.push({
            jobId: job.id,
            status: 'processed',
            resultPath: resultsPath
          });
          
        } catch (error) {
          console.error(`❌ Error processing job ${job.id}: ${error.message}`);
          
          // Track the error
          this.tracker.trackJobResult(job.id, scheduleId, 'error', {
            error: error.message,
            createdAt: job.created_at,
            resultCreatedAt: job.result_created_at
          });
          
          processedJobs.push({
            jobId: job.id,
            status: 'error',
            error: error.message
          });
        }
      }
      
      console.log(`✅ Finished checking schedule ${scheduleId}`);
      
      return {
        success: true,
        scheduleId,
        runId: latestRun.run_id,
        processedJobs
      };
      
    } catch (error) {
      console.error(`❌ Error checking schedule ${scheduleId}: ${error.message}`);
      return {
        success: false,
        error: error.message
      };
    }
  }
  
  // Check all tracked schedules
  async checkAllSchedules() {
    console.log('\n🔍 Checking all tracked schedules...');
    
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
        message: "No tracked schedules found" 
      };
    }
    
    console.log(`📋 Found ${schedules.length} tracked schedules`);
    
    const results = [];
    
    for (const schedule of schedules) {
      const result = await this.checkSchedule(schedule.id);
      results.push(result);
    }
    
    console.log(`✅ Finished checking ${schedules.length} schedules`);
    
    return {
      success: true,
      results
    };
  }
  
  // Start a periodic check
  startPeriodicCheck(interval = 15 * 60 * 1000) { // Default to 15 minutes
    console.log(`🔄 Starting periodic schedule checks every ${interval / 60000} minutes`);
    
    // Do an initial check
    this.checkAllSchedules();
    
    // Set up interval
    const checkInterval = setInterval(() => {
      this.checkAllSchedules();
    }, interval);
    
    // Return the interval so it can be stopped if needed
    return checkInterval;
  }
  
  // Process results from a specific job
  async processJobResults(jobId) {
    console.log(`\n🔄 Processing results for job ${jobId}...`);
    
    // Check if we have the results file
    const resultPath = path.join(this.resultsDir, `job-${jobId}.json`);
    
    if (!fs.existsSync(resultPath)) {
      console.error(`❌ Results file not found for job ${jobId}`);
      return {
        success: false,
        error: `Results file not found for job ${jobId}`
      };
    }
    
    try {
      // Load results
      const results = JSON.parse(fs.readFileSync(resultPath, 'utf8'));
      
      // Here you would implement your processing logic
      // For now, we'll just return that we've loaded the results
      
      console.log(`✅ Loaded results for job ${jobId}`);
      
      // Get tracked job info
      const trackedJobResult = this.tracker.getTrackedJob(jobId);
      
      if (trackedJobResult.success) {
        // Update job status
        this.tracker.trackJobResult(jobId, trackedJobResult.data.scheduleId, 'processed_further', {
          processingTimestamp: new Date().toISOString()
        });
      }
      
      return {
        success: true,
        jobId,
        resultPath
      };
      
    } catch (error) {
      console.error(`❌ Error processing results for job ${jobId}: ${error.message}`);
      return {
        success: false,
        error: error.message
      };
    }
  }
}

module.exports = ScheduleChecker;