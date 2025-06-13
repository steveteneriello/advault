import React, { useState, useEffect } from 'react';
import { Save, X, Plus, Trash2 } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Campaign, Category, Keyword } from '@/lib/campaign-manager-types';

interface CampaignEditorProps {
  campaign: Campaign | null;
  categories: Category[];
  keywords: Keyword[];
  onSave: (campaign: Campaign) => void;
  onCancel: () => void;
  onKeywordSave: (keyword: Keyword) => void;
  onKeywordDelete: (id: string) => void;
}

const CampaignEditor: React.FC<CampaignEditorProps> = ({
  campaign,
  categories,
  keywords,
  onSave,
  onCancel,
  onKeywordSave,
  onKeywordDelete
}) => {
  const [formData, setFormData] = useState<Campaign>({
    name: '',
    description: '',
    category_id: '',
    start_date: '',
    end_date: '',
    status: 'draft',
    budget: 0,
    target_locations: []
  });
  
  const [newKeyword, setNewKeyword] = useState<Keyword>({
    keyword: '',
    match_type: 'broad'
  });
  
  const [activeTab, setActiveTab] = useState('details');
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (campaign) {
      setFormData({
        id: campaign.id,
        name: campaign.name,
        description: campaign.description || '',
        category_id: campaign.category_id || '',
        start_date: campaign.start_date || '',
        end_date: campaign.end_date || '',
        status: campaign.status || 'draft',
        budget: campaign.budget || 0,
        target_locations: campaign.target_locations || []
      });
    } else {
      // Reset form for new campaign
      setFormData({
        name: '',
        description: '',
        category_id: '',
        start_date: '',
        end_date: '',
        status: 'draft',
        budget: 0,
        target_locations: []
      });
    }
  }, [campaign]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: name === 'budget' ? parseFloat(value) || 0 : value
    }));
    
    // Clear error for this field
    if (errors[name]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      });
    }
  };

  const handleKeywordInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setNewKeyword(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};
    
    if (!formData.name.trim()) {
      newErrors.name = 'Campaign name is required';
    }
    
    if (formData.start_date && formData.end_date && new Date(formData.start_date) > new Date(formData.end_date)) {
      newErrors.end_date = 'End date must be after start date';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }
    
    onSave(formData);
  };

  const handleAddKeyword = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!newKeyword.keyword.trim()) {
      return;
    }
    
    onKeywordSave(newKeyword);
    
    // Reset form
    setNewKeyword({
      keyword: '',
      match_type: 'broad'
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>{campaign ? 'Edit Campaign' : 'Create Campaign'}</CardTitle>
        <CardDescription>
          {campaign ? 'Update campaign details' : 'Create a new marketing campaign'}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="mb-6">
            <TabsTrigger value="details">Campaign Details</TabsTrigger>
            <TabsTrigger value="keywords">Keywords</TabsTrigger>
            <TabsTrigger value="locations">Locations</TabsTrigger>
          </TabsList>
          
          <TabsContent value="details">
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="name">Campaign Name</Label>
                  <Input
                    id="name"
                    name="name"
                    value={formData.name}
                    onChange={handleInputChange}
                    placeholder="Enter campaign name"
                    className={errors.name ? 'border-red-500' : ''}
                  />
                  {errors.name && <p className="text-red-500 text-sm">{errors.name}</p>}
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="category_id">Category</Label>
                  <select
                    id="category_id"
                    name="category_id"
                    value={formData.category_id || ''}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-md text-sm"
                  >
                    <option value="">Select a category</option>
                    {categories.map(category => (
                      <option key={category.id} value={category.id}>
                        {category.name}
                      </option>
                    ))}
                  </select>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="start_date">Start Date</Label>
                  <Input
                    id="start_date"
                    name="start_date"
                    type="date"
                    value={formData.start_date || ''}
                    onChange={handleInputChange}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="end_date">End Date</Label>
                  <Input
                    id="end_date"
                    name="end_date"
                    type="date"
                    value={formData.end_date || ''}
                    onChange={handleInputChange}
                    className={errors.end_date ? 'border-red-500' : ''}
                  />
                  {errors.end_date && <p className="text-red-500 text-sm">{errors.end_date}</p>}
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="status">Status</Label>
                  <select
                    id="status"
                    name="status"
                    value={formData.status || 'draft'}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-md text-sm"
                  >
                    <option value="draft">Draft</option>
                    <option value="active">Active</option>
                    <option value="paused">Paused</option>
                    <option value="completed">Completed</option>
                  </select>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="budget">Budget</Label>
                  <Input
                    id="budget"
                    name="budget"
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.budget || ''}
                    onChange={handleInputChange}
                    placeholder="0.00"
                  />
                </div>
                
                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    name="description"
                    value={formData.description || ''}
                    onChange={handleInputChange}
                    placeholder="Enter campaign description"
                    rows={4}
                  />
                </div>
              </div>
            </form>
          </TabsContent>
          
          <TabsContent value="keywords">
            {!campaign?.id ? (
              <div className="text-center py-12 border border-dashed border-zinc-700 rounded-lg">
                <p className="text-zinc-400 mb-4">Save the campaign first to add keywords</p>
              </div>
            ) : (
              <div className="space-y-6">
                <div className="border border-zinc-800 rounded-lg p-4">
                  <h3 className="text-lg font-medium mb-4">Add Keyword</h3>
                  <form onSubmit={handleAddKeyword} className="flex flex-wrap gap-4 items-end">
                    <div className="space-y-2 flex-1">
                      <Label htmlFor="keyword">Keyword</Label>
                      <Input
                        id="keyword"
                        name="keyword"
                        value={newKeyword.keyword}
                        onChange={handleKeywordInputChange}
                        placeholder="Enter keyword"
                      />
                    </div>
                    
                    <div className="space-y-2 w-40">
                      <Label htmlFor="match_type">Match Type</Label>
                      <select
                        id="match_type"
                        name="match_type"
                        value={newKeyword.match_type || 'broad'}
                        onChange={handleKeywordInputChange}
                        className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-md text-sm"
                      >
                        <option value="broad">Broad</option>
                        <option value="phrase">Phrase</option>
                        <option value="exact">Exact</option>
                      </select>
                    </div>
                    
                    <Button type="submit">
                      <Plus className="h-4 w-4 mr-2" />
                      Add Keyword
                    </Button>
                  </form>
                </div>
                
                <div>
                  <h3 className="text-lg font-medium mb-4">Campaign Keywords</h3>
                  {keywords.length === 0 ? (
                    <div className="text-center py-8 border border-dashed border-zinc-700 rounded-lg">
                      <p className="text-zinc-400">No keywords added yet</p>
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full border-collapse">
                        <thead>
                          <tr className="border-b border-zinc-800">
                            <th className="text-left py-3 px-4">Keyword</th>
                            <th className="text-left py-3 px-4">Match Type</th>
                            <th className="text-left py-3 px-4">Volume</th>
                            <th className="text-left py-3 px-4">Difficulty</th>
                            <th className="text-left py-3 px-4">CPC</th>
                            <th className="text-right py-3 px-4">Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {keywords.map((keyword) => (
                            <tr key={keyword.id} className="border-b border-zinc-800">
                              <td className="py-3 px-4">{keyword.keyword}</td>
                              <td className="py-3 px-4 capitalize">{keyword.match_type}</td>
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
                                <Button 
                                  variant="ghost" 
                                  size="sm"
                                  onClick={() => {
                                    if (confirm('Are you sure you want to delete this keyword?')) {
                                      onKeywordDelete(keyword.id!);
                                    }
                                  }}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>
            )}
          </TabsContent>
          
          <TabsContent value="locations">
            {!campaign?.id ? (
              <div className="text-center py-12 border border-dashed border-zinc-700 rounded-lg">
                <p className="text-zinc-400 mb-4">Save the campaign first to add locations</p>
              </div>
            ) : (
              <div className="space-y-6">
                <div className="border border-zinc-800 rounded-lg p-6">
                  <h3 className="text-lg font-medium mb-4">Target Locations</h3>
                  <p className="text-zinc-400 mb-6">
                    Define the geographic areas where your campaign will run.
                  </p>
                  
                  <div className="text-center py-8">
                    <p className="text-zinc-400 mb-4">Location targeting will be implemented in a future update</p>
                    <Button disabled>Add Location</Button>
                  </div>
                </div>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
      <CardFooter className="flex justify-between">
        <Button variant="outline" onClick={onCancel}>
          <X className="h-4 w-4 mr-2" />
          Cancel
        </Button>
        <Button onClick={handleSubmit}>
          <Save className="h-4 w-4 mr-2" />
          Save Campaign
        </Button>
      </CardFooter>
    </Card>
  );
};

export default CampaignEditor;