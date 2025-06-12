// test-complete-pipeline.cjs - Comprehensive pipeline testing
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

// Test queries for comprehensive testing
const testQueries = [
  { query: "disaster restoration", location: "Phoenix, Arizona, United States", description: "Emergency services" },
  { query: "plumbing services", location: "Boston, Massachusetts, United States", description: "Home services" },
  { query: "online mba", location: "Cambridge, Massachusetts, United States", description: "Education high-competition" },
  { query: "dentist near me", location: "New York, New York, United States", description: "Local healthcare" },
  { query: "car insurance", location: "Los Angeles, California, United States", description: "Financial services" },
  { query: "personal injury lawyer", location: "Chicago, Illinois, United States", description: "Legal services" },
  { query: "wedding photographer", location: "Seattle, Washington, United States", description: "Creative services" },
  { query: "hvac repair", location: "Miami, Florida, United States", description: "HVAC services" },
  { query: "weight loss program", location: "Denver, Colorado, United States", description: "Health & wellness" },
  { query: "real estate agent", location: "Austin, Texas, United States", description: "Real estate" }
];

class PipelineTester {
  constructor() {
    this.testResults = [];
    this.logFile = path.join(__dirname, 'output-staging/logs', `pipeline-test-${new Date().toISOString().replace(/[:.]/g, '-')}.log`);
    
    // Ensure logs directory exists
    const logsDir = path.dirname(this.logFile);
    if (!fs.existsSync(logsDir)) {
      fs.mkdirSync(logsDir, { recursive: true });
    }
  }

  log(message) {
    const timestamp = new Date().toISOString();
    const logMessage = `[${timestamp}] ${message}`;
    console.log(logMessage);
    fs.appendFileSync(this.logFile, logMessage + '\n');
  }

  async runSingleTest(testData, testNumber) {
    const { query, location, description } = testData;
    
    this.log(`\n${'='.repeat(80)}`);
    this.log(`🧪 TEST ${testNumber}/10: ${description.toUpperCase()}`);
    this.log(`📝 Query: "${query}"`);
    this.log(`📍 Location: ${location}`);
    this.log(`${'='.repeat(80)}`);

    const testResult = {
      testNumber,
      query,
      location,
      description,
      startTime: new Date(),
      stages: {},
      success: false,
      errors: [],
      totalProcessingTime: 0
    };

    try {
      // Stage 1: Single Query Processing
      this.log(`\n🚀 STAGE 1: Running single query automation...`);
      const stage1Start = Date.now();
      
      const automationResult = await this.runAutomation(query, location);
      testResult.stages.automation = {
        success: automationResult.success,
        duration: Date.now() - stage1Start,
        exitCode: automationResult.exitCode,
        output: automationResult.output?.slice(0, 500) // Truncate for logging
      };

      if (automationResult.success) {
        this.log(`✅ Stage 1 completed successfully (${testResult.stages.automation.duration}ms)`);
      } else {
        this.log(`❌ Stage 1 failed with exit code ${automationResult.exitCode}`);
        testResult.errors.push(`Automation failed: ${automationResult.exitCode}`);
      }

      // Stage 2: Check for generated files
      this.log(`\n📁 STAGE 2: Checking generated files...`);
      const filesCheck = this.checkGeneratedFiles(query, location);
      testResult.stages.files = filesCheck;

      if (filesCheck.scraperResults || filesCheck.reports || filesCheck.renderings) {
        this.log(`✅ Stage 2: Found generated files`);
        if (filesCheck.scraperResults) this.log(`   - Scraper results: ${filesCheck.scraperResults.length} files`);
        if (filesCheck.reports) this.log(`   - Reports: ${filesCheck.reports.length} files`);
        if (filesCheck.renderings) this.log(`   - Renderings: ${filesCheck.renderings.length} files`);
      } else {
        this.log(`⚠️ Stage 2: No generated files found`);
        testResult.errors.push('No output files generated');
      }

      // Stage 3: Database verification
      this.log(`\n🗄️ STAGE 3: Database verification...`);
      const dbCheck = await this.checkDatabaseRecords(query, location);
      testResult.stages.database = dbCheck;

      if (dbCheck.serpRecords > 0 || dbCheck.adRecords > 0) {
        this.log(`✅ Stage 3: Database records found`);
        this.log(`   - SERP records: ${dbCheck.serpRecords}`);
        this.log(`   - Ad records: ${dbCheck.adRecords}`);
      } else {
        this.log(`⚠️ Stage 3: No database records found`);
        testResult.errors.push('No database records created');
      }

      // Overall success determination
      testResult.success = automationResult.success && (
        filesCheck.scraperResults > 0 || 
        dbCheck.serpRecords > 0 || 
        dbCheck.adRecords > 0
      );

      testResult.endTime = new Date();
      testResult.totalProcessingTime = testResult.endTime - testResult.startTime;

      if (testResult.success) {
        this.log(`\n🎉 TEST ${testNumber} COMPLETED SUCCESSFULLY`);
        this.log(`⏱️ Total processing time: ${testResult.totalProcessingTime}ms`);
      } else {
        this.log(`\n❌ TEST ${testNumber} FAILED`);
        this.log(`❌ Errors: ${testResult.errors.join(', ')}`);
      }

    } catch (error) {
      this.log(`\n💥 TEST ${testNumber} CRASHED: ${error.message}`);
      testResult.errors.push(`Test crashed: ${error.message}`);
      testResult.endTime = new Date();
      testResult.totalProcessingTime = testResult.endTime - testResult.startTime;
    }

    this.testResults.push(testResult);
    
    // Wait between tests to avoid rate limiting
    this.log(`\n⏸️ Waiting 30 seconds before next test...`);
    await new Promise(resolve => setTimeout(resolve, 30000));
    
    return testResult;
  }

