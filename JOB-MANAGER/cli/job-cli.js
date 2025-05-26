#!/usr/bin/env node

import { program } from 'commander';
import dotenv from 'dotenv';
dotenv.config();

// 📦 Combined API + Supabase imports
import {
  createSchedule,
  getSchedules,
  getSchedule,
  setScheduleState,
  storeScheduleMetadata
} from '../../lib/oxylabsClient.js';

import { makeEndTime } from '../../utils/cron.js';

program
  .name('oxylabs-cli')
  .description('Manage Oxylabs scheduled jobs from the terminal')
  .version('1.0.0');

program
  .command('create')
  .description('Create a new scheduled job')
  .requiredOption('--cron <expression>', 'Cron expression')
  .requiredOption('--name <internal_name>', 'Internal name for tracking')
  .option('--query <query>', 'Query string (for Google Search)')
  .option('--url <url>', 'URL (for Universal)')
  .option('--minutes <n>', 'Minutes ahead to end', '60')
  .action(async (opts) => {
    const items = [];
    if (opts.query) items.push({ source: 'google_search', query: opts.query });
    if (opts.url) items.push({ source: 'universal', url: opts.url });

    if (items.length === 0) {
      console.error('❌ You must provide at least --query or --url.');
      process.exit(1);
    }

    const end_time = makeEndTime(parseInt(opts.minutes));
    const result = await createSchedule({ cron: opts.cron, items, end_time });

    if (result?.schedule_id) {
      await storeScheduleMetadata(result.schedule_id, opts.name);
      console.log(`✅ Created and stored schedule with ID: ${result.schedule_id}`);
    } else {
      console.error('❌ Schedule creation failed:', result);
    }
  });

program
  .command('list')
  .description('List all schedule IDs')
  .action(async () => {
    const ids = await getSchedules();
    if (!ids.length) {
      console.log('⚠️ No schedules found.');
    } else {
      console.log('📋 Schedule IDs:', ids.join(', '));
    }
  });

program
  .command('info')
  .description('Get schedule details')
  .argument('<id>', 'Schedule ID')
  .action(async (id) => {
    const info = await getSchedule(id);
    if (!info) {
      console.error(`❌ No data found for schedule ID: ${id}`);
    } else {
      console.log(JSON.stringify(info, null, 2));
    }
  });

program
  .command('toggle')
  .description('Activate or deactivate a schedule')
  .argument('<id>', 'Schedule ID')
  .option('--off', 'Deactivate the schedule')
  .action(async (id, opts) => {
    const active = !opts.off;
    const result = await setScheduleState(id, active);
    if (result) {
      console.log(`✅ Schedule ${id} is now ${active ? 'active' : 'inactive'}`);
    } else {
      console.error('❌ Failed to update schedule state');
    }
  });

program.parse();
