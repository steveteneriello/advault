import React, { useState } from 'react';
import { Plus, Edit, Trash2, RefreshCw, BarChart } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Keyword, Campaign, KeywordStats } from '@/lib/campaign-manager-types';

interface KeywordManagerProps {
  keywords: Keyword[];
  campaigns: Campaign[];
  isLoading: boolean;
  onSave: (keyword: Keyword, campaignId: string) => void;
  onDelete: (id: string) => void;
  onStatsSave: (keywordId: string, stats: KeywordStats) => void;
  onRefresh: () => void;
}

const KeywordManager: React.FC<KeywordManagerProps> = ({
  keywords,
  campaigns,
  isLoading,
  onSave,
  onDelete,
  onStatsSave,
  onRefresh
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [campaignFilter, setCampaignFilter] = useState<string>('all');
  const [matchTypeFilter, setMatchTypeFilter] = useState<string>('all');
  const [editingKeyword, setEditingKeyword] = useState<Keyword | null>(null);
  const [editingStats, setEditingStats] = useState<KeywordStats | null>(null);
  const [showStatsModal, setShowStatsModal] = useState(false);
  
  const [formData, setFormData] = useState<{
    keyword: string;
    match_type: string;
    campaign_id: string;
  }>({
    keyword: '',
    match_type: 'broad',
    campaign_id: ''
  });
  
  const [statsFormData, setStatsFormData] = useState<KeywordStats>({
    local_volume: 0,
    market_volume: 0,
    keyword_difficulty: 0,
    cpc: 0,
    competitive_density: 0
  });

  const filteredKeywords = keywords.filter(keyword => {
    const matchesSearch = keyword.keyword.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCampaign = campaignFilter === 'all' || keyword.campaign_id === campaignFilter;
    const matchesType = matchTypeFilter === 'all' || keyword.match_type === matchTypeFilter;
    
    return matchesSearch && matchesCampaign && matchesType;
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleStatsInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setStatsFormData(prev => ({
      ...prev,
      [name]: name === 'competitive_density' ? parseFloat(value) : parseInt(value) || 0
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.keyword.trim() || !formData.campaign_id) {
      return;
    }
    
    const keywordData: Keyword = {
      id: editingKeyword?.id,
      keyword: formData.keyword,
      match_type: formData.match_type as 'broad' | 'phrase' | 'exact',
      campaign_id: formData.campaign_id
    };
    
    onSave(keywordData, formData.campaign_id);
    
    // Reset form
    setFormData({
      keyword: '',
      match_type: 'broad',
      campaign_id: ''
    });
    setEditingKeyword(null);
  };

  const handleStatsSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!editingStats?.keyword_id) {
      return;
    }
    
    onStatsSave(editingStats.keyword_id, statsFormData);
    
    // Close modal
    setShowStatsModal(false);
    setEditingStats(null);
  };

  const handleEdit = (keyword: Keyword) => {
    setEditingKeyword(keyword);
    setFormData({
      keyword: keyword.keyword,
      match_type: keyword.match_type || 'broad',
      campaign_id: keyword.campaign_id || ''
    });
  };

  const handleEditStats = (keyword: Keyword) => {
    setEditingStats({
      keyword_id: keyword.id,
      local_volume: keyword.stats?.local_volume || 0,
      market_volume: keyword.stats?.market_volume || 0,
      keyword_difficulty: keyword.stats?.keyword_difficulty || 0,
      cpc: keyword.stats?.cpc || 0,
      competitive_density: keyword.stats?.competitive_density || 0
    });
    
    setStatsFormData({
      local_volume: keyword.stats?.local_volume || 0,
      market_volume: keyword.stats?.market_volume || 0,
      keyword_difficulty: keyword.stats?.keyword_difficulty || 0,
      cpc: keyword.stats?.cpc || 0,
      competitive_density: keyword.stats?.competitive_density || 0
    });
    
    setShowStatsModal(true);
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle>Keywords</CardTitle>
              <CardDescription>
                Manage your campaign keywords
              </CardDescription>
            </div>
            <Button variant="outline" size="sm" onClick={onRefresh}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="mb-6">
            <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-4 gap-4 p-4 border border-zinc-800 rounded-lg">
              <div className="space-y-2">
                <Label htmlFor="keyword">Keyword</Label>
                <Input
                  id="keyword"
                  name="keyword"
                  value={formData.keyword}
                  onChange={handleInputChange}
                  placeholder="Enter keyword"
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
                placeholder="Search keywords..."
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
          ) : filteredKeywords.length === 0 ? (
            <div className="text-center py-12 border border-dashed border-zinc-700 rounded-lg">
              <p className="text-zinc-400 mb-4">No keywords found</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="border-b border-zinc-800">
                    <th className="text-left py-3 px-4">Keyword</th>
                    <th className="text-left py-3 px-4">Match Type</th>
                    <th className="text-left py-3 px-4">Campaign</th>
                    <th className="text-left py-3 px-4">Volume</th>
                    <th className="text-left py-3 px-4">Difficulty</th>
                    <th className="text-left py-3 px-4">CPC</th>
                    <th className="text-right py-3 px-4">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredKeywords.map((keyword) => {
                    const campaign = campaigns.find(c => c.id === keyword.campaign_id);
                    
                    return (
                      <tr key={keyword.id} className="border-b border-zinc-800">
                        <td className="py-3 px-4 font-medium">{keyword.keyword}</td>
                        <td className="py-3 px-4 capitalize">{keyword.match_type}</td>
                        <td className="py-3 px-4">{campaign?.name || '-'}</td>
                        <td className="py-3 px-4">
                          {keyword.stats?.local_volume || '-'}
                        </td>
                        <td className="py-3 px-4">
                          {keyword.stats?.keyword_difficulty ? `${keyword.stats.keyword_difficulty}/100` : '-'}
                        </td>
                        <td className="py-3 px-4">
                          {keyword.stats?.cpc ? `$${keyword.stats.cpc.toFixed(2)}` : '-'}
                        </td>
                        <td className="py-3 px-4 text-right">
                          <div className="flex justify-end gap-2">
                            <Button 
                              variant="ghost" 
                              size="sm"
                              onClick={() => handleEditStats(keyword)}
                            >
                              <BarChart className="h-4 w-4" />
                            </Button>
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
                                if (confirm('Are you sure you want to delete this keyword?')) {
                                  onDelete(keyword.id!);
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
      
      {/* Stats Modal */}
      {showStatsModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-6 w-full max-w-md">
            <h3 className="text-xl font-semibold mb-4">Edit Keyword Stats</h3>
            <form onSubmit={handleStatsSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="local_volume">Local Volume</Label>
                <Input
                  id="local_volume"
                  name="local_volume"
                  type="number"
                  min="0"
                  value={statsFormData.local_volume || 0}
                  onChange={handleStatsInputChange}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="market_volume">Market Volume</Label>
                <Input
                  id="market_volume"
                  name="market_volume"
                  type="number"
                  min="0"
                  value={statsFormData.market_volume || 0}
                  onChange={handleStatsInputChange}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="keyword_difficulty">Keyword Difficulty (0-100)</Label>
                <Input
                  id="keyword_difficulty"
                  name="keyword_difficulty"
                  type="number"
                  min="0"
                  max="100"
                  value={statsFormData.keyword_difficulty || 0}
                  onChange={handleStatsInputChange}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="cpc">CPC ($)</Label>
                <Input
                  id="cpc"
                  name="cpc"
                  type="number"
                  step="0.01"
                  min="0"
                  value={statsFormData.cpc || 0}
                  onChange={handleStatsInputChange}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="competitive_density">Competitive Density (0-1)</Label>
                <Input
                  id="competitive_density"
                  name="competitive_density"
                  type="number"
                  step="0.01"
                  min="0"
                  max="1"
                  value={statsFormData.competitive_density || 0}
                  onChange={handleStatsInputChange}
                />
              </div>
              
              <div className="flex justify-between pt-4">
                <Button type="button" variant="outline" onClick={() => setShowStatsModal(false)}>
                  Cancel
                </Button>
                <Button type="submit">
                  Save Stats
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default KeywordManager;