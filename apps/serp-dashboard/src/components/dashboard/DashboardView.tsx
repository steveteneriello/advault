import React from 'react';
import { BarChart3, Plus } from 'lucide-react';
import StatsCard from './StatsCard';
import CampaignTable from './CampaignTable';
import SupportingPages from './SupportingPages';

const DashboardView: React.FC = () => {
  return (
    <div className="p-8">
      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <StatsCard 
          title="Active Campaigns"
          value="24"
          subtext="8 upcoming campaigns"
        />
        <StatsCard 
          title="Scheduled Campaigns"
          value="12"
          subtext="Campaigns scheduled today"
        />
        <StatsCard 
          title="Campaigns Completed"
          value="156"
          subtext="This month across 10 active clients"
        />
        <StatsCard 
          title="Search Volume"
          value="48.2K"
          subtext="Forecasted 72K through end of month"
        />
      </div>

      {/* Chart */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-6 mb-8">
        <h3 className="text-lg font-semibold mb-4">Campaign Performance Overview</h3>
        <div className="h-64 bg-zinc-800 rounded-lg flex items-center justify-center text-zinc-400">
          <BarChart3 className="w-8 h-8 mr-2" />
          [Bar Chart: Active | Scheduled | Completed | Search Volume]
        </div>
      </div>

      {/* Campaign Table */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-lg overflow-hidden mb-8">
        <div className="p-6 border-b border-zinc-800 flex items-center justify-between">
          <h2 className="text-xl font-semibold">Recent Campaigns</h2>
          <button className="px-4 py-2 bg-blue-500 rounded-lg text-sm font-medium hover:bg-blue-600 transition-colors flex items-center gap-2 text-white">
            <Plus className="w-4 h-4" />
            Create Campaign
          </button>
        </div>
        
        <CampaignTable />
      </div>

      {/* Supporting Pages */}
      <SupportingPages />
    </div>
  );
};

export default DashboardView;