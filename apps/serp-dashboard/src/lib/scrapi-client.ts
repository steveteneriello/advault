import axios, { AxiosInstance } from 'axios';
import type { 
  ScrapiBatchJob, 
  ScrapiSearchQuery, 
  ScrapiSerpResult,
  ScrapiGoogleAd,
  ScrapiBingAd,
  ScrapiGoogleAdRendering,
  ScrapiBingAdRendering,
  ScrapiAdvertiser
} from './scrapi-schema';

export class ScrapiClient {
  private api: AxiosInstance;
  
  constructor() {
    const baseUrl = import.meta.env.VITE_SCRAPI_API_URL || 'http://localhost:3000/api';
    
    this.api = axios.create({
      baseURL: baseUrl,
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    // Add response interceptor for error handling
    this.api.interceptors.response.use(
      response => response,
      error => {
        console.error('SCRAPI API Error:', error.response?.data || error.message);
        return Promise.reject(error);
      }
    );
  }
  
  // Health check
  async checkHealth(): Promise<boolean> {
    try {
      const response = await this.api.get('/health');
      return response.data.status === 'healthy';
    } catch (error) {
      console.error('SCRAPI health check failed:', error);
      return false;
    }
  }
  
  // Single query search
  async runSingleQuery(query: string, location: string, options?: {
    platform?: 'google' | 'bing' | 'both';
    renderHtml?: boolean;
    renderPng?: boolean;
  }): Promise<{
    success: boolean;
    jobId?: string;
    error?: string;
  }> {
    try {
      const response = await this.api.post('/search', { 
        query, 
        location,
        ...options
      });
      return response.data;
    } catch (error: any) {
      return {
        success: false,
        error: error.response?.data?.error || error.message
      };
    }
  }
  
  // Submit batch of queries
  async submitBatch(
    name: string,
    queries: Array<{query: string, location: string}>,
    config?: {
      platform?: 'google' | 'bing' | 'both';
      renderHtml?: boolean;
      renderPng?: boolean;
      maxConcurrency?: number;
      delayBetweenQueries?: number;
      maxRetries?: number;
    }
  ): Promise<{
    success: boolean;
    batchId?: string;
    error?: string;
  }> {
    try {
      const response = await this.api.post('/batch', {
        name,
        queries,
        config: config || {}
      });
      return response.data;
    } catch (error: any) {
      return {
        success: false,
        error: error.response?.data?.error || error.message
      };
    }
  }
  
  // Get batch status
  async getBatchStatus(batchId: string): Promise<{
    batchId: string;
    status: string;
    progress: number;
    completedQueries: number;
    totalQueries: number;
    failedQueries: number;
    startedAt: string | null;
    completedAt: string | null;
    updatedAt: string;
  }> {
    const response = await this.api.get(`/batch/${batchId}/status`);
    return response.data;
  }
  
  // Get all batches
  async getAllBatches(limit: number = 20, offset: number = 0): Promise<{
    batches: ScrapiBatchJob[];
    count: number;
  }> {
    const response = await this.api.get('/batches', {
      params: { limit, offset }
    });
    return response.data;
  }
  
  // Get batch details
  async getBatchDetails(batchId: string): Promise<{
    batch: ScrapiBatchJob;
    queries: ScrapiSearchQuery[];
  }> {
    const response = await this.api.get(`/batch/${batchId}`);
    return response.data;
  }
  
  // Get SERP results
  async getSerpResults(queryId: string): Promise<ScrapiSerpResult> {
    const response = await this.api.get(`/serp/${queryId}`);
    return response.data;
  }
  
  // Get Google ads for a SERP
  async getGoogleAdsForSerp(serpId: string): Promise<ScrapiGoogleAd[]> {
    const response = await this.api.get(`/serp/${serpId}/google-ads`);
    return response.data;
  }
  
  // Get Bing ads for a SERP
  async getBingAdsForSerp(serpId: string): Promise<ScrapiBingAd[]> {
    const response = await this.api.get(`/serp/${serpId}/bing-ads`);
    return response.data;
  }
  
  // Get Google ad renderings
  async getGoogleAdRenderings(adId: string): Promise<ScrapiGoogleAdRendering[]> {
    const response = await this.api.get(`/google-ads/${adId}/renderings`);
    return response.data;
  }
  
  // Get Bing ad renderings
  async getBingAdRenderings(adId: string): Promise<ScrapiBingAdRendering[]> {
    const response = await this.api.get(`/bing-ads/${adId}/renderings`);
    return response.data;
  }
  
  // Get advertisers
  async getAdvertisers(limit: number = 20, offset: number = 0): Promise<{
    advertisers: ScrapiAdvertiser[];
    count: number;
  }> {
    const response = await this.api.get('/advertisers', {
      params: { limit, offset }
    });
    return response.data;
  }
  
  // Get advertiser details
  async getAdvertiserDetails(advertiserId: string): Promise<{
    advertiser: ScrapiAdvertiser;
    googleAds: ScrapiGoogleAd[];
    bingAds: ScrapiBingAd[];
  }> {
    const response = await this.api.get(`/advertisers/${advertiserId}`);
    return response.data;
  }
  
  // Cancel batch
  async cancelBatch(batchId: string): Promise<{
    success: boolean;
    error?: string;
  }> {
    try {
      const response = await this.api.post(`/batch/${batchId}/cancel`);
      return response.data;
    } catch (error: any) {
      return {
        success: false,
        error: error.response?.data?.error || error.message
      };
    }
  }
  
  // Retry failed queries in a batch
  async retryFailedQueries(batchId: string): Promise<{
    success: boolean;
    retriedCount: number;
    error?: string;
  }> {
    try {
      const response = await this.api.post(`/batch/${batchId}/retry-failed`);
      return response.data;
    } catch (error: any) {
      return {
        success: false,
        error: error.response?.data?.error || error.message
      };
    }
  }
}

export const scrapiClient = new ScrapiClient();