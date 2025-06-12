// constants.js - System constants
const path = require('path');

// Base directories
const SCRAPI_ROOT = path.join(process.cwd(), 'SCRAPI');
const DATA_DIR = path.join(SCRAPI_ROOT, 'data');
const OUTPUT_DIR = path.join(DATA_DIR, 'output');
const STAGING_DIR = path.join(DATA_DIR, 'staging');
const ARCHIVE_DIR = path.join(DATA_DIR, 'archive');

// Specific data directories
const SCRAPER_RESULTS_DIR = path.join(STAGING_DIR, 'scraper-results');
const LOGS_DIR = path.join(STAGING_DIR, 'logs');
const REPORTS_DIR = path.join(OUTPUT_DIR, 'reports');
const RENDERINGS_DIR = path.join(OUTPUT_DIR, 'renderings');

// Job management
const BATCH_FILES = {
  submitted: path.join(SCRAPI_ROOT, 'a-job-scheduling', 'batch-submitted.json'),
  inProgress: path.join(SCRAPI_ROOT, 'a-job-scheduling', 'batch-in-progress.json'),
  completed: path.join(SCRAPI_ROOT, 'a-job-scheduling', 'batch-completed.json')
};

// Processing settings
const DEFAULT_SETTINGS = {
  maxAdsToRender: 5,
  renderHtml: true,
  renderPng: true,
  generateReport: true,
  maxFileAgeDays: 7,
  batchSize: 10,
  batchDelaySeconds: 30,
  processingTimeoutMs: 300000 // 5 minutes
};

// Default locations
const DEFAULT_LOCATION = "Boston, Massachusetts, United States";

// File patterns
const FILE_PATTERNS = {
  scraperResults: /^\d+-[a-f0-9-]+-scraper-results\.json$/,
  logs: /^scrapi-.*\.log$/,
  reports: /^.*-report\.(json|csv|html)$/,
  renderings: /^.*\.(png|html)$/
};

module.exports = {
  // Directories
  SCRAPI_ROOT,
  DATA_DIR,
  OUTPUT_DIR,
  STAGING_DIR,
  ARCHIVE_DIR,
  SCRAPER_RESULTS_DIR,
  LOGS_DIR,
  REPORTS_DIR,
  RENDERINGS_DIR,
  
  // Batch files
  BATCH_FILES,
  
  // Settings
  DEFAULT_SETTINGS,
  DEFAULT_LOCATION,
  
  // Patterns
  FILE_PATTERNS
};
