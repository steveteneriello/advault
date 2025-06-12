# Staging SERP Mapper Documentation

This document explains how to map raw Oxylabs API responses to the `staging_serps` table using the `StagingSerpMapper` class.

## Table Schema

The `staging_serps` table has the following structure:

```sql
CREATE TABLE public.staging_serps (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  job_id text NOT NULL,
  query text NOT NULL,
  location text NOT NULL,
  timestamp timestamp with time zone NOT NULL,
  content jsonb NOT NULL,
  status text NOT NULL DEFAULT 'pending'::text,
  error_message text NULL,
  created_at timestamp with time zone NULL DEFAULT now(),
  processed_at timestamp with time zone NULL,
  device text NULL,
  raw_html text NULL,
  landing_pages text[] NULL,
  updated_at timestamp with time zone NULL,
  pages integer NULL,
  start_page integer NULL,
  locale text NULL,
  extra_params jsonb NULL,
  CONSTRAINT staging_serps_pkey PRIMARY KEY (id),
  CONSTRAINT staging_serps_job_id_unique UNIQUE (job_id)
);
```

## Basic Usage

### 1. Simple Mapping

```javascript
const { StagingSerpMapper } = require('./utils/staging-serps-mapper.cjs');

const mapper = new StagingSerpMapper();

// Map Oxylabs response to staging format
const stagingRecord = mapper.mapToStagingFormat(oxylabsResponse, requestParams);

// Insert into database
const result = await mapper.insertIntoStaging(stagingRecord);
```

### 2. One-Step Map and Insert

```javascript
const { mapAndInsertOxylabsResponse } = require('./utils/staging-serps-mapper.cjs');

const result = await mapAndInsertOxylabsResponse(oxylabsResponse, requestParams);

if (result.success) {
  console.log(`Staged with ID: ${result.stagingId}`);
} else {
  console.error(`Error: ${result.error}`);
}
```

## Data Mapping Examples

### 1. Realtime API Response

```javascript
// Raw Oxylabs realtime response
const realtimeResponse = {
  results: [
    {
      content: {
        url: "https://www.google.com/search?q=restaurants+miami",
        results: {
          paid: [
            {
              pos: 1,
              url: "https://example-restaurant.com",
              title: "Best Restaurant in Miami",
              desc: "Authentic cuisine and great service",
              url_shown: "example-restaurant.com",
              pos_overall: 1,
              price: "$25-40",
              rating: 4.5,
              review_count: 120
            }
          ],
          organic: [
            {
              pos: 1,
              url: "https://yelp.com/restaurants-miami",
              title: "Top Restaurants in Miami - Yelp",
              desc: "Find the best restaurants in Miami"
            }
          ]
        }
      },
      status_code: 200,
      created_at: "2025-06-12T10:30:00Z"
    }
  ]
};

// Request parameters
const requestParams = {
  query: "restaurants miami",
  location: "Miami, FL",
  source: "google_ads",
  device: "desktop",
  locale: "en-US",
  jobId: "realtime-12345"
};

// Map to staging format
const staged = mapper.mapToStagingFormat(realtimeResponse, requestParams);
```

### 2. Batch API Response

```javascript
// Raw Oxylabs batch response
const batchResponse = {
  job: {
    id: "batch-67890",
    query: "coffee shops near me",
    geo_location: "New York, NY",
    device: "desktop",
    created_at: "2025-06-12T14:20:00Z",
    status: "done",
    user_agent_type: "desktop",
    context: [
      { key: "ad_extraction", value: "true" }
    ]
  },
  results: [
    {
      content: {
        url: "https://www.google.com/search?q=coffee+shops+near+me",
        results: {
          paid: [
            {
              pos: 1,
              url: "https://starbucks.com",
              title: "Starbucks Coffee",
              desc: "Fresh coffee daily",
              url_shown: "starbucks.com",
              sitelinks: [
                {
                  title: "Store Locator",
                  url: "https://starbucks.com/store-locator"
                }
              ]
            }
          ]
        }
      }
    }
  ]
};

// Automatically extracts job data
const staged = mapper.mapToStagingFormat(batchResponse);
```

## Mapped Output Structure

The mapper produces a staging record with the following structure:

```javascript
{
  // Required fields
  job_id: "batch-67890",
  query: "coffee shops near me", 
  location: "New York, NY",
  timestamp: "2025-06-12T14:20:00Z",
  status: "pending",
  
  // Enhanced content
  content: {
    job: { /* original job data */ },
    results: [
      {
        content: {
          url: "...",
          results: {
            paid: [ /* enhanced paid ads */ ],
            organic: [ /* enhanced organic results */ ],
            local: [],
            shopping: [],
            related_searches: []
          }
        }
      }
    ]
  },
  
  // Optional fields  
  device: "desktop",
  locale: "en-US",
  pages: 1,
  start_page: 1,
  landing_pages: ["https://starbucks.com"],
  extra_params: {
    user_agent_type: "desktop",
    context: [...]
  }
}
```

