import type { 
  ScrapiBatchJob, 
  ScrapiSearchQuery, 
  ScrapiSerpResult,
  ScrapiGoogleAd,
  ScrapiBingAd,
  ScrapiGoogleAdRendering,
  ScrapiBingAdRendering
} from './scrapi-schema';

// Mock data for development purposes
export const mockBatches: ScrapiBatchJob[] = [
  {
    id: 'batch-1',
    name: 'Home Services - June 2025',
    description: 'Plumbers, electricians, and HVAC services',
    status: 'completed',
    created_by: 'user@example.com',
    created_at: new Date(Date.now() - 86400000).toISOString(),
    started_at: new Date(Date.now() - 86000000).toISOString(),
    completed_at: new Date(Date.now() - 80000000).toISOString(),
    total_queries: 15,
    completed_queries: 15,
    failed_queries: 0,
    config: { platform: 'google', renderHtml: true, renderPng: true },
    error_message: null
  },
  {
    id: 'batch-2',
    name: 'Healthcare Services - June 2025',
    description: 'Dentists, doctors, and clinics',
    status: 'processing',
    created_by: 'user@example.com',
    created_at: new Date(Date.now() - 3600000).toISOString(),
    started_at: new Date(Date.now() - 1800000).toISOString(),
    completed_at: null,
    total_queries: 20,
    completed_queries: 12,
    failed_queries: 2,
    config: { platform: 'both', renderHtml: true, renderPng: true },
    error_message: null
  },
  {
    id: 'batch-3',
    name: 'Legal Services - June 2025',
    description: 'Lawyers and legal services',
    status: 'pending',
    created_by: 'user@example.com',
    created_at: new Date().toISOString(),
    started_at: null,
    completed_at: null,
    total_queries: 10,
    completed_queries: 0,
    failed_queries: 0,
    config: { platform: 'google', renderHtml: false, renderPng: true },
    error_message: null
  }
];

// Generate mock queries for a batch
export const generateMockQueries = (batchId: string, batch: ScrapiBatchJob): ScrapiSearchQuery[] => {
  const mockQueries: ScrapiSearchQuery[] = [];
  
  // Generate completed queries
  for (let i = 0; i < batch.completed_queries; i++) {
    mockQueries.push({
      id: `query-${batchId}-${i}`,
      batch_id: batchId,
      query: i % 2 === 0 ? 'plumbers near me' : 'electricians',
      location: i % 3 === 0 ? 'Boston, MA' : i % 3 === 1 ? 'New York, NY' : 'Miami, FL',
      status: 'completed',
      created_at: batch.created_at,
      started_at: batch.started_at,
      completed_at: new Date(Date.now() - (i * 60000)).toISOString(),
      oxylabs_job_id: `oxylabs-${batchId}-${i}`,
      error_message: null,
      priority: 0,
      retry_count: 0,
      max_retries: 3
    });
  }
  
  // Generate failed queries
  for (let i = 0; i < batch.failed_queries; i++) {
    mockQueries.push({
      id: `query-${batchId}-failed-${i}`,
      batch_id: batchId,
      query: 'failed query',
      location: 'Failed Location',
      status: 'failed',
      created_at: batch.created_at,
      started_at: batch.started_at,
      completed_at: new Date(Date.now() - (i * 30000)).toISOString(),
      oxylabs_job_id: `oxylabs-${batchId}-failed-${i}`,
      error_message: 'API rate limit exceeded',
      priority: 0,
      retry_count: 3,
      max_retries: 3
    });
  }
  
  // Generate pending queries
  const pendingCount = batch.total_queries - batch.completed_queries - batch.failed_queries;
  for (let i = 0; i < pendingCount; i++) {
    mockQueries.push({
      id: `query-${batchId}-pending-${i}`,
      batch_id: batchId,
      query: 'pending query',
      location: 'Pending Location',
      status: batch.status === 'processing' && i === 0 ? 'processing' : 'pending',
      created_at: batch.created_at,
      started_at: batch.status === 'processing' && i === 0 ? new Date().toISOString() : null,
      completed_at: null,
      oxylabs_job_id: batch.status === 'processing' && i === 0 ? `oxylabs-${batchId}-pending-${i}` : null,
      error_message: null,
      priority: 0,
      retry_count: 0,
      max_retries: 3
    });
  }
  
  return mockQueries;
};

// Generate mock SERP result
export const generateMockSerpResult = (queryId: string): ScrapiSerpResult => {
  return {
    id: `serp-${queryId}`,
    query_id: queryId,
    oxylabs_job_id: `oxylabs-${queryId}`,
    query: 'plumbers near me',
    location: 'Boston, MA',
    timestamp: new Date().toISOString(),
    total_results: 125,
    ads_count: 6,
    organic_count: 10,
    local_count: 3,
    content: {},
    raw_html: null,
    created_at: new Date().toISOString()
  };
};

