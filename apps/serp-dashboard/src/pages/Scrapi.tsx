import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import BatchProcessor from '@/components/scrapi/BatchProcessor';
import BatchStatusDashboard from '@/components/scrapi/BatchStatusDashboard';
import SerpResultsViewer from '@/components/scrapi/SerpResultsViewer';
import ScrapiDashboard from '@/components/scrapi/ScrapiDashboard';
import ScrapiSingleQuery from '@/components/scrapi/ScrapiSingleQuery';

const ScrapiPage: React.FC = () => {
  const location = useLocation();
  const [activeTab, setActiveTab] = useState<'dashboard' | 'single' | 'batch' | 'status' | 'results'>('dashboard');
  const [selectedBatchId, setSelectedBatchId] = useState<string | null>(null);
  const [selectedQueryId, setSelectedQueryId] = useState<string | null>(null);

  // Parse URL parameters on component mount
  useEffect(() => {
    const searchParams = new URLSearchParams(location.search);
    const batchId = searchParams.get('batch');
    const queryId = searchParams.get('query');
    const tab = searchParams.get('tab');
    
    if (batchId) {
      setSelectedBatchId(batchId);
      setActiveTab('status');
    }
    
    if (queryId) {
      setSelectedQueryId(queryId);
      setActiveTab('results');
    }
    
    if (tab) {
      switch (tab) {
        case 'dashboard':
        case 'single':
        case 'batch':
        case 'status':
        case 'results':
          setActiveTab(tab);
          break;
      }
    }
  }, [location]);

  const handleBatchSubmitted = (batchId: string) => {
    setSelectedBatchId(batchId);
    setActiveTab('status');
  };

  const handleQuerySubmitted = (queryId: string) => {
    setSelectedQueryId(queryId);
    setActiveTab('results');
  };

  const handleViewResults = (queryId: string) => {
    setSelectedQueryId(queryId);
    setActiveTab('results');
  };

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-6">SCRAPI - Search & Ad Intelligence</h1>
      
      {/* Tabs */}
      <div className="flex border-b border-zinc-800 mb-6">
        <button
          className={`px-6 py-3 font-medium text-sm ${
            activeTab === 'dashboard' 
              ? 'border-b-2 border-blue-500 text-blue-500' 
              : 'text-zinc-400 hover:text-zinc-200'
          }`}
          onClick={() => setActiveTab('dashboard')}
        >
          Dashboard
        </button>
        <button
          className={`px-6 py-3 font-medium text-sm ${
            activeTab === 'single' 
              ? 'border-b-2 border-blue-500 text-blue-500' 
              : 'text-zinc-400 hover:text-zinc-200'
          }`}
          onClick={() => setActiveTab('single')}
        >
          Single Query
        </button>
        <button
          className={`px-6 py-3 font-medium text-sm ${
            activeTab === 'batch' 
              ? 'border-b-2 border-blue-500 text-blue-500' 
              : 'text-zinc-400 hover:text-zinc-200'
          }`}
          onClick={() => setActiveTab('batch')}
        >
          Batch Processing
        </button>
        {selectedBatchId && (
          <button
            className={`px-6 py-3 font-medium text-sm ${
              activeTab === 'status' 
                ? 'border-b-2 border-blue-500 text-blue-500' 
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
            onClick={() => setActiveTab('status')}
          >
            Batch Status
          </button>
        )}
        {selectedQueryId && (
          <button
            className={`px-6 py-3 font-medium text-sm ${
              activeTab === 'results' 
                ? 'border-b-2 border-blue-500 text-blue-500' 
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
            onClick={() => setActiveTab('results')}
          >
            SERP Results
          </button>
        )}
      </div>
      
      {/* Tab content */}
      <div>
        {activeTab === 'dashboard' && (
          <ScrapiDashboard />
        )}
        
        {activeTab === 'single' && (
          <ScrapiSingleQuery onQuerySubmitted={handleQuerySubmitted} />
        )}
        
        {activeTab === 'batch' && (
          <BatchProcessor onBatchSubmitted={handleBatchSubmitted} />
        )}
        
        {activeTab === 'status' && selectedBatchId && (
          <BatchStatusDashboard 
            batchId={selectedBatchId}
            refreshInterval={5}
            onBatchCompleted={(batchId) => {
              console.log(`Batch ${batchId} completed`);
            }}
            onViewResults={handleViewResults}
          />
        )}
        
        {activeTab === 'results' && selectedQueryId && (
          <SerpResultsViewer queryId={selectedQueryId} />
        )}
      </div>
    </div>
  );
};

export default ScrapiPage;