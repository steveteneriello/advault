import React, { useState } from 'react';
import { ChevronDown, Plus } from 'lucide-react';
import CampaignDetails from './CampaignDetails';
import LocationSelection from './LocationSelection';
import KeywordSelection from './KeywordSelection';
import ScheduleConfiguration from './ScheduleConfiguration';
import PreflightChecklist from './PreflightChecklist';

interface CampaignData {
  name: string;
  type: 'client' | 'market' | 'prospect' | 'data';
  assignment: string;
  network: 'google' | 'bing';
  targetingType: 'local' | 'regional' | 'timezone';
  savedConfig: string;
  category: string;
  startDate: string;
  endDate: string;
  noEndDate: boolean;
  frequency: 'daily' | 'weekly' | 'monthly' | 'bi-monthly' | 'specific';
  runTime: string;
  worker: string;
  adhocKeywords: string;
}

const CampaignBuilder: React.FC = () => {
  const [activeSection, setActiveSection] = useState<number | null>(1);
  const [selectedLocations, setSelectedLocations] = useState<string[]>([]);
  const [selectedCampaigns, setSelectedCampaigns] = useState<number[]>([]);
  const [selectedKeywords, setSelectedKeywords] = useState<number[]>([]);
  const [selectedDays, setSelectedDays] = useState<string[]>(['mon', 'tue', 'wed', 'thu', 'fri']);
  
  const [campaignData, setCampaignData] = useState<CampaignData>({
    name: '',
    type: 'client',
    assignment: '',
    network: 'google',
    targetingType: 'local',
    savedConfig: 'none',
    category: 'plumbing',
    startDate: '',
    endDate: '',
    noEndDate: false,
    frequency: 'daily',
    runTime: '09:00',
    worker: 'default',
    adhocKeywords: ''
  });

  const handleInputChange = (field: keyof CampaignData, value: any) => {
    setCampaignData(prev => ({ ...prev, [field]: value }));
  };

  const calculateSearchVolume = () => {
    const locationsCount = selectedLocations.length || 1;
    const keywordsCount = selectedKeywords.length + (campaignData.adhocKeywords ? campaignData.adhocKeywords.split(',').length : 0);
    const frequency = campaignData.frequency === 'daily' ? 30 : campaignData.frequency === 'weekly' ? 4 : 1;
    return locationsCount * keywordsCount * frequency;
  };

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-lg overflow-hidden">
      <div className="p-6 border-b border-zinc-800 flex items-center justify-between">
        <h2 className="text-xl font-semibold">Create New Campaign</h2>
        <div className="flex gap-3">
          <button className="px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-sm font-medium hover:bg-zinc-700 transition-colors">
            Save Draft
          </button>
          <button className="px-4 py-2 bg-blue-500 rounded-lg text-sm font-medium hover:bg-blue-600 transition-colors flex items-center gap-2 text-white">
            <Plus className="w-4 h-4" />
            Create Campaign
          </button>
        </div>
      </div>

      {/* Section 1: Campaign Details */}
      <div className="border-b border-zinc-800">
        <button
          onClick={() => setActiveSection(activeSection === 1 ? null : 1)}
          className="w-full p-6 bg-zinc-800/50 hover:bg-zinc-800 transition-colors flex items-center justify-between"
        >
          <div className="flex items-center gap-3">
            <span className="w-7 h-7 bg-blue-500 rounded-full flex items-center justify-center text-sm font-medium text-white">
              1
            </span>
            <span className="font-medium">Campaign Details</span>
          </div>
          <ChevronDown className={`w-5 h-5 transition-transform ${activeSection === 1 ? 'rotate-180' : ''}`} />
        </button>
        
        {activeSection === 1 && (
          <CampaignDetails 
            campaignData={campaignData} 
            handleInputChange={handleInputChange} 
            onContinue={() => setActiveSection(2)}
          />
        )}
      </div>

      {/* Section 2: Choose Locations */}
      <div className="border-b border-zinc-800">
        <button
          onClick={() => setActiveSection(activeSection === 2 ? null : 2)}
          className="w-full p-6 bg-zinc-800/50 hover:bg-zinc-800 transition-colors flex items-center justify-between"
        >
          <div className="flex items-center gap-3">
            <span className="w-7 h-7 bg-blue-500 rounded-full flex items-center justify-center text-sm font-medium text-white">
              2
            </span>
            <span className="font-medium">Choose Locations</span>
          </div>
          <ChevronDown className={`w-5 h-5 transition-transform ${activeSection === 2 ? 'rotate-180' : ''}`} />
        </button>
        
        {activeSection === 2 && (
          <LocationSelection 
            campaignData={campaignData}
            handleInputChange={handleInputChange}
            selectedLocations={selectedLocations}
            setSelectedLocations={setSelectedLocations}
            onContinue={() => setActiveSection(3)}
          />
        )}
      </div>

      {/* Section 3: Keyword Selection */}
      <div className="border-b border-zinc-800">
        <button
          onClick={() => setActiveSection(activeSection === 3 ? null : 3)}
          className="w-full p-6 bg-zinc-800/50 hover:bg-zinc-800 transition-colors flex items-center justify-between"
        >
          <div className="flex items-center gap-3">
            <span className="w-7 h-7 bg-blue-500 rounded-full flex items-center justify-center text-sm font-medium text-white">
              3
            </span>
            <span className="font-medium">Keyword Selection</span>
          </div>
          <ChevronDown className={`w-5 h-5 transition-transform ${activeSection === 3 ? 'rotate-180' : ''}`} />
        </button>
        
        {activeSection === 3 && (
          <KeywordSelection 
            campaignData={campaignData}
            handleInputChange={handleInputChange}
            selectedCampaigns={selectedCampaigns}
            setSelectedCampaigns={setSelectedCampaigns}
            selectedKeywords={selectedKeywords}
            setSelectedKeywords={setSelectedKeywords}
            onContinue={() => setActiveSection(4)}
          />
        )}
      </div>

      {/* Section 4: Schedule */}
      <div className="border-b border-zinc-800">
        <button
          onClick={() => setActiveSection(activeSection === 4 ? null : 4)}
          className="w-full p-6 bg-zinc-800/50 hover:bg-zinc-800 transition-colors flex items-center justify-between"
        >
          <div className="flex items-center gap-3">
            <span className="w-7 h-7 bg-blue-500 rounded-full flex items-center justify-center text-sm font-medium text-white">
              4
            </span>
            <span className="font-medium">Schedule Configuration</span>
          </div>
          <ChevronDown className={`w-5 h-5 transition-transform ${activeSection === 4 ? 'rotate-180' : ''}`} />
        </button>
        
        {activeSection === 4 && (
          <ScheduleConfiguration 
            campaignData={campaignData}
            handleInputChange={handleInputChange}
            selectedDays={selectedDays}
            setSelectedDays={setSelectedDays}
            onContinue={() => setActiveSection(5)}
          />
        )}
      </div>

      {/* Section 5: Preflight Checklist */}
      <div>
        <button
          onClick={() => setActiveSection(activeSection === 5 ? null : 5)}
          className="w-full p-6 bg-zinc-800/50 hover:bg-zinc-800 transition-colors flex items-center justify-between"
        >
          <div className="flex items-center gap-3">
            <span className="w-7 h-7 bg-blue-500 rounded-full flex items-center justify-center text-sm font-medium text-white">
              5
            </span>
            <span className="font-medium">Preflight Checklist</span>
          </div>
          <ChevronDown className={`w-5 h-5 transition-transform ${activeSection === 5 ? 'rotate-180' : ''}`} />
        </button>
        
        {activeSection === 5 && (
          <PreflightChecklist 
            campaignData={campaignData}
            handleInputChange={handleInputChange}
            selectedLocations={selectedLocations}
            selectedKeywords={selectedKeywords}
            calculateSearchVolume={calculateSearchVolume}
          />
        )}
      </div>
    </div>
  );
};

export default CampaignBuilder;