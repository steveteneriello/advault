// batch-workflow.js - Complete workflow for batch processing
const fs = require('fs');
const path = require('path');
const { WorkflowCoordinator } = require('./workflow-coordinator.cjs');
const { getEnvironmentVariables } = require('../config/environment.cjs');
const { BATCH_FILES, DEFAULT_SETTINGS } = require('../config/constants.cjs');

class BatchWorkflow extends WorkflowCoordinator {
  constructor() {
    super('batch-processing');
    this.batchSize = DEFAULT_SETTINGS.batchSize;
    this.delaySeconds = DEFAULT_SETTINGS.batchDelaySeconds;
  }
  
  /**
   * Execute batch workflow from master queries file
   * @param {string} queriesFile - Path to queries JSON file
   * @param {Object} options - Batch processing options
   * @returns {Promise<Object>} - Workflow result
   */
  async execute(queriesFile, options = {}) {
    try {
      // Initialize workflow
      const initialized = await this.initialize();
      if (!initialized) {
        throw new Error('Workflow initialization failed');
      }
      
      // Apply options
      this.batchSize = options.batchSize || this.batchSize;
      this.delaySeconds = options.delaySeconds || this.delaySeconds;
      
      // Step 1: Load and validate queries
      this.startStep('load-queries', 'Loading queries from file');
      let queries;
      try {
        queries = this.loadQueries(queriesFile);
        this.completeStep('load-queries', { 
          totalQueries: queries.length,
          file: queriesFile 
        });
      } catch (error) {
        this.failStep('load-queries', error);
        throw error;
      }
      
      // Step 2: Submit batch jobs
      this.startStep('submit-batches', 'Submitting queries in batches');
      let submittedJobs;
      try {
        submittedJobs = await this.submitBatches(queries);
        this.completeStep('submit-batches', {
          totalJobs: submittedJobs.length,
          batches: Math.ceil(queries.length / this.batchSize)
        });
      } catch (error) {
        this.failStep('submit-batches', error);
        throw error;
      }
      
      // Step 3: Save submitted jobs
      this.startStep('save-jobs', 'Saving submitted job information');
      try {
        this.saveSubmittedJobs(submittedJobs);
        this.completeStep('save-jobs', { jobsFile: BATCH_FILES.submitted });
      } catch (error) {
        this.failStep('save-jobs', error);
        throw error;
      }
      
      // Complete workflow
      const result = {
        totalQueries: queries.length,
        submittedJobs: submittedJobs.length,
        batchSize: this.batchSize,
        success: true
      };
      
      return this.complete(result);
      
    } catch (error) {
      return this.fail(error);
    }
  }
  
  /**
   * Load queries from JSON file
   * @param {string} queriesFile - Path to queries file
   * @returns {Array} - Array of query objects
   */
  loadQueries(queriesFile) {
    if (!fs.existsSync(queriesFile)) {
      throw new Error(`Queries file not found: ${queriesFile}`);
    }
    
    const content = fs.readFileSync(queriesFile, 'utf8');
    const data = JSON.parse(content);
    
    // Handle different file formats
    let queries = [];
    if (Array.isArray(data)) {
      queries = data;
    } else if (data.queries && Array.isArray(data.queries)) {
      queries = data.queries;
    } else {
      throw new Error('Invalid queries file format');
    }
    
    // Validate query format
    queries.forEach((query, index) => {
      if (!query.query || !query.location) {
        throw new Error(`Invalid query at index ${index}: missing query or location`);
      }
    });
    
    this.logger.info(`Loaded ${queries.length} queries from ${queriesFile}`);
    return queries;
  }
  
  /**
   * Submit queries in batches with delays
   * @param {Array} queries - Array of query objects
   * @returns {Promise<Array>} - Array of submitted job information
   */
  async submitBatches(queries) {
    const submittedJobs = [];
    const batches = this.chunkArray(queries, this.batchSize);
    
    this.logger.info(`Submitting ${queries.length} queries in ${batches.length} batches of ${this.batchSize}`);
    
    for (let i = 0; i < batches.length; i++) {
      const batch = batches[i];
      this.logger.info(`Processing batch ${i + 1}/${batches.length} (${batch.length} queries)`);
      
      // Submit batch using existing batch automation
      try {
        const batchResult = await this.submitSingleBatch(batch, i);
        submittedJobs.push(...batchResult);
        
        // Add delay between batches (except for the last one)
        if (i < batches.length - 1) {
          this.logger.info(`Waiting ${this.delaySeconds} seconds before next batch...`);
          await this.delay(this.delaySeconds);
        }
        
      } catch (error) {
        this.logger.error(`Failed to submit batch ${i + 1}: ${error.message}`);
        throw error;
      }
    }
    
    return submittedJobs;
  }
  
  /**
   * Submit a single batch of queries
   * @param {Array} batch - Batch of queries
   * @param {number} batchIndex - Index of the batch
   * @returns {Promise<Array>} - Submitted job information
   */
  async submitSingleBatch(batch, batchIndex) {
    // This would integrate with the existing batch submission logic
    // For now, return mock data - this should be replaced with actual Oxylabs API calls
    const submittedJobs = batch.map((query, index) => ({
      id: `batch-${batchIndex}-${index}-${Date.now()}`,
      query: query.query,
      location: query.location,
      submittedAt: new Date().toISOString(),
      status: 'submitted',
      batchIndex,
      queryIndex: index
    }));
    
    this.logger.info(`Submitted ${submittedJobs.length} jobs in batch ${batchIndex + 1}`);
    return submittedJobs;
  }
  
  /**
   * Save submitted jobs to tracking file
   * @param {Array} submittedJobs - Array of submitted job information
   */
  saveSubmittedJobs(submittedJobs) {
    // Ensure directory exists
    const dir = path.dirname(BATCH_FILES.submitted);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    
    // Load existing submitted jobs if file exists
    let existingJobs = [];
    if (fs.existsSync(BATCH_FILES.submitted)) {
      try {
        const content = fs.readFileSync(BATCH_FILES.submitted, 'utf8');
        existingJobs = JSON.parse(content);
      } catch (error) {
        this.logger.warn(`Could not read existing submitted jobs: ${error.message}`);
      }
    }
    
    // Merge with new jobs
    const allJobs = [...existingJobs, ...submittedJobs];
    
    // Save to file
    fs.writeFileSync(BATCH_FILES.submitted, JSON.stringify(allJobs, null, 2));
    this.logger.info(`Saved ${submittedJobs.length} new jobs to ${BATCH_FILES.submitted}`);
    this.logger.info(`Total jobs in queue: ${allJobs.length}`);
  }
  
  /**
   * Split array into chunks of specified size
   * @param {Array} array - Array to chunk
   * @param {number} size - Chunk size
   * @returns {Array} - Array of chunks
   */
  chunkArray(array, size) {
    const chunks = [];
    for (let i = 0; i < array.length; i += size) {
      chunks.push(array.slice(i, i + size));
    }
    return chunks;
  }
}

module.exports = { BatchWorkflow };
