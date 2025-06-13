/*
# Create SCRAPI Database Schema

1. New Tables
  - `scrapi_batch_jobs` - Tracks batch job submissions
  - `scrapi_search_queries` - Individual search queries within a batch
  - `scrapi_serp_results` - Search engine results pages
  - `scrapi_google_ads` - Google ads extracted from SERPs
  - `scrapi_bing_ads` - Bing ads extracted from SERPs
  - `scrapi_google_ad_renderings` - HTML and PNG renderings of Google ad landing pages
  - `scrapi_bing_ad_renderings` - HTML and PNG renderings of Bing ad landing pages
  - `scrapi_advertisers` - Unique advertisers extracted from ads
  - `scrapi_job_logs` - Detailed logs for job execution
  - `scrapi_system_config` - System-wide configuration
  - `scrapi_api_keys` - For API authentication
  - `scrapi_worker_instances` - For distributed processing

2. Security
  - Enable Row Level Security (RLS) on all tables
  - Create policies for authenticated users and service role
*/

-- 1. Batch Jobs table - Tracks batch job submissions
CREATE TABLE IF NOT EXISTS scrapi_batch_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  created_by TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  total_queries INTEGER NOT NULL DEFAULT 0,
  completed_queries INTEGER NOT NULL DEFAULT 0,
  failed_queries INTEGER NOT NULL DEFAULT 0,
  config JSONB DEFAULT '{}'::jsonb,
  error_message TEXT
);

-- 2. Search Queries table - Individual search queries within a batch
CREATE TABLE IF NOT EXISTS scrapi_search_queries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  batch_id UUID NOT NULL REFERENCES scrapi_batch_jobs(id) ON DELETE CASCADE,
  query TEXT NOT NULL,
  location TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  oxylabs_job_id TEXT,
  error_message TEXT,
  priority INTEGER DEFAULT 0,
  retry_count INTEGER DEFAULT 0,
  max_retries INTEGER DEFAULT 3
);

-- 3. SERP Results table - Search engine results pages
CREATE TABLE IF NOT EXISTS scrapi_serp_results (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  query_id UUID NOT NULL REFERENCES scrapi_search_queries(id) ON DELETE CASCADE,
  oxylabs_job_id TEXT,
  query TEXT NOT NULL,
  location TEXT NOT NULL,
  timestamp TIMESTAMPTZ NOT NULL DEFAULT now(),
  total_results INTEGER,
  ads_count INTEGER DEFAULT 0,
  organic_count INTEGER DEFAULT 0,
  local_count INTEGER DEFAULT 0,
  content JSONB,
  raw_html TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 4a. Google Ads table - Individual Google ads extracted from SERPs
CREATE TABLE IF NOT EXISTS scrapi_google_ads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  serp_id UUID NOT NULL REFERENCES scrapi_serp_results(id) ON DELETE CASCADE,
  position INTEGER,
  position_overall INTEGER,
  title TEXT,
  description TEXT,
  display_url TEXT,
  destination_url TEXT,
  advertiser_domain TEXT,
  advertiser_name TEXT,
  phone TEXT,
  sitelinks JSONB,
  extensions JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 4b. Bing Ads table - Individual Bing ads extracted from SERPs
CREATE TABLE IF NOT EXISTS scrapi_bing_ads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  serp_id UUID NOT NULL REFERENCES scrapi_serp_results(id) ON DELETE CASCADE,
  position INTEGER,
  position_overall INTEGER,
  title TEXT,
  description TEXT,
  display_url TEXT,
  destination_url TEXT,
  advertiser_domain TEXT,
  advertiser_name TEXT,
  phone TEXT,
  sitelinks JSONB,
  extensions JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 5a. Google Ad Renderings table - HTML and PNG renderings of Google ad landing pages
CREATE TABLE IF NOT EXISTS scrapi_google_ad_renderings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ad_id UUID NOT NULL REFERENCES scrapi_google_ads(id) ON DELETE CASCADE,
  rendering_type TEXT NOT NULL CHECK (rendering_type IN ('html', 'png')),
  rendering_target TEXT NOT NULL CHECK (rendering_target IN ('serp', 'landing_page')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  content_path TEXT,
  storage_url TEXT,
  content_size INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ,
  error_message TEXT
);

-- 5b. Bing Ad Renderings table - HTML and PNG renderings of Bing ad landing pages
CREATE TABLE IF NOT EXISTS scrapi_bing_ad_renderings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ad_id UUID NOT NULL REFERENCES scrapi_bing_ads(id) ON DELETE CASCADE,
  rendering_type TEXT NOT NULL CHECK (rendering_type IN ('html', 'png')),
  rendering_target TEXT NOT NULL CHECK (rendering_target IN ('serp', 'landing_page')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  content_path TEXT,
  storage_url TEXT,
  content_size INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ,
  error_message TEXT
);

-- 6. Advertisers table - Unique advertisers extracted from ads
CREATE TABLE IF NOT EXISTS scrapi_advertisers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  domain TEXT UNIQUE NOT NULL,
  name TEXT,
  first_seen TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_seen TIMESTAMPTZ NOT NULL DEFAULT now(),
  ads_count INTEGER DEFAULT 0,
  website TEXT,
  phone TEXT,
  email TEXT,
  address TEXT,
  metadata JSONB DEFAULT '{}'::jsonb
);

