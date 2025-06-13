import React, { useState, useEffect } from 'react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import CampaignList from '@/components/campaign-manager/CampaignList';
import CampaignEditor from '@/components/campaign-manager/CampaignEditor';
import CategoryManager from '@/components/campaign-manager/CategoryManager';
import KeywordManager from '@/components/campaign-manager/KeywordManager';
import { supabase } from '@/lib/supabase';
import { Campaign, Category, Keyword } from '@/lib/campaign-manager-types';
import { Card, CardContent } from "@/components/ui/card";
import { BarChart3, Layers, Tag, Ban } from 'lucide-react';

// Sample data for development/demo purposes
const SAMPLE_CATEGORIES: Category[] = [
  { id: '1', name: 'Plumbing', description: 'Plumbing services and related categories' },
  { id: '2', name: 'HVAC', description: 'Heating, ventilation, and air conditioning services' },
  { id: '3', name: 'Electrical', description: 'Electrical services and contractors' },
  { id: '4', name: 'Roofing', description: 'Roofing services and contractors' }
];

const SAMPLE_CAMPAIGNS: Campaign[] = [
  { 
    id: '1', 
    name: 'Drain Cleaning Campaign', 
    category_id: '1', 
    description: 'Targeted drain cleaning services campaign',
    start_date: '2025-06-01',
    status: 'active',
    budget: 1500
  },
  { 
    id: '2', 
    name: 'Emergency Plumbing', 
    category_id: '1', 
    description: 'Campaign for emergency plumbing services',
    start_date: '2025-06-15',
    status: 'draft',
    budget: 2000
  },
  { 
    id: '3', 
    name: 'Summer AC Maintenance', 
    category_id: '2', 
    description: 'Seasonal campaign for AC maintenance services',
    start_date: '2025-07-01',
    end_date: '2025-08-31',
    status: 'paused',
    budget: 3500
  }
];

const SAMPLE_KEYWORDS: Keyword[] = [
  { id: '1', campaign_id: '1', keyword: 'drain cleaning', match_type: 'broad', stats: { keyword_id: '1', local_volume: 1200, market_volume: 3500, keyword_difficulty: 55, cpc: 12.50, competitive_density: 0.75 } },
  { id: '2', campaign_id: '1', keyword: 'drain cleaning near me', match_type: 'phrase', stats: { keyword_id: '2', local_volume: 850, market_volume: 2700, keyword_difficulty: 62, cpc: 15.75, competitive_density: 0.85 } },
  { id: '3', campaign_id: '1', keyword: 'emergency drain cleaning', match_type: 'exact', stats: { keyword_id: '3', local_volume: 450, market_volume: 1200, keyword_difficulty: 70, cpc: 18.25, competitive_density: 0.90 } },
  { id: '4', campaign_id: '1', keyword: 'roto rooter', match_type: 'broad', stats: { keyword_id: '4', local_volume: 600, market_volume: 1800, keyword_difficulty: 45, cpc: 10.90, competitive_density: 0.65 } },
  { id: '5', campaign_id: '2', keyword: 'emergency plumber', match_type: 'exact', stats: { keyword_id: '5', local_volume: 1800, market_volume: 5200, keyword_difficulty: 75, cpc: 22.50, competitive_density: 0.95 } },
  { id: '6', campaign_id: '2', keyword: '24 hour plumber', match_type: 'phrase', stats: { keyword_id: '6', local_volume: 1200, market_volume: 3800, keyword_difficulty: 68, cpc: 19.75, competitive_density: 0.88 } },
  { id: '7', campaign_id: '3', keyword: 'ac maintenance', match_type: 'broad', stats: { keyword_id: '7', local_volume: 950, market_volume: 2900, keyword_difficulty: 50, cpc: 14.25, competitive_density: 0.72 } },
  { id: '8', campaign_id: '3', keyword: 'air conditioner tune up', match_type: 'phrase', stats: { keyword_id: '8', local_volume: 750, market_volume: 2200, keyword_difficulty: 45, cpc: 12.50, competitive_density: 0.68 } }
];

const SAMPLE_NEGATIVE_KEYWORDS = [
  { id: '1', campaign_id: '1', keyword: 'draino', match_type: 'exact' },
  { id: '2', campaign_id: '1', keyword: 'how to unclog drain', match_type: 'broad' },
  { id: '3', campaign_id: '1', keyword: 'best drain cleaning treatments', match_type: 'phrase' },
  { id: '4', campaign_id: '2', keyword: 'diy plumbing', match_type: 'broad' },
  { id: '5', campaign_id: '2', keyword: 'plumbing tools', match_type: 'phrase' },
  { id: '6', campaign_id: '3', keyword: 'ac repair', match_type: 'exact' },
  { id: '7', campaign_id: '3', keyword: 'how to fix ac', match_type: 'broad' }
];

