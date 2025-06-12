// job-directory-manager.js - Simplified job output management
const fs = require('fs');
const path = require('path');
const { OUTPUT_DIR } = require('./file-utils.cjs');

/**
 * Get job-specific directories
 * @param {string} jobId - The job ID
 * @returns {Object} - Object containing the paths for the job's directories
 */
function getJobDirectories(jobId) {
  const jobDir = path.join(process.cwd(), 'SCRAPI', 'output-staging', 'jobs', jobId);
  const scraperResultsDir = path.join(jobDir, 'scraper-results');

  // Ensure the directory structure exists
  if (!fs.existsSync(scraperResultsDir)) {
    fs.mkdirSync(scraperResultsDir, { recursive: true });
  }

  return {
    jobDir,
    'scraper-results': scraperResultsDir
  };
}

/**
 * Get job-specific filename
 * @param {string} jobId - The job ID
 * @param {string} filename - The base filename
 * @returns {string} - The job-specific filename
 */
function getJobFilename(jobId, filename) {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const prefix = jobId ? `${jobId}-` : '';
  return `${prefix}${filename}-${timestamp}`;
}

/**
 * Save a file with job context
 * @param {string} jobId - The job ID
 * @param {string} filename - The base filename
 * @param {string|Buffer} content - The file content
 * @returns {string} - The saved file path
 */
function saveJobFile(jobId, filename, content) {
  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  }
  
  const jobFilename = getJobFilename(jobId, filename);
  const filePath = path.join(OUTPUT_DIR, jobFilename);
  
  fs.writeFileSync(filePath, content);
  console.log(`Saved file: ${filePath}`);
  
  return filePath;
}

/**
 * Get all files for a job
 * @param {string} jobId - The job ID
 * @returns {Array} - Array of file paths
 */
function getJobFiles(jobId) {
  if (!fs.existsSync(OUTPUT_DIR)) {
    return [];
  }
  
  return fs.readdirSync(OUTPUT_DIR)
    .filter(file => file.startsWith(jobId))
    .map(file => path.join(OUTPUT_DIR, file));
}

module.exports = {
  getJobDirectories,
  getJobFilename,
  saveJobFile,
  getJobFiles
};