-- 7. Job Logs table - Detailed logs for job execution
CREATE TABLE IF NOT EXISTS scrapi_job_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  batch_id UUID REFERENCES scrapi_batch_jobs(id) ON DELETE CASCADE,
  query_id UUID REFERENCES scrapi_search_queries(id) ON DELETE CASCADE,
  level TEXT NOT NULL CHECK (level IN ('info', 'warning', 'error', 'debug')),
  message TEXT NOT NULL,
  details JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 8. System Configuration table - System-wide configuration
CREATE TABLE IF NOT EXISTS scrapi_system_config (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT UNIQUE NOT NULL,
  value JSONB NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 9. API Keys table - For API authentication
CREATE TABLE IF NOT EXISTS scrapi_api_keys (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  key TEXT UNIQUE NOT NULL,
  permissions JSONB DEFAULT '["read"]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ,
  last_used_at TIMESTAMPTZ,
  created_by TEXT
);

-- 10. Worker Instances table - For distributed processing
CREATE TABLE IF NOT EXISTS scrapi_worker_instances (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'paused', 'offline')),
  last_heartbeat TIMESTAMPTZ NOT NULL DEFAULT now(),
  capabilities JSONB DEFAULT '["search", "render"]'::jsonb,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_search_queries_batch_id ON scrapi_search_queries(batch_id);
CREATE INDEX IF NOT EXISTS idx_search_queries_status ON scrapi_search_queries(status);
CREATE INDEX IF NOT EXISTS idx_serp_results_query_id ON scrapi_serp_results(query_id);
CREATE INDEX IF NOT EXISTS idx_serp_results_oxylabs_job_id ON scrapi_serp_results(oxylabs_job_id);
CREATE INDEX IF NOT EXISTS idx_google_ads_serp_id ON scrapi_google_ads(serp_id);
CREATE INDEX IF NOT EXISTS idx_google_ads_advertiser_domain ON scrapi_google_ads(advertiser_domain);
CREATE INDEX IF NOT EXISTS idx_bing_ads_serp_id ON scrapi_bing_ads(serp_id);
CREATE INDEX IF NOT EXISTS idx_bing_ads_advertiser_domain ON scrapi_bing_ads(advertiser_domain);
CREATE INDEX IF NOT EXISTS idx_google_ad_renderings_ad_id ON scrapi_google_ad_renderings(ad_id);
CREATE INDEX IF NOT EXISTS idx_google_ad_renderings_rendering_type ON scrapi_google_ad_renderings(rendering_type);
CREATE INDEX IF NOT EXISTS idx_google_ad_renderings_rendering_target ON scrapi_google_ad_renderings(rendering_target);
CREATE INDEX IF NOT EXISTS idx_bing_ad_renderings_ad_id ON scrapi_bing_ad_renderings(ad_id);
CREATE INDEX IF NOT EXISTS idx_bing_ad_renderings_rendering_type ON scrapi_bing_ad_renderings(rendering_type);
CREATE INDEX IF NOT EXISTS idx_bing_ad_renderings_rendering_target ON scrapi_bing_ad_renderings(rendering_target);
CREATE INDEX IF NOT EXISTS idx_job_logs_batch_id ON scrapi_job_logs(batch_id);
CREATE INDEX IF NOT EXISTS idx_job_logs_query_id ON scrapi_job_logs(query_id);
CREATE INDEX IF NOT EXISTS idx_job_logs_level ON scrapi_job_logs(level);

