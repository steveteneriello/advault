// single-query-workflow.js - Complete workflow for processing single queries
const { spawn } = require('child_process');
const { WorkflowCoordinator } = require('./workflow-coordinator.cjs');
const { getEnvironmentVariables } = require('../config/environment.cjs');
const { DEFAULT_LOCATION } = require('../config/constants.cjs');

class SingleQueryWorkflow extends WorkflowCoordinator {
  constructor() {
    super('single-query');
  }
  
  /**
   * Execute the complete single query workflow
   * @param {string} query - Search query
   * @param {string} location - Location for search
   * @returns {Promise<Object>} - Workflow result
   */
  async execute(query, location = DEFAULT_LOCATION) {
    try {
      // Initialize workflow
      const initialized = await this.initialize();
      if (!initialized) {
        throw new Error('Workflow initialization failed');
      }
      
      // Clean and validate inputs
      const cleanQuery = this.cleanInput(query);
      const cleanLocation = this.cleanInput(location || DEFAULT_LOCATION);
      
      this.logger.info(`Query: "${cleanQuery}"`);
      this.logger.info(`Location: "${cleanLocation}"`);
      
      // Step 1: Run advault automation
      this.startStep('advault-automation', 'Running advault automation process');
      try {
        await this.runCommand('node', [
          'SCRAPI/d-automations/2-advault-process/a-advault-automation-master.js',
          cleanQuery,
          cleanLocation
        ]);
        this.completeStep('advault-automation', { query: cleanQuery, location: cleanLocation });
      } catch (error) {
        this.failStep('advault-automation', error);
        throw error;
      }
      
      // Step 2: Processing delay
      this.startStep('processing-delay', 'Waiting for processing to complete');
      await this.delay(15);
      this.completeStep('processing-delay');
      
      // Step 3: Run SERP automation
      this.startStep('serp-automation', 'Running SERP automation process');
      try {
        await this.runCommand('node', [
          'SCRAPI/d-automations/3-serp-runner/automate-serp.js',
          cleanQuery,
          cleanLocation
        ]);
        this.completeStep('serp-automation', { query: cleanQuery, location: cleanLocation });
      } catch (error) {
        this.failStep('serp-automation', error);
        throw error;
      }
      
      // Complete workflow
      const result = {
        query: cleanQuery,
        location: cleanLocation,
        success: true
      };
      
      return this.complete(result);
      
    } catch (error) {
      return this.fail(error);
    }
  }
  
  /**
   * Clean and validate input strings
   * @param {string} input - Input string to clean
   * @returns {string} - Cleaned input
   */
  cleanInput(input) {
    if (!input || typeof input !== 'string') {
      throw new Error('Invalid input provided');
    }
    
    // Remove surrounding quotes if they exist
    return input.replace(/^"|"$/g, '').trim();
  }
  
  /**
   * Run a command as a child process
   * @param {string} command - Command to run
   * @param {Array} args - Command arguments
   * @returns {Promise} - Promise that resolves when command completes
   */
  runCommand(command, args) {
    return new Promise((resolve, reject) => {
      this.logger.info(`Running command: ${command} ${args.join(' ')}`);
      
      const env = getEnvironmentVariables();
      
      const childProcess = spawn(command, args, { 
        stdio: 'inherit',
        env: env
      });
      
      childProcess.on('close', (code) => {
        if (code === 0) {
          this.logger.info(`Command completed successfully: ${command} ${args.join(' ')}`);
          resolve();
        } else {
          const errorMessage = `Command failed with code ${code}: ${command} ${args.join(' ')}`;
          this.logger.error(errorMessage);
          reject(new Error(errorMessage));
        }
      });
      
      childProcess.on('error', (err) => {
        const errorMessage = `Error running command: ${err.message}`;
        this.logger.error(errorMessage);
        reject(new Error(errorMessage));
      });
    });
  }
  
  /**
   * Parse command line arguments for single query execution
   * @param {Array} args - Command line arguments
   * @returns {Object} - Parsed arguments
   */
  static parseArguments(args) {
    if (args.length === 0) {
      throw new Error('Not enough arguments provided. Usage: <query> [location]');
    }
    
    let query, location;
    
    if (args.length === 1) {
      query = args[0];
      location = DEFAULT_LOCATION;
    } else if (args.length === 2) {
      query = args[0];
      location = args[1];
    } else {
      // More than two arguments, assume first is query and rest is location
      query = args[0];
      location = args.slice(1).join(' ');
    }
    
    return { query, location };
  }
}

module.exports = { SingleQueryWorkflow };
