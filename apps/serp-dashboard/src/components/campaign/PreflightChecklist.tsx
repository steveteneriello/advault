import React from 'react';

interface PreflightChecklistProps {
  campaignData: {
    name: string;
    type: string;
    network: string;
    worker: string;
    frequency: string;
    runTime: string;
  };
  handleInputChange: (field: string, value: any) => void;
  selectedLocations: string[];
  selectedKeywords: number[];
  calculateSearchVolume: () => number;
}

const PreflightChecklist: React.FC<PreflightChecklistProps> = ({
  campaignData,
  handleInputChange,
  selectedLocations,
  selectedKeywords,
  calculateSearchVolume
}) => {
  return (
    <div className="p-6">
      <div className="bg-zinc-800 rounded-lg p-6 mb-6">
        <div className="space-y-3">
          <div className="flex justify-between py-2 border-b border-zinc-700">
            <span className="text-zinc-400">Campaign Name</span>
            <span className="font-medium">{campaignData.name || 'Not set'}</span>
          </div>
          <div className="flex justify-between py-2 border-b border-zinc-700">
            <span className="text-zinc-400">Type</span>
            <span className="font-medium">{campaignData.type} Campaign</span>
          </div>
          <div className="flex justify-between py-2 border-b border-zinc-700">
            <span className="text-zinc-400">Network</span>
            <span className="font-medium">{campaignData.network}</span>
          </div>
          <div className="flex justify-between py-2 border-b border-zinc-700">
            <span className="text-zinc-400">Locations</span>
            <span className="font-medium">{selectedLocations.length} cities selected</span>
          </div>
          <div className="flex justify-between py-2 border-b border-zinc-700">
            <span className="text-zinc-400">Keywords</span>
            <span className="font-medium">{selectedKeywords.length} keywords</span>
          </div>
          <div className="flex justify-between py-2 border-b border-zinc-700">
            <span className="text-zinc-400">Schedule</span>
            <span className="font-medium">{campaignData.frequency} @ {campaignData.runTime}</span>
          </div>
          <div className="flex justify-between py-2">
            <span className="text-zinc-400">Est. Monthly Searches</span>
            <span className="font-medium">{calculateSearchVolume().toLocaleString()} searches</span>
          </div>
        </div>
      </div>

      <div className="mb-6">
        <label className="block text-sm font-medium mb-2">Choose Worker (API User)</label>
        <select
          value={campaignData.worker}
          onChange={(e) => handleInputChange('worker', e.target.value)}
          className="w-full px-4 py-2 rounded-lg focus:outline-none focus:border-blue-500 bg-zinc-800 border-zinc-700 text-white"
        >
          <option value="default">Default Worker</option>
          <option value="worker2">Worker 2</option>
          <option value="worker3">Worker 3</option>
        </select>
      </div>

      <div className="flex justify-end gap-3">
        <button className="px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-sm font-medium hover:bg-zinc-700 transition-colors">
          Save as Template
        </button>
        <button className="px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-sm font-medium hover:bg-zinc-700 transition-colors">
          Save
        </button>
        <button className="px-4 py-2 bg-blue-500 rounded-lg text-sm font-medium hover:bg-blue-600 transition-colors text-white">
          Schedule Now
        </button>
      </div>
    </div>
  );
};

export default PreflightChecklist;