-- Enable Row Level Security (RLS)
ALTER TABLE scrapi_batch_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE scrapi_search_queries ENABLE ROW LEVEL SECURITY;
ALTER TABLE scrapi_serp_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE scrapi_google_ads ENABLE ROW LEVEL SECURITY;
ALTER TABLE scrapi_bing_ads ENABLE ROW LEVEL SECURITY;
ALTER TABLE scrapi_google_ad_renderings ENABLE ROW LEVEL SECURITY;
ALTER TABLE scrapi_bing_ad_renderings ENABLE ROW LEVEL SECURITY;
ALTER TABLE scrapi_advertisers ENABLE ROW LEVEL SECURITY;
ALTER TABLE scrapi_job_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE scrapi_system_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE scrapi_api_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE scrapi_worker_instances ENABLE ROW LEVEL SECURITY;

-- Create policies for authenticated users
CREATE POLICY "Allow authenticated users to read batch jobs"
  ON scrapi_batch_jobs FOR SELECT TO authenticated USING (true);

CREATE POLICY "Allow authenticated users to read search queries"
  ON scrapi_search_queries FOR SELECT TO authenticated USING (true);

CREATE POLICY "Allow authenticated users to read SERP results"
  ON scrapi_serp_results FOR SELECT TO authenticated USING (true);

CREATE POLICY "Allow authenticated users to read Google ads"
  ON scrapi_google_ads FOR SELECT TO authenticated USING (true);

CREATE POLICY "Allow authenticated users to read Bing ads"
  ON scrapi_bing_ads FOR SELECT TO authenticated USING (true);

CREATE POLICY "Allow authenticated users to read Google ad renderings"
  ON scrapi_google_ad_renderings FOR SELECT TO authenticated USING (true);

CREATE POLICY "Allow authenticated users to read Bing ad renderings"
  ON scrapi_bing_ad_renderings FOR SELECT TO authenticated USING (true);

CREATE POLICY "Allow authenticated users to read advertisers"
  ON scrapi_advertisers FOR SELECT TO authenticated USING (true);

CREATE POLICY "Allow authenticated users to read job logs"
  ON scrapi_job_logs FOR SELECT TO authenticated USING (true);

-- Create policies for service role (full access)
CREATE POLICY "Allow service role full access to all tables"
  ON scrapi_batch_jobs FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "Allow service role full access to search queries"
  ON scrapi_search_queries FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "Allow service role full access to SERP results"
  ON scrapi_serp_results FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "Allow service role full access to Google ads"
  ON scrapi_google_ads FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "Allow service role full access to Bing ads"
  ON scrapi_bing_ads FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "Allow service role full access to Google ad renderings"
  ON scrapi_google_ad_renderings FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "Allow service role full access to Bing ad renderings"
  ON scrapi_bing_ad_renderings FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "Allow service role full access to advertisers"
  ON scrapi_advertisers FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "Allow service role full access to job logs"
  ON scrapi_job_logs FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "Allow service role full access to system config"
  ON scrapi_system_config FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "Allow service role full access to API keys"
  ON scrapi_api_keys FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "Allow service role full access to worker instances"
  ON scrapi_worker_instances FOR ALL TO service_role USING (true) WITH CHECK (true);