# AdFinder

A Node.js application that scrapes Google Ads data from search engine results pages (SERPs) using Bright Data's proxy services.

## Features

- Scrape Google Ads data for any search keywords
- Extract ad positions, domains, and URLs
- Identify ad parameters like gclid
- Support for multiple locations (country targeting)
- Advanced targeting options:
  - Specific device types (desktop, mobile, iOS, Android)
  - Language selection
  - UULE location encoding for precise geo-targeting
  - Search type selection (regular, shopping, news, images)
  - Pagination control
  - Results count customization
- Built-in JSON parsing with brd_json parameter
- Optional Supabase integration for result storage
- Web interface for easy use
- REST API for programmatic access

## Prerequisites

- Node.js 14+ and npm
- Bright Data account with SERP API access
- (Optional) Supabase account for database storage

## Installation

1. Clone this repository:
   ```
   git clone https://github.com/yourusername/google-ads-scraper.git
   cd google-ads-scraper
   ```

2. Install dependencies:
   ```
   npm install
   ```

3. Create a `.env` file by copying the example:
   ```
   cp .env.example .env
   ```

4. Update the `.env` file with your Bright Data credentials:
   ```
   BRIGHT_DATA_API_KEY=your_api_key
   BRIGHT_DATA_USERNAME=your_username
   BRIGHT_DATA_PASSWORD=your_password
   BRIGHT_DATA_HOST=brd.superproxy.io
   BRIGHT_DATA_PORT=33335
   ```

5. (Optional) Add Supabase credentials if you want to store results:
   ```
   SUPABASE_URL=your_supabase_url
   SUPABASE_KEY=your_supabase_key
   ```

## Usage

### Starting the server

```
npm start
```

The server will start on port 3000 by default. You can change this by setting the `PORT` environment variable.

### Web Interface

Open your browser and navigate to `http://localhost:3000` to use the web interface.

### API Usage

#### Search for keywords

```
POST /api/search
```

Request body:
```json
{
  "keywords": ["car insurance", "home insurance"],
  "location": "us",
  "useParallel": true,
  "apiKey": "optional_alternative_api_key",
  "numResults": 100,
  "searchType": "shop",
  "deviceType": "mobile",
  "page": 2,
  "uule": "w+CAIQICINVW5pdGVkK1N0YXRlcw",
  "language": "en"
}
```

### API Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `keywords` | Array/String | Array of keywords or a single keyword string |
| `location` | String | Two-letter country code (e.g., "us", "uk") |
| `useParallel` | Boolean | Whether to process keywords in parallel (default: true) |
| `apiKey` | String | Optional alternative Bright Data API key |
| `numResults` | Number | Number of results to return (10, 20, 30, 50, 100) |
| `searchType` | String | Type of search ("", "shop", "nws", "isch") |
| `deviceType` | String | Device type ("", "mobile", "ios", "ipad", "android", "android_tablet") |
| `page` | Number | Page number of results (1-based) |
| `uule` | String | UULE location encoding for precise geo-targeting |
| `language` | String | Two-letter language code (e.g., "en", "es", "fr") |

You can also pass a single keyword as a string:
```json
{
  "keywords": "car insurance",
  "location": "us"
}
```

Response:
```json
{
  "results": [
    {
      "keyword": "car insurance",
      "location": "us",
      "data": {
        "html": "...",
        "htmlLength": 12345,
        "extractedAdsData": {
          "topAds": [...],
          "bottomAds": [...],
          "shoppingAds": [...],
          "allAdsParams": {...},
          "adMetrics": {
            "totalAds": 5,
            "hasAds": true,
            "adPositions": [1, 2, 3, 4, 5],
            "adDomains": ["geico.com", "progressive.com", "statefarm.com"]
          }
        },
        "serp": {
          "ads": {
            "top": [...],
            "bottom": [...]
          },
          "organic_results": [...],
          "related_searches": [...],
          "knowledge_graph": {...}
        }
      },
      "timestamp": "2023-10-15T12:34:56.789Z"
    },
    {
      "keyword": "home insurance",
      "location": "us",
      "data": {...},
      "timestamp": "2023-10-15T12:34:57.123Z"
    }
  ],
  "timestamp": "2023-10-15T12:34:57.456Z"
}
```

### Health Check

```
GET /health
```

Response:
```json
{
  "status": "OK",
  "timestamp": "2023-10-15T12:34:56.789Z"
}
```

## Technical Details

The application tries two methods to fetch Google SERP data:

1. **Proxy Request Method**: Uses Bright Data's proxy servers with the Node.js `request` library
2. **Direct API Method**: Uses Bright Data's REST API with the `axios` library

If the first method fails, it automatically falls back to the second method.

## Supabase Integration

If Supabase credentials are provided, results will be stored in a `serp_results` table. Make sure to create this table in your Supabase project with the following schema:

```sql
CREATE TABLE serp_results (
  id SERIAL PRIMARY KEY,
  keyword TEXT NOT NULL,
  location TEXT,
  results JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

## License

ISC

## Disclaimer

Web scraping may be against the terms of service of some websites. This tool is provided for educational purposes only. Please use responsibly and in accordance with the terms of service of the websites you are scraping.