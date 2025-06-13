import React from 'react';
import { MapPin } from 'lucide-react';
import { LocationData } from '@/lib/supabase';

interface LocationMapProps {
  searchResults: LocationData[];
  centerCoords: {lat: number, lng: number} | null;
}

const LocationMap: React.FC<LocationMapProps> = ({ searchResults, centerCoords }) => {
  // In a real implementation, this would use the Google Maps API
  // For now, we'll just show a placeholder
  
  if (!centerCoords) {
    return (
      <div className="h-full flex items-center justify-center bg-zinc-950">
        <div className="text-center text-zinc-500">
          <MapPin className="h-16 w-16 mx-auto mb-4 opacity-30" />
          <p className="text-lg">Enter a ZIP code and search to see locations on the map</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full w-full relative">
      <div className="h-full flex items-center justify-center bg-zinc-950">
        <div className="text-center text-zinc-500">
          <MapPin className="h-16 w-16 mx-auto mb-4 opacity-30" />
          <p className="text-lg">Map showing {searchResults.length} locations</p>
          <p className="text-sm mt-2">Center: {centerCoords.lat.toFixed(4)}, {centerCoords.lng.toFixed(4)}</p>
        </div>
      </div>
    </div>
  );
};

export default LocationMap;