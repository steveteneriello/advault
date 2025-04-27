// SCRAPI/z-scrapi-scheduler/schedule-tracker.js
// Tracks and monitors schedule execution
const fs = require('fs');
const path = require('path');

class ScheduleTracker {
  constructor(trackingDir = path.join(process.cwd(), 'SCRAPI', 'z-scrapi-scheduler', 'tracking')) {
    this.trackingDir = trackingDir;
    if (!fs.existsSync(this.trackingDir)) {
      fs.mkdirSync(this.trackingDir, { recursive: true });
      console.log(`📁 Created scheduler tracking directory: ${this.trackingDir}`);
    }
    
    // Create logs directory
    this.logsDir = path.join(trackingDir, 'logs');
    if (!fs.existsSync(this.logsDir)) {
      fs.mkdirSync(this.logsDir, { recursive: true });
    }
    
    // Create jobs directory for tracking job results
    this.jobsDir = path.join(trackingDir, 'jobs');
    if (!fs.existsSync(this.jobsDir)) {
      fs.mkdirSync(this.jobsDir, { recursive: true });
    }
  }
  
  // Track a new schedule
  trackSchedule(scheduleId, metadata) {
    const trackingPath = path.join(this.trackingDir, `${scheduleId}.json`);
    
    // Add tracking timestamp
    const trackingData = {
      ...metadata,
      trackedAt: new Date().toISOString(),
      lastChecked: null,
      lastRun: null,
      runHistory: []
    };
    
    fs.writeFileSync(trackingPath, JSON.stringify(trackingData, null, 2));
    console.log(`📝 Tracked schedule ${scheduleId}`);
    
    return { success: true, scheduleId };
  }
  
  // Get information about a tracked schedule
  getTrackedSchedule(scheduleId) {
    const trackingPath = path.join(this.trackingDir, `${scheduleId}.json`);
    
    if (!fs.existsSync(trackingPath)) {
      console.error(`❌ No tracking data found for schedule ${scheduleId}`);
      return { success: false, error: `No tracking data found for schedule ${scheduleId}` };
    }
    
    try {
      const data = JSON.parse(fs.readFileSync(trackingPath, 'utf8'));
      return { success: true, data };
    } catch (error) {
      console.error(`❌ Error reading tracking data for schedule ${scheduleId}: ${error.message}`);
      return { success: false, error: `Error reading tracking data: ${error.message}` };
    }
  }
  
  // Update tracking information for a schedule
  updateTrackedSchedule(scheduleId, updates) {
    const result = this.getTrackedSchedule(scheduleId);
    
    if (!result.success) {
      return result;
    }
    
    const trackingPath = path.join(this.trackingDir, `${scheduleId}.json`);
    const updatedData = { ...result.data, ...updates, lastChecked: new Date().toISOString() };
    
    fs.writeFileSync(trackingPath, JSON.stringify(updatedData, null, 2));
    console.log(`✏️ Updated tracking data for schedule ${scheduleId}`);
    
    return { success: true, data: updatedData };
  }
  
  // Record a run for a schedule
  recordScheduleRun(scheduleId, runData) {
    const result = this.getTrackedSchedule(scheduleId);
    
    if (!result.success) {
      return result;
    }
    
    const trackingPath = path.join(this.trackingDir, `${scheduleId}.json`);
    const currentData = result.data;
    
    // Add run to history
    const runEntry = {
      timestamp: new Date().toISOString(),
      ...runData
    };
    
    // Add to beginning of array for most recent first
    currentData.runHistory.unshift(runEntry);
    
    // Keep only last 20 runs
    if (currentData.runHistory.length > 20) {
      currentData.runHistory = currentData.runHistory.slice(0, 20);
    }
    
    // Update last run
    currentData.lastRun = runEntry.timestamp;
    currentData.lastChecked = runEntry.timestamp;
    
    fs.writeFileSync(trackingPath, JSON.stringify(currentData, null, 2));
    console.log(`📊 Recorded run for schedule ${scheduleId}`);
    
    return { success: true, data: currentData };
  }
  
