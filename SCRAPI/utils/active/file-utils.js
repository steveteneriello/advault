// file-utils.js - Common file utility functions
const fs = require('fs');
const path = require('path');

// Single output directory for all files
const OUTPUT_DIR = path.join(process.cwd(), 'SCRAPI', 'output-staging');

// Ensure output directory exists
function ensureOutputDirExists() {
  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
    console.log(`Created output directory: ${OUTPUT_DIR}`);
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
    new URL(url);
    return true;
  } catch (err) {
    return false;
  }
}

// Function to save a file to the output directory
function saveToOutput(filename, content) {
  ensureOutputDirExists();
  const filePath = path.join(OUTPUT_DIR, filename);
  fs.writeFileSync(filePath, content);
  console.log(`Saved file to: ${filePath}`);
  return filePath;
}

// Function to get all files of a certain type from output
function getFilesFromOutput(extension) {
  ensureOutputDirExists();
  return fs.readdirSync(OUTPUT_DIR)
    .filter(file => file.endsWith(extension))
    .map(file => ({
      name: file,
      path: path.join(OUTPUT_DIR, file)
    }));
}

// Function to log messages to both console and file
function log(message, logFile = 'scrapi.log') {
  const timestamp = new Date().toISOString();
  const logMessage = `[${timestamp}] ${message}\n`;
  
  console.log(logMessage.trim());
  
  ensureOutputDirExists();
  fs.appendFileSync(path.join(OUTPUT_DIR, logFile), logMessage);
}

module.exports = {
  OUTPUT_DIR,
  ensureOutputDirExists,
  normalizeUrl,
  isValidUrl,
  saveToOutput,
  getFilesFromOutput,
  log
};