// utils/logger.js
const fs = require('fs');
const path = require('path');

// Directory for logs
const LOGS_DIR = path.join(process.cwd(), 'logs');
if (!fs.existsSync(LOGS_DIR)) {
  fs.mkdirSync(LOGS_DIR, { recursive: true });
}

const LOG_FILE = path.join(LOGS_DIR, `log-${new Date().toISOString().replace(/[:.]/g, '-')}.log`);

// Basic logging function
function log(message, data = null) {
  const timestamp = new Date().toISOString();
  let logMessage = `[${timestamp}] ${message}`;
  if (data) {
    logMessage += `\nData: ${JSON.stringify(data, null, 2)}`;
  }
  console.log(logMessage);

  // Append log to the log file
  fs.appendFileSync(LOG_FILE, logMessage + '\n');
}

module.exports = {
  log
};
