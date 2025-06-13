import React, { useState, useEffect } from 'react';
import { Plus, Edit, Trash2, RefreshCw } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Campaign } from '@/lib/campaign-manager-types';
import { supabase } from '@/lib/supabase';

interface NegativeKeyword {
  id?: string;
  campaign_id?: string;
  keyword: string;
  match_type?: 'broad' | 'phrase' | 'exact';
  created_at?: string;
  updated_at?: string;
}

interface NegativeKeywordManagerProps {
  campaigns: Campaign[];
  isLoading: boolean;
  onRefresh: () => void;
}

const NegativeKeywordManager: React.FC<NegativeKeywordManagerProps> = ({
  campaigns,
  isLoading,
  onRefresh
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [campaignFilter, setCampaignFilter] = useState<string>('all');
  const [matchTypeFilter, setMatchTypeFilter] = useState<string>('all');
  const [editingKeyword, setEditingKeyword] = useState<NegativeKeyword | null>(null);
  const [displayKeywords, setDisplayKeywords] = useState<NegativeKeyword[]>([]);
  const [negativeKeywords, setNegativeKeywords] = useState<NegativeKeyword[]>([]);
  
  const [formData, setFormData] = useState<{
    keyword: string;
    match_type: string;
    campaign_id: string;
  }>({
    keyword: '',
    match_type: 'broad',
    campaign_id: ''
  });

  useEffect(() => {
    fetchNegativeKeywords();
  }, []);

  useEffect(() => {
    filterKeywords();
  }, [negativeKeywords, searchTerm, campaignFilter, matchTypeFilter]);

  const fetchNegativeKeywords = async () => {
    try {
      const { data, error } = await supabase
        .from('campaign_manager_negative_keywords')
        .select('*, campaign:campaign_id(id, name)');
      
      if (error) throw error;
      
      setNegativeKeywords(data || []);
    } catch (error) {
      console.error('Error fetching negative keywords:', error);
    }
  };

  const filterKeywords = () => {
    let filtered = [...negativeKeywords];
    
    // Apply search filter
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      filtered = filtered.filter(keyword => 
        keyword.keyword.toLowerCase().includes(searchLower)
      );
    }
    
    // Apply campaign filter
    if (campaignFilter !== 'all') {
      filtered = filtered.filter(keyword => keyword.campaign_id === campaignFilter);
    }
    
    // Apply match type filter
    if (matchTypeFilter !== 'all') {
      filtered = filtered.filter(keyword => keyword.match_type === matchTypeFilter);
    }
    
    setDisplayKeywords(filtered);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.keyword.trim() || !formData.campaign_id) {
      return;
    }
    
    try {
      if (editingKeyword?.id) {
        // Update existing keyword
        const { data, error } = await supabase
          .from('campaign_manager_negative_keywords')
          .update({
            keyword: formData.keyword,
            match_type: formData.match_type as 'broad' | 'phrase' | 'exact',
            updated_at: new Date().toISOString()
          })
          .eq('id', editingKeyword.id)
          .select('*, campaign:campaign_id(id, name)')
          .single();
          
        if (error) throw error;
        
        setNegativeKeywords(prev => 
          prev.map(k => k.id === editingKeyword.id ? data : k)
        );
      } else {
        // Create new keyword
        const { data, error } = await supabase
          .from('campaign_manager_negative_keywords')
          .insert({
            campaign_id: formData.campaign_id,
            keyword: formData.keyword,
            match_type: formData.match_type as 'broad' | 'phrase' | 'exact'
          })
          .select('*, campaign:campaign_id(id, name)')
          .single();
          
        if (error) throw error;
        
        setNegativeKeywords(prev => [...prev, data]);
      }
      
      // Reset form
      setFormData({
        keyword: '',
        match_type: 'broad',
        campaign_id: ''
      });
      setEditingKeyword(null);
      
      // Refresh parent component
      onRefresh();
    } catch (error) {
      console.error('Error saving negative keyword:', error);
    }
  };

  const handleEdit = (keyword: NegativeKeyword) => {
    setEditingKeyword(keyword);
    setFormData({
      keyword: keyword.keyword,
      match_type: keyword.match_type || 'broad',
      campaign_id: keyword.campaign_id || ''
    });
  };

  const handleDelete = async (id: string) => {
    try {
      const { error } = await supabase
        .from('campaign_manager_negative_keywords')
        .delete()
        .eq('id', id);
        
      if (error) throw error;
      
      setNegativeKeywords(prev => prev.filter(k => k.id !== id));
      
      // Refresh parent component
      onRefresh();
    } catch (error) {
      console.error('Error deleting negative keyword:', error);
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-center">
          <div>
            <CardTitle>Negative Keywords</CardTitle>
            <CardDescription>
              Manage keywords you want to exclude from your campaigns
            </CardDescription>
          </div>
          <Button variant="outline" size="sm" onClick={fetchNegativeKeywords}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="mb-6">
          <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-4 gap-4 p-4 border border-zinc-800 rounded-lg">
            <div className="space-y-2">
              <Label htmlFor="keyword">Negative Keyword</Label>
              <Input
                id="keyword"
                name="keyword"
                value={formData.keyword}
                onChange={handleInputChange}
                placeholder="Enter keyword to exclude"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="match_type">Match Type</Label>
              <select
                id="match_type"
                name="match_type"
                value={formData.match_type}
                onChange={handleInputChange}
                className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-md text-sm"
              >
                <option value="broad">Broad</option>
                <option value="phrase">Phrase</option>
                <option value="exact">Exact</option>
              </select>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="campaign_id">Campaign</Label>
              <select
                id="campaign_id"
                name="campaign_id"
                value={formData.campaign_id}
                onChange={handleInputChange}
                className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-md text-sm"
              >
                <option value="">Select a campaign</option>
                {campaigns.map(campaign => (
                  <option key={campaign.id} value={campaign.id}>
                    {campaign.name}
                  </option>
                ))}
              </select>
            </div>
            
            <div className="flex items-end">
              <Button type="submit" className="w-full">
                {editingKeyword ? 'Update Keyword' : (
                  <>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Keyword
                  </>
                )}
              </Button>
            </div>
          </form>
        </div>
        
        <div className="mb-6 flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Input
              placeholder="Search negative keywords..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="flex gap-4">
            <select
              value={campaignFilter}
              onChange={(e) => setCampaignFilter(e.target.value)}
              className="px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-md text-sm"
            >
              <option value="all">All Campaigns</option>
              {campaigns.map(campaign => (
                <option key={campaign.id} value={campaign.id}>
                  {campaign.name}
                </option>
              ))}
            </select>
            <select
              value={matchTypeFilter}
              onChange={(e) => setMatchTypeFilter(e.target.value)}
              className="px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-md text-sm"
            >
              <option value="all">All Match Types</option>
              <option value="broad">Broad</option>
              <option value="phrase">Phrase</option>
              <option value="exact">Exact</option>
            </select>
          </div>
        </div>

        {isLoading ? (
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
          </div>
        ) : displayKeywords.length === 0 ? (
          <div className="text-center py-12 border border-dashed border-zinc-700 rounded-lg">
            <p className="text-zinc-400 mb-4">No negative keywords found</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b border-zinc-800">
                  <th className="text-left py-3 px-4">Keyword</th>
                  <th className="text-left py-3 px-4">Match Type</th>
                  <th className="text-left py-3 px-4">Campaign</th>
                  <th className="text-right py-3 px-4">Actions</th>
                </tr>
              </thead>
              <tbody>
                {displayKeywords.map((keyword) => {
                  const campaign = campaigns.find(c => c.id === keyword.campaign_id);
                  
                  return (
                    <tr key={keyword.id} className="border-b border-zinc-800">
                      <td className="py-3 px-4 font-medium">{keyword.keyword}</td>
                      <td className="py-3 px-4 capitalize">{keyword.match_type}</td>
                      <td className="py-3 px-4">{campaign?.name || '-'}</td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex justify-end gap-2">
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={() => handleEdit(keyword)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={() => {
                              if (confirm('Are you sure you want to delete this negative keyword?')) {
                                handleDelete(keyword.id!);
                              }
                            }}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default NegativeKeywordManager;