  async runAutomation(query, location) {
    return new Promise((resolve) => {
      const automationScript = path.join(__dirname, 'test-basic-automation.cjs');
      
      let output = '';
      const proc = spawn('node', [automationScript, query, location], {
        stdio: ['pipe', 'pipe', 'pipe'],
        cwd: __dirname
      });

      proc.stdout.on('data', (data) => {
        output += data.toString();
      });

      proc.stderr.on('data', (data) => {
        output += data.toString();
      });

      proc.on('close', (code) => {
        resolve({
          success: code === 0,
          exitCode: code,
          output: output
        });
      });

      // Timeout after 10 minutes
      setTimeout(() => {
        proc.kill('SIGTERM');
        resolve({
          success: false,
          exitCode: -1,
          output: output + '\nTIMEOUT: Process killed after 10 minutes'
        });
      }, 600000);
    });
  }

  checkGeneratedFiles(query, location) {
    const results = {
      scraperResults: 0,
      reports: 0,
      renderings: 0,
      logFiles: 0
    };

    try {
      // Check scraper results
      const scraperDir = path.join(__dirname, 'output-staging/scraper-results');
      if (fs.existsSync(scraperDir)) {
        const files = fs.readdirSync(scraperDir);
        results.scraperResults = files.filter(f => f.includes('ads-results')).length;
      }

      // Check reports
      const reportsDir = path.join(__dirname, 'output-staging/reports');
      if (fs.existsSync(reportsDir)) {
        const files = fs.readdirSync(reportsDir);
        results.reports = files.length;
      }

      // Check renderings (could be in multiple places)
      const renderingDirs = [
        path.join(__dirname, 'output-staging/google-serps'),
        path.join(__dirname, 'data/output/renderings')
      ];

      renderingDirs.forEach(dir => {
        if (fs.existsSync(dir)) {
          const files = fs.readdirSync(dir);
          results.renderings += files.filter(f => f.endsWith('.png') || f.endsWith('.html')).length;
        }
      });

      // Check log files
      const logsDir = path.join(__dirname, 'output-staging/logs');
      if (fs.existsSync(logsDir)) {
        const files = fs.readdirSync(logsDir);
        results.logFiles = files.length;
      }

    } catch (error) {
      this.log(`❌ Error checking files: ${error.message}`);
    }

    return results;
  }

