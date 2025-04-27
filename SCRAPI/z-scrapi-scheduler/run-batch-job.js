// SCRAPI/z-scrapi-scheduler/run-batch-job.js
const { spawn } = require('child_process');
const path = require('path');

// Parse command line arguments
const [batchIdArg, keywordArg, cronArg = "0 12 * * *", daysArg = "30", batchSizeArg = "100"] = process.argv.slice(2);

if (!batchIdArg || !keywordArg) {
  console.error('❌ Usage: node run-batch-job.js <batch_id> "<keyword>" [cron] [days] [batch-size]');
  console.error('   Example: node run-batch-job.js PAC-2 "disaster restoration" "0 12 * * *" 30 50');
  process.exit(1);
}

async function runProcess(command, args, options = {}) {
  return new Promise((resolve, reject) => {
    console.log(`🔄 Running: ${command} ${args.join(' ')}`);
    
    const process = spawn(command, args, options);
    
    process.stdout.on('data', (data) => {
      console.log(data.toString().trim());
    });
    
    process.stderr.on('data', (data) => {
      console.error(data.toString().trim());
    });
    
    process.on('close', (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`Process exited with code ${code}`));
      }
    });
  });
}

async function runBatchJob() {
  try {
    // Step 1: Run keyword-feeder to generate master-queries.json
    console.log('🔍 Running keyword-feeder...');
    await runProcess('node', [
      path.join(__dirname, '../b-keyword-feeder/keyword-feeder.js'),
      batchIdArg,
      keywordArg
    ]);
    
    // Step 2: Run batch-scheduler to schedule the jobs
    console.log('\n📅 Scheduling batch job...');
    const masterQueriesPath = path.join(__dirname, '../b-keyword-feeder/master-queries.json');
    const batchName = `${batchIdArg}-${keywordArg.replace(/\s+/g, '-')}`.substring(0, 30);
    
    await runProcess('node', [
      path.join(__dirname, './batch-scheduler.js'),
      masterQueriesPath,
      batchName,
      '--cron', cronArg,
      '--days', daysArg,
      '--batch-size', batchSizeArg
    ]);
    
    console.log('\n✅ Batch job setup complete!');
  } catch (error) {
    console.error(`\n❌ Failed to run batch job: ${error.message}`);
    process.exit(1);
  }
}

runBatchJob();