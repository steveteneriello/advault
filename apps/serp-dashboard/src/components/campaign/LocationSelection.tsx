import React from 'react';
import { MapPin } from 'lucide-react';

interface LocationSelectionProps {
  campaignData: {
    targetingType: string;
    savedConfig: string;
  };
  handleInputChange: (field: string, value: any) => void;
  selectedLocations: string[];
  setSelectedLocations: (locations: string[]) => void;
  onContinue: () => void;
}

const LocationSelection: React.FC<LocationSelectionProps> = ({
  campaignData,
  handleInputChange,
  selectedLocations,
  setSelectedLocations,
  onContinue
}) => {
  // Sample data
  const locations = [
    { id: '1', city: 'Phoenix', state: 'AZ', zip: '85001', population: '1.6M', income: '$57K', homes: '590K' },
    { id: '2', city: 'Scottsdale', state: 'AZ', zip: '85250', population: '255K', income: '$88K', homes: '122K' },
    { id: '3', city: 'Mesa', state: 'AZ', zip: '85201', population: '508K', income: '$53K', homes: '187K' },
    { id: '4', city: 'Tempe', state: 'AZ', zip: '85281', population: '195K', income: '$54K', homes: '78K' },
    { id: '5', city: 'Chandler', state: 'AZ', zip: '85224', population: '261K', income: '$82K', homes: '98K' },
    { id: '6', city: 'Gilbert', state: 'AZ', zip: '85295', population: '267K', income: '$95K', homes: '89K' }
  ];

  const toggleLocation = (locationId: string) => {
    setSelectedLocations(prev => 
      prev.includes(locationId) 
        ? prev.filter(id => id !== locationId)
        : [...prev, locationId]
    );
  };

  return (
    <div className="p-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        <div>
          <label className="block text-sm font-medium mb-2">Location Targeting Type</label>
          <select
            value={campaignData.targetingType}
            onChange={(e) => handleInputChange('targetingType', e.target.value)}
            className="w-full px-4 py-2 rounded-lg focus:outline-none focus:border-blue-500 bg-zinc-800 border-zinc-700 text-white"
          >
            <option value="local">Local (City/Zip Radius)</option>
            <option value="regional">Regional (Market Based)</option>
            <option value="timezone">Time Zone (State/County)</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium mb-2">Saved Location Configuration</label>
          <select
            value={campaignData.savedConfig}
            onChange={(e) => handleInputChange('savedConfig', e.target.value)}
            className="w-full px-4 py-2 rounded-lg focus:outline-none focus:border-blue-500 bg-zinc-800 border-zinc-700 text-white"
          >
            <option value="none">None</option>
            <option value="saved">My Saved Locations</option>
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-[25%_75%] gap-6 h-96">
        <div className="bg-zinc-800 rounded-lg p-4 overflow-y-auto">
          <div className="space-y-2 mb-4">
            <input
              type="text"
              placeholder="Filter by city..."
              className="w-full px-3 py-1.5 bg-zinc-800 border-zinc-700 text-white rounded text-sm"
            />
            <input
              type="number"
              placeholder="Min population"
              className="w-full px-3 py-1.5 bg-zinc-800 border-zinc-700 text-white rounded text-sm"
            />
            <input
              type="number"
              placeholder="Min income"
              className="w-full px-3 py-1.5 bg-zinc-800 border-zinc-700 text-white rounded text-sm"
            />
          </div>
          
          <div className="space-y-2">
            {locations.map(location => (
              <div
                key={location.id}
                onClick={() => toggleLocation(location.id)}
                className={`p-3 bg-zinc-900 rounded-lg cursor-pointer transition-all ${
                  selectedLocations.includes(location.id) 
                    ? 'border border-blue-500 bg-blue-500/10' 
                    : 'border border-zinc-800 hover:bg-zinc-800'
                }`}
              >
                <div className="font-medium text-sm">{location.city}, {location.state} • {location.zip}</div>
                <div className="text-xs text-zinc-400">
                  Pop: {location.population} | Income: {location.income} | Homes: {location.homes}
                </div>
              </div>
            ))}
          </div>
        </div>
        
        <div className="bg-zinc-800 rounded-lg flex items-center justify-center text-zinc-400">
          <MapPin className="w-8 h-8 mr-2" />
          [Google Maps with Location Pins]
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

export default LocationSelection;