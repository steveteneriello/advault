// error-handlers.js - Common error handling utilities
const { Logger } = require('../logging/logger.cjs');

class ErrorHandler {
  constructor(componentName = 'scrapi') {
    this.logger = new Logger(componentName + '-errors');
  }
  
  /**
   * Handle and log errors with context
   * @param {Error} error - Error object
   * @param {Object} context - Additional context information
   * @param {boolean} fatal - Whether error is fatal (should exit process)
   */
  handleError(error, context = {}, fatal = false) {
    const errorInfo = {
      message: error.message,
      stack: error.stack,
      timestamp: new Date().toISOString(),
      context
    };
    
    this.logger.error(`Error occurred: ${error.message}`);
    
    if (context.operation) {
      this.logger.error(`Operation: ${context.operation}`);
    }
    
    if (context.data) {
      this.logger.error(`Data: ${JSON.stringify(context.data, null, 2)}`);
    }
    
    if (process.env.NODE_ENV === 'development') {
      this.logger.error(`Stack trace: ${error.stack}`);
    }
    
    if (fatal) {
      this.logger.error('Fatal error - exiting process');
      process.exit(1);
    }
    
    return errorInfo;
  }
  
  /**
   * Handle validation errors
   * @param {Array} errors - Array of validation error messages
   * @param {string} operation - Operation being validated
   * @param {boolean} fatal - Whether to exit on validation failure
   */
  handleValidationErrors(errors, operation = 'validation', fatal = true) {
    this.logger.error(`❌ ${operation} failed:`);
    errors.forEach(error => this.logger.error(`- ${error}`));
    
    if (fatal) {
      process.exit(1);
    }
  }
  
  /**
   * Handle command execution errors
   * @param {Error} error - Command error
   * @param {string} command - Command that failed
   * @param {Array} args - Command arguments
   */
  handleCommandError(error, command, args = []) {
    const context = {
      operation: 'command_execution',
      data: {
        command,
        args,
        exitCode: error.code
      }
    };
    
    return this.handleError(error, context);
  }
  
  /**
   * Handle file operation errors
   * @param {Error} error - File operation error
   * @param {string} operation - File operation type
   * @param {string} filePath - File path involved
   */
  handleFileError(error, operation, filePath) {
    const context = {
      operation: `file_${operation}`,
      data: {
        filePath,
        operation
      }
    };
    
    return this.handleError(error, context);
  }
  
  /**
   * Handle network/API errors
   * @param {Error} error - Network error
   * @param {string} endpoint - API endpoint
   * @param {Object} requestData - Request data
   */
  handleNetworkError(error, endpoint, requestData = {}) {
    const context = {
      operation: 'network_request',
      data: {
        endpoint,
        requestData,
        statusCode: error.response?.status,
        responseData: error.response?.data
      }
    };
    
    return this.handleError(error, context);
  }
  
  /**
   * Create a retry wrapper for operations
   * @param {Function} operation - Operation to retry
   * @param {number} maxRetries - Maximum number of retries
   * @param {number} delayMs - Delay between retries in milliseconds
   * @returns {Function} - Wrapped function with retry logic
   */
  withRetry(operation, maxRetries = 3, delayMs = 1000) {
    return async (...args) => {
      let lastError;
      
      for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
          return await operation(...args);
        } catch (error) {
          lastError = error;
          
          if (attempt < maxRetries) {
            this.logger.warn(`Attempt ${attempt} failed, retrying in ${delayMs}ms: ${error.message}`);
            await new Promise(resolve => setTimeout(resolve, delayMs));
          } else {
            this.logger.error(`All ${maxRetries} attempts failed`);
          }
        }
      }
      
      throw lastError;
    };
  }
}

/**
 * Create a global error handler for uncaught exceptions
 * @param {string} componentName - Component name for logging
 */
function setupGlobalErrorHandlers(componentName = 'scrapi') {
  const errorHandler = new ErrorHandler(componentName);
  
  process.on('uncaughtException', (error) => {
    errorHandler.handleError(error, { 
      operation: 'uncaught_exception',
      fatal: true 
    }, true);
  });
  
  process.on('unhandledRejection', (reason, promise) => {
    const error = reason instanceof Error ? reason : new Error(String(reason));
    errorHandler.handleError(error, { 
      operation: 'unhandled_rejection',
      promise: promise.toString()
    }, true);
  });
}

module.exports = {
  ErrorHandler,
  setupGlobalErrorHandlers
};
