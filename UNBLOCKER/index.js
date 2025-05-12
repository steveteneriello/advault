#!/usr/bin/env node

// CLI Interface for Google SERP Scraper
const { scrapeGoogle } = require('./google-scraper');
const yargs = require('yargs/yargs');
const { hideBin } = require('yargs/helpers');



// Configure CLI options
const argv = yargs(hideBin(process.argv))
  .usage('Usage: $0 [options]')
  .option('keyword', {
    alias: 'k',
    describe: 'Search keyword or phrase',
    type: 'string',
    demandOption: true
  })
  .option('location', {
    alias: 'l',
    describe: 'Location in format "City, State, United States"',
    type: 'string',
    default: 'United States'
  })
  .option('screenshot', {
    alias: 's',
    describe: 'Capture screenshot of search results',
    type: 'boolean',
    default: true
  })
  .option('upload', {
    alias: 'u',
    describe: 'Upload results to Google Cloud Storage',
    type: 'boolean',
    default: false
  })
  .option('bucket', {
    alias: 'b',
    describe: 'Google Cloud Storage bucket name',
    type: 'string',
    default: ''
  })
  .option('username', {
    alias: 'U',
    describe: 'Oxylabs username',
    type: 'string',
    demandOption: true
  })
  .option('password', {
    alias: 'P',
    describe: 'Oxylabs password',
    type: 'string',
    demandOption: true
  })
  .option('debug', {
    alias: 'd',
    describe: 'Enable debug mode with detailed logging',
    type: 'boolean',
    default: false
  })
  .example('$0 -k "plumbers in boston" -l "Boston, Massachusetts, United States" -U your_username -P your_password')
  .example('$0 -k "dentists near me" -l "Miami, Florida, United States" -U your_username -P your_password')
  .example('$0 -k "best insurance" -l "Boston, Massachusetts, United States" -U your_username -P your_password -d')
  .help()
  .alias('help', 'h')
  .version()
  .alias('version', 'v')
  .epilog('For more information, visit https://github.com/yourusername/google-serp-scraper')
  .argv;

// Update the credentials in the scraperModule based on CLI args
process.env.OXYLABS_USERNAME = argv.username;
process.env.OXYLABS_PASSWORD = argv.password;

// Run the scraper with provided arguments
async function runScraper() {
  try {
    console.log(`Starting Google SERP scraper...`);
    console.log(`Keyword: ${argv.keyword}`);
    console.log(`Location: ${argv.location}`);
    console.log(`Capture screenshot: ${argv.screenshot}`);
    console.log(`Upload to GCS: ${argv.upload ? 'Yes' : 'No'}${argv.upload ? `, Bucket: ${argv.bucket}` : ''}`);
    console.log(`Debug mode: ${argv.debug ? 'Enabled' : 'Disabled'}`);
    
    const result = await scrapeGoogle(
      argv.keyword,
      argv.location,
      argv.screenshot,
      argv.upload,
      argv.bucket,
      argv.debug
    );
    
    console.log('Scraping completed successfully');
    console.log(`JSON results saved to: ${result.jsonPath}`);
    if (result.screenshotPath) {
      console.log(`Screenshot saved to: ${result.screenshotPath}`);
    }
    
    if (argv.upload && argv.bucket) {
      console.log(`Results uploaded to GCS bucket: ${argv.bucket}`);
    }
    
    // Print a summary of the results
    console.log('\nResults Summary:');
    console.log(`- Top Ads: ${result.results.ads.top.length}`);
    console.log(`- Bottom Ads: ${result.results.ads.bottom.length}`);
    console.log(`- Organic Results: ${result.results.organicResults.length}`);
    console.log(`- Local Pack Results: ${result.results.localPack.length}`);
    console.log(`- Page Language: ${result.results.meta.language}`);
    
    // Give recommendations if no ads were found
    if (result.results.ads.top.length === 0 && result.results.ads.bottom.length === 0) {
      console.log('\nNo ads were found in the results. Possible reasons:');
      console.log('1. The keyword may not trigger ads in this location');
      console.log('2. There might be issues with geo-location targeting');
      console.log('3. Google might be detecting the scraper as a bot');
      console.log('\nRecommendations:');
      console.log('- Try a different keyword known to trigger ads (e.g., "best insurance")');
      console.log('- Run with debug mode (-d) to get more information');
      console.log('- Check the raw HTML saved in the debug directory');
    }
    
  } catch (error) {
    console.error('Error running scraper:', error);
    process.exit(1);
  }
}

runScraper();