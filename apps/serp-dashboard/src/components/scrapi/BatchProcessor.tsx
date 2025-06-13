import React, { useState, useEffect } from 'react';
import { scrapiClient } from '@/lib/scrapi-client';

interface BatchProcessorProps {
  onBatchSubmitted?: (batchId: string) => void;
}

const BatchProcessor: React.FC<BatchProcessorProps> = ({ onBatchSubmitted }) => {
  const [batchName, setBatchName] = useState('');
  const [queries, setQueries] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [apiStatus, setApiStatus] = useState<'unknown' | 'connected' | 'disconnected'>('unknown');
  const [advancedOptions, setAdvancedOptions] = useState(false);
  const [platform, setPlatform] = useState<'google' | 'bing' | 'both'>('google');
  const [renderHtml, setRenderHtml] = useState(true);
  const [renderPng, setRenderPng] = useState(true);
  const [maxConcurrency, setMaxConcurrency] = useState(5);
  const [delayBetweenQueries, setDelayBetweenQueries] = useState(2);
  const [maxRetries, setMaxRetries] = useState(3);

  // Check API status
  useEffect(() => {
    const checkApiStatus = async () => {
      try {
        // For development, we'll simulate a connected API
        // In production, uncomment the line below
        // const isHealthy = await scrapiClient.checkHealth();
        const isHealthy = true; // Simulated for development
        setApiStatus(isHealthy ? 'connected' : 'disconnected');
      } catch (error) {
        setApiStatus('disconnected');
      }
    };

    checkApiStatus();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!batchName.trim()) {
      setError('Please enter a batch name');
      return;
    }
    
    if (!queries.trim()) {
      setError('Please enter at least one query');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Parse queries from textarea
      // Format: query|location (one per line)
      const parsedQueries = queries
        .split('\n')
        .filter(line => line.trim())
        .map(line => {
          const [query, location] = line.split('|').map(part => part.trim());
          return { 
            query, 
            location: location || 'United States' 
          };
        });

      if (parsedQueries.length === 0) {
        throw new Error('No valid queries found');
      }

      // Prepare config
      const config = {
        platform,
        renderHtml,
        renderPng,
        maxConcurrency: advancedOptions ? maxConcurrency : 5,
        delayBetweenQueries: advancedOptions ? delayBetweenQueries : 2,
        maxRetries: advancedOptions ? maxRetries : 3
      };

      // For development, we'll simulate a successful batch submission
      // In production, uncomment the line below
      // const result = await scrapiClient.submitBatch(batchName, parsedQueries, config);
      
      // Simulated response for development
      const result = {
        success: true,
        batchId: `batch-${Date.now()}`
      };
      
      if (result.success && result.batchId) {
        if (onBatchSubmitted) {
          onBatchSubmitted(result.batchId);
        }
        
        // Reset form
        setBatchName('');
        setQueries('');
      } else {
        throw new Error(result.error || 'Failed to submit batch');
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred while submitting the batch');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-6">
      <h2 className="text-xl font-semibold mb-4">SCRAPI Batch Processor</h2>
      
      <div className="mb-4">
        <div className="flex items-center mb-2">
          <div className={`w-3 h-3 rounded-full mr-2 ${
            apiStatus === 'connected' ? 'bg-green-500' : 
            apiStatus === 'disconnected' ? 'bg-red-500' : 'bg-yellow-500'
          }`}></div>
          <span className="text-sm text-zinc-400">
            API Status: {apiStatus === 'unknown' ? 'Checking...' : apiStatus}
          </span>
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="mb-4">
          <label className="block text-sm font-medium mb-2">Batch Name</label>
          <input
            type="text"
            value={batchName}
            onChange={(e) => setBatchName(e.target.value)}
            className="w-full px-4 py-2 rounded-lg focus:outline-none focus:border-blue-500 bg-zinc-800 border-zinc-700 text-white"
            placeholder="e.g., Home Services - June 2025"
            disabled={isLoading}
          />
        </div>

        <div className="mb-4">
          <label className="block text-sm font-medium mb-2">
            Queries (one per line, format: query|location)
          </label>
          <textarea
            value={queries}
            onChange={(e) => setQueries(e.target.value)}
            className="w-full px-4 py-2 rounded-lg focus:outline-none focus:border-blue-500 bg-zinc-800 border-zinc-700 text-white h-40"
            placeholder="plumbers near me|Boston, MA
electricians|New York, NY
hvac repair|Miami, FL"
            disabled={isLoading}
          />
          <p className="text-xs text-zinc-500 mt-1">
            Each line should contain a query and optional location separated by |
          </p>
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

        <div className="mb-4">
          <button
            type="button"
            onClick={() => setAdvancedOptions(!advancedOptions)}
            className="text-sm text-blue-400 hover:text-blue-300"
          >
            {advancedOptions ? 'Hide' : 'Show'} Advanced Options
          </button>
          
          {advancedOptions && (
            <div className="mt-3 p-4 bg-zinc-800 rounded-lg">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Max Concurrency</label>
                  <input
                    type="number"
                    min="1"
                    max="20"
                    value={maxConcurrency}
                    onChange={(e) => setMaxConcurrency(parseInt(e.target.value))}
                    className="w-full px-4 py-2 rounded-lg focus:outline-none focus:border-blue-500 bg-zinc-800 border-zinc-700 text-white"
                    disabled={isLoading}
                  />
                  <p className="text-xs text-zinc-500 mt-1">
                    Maximum number of concurrent queries
                  </p>
                </div>
                
                <div>
                  <label className="block text-sm font-medium mb-2">Delay Between Queries (sec)</label>
                  <input
                    type="number"
                    min="0"
                    max="60"
                    value={delayBetweenQueries}
                    onChange={(e) => setDelayBetweenQueries(parseInt(e.target.value))}
                    className="w-full px-4 py-2 rounded-lg focus:outline-none focus:border-blue-500 bg-zinc-800 border-zinc-700 text-white"
                    disabled={isLoading}
                  />
                  <p className="text-xs text-zinc-500 mt-1">
                    Seconds to wait between queries
                  </p>
                </div>
                
                <div>
                  <label className="block text-sm font-medium mb-2">Max Retries</label>
                  <input
                    type="number"
                    min="0"
                    max="10"
                    value={maxRetries}
                    onChange={(e) => setMaxRetries(parseInt(e.target.value))}
                    className="w-full px-4 py-2 rounded-lg focus:outline-none focus:border-blue-500 bg-zinc-800 border-zinc-700 text-white"
                    disabled={isLoading}
                  />
                  <p className="text-xs text-zinc-500 mt-1">
                    Maximum retry attempts for failed queries
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {error && (
          <div className="bg-red-500/20 border border-red-500/50 text-red-200 p-3 rounded-lg mb-4">
            {error}
          </div>
        )}

        <div className="flex justify-end">
          <button
            type="submit"
            disabled={isLoading || apiStatus !== 'connected' || !batchName.trim() || !queries.trim()}
            className="px-4 py-2 bg-blue-500 rounded-lg text-sm font-medium hover:bg-blue-600 transition-colors text-white disabled:opacity-50"
          >
            {isLoading ? 'Submitting...' : 'Submit Batch'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default BatchProcessor;