// Example script for Google SERP scraper
const { scrapeGoogle } = require('./google-scraper');

// Set your Oxylabs credentials as environment variables
process.env.OXYLABS_USERNAME = 'your_username';
process.env.OXYLABS_PASSWORD = 'your_password';

async function runExample() {
  try {
    console.log('Starting Google SERP scraper example...');
    
    // Example 1: Scrape results for "plumbers in boston"
    console.log('\nExample 1: Scraping results for "plumbers in boston" in Boston, MA');
    const result1 = await scrapeGoogle(
      'plumbers in boston',
      'Boston, Massachusetts, United States',
      true,  // Capture screenshot
      false, // Don't upload to GCS
      ''     // No bucket name needed
    );
    
    // Print summary of results
    console.log('\nResults Summary for "plumbers in boston":');
    console.log(`- Top Ads: ${result1.results.ads.top.length}`);
    console.log(`- Bottom Ads: ${result1.results.ads.bottom.length}`);
    console.log(`- Organic Results: ${result1.results.organicResults.length}`);
    console.log(`- Local Pack Results: ${result1.results.localPack.length}`);
    console.log(`- JSON saved to: ${result1.jsonPath}`);
    console.log(`- Screenshot saved to: ${result1.screenshotPath}`);
    
    // Example 2: Scrape results for "dentists near me" in Miami, FL
    console.log('\nExample 2: Scraping results for "dentists near me" in Miami, FL');
    const result2 = await scrapeGoogle(
      'dentists near me',
      'Miami, Florida, United States',
      true,  // Capture screenshot
      false, // Don't upload to GCS
      ''     // No bucket name needed
    );
    
    // Print summary of results
    console.log('\nResults Summary for "dentists near me":');
    console.log(`- Top Ads: ${result2.results.ads.top.length}`);
    console.log(`- Bottom Ads: ${result2.results.ads.bottom.length}`);
    console.log(`- Organic Results: ${result2.results.organicResults.length}`);
    console.log(`- Local Pack Results: ${result2.results.localPack.length}`);
    console.log(`- JSON saved to: ${result2.jsonPath}`);
    console.log(`- Screenshot saved to: ${result2.screenshotPath}`);
    
    console.log('\nExamples completed successfully!');
    
  } catch (error) {
    console.error('Error running examples:', error);
  }
}

// Run the examples
runExample();