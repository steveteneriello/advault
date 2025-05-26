import fetch from 'node-fetch';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config(); // Make sure this loads early!

// ===============================
// 🔐 AUTH CONFIGURATION
// ===============================
const OXYLABS_USERNAME = process.env.OXYLABS_USERNAME;
const OXYLABS_PASSWORD = process.env.OXYLABS_PASSWORD;
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;

if (!OXYLABS_USERNAME || !OXYLABS_PASSWORD) {
  throw new Error('❌ Oxylabs credentials missing in .env');
}
if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  throw new Error('❌ Supabase credentials missing in .env');
}

const BASE_URL = 'https://data.oxylabs.io/v1/schedules';

const headers = {
  'Authorization': 'Basic ' + Buffer.from(`${OXYLABS_USERNAME}:${OXYLABS_PASSWORD}`).toString('base64'),
  'Content-Type': 'application/json',
  'Accept': 'application/json'
};

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ===============================
// 📦 API FUNCTIONS
// ===============================

export async function createSchedule({ cron, items, end_time }) {
  console.log('📅 Creating schedule...');
  const res = await fetch(BASE_URL, {
    method: 'POST',
    headers,
    body: JSON.stringify({ cron, items, end_time })
  });

  const text = await res.text();

  if (!res.ok) {
    console.error(`❌ Failed to create schedule: ${res.status}`, text);
    return null;
  }

  const json = safeParseJson(text);
  console.log('✅ Schedule created:', json);
  return json;
}

export async function getSchedules() {
  console.log('📡 Fetching all schedules...');
  const res = await fetch(BASE_URL, { method: 'GET', headers });
  const text = await res.text();

  if (!res.ok) {
    console.error(`❌ Failed to fetch schedules: ${res.status}`, text);
    return [];
  }

  const json = safeParseJson(text);
  return json?.schedules || [];
}

export async function getSchedule(id) {
  console.log(`📋 Getting info for schedule ID ${id}`);
  const res = await fetch(`${BASE_URL}/${id}`, { method: 'GET', headers });
  const text = await res.text();

  if (!res.ok) {
    console.error(`❌ Failed to get schedule ${id}: ${res.status}`, text);
    return null;
  }

  return safeParseJson(text);
}

export async function getScheduleJobs(id) {
  console.log(`📦 Fetching jobs for schedule ${id}`);
  const res = await fetch(`${BASE_URL}/${id}/jobs`, { method: 'GET', headers });
  const text = await res.text();

  if (!res.ok) {
    console.error(`❌ Failed to get jobs for ${id}: ${res.status}`, text);
    return [];
  }

  const json = safeParseJson(text);
  return json?.jobs || [];
}

export async function getScheduleRuns(id) {
  console.log(`📈 Fetching runs for schedule ${id}`);
  const res = await fetch(`${BASE_URL}/${id}/runs`, { method: 'GET', headers });
  const text = await res.text();

  if (!res.ok) {
    console.error(`❌ Failed to get runs for ${id}: ${res.status}`, text);
    return [];
  }

  const json = safeParseJson(text);
  return json?.runs || [];
}

export async function setScheduleState(id, active = true) {
  console.log(`🚦 Setting schedule ${id} to ${active ? 'active' : 'inactive'}...`);
  const res = await fetch(`${BASE_URL}/${id}/state`, {
    method: 'PUT',
    headers,
    body: JSON.stringify({ active })
  });

  if (res.status === 202) {
    console.log(`✅ Schedule ${id} updated.`);
    return true;
  }

  const text = await res.text();
  console.error(`❌ Failed to update state for ${id}: ${res.status}`, text);
  return false;
}

// ===============================
// 🧠 METADATA STORAGE
// ===============================

export async function storeScheduleMetadata(schedule_id, internal_name, description = '') {
  const { error } = await supabase.from('oxylabs_schedules').insert({
    schedule_id,
    internal_name,
    description
  });

  if (error) {
    console.error('❌ Failed to store schedule metadata:', error.message);
  } else {
    console.log(`📌 Stored metadata: ${internal_name} → schedule_id: ${schedule_id}`);
  }
}

// ===============================
// 🧰 HELPERS
// ===============================

function safeParseJson(text) {
  try {
    return JSON.parse(text);
  } catch (err) {
    console.error('⚠️ Failed to parse JSON:', err.message);
    return null;
  }
}
