import React, { useState } from 'react';
import { MapPin } from 'lucide-react';
import LocationFilters from './LocationFilters';
import LocationMap from './LocationMap';
import LocationResults from './LocationResults';
import { LocationData } from '@/lib/supabase';

const LocationBuilder: React.FC = () => {
  const [searchResults, setSearchResults] = useState<LocationData[]>([]);
  const [centerCoords, setCenterCoords] = useState<{lat: number, lng: number} | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleSearchResults = (results: LocationData[], coords: {lat: number, lng: number}) => {
    setSearchResults(results);
    setCenterCoords(coords);
  };

  const handleListSaved = () => {
    console.log('List saved');
  };

  return (
    <div className="w-full">
      {/* Header with search */}
      <div className="bg-zinc-900 border-b border-zinc-800 shadow-sm">
        <div className="max-w-full p-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-white">Location Builder</h1>
            </div>
            
            {/* Search bar */}
            <div className="flex-1 max-w-4xl mx-8">
              <LocationFilters 
                onSearchResults={handleSearchResults}
                onListSaved={handleListSaved}
                isLoading={isLoading}
                setIsLoading={setIsLoading}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Map and Results */}
      <div className="flex" style={{ height: 'calc(100vh - 180px)' }}>
        {/* Map */}
        <div className="flex-1 h-full bg-zinc-950">
          <LocationMap 
            searchResults={searchResults}
            centerCoords={centerCoords}
          />
        </div>
        
        {/* Search Results */}
        {searchResults.length > 0 && (
          <div className="w-[480px] border-l bg-zinc-900 border-zinc-800 h-full">
            <LocationResults 
              searchResults={searchResults}
              centerCoords={centerCoords}
              onListSaved={handleListSaved}
            />
          </div>
        )}
      </div>
    </div>
  );
};

export default LocationBuilder;