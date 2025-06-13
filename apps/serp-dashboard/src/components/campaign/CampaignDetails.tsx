import React from 'react';

interface CampaignDetailsProps {
  campaignData: {
    name: string;
    type: string;
    assignment: string;
    network: string;
  };
  handleInputChange: (field: string, value: any) => void;
  onContinue: () => void;
}

const CampaignDetails: React.FC<CampaignDetailsProps> = ({ 
  campaignData, 
  handleInputChange, 
  onContinue 
}) => {
  return (
    <div className="p-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className="block text-sm font-medium mb-2">Campaign Name</label>
          <input
            type="text"
            value={campaignData.name}
            onChange={(e) => handleInputChange('name', e.target.value)}
            className="w-full px-4 py-2 rounded-lg focus:outline-none focus:border-blue-500 bg-zinc-800 border-zinc-700 text-white"
            placeholder="e.g., Phoenix Plumbers Q1 2024"
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-2">Campaign Type</label>
          <select
            value={campaignData.type}
            onChange={(e) => handleInputChange('type', e.target.value)}
            className="w-full px-4 py-2 rounded-lg focus:outline-none focus:border-blue-500 bg-zinc-800 border-zinc-700 text-white"
          >
            <option value="client">Client Campaign</option>
            <option value="market">Market Campaign</option>
            <option value="prospect">Prospect Campaign</option>
            <option value="data">Data Collection</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium mb-2">Assignment</label>
          <select
            value={campaignData.assignment}
            onChange={(e) => handleInputChange('assignment', e.target.value)}
            className="w-full px-4 py-2 rounded-lg focus:outline-none focus:border-blue-500 bg-zinc-800 border-zinc-700 text-white"
          >
            <option value="">Select Client/Market/Prospect</option>
            <option value="abc-plumbing">ABC Plumbing Co.</option>
            <option value="xyz-hvac">XYZ HVAC Services</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium mb-2">Network</label>
          <select
            value={campaignData.network}
            onChange={(e) => handleInputChange('network', e.target.value)}
            className="w-full px-4 py-2 rounded-lg focus:outline-none focus:border-blue-500 bg-zinc-800 border-zinc-700 text-white"
          >
            <option value="google">Google</option>
            <option value="bing">Bing</option>
          </select>
        </div>
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

export default CampaignDetails;