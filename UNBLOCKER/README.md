# Google SERP and Ads Scraper

A Node.js tool to scrape Google Search Engine Results Pages (SERPs) and ads using Oxylabs Web Unblocker.

## Features

- Scrape Google search results and ads based on keywords and locations
- Capture screenshots of search results pages
- Customize search locations to target specific cities in the United States
- Extract:
  - Top and bottom ads
  - Organic search results
  - Local pack results
- Generate JSON data for analysis
- Option to upload results to Google Cloud Storage

## Prerequisites

- Node.js (v14 or higher)
- An Oxylabs Web Unblocker account and credentials
- (Optional) A Google Cloud Storage bucket and credentials for uploading results

## Installation

1. Clone this repository:
   ```
   git clone https://github.com/yourusername/google-serp-scraper.git
   cd google-serp-scraper
   ```

2. Install dependencies:
   ```
   npm install
   ```

3. (Optional) If you want to use Google Cloud Storage:
   - Set up a Google Cloud Platform account
   - Create a Cloud Storage bucket
   - Set up authentication by downloading a service account key file
   - Set the environment variable `GOOGLE_APPLICATION_CREDENTIALS` to the path of your service account key file

## Usage

### Command Line Interface

The scraper can be run via the command line with the following options:

```
node index.js --keyword "search term" --location "City, State, United States" --username YOUR_OXYLABS_USERNAME --password YOUR_OXYLABS_PASSWORD
```

#### Options:

- `-k, --keyword` (required): Search keyword or phrase
- `-l, --location`: Location in format "city, state, United States" (default: "New York, New York, United States")
- `-s, --screenshot`: Capture screenshot of search results (default: true)
- `-u, --upload`: Upload results to Google Cloud Storage (default: false)
- `-b, --bucket`: Google Cloud Storage bucket name
- `-U, --username`: Oxylabs username (required)
- `-P, --password`: Oxylabs password (required)
- `-h, --help`: Show help
- `-v, --version`: Show version number

### Examples

1. Scrape search results for "plumbers in boston" in Boston:
   ```
   node index.js -k "plumbers in boston" -l "Boston, Massachusetts, United States" -U your_username -P your_password
   ```

2. Scrape results and upload to Google Cloud Storage:
   ```
   node index.js -k "dentists near me" -l "Miami, Florida, United States" -s -u -b your-gcs-bucket -U your_username -P your_password
   ```

### Programmatic Usage

You can also use the scraper in your own Node.js applications:

```javascript
const { scrapeGoogle } = require('./google-scraper');

// Set Oxylabs credentials as environment variables
process.env.OXYLABS_USERNAME = 'your_username';
process.env.OXYLABS_PASSWORD = 'your_password';

async function runScraper() {
  try {
    const keyword = 'plumbers in boston';
    const location = 'Boston, Massachusetts, United States';
    const captureScreenshot = true;
    const uploadToGCS = false;
    const bucketName = 'your-gcs-bucket-name';
    
    const result = await scrapeGoogle(
      keyword,
      location,
      captureScreenshot,
      uploadToGCS,
      bucketName
    );
    
    console.log('Results:', result.results);
  } catch (error) {
    console.error('Error:', error);
  }
}

runScraper();
```

## Output

The scraper generates two files for each search:

1. A JSON file containing structured data on:
   - Top ads
   - Bottom ads
   - Organic search results
   - Local pack results (when available)

2. A PNG screenshot of the search results page (if screenshot option is enabled)

Files are saved in a `results` directory with filenames based on the keyword and timestamp.

## Notes on Oxylabs Web Unblocker

This scraper uses Oxylabs Web Unblocker to overcome Google's anti-scraping measures. The Web Unblocker:

- Automates proxy management
- Generates browser fingerprints
- Handles JavaScript rendering
- Maintains sessions
- Automatically retries failed requests

For more information, see the [Oxylabs Web Unblocker documentation](https://developers.oxylabs.io/advanced-proxy-solutions/web-unblocker).

## Disclaimer

Web scraping may be against the terms of service of some websites. This tool is provided for educational purposes only. Always review and comply with the target website's terms of service and robots.txt rules. The authors are not responsible for any misuse of this tool.

## License

MIT