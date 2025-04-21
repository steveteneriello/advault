const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

// ✅ Supabase client with service role for full access
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// === CLI Args ===
const [batchIdArg, ...keywordParts] = process.argv.slice(2);
const batchId = batchIdArg;
const keyword = keywordParts.join(' ');

if (!batchId || !keyword) {
  console.error('❌ Usage: node SCRAPI/b-keyword-feeder/keyword-feeder.js <batch_id> "<keyword>"');
  console.error('   Example: node SCRAPI/b-keyword-feeder/keyword-feeder.js COUNTY-CEN-1 "CITY plumber"');
  console.error('   Example: node SCRAPI/b-keyword-feeder/keyword-feeder.js TOP-500 "CITY disaster restoration"');
  process.exit(1);
}

async function runKeywordFeeder(batchId, keyword) {
  console.log(`🔍 Fetching locations for batch "${batchId}" using keyword "${keyword}"...`);

  // Detect filter type based on batchId prefix
  let filterColumn = 'county_assignment';
  if (batchId.toUpperCase().startsWith('TOP-')) {
    filterColumn = 'city_class';
  }

  // Step 1: Fetch matching rows from location_data
  const { data, error } = await supabase
    .from('location_data')
    .select('city, state_name, county_assignment, city_class')
    .ilike(filterColumn, `${batchId}%`);

  if (error) {
    console.error('❌ Supabase error:', error.message);
    process.exit(1);
  }

  if (!data || data.length === 0) {
    console.error(`⚠️ No matching locations found for batch "${batchId}".`);
    process.exit(1);
  }

  // Step 2: Build query objects
  const formatted = data.map(row => ({
    query: keyword.replace(/CITY/g, row.city),
    geo_location: `${row.city}, ${row.state_name}, United States`
  }));

  // Step 3: Save to master-queries.json
  const outputPath = path.join(__dirname, '../b-keyword-feeder/master-queries.json');
  fs.writeFileSync(outputPath, JSON.stringify(formatted, null, 2));

  console.log(`✅ Saved ${formatted.length} queries to ${outputPath}`);
}

// Run it
runKeywordFeeder(batchId, keyword).catch(err => {
  console.error('❌ Fatal error in keyword feeder:', err.message);
  process.exit(1);
});
