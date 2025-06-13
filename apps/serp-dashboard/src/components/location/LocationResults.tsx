import React, { useState } from 'react';
import { MapPin, Save, Download } from 'lucide-react';
import { LocationData } from '@/lib/supabase';

interface LocationResultsProps {
  searchResults: LocationData[];
  centerCoords: {lat: number, lng: number} | null;
  onListSaved: () => void;
}

const LocationResults: React.FC<LocationResultsProps> = ({ 
  searchResults, 
  centerCoords, 
  onListSaved 
}) => {
  const [selectedLocations, setSelectedLocations] = useState<string[]>([]);
  const [listName, setListName] = useState('');

  const toggleLocation = (locationId: string) => {
    setSelectedLocations(prev => 
      prev.includes(locationId) 
        ? prev.filter(id => id !== locationId)
        : [...prev, locationId]
    );
  };

  const handleSaveList = () => {
    if (!listName.trim()) {
      alert('Please enter a name for your location list');
      return;
    }
    
    // In a real app, this would save to your database
    console.log('Saving list:', {
      name: listName,
      locations: selectedLocations,
      centerCoords
    });
    
    onListSaved();
  };

  const formatNumber = (num: number | undefined) => {
    if (num === undefined) return 'N/A';
    return num.toLocaleString();
  };

  const formatCurrency = (num: number | undefined) => {
    if (num === undefined) return 'N/A';
    return `$${num.toLocaleString()}`;
  };

  if (searchResults.length === 0) return null;

  return (
    <div className="h-full flex flex-col">
      <div className="p-4 border-b border-zinc-800">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <MapPin className="w-5 h-5" />
            <span className="font-semibold">Locations</span>
            <span className="px-2 py-1 rounded-full text-xs bg-zinc-800">
              {searchResults.length} cities
            </span>
          </div>
          <div className="flex gap-2">
            <button className="p-2 rounded bg-zinc-800 hover:bg-zinc-700 transition-colors">
              <Download className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        <div className="space-y-4">
          {searchResults.map((location) => (
            <div 
              key={location.id}
              onClick={() => toggleLocation(location.id)}
              className={`border rounded-lg p-4 bg-zinc-900 cursor-pointer transition-all ${
                selectedLocations.includes(location.id)
                  ? 'border-blue-500 bg-blue-500/10'
                  : 'border-zinc-800 hover:bg-zinc-800'
              }`}
            >
              <h3 className="font-semibold">{location.city}, {location.state_name}</h3>
              <p className="text-sm text-zinc-400">
                {location.county_name} County • {location.postal_code}
              </p>
              <div className="grid grid-cols-2 gap-2 mt-2 text-sm">
                <div>Pop: {formatNumber(location.population)}</div>
                <div>Income: {formatCurrency(location.income_household_median)}</div>
                <div>Homes: {formatNumber(location.housing_units)}</div>
                <div>Avg Age: {formatNumber(location.age_median)}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="p-4 border-t border-zinc-800">
        <div className="flex items-center gap-2 mb-2">
          <input
            type="text"
            value={listName}
            onChange={(e) => setListName(e.target.value)}
            placeholder="Enter list name"
            className="flex-1 px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white"
          />
          <button 
            onClick={handleSaveList}
            disabled={selectedLocations.length === 0 || !listName.trim()}
            className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors disabled:opacity-50 flex items-center gap-2"
          >
            <Save className="w-4 h-4" />
            Save List
          </button>
        </div>
        <p className="text-xs text-zinc-400">
          {selectedLocations.length} of {searchResults.length} locations selected
        </p>
      </div>
    </div>
  );
};

export default LocationResults;