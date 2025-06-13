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

const CampaignManager: React.FC = () => {
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
      // Fetch campaigns
      const { data: campaignData, error: campaignError } = await supabase
        .from('campaign_manager_campaigns')
        .select('*, category:category_id(id, name)');
      
      if (campaignError) throw campaignError;
      
      // Fetch categories
      const { data: categoryData, error: categoryError } = await supabase
        .from('campaign_manager_categories')
        .select('*, parent_category:parent_category_id(id, name)');
      
      if (categoryError) throw categoryError;
      
      // Fetch keywords
      const { data: keywordData, error: keywordError } = await supabase
        .from('campaign_manager_keywords')
        .select('*, campaign:campaign_id(id, name), stats:campaign_manager_keyword_stats(*)');
      
      if (keywordError) throw keywordError;
      
      // Fetch negative keywords
      const { data: negativeKeywordData, error: negativeKeywordError } = await supabase
        .from('campaign_manager_negative_keywords')
        .select('*, campaign:campaign_id(id, name)');
      
      if (negativeKeywordError) throw negativeKeywordError;
      
      setCampaigns(campaignData || []);
      setCategories(categoryData || []);
      setKeywords(keywordData || []);
      setNegativeKeywords(negativeKeywordData || []);
      
      // Calculate stats
      const activeCampaigns = campaignData ? campaignData.filter(c => c.status === 'active').length : 0;
      const totalCategories = categoryData ? categoryData.length : 0;
      const totalKeywords = keywordData ? keywordData.length : 0;
      const totalNegativeKeywords = negativeKeywordData ? negativeKeywordData.length : 0;
      
      setStats({
        activeCampaigns,
        totalCategories,
        totalKeywords,
        totalNegativeKeywords
      });
    } catch (err: any) {
      console.error('Error fetching data:', err);
      setError(err.message || 'Failed to load data');
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
          
        if (error) throw error;
        savedCampaign = data;
      } else {
        // Create new campaign
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
          
        if (error) throw error;
        savedCampaign = data;
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
          
        if (error) throw error;
        savedCategory = data;
      } else {
        // Create new category
        const { data, error } = await supabase
          .from('campaign_manager_categories')
          .insert({
            name: category.name,
            description: category.description,
            parent_category_id: category.parent_category_id
          })
          .select('*, parent_category:parent_category_id(id, name)')
          .single();
          
        if (error) throw error;
        savedCategory = data;
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
          
        if (error) throw error;
        savedKeyword = data;
      } else {
        // Create new keyword
        const { data, error } = await supabase
          .from('campaign_manager_keywords')
          .insert({
            campaign_id: campaignId,
            keyword: keyword.keyword,
            match_type: keyword.match_type || 'broad'
          })
          .select('*, campaign:campaign_id(id, name), stats:campaign_manager_keyword_stats(*)')
          .single();
          
        if (error) throw error;
        savedKeyword = data;
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
          last_updated: new Date().toISOString()
        })
        .select();
        
      if (error) throw error;
      
      // Update keywords list with new stats
      setKeywords(keywords.map(k => {
        if (k.id === keywordId) {
          return { ...k, stats: data[0] };
        }
        return k;
      }));
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
        
      if (error) throw error;
      
      // Update campaigns list
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
        
      if (error) throw error;
      
      // Update categories list
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
        
      if (error) throw error;
      
      // Update keywords list
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
      <h1 className="text-2xl font-bold mb-6">Campaign Manager</h1>
      
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-zinc-400 mb-1">Active Campaigns</p>
                <p className="text-3xl font-semibold">{stats.activeCampaigns}</p>
              </div>
              <div className="h-12 w-12 bg-blue-500/10 rounded-full flex items-center justify-center">
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
              <div className="h-12 w-12 bg-purple-500/10 rounded-full flex items-center justify-center">
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
              <div className="h-12 w-12 bg-green-500/10 rounded-full flex items-center justify-center">
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
              <div className="h-12 w-12 bg-red-500/10 rounded-full flex items-center justify-center">
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

export default CampaignManager;