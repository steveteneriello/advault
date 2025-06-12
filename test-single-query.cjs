#!/usr/bin/env node
// test-single-query.cjs - Test the single query workflow without full execution
const { SingleQueryWorkflow } = require('./SCRAPI/workflows/single-query-workflow.cjs');

async function testWorkflow() {
  console.log('🧪 Testing Single Query Workflow (Configuration Only)\n');
  
  try {
    const workflow = new SingleQueryWorkflow();
    
    // Test initialization only
    console.log('Testing workflow initialization...');
    const initialized = await workflow.initialize();
    
    if (initialized) {
      console.log('✅ Workflow initialization successful!');
      console.log('✅ Configuration validation passed');
      console.log('✅ Logger initialized');
      console.log('✅ Environment variables loaded');
      
      console.log('\n📊 Workflow Status:');
      const status = workflow.getStatus();
      console.log(`   Workflow: ${status.workflow}`);
      console.log(`   Completed Steps: ${status.completedSteps}`);
      console.log(`   Is Running: ${status.isRunning}`);
      
      console.log('\n🎉 Single Query Workflow is ready for use!');
      console.log('\nTo run a full workflow:');
      console.log('   node SCRAPI/entry-points/single-query/scrapi-automation.cjs "test query" "Boston, MA, United States"');
      
    } else {
      console.log('❌ Workflow initialization failed');
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

testWorkflow();
