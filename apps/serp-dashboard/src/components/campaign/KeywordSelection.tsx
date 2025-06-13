import React from 'react';

interface KeywordSelectionProps {
  campaignData: {
    category: string;
    adhocKeywords: string;
  };
  handleInputChange: (field: string, value: any) => void;
  selectedCampaigns: number[];
  setSelectedCampaigns: (campaigns: number[]) => void;
  selectedKeywords: number[];
  setSelectedKeywords: (keywords: number[]) => void;
  onContinue: () => void;
}

const KeywordSelection: React.FC<KeywordSelectionProps> = ({
  campaignData,
  handleInputChange,
  selectedCampaigns,
  setSelectedCampaigns,
  selectedKeywords,
  setSelectedKeywords,
  onContinue
}) => {
  // Sample data
  const campaigns = [
    { id: 1, name: 'Water Heater Services', keywords: 12, category: 'plumbing' },
    { id: 2, name: 'Emergency Plumbing', keywords: 8, category: 'plumbing' },
    { id: 3, name: 'Drain Cleaning', keywords: 15, category: 'plumbing' },
    { id: 4, name: 'Build Custom Campaign', keywords: 0, category: 'custom' }
  ];

  const keywords = [
    { id: 1, text: 'water heater repair', volume: '2.9K', cpc: '$12', competition: 'High' },
    { id: 2, text: 'water heater replacement', volume: '1.8K', cpc: '$15', competition: 'High' },
    { id: 3, text: 'tankless water heater', volume: '3.2K', cpc: '$18', competition: 'Med' },
    { id: 4, text: 'water heater installation', volume: '2.1K', cpc: '$14', competition: 'High' },
    { id: 5, text: 'hot water heater repair', volume: '1.5K', cpc: '$13', competition: 'Med' }
  ];

  const toggleCampaign = (campaignId: number) => {
    setSelectedCampaigns(prev => 
      prev.includes(campaignId) 
        ? prev.filter(id => id !== campaignId)
        : [...prev, campaignId]
    );
  };

  const toggleKeyword = (keywordId: number) => {
    setSelectedKeywords(prev => 
      prev.includes(keywordId) 
        ? prev.filter(id => id !== keywordId)
        : [...prev, keywordId]
    );
  };

  return (
    <div className="p-6">
      <div className="mb-6">
        <label className="block text-sm font-medium mb-2">Category</label>
        <select
          value={campaignData.category}
          onChange={(e) => handleInputChange('category', e.target.value)}
          className="w-full px-4 py-2 rounded-lg focus:outline-none focus:border-blue-500 bg-zinc-800 border-zinc-700 text-white"
        >
          <option value="plumbing">Plumbing</option>
          <option value="hvac">HVAC</option>
          <option value="roofing">Roofing</option>
          <option value="electrical">Electrical</option>
        </select>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 h-96">
        <div className="bg-zinc-800 rounded-lg p-4 overflow-y-auto">
          <h4 className="font-medium mb-4">Campaigns</h4>
          <div className="space-y-3">
            {campaigns.map(campaign => (
              <div
                key={campaign.id}
                onClick={() => toggleCampaign(campaign.id)}
                className={`p-4 bg-zinc-900 border rounded-lg cursor-pointer transition-all ${
                  selectedCampaigns.includes(campaign.id)
                    ? 'border-blue-500 bg-blue-500/10'
                    : 'border-zinc-800 hover:bg-zinc-800'
                }`}
              >
                <div className="font-medium">{campaign.name}</div>
                <div className="text-sm text-zinc-400">{campaign.keywords} keywords</div>
              </div>
            ))}
          </div>
        </div>
        
        <div className="bg-zinc-800 rounded-lg p-4 overflow-y-auto">
          <h4 className="font-medium mb-4">Keywords</h4>
          <div className="space-y-2">
            {keywords.map(keyword => (
              <div
                key={keyword.id}
                onClick={() => toggleKeyword(keyword.id)}
                className={`p-3 bg-zinc-900 border rounded-lg cursor-pointer transition-all ${
                  selectedKeywords.includes(keyword.id)
                    ? 'border-blue-500 bg-blue-500/10'
                    : 'border-zinc-800 hover:bg-zinc-800'
                }`}
              >
                <div className="flex justify-between items-center">
                  <div className="font-medium text-sm">{keyword.text}</div>
                  <div className="flex gap-4 text-xs text-zinc-400">
                    <span>Vol: {keyword.volume}</span>
                    <span>CPC: {keyword.cpc}</span>
                    <span>Comp: {keyword.competition}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
      
      <div className="mt-4">
        <label className="block text-sm font-medium mb-2">Additional Ad-hoc Keywords (comma separated)</label>
        <input
          type="text"
          value={campaignData.adhocKeywords}
          onChange={(e) => handleInputChange('adhocKeywords', e.target.value)}
          className="w-full px-4 py-2 rounded-lg focus:outline-none focus:border-blue-500 bg-zinc-800 border-zinc-700 text-white"
          placeholder="Enter custom keywords..."
        />
      </div>
      
      <div className="flex justify-end mt-6">
        <button 
          onClick={onContinue}
          className="px-4 py-2 bg-blue-500 rounded-lg text-sm font-medium hover:bg-blue-600 transition-colors text-white"
        >
          Save & Continue
        </button>
      </div>
    </div>
  );
};

export default KeywordSelection;