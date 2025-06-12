// logger.js - Centralized logging system
const fs = require('fs');
const path = require('path');
const { LOGS_DIR } = require('../../config/constants.cjs');

class Logger {
  constructor(componentName = 'scrapi', logLevel = 'info') {
    this.componentName = componentName;
    this.logLevel = logLevel;
    
    // Ensure logs directory exists
    if (!fs.existsSync(LOGS_DIR)) {
      fs.mkdirSync(LOGS_DIR, { recursive: true });
    }
    
    // Create log file path with timestamp
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    this.logFile = path.join(LOGS_DIR, `${componentName}-${timestamp}.log`);
    
    // Log levels
    this.levels = {
      error: 0,
      warn: 1,
      info: 2,
      debug: 3
    };
  }
  
  /**
   * Get timestamp string
   * @returns {string} - ISO timestamp
   */
  getTimestamp() {
    return new Date().toISOString();
  }
  
  /**
   * Format log message
   * @param {string} level - Log level
   * @param {string} message - Log message
   * @returns {string} - Formatted message
   */
  formatMessage(level, message) {
    return `[${this.getTimestamp()}] [${level.toUpperCase()}] [${this.componentName}] ${message}`;
  }
  
  /**
   * Write log to file and console
   * @param {string} level - Log level
   * @param {string} message - Log message
   */
  writeLog(level, message) {
    const formattedMessage = this.formatMessage(level, message);
    
    // Write to console with appropriate method
    switch (level) {
      case 'error':
        console.error(formattedMessage);
        break;
      case 'warn':
        console.warn(formattedMessage);
        break;
      case 'debug':
        if (this.logLevel === 'debug') {
          console.log(formattedMessage);
        }
        break;
      default:
        console.log(formattedMessage);
    }
    
    // Write to file
    fs.appendFileSync(this.logFile, formattedMessage + '\n');
  }
  
  /**
   * Check if log level should be written
   * @param {string} level - Log level to check
   * @returns {boolean} - Whether to log
   */
  shouldLog(level) {
    return this.levels[level] <= this.levels[this.logLevel];
  }
  
  /**
   * Log error message
   * @param {string} message - Error message
   */
  error(message) {
    if (this.shouldLog('error')) {
      this.writeLog('error', message);
    }
  }
  
  /**
   * Log warning message
   * @param {string} message - Warning message
   */
  warn(message) {
    if (this.shouldLog('warn')) {
      this.writeLog('warn', message);
    }
  }
  
  /**
   * Log info message
   * @param {string} message - Info message
   */
  info(message) {
    if (this.shouldLog('info')) {
      this.writeLog('info', message);
    }
  }
  
  /**
   * Log debug message
   * @param {string} message - Debug message
   */
  debug(message) {
    if (this.shouldLog('debug')) {
      this.writeLog('debug', message);
    }
  }
  
  /**
   * Log with custom level
   * @param {string} level - Custom level
   * @param {string} message - Log message
   */
  log(level, message) {
    this.writeLog(level, message);
  }
  
  /**
   * Get log file path
   * @returns {string} - Log file path
   */
  getLogFile() {
    return this.logFile;
  }
}

module.exports = { Logger };
