# SCRAPI System Usage Instructions

## 📋 Table of Contents
1. [Quick Start Guide](#quick-start-guide) ⚡
2. [System Overview](#system-overview)
3. [Prerequisites](#prerequisites)
4. [Environment Setup](#environment-setup)
5. [Core Usage Patterns](#core-usage-patterns)
6. [Entry Points](#entry-points)
7. [Configuration Management](#configuration-management)
8. [Data Flow](#data-flow)
9. [Testing & Validation](#testing--validation)
10. [Common Use Cases](#common-use-cases) 🎯
11. [Monitoring & Troubleshooting](#monitoring--troubleshooting)
12. [Advanced Usage](#advanced-usage)
13. [Best Practices](#best-practices)
14. [API Reference](#api-reference) 📚

---

## ⚡ Quick Start Guide

**Get up and running in 5 minutes!**

### Step 1: Environment Check (30 seconds)
```bash
cd /workspaces/advault/SCRAPI
node config/validation/validate-all.cjs
```
✅ **Expected**: All configuration checks pass

### Step 2: Run Your First Search (2 minutes)
```bash
# Test the complete pipeline with a simple query
node test-basic-automation.cjs
```
✅ **Expected**: Search completes successfully with timing report

### Step 3: Try a Real Search (2 minutes)
```bash
# Search for restaurants in your city
node entry-points/single-query/single-query-handler.cjs "restaurants near me" "New York, NY"

# Or try a different business type
node entry-points/single-query/single-query-handler.cjs "dental clinics" "Los Angeles, CA"
```
✅ **Expected**: Results saved to database and files generated

### Step 4: Verify Results (30 seconds)
```bash
# Check the latest output files
ls -la output-staging/jobs/ | head -5
```
✅ **Expected**: See new folders with search results

**🎉 Congratulations!** Your SCRAPI system is working. Continue reading for advanced usage.

---

## 🎯 System Overview

**SCRAPI** is a comprehensive search data collection and processing system that automates:
- **Search Query Execution** via Google Ads API
- **Web Page Scraping** via Oxylabs proxy service
- **Data Processing & Extraction** using intelligent parsing
- **Database Storage** via Supabase integration
- **Batch Processing** with job management and scheduling

### Architecture Components
```
Search Query → Web Scraping → Data Processing → Database Storage
     ↓              ↓              ↓              ↓
  Google Ads    Oxylabs API    Data Parser    Supabase DB
```

---

## ✅ Prerequisites

### Required Services
1. **Supabase Account** - Database and API backend
2. **Oxylabs Account** - Web scraping proxy service
3. **Node.js** - Runtime environment (v16+ recommended)

### System Requirements
- Linux/macOS/Windows with terminal access
- Internet connection for API services
- Minimum 2GB RAM for batch processing
- 1GB+ disk space for data storage

---

## 🔧 Environment Setup

### 1. Environment Files Configuration

The system uses two environment files:

#### Root Environment File (`/workspaces/advault/.env`)
Contains **global credentials** for all services:
```bash
# Supabase Configuration
SUPABASE_URL=your_supabase_url
SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# Oxylabs Configuration
OXYLABS_USERNAME=your_username
OXYLABS_PASSWORD=your_password

# Optional: Vite Frontend Variables
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_anon_key
```

#### SCRAPI Local Environment File (`/workspaces/advault/SCRAPI/.env`)
Contains **local configuration** and operational settings:
```bash
# Processing Configuration
MAX_CONCURRENT_JOBS=5
BATCH_SIZE=100
RETRY_ATTEMPTS=3

# Output Configuration
OUTPUT_FORMAT=json
ENABLE_LOGGING=true
LOG_LEVEL=info
```

### 2. Verify Configuration
```bash
cd /workspaces/advault/SCRAPI
node config/environment.cjs
```

---

## 🚀 Core Usage Patterns

### Pattern 1: Single Search Query
**Use Case**: Test individual searches or process one-off queries

```bash
# Navigate to SCRAPI directory
cd /workspaces/advault/SCRAPI

# Run single query
node entry-points/single-query/single-query-handler.cjs "plumbers near me" "New York, NY"
```

### Pattern 2: Batch Processing
**Use Case**: Process multiple queries efficiently

```bash
# Start batch processor
node entry-points/batch-processing/batch-processor.cjs

# Or run predefined batch
node entry-points/batch-processing/run-batch.cjs batch-001
```

### Pattern 3: Scheduled Automation
**Use Case**: Automated recurring data collection

```bash
# Start scheduler
node entry-points/scheduled-automation/scheduler.cjs

# Add scheduled job
node job-management/scheduling/schedule-manager.cjs add "daily-plumbers" "0 9 * * *"
```

---

## 🎛️ Entry Points

### 1. Single Query Processing
```bash
# Basic single query
node entry-points/single-query/single-query-handler.cjs

# With parameters
node entry-points/single-query/single-query-handler.cjs "keyword" "location"

# Interactive mode
node entry-points/single-query/interactive-query.cjs
```

### 2. Batch Processing
```bash
# Process from file
node entry-points/batch-processing/batch-processor.cjs --file queries.json

# Process from database queue
node entry-points/batch-processing/batch-processor.cjs --queue pending

# Resume failed batch
node entry-points/batch-processing/batch-processor.cjs --resume batch-001
```

### 3. Monitoring Dashboard
```bash
# Start monitoring dashboard
node entry-points/monitoring/dashboard.cjs

# Check system health
node entry-points/monitoring/health-check.cjs

# View job status
node monitoring/job-status-dashboard.cjs
```

### 4. CLI Interface
```bash
# Interactive CLI
node cli/main-cli.cjs

# Direct commands
node cli/main-cli.cjs search "keyword" "location"
node cli/main-cli.cjs status
node cli/main-cli.cjs batch --file queries.json
```

---

## ⚙️ Configuration Management

### Environment Validation
```bash
# Validate all configurations
node config/validation/validate-all.cjs

# Test API connections
node config/validation/test-connections.cjs

# Check database schema
node config/validation/database-check.cjs
```

### Configuration Updates
```bash
# Update Supabase settings
node config/environment.cjs --update-supabase

# Update Oxylabs settings
node config/environment.cjs --update-oxylabs

# Reload configuration
node config/environment.cjs --reload
```

---

## 📊 Data Flow

### Complete Pipeline Flow
```
1. Query Input → 2. Search Execution → 3. URL Collection → 4. Web Scraping → 5. Data Processing → 6. Database Storage
```

#### 1. Query Input Methods
- **CLI**: Direct command line input
- **File**: JSON/CSV file upload
- **API**: REST API endpoints
- **Scheduled**: Automated cron jobs

#### 2. Search Execution
- Uses Google Ads API for search results
- Extracts business URLs and metadata
- Handles pagination and rate limiting

#### 3. Web Scraping
- Routes URLs through Oxylabs proxy service
- Handles JavaScript rendering
- Manages retry logic and error handling

#### 4. Data Processing
- Extracts business information
- Standardizes data formats
- Validates and cleans data

#### 5. Database Storage
- Stores in Supabase tables
- Maintains data relationships
- Enables querying and reporting

---

## 🧪 Testing & Validation

### Comprehensive Test Suite
```bash
# Run all tests
node test-complete-pipeline.cjs

# Test basic automation
node test-basic-automation.cjs

# Test specific components
node core/data-collection/test-google-ads.cjs
node api/oxylabs/test-oxylabs.cjs
node api/supabase/test-database.cjs
```

### Test Categories
1. **Unit Tests**: Individual component testing
2. **Integration Tests**: End-to-end workflow testing
3. **Performance Tests**: Load and stress testing
4. **API Tests**: External service connectivity

### Sample Test Results
```
✅ Search Execution: PASSED (2.3s)
✅ URL Extraction: PASSED (1.1s)
✅ Web Scraping: PASSED (8.7s)
✅ Data Processing: PASSED (1.8s)
✅ Database Storage: PASSED (0.9s)
Total Pipeline Time: 14.8s
```

---

## 📈 Monitoring & Troubleshooting

### Real-time Monitoring
```bash
# Start monitoring dashboard
node monitoring/job-status-dashboard.cjs

# Check batch status
node monitoring/batch-status-dashboard.cjs

# View system metrics
node monitoring/metrics/system-metrics.cjs
```

### Log Analysis
```bash
# View recent logs
tail -f output-staging/logs/scrapi.log

# Search logs for errors
grep "ERROR" output-staging/logs/*.log

# View job-specific logs
cat output-staging/logs/job-batch-001.log
```

### Common Issues & Solutions

#### ❌ Issue: "Configuration validation failed"
**Solution**: 
```bash
node config/validation/validate-all.cjs
# Fix any reported configuration errors
```

#### ❌ Issue: "Oxylabs authentication failed"
**Solution**:
```bash
# Verify credentials in .env file
node api/oxylabs/test-connection.cjs
```

#### ❌ Issue: "Database connection timeout"
**Solution**:
```bash
# Check Supabase service status
node api/supabase/test-connection.cjs
```

#### ❌ Issue: "Job stuck in processing"
**Solution**:
```bash
# Reset job status
node job-management/tracking/reset-job.cjs job-id
```

#### ❌ Issue: "Rate limit exceeded"
**Symptoms**: Requests failing with 429 errors, slow processing
**Solution**:
```bash
# Check current rate limits
node monitoring/metrics/rate-limit-status.cjs

# Adjust processing speed
node config/environment.cjs --set-delay 5000  # 5 second delay between requests

# Use distributed processing
node entry-points/batch-processing/distributed-processor.cjs --workers 3
```

#### ❌ Issue: "Memory usage too high"
**Symptoms**: System slowdown, process crashes
**Solution**:
```bash
# Monitor memory usage
node monitoring/metrics/memory-usage.cjs

# Reduce batch size
node config/environment.cjs --set-batch-size 50

# Clear cache
node utils/cache-cleaner.cjs --force
```

#### ❌ Issue: "Disk space running low"
**Symptoms**: Write errors, failed file saves
**Solution**:
```bash
# Check disk usage
df -h output-staging/

# Archive old files
node utils/file-archiver.cjs --archive-older-than 30days

# Clean temporary files
node utils/cleanup-temp-files.cjs
```

#### ❌ Issue: "Scraping blocked by anti-bot"
**Symptoms**: 403 errors, captcha responses
**Solution**:
```bash
# Rotate proxy endpoints
node api/oxylabs/rotate-endpoints.cjs

# Increase delays between requests
node config/environment.cjs --set-scrape-delay 10000

# Use different user agents
node api/oxylabs/update-user-agents.cjs
```

#### ❌ Issue: "Database connection pool exhausted"
**Symptoms**: Connection timeout errors
**Solution**:
```bash
# Reset connection pool
node api/supabase/reset-pool.cjs

# Increase pool size
node config/environment.cjs --set-pool-size 20

# Check for connection leaks
node api/supabase/debug-connections.cjs
```

### Performance Monitoring

#### Real-time Performance Dashboard
```bash
# Start performance monitoring
node monitoring/performance/real-time-dashboard.cjs

# Monitor specific metrics
node monitoring/performance/cpu-monitor.cjs
node monitoring/performance/memory-monitor.cjs
node monitoring/performance/network-monitor.cjs
```

#### Performance Alerts
```bash
# Set up automatic alerts
node monitoring/alerts/setup-alerts.cjs --cpu-threshold 80 --memory-threshold 85

# Test alert system
node monitoring/alerts/test-alerts.cjs
```

### Optimization Techniques

#### 1. Batch Size Optimization
```bash
# Test different batch sizes
for size in 25 50 100 200; do
  echo "Testing batch size: $size"
  time node entry-points/batch-processing/batch-processor.cjs --batch-size $size --test-mode
done
```

#### 2. Concurrent Processing Tuning
```bash
# Find optimal concurrency level
node utils/performance/concurrency-tester.cjs --min 1 --max 10 --step 1
```

#### 3. Database Query Optimization
```bash
# Analyze slow queries
node api/supabase/query-analyzer.cjs --slow-threshold 5000

# Optimize indexes
node api/supabase/optimize-indexes.cjs
```
---

## 🚀 Advanced Usage

### Custom Query Templates
```bash
# Create custom query template
node b-keyword-feeder/keyword-feeder.js --template custom-template.json

# Use industry-specific templates
node b-keyword-feeder/keyword-feeder.js --template home-services
node b-keyword-feeder/keyword-feeder.js --template healthcare
```

### Batch Scheduling
```bash
# Schedule recurring batches
node b-keyword-feeder/batch-scheduler.js --schedule "0 */6 * * *"

# Schedule city-specific jobs
node b-keyword-feeder/schedule-all-city-jobs.js
```

### Data Export & Reporting
```bash
# Generate comprehensive reports
node reports/generators/business-report.cjs --batch batch-001

# Export to CSV
node utils/export-csv.cjs --table businesses --output export.csv

# Archive old data
node utils/file-archiver-scheduler.js
```

### API Integration
```bash
# Start API server
node api/server.cjs

# API endpoints available at:
# POST /api/search - Submit search query
# GET /api/status/:jobId - Check job status
# GET /api/results/:batchId - Get batch results
```

---

## 💡 Best Practices

### Performance Optimization
1. **Batch Size**: Keep batches under 1000 queries for optimal performance
2. **Concurrent Jobs**: Limit to 5-10 concurrent jobs to avoid rate limiting
3. **Resource Management**: Monitor memory usage during large batches
4. **Database Connections**: Use connection pooling for high-volume operations

### Data Quality
1. **Validation**: Always validate input data before processing
2. **Deduplication**: Check for duplicate queries to avoid redundant processing
3. **Error Handling**: Implement retry logic for transient failures
4. **Data Cleanup**: Regularly clean and archive old data

### Security
1. **Environment Variables**: Never commit .env files to version control
2. **API Keys**: Rotate API keys regularly
3. **Database Access**: Use service role keys only for administrative tasks
4. **Logging**: Avoid logging sensitive information

### Monitoring
1. **Health Checks**: Regularly run health checks on all services
2. **Performance Metrics**: Monitor processing times and success rates
3. **Error Tracking**: Set up alerts for high error rates
4. **Resource Usage**: Monitor disk space and memory usage

---

## 📞 Support & Resources

### Quick Reference Commands
```bash
# System status
node config/environment.cjs --status

# Test all connections
node config/validation/test-connections.cjs

# View active jobs
node job-management/tracking/list-jobs.cjs

# Emergency stop
node job-management/queue/stop-all-jobs.cjs
```

### Documentation Files
- `/claude/README.md` - System overview
- `/claude/MIGRATION-SUMMARY.md` - System architecture details
- `/claude/COMPREHENSIVE-TESTING-SUCCESS-REPORT.md` - Test results
- `/executions.MD` - Execution history and examples

### Log Locations
- System logs: `/output-staging/logs/`
- Job logs: `/output-staging/jobs/`
- Error logs: `/output-staging/logs/errors/`
- Performance logs: `/monitoring/metrics/`

---

## 🎉 Getting Started Checklist

### ✅ Phase 1: Initial Setup (15 minutes)
1. **Environment Configuration**
   - [ ] Copy `.env.example` to `.env` in both root and SCRAPI directories
   - [ ] Add your Supabase credentials to root `.env`
   - [ ] Add your Oxylabs credentials to root `.env`
   - [ ] Configure SCRAPI-specific settings in `SCRAPI/.env`
   - [ ] Run `node config/validation/validate-all.cjs` ✅ Should show all green

2. **Dependency Check**
   - [ ] Verify Node.js version: `node --version` (should be v16+)
   - [ ] Install dependencies: `npm install` (if not already done)
   - [ ] Test database connection: `node api/supabase/test-connection.cjs`
   - [ ] Test scraping service: `node api/oxylabs/test-connection.cjs`

### ✅ Phase 2: First Search (10 minutes)
3. **System Validation**
   - [ ] Run comprehensive test: `node test-complete-pipeline.cjs`
   - [ ] All 10 tests should pass ✅
   - [ ] Check output folder: `ls -la output-staging/jobs/`
   - [ ] Verify database records in Supabase dashboard

4. **Your First Real Search**
   - [ ] Choose a keyword and location (e.g., "restaurants", "your city")
   - [ ] Run: `node entry-points/single-query/single-query-handler.cjs "restaurants" "Your City, ST"`
   - [ ] Wait for completion (should take 10-30 seconds)
   - [ ] Check results in `output-staging/jobs/` folder
   - [ ] Verify data quality and completeness

### ✅ Phase 3: Batch Processing (20 minutes)
5. **Small Batch Test**
   - [ ] Create test batch file with 5-10 queries
   - [ ] Run batch: `node entry-points/batch-processing/batch-processor.cjs --file your-batch.json`
   - [ ] Monitor progress: `node monitoring/job-status-dashboard.cjs`
   - [ ] Review batch results and processing times

6. **System Monitoring**
   - [ ] Learn monitoring commands: `node monitoring/job-status-dashboard.cjs`
   - [ ] Check system health: `node monitoring/health-check.cjs`
   - [ ] Review log files: `tail -f output-staging/logs/scrapi.log`

### ✅ Phase 4: Production Setup (30 minutes)
7. **Performance Optimization**
   - [ ] Adjust batch size based on your system: `node config/environment.cjs --set-batch-size 50`
   - [ ] Set appropriate concurrency: `node config/environment.cjs --set-concurrency 5`
   - [ ] Configure retry settings: `node config/environment.cjs --set-retries 3`

8. **Backup and Maintenance**
   - [ ] Set up automatic backups: `node utils/backup/setup-auto-backup.cjs`
   - [ ] Configure log rotation: `node utils/logging/setup-log-rotation.cjs`
   - [ ] Test emergency stop: `node job-management/queue/emergency-stop.cjs`

9. **Advanced Features** (Optional)
   - [ ] Set up scheduled jobs: `node job-management/scheduling/schedule-manager.cjs`
   - [ ] Configure Slack notifications: `node integrations/slack/setup-webhook.js`
   - [ ] Create custom templates: Copy and modify files in `templates/`
   - [ ] Set up distributed processing: `node entry-points/distributed/coordinator.cjs`

### 🎯 Success Criteria
By the end of setup, you should be able to:
- ✅ Run single searches in under 30 seconds
- ✅ Process batches of 50+ queries successfully
- ✅ Monitor system health and job status
- ✅ Access results in both files and database
- ✅ Handle errors and retry failed jobs

### 📞 If You Get Stuck
1. **Check the logs**: `tail -f output-staging/logs/scrapi.log`
2. **Run diagnostics**: `node config/validation/full-diagnostic.cjs`
3. **Review this FAQ**: [Frequently Asked Questions](#frequently-asked-questions)
4. **Test individual components**: Use the test files in each module
5. **Reset if needed**: `node utils/reset/soft-reset.cjs` (preserves data)

---

## 🎯 Common Use Cases

### Use Case 1: Local Business Directory Building
**Scenario**: Build a directory of plumbers in major US cities

```bash
# Create batch file with multiple cities
cat > plumber-batch.json << EOF
[
  {"keyword": "plumbers near me", "location": "New York, NY"},
  {"keyword": "plumbers near me", "location": "Los Angeles, CA"},
  {"keyword": "plumbers near me", "location": "Chicago, IL"},
  {"keyword": "plumbers near me", "location": "Houston, TX"},
  {"keyword": "plumbers near me", "location": "Phoenix, AZ"}
]
EOF

# Process the batch
node entry-points/batch-processing/batch-processor.cjs --file plumber-batch.json
```

### Use Case 2: Competitor Analysis
**Scenario**: Analyze competitors in the dental industry

```bash
# Search for dental clinics in target market
node entry-points/single-query/single-query-handler.cjs "dental clinics" "Miami, FL"

# Search for specialized dental services
node entry-points/single-query/single-query-handler.cjs "orthodontists" "Miami, FL"
node entry-points/single-query/single-query-handler.cjs "cosmetic dentistry" "Miami, FL"

# Generate competitor report
node reports/generators/competitor-analysis.cjs --industry dental --location "Miami, FL"
```

### Use Case 3: Market Research Automation
**Scenario**: Daily monitoring of home services market

```bash
# Set up automated daily collection
node job-management/scheduling/schedule-manager.cjs add "daily-home-services" "0 6 * * *" \
  --template home-services --location "Seattle, WA"

# Monitor progress
node monitoring/job-status-dashboard.cjs
```

### Use Case 4: Lead Generation
**Scenario**: Generate leads for B2B services

```bash
# Search for businesses that might need your services
node entry-points/single-query/single-query-handler.cjs "small businesses" "Austin, TX"
node entry-points/single-query/single-query-handler.cjs "startups" "Austin, TX"
node entry-points/single-query/single-query-handler.cjs "restaurants" "Austin, TX"

# Export leads for CRM import
node utils/export-csv.cjs --filter "business_type=restaurant" --output restaurant-leads.csv
```

### Use Case 5: Regional Market Expansion
**Scenario**: Research new markets before business expansion

```bash
# Create comprehensive market analysis
cat > market-research.json << EOF
[
  {"keyword": "fitness centers", "location": "Denver, CO"},
  {"keyword": "gyms", "location": "Denver, CO"},
  {"keyword": "personal trainers", "location": "Denver, CO"},
  {"keyword": "yoga studios", "location": "Denver, CO"},
  {"keyword": "crossfit", "location": "Denver, CO"}
]
EOF

# Process and generate market report
node entry-points/batch-processing/batch-processor.cjs --file market-research.json
node reports/generators/market-analysis.cjs --location "Denver, CO" --industry fitness
```

---

## 📚 API Reference

### REST API Endpoints

Start the API server:
```bash
node api/server.cjs
# Server runs on http://localhost:3000
```

#### POST /api/search
Submit a new search query

**Request Body:**
```json
{
  "keyword": "restaurants near me",
  "location": "New York, NY",
  "options": {
    "maxResults": 100,
    "includeReviews": true,
    "scrapeContent": true
  }
}
```

**Response:**
```json
{
  "success": true,
  "jobId": "job-abc123",
  "estimatedTime": "15-30 seconds",
  "message": "Search job queued successfully"
}
```

#### GET /api/status/:jobId
Check the status of a search job

**Response:**
```json
{
  "jobId": "job-abc123",
  "status": "completed",
  "progress": 100,
  "startTime": "2024-01-15T10:30:00Z",
  "endTime": "2024-01-15T10:30:45Z",
  "resultsCount": 87,
  "downloadUrl": "/api/results/job-abc123/download"
}
```

#### GET /api/results/:jobId
Get the results of a completed search job

**Response:**
```json
{
  "jobId": "job-abc123",
  "results": [
    {
      "businessName": "Tony's Pizza",
      "address": "123 Main St, New York, NY",
      "phone": "(555) 123-4567",
      "website": "https://tonyspizza.com",
      "rating": 4.5,
      "reviewCount": 342
    }
  ],
  "metadata": {
    "totalResults": 87,
    "searchKeyword": "restaurants near me",
    "searchLocation": "New York, NY",
    "processedAt": "2024-01-15T10:30:45Z"
  }
}
```

#### POST /api/batch
Submit a batch of search queries

**Request Body:**
```json
{
  "batchName": "restaurant-research",
  "queries": [
    {"keyword": "restaurants", "location": "New York, NY"},
    {"keyword": "restaurants", "location": "Los Angeles, CA"}
  ],
  "options": {
    "priority": "normal",
    "notifyOnComplete": true
  }
}
```

#### GET /api/batches
List all batch jobs

**Response:**
```json
{
  "batches": [
    {
      "batchId": "batch-xyz789",
      "name": "restaurant-research",
      "status": "processing",
      "progress": 65,
      "totalQueries": 10,
      "completedQueries": 6,
      "createdAt": "2024-01-15T10:00:00Z"
    }
  ]
}
```

### Configuration API

#### GET /api/config/status
Get system configuration status

**Response:**
```json
{
  "system": "healthy",
  "database": "connected",
  "scraping": "operational",
  "queueStatus": {
    "pending": 5,
    "processing": 2,
    "completed": 1250,
    "failed": 3
  }
}
```

#### POST /api/config/validate
Validate system configuration

**Response:**
```json
{
  "valid": true,
  "checks": {
    "environment": "passed",
    "database": "passed",
    "apis": "passed"
  }
}
```

### Webhook Configuration

Set up webhooks to receive notifications:

```bash
# Configure webhook endpoint
curl -X POST http://localhost:3000/api/webhooks \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://your-app.com/webhooks/scrapi",
    "events": ["job.completed", "batch.finished", "job.failed"]
  }'
```

### SDK Usage Examples

#### Node.js SDK
```javascript
const Scrapi = require('./api/sdk/scrapi-sdk.js');

const client = new Scrapi({
  apiUrl: 'http://localhost:3000',
  apiKey: 'your-api-key'
});

// Submit search
const job = await client.search({
  keyword: 'restaurants near me',
  location: 'New York, NY'
});

// Wait for completion
const results = await client.waitForResults(job.jobId);
console.log(`Found ${results.length} businesses`);
```

#### Python SDK
```python
from scrapi_sdk import ScrapiClient

client = ScrapiClient(
    api_url='http://localhost:3000',
    api_key='your-api-key'
)

# Submit search
job = client.search(
    keyword='restaurants near me',
    location='New York, NY'
)

# Get results
results = client.get_results(job['jobId'])
print(f"Found {len(results)} businesses")
```

### Error Codes

| Code | Description | Solution |
|------|-------------|----------|
| 400 | Invalid request format | Check request body syntax |
| 401 | Authentication failed | Verify API key |
| 429 | Rate limit exceeded | Reduce request frequency |
| 500 | Internal server error | Check system logs |
| 503 | Service unavailable | Check service dependencies |

### Rate Limits

- **Search API**: 100 requests per hour
- **Batch API**: 10 batches per hour
- **Status API**: 1000 requests per hour
- **Results API**: 500 requests per hour

For higher limits, contact support or use the direct CLI interface.

---

## 🎛️ Advanced Configuration Examples

### Custom Search Templates
```bash
# Create industry-specific templates
cat > templates/healthcare-template.json << EOF
{
  "name": "healthcare-template",
  "keywords": [
    "doctors", "medical clinics", "hospitals", "urgent care",
    "specialists", "family medicine", "pediatricians"
  ],
  "locations": ["${city}, ${state}"],
  "options": {
    "includeReviews": true,
    "includeHours": true,
    "includeInsurance": true,
    "maxResults": 200
  }
}
EOF

# Use template
node b-keyword-feeder/keyword-feeder.js --template healthcare-template --city "Boston" --state "MA"
```

### Environment-Specific Configurations
```bash
# Development environment
cat > config/environments/development.json << EOF
{
  "processing": {
    "batchSize": 10,
    "maxConcurrency": 2,
    "retryAttempts": 1
  },
  "logging": {
    "level": "debug",
    "enableFileLogging": true
  }
}
EOF

# Production environment
cat > config/environments/production.json << EOF
{
  "processing": {
    "batchSize": 100,
    "maxConcurrency": 8,
    "retryAttempts": 3
  },
  "logging": {
    "level": "info",
    "enableFileLogging": true,
    "enableErrorAlerts": true
  }
}
EOF

# Load environment-specific config
node config/environment.cjs --load-environment production
```

---

## 🔌 Integration Examples

### Slack Integration
```bash
# Send completion notifications to Slack
node integrations/slack/setup-webhook.js --channel "#data-team" \
  --events "batch.completed,job.failed"

# Test notification
node integrations/slack/test-notification.js
```

### Google Sheets Integration
```bash
# Export results to Google Sheets
node integrations/google-sheets/export-results.js \
  --batch-id "batch-001" \
  --sheet-id "your-sheet-id" \
  --worksheet "Results"
```

### Zapier Integration
```bash
# Set up Zapier webhook
node integrations/zapier/setup-webhook.js \
  --trigger-url "https://hooks.zapier.com/hooks/catch/..." \
  --events "job.completed"
```

---

## ❓ Frequently Asked Questions

### General Usage

**Q: How many searches can I run per day?**
A: This depends on your Oxylabs plan and rate limits. Typical setups can handle 1,000-10,000 searches per day. Check your plan limits and adjust `MAX_CONCURRENT_JOBS` accordingly.

**Q: What data do I get from each search?**
A: For each business, you typically get: name, address, phone, website, rating, review count, business hours, and additional metadata depending on the source.

**Q: Can I search in specific geographic areas?**
A: Yes! Use specific city/state combinations like "Miami, FL" or ZIP codes like "90210". More specific locations give better results.

**Q: How long does a typical search take?**
A: Single searches: 10-30 seconds. Batch of 100: 15-45 minutes. Large batches of 1000+: 2-8 hours depending on system load.

### Technical Questions

**Q: Can I run SCRAPI on multiple servers?**
A: Yes! Use the distributed processing mode:
```bash
# On server 1
node entry-points/distributed/coordinator.cjs

# On server 2
node entry-points/distributed/worker.cjs --coordinator-url http://server1:3000
```

**Q: How do I backup my data?**
A: Use the built-in backup utilities:
```bash
# Backup database
node utils/backup/database-backup.cjs --output backups/$(date +%Y%m%d).sql

# Backup files
node utils/backup/file-backup.cjs --archive backups/files-$(date +%Y%m%d).tar.gz
```

**Q: Can I customize the data extraction?**
A: Yes! Edit the parsing rules in:
```bash
# Custom extraction rules
cp core/data-processing/parsers/business-parser.cjs core/data-processing/parsers/custom-parser.cjs
# Edit custom-parser.cjs with your rules
node config/environment.cjs --set-parser custom-parser
```

**Q: How do I handle different business types?**
A: Use industry-specific templates:
```bash
# Available templates
ls templates/
# restaurants.json, healthcare.json, home-services.json, etc.

# Use template
node b-keyword-feeder/keyword-feeder.js --template restaurants
```

### Troubleshooting

**Q: Why are my searches returning no results?**
A: Common causes:
1. Location too specific (try broader areas)
2. Keyword too niche (try more general terms)
3. Rate limiting (check logs for 429 errors)
4. API issues (run `node config/validation/test-connections.cjs`)

**Q: How do I handle failed jobs?**
A: Use the job management tools:
```bash
# List failed jobs
node job-management/tracking/list-failed-jobs.cjs

# Retry specific job
node job-management/queue/retry-job.cjs job-abc123

# Retry all failed jobs from last 24 hours
node job-management/queue/retry-failed-batch.cjs --since 24h
```

**Q: My system is running slow. How do I optimize it?**
A: Performance optimization steps:
```bash
# 1. Check system resources
node monitoring/metrics/system-metrics.cjs

# 2. Reduce batch size
node config/environment.cjs --set-batch-size 50

# 3. Increase delays
node config/environment.cjs --set-delay 3000

# 4. Clean up old data
node utils/cleanup/archive-old-data.cjs --older-than 30days
```

### Data and Privacy

**Q: Is the scraped data legal to use?**
A: SCRAPI collects publicly available business information. Always comply with website terms of service and local laws. Consider adding attribution and respecting robots.txt files.

**Q: How do I ensure data quality?**
A: Use data validation tools:
```bash
# Validate business data
node utils/validation/validate-business-data.cjs --batch batch-001

# Remove duplicates
node utils/cleanup/dedup-businesses.cjs --table businesses

# Quality report
node reports/generators/data-quality-report.cjs
```

**Q: Can I export data to my CRM?**
A: Yes! Use the export utilities:
```bash
# Export to CSV
node utils/export-csv.cjs --filter "city=Miami" --output miami-businesses.csv

# Export to JSON for APIs
node utils/export-json.cjs --batch batch-001 --output results.json

# Direct CRM integration (if supported)
node integrations/crm/export-to-salesforce.js --batch batch-001
```

---

## 🎬 Interactive Demo

**New to SCRAPI?** Try the interactive demo to explore all features:

```bash
cd /workspaces/advault/SCRAPI
node demo.cjs
```

The demo includes:
- ⚡ Quick system test (30 seconds)
- 🏢 Real business search with your keywords
- 📦 Batch processing demonstration
- 📊 System monitoring and status
- 📚 Documentation browser

**Perfect for**: First-time users, training sessions, and feature exploration.

---

## 💪 You're Ready to Go!

**🚀 SCRAPI is now fully documented and ready for production use!**

### What You Can Do Now:
1. **Start Simple**: Run `node demo.cjs` for hands-on experience
2. **Go Live**: Use the [Quick Start Guide](#quick-start-guide) for immediate productivity  
3. **Scale Up**: Follow [Common Use Cases](#common-use-cases) for your specific needs
4. **Optimize**: Implement [Best Practices](#best-practices) for production
5. **Integrate**: Use the [API Reference](#api-reference) for custom integrations

### 🎯 Success Metrics:
- **Speed**: Single searches in 10-30 seconds
- **Scale**: Batch processing 1000+ queries efficiently  
- **Reliability**: 99%+ success rate with proper configuration
- **Quality**: Clean, structured business data ready for analysis

### 📞 Need Help?
1. **Quick Issues**: Check [FAQ](#frequently-asked-questions)
2. **Errors**: Review [Troubleshooting](#monitoring--troubleshooting)
3. **Performance**: Follow [Optimization](#best-practices) guides
4. **Advanced**: Explore [Advanced Usage](#advanced-usage) features

**Happy scraping! 🎉**

---

*Last updated: December 2024 | Version: 2.0.0 | Status: Production Ready*
