import React from 'react';
import CampaignBuilder from '@/components/campaign/CampaignBuilder';

const Campaigns: React.FC = () => {
  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-6">Campaign Builder</h1>
      <CampaignBuilder />
    </div>
  );
};

export default Campaigns;