import React, { useState, useEffect } from 'react';
import { Search, Plus, Edit, Trash2, RefreshCw, Copy, ToggleLeft, ToggleRight } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from "@/components/ui/table";
import { Campaign, Category } from '@/lib/campaign-manager-types';
import { supabase } from '@/lib/supabase';

interface CampaignListProps {
  campaigns: Campaign[];
  categories: Category[];
  isLoading: boolean;
  onSelect: (campaign: Campaign) => void;
  onCreate: () => void;
  onDelete: (id: string) => void;
  onRefresh: () => void;
}

const CampaignList: React.FC<CampaignListProps> = ({
  campaigns,
  categories,
  isLoading,
  onSelect,
  onCreate,
  onDelete,
  onRefresh
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [displayCampaigns, setDisplayCampaigns] = useState<Campaign[]>([]);
  const [keywordCounts, setKeywordCounts] = useState<Record<string, { keywords: number, negativeKeywords: number }>>({});

  useEffect(() => {
    filterCampaigns();
    fetchKeywordCounts();
  }, [campaigns, searchTerm, categoryFilter]);

  const filterCampaigns = () => {
    let filtered = [...campaigns];
    
    // Apply search filter
    if (searchTerm) {
      filtered = filtered.filter(campaign => {
        const searchLower = searchTerm.toLowerCase();
        return (
          campaign.name.toLowerCase().includes(searchLower) ||
          (campaign.description?.toLowerCase().includes(searchLower) || false)
        );
      });
    }
    
    // Apply category filter
    if (categoryFilter !== 'all') {
      filtered = filtered.filter(campaign => campaign.category_id === categoryFilter);
    }
    
    setDisplayCampaigns(filtered);
  };

  const fetchKeywordCounts = async () => {
    try {
      // Get all campaign IDs
      const campaignIds = campaigns.map(c => c.id).filter(Boolean);
      
      if (campaignIds.length === 0) return;
      
      // Fetch keyword counts
      const { data: keywordData, error: keywordError } = await supabase
        .from('campaign_manager_keywords')
        .select('campaign_id')
        .in('campaign_id', campaignIds);
      
      // Fetch negative keyword counts
      const { data: negKeywordData, error: negKeywordError } = await supabase
        .from('campaign_manager_negative_keywords')
        .select('campaign_id')
        .in('campaign_id', campaignIds);
      
      if (keywordError || negKeywordError) {
        console.warn("Database count failed:", keywordError || negKeywordError);
        return;
      }
      
      // Calculate counts for each campaign
      const counts: Record<string, { keywords: number, negativeKeywords: number }> = {};
      
      campaignIds.forEach(id => {
        if (id) {
          counts[id] = { 
            keywords: keywordData?.filter(k => k.campaign_id === id).length || 0,
            negativeKeywords: negKeywordData?.filter(k => k.campaign_id === id).length || 0
          };
        }
      });
      
      setKeywordCounts(counts);
    } catch (error) {
      console.error("Error fetching keyword counts:", error);
    }
  };

  const getCategoryName = (categoryId?: string) => {
    if (!categoryId) return 'Uncategorized';
    const category = categories.find(c => c.id === categoryId);
    return category ? category.name : 'Unknown';
  };

  const handleToggleStatus = async (campaign: Campaign) => {
    try {
      const newStatus = campaign.status === 'active' ? 'paused' : 'active';
      
      // Update in database
      const { error } = await supabase
        .from('campaign_manager_campaigns')
        .update({ status: newStatus })
        .eq('id', campaign.id);
      
      if (error) {
        console.error("Error updating campaign status:", error);
        return;
      }
      
      // Update local state
      onRefresh();
    } catch (error) {
      console.error("Error toggling campaign status:", error);
    }
  };

  const handleCloneCampaign = async (campaign: Campaign) => {
    try {
      // Create a clone of the campaign
      const { data: clonedCampaign, error: campaignError } = await supabase
        .from('campaign_manager_campaigns')
        .insert({
          name: `${campaign.name} (Clone)`,
          category_id: campaign.category_id,
          description: campaign.description,
          status: 'draft'
        })
        .select()
        .single();
      
      if (campaignError || !clonedCampaign) {
        console.error("Error cloning campaign:", campaignError);
        return;
      }
      
      // Clone keywords
      const { data: keywords, error: keywordsError } = await supabase
        .from('campaign_manager_keywords')
        .select('*')
        .eq('campaign_id', campaign.id);
      
      if (!keywordsError && keywords && keywords.length > 0) {
        // Prepare keywords for the cloned campaign
        const clonedKeywords = keywords.map(k => ({
          campaign_id: clonedCampaign.id,
          keyword: k.keyword,
          match_type: k.match_type
        }));
        
        // Insert cloned keywords
        await supabase
          .from('campaign_manager_keywords')
          .insert(clonedKeywords);
      }
      
      // Clone negative keywords
      const { data: negKeywords, error: negKeywordsError } = await supabase
        .from('campaign_manager_negative_keywords')
        .select('*')
        .eq('campaign_id', campaign.id);
      
      if (!negKeywordsError && negKeywords && negKeywords.length > 0) {
        // Prepare negative keywords for the cloned campaign
        const clonedNegKeywords = negKeywords.map(k => ({
          campaign_id: clonedCampaign.id,
          keyword: k.keyword,
          match_type: k.match_type
        }));
        
        // Insert cloned negative keywords
        await supabase
          .from('campaign_manager_negative_keywords')
          .insert(clonedNegKeywords);
      }
      
      // Refresh the campaign list
      onRefresh();
    } catch (error) {
      console.error("Error cloning campaign:", error);
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-center">
          <div>
            <CardTitle>Campaigns</CardTitle>
            <CardDescription>
              Manage your marketing campaigns
            </CardDescription>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={onRefresh}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
            <Button onClick={onCreate}>
              <Plus className="h-4 w-4 mr-2" />
              New Campaign
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="mb-6 flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
            <Input
              placeholder="Search campaigns..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <div className="flex gap-4">
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-md text-sm"
            >
              <option value="all">All Categories</option>
              {categories.map(category => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {isLoading ? (
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
          </div>
        ) : displayCampaigns.length === 0 ? (
          <div className="text-center py-12 border border-dashed border-zinc-700 rounded-lg">
            <p className="text-zinc-400 mb-4">No campaigns found</p>
            <Button onClick={onCreate}>
              <Plus className="h-4 w-4 mr-2" />
              Create Campaign
            </Button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Status</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Keywords</TableHead>
                  <TableHead>Negative Keywords</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {displayCampaigns.map((campaign) => (
                  <TableRow key={campaign.id} className="cursor-pointer hover:bg-zinc-800/50" onClick={() => onSelect(campaign)}>
                    <TableCell>
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleToggleStatus(campaign);
                        }}
                      >
                        {campaign.status === 'active' ? (
                          <ToggleRight className="h-5 w-5 text-green-500" />
                        ) : (
                          <ToggleLeft className="h-5 w-5 text-zinc-500" />
                        )}
                      </Button>
                    </TableCell>
                    <TableCell>
                      <div className="font-medium">{campaign.name}</div>
                      {campaign.description && (
                        <div className="text-sm text-zinc-400 truncate max-w-xs">{campaign.description}</div>
                      )}
                    </TableCell>
                    <TableCell>{getCategoryName(campaign.category_id)}</TableCell>
                    <TableCell>
                      {keywordCounts[campaign.id!]?.keywords || 0} keywords
                    </TableCell>
                    <TableCell>
                      {keywordCounts[campaign.id!]?.negativeKeywords || 0} negative keywords
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            onSelect(campaign);
                          }}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleCloneCampaign(campaign);
                          }}
                        >
                          <Copy className="h-4 w-4" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            if (confirm('Are you sure you want to delete this campaign?')) {
                              onDelete(campaign.id!);
                            }
                          }}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default CampaignList;