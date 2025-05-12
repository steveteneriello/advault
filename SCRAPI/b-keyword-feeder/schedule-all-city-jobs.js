const { spawn } = require('child_process');

const batches = [
  // Eastern
 // 'EAS-1','EAS-2','EAS-3','EAS-4','EAS-5','EAS-6','EAS-7','EAS-8', 'EAS-9',
  //'EAS-10', 'EAS-11', 'EAS-12', 'EAS-13', 'EAS-14', 'EAS-15', 'EAS-16', 'EAS-17', 'EAS-18', 'EAS-19',
  // Central
  //'CEN-1', 'CEN-2', 'CEN-3', 'CEN-4', 'CEN-5', 'CEN-6', 'CEN-7', 'CEN-8', 'CEN-9',
  //'CEN-10', 'CEN-11', 'CEN-12', 'CEN-13', 'CEN-14', 'CEN-15',
  // Mountain
  //'MOU-1', 'MOU-2', 'MOU-3',
  // Pacific
  //'PAC-1', 'PAC-2', 'PAC-3'
];

const keywords = [
  "ac repair near me",
  "plumbers near me",
  "electricians near me",
  "drain cleaning",
  "sewer repair",
  "trenchless sewer",
  "roto rooter",
  "disaster restoration",
  "door replacement",
  "roof replacement",
  "roof repair",
  "furnace replacement",
  "water filtration",
  "water softener system",
  "basement waterproofing",
  "basement remodeling",
  "bathroom remodeling",
  "home remodeling",
  "rebath",
  "walk in bathtub",
  "gutters",
  "ductless",
  "Mitsubishi ductless",
  "kitchen cabinets",
  "kitchen remodeling",
  "hardwood flooring",
  "carpet installation",
  "Andersen windows",
  "vinyl windows",
  "siding installer",
  "painters",
  "driveway replacement",
  "paving installation",
  "sealcoating",
  "garage door installer",
  "fireplace installer",
  "mason near me",
  "granite installers",
  "foundation repair",
  "duct cleaning",
  "carpet cleaning",
  "maid service",
  "solar installers",
  "sheds",
  "deck installer",
  "ev charger installer",
  "retaining wall installer"];

function getCronTime(batch) {
  if (batch.startsWith('EAS-')) return '00 14 2 * *';
  if (batch.startsWith('CEN-')) return '00 15 2 * *';
  if (batch.startsWith('MOU-')) return '00 16 3 * *';
  if (batch.startsWith('PAC-')) return '00 17 3 * *';
  return null;
}

function runJob(batchId, keyword, cronTime) {
  return new Promise((resolve, reject) => {
    const scriptPath = '/workspaces/advault/SCRAPI/z-scrapi-scheduler/run-batch-job.js';
    const args = [scriptPath, batchId, keyword, cronTime, '30', '50'];

    const child = spawn('node', args, { stdio: 'inherit' });

    child.on('close', code => {
      if (code === 0) {
        console.log(`✅ Finished: ${batchId} - "${keyword}"`);
        resolve();
      } else {
        console.error(`❌ Failed: ${batchId} - "${keyword}" with exit code ${code}`);
        reject(new Error(`Job failed: ${batchId} - ${keyword}`));
      }
    });
  });
}

async function scheduleAllJobs() {
  for (const batch of batches) {
    const cronTime = getCronTime(batch);
    if (!cronTime) continue;

    for (const keyword of keywords) {
      try {
        await runJob(batch, keyword, cronTime);
      } catch (err) {
        console.error(err.message);
      }
    }
  }

  console.log('🎉 All batch jobs have been triggered');
}

scheduleAllJobs();
