import { createClient } from '@supabase/supabase-js';

// Get environment variables
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Validate that required environment variables are present
if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Missing Supabase configuration. Please check your environment variables:');
  console.error('VITE_SUPABASE_URL:', supabaseUrl ? 'Set' : 'Missing');
  console.error('VITE_SUPABASE_ANON_KEY:', supabaseAnonKey ? 'Set' : 'Missing');
  throw new Error('Supabase configuration is incomplete. Please set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in your .env.local file.');
}

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
    try {
      const { data, error } = await supabase
        .from('location_data')
        .select('*')
        .limit(100);
      
      if (error) throw error;
      return data as LocationData[];
    } catch (error) {
      console.error('Error fetching locations:', error);
      // Return mock data for development
      return [
        {
          id: "1",
          city: "Boston",
          state_name: "Massachusetts",
          state_id: "MA",
          county_name: "Suffolk",
          postal_code: "02108",
          latitude: 42.3601,
          longitude: -71.0589,
          population: 694583,
          income_household_median: 76298,
          housing_units: 300000,
          home_value: 650000,
          home_ownership: 35,
          age_median: 32
        },
        {
          id: "2",
          city: "Cambridge",
          state_name: "Massachusetts",
          state_id: "MA",
          county_name: "Middlesex",
          postal_code: "02138",
          latitude: 42.3736,
          longitude: -71.1097,
          population: 118403,
          income_household_median: 103154,
          housing_units: 51000,
          home_value: 843300,
          home_ownership: 32,
          age_median: 30
        }
      ] as LocationData[];
    }
  },
  
  async searchLocationsByZip(zipCode: string, radiusMiles: number = 50) {
    try {
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
    } catch (error) {
      console.error('Error searching locations by zip:', error);
      // Return mock data for development
      return {
        center: {
          id: "1",
          city: "Boston",
          state_name: "Massachusetts",
          state_id: "MA",
          county_name: "Suffolk",
          postal_code: "02108",
          latitude: 42.3601,
          longitude: -71.0589,
          population: 694583,
          income_household_median: 76298,
          housing_units: 300000,
          home_value: 650000,
          home_ownership: 35,
          age_median: 32
        },
        locations: [
          {
            id: "1",
            city: "Boston",
            state_name: "Massachusetts",
            state_id: "MA",
            county_name: "Suffolk",
            postal_code: "02108",
            latitude: 42.3601,
            longitude: -71.0589,
            population: 694583,
            income_household_median: 76298,
            housing_units: 300000,
            home_value: 650000,
            home_ownership: 35,
            age_median: 32
          },
          {
            id: "2",
            city: "Cambridge",
            state_name: "Massachusetts",
            state_id: "MA",
            county_name: "Middlesex",
            postal_code: "02138",
            latitude: 42.3736,
            longitude: -71.1097,
            population: 118403,
            income_household_median: 103154,
            housing_units: 51000,
            home_value: 843300,
            home_ownership: 32,
            age_median: 30
          }
        ] as LocationData[]
      };
    }
  },
  
  // Other API functions with fallback to mock data
  async getCampaigns() {
    try {
      const { data, error } = await supabase
        .from('campaigns')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data as Campaign[];
    } catch (error) {
      console.error('Error fetching campaigns:', error);
      return [] as Campaign[];
    }
  },
  
  async createCampaign(campaign: Partial<Campaign>) {
    try {
      const { data, error } = await supabase
        .from('campaigns')
        .insert(campaign)
        .select();
      
      if (error) throw error;
      return data[0] as Campaign;
    } catch (error) {
      console.error('Error creating campaign:', error);
      return {} as Campaign;
    }
  },
  
  async getKeywords(category?: string) {
    try {
      let query = supabase
        .from('keywords')
        .select('*');
      
      if (category) {
        query = query.eq('category', category);
      }
      
      const { data, error } = await query;
      
      if (error) throw error;
      return data as Keyword[];
    } catch (error) {
      console.error('Error fetching keywords:', error);
      return [] as Keyword[];
    }
  },
  
  async getSerpData(campaignId: string) {
    try {
      const { data, error } = await supabase
        .from('serps')
        .select('*')
        .eq('campaign_id', campaignId);
      
      if (error) throw error;
      return data as SerpData[];
    } catch (error) {
      console.error('Error fetching SERP data:', error);
      return [] as SerpData[];
    }
  }
};