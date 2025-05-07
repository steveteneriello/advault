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
  process.exit(1);
}

async function runKeywordFeeder(batchId, keyword) {
  console.log(`🔍 Fetching locations for batch "${batchId}" using keyword "${keyword}"...`);

  let filterColumn;
  if (batchId.toUpperCase().startsWith('TOP-')) {
    filterColumn = 'city_class';
  } else if (batchId.toUpperCase().startsWith('COUNTY-')) {
    filterColumn = 'county_assignment';
  } else {
    filterColumn = 'batch_id';
  }

  const { data, error } = await supabase
    .from('location_data')
    .select('city, state_name, county_assignment, city_class, batch_id')
    .ilike(filterColumn, `${batchId}%`);

  if (error) {
    console.error('❌ Supabase error:', error.message);
    process.exit(1);
  }

  if (!data || data.length === 0) {
    console.error(`⚠️ No matching locations found for batch "${batchId}".`);
    process.exit(1);
  }

  const formatted = data.map(row => {
    const replacedQuery = keyword
      .replace(/\bCITY\b/g, row.city)
      .replace(/\bcity\b/g, row.city)
      .replace(/\bCity\b/g, row.city);
    return {
      query: replacedQuery,
      geo_location: `${row.city}, ${row.state_name}, United States`
    };
  });

  const outputPath = path.join(__dirname, 'master-queries.json');
  fs.writeFileSync(outputPath, JSON.stringify(formatted, null, 2));

  console.log(`✅ Saved ${formatted.length} queries to ${outputPath}`);
}

// Run it
runKeywordFeeder(batchId, keyword).catch(err => {
  console.error('❌ Fatal error in keyword feeder:', err.message);
  process.exit(1);
});