// Generate mock Google ads
export const generateMockGoogleAds = (serpId: string, count: number = 3): ScrapiGoogleAd[] => {
  const ads: ScrapiGoogleAd[] = [];
  
  const titles = [
    'Boston Plumbing Pros | 24/7 Emergency Service',
    'Expert Plumbing Services | Available Now',
    'Affordable Plumbing Solutions | 5-Star Service',
    'Professional Plumbers | Same Day Service',
    'Licensed Plumbing Contractors | Free Estimates'
  ];
  
  const descriptions = [
    'Licensed & Insured Plumbers. Same Day Service. Call Now for Free Estimate. We handle all plumbing needs from leaks to installations. 100% Satisfaction Guaranteed.',
    'Professional plumbers ready to solve any plumbing issue. Fast response times and competitive rates. Licensed, bonded, and insured for your peace of mind.',
    'Quality plumbing at affordable prices. No hidden fees. Upfront pricing and experienced technicians. Serving Boston and surrounding areas.',
    'Emergency plumbing services available 24/7. Fast response, fair prices, and quality workmanship guaranteed. Call now for immediate assistance.',
    'Family-owned plumbing business with over 20 years of experience. Honest pricing, quality work, and excellent customer service.'
  ];
  
  const domains = [
    'bostonplumbingpros.com',
    'expertplumbingboston.com',
    'affordableplumbingboston.com',
    'professionalplumbersboston.com',
    'licensedplumbingcontractors.com'
  ];
  
  for (let i = 0; i < count; i++) {
    const domain = domains[i % domains.length];
    
    ads.push({
      id: `google-ad-${i + 1}-${serpId}`,
      serp_id: serpId,
      position: i + 1,
      position_overall: i + 1,
      title: titles[i % titles.length],
      description: descriptions[i % descriptions.length],
      display_url: `www.${domain}`,
      destination_url: `https://www.${domain}/services`,
      advertiser_domain: domain,
      advertiser_name: domain.split('.')[0].replace(/([a-z])([A-Z])/g, '$1 $2'),
      phone: `(617) 555-${1000 + i}`,
      sitelinks: i === 0 ? [
        { title: 'Emergency Service', url: `https://www.${domain}/emergency` },
        { title: 'Free Estimates', url: `https://www.${domain}/estimates` }
      ] : [],
      extensions: {},
      created_at: new Date().toISOString()
    });
  }
  
  return ads;
};

// Generate mock Bing ads
export const generateMockBingAds = (serpId: string, count: number = 2): ScrapiBingAd[] => {
  const ads: ScrapiBingAd[] = [];
  
  const titles = [
    'Top-Rated Boston Plumbers | 24/7 Service',
    'Boston Plumbing Services | Licensed & Insured',
    'Emergency Plumbing Repairs | Fast Response',
    'Local Plumbing Experts | Affordable Rates'
  ];
  
  const descriptions = [
    'Experienced plumbers serving Boston area. Fast response, fair prices. Call now for immediate assistance with any plumbing emergency.',
    'Professional plumbing services for residential and commercial clients. No job too big or small. Free estimates and senior discounts.',
    'Immediate response to all plumbing emergencies. Water heaters, burst pipes, drain cleaning, and more. Available 24/7.',
    'Local plumbers with 20+ years of experience. Upfront pricing and guaranteed workmanship. Call today for a free consultation.'
  ];
  
  const domains = [
    'bostonplumbingexperts.com',
    'bostonplumbingservices.com',
    'emergencyplumbingboston.com',
    'localplumbingexperts.com'
  ];
  
  for (let i = 0; i < count; i++) {
    const domain = domains[i % domains.length];
    
    ads.push({
      id: `bing-ad-${i + 1}-${serpId}`,
      serp_id: serpId,
      position: i + 1,
      position_overall: i + 1,
      title: titles[i % titles.length],
      description: descriptions[i % descriptions.length],
      display_url: `www.${domain}`,
      destination_url: `https://www.${domain}`,
      advertiser_domain: domain,
      advertiser_name: domain.split('.')[0].replace(/([a-z])([A-Z])/g, '$1 $2'),
      phone: `(617) 555-${2000 + i}`,
      sitelinks: [],
      extensions: {},
      created_at: new Date().toISOString()
    });
  }
  
  return ads;
};

// Generate mock ad renderings
export const generateMockAdRenderings = (adId: string): (ScrapiGoogleAdRendering | ScrapiBingAdRendering)[] => {
  return [
    {
      id: `rendering-serp-html-${adId}`,
      ad_id: adId,
      rendering_type: 'html',
      rendering_target: 'serp',
      status: 'completed',
      content_path: '/path/to/serp-html.html',
      storage_url: 'https://via.placeholder.com/800x600?text=SERP+HTML+Rendering',
      content_size: 15000,
      created_at: new Date().toISOString(),
      completed_at: new Date().toISOString(),
      error_message: null
    },
    {
      id: `rendering-serp-png-${adId}`,
      ad_id: adId,
      rendering_type: 'png',
      rendering_target: 'serp',
      status: 'completed',
      content_path: '/path/to/serp-png.png',
      storage_url: 'https://via.placeholder.com/800x600?text=SERP+PNG+Rendering',
      content_size: 50000,
      created_at: new Date().toISOString(),
      completed_at: new Date().toISOString(),
      error_message: null
    },
    {
      id: `rendering-landing-html-${adId}`,
      ad_id: adId,
      rendering_type: 'html',
      rendering_target: 'landing_page',
      status: 'completed',
      content_path: '/path/to/landing-html.html',
      storage_url: 'https://via.placeholder.com/800x600?text=Landing+Page+HTML+Rendering',
      content_size: 25000,
      created_at: new Date().toISOString(),
      completed_at: new Date().toISOString(),
      error_message: null
    },
    {
      id: `rendering-landing-png-${adId}`,
      ad_id: adId,
      rendering_type: 'png',
      rendering_target: 'landing_page',
      status: 'completed',
      content_path: '/path/to/landing-png.png',
      storage_url: 'https://via.placeholder.com/800x600?text=Landing+Page+PNG+Rendering',
      content_size: 75000,
      created_at: new Date().toISOString(),
      completed_at: new Date().toISOString(),
      error_message: null
    }
  ];
};