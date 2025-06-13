// Campaign Manager Types

export interface Category {
  id?: string;
  name: string;
  description?: string;
  parent_category_id?: string;
  parent_category?: Category;
  created_at?: string;
  updated_at?: string;
}

export interface Campaign {
  id?: string;
  name: string;
  category_id?: string;
  category?: Category;
  description?: string;
  start_date?: string;
  end_date?: string;
  status?: 'draft' | 'active' | 'paused' | 'completed';
  target_locations?: any;
  budget?: number;
  created_at?: string;
  updated_at?: string;
}

export interface KeywordStats {
  id?: string;
  keyword_id?: string;
  local_volume?: number;
  market_volume?: number;
  keyword_difficulty?: number;
  cpc?: number;
  competitive_density?: number;
  api_source?: string;
  api_function?: string;
  search_engine?: string;
  bid?: number;
  match_type?: string;
  location_code?: number;
  date_interval?: string;
  search_partners?: boolean;
  impressions?: number;
  ctr?: number;
  average_cpc?: number;
  total_cost?: number;
  clicks?: number;
  last_updated?: string;
}

export interface Keyword {
  id?: string;
  campaign_id?: string;
  campaign?: Campaign;
  keyword: string;
  match_type?: 'broad' | 'phrase' | 'exact';
  created_at?: string;
  updated_at?: string;
  stats?: KeywordStats;
}

export interface NegativeKeyword {
  id?: string;
  campaign_id?: string;
  campaign?: Campaign;
  keyword: string;
  match_type?: 'broad' | 'phrase' | 'exact';
  created_at?: string;
  updated_at?: string;
}

export interface Location {
  city: string;
  state: string;
  country: string;
  radius?: number;
  radius_unit?: 'mi' | 'km';
}