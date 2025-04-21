// migrateLocalSerpImages.js - Retains PNGs locally in google-serps, no Supabase involved
const fs = require('fs');
const path = require('path');

const GOOGLE_SERP_DIR = path.join(process.cwd(), 'SCRAPI', 'output-staging', 'google-serps');

function sanitize(str) {
  return str.replace(/[^a-z0-9]/gi, '-').toLowerCase();
}

async function migrateGoogleSerpImagesToStorage() {
  const files = fs.readdirSync(GOOGLE_SERP_DIR).filter(f => f.endsWith('.png'));
  if (files.length === 0) {
    console.log('📭 No SERP PNG files found in google-serps');
    return;
  }

  for (const file of files) {
    const filePath = path.join(GOOGLE_SERP_DIR, file);
    const safeName = `local-copy-${sanitize(file)}`;
    const outputPath = path.join(GOOGLE_SERP_DIR, safeName);

    try {
      fs.copyFileSync(filePath, outputPath);
      console.log(`✅ Copied ${file} to ${safeName}`);
    } catch (err) {
      console.error(`❌ Error copying file ${file}:`, err.message);
    }
  }

  console.log('\n✅ Local migration complete. All PNGs remain in google-serps.');
}

if (require.main === module) {
  migrateGoogleSerpImagesToStorage().catch(err => {
    console.error('❌ Migration failed:', err);
    process.exit(1);
  });
}

module.exports = { migrateGoogleSerpImagesToStorage };