import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
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
      
      <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as any)} className="w-full">
        <TabsList className="mb-6">
          <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
          <TabsTrigger value="single">Single Query</TabsTrigger>
          <TabsTrigger value="batch">Batch Processing</TabsTrigger>
          {selectedBatchId && (
            <TabsTrigger value="status">Batch Status</TabsTrigger>
          )}
          {selectedQueryId && (
            <TabsTrigger value="results">SERP Results</TabsTrigger>
          )}
        </TabsList>
        
        <TabsContent value="dashboard">
          <ScrapiDashboard />
        </TabsContent>
        
        <TabsContent value="single">
          <ScrapiSingleQuery onQuerySubmitted={handleQuerySubmitted} />
        </TabsContent>
        
        <TabsContent value="batch">
          <BatchProcessor onBatchSubmitted={handleBatchSubmitted} />
        </TabsContent>
        
        <TabsContent value="status">
          {selectedBatchId && (
            <BatchStatusDashboard 
              batchId={selectedBatchId}
              refreshInterval={5}
              onBatchCompleted={(batchId) => {
                console.log(`Batch ${batchId} completed`);
              }}
              onViewResults={handleViewResults}
            />
          )}
        </TabsContent>
        
        <TabsContent value="results">
          {selectedQueryId && (
            <SerpResultsViewer queryId={selectedQueryId} />
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default ScrapiPage;