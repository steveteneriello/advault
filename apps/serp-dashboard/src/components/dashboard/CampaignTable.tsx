import React, { useState } from 'react';
import { Search, Filter, Download, Edit, Copy, Play, Pause } from 'lucide-react';

interface Campaign {
  id: number;
  name: string;
  client: string;
  keywords: number;
  schedule: string;
  status: 'active' | 'paused' | 'completed';
}

const CampaignTable: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  
  // Sample data
  const campaigns: Campaign[] = [
    { id: 1, name: 'Phoenix Plumbers Q1', client: 'ABC Plumbing Co.', keywords: 24, schedule: 'Daily @ 9:00 AM', status: 'active' },
    { id: 2, name: 'Las Vegas HVAC Services', client: 'Cool Air LLC', keywords: 18, schedule: 'Weekly @ 6:00 AM', status: 'paused' },
    { id: 3, name: 'Market Intel - Roofing', client: 'Internal', keywords: 45, schedule: 'Monthly @ 12:00 AM', status: 'completed' },
    { id: 4, name: 'Denver Plumbing Services', client: 'Pipe Masters Inc.', keywords: 32, schedule: 'Daily @ 8:00 AM', status: 'active' },
    { id: 5, name: 'Seattle Home Services', client: 'Northwest Repairs', keywords: 28, schedule: 'Weekly @ 7:00 AM', status: 'active' }
  ];
  
  const filteredCampaigns = campaigns.filter(campaign => 
    campaign.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    campaign.client.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div>
      <div className="p-4 border-b border-zinc-800 flex items-center justify-between">
        <div className="flex-1 max-w-md relative">
          <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-zinc-400" />
          <input
            type="text"
            placeholder="Search campaigns..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-12 pr-4 py-2 rounded-lg focus:outline-none focus:border-blue-500 bg-zinc-800 border-zinc-700 text-white"
          />
        </div>
        <div className="flex gap-2">
          <button className="px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-sm font-medium hover:bg-zinc-700 transition-colors">
            <Filter className="w-4 h-4 inline mr-2" />
            Filter
          </button>
          <button className="px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-sm font-medium hover:bg-zinc-700 transition-colors">
            <Download className="w-4 h-4 inline mr-2" />
            Export
          </button>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="bg-zinc-800 text-xs font-medium text-zinc-400 uppercase tracking-wider">
              <th className="px-6 py-3 text-left">Campaign Name</th>
              <th className="px-6 py-3 text-left">Client</th>
              <th className="px-6 py-3 text-left">Keywords</th>
              <th className="px-6 py-3 text-left">Schedule</th>
              <th className="px-6 py-3 text-left">Status</th>
              <th className="px-6 py-3 text-left">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-800">
            {filteredCampaigns.map((campaign) => (
              <tr key={campaign.id} className="hover:bg-zinc-800 transition-colors">
                <td className="px-6 py-4">{campaign.name}</td>
                <td className="px-6 py-4">{campaign.client}</td>
                <td className="px-6 py-4">{campaign.keywords} keywords</td>
                <td className="px-6 py-4">{campaign.schedule}</td>
                <td className="px-6 py-4">
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                    campaign.status === 'active' ? 'bg-green-500/20 text-green-400' :
                    campaign.status === 'paused' ? 'bg-yellow-500/20 text-yellow-400' :
                    'bg-gray-500/20 text-gray-400'
                  }`}>
                    {campaign.status}
                  </span>
                </td>
                <td className="px-6 py-4">
                  <div className="flex gap-2">
                    <button className="p-1.5 rounded bg-zinc-800 hover:bg-zinc-700 transition-colors">
                      <Edit className="w-4 h-4" />
                    </button>
                    <button className="p-1.5 rounded bg-zinc-800 hover:bg-zinc-700 transition-colors">
                      <Copy className="w-4 h-4" />
                    </button>
                    {campaign.status === 'active' ? (
                      <button className="p-1.5 rounded bg-zinc-800 hover:bg-zinc-700 transition-colors">
                        <Pause className="w-4 h-4" />
                      </button>
                    ) : campaign.status === 'paused' ? (
                      <button className="p-1.5 rounded bg-zinc-800 hover:bg-zinc-700 transition-colors">
                        <Play className="w-4 h-4" />
                      </button>
                    ) : null}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default CampaignTable;