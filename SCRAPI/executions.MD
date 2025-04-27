
AUTOMATED SCHEDULES

BATCH scheduler
node /workspaces/advault/SCRAPI/z-scrapi-scheduler/run-batch-job.js TOP-500 "city plumber" "0 8,10,12,14,16,18,20,22 * * *" 30 50

FRONT END
npm run scheduler-web

CLI
node z-scrapi-scheduler/simple-oxylabs-cli.js
