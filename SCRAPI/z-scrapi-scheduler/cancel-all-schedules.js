// cancel-all-schedules.js

const axios = require('axios');
require('dotenv').config();

const scheduleIds = [
  4251070022324619000,
  1885311001552541200,
  1679561101608764400,
  3174824316486853600,
  3030793639638720500,
  3086914387858918400,
  2989934681098224600,
  4114804482756055000,
  4500149361174493700,
  4317056246346928600,
  2472215570377121000,
  4295670381881454000,
  1418813436250501000,
  3471666747022958000,
  1904168671151588400,
  4187574260699453400,
  381649345111620160,
  1826045680239296800,
  1992667541390336300,
  3390110945370765300,
  3350534697681405400,
  4090092264022467000,
  974696213987510800,
  2271783356056633900,
  1661343107381827600,
  8813291618933491,
  3681706690165172700,
  2705607310658510000,
  3563293510098369500,
  2332272435053341700,
  2022104941550175500,
  1806213004284528400,
  143642641601306080,
  1779966171340212500,
  3102786010845502500,
  3865630401357640700,
  4224872034577986600,
  627629897096817800
];

const username = process.env.OXYLABS_USERNAME;
const password = process.env.OXYLABS_PASSWORD;

async function cancelSchedule(scheduleId) {
  try {
    await axios.delete(`https://data.oxylabs.io/v1/schedules/${scheduleId}`, {
      auth: {
        username,
        password
      }
    });
    console.log(`✅ Successfully cancelled schedule ID: ${scheduleId}`);
  } catch (error) {
    console.error(`❌ Failed to cancel schedule ID: ${scheduleId}`, error.response?.data || error.message);
  }
}

async function cancelAllSchedules() {
  console.log(`🚀 Starting to cancel ${scheduleIds.length} schedules...`);
  for (const id of scheduleIds) {
    await cancelSchedule(id);
  }
  console.log('✅ Done canceling all schedules!');
}

cancelAllSchedules();