  async checkDatabaseRecords(query, location) {
    // This is a placeholder for database checking
    // In a real implementation, you'd connect to Supabase and check for records
    return {
      serpRecords: 0,
      adRecords: 0,
      error: 'Database check not implemented - would need Supabase connection'
    };
  }

  generateFinalReport() {
    this.log(`\n${'='.repeat(100)}`);
    this.log(`📊 FINAL TEST REPORT - ${new Date().toISOString()}`);
    this.log(`${'='.repeat(100)}`);

    const successfulTests = this.testResults.filter(t => t.success);
    const failedTests = this.testResults.filter(t => !t.success);

    this.log(`\n📈 OVERALL STATISTICS:`);
    this.log(`   Total Tests: ${this.testResults.length}`);
    this.log(`   Successful: ${successfulTests.length} (${(successfulTests.length/this.testResults.length*100).toFixed(1)}%)`);
    this.log(`   Failed: ${failedTests.length} (${(failedTests.length/this.testResults.length*100).toFixed(1)}%)`);

    if (successfulTests.length > 0) {
      const avgTime = successfulTests.reduce((sum, t) => sum + t.totalProcessingTime, 0) / successfulTests.length;
      this.log(`   Average Processing Time: ${(avgTime/1000).toFixed(1)} seconds`);
    }

    this.log(`\n✅ SUCCESSFUL TESTS:`);
    successfulTests.forEach(test => {
      this.log(`   ${test.testNumber}. ${test.description} - "${test.query}" (${(test.totalProcessingTime/1000).toFixed(1)}s)`);
    });

    if (failedTests.length > 0) {
      this.log(`\n❌ FAILED TESTS:`);
      failedTests.forEach(test => {
        this.log(`   ${test.testNumber}. ${test.description} - "${test.query}"`);
        this.log(`      Errors: ${test.errors.join(', ')}`);
      });
    }

    // Save detailed report
    const reportFile = path.join(__dirname, 'output-staging/reports', `pipeline-test-report-${new Date().toISOString().replace(/[:.]/g, '-')}.json`);
    const reportDir = path.dirname(reportFile);
    if (!fs.existsSync(reportDir)) {
      fs.mkdirSync(reportDir, { recursive: true });
    }
    
    fs.writeFileSync(reportFile, JSON.stringify({
      timestamp: new Date().toISOString(),
      summary: {
        totalTests: this.testResults.length,
        successful: successfulTests.length,
        failed: failedTests.length,
        successRate: successfulTests.length/this.testResults.length*100
      },
      results: this.testResults
    }, null, 2));

    this.log(`\n📄 Detailed report saved to: ${reportFile}`);
    this.log(`📄 Test log saved to: ${this.logFile}`);
    this.log(`${'='.repeat(100)}\n`);

    return {
      totalTests: this.testResults.length,
      successful: successfulTests.length,
      failed: failedTests.length,
      successRate: successfulTests.length/this.testResults.length*100
    };
  }

  async runAllTests() {
    this.log(`🚀 Starting comprehensive pipeline testing with ${testQueries.length} test cases...`);
    this.log(`📋 Test queries cover: emergency services, home services, education, healthcare, financial, legal, creative, HVAC, wellness, and real estate`);
    
    for (let i = 0; i < testQueries.length; i++) {
      await this.runSingleTest(testQueries[i], i + 1);
    }

    return this.generateFinalReport();
  }
}

// Run tests if called directly
if (require.main === module) {
  const tester = new PipelineTester();
  
  tester.runAllTests().then(summary => {
    console.log(`\n🎯 Testing completed: ${summary.successful}/${summary.totalTests} tests passed (${summary.successRate.toFixed(1)}%)`);
    process.exit(summary.failed > 0 ? 1 : 0);
  }).catch(error => {
    console.error('❌ Testing failed:', error);
    process.exit(1);
  });
}

module.exports = { PipelineTester };