  // List all tracked schedules
  listTrackedSchedules() {
    if (!fs.existsSync(this.trackingDir)) {
      console.log(`📁 Tracking directory doesn't exist yet: ${this.trackingDir}`);
      return { success: true, schedules: [] };
    }
    
    try {
      const files = fs.readdirSync(this.trackingDir);
      const schedules = [];
      
      for (const file of files) {
        // Skip directories
        if (!file.endsWith('.json')) continue;
        
        const scheduleId = file.replace('.json', '');
        const result = this.getTrackedSchedule(scheduleId);
        
        if (result.success) {
          schedules.push({
            id: scheduleId,
            ...result.data
          });
        }
      }
      
      console.log(`📋 Found ${schedules.length} tracked schedules`);
      return { success: true, schedules };
    } catch (error) {
      console.error(`❌ Error listing tracked schedules: ${error.message}`);
      return { success: false, error: `Error listing tracked schedules: ${error.message}` };
    }
  }
  
  // Log schedule check activity
  logScheduleCheck(message, data = {}) {
    const timestamp = new Date().toISOString();
    const logEntry = {
      timestamp,
      message,
      ...data
    };
    
    // Create a log file for today
    const today = new Date().toISOString().split('T')[0];
    const logFile = path.join(this.logsDir, `schedule-check-${today}.log`);
    
    const logLine = JSON.stringify(logEntry) + '\n';
    fs.appendFileSync(logFile, logLine);
    
    return { success: true };
  }
  
  // Track results of a job from a schedule
  trackJobResult(jobId, scheduleId, status, data = {}) {
    const jobPath = path.join(this.jobsDir, `${jobId}.json`);
    
    const jobData = {
      jobId,
      scheduleId,
      status,
      createdAt: new Date().toISOString(),
      ...data
    };
    
    fs.writeFileSync(jobPath, JSON.stringify(jobData, null, 2));
    console.log(`📝 Tracked job ${jobId} from schedule ${scheduleId}`);
    
    return { success: true, jobId };
  }
  
  // Get information about a tracked job
  getTrackedJob(jobId) {
    const jobPath = path.join(this.jobsDir, `${jobId}.json`);
    
    if (!fs.existsSync(jobPath)) {
      console.error(`❌ No tracking data found for job ${jobId}`);
      return { success: false, error: `No tracking data found for job ${jobId}` };
    }
    
    try {
      const data = JSON.parse(fs.readFileSync(jobPath, 'utf8'));
      return { success: true, data };
    } catch (error) {
      console.error(`❌ Error reading tracking data for job ${jobId}: ${error.message}`);
      return { success: false, error: `Error reading tracking data: ${error.message}` };
    }
  }
  
  // List all jobs for a schedule
  listScheduleJobs(scheduleId) {
    if (!fs.existsSync(this.jobsDir)) {
      console.log(`📁 Jobs directory doesn't exist yet: ${this.jobsDir}`);
      return { success: true, jobs: [] };
    }
    
    try {
      const files = fs.readdirSync(this.jobsDir);
      const jobs = [];
      
      for (const file of files) {
        if (!file.endsWith('.json')) continue;
        
        const jobId = file.replace('.json', '');
        const result = this.getTrackedJob(jobId);
        
        if (result.success && result.data.scheduleId === scheduleId) {
          jobs.push(result.data);
        }
      }
      
      console.log(`📋 Found ${jobs.length} jobs for schedule ${scheduleId}`);
      return { success: true, jobs };
    } catch (error) {
      console.error(`❌ Error listing jobs for schedule ${scheduleId}: ${error.message}`);
      return { success: false, error: `Error listing jobs: ${error.message}` };
    }
  }
}

module.exports = ScheduleTracker;