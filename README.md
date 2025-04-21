# Ad Data Collection and Processing System

This project demonstrates a comprehensive system for collecting, processing, and analyzing online advertising data using Oxylabs' Scraper APIs and Supabase for data storage.

## System Architecture

The system consists of several components:

1. **Data Collection**: Uses Oxylabs' Google Ads Scraper API to collect ad data from search engine results pages (SERPs).
2. **Data Processing**: Processes the collected data and stores it in a structured database.
3. **Event-Driven Processing**: Implements an event-driven architecture using database triggers for reliable data processing.
4. **Data Analysis**: Provides tools for analyzing the collected data.

## Database Schema

The database schema includes the following tables:

- `advertisers`: Information about companies placing ads
- `ads`: Individual ad content and metadata
- `serps`: Search engine results pages
- `serp_ads`: Relationship between SERPs and ads
- `staging_serps`: Staging table for event-driven processing
- `processing_logs`: Audit trail of processing activities
- `markets`: Geographic markets
- `verticals`: Business verticals/categories
- `keywords`: Search keywords/phrases

## Processing Approaches

The system supports multiple processing approaches:

### 1. Direct Processing

The `AdvertiserProcessor.js` and `SerpProcessor.js` scripts directly process SERP data files and insert them into the database.

```bash
npm run process:advertisers
npm run process:serps
```

### 2. Event-Driven Processing

The event-driven approach uses a staging table and database triggers:

1. SERP data is inserted into the `staging_serps` table
2. A database trigger automatically processes the data into the main tables
3. Processing logs are recorded for auditing and debugging

```bash
npm run process:stage
```

### 3. Demo

To see the event-driven processing in action:

```bash
npm run demo:event-driven
```

## Benefits of Event-Driven Processing

- **Reliability**: Processing happens within database transactions
- **Auditability**: Complete logs of all processing steps
- **Scalability**: Can handle high volumes of data
- **Resilience**: Automatic retry capabilities
- **Decoupling**: Separates data collection from processing

## Setup

1. Install dependencies:
   ```bash
   npm install
   ```

2. Configure environment variables in `.env` file:
   ```
   OXYLABS_USERNAME=your_username
   OXYLABS_PASSWORD=your_password
   VITE_SUPABASE_URL=your_supabase_url
   VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
   ```

3. Run the data collection:
   ```bash
   npm run scrape:ads
   ```

4. Process the data using your preferred approach:
   ```bash
   npm run process:stage  # Event-driven approach
   ```

## Viewing Data

To view the processed data:

```bash
npm run view:db
```

## Advanced Usage

### Manual Reprocessing

If a SERP fails to process, you can manually reprocess it using the `reprocess_staged_serp` function:

```sql
SELECT reprocess_staged_serp('staging_id_here');
```

### Staging a SERP Manually

You can manually stage a SERP for processing using the `stage_serp_from_json` function:

```sql
SELECT stage_serp_from_json(
  'job_id',
  'query',
  'location',
  '2025-04-08T12:00:00Z',
  '{"job":{"id":"job_id"},"results":[...]}'
);
```