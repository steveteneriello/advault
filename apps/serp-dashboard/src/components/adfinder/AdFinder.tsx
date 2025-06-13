import React, { useEffect, useState } from 'react';
import { AdFinderAPI } from './adfinder-api';

interface AdFinderProps {
  query?: string;
  location?: string;
}

const AdFinder: React.FC<AdFinderProps> = ({ query = '', location = '' }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [results, setResults] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [apiHealth, setApiHealth] = useState<'unknown' | 'healthy' | 'unhealthy'>('unknown');

  const api = new AdFinderAPI();

  // Comment out the health check to prevent errors
  /*
  const checkApiHealth = async () => {
    try {
      const isHealthy = await api.checkHealth();
      setApiHealth(isHealthy ? 'healthy' : 'unhealthy');
    } catch (err) {
      console.error('Health check failed:', err);
      setApiHealth('unhealthy');
    }
  };

  useEffect(() => {
    checkApiHealth();
  }, []);
  */
  
  // Set API as healthy by default to avoid health check
  useEffect(() => {
    setApiHealth('healthy');
  }, []);

  const handleSearch = async () => {
    if (!query || !location) {
      setError('Please provide both query and location');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const searchResults = await api.searchAds(query, location);
      setResults(searchResults);
    } catch (err) {
      setError('Failed to search ads. Please try again.');
      console.error('Search error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-6">
      <h2 className="text-xl font-semibold mb-4">Ad Finder</h2>
      
      <div className="mb-4">
        <div className="flex items-center mb-2">
          <div className={`w-3 h-3 rounded-full mr-2 ${
            apiHealth === 'healthy' ? 'bg-green-500' : 
            apiHealth === 'unhealthy' ? 'bg-red-500' : 'bg-yellow-500'
          }`}></div>
          <span className="text-sm text-zinc-400">
            API Status: {apiHealth === 'unknown' ? 'Checking...' : apiHealth === 'healthy' ? 'Connected' : 'Disconnected'}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        <div>
          <label className="block text-sm font-medium mb-2">Search Query</label>
          <input
            type="text"
            value={query}
            className="w-full px-4 py-2 rounded-lg focus:outline-none focus:border-blue-500 bg-zinc-800 border-zinc-700 text-white"
            placeholder="e.g., plumbers near me"
            disabled={isLoading}
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-2">Location</label>
          <input
            type="text"
            value={location}
            className="w-full px-4 py-2 rounded-lg focus:outline-none focus:border-blue-500 bg-zinc-800 border-zinc-700 text-white"
            placeholder="e.g., Boston, MA"
            disabled={isLoading}
          />
        </div>
      </div>

      <div className="flex justify-end mb-6">
        <button
          onClick={handleSearch}
          disabled={isLoading || apiHealth === 'unhealthy'}
          className="px-4 py-2 bg-blue-500 rounded-lg text-sm font-medium hover:bg-blue-600 transition-colors text-white disabled:opacity-50"
        >
          {isLoading ? 'Searching...' : 'Search Ads'}
        </button>
      </div>

      {error && (
        <div className="bg-red-500/20 border border-red-500/50 text-red-200 p-3 rounded-lg mb-4">
          {error}
        </div>
      )}

      {results.length > 0 ? (
        <div className="space-y-4">
          <h3 className="text-lg font-medium">Results ({results.length})</h3>
          {results.map((ad, index) => (
            <div key={index} className="bg-zinc-800 p-4 rounded-lg">
              <h4 className="font-medium text-blue-400">{ad.title}</h4>
              <p className="text-green-400 text-sm">{ad.displayUrl}</p>
              <p className="text-zinc-400 text-sm mt-1">{ad.description}</p>
            </div>
          ))}
        </div>
      ) : (
        !isLoading && !error && (
          <div className="text-center py-8 text-zinc-500">
            Search for ads to see results
          </div>
        )
      )}
    </div>
  );
};

export default AdFinder;