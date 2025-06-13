import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Type definitions for your tables
export interface LocationData {
  id: string;
  city: string;
  state_name: string;
  state_id: string;
  county_name: string;
  postal_code: string;
  latitude: number;
  longitude: number;
  population: number;
  income_household_median: number;
  housing_units: number;
  home_value: number;
  home_ownership: number;
  age_median: number;
  batch_id?: string;
  batch_label?: string;
  city_class?: string;
  county_assignment?: string;
  distance_miles?: number;
}

export interface Campaign {
  id: string;
  name: string;
  type: 'client' | 'market' | 'prospect' | 'data';
  status: 'active' | 'paused' | 'completed';
  client_id?: string;
  keywords_count: number;
  locations_count: number;
  schedule_type: 'daily' | 'weekly' | 'monthly' | 'specific';
  schedule_time: string;
  start_date: string;
  end_date?: string;
  created_at: string;
  updated_at: string;
}

export interface Keyword {
  id: string;
  text: string;
  volume: number;
  cpc: number;
  competition: 'High' | 'Medium' | 'Low';
  category: string;
  created_at: string;
}

export interface Client {
  id: string;
  name: string;
  industry: string;
  contact_name: string;
  contact_email: string;
  created_at: string;
}

export interface SerpData {
  id: string;
  job_id: string;
  query: string;
  location: string;
  timestamp: string;
  ads_count: number;
  organic_count: number;
  created_at: string;
}

// API functions
export const api = {
  // Locations
  async getLocations(filters = {}) {
    const { data, error } = await supabase
      .from('location_data')
      .select('*')
      .limit(100);
    
    if (error) throw error;
    return data as LocationData[];
  },
  
  async searchLocationsByZip(zipCode: string, radiusMiles: number = 50) {
    // This would be a real API call in production
    // For now, we'll simulate it
    const { data, error } = await supabase
      .from('location_data')
      .select('*')
      .eq('postal_code', zipCode)
      .limit(1);
    
    if (error) throw error;
    
    if (data && data.length > 0) {
      const centerLocation = data[0];
      
      // Now get locations within radius
      // This would use a real distance calculation in production
      const { data: nearbyLocations, error: nearbyError } = await supabase
        .from('location_data')
        .select('*')
        .limit(20);
      
      if (nearbyError) throw nearbyError;
      
      return {
        center: centerLocation,
        locations: nearbyLocations as LocationData[]
      };
    }
    
    return { center: null, locations: [] };
  },
  
  // Campaigns
  async getCampaigns() {
    const { data, error } = await supabase
      .from('campaigns')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    return data as Campaign[];
  },
  
  async createCampaign(campaign: Partial<Campaign>) {
    const { data, error } = await supabase
      .from('campaigns')
      .insert(campaign)
      .select();
    
    if (error) throw error;
    return data[0] as Campaign;
  },
  
  // Keywords
  async getKeywords(category?: string) {
    let query = supabase
      .from('keywords')
      .select('*');
    
    if (category) {
      query = query.eq('category', category);
    }
    
    const { data, error } = await query;
    
    if (error) throw error;
    return data as Keyword[];
  },
  
  // SERP Data
  async getSerpData(campaignId: string) {
    const { data, error } = await supabase
      .from('serps')
      .select('*')
      .eq('campaign_id', campaignId);
    
    if (error) throw error;
    return data as SerpData[];
  }
};