## Enhanced Ad Structure

The mapper enhances paid ads with comprehensive field mapping:

```javascript
{
  // Core fields
  pos: 1,
  url: "https://example.com",
  title: "Ad Title",
  desc: "Ad description",
  url_shown: "example.com",
  pos_overall: 1,
  
  // Additional fields
  price: "$25-40",
  rating: 4.5,
  review_count: 120,
  sitelinks: [...],
  call_extension: "...",
  location: "...",
  phone: "...",
  address: "...",
  
  // Technical fields
  data_rw: "...",
  data_pcu: "...",
  tracking_url: "...",
  ad_type: "..."
}
```

## Error Handling

### Validation

```javascript
const stagingRecord = mapper.mapToStagingFormat(response, params);
const validation = mapper.validateStagingRecord(stagingRecord);

if (!validation.isValid) {
  console.error('Validation errors:', validation.errors);
}
```

### Duplicate Job Check

```javascript
const existingCheck = await mapper.checkExistingJob(jobId);

if (existingCheck.exists) {
  console.log('Job already exists:', existingCheck.record);
} else {
  // Proceed with insertion
  const result = await mapper.mapAndInsert(response, params);
}
```

## Integration Examples

### 1. Single Query Handler

```javascript
// In single-query-handler.cjs
const { mapAndInsertOxylabsResponse } = require('../../utils/staging-serps-mapper.cjs');

async function submitSingleQuery(query, location) {
  // ... make Oxylabs API call ...
  
  const requestParams = {
    query,
    location,
    source: "google_ads",
    device: "desktop",
    locale: "en-US",
    jobId: `realtime-${Date.now()}`
  };
  
  const stagingResult = await mapAndInsertOxylabsResponse(response.data, requestParams);
  
  if (stagingResult.success) {
    console.log(`✅ Staged with ID: ${stagingResult.stagingId}`);
    return { success: true, stagingId: stagingResult.stagingId };
  } else {
    console.error(`❌ Staging failed: ${stagingResult.error}`);
    return { success: false, error: stagingResult.error };
  }
}
```

### 2. Batch Processor

```javascript
// In batch-processor.cjs
const { StagingSerpMapper } = require('../../utils/staging-serps-mapper.cjs');

async function processBatchResults(jobResults) {
  const mapper = new StagingSerpMapper();
  
  for (const result of jobResults) {
    // Check if already processed
    const existing = await mapper.checkExistingJob(result.job.id);
    if (existing.exists) {
      console.log(`Job ${result.job.id} already processed, skipping`);
      continue;
    }
    
    // Map and insert
    const stagingResult = await mapper.mapAndInsert(result);
    if (stagingResult.success) {
      console.log(`✅ Job ${result.job.id} staged successfully`);
    } else {
      console.error(`❌ Job ${result.job.id} staging failed: ${stagingResult.error}`);
    }
  }
}
```

## Database Trigger Integration

After insertion into `staging_serps`, the database trigger `process_staged_serp_trigger` automatically:

1. Validates the content structure
2. Extracts and normalizes advertiser information
3. Creates records in `serps` table
4. Creates records in `ads` table  
5. Creates relationships in `serp_ads` table
6. Updates the staging record status to 'processed' or 'error'

The enhanced content structure ensures the trigger has access to all necessary data for proper processing.

## Best Practices

### 1. Always Validate Before Insert

```javascript
const stagingRecord = mapper.mapToStagingFormat(response, params);
const validation = mapper.validateStagingRecord(stagingRecord);

if (validation.isValid) {
  await mapper.insertIntoStaging(stagingRecord);
} else {
  throw new Error(`Invalid staging record: ${validation.errors.join(', ')}`);
}
```

### 2. Handle Duplicate Jobs

```javascript
const existing = await mapper.checkExistingJob(jobId);
if (existing.exists) {
  if (existing.record.status === 'error') {
    // Could reprocess error cases
    console.log('Job exists but in error state, consider reprocessing');
  } else {
    console.log('Job already processed successfully');
    return existing.record;
  }
}
```

### 3. Monitor Content Size

```javascript
const contentSize = JSON.stringify(stagingRecord.content).length;
if (contentSize > 10 * 1024 * 1024) { // 10MB
  console.warn('Large content size detected:', contentSize, 'bytes');
}
```

### 4. Preserve Original Response

The mapper preserves the complete original response in the `content` field while enhancing it with better structure. This ensures no data is lost and enables future processing improvements without re-scraping.

## CLI Testing

Test the mapper directly:

```bash
cd /workspaces/advault/SCRAPI
node utils/staging-serps-mapper.cjs
```

This runs the built-in test with example data to verify the mapping functionality.
