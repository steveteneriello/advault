// batch-scheduler.js (TOP-1000 to TOP-5000 scheduled for today via cron)

const { exec } = require('child_process');

const keywords = [
  "electricians",
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
  "retaining wall installer"
];

// Static city_class values to target
const cityClasses = ['TOP-1000', 'TOP-2000', 'TOP-3000', 'TOP-4000', 'TOP-5000'];

async function runBatchJobs() {
  for (const cityClass of cityClasses) {
    for (const keyword of keywords) {
      console.log(`Running batch for ${cityClass}: ${keyword}`);
      await new Promise((resolve, reject) => {
        exec(
          `node /workspaces/advault/SCRAPI/z-scrapi-scheduler/run-batch-job.js ${cityClass} "${keyword}" "0 17 * * 4" 600 50`,
          (error, stdout, stderr) => {
            if (error) {
              console.error(`❌ Error running batch for ${cityClass} - ${keyword}:`, error.message);
              return reject(error);
            }
            console.log(stdout);
            if (stderr) console.error(stderr);
            resolve();
          }
        );
      });

      console.log("⏳ Waiting 30 seconds...");
      await new Promise(resolve => setTimeout(resolve, 30000));
    }
  }

  console.log("✅ All TOP-1000 to TOP-5000 batch jobs completed.");
}

runBatchJobs();