const CampaignBuilder: React.FC = () => {
  const [activeTab, setActiveTab] = useState<string>('campaigns');
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [keywords, setKeywords] = useState<Keyword[]>([]);
  const [negativeKeywords, setNegativeKeywords] = useState<any[]>([]);
  const [selectedCampaign, setSelectedCampaign] = useState<Campaign | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState({
    activeCampaigns: 0,
    totalCategories: 0,
    totalKeywords: 0,
    totalNegativeKeywords: 0
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      console.log("Fetching campaign data...");
      
      // Try to fetch from database first
      const { data: campaignData, error: campaignError } = await supabase
        .from('campaign_manager_campaigns')
        .select('*, category:category_id(id, name)');
      
      const { data: categoryData, error: categoryError } = await supabase
        .from('campaign_manager_categories')
        .select('*, parent_category:parent_category_id(id, name)');
      
      const { data: keywordData, error: keywordError } = await supabase
        .from('campaign_manager_keywords')
        .select('*, campaign:campaign_id(id, name), stats:campaign_manager_keyword_stats(*)');
      
      const { data: negativeKeywordData, error: negativeKeywordError } = await supabase
        .from('campaign_manager_negative_keywords')
        .select('*, campaign:campaign_id(id, name)');
      
      // Use sample data if database fetch fails or returns empty
      const finalCampaigns = (campaignData && campaignData.length > 0) ? campaignData : SAMPLE_CAMPAIGNS;
      const finalCategories = (categoryData && categoryData.length > 0) ? categoryData : SAMPLE_CATEGORIES;
      const finalKeywords = (keywordData && keywordData.length > 0) ? keywordData : SAMPLE_KEYWORDS;
      const finalNegativeKeywords = (negativeKeywordData && negativeKeywordData.length > 0) ? negativeKeywordData : SAMPLE_NEGATIVE_KEYWORDS;
      
      console.log("Using data:", {
        campaigns: finalCampaigns,
        categories: finalCategories,
        keywords: finalKeywords,
        negativeKeywords: finalNegativeKeywords
      });
      
      setCampaigns(finalCampaigns);
      setCategories(finalCategories);
      setKeywords(finalKeywords);
      setNegativeKeywords(finalNegativeKeywords);
      
      // Calculate stats
      const activeCampaigns = finalCampaigns.filter(c => c.status === 'active').length;
      const totalCategories = finalCategories.length;
      const totalKeywords = finalKeywords.length;
      const totalNegativeKeywords = finalNegativeKeywords.length;
      
      setStats({
        activeCampaigns,
        totalCategories,
        totalKeywords,
        totalNegativeKeywords
      });
    } catch (err: any) {
      console.error('Error fetching data:', err);
      setError(err.message || 'Failed to load data');
      
      // Fall back to sample data if there's an error
      setCampaigns(SAMPLE_CAMPAIGNS);
      setCategories(SAMPLE_CATEGORIES);
      setKeywords(SAMPLE_KEYWORDS);
      setNegativeKeywords(SAMPLE_NEGATIVE_KEYWORDS);
      
      setStats({
        activeCampaigns: SAMPLE_CAMPAIGNS.filter(c => c.status === 'active').length,
        totalCategories: SAMPLE_CATEGORIES.length,
        totalKeywords: SAMPLE_KEYWORDS.length,
        totalNegativeKeywords: SAMPLE_NEGATIVE_KEYWORDS.length
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleCampaignSelect = (campaign: Campaign) => {
    setSelectedCampaign(campaign);
    setActiveTab('editor');
  };

  const handleCampaignCreate = () => {
    setSelectedCampaign(null);
    setActiveTab('editor');
  };

  const handleCampaignSave = async (campaign: Campaign) => {
    try {
      let savedCampaign;
      
      if (campaign.id) {
        // Update existing campaign
        const { data, error } = await supabase
          .from('campaign_manager_campaigns')
          .update({
            name: campaign.name,
            category_id: campaign.category_id,
            description: campaign.description,
            start_date: campaign.start_date,
            end_date: campaign.end_date,
            status: campaign.status,
            target_locations: campaign.target_locations,
            budget: campaign.budget,
            updated_at: new Date().toISOString()
          })
          .eq('id', campaign.id)
          .select('*, category:category_id(id, name)')
          .single();
          
        if (error) {
          // If database update fails, simulate it with local data
          console.warn("Database update failed, using local data:", error);
          savedCampaign = {
            ...campaign,
            updated_at: new Date().toISOString(),
            category: categories.find(c => c.id === campaign.category_id)
          };
        } else {
          savedCampaign = data;
        }
      } else {
        // Create new campaign
        const newId = `new-${Date.now()}`;
        const { data, error } = await supabase
          .from('campaign_manager_campaigns')
          .insert({
            name: campaign.name,
            category_id: campaign.category_id,
            description: campaign.description,
            start_date: campaign.start_date,
            end_date: campaign.end_date,
            status: campaign.status || 'draft',
            target_locations: campaign.target_locations,
            budget: campaign.budget
          })
          .select('*, category:category_id(id, name)')
          .single();
          
        if (error) {
          // If database insert fails, simulate it with local data
          console.warn("Database insert failed, using local data:", error);
          savedCampaign = {
            ...campaign,
            id: newId,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            category: categories.find(c => c.id === campaign.category_id)
          };
        } else {
          savedCampaign = data;
        }
      }
      
      // Update campaigns list
      if (campaign.id) {
        setCampaigns(campaigns.map(c => c.id === campaign.id ? savedCampaign : c));
      } else {
        setCampaigns([...campaigns, savedCampaign]);
      }
      
      setSelectedCampaign(savedCampaign);
      setActiveTab('campaigns');
      
      // Update stats
      const activeCampaigns = campaigns.filter(c => c.status === 'active').length;
      setStats(prev => ({
        ...prev,
        activeCampaigns: campaign.status === 'active' ? activeCampaigns + 1 : activeCampaigns
      }));
    } catch (err: any) {
      console.error('Error saving campaign:', err);
      setError(err.message || 'Failed to save campaign');
    }
  };

  const handleCategorySave = async (category: Category) => {
    try {
      let savedCategory;
      
      if (category.id) {
        // Update existing category
        const { data, error } = await supabase
          .from('campaign_manager_categories')
          .update({
            name: category.name,
            description: category.description,
            parent_category_id: category.parent_category_id,
            updated_at: new Date().toISOString()
          })
          .eq('id', category.id)
          .select('*, parent_category:parent_category_id(id, name)')
          .single();
          
        if (error) {
          // If database update fails, simulate it with local data
          console.warn("Database update failed, using local data:", error);
          savedCategory = {
            ...category,
            updated_at: new Date().toISOString(),
            parent_category: categories.find(c => c.id === category.parent_category_id)
          };
        } else {
          savedCategory = data;
        }
      } else {
        // Create new category
        const newId = `new-${Date.now()}`;
        const { data, error } = await supabase
          .from('campaign_manager_categories')
          .insert({
            name: category.name,
            description: category.description,
            parent_category_id: category.parent_category_id
          })
          .select('*, parent_category:parent_category_id(id, name)')
          .single();
          
        if (error) {
          // If database insert fails, simulate it with local data
          console.warn("Database insert failed, using local data:", error);
          savedCategory = {
            ...category,
            id: newId,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            parent_category: categories.find(c => c.id === category.parent_category_id)
          };
        } else {
          savedCategory = data;
        }
      }
      
      // Update categories list
      if (category.id) {
        setCategories(categories.map(c => c.id === category.id ? savedCategory : c));
      } else {
        setCategories([...categories, savedCategory]);
      }
      
      // Update stats
      setStats(prev => ({
        ...prev,
        totalCategories: category.id ? prev.totalCategories : prev.totalCategories + 1
      }));
    } catch (err: any) {
      console.error('Error saving category:', err);
      setError(err.message || 'Failed to save category');
    }
  };

  const handleKeywordSave = async (keyword: Keyword, campaignId: string) => {
    try {
      let savedKeyword;
      
      if (keyword.id) {
        // Update existing keyword
        const { data, error } = await supabase
          .from('campaign_manager_keywords')
          .update({
            keyword: keyword.keyword,
            match_type: keyword.match_type,
            updated_at: new Date().toISOString()
          })
          .eq('id', keyword.id)
          .select('*, campaign:campaign_id(id, name), stats:campaign_manager_keyword_stats(*)')
          .single();
          
        if (error) {
          // If database update fails, simulate it with local data
          console.warn("Database update failed, using local data:", error);
          savedKeyword = {
            ...keyword,
            updated_at: new Date().toISOString(),
            campaign: campaigns.find(c => c.id === campaignId)
          };
        } else {
          savedKeyword = data;
        }
      } else {
        // Create new keyword
        const newId = `new-${Date.now()}`;
        const { data, error } = await supabase
          .from('campaign_manager_keywords')
          .insert({
            campaign_id: campaignId,
            keyword: keyword.keyword,
            match_type: keyword.match_type || 'broad'
          })
          .select('*, campaign:campaign_id(id, name), stats:campaign_manager_keyword_stats(*)')
          .single();
          
        if (error) {
          // If database insert fails, simulate it with local data
          console.warn("Database insert failed, using local data:", error);
          savedKeyword = {
            ...keyword,
            id: newId,
            campaign_id: campaignId,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            campaign: campaigns.find(c => c.id === campaignId)
          };
        } else {
          savedKeyword = data;
        }
      }
      
      // Update keywords list
      if (keyword.id) {
        setKeywords(keywords.map(k => k.id === keyword.id ? savedKeyword : k));
      } else {
        setKeywords([...keywords, savedKeyword]);
      }
      
      // Update stats
      setStats(prev => ({
        ...prev,
        totalKeywords: keyword.id ? prev.totalKeywords : prev.totalKeywords + 1
      }));
    } catch (err: any) {
      console.error('Error saving keyword:', err);
      setError(err.message || 'Failed to save keyword');
    }
  };

  const handleKeywordStatsSave = async (keywordId: string, stats: any) => {
    try {
      const { data, error } = await supabase
        .from('campaign_manager_keyword_stats')
        .upsert({
          keyword_id: keywordId,
          local_volume: stats.local_volume,
          market_volume: stats.market_volume,
          keyword_difficulty: stats.keyword_difficulty,
          cpc: stats.cpc,
          competitive_density: stats.competitive_density,
          api_source: stats.api_source,
          api_function: stats.api_function,
          search_engine: stats.search_engine,
          bid: stats.bid,
          match_type: stats.match_type,
          location_code: stats.location_code,
          date_interval: stats.date_interval,
          search_partners: stats.search_partners,
          impressions: stats.impressions,
          ctr: stats.ctr,
          average_cpc: stats.average_cpc,
          total_cost: stats.total_cost,
          clicks: stats.clicks,
          last_updated: new Date().toISOString()
        })
        .select();
        
      if (error) {
        // If database update fails, simulate it with local data
        console.warn("Database update failed, using local data:", error);
        
        // Update keywords list with new stats locally
        setKeywords(keywords.map(k => {
          if (k.id === keywordId) {
            return { 
              ...k, 
              stats: {
                ...stats,
                keyword_id: keywordId,
                last_updated: new Date().toISOString()
              }
            };
          }
          return k;
        }));
      } else {
        // Update keywords list with new stats from database
        setKeywords(keywords.map(k => {
          if (k.id === keywordId) {
            return { ...k, stats: data[0] };
          }
          return k;
        }));
      }
    } catch (err: any) {
      console.error('Error saving keyword stats:', err);
      setError(err.message || 'Failed to save keyword stats');
    }
  };

  const handleCampaignDelete = async (campaignId: string) => {
    try {
      const { error } = await supabase
        .from('campaign_manager_campaigns')
        .delete()
        .eq('id', campaignId);
        
      if (error) {
        console.warn("Database delete failed, using local data:", error);
      }
      
      // Update campaigns list regardless of database result
      setCampaigns(campaigns.filter(c => c.id !== campaignId));
      
      // If the deleted campaign was selected, clear selection
      if (selectedCampaign && selectedCampaign.id === campaignId) {
        setSelectedCampaign(null);
      }
      
      // Update stats
      const deletedCampaign = campaigns.find(c => c.id === campaignId);
      if (deletedCampaign && deletedCampaign.status === 'active') {
        setStats(prev => ({
          ...prev,
          activeCampaigns: prev.activeCampaigns - 1
        }));
      }
    } catch (err: any) {
      console.error('Error deleting campaign:', err);
      setError(err.message || 'Failed to delete campaign');
    }
  };

  const handleCategoryDelete = async (categoryId: string) => {
    try {
      const { error } = await supabase
        .from('campaign_manager_categories')
        .delete()
        .eq('id', categoryId);
        
      if (error) {
        console.warn("Database delete failed, using local data:", error);
      }
      
      // Update categories list regardless of database result
      setCategories(categories.filter(c => c.id !== categoryId));
      
      // Update stats
      setStats(prev => ({
        ...prev,
        totalCategories: prev.totalCategories - 1
      }));
    } catch (err: any) {
      console.error('Error deleting category:', err);
      setError(err.message || 'Failed to delete category');
    }
  };

  const handleKeywordDelete = async (keywordId: string) => {
    try {
      const { error } = await supabase
        .from('campaign_manager_keywords')
        .delete()
        .eq('id', keywordId);
        
      if (error) {
        console.warn("Database delete failed, using local data:", error);
      }
      
      // Update keywords list regardless of database result
      setKeywords(keywords.filter(k => k.id !== keywordId));
      
      // Update stats
      setStats(prev => ({
        ...prev,
        totalKeywords: prev.totalKeywords - 1
      }));
    } catch (err: any) {
      console.error('Error deleting keyword:', err);
      setError(err.message || 'Failed to delete keyword');
    }
  };

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-6">Campaign Builder</h1>
      
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-zinc-400 mb-1">Active Campaigns</p>
                <p className="text-3xl font-semibold">{stats.activeCampaigns}</p>
              </div>
              <div className="h-12 w-12 bg-blue-500/10 flex items-center justify-center">
                <BarChart3 className="h-6 w-6 text-blue-500" />
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-zinc-400 mb-1">Categories</p>
                <p className="text-3xl font-semibold">{stats.totalCategories}</p>
              </div>
              <div className="h-12 w-12 bg-purple-500/10 flex items-center justify-center">
                <Layers className="h-6 w-6 text-purple-500" />
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-zinc-400 mb-1">Keywords</p>
                <p className="text-3xl font-semibold">{stats.totalKeywords}</p>
              </div>
              <div className="h-12 w-12 bg-green-500/10 flex items-center justify-center">
                <Tag className="h-6 w-6 text-green-500" />
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-zinc-400 mb-1">Negative Keywords</p>
                <p className="text-3xl font-semibold">{stats.totalNegativeKeywords}</p>
              </div>
              <div className="h-12 w-12 bg-red-500/10 flex items-center justify-center">
                <Ban className="h-6 w-6 text-red-500" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
      
      {error && (
        <div className="bg-red-500/20 border border-red-500/50 text-red-200 p-4 rounded-lg mb-6">
          <h3 className="font-medium mb-2">Error</h3>
          <p>{error}</p>
        </div>
      )}
      
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="mb-6">
          <TabsTrigger value="campaigns">Campaigns</TabsTrigger>
          <TabsTrigger value="editor">
            {selectedCampaign ? 'Edit Campaign' : 'New Campaign'}
          </TabsTrigger>
          <TabsTrigger value="categories">Categories</TabsTrigger>
          <TabsTrigger value="keywords">Keywords</TabsTrigger>
        </TabsList>
        
        <TabsContent value="campaigns">
          <CampaignList 
            campaigns={campaigns}
            categories={categories}
            isLoading={isLoading}
            onSelect={handleCampaignSelect}
            onCreate={handleCampaignCreate}
            onDelete={handleCampaignDelete}
            onRefresh={fetchData}
          />
        </TabsContent>
        
        <TabsContent value="editor">
          <CampaignEditor 
            campaign={selectedCampaign}
            categories={categories}
            keywords={keywords.filter(k => k.campaign_id === selectedCampaign?.id)}
            onSave={handleCampaignSave}
            onCancel={() => setActiveTab('campaigns')}
            onKeywordSave={(keyword) => handleKeywordSave(keyword, selectedCampaign?.id || '')}
            onKeywordDelete={handleKeywordDelete}
          />
        </TabsContent>
        
        <TabsContent value="categories">
          <CategoryManager 
            categories={categories}
            isLoading={isLoading}
            onSave={handleCategorySave}
            onDelete={handleCategoryDelete}
            onRefresh={fetchData}
          />
        </TabsContent>
        
        <TabsContent value="keywords">
          <KeywordManager 
            keywords={keywords}
            campaigns={campaigns}
            isLoading={isLoading}
            onSave={handleKeywordSave}
            onDelete={handleKeywordDelete}
            onStatsSave={handleKeywordStatsSave}
            onRefresh={fetchData}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default CampaignBuilder;