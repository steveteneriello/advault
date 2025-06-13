// Server logger
const fs = require('fs');
const path = require('path');

// Create logs directory if it doesn't exist
const logsDir = path.join(__dirname, '..', '..', 'logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

/**
 * Logger class for server-side logging
 */
class Logger {
  constructor(component) {
    this.component = component;
    this.logFile = path.join(logsDir, `${component}-${new Date().toISOString().split('T')[0]}.log`);
  }
  
  /**
   * Log a message with a specific level
   * @param {string} level - Log level
   * @param {string} message - Log message
   * @param {Object} data - Additional data to log
   */
  log(level, message, data = null) {
    const timestamp = new Date().toISOString();
    let logMessage = `[${timestamp}] [${level.toUpperCase()}] [${this.component}] ${message}`;
    
    if (data) {
      logMessage += `\nData: ${JSON.stringify(data, null, 2)}`;
    }
    
    // Log to console
    switch (level) {
      case 'error':
        console.error(logMessage);
        break;
      case 'warn':
        console.warn(logMessage);
        break;
      case 'info':
        console.info(logMessage);
        break;
      case 'debug':
        console.debug(logMessage);
        break;
      default:
        console.log(logMessage);
    }
    
    // Log to file
    fs.appendFileSync(this.logFile, logMessage + '\n');
    
    // Log to database if needed
    this.logToDatabase(level, message, data);
  }
  
  /**
   * Log to database
   * @param {string} level - Log level
   * @param {string} message - Log message
   * @param {Object} data - Additional data to log
   */
  async logToDatabase(level, message, data) {
    // This is a placeholder for database logging
    // In a real implementation, this would insert a log record into the database
  }
  
  /**
   * Log an info message
   * @param {string} message - Log message
   * @param {Object} data - Additional data to log
   */
  info(message, data = null) {
    this.log('info', message, data);
  }
  
  /**
   * Log a warning message
   * @param {string} message - Log message
   * @param {Object} data - Additional data to log
   */
  warn(message, data = null) {
    this.log('warn', message, data);
  }
  
  /**
   * Log an error message
   * @param {string} message - Log message
   * @param {Object} data - Additional data to log
   */
  error(message, data = null) {
    this.log('error', message, data);
  }
  
  /**
   * Log a debug message
   * @param {string} message - Log message
   * @param {Object} data - Additional data to log
   */
  debug(message, data = null) {
    this.log('debug', message, data);
  }
}

module.exports = Logger;