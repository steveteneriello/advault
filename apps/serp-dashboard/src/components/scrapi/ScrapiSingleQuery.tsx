import React, { useState } from 'react';
import { scrapiClient } from '@/lib/scrapi-client';

interface ScrapiSingleQueryProps {
  onQuerySubmitted?: (queryId: string) => void;
}

const ScrapiSingleQuery: React.FC<ScrapiSingleQueryProps> = ({ onQuerySubmitted }) => {
  const [query, setQuery] = useState('');
  const [location, setLocation] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [platform, setPlatform] = useState<'google' | 'bing' | 'both'>('google');
  const [renderHtml, setRenderHtml] = useState(true);
  const [renderPng, setRenderPng] = useState(true);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!query.trim()) {
      setError('Please enter a search query');
      return;
    }
    
    if (!location.trim()) {
      setError('Please enter a location');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // For development, we'll simulate a successful query submission
      // In production, uncomment the line below
      // const result = await scrapiClient.runSingleQuery(query, location, { platform, renderHtml, renderPng });
      
      // Simulate successful response
      const result = {
        success: true,
        jobId: `job-${Date.now()}`
      };
      
      if (result.success && result.jobId) {
        if (onQuerySubmitted) {
          // In a real implementation, we would need to get the query ID from the response
          // For now, we'll use the job ID as the query ID
          onQuerySubmitted(result.jobId);
        }
        
        // Reset form
        setQuery('');
        setLocation('');
      } else {
        throw new Error(result.error || 'Failed to submit query');
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred while submitting the query');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-6">
      <h2 className="text-xl font-semibold mb-4">Single Query Search</h2>
      
      <form onSubmit={handleSubmit}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <div>
            <label className="block text-sm font-medium mb-2">Search Query</label>
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
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
              onChange={(e) => setLocation(e.target.value)}
              className="w-full px-4 py-2 rounded-lg focus:outline-none focus:border-blue-500 bg-zinc-800 border-zinc-700 text-white"
              placeholder="e.g., Boston, MA"
              disabled={isLoading}
            />
          </div>
        </div>

        <div className="mb-4">
          <label className="block text-sm font-medium mb-2">Platform</label>
          <div className="flex space-x-4">
            <label className="flex items-center">
              <input
                type="radio"
                checked={platform === 'google'}
                onChange={() => setPlatform('google')}
                className="mr-2"
                disabled={isLoading}
              />
              <span>Google</span>
            </label>
            <label className="flex items-center">
              <input
                type="radio"
                checked={platform === 'bing'}
                onChange={() => setPlatform('bing')}
                className="mr-2"
                disabled={isLoading}
              />
              <span>Bing</span>
            </label>
            <label className="flex items-center">
              <input
                type="radio"
                checked={platform === 'both'}
                onChange={() => setPlatform('both')}
                className="mr-2"
                disabled={isLoading}
              />
              <span>Both</span>
            </label>
          </div>
        </div>

        <div className="mb-4">
          <label className="block text-sm font-medium mb-2">Rendering Options</label>
          <div className="flex space-x-4">
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={renderHtml}
                onChange={(e) => setRenderHtml(e.target.checked)}
                className="mr-2"
                disabled={isLoading}
              />
              <span>HTML Rendering</span>
            </label>
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={renderPng}
                onChange={(e) => setRenderPng(e.target.checked)}
                className="mr-2"
                disabled={isLoading}
              />
              <span>PNG Rendering</span>
            </label>
          </div>
        </div>

        {error && (
          <div className="bg-red-500/20 border border-red-500/50 text-red-200 p-3 rounded-lg mb-4">
            {error}
          </div>
        )}

        <div className="flex justify-end">
          <button
            type="submit"
            disabled={isLoading || !query.trim() || !location.trim()}
            className="px-4 py-2 bg-blue-500 rounded-lg text-sm font-medium hover:bg-blue-600 transition-colors text-white disabled:opacity-50"
          >
            {isLoading ? 'Searching...' : 'Search Now'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default ScrapiSingleQuery;