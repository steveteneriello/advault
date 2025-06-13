import React, { useState, useEffect } from 'react';
import { scrapiClient } from '@/lib/scrapi-client';
import type { ScrapiBatchJob, ScrapiSearchQuery } from '@/lib/scrapi-schema';

interface BatchStatusDashboardProps {
  batchId?: string;
  refreshInterval?: number; // in seconds
  onBatchCompleted?: (batchId: string) => void;
  onViewResults?: (queryId: string) => void;
}

const BatchStatusDashboard: React.FC<BatchStatusDashboardProps> = ({ 
  batchId,
  refreshInterval = 5,
  onBatchCompleted,
  onViewResults
}) => {
  const [batches, setBatches] = useState<ScrapiBatchJob[]>([]);
  const [selectedBatchId, setSelectedBatchId] = useState<string | null>(batchId || null);
  const [batchDetails, setBatchDetails] = useState<{
    batch: ScrapiBatchJob;
    queries: ScrapiSearchQuery[];
  } | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [refreshTimer, setRefreshTimer] = useState<NodeJS.Timeout | null>(null);

  // Load all batches on component mount
  useEffect(() => {
    loadBatches();
    
    // Set up refresh timer
    if (refreshInterval > 0) {
      const timer = setInterval(() => {
        if (selectedBatchId) {
          loadBatchDetails(selectedBatchId);
        } else {
          loadBatches();
        }
      }, refreshInterval * 1000);
      
      setRefreshTimer(timer);
      
      return () => {
        if (timer) clearInterval(timer);
      };
    }
  }, [refreshInterval]);

  // Load batch details when selected batch changes
  useEffect(() => {
    if (selectedBatchId) {
      loadBatchDetails(selectedBatchId);
    }
  }, [selectedBatchId]);

  // Load all batches
  const loadBatches = async () => {
    try {
      setIsLoading(true);
      
      // For development, we'll use mock data
      // In production, uncomment the line below
      // const result = await scrapiClient.getAllBatches();
      
      // Mock data for development
      const mockBatches: ScrapiBatchJob[] = [
        {
          id: 'batch-1',
          name: 'Home Services - June 2025',
          description: 'Plumbers, electricians, and HVAC services',
          status: 'completed',
          created_by: 'user@example.com',
          created_at: new Date(Date.now() - 86400000).toISOString(),
          started_at: new Date(Date.now() - 86000000).toISOString(),
          completed_at: new Date(Date.now() - 80000000).toISOString(),
          total_queries: 15,
          completed_queries: 15,
          failed_queries: 0,
          config: { platform: 'google', renderHtml: true, renderPng: true },
          error_message: null
        },
        {
          id: 'batch-2',
          name: 'Healthcare Services - June 2025',
          description: 'Dentists, doctors, and clinics',
          status: 'processing',
          created_by: 'user@example.com',
          created_at: new Date(Date.now() - 3600000).toISOString(),
          started_at: new Date(Date.now() - 1800000).toISOString(),
          completed_at: null,
          total_queries: 20,
          completed_queries: 12,
          failed_queries: 2,
          config: { platform: 'both', renderHtml: true, renderPng: true },
          error_message: null
        },
        {
          id: 'batch-3',
          name: 'Legal Services - June 2025',
          description: 'Lawyers and legal services',
          status: 'pending',
          created_by: 'user@example.com',
          created_at: new Date().toISOString(),
          started_at: null,
          completed_at: null,
          total_queries: 10,
          completed_queries: 0,
          failed_queries: 0,
          config: { platform: 'google', renderHtml: false, renderPng: true },
          error_message: null
        }
      ];
      
      setBatches(mockBatches);
      
      // If no batch is selected and we have batches, select the first one
      if (!selectedBatchId && mockBatches.length > 0) {
        setSelectedBatchId(mockBatches[0].id);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load batches');
    } finally {
      setIsLoading(false);
    }
  };

  // Load batch details
  const loadBatchDetails = async (batchId: string) => {
    try {
      setIsLoading(true);
      
      // For development, we'll use mock data
      // In production, uncomment the line below
      // const details = await scrapiClient.getBatchDetails(batchId);
      
      // Find the batch in our mock data
      const mockBatch = batches.find(b => b.id === batchId);
      
      if (!mockBatch) {
        throw new Error('Batch not found');
      }
      
      // Generate mock queries
      const mockQueries: ScrapiSearchQuery[] = [];
      
      // Generate completed queries
      for (let i = 0; i < mockBatch.completed_queries; i++) {
        mockQueries.push({
          id: `query-${batchId}-${i}`,
          batch_id: batchId,
          query: i % 2 === 0 ? 'plumbers near me' : 'electricians',
          location: i % 3 === 0 ? 'Boston, MA' : i % 3 === 1 ? 'New York, NY' : 'Miami, FL',
          status: 'completed',
          created_at: mockBatch.created_at,
          started_at: mockBatch.started_at,
          completed_at: new Date(Date.now() - (i * 60000)).toISOString(),
          oxylabs_job_id: `oxylabs-${batchId}-${i}`,
          error_message: null,
          priority: 0,
          retry_count: 0,
          max_retries: 3
        });
      }
      
      // Generate failed queries
      for (let i = 0; i < mockBatch.failed_queries; i++) {
        mockQueries.push({
          id: `query-${batchId}-failed-${i}`,
          batch_id: batchId,
          query: 'failed query',
          location: 'Failed Location',
          status: 'failed',
          created_at: mockBatch.created_at,
          started_at: mockBatch.started_at,
          completed_at: new Date(Date.now() - (i * 30000)).toISOString(),
          oxylabs_job_id: `oxylabs-${batchId}-failed-${i}`,
          error_message: 'API rate limit exceeded',
          priority: 0,
          retry_count: 3,
          max_retries: 3
        });
      }
      
      // Generate pending queries
      const pendingCount = mockBatch.total_queries - mockBatch.completed_queries - mockBatch.failed_queries;
      for (let i = 0; i < pendingCount; i++) {
        mockQueries.push({
          id: `query-${batchId}-pending-${i}`,
          batch_id: batchId,
          query: 'pending query',
          location: 'Pending Location',
          status: mockBatch.status === 'processing' && i === 0 ? 'processing' : 'pending',
          created_at: mockBatch.created_at,
          started_at: mockBatch.status === 'processing' && i === 0 ? new Date().toISOString() : null,
          completed_at: null,
          oxylabs_job_id: mockBatch.status === 'processing' && i === 0 ? `oxylabs-${batchId}-pending-${i}` : null,
          error_message: null,
          priority: 0,
          retry_count: 0,
          max_retries: 3
        });
      }
      
      const details = {
        batch: mockBatch,
        queries: mockQueries
      };
      
      setBatchDetails(details);
      
      // If batch is completed, trigger callback
      if (details.batch.status === 'completed' && onBatchCompleted) {
        onBatchCompleted(batchId);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load batch details');
    } finally {
      setIsLoading(false);
    }
  };

  // Calculate progress percentage
  const calculateProgress = (batch: ScrapiBatchJob) => {
    if (batch.total_queries === 0) return 0;
    return Math.round((batch.completed_queries / batch.total_queries) * 100);
  };

  // Handle batch selection
  const handleBatchSelect = (batchId: string) => {
    setSelectedBatchId(batchId);
  };

  // Handle retry failed queries
  const handleRetryFailed = async () => {
    if (!selectedBatchId) return;
    
    try {
      setIsLoading(true);
      
      // For development, we'll simulate a successful retry
      // In production, uncomment the line below
      // const result = await scrapiClient.retryFailedQueries(selectedBatchId);
      
      // Simulate successful retry
      const result = {
        success: true,
        retriedCount: batchDetails?.batch.failed_queries || 0
      };
      
      if (result.success) {
        // Update the batch details to reflect the retried queries
        if (batchDetails) {
          const updatedBatch = {
            ...batchDetails.batch,
            failed_queries: 0,
            status: 'processing'
          };
          
          // Update queries status
          const updatedQueries = batchDetails.queries.map(query => {
            if (query.status === 'failed') {
              return {
                ...query,
                status: 'pending',
                error_message: null,
                retry_count: query.retry_count + 1
              };
            }
            return query;
          });
          
          setBatchDetails({
            batch: updatedBatch,
            queries: updatedQueries
          });
        }
      } else {
        setError(result.error || 'Failed to retry queries');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to retry queries');
    } finally {
      setIsLoading(false);
    }
  };

  // Handle cancel batch
  const handleCancelBatch = async () => {
    if (!selectedBatchId) return;
    
    try {
      setIsLoading(true);
      
      // For development, we'll simulate a successful cancellation
      // In production, uncomment the line below
      // const result = await scrapiClient.cancelBatch(selectedBatchId);
      
      // Simulate successful cancellation
      const result = {
        success: true
      };
      
      if (result.success) {
        // Update the batch details to reflect cancellation
        if (batchDetails) {
          const updatedBatch = {
            ...batchDetails.batch,
            status: 'failed',
            error_message: 'Batch cancelled by user'
          };
          
          // Update queries status
          const updatedQueries = batchDetails.queries.map(query => {
            if (query.status === 'pending' || query.status === 'processing') {
              return {
                ...query,
                status: 'failed',
                error_message: 'Batch cancelled by user'
              };
            }
            return query;
          });
          
          setBatchDetails({
            batch: updatedBatch,
            queries: updatedQueries
          });
        }
      } else {
        setError(result.error || 'Failed to cancel batch');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to cancel batch');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-lg overflow-hidden">
      <div className="p-6 border-b border-zinc-800">
        <h2 className="text-xl font-semibold">Batch Processing Status</h2>
      </div>
      
      {error && (
        <div className="m-6 bg-red-500/20 border border-red-500/50 text-red-200 p-3 rounded-lg">
          {error}
          <button 
            className="ml-2 text-red-200 underline"
            onClick={() => setError(null)}
          >
            Dismiss
          </button>
        </div>
      )}
      
      <div className="flex h-[calc(100vh-300px)]">
        {/* Batch list sidebar */}
        <div className="w-64 border-r border-zinc-800 overflow-y-auto">
          <div className="p-4 border-b border-zinc-800">
            <h3 className="text-sm font-medium text-zinc-400">Recent Batches</h3>
          </div>
          
          {batches.length === 0 ? (
            <div className="p-4 text-zinc-500 text-sm">No batches found</div>
          ) : (
            <div>
              {batches.map(batch => (
                <div 
                  key={batch.id}
                  className={`p-4 border-b border-zinc-800 cursor-pointer hover:bg-zinc-800 transition-colors ${
                    selectedBatchId === batch.id ? 'bg-zinc-800' : ''
                  }`}
                  onClick={() => handleBatchSelect(batch.id)}
                >
                  <div className="font-medium">{batch.name}</div>
                  <div className="text-sm text-zinc-400">
                    {batch.total_queries} queries
                  </div>
                  <div className="flex items-center mt-1">
                    <div className={`w-2 h-2 rounded-full mr-2 ${
                      batch.status === 'completed' ? 'bg-green-500' :
                      batch.status === 'processing' ? 'bg-blue-500' :
                      batch.status === 'failed' ? 'bg-red-500' :
                      'bg-yellow-500'
                    }`}></div>
                    <span className="text-xs text-zinc-500 capitalize">{batch.status}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
        
        {/* Batch details */}
        <div className="flex-1 overflow-y-auto">
          {!selectedBatchId ? (
            <div className="p-6 text-center text-zinc-500">
              Select a batch to view details
            </div>
          ) : !batchDetails ? (
            <div className="p-6 text-center text-zinc-500">
              {isLoading ? 'Loading batch details...' : 'No details available'}
            </div>
          ) : (
            <div>
              {/* Batch header */}
              <div className="p-6 border-b border-zinc-800">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="text-xl font-semibold">{batchDetails.batch.name}</h3>
                    <p className="text-zinc-400">{batchDetails.batch.description}</p>
                    <div className="mt-2 flex items-center">
                      <div className={`w-2 h-2 rounded-full mr-2 ${
                        batchDetails.batch.status === 'completed' ? 'bg-green-500' :
                        batchDetails.batch.status === 'processing' ? 'bg-blue-500' :
                        batchDetails.batch.status === 'failed' ? 'bg-red-500' :
                        'bg-yellow-500'
                      }`}></div>
                      <span className="text-sm capitalize">{batchDetails.batch.status}</span>
                    </div>
                  </div>
                  
                  <div className="flex space-x-2">
                    {batchDetails.batch.status === 'processing' && (
                      <button
                        onClick={handleCancelBatch}
                        disabled={isLoading}
                        className="px-3 py-1 bg-red-500 text-white rounded text-sm hover:bg-red-600 transition-colors disabled:opacity-50"
                      >
                        Cancel
                      </button>
                    )}
                    
                    {batchDetails.batch.status === 'completed' && batchDetails.batch.failed_queries > 0 && (
                      <button
                        onClick={handleRetryFailed}
                        disabled={isLoading}
                        className="px-3 py-1 bg-blue-500 text-white rounded text-sm hover:bg-blue-600 transition-colors disabled:opacity-50"
                      >
                        Retry Failed
                      </button>
                    )}
                  </div>
                </div>
                
                {/* Progress bar */}
                <div className="mt-4">
                  <div className="flex justify-between text-sm mb-1">
                    <span>Progress</span>
                    <span>{calculateProgress(batchDetails.batch)}%</span>
                  </div>
                  <div className="w-full bg-zinc-800 rounded-full h-2.5">
                    <div 
                      className="bg-blue-500 h-2.5 rounded-full" 
                      style={{ width: `${calculateProgress(batchDetails.batch)}%` }}
                    ></div>
                  </div>
                  <div className="flex justify-between text-xs text-zinc-500 mt-1">
                    <span>
                      {batchDetails.batch.completed_queries} / {batchDetails.batch.total_queries} completed
                    </span>
                    <span>
                      {batchDetails.batch.failed_queries} failed
                    </span>
                  </div>
                </div>
                
                {/* Timing information */}
                <div className="mt-4 grid grid-cols-3 gap-4 text-sm">
                  <div>
                    <div className="text-zinc-500">Created</div>
                    <div>{new Date(batchDetails.batch.created_at).toLocaleString()}</div>
                  </div>
                  <div>
                    <div className="text-zinc-500">Started</div>
                    <div>
                      {batchDetails.batch.started_at 
                        ? new Date(batchDetails.batch.started_at).toLocaleString() 
                        : 'Not started'}
                    </div>
                  </div>
                  <div>
                    <div className="text-zinc-500">Completed</div>
                    <div>
                      {batchDetails.batch.completed_at 
                        ? new Date(batchDetails.batch.completed_at).toLocaleString() 
                        : 'Not completed'}
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Queries list */}
              <div className="p-6">
                <h3 className="text-lg font-semibold mb-4">Queries</h3>
                
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="bg-zinc-800 text-xs font-medium text-zinc-400 uppercase tracking-wider">
                        <th className="px-6 py-3 text-left">Query</th>
                        <th className="px-6 py-3 text-left">Location</th>
                        <th className="px-6 py-3 text-left">Status</th>
                        <th className="px-6 py-3 text-left">Started</th>
                        <th className="px-6 py-3 text-left">Completed</th>
                        <th className="px-6 py-3 text-left">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-800">
                      {batchDetails.queries.map(query => (
                        <tr key={query.id} className="hover:bg-zinc-800 transition-colors">
                          <td className="px-6 py-4">{query.query}</td>
                          <td className="px-6 py-4">{query.location}</td>
                          <td className="px-6 py-4">
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                              query.status === 'completed' ? 'bg-green-500/20 text-green-400' :
                              query.status === 'processing' ? 'bg-blue-500/20 text-blue-400' :
                              query.status === 'failed' ? 'bg-red-500/20 text-red-400' :
                              'bg-yellow-500/20 text-yellow-400'
                            }`}>
                              {query.status}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            {query.started_at 
                              ? new Date(query.started_at).toLocaleString() 
                              : '-'}
                          </td>
                          <td className="px-6 py-4">
                            {query.completed_at 
                              ? new Date(query.completed_at).toLocaleString() 
                              : '-'}
                          </td>
                          <td className="px-6 py-4">
                            {query.status === 'completed' && (
                              <button
                                onClick={() => {
                                  if (onViewResults) {
                                    onViewResults(query.id);
                                  }
                                }}
                                className="text-blue-400 hover:text-blue-300 text-sm"
                              >
                                View Results
                              </button>
                            )}
                            {query.status === 'failed' && (
                              <button
                                onClick={() => {
                                  // Show error details
                                  alert(`Error: ${query.error_message || 'Unknown error'}`);
                                }}
                                className="text-red-400 hover:text-red-300 text-sm"
                              >
                                Show Error
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default BatchStatusDashboard;