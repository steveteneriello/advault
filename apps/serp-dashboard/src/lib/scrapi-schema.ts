// TypeScript interfaces for the SCRAPI database schema

export interface ScrapiBatchJob {
  id: string;
  name: string;
  description: string | null;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  created_by: string | null;
  created_at: string;
  started_at: string | null;
  completed_at: string | null;
  total_queries: number;
  completed_queries: number;
  failed_queries: number;
  config: any;
  error_message: string | null;
}

export interface ScrapiSearchQuery {
  id: string;
  batch_id: string;
  query: string;
  location: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  created_at: string;
  started_at: string | null;
  completed_at: string | null;
  oxylabs_job_id: string | null;
  error_message: string | null;
  priority: number;
  retry_count: number;
  max_retries: number;
}

export interface ScrapiSerpResult {
  id: string;
  query_id: string;
  oxylabs_job_id: string | null;
  query: string;
  location: string;
  timestamp: string;
  total_results: number | null;
  ads_count: number;
  organic_count: number;
  local_count: number;
  content: any;
  raw_html: string | null;
  created_at: string;
}

// Base interface for common ad properties
interface ScrapiAdBase {
  id: string;
  serp_id: string;
  position: number | null;
  position_overall: number | null;
  title: string | null;
  description: string | null;
  display_url: string | null;
  destination_url: string | null;
  advertiser_domain: string | null;
  advertiser_name: string | null;
  phone: string | null;
  sitelinks: any;
  extensions: any;
  created_at: string;
}

// Google Ads specific interface
export interface ScrapiGoogleAd extends ScrapiAdBase {
  // Google-specific properties can be added here
}

// Bing Ads specific interface
export interface ScrapiBingAd extends ScrapiAdBase {
  // Bing-specific properties can be added here
}

// Base interface for ad renderings
interface ScrapiAdRenderingBase {
  id: string;
  ad_id: string;
  rendering_type: 'html' | 'png';
  rendering_target: 'serp' | 'landing_page';
  status: 'pending' | 'processing' | 'completed' | 'failed';
  content_path: string | null;
  storage_url: string | null;
  content_size: number | null;
  created_at: string;
  completed_at: string | null;
  error_message: string | null;
}

// Google Ad Renderings
export interface ScrapiGoogleAdRendering extends ScrapiAdRenderingBase {
  // Google-specific rendering properties can be added here
}

// Bing Ad Renderings
export interface ScrapiBingAdRendering extends ScrapiAdRenderingBase {
  // Bing-specific rendering properties can be added here
}

export interface ScrapiAdvertiser {
  id: string;
  domain: string;
  name: string | null;
  first_seen: string;
  last_seen: string;
  ads_count: number;
  website: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  metadata: any;
}

export interface ScrapiJobLog {
  id: string;
  batch_id: string | null;
  query_id: string | null;
  level: 'info' | 'warning' | 'error' | 'debug';
  message: string;
  details: any;
  created_at: string;
}

export interface ScrapiSystemConfig {
  id: string;
  key: string;
  value: any;
  description: string | null;
  created_at: string;
  updated_at: string;
}

export interface ScrapiApiKey {
  id: string;
  name: string;
  key: string;
  permissions: string[];
  created_at: string;
  expires_at: string | null;
  last_used_at: string | null;
  created_by: string | null;
}

export interface ScrapiWorkerInstance {
  id: string;
  name: string;
  status: 'active' | 'paused' | 'offline';
  last_heartbeat: string;
  capabilities: string[];
  metadata: any;
  created_at: string;
}