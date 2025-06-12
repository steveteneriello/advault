// workflow-coordinator.js - Common workflow coordination logic
const { Logger } = require('../utils/logging/logger.cjs');
const { validateAllConfigs } = require('../config/environment.cjs');

class WorkflowCoordinator {
  constructor(workflowName) {
    this.workflowName = workflowName;
    this.logger = new Logger(workflowName);
    this.startTime = null;
    this.steps = [];
    this.currentStep = null;
  }
  
  /**
   * Initialize workflow with validation
   * @returns {Promise<boolean>} - Success status
   */
  async initialize() {
    this.logger.info(`🚀 Initializing ${this.workflowName} workflow`);
    this.startTime = new Date();
    
    // Validate configurations
    const validation = validateAllConfigs();
    if (!validation.isValid) {
      this.logger.error('❌ Configuration validation failed:');
      validation.errors.forEach(error => this.logger.error(`- ${error}`));
      return false;
    }
    
    this.logger.info('✅ Configuration validation passed');
    return true;
  }
  
  /**
   * Start a workflow step
   * @param {string} stepName - Name of the step
   * @param {string} description - Step description
   */
  startStep(stepName, description) {
    this.currentStep = {
      name: stepName,
      description,
      startTime: new Date(),
      status: 'running'
    };
    
    this.logger.info(`📊 Starting step: ${stepName} - ${description}`);
  }
  
  /**
   * Complete a workflow step
   * @param {string} stepName - Name of the step
   * @param {Object} result - Step result data
   */
  completeStep(stepName, result = {}) {
    if (this.currentStep && this.currentStep.name === stepName) {
      this.currentStep.endTime = new Date();
      this.currentStep.duration = this.currentStep.endTime - this.currentStep.startTime;
      this.currentStep.status = 'completed';
      this.currentStep.result = result;
      
      this.steps.push({ ...this.currentStep });
      
      this.logger.info(`✅ Completed step: ${stepName} (${this.currentStep.duration}ms)`);
      this.currentStep = null;
    }
  }
  
  /**
   * Fail a workflow step
   * @param {string} stepName - Name of the step
   * @param {Error} error - Error that caused failure
   */
  failStep(stepName, error) {
    if (this.currentStep && this.currentStep.name === stepName) {
      this.currentStep.endTime = new Date();
      this.currentStep.duration = this.currentStep.endTime - this.currentStep.startTime;
      this.currentStep.status = 'failed';
      this.currentStep.error = error.message;
      
      this.steps.push({ ...this.currentStep });
      
      this.logger.error(`❌ Failed step: ${stepName} - ${error.message}`);
      this.currentStep = null;
    }
  }
  
  /**
   * Add a delay between steps
   * @param {number} seconds - Seconds to wait
   */
  async delay(seconds) {
    this.logger.info(`⏳ Waiting ${seconds} seconds...`);
    await new Promise(resolve => setTimeout(resolve, seconds * 1000));
  }
  
  /**
   * Complete the workflow
   * @param {Object} finalResult - Final workflow result
   * @returns {Object} - Workflow summary
   */
  complete(finalResult = {}) {
    const endTime = new Date();
    const totalDuration = endTime - this.startTime;
    
    const summary = {
      workflow: this.workflowName,
      startTime: this.startTime,
      endTime,
      totalDuration,
      steps: this.steps,
      result: finalResult,
      success: this.steps.every(step => step.status === 'completed')
    };
    
    this.logger.info(`✅ ${this.workflowName} workflow completed successfully`);
    this.logger.info(`Total duration: ${totalDuration}ms`);
    this.logger.info(`Steps completed: ${this.steps.filter(s => s.status === 'completed').length}/${this.steps.length}`);
    
    return summary;
  }
  
  /**
   * Fail the workflow
   * @param {Error} error - Error that caused workflow failure
   * @returns {Object} - Workflow summary
   */
  fail(error) {
    const endTime = new Date();
    const totalDuration = endTime - this.startTime;
    
    const summary = {
      workflow: this.workflowName,
      startTime: this.startTime,
      endTime,
      totalDuration,
      steps: this.steps,
      error: error.message,
      success: false
    };
    
    this.logger.error(`❌ ${this.workflowName} workflow failed: ${error.message}`);
    this.logger.info(`Total duration before failure: ${totalDuration}ms`);
    
    return summary;
  }
  
  /**
   * Get workflow status
   * @returns {Object} - Current status
   */
  getStatus() {
    return {
      workflow: this.workflowName,
      currentStep: this.currentStep,
      completedSteps: this.steps.length,
      isRunning: this.currentStep !== null
    };
  }
}

module.exports = { WorkflowCoordinator };
