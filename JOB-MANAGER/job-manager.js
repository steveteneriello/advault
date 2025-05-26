import { createSchedule } from '../lib/oxylabsClient.js';
import { storeScheduleMetadata } from '../lib/metadata.js';
import { makeEndTime } from './utils/cron.js';

const cron = '*/15 * * * *';
const items = [
  { source: 'universal', url: 'https://ip.oxylabs.io' },
  { source: 'google_search', query: 'emergency hvac repair near me' }
];
const end_time = makeEndTime(120); // 2 hours from now

const result = await createSchedule({ cron, items, end_time });

if (result.schedule_id) {
  await storeScheduleMetadata(result.schedule_id, 'HVAC Emergency Crawler', 'Runs every 15 min');
}
