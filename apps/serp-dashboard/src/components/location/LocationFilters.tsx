import React, { useState } from 'react';
import { Search } from 'lucide-react';
import { api } from '@/lib/supabase';

interface LocationFiltersProps {
  onSearchResults: (results: any[], coords: {lat: number, lng: number}) => void;
  onListSaved: () => void;
  isLoading: boolean;
  setIsLoading: (loading: boolean) => void;
}

const LocationFilters: React.FC<LocationFiltersProps> = ({ 
  onSearchResults, 
  onListSaved,
  isLoading,
  setIsLoading
}) => {
  const [filters, setFilters] = useState({
    centerZipCode: '',
    radiusMiles: 50,
    minPopulation: '',
    minIncome: ''
  });

  const handleSearch = async () => {
    if (!filters.centerZipCode.trim()) {
      alert('Please enter a ZIP code');
      return;
    }
    
    setIsLoading(true);
    
    try {
      // In a real app, this would call your API
      // For now, we'll simulate with mock data
      const result = await api.searchLocationsByZip(filters.centerZipCode, filters.radiusMiles);
      
      if (result.center) {
        onSearchResults(
          result.locations, 
          { lat: result.center.latitude, lng: result.center.longitude }
        );
      } else {
        alert('ZIP code not found');
      }
    } catch (error) {
      console.error('Search error:', error);
      alert('Error searching locations');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex items-center gap-4">
      <div>
        <input
          type="text"
          value={filters.centerZipCode}
          onChange={(e) => setFilters(prev => ({ ...prev, centerZipCode: e.target.value }))}
          placeholder="ZIP code"
          className="px-4 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-zinc-800 border-zinc-700 text-white"
        />
      </div>
      
      <div className="flex-1">
        <label className="text-sm text-zinc-400 block mb-1">
          Radius: {filters.radiusMiles} miles
        </label>
        <input
          type="range"
          min="5"
          max="250"
          step="5"
          value={filters.radiusMiles}
          onChange={(e) => setFilters(prev => ({ ...prev, radiusMiles: parseInt(e.target.value) }))}
          className="w-full"
        />
      </div>

      <div>
        <input
          type="number"
          value={filters.minPopulation}
          onChange={(e) => setFilters(prev => ({ ...prev, minPopulation: e.target.value }))}
          placeholder="Min population"
          className="px-4 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-zinc-800 border-zinc-700 text-white w-32"
        />
      </div>

      <div>
        <input
          type="number"
          value={filters.minIncome}
          onChange={(e) => setFilters(prev => ({ ...prev, minIncome: e.target.value }))}
          placeholder="Min income"
          className="px-4 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-zinc-800 border-zinc-700 text-white w-32"
        />
      </div>

      <button
        onClick={handleSearch}
        disabled={isLoading}
        className="px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors disabled:opacity-50"
      >
        <Search className="h-4 w-4 mr-2 inline-block" />
        {isLoading ? 'Searching...' : 'Search'}
      </button>
    </div>
  );
};

export default LocationFilters;