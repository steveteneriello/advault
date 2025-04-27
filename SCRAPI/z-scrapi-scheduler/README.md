# SCRAPI Scheduler System

A comprehensive system for scheduling, tracking, and processing Oxylabs scraping jobs based on cron expressions.

## Overview

The SCRAPI Scheduler system allows you to create and manage scheduled scraping jobs using Oxylabs' Scheduler API. It provides:

- Creating schedules from existing query files
- Managing configurations for reuse
- Tracking and monitoring schedule execution
- Processing job results automatically
- Command-line interface for management

## Installation

1. Create the necessary directories:
```bash
mkdir -p SCRAPI/z-scrapi-scheduler/configs
mkdir -p SCRAPI/z-scrapi-scheduler/tracking
mkdir -p SCRAPI/z-scrapi-scheduler/tracking/logs
mkdir -p SCRAPI/z-scrapi-scheduler/tracking/jobs
mkdir -p SCRAPI/z-scrapi-scheduler/results
```

2. Ensure you have the required environment variables set:
```
OXYLABS_USERNAME=your_username
OXYLABS_PASSWORD=your_password
```

## Usage

### Command Line Interface

The system comes with a comprehensive CLI:

```bash
node SCRAPI/z-scrapi-scheduler/scheduler-cli.js
```

This will open an interactive menu system for managing schedules.

### Running a One-Time Check

To run a one-time check of all schedules and process new results:

```bash
node SCRAPI/z-scrapi-scheduler/scheduler-cli.js check
```

### Creating a Schedule Programmatically

You can also create schedules programmatically:

```javascript
const ScrapiSchedulerSystem = require('./SCRAPI/z-scrapi-scheduler/scrapi-scheduler-system');

async function createSchedule() {
  const scheduler = new ScrapiSchedulerSystem();
  
  const result = await scheduler.createScheduleFromMasterQueries({
    masterQueriesPath: 'SCRAPI/b-keyword-feeder/master-queries.json',
    cronExpression: '0 0 * * *', // Daily at midnight
    endTime: '2025-12-31 23:59:59',
    configName: 'daily-scrape'
  });
  
  console.log(result);
}

createSchedule();
```

## Components

The system consists of the following components:

1. **oxylabs-scheduler.js** - Core API wrapper for Oxylabs Scheduler API
2. **scheduler-config-manager.js** - Manages saved schedule configurations
3. **scheduler-job-preparer.js** - Prepares jobs for scheduling
4. **schedule-tracker.js** - Tracks and monitors schedule execution
5. **schedule-checker.js** - Checks for and processes new results
6. **scrapi-scheduler-system.js** - Main system integrating all components
7. **scheduler-cli.js** - Command line interface

## Understanding Cron Expressions

Cron expressions define when jobs will run:

- `* * * * *` - Every minute
- `0 * * * *` - Every hour at minute 0
- `0 0 * * *` - Every day at midnight
- `0 0 * * 0` - Every Sunday at midnight
- `0 0 1 * *` - First day of every month at midnight

Format: `minute hour day-of-month month day-of-week`

## Automatic Processing

To set up automatic checking and processing of schedule results:

1. Start the CLI: `node SCRAPI/z-scrapi-scheduler/scheduler-cli.js`
2. Select option 8: "Start/stop automatic checking"
3. Choose to start automatic checking
4. Enter the desired check interval in minutes

Alternatively, you can set up a cron job to run the CLI with the check command periodically:

```bash
# Check every 15 minutes
*/15 * * * * cd /path/to/project && node SCRAPI/z-scrapi-scheduler/scheduler-cli.js check
```

## Best Practices

1. **Test with small batches**: Start with a small set of queries to test your schedule before scaling up.
2. **Monitor limits**: Be aware of your Oxylabs account limits regarding concurrent jobs and total jobs per month.
3. **Use batching**: For large query sets, use the batching feature to split into smaller schedules.
4. **Regularly check results**: Even with automatic checking enabled, periodically review results manually.

## Troubleshooting

- **Missing job results**: Check the jobs in the Oxylabs dashboard to see their actual status.
- **Schedule not running**: Verify the cron expression and ensure the schedule is activated.
- **Connection errors**: Confirm your Oxylabs credentials are correct in the environment variables.

## Directory Structure

```
SCRAPI/
└── z-scrapi-scheduler/
    ├── configs/              # Stored schedule configurations
    ├── results/              # Job results
    ├── tracking/             # Local tracking data
    │   ├── logs/             # Operation logs
    │   └── jobs/             # Job tracking data
    ├── oxylabs-scheduler.js
    ├── scheduler-config-manager.js
    ├── scheduler-job-preparer.js
    ├── schedule-tracker.js
    ├── schedule-checker.js
    ├── scrapi-scheduler-system.js
    ├── scheduler-cli.js
    └── README.md
```