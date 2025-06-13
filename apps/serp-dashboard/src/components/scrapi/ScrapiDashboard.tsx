import React, { useState, useEffect } from 'react';
import { mockBatches, generateMockQueries } from '@/lib/mock-data';
import type { ScrapiBatchJob } from '@/lib/scrapi-schema';
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from "@/components/ui/table";

const ScrapiDashboard: React.FC = () => {
  const [recentBatches, setRecentBatches] = useState<ScrapiBatchJob[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [stats, setStats] = useState({
    totalBatches: 0,
    completedBatches: 0,
    processingBatches: 0,
    pendingBatches: 0,
    failedBatches: 0,
    totalQueries: 0,
    completedQueries: 0,
    failedQueries: 0,
    totalAds: 0,
    googleAds: 0,
    bingAds: 0
  });

  useEffect(() => {
    // Simulate loading data
    const loadData = async () => {
      setIsLoading(true);
      
      // In a real implementation, this would fetch data from the API
      // For now, we'll use mock data
      setTimeout(() => {
        setRecentBatches(mockBatches);
        
        // Calculate stats
        const totalBatches = mockBatches.length;
        const completedBatches = mockBatches.filter(b => b.status === 'completed').length;
        const processingBatches = mockBatches.filter(b => b.status === 'processing').length;
        const pendingBatches = mockBatches.filter(b => b.status === 'pending').length;
        const failedBatches = mockBatches.filter(b => b.status === 'failed').length;
        
        const totalQueries = mockBatches.reduce((sum, batch) => sum + batch.total_queries, 0);
        const completedQueries = mockBatches.reduce((sum, batch) => sum + batch.completed_queries, 0);
        const failedQueries = mockBatches.reduce((sum, batch) => sum + batch.failed_queries, 0);
        
        // Simulate ad counts
        const totalAds = completedQueries * 3; // Assume 3 ads per query on average
        const googleAds = Math.round(totalAds * 0.7); // 70% Google ads
        const bingAds = totalAds - googleAds; // 30% Bing ads
        
        setStats({
          totalBatches,
          completedBatches,
          processingBatches,
          pendingBatches,
          failedBatches,
          totalQueries,
          completedQueries,
          failedQueries,
          totalAds,
          googleAds,
          bingAds
        });
        
        setIsLoading(false);
      }, 1000);
    };
    
    loadData();
  }, []);

  return (
    <div className="space-y-6">
      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-zinc-400 mb-2">Batch Status</p>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-3xl font-semibold">{stats.totalBatches}</p>
                <p className="text-xs text-zinc-400">Total Batches</p>
              </div>
              <div className="space-y-1">
                <div className="flex items-center">
                  <div className="w-2 h-2 rounded-full bg-green-500 mr-2"></div>
                  <span className="text-xs text-zinc-400">{stats.completedBatches} Completed</span>
                </div>
                <div className="flex items-center">
                  <div className="w-2 h-2 rounded-full bg-blue-500 mr-2"></div>
                  <span className="text-xs text-zinc-400">{stats.processingBatches} Processing</span>
                </div>
                <div className="flex items-center">
                  <div className="w-2 h-2 rounded-full bg-yellow-500 mr-2"></div>
                  <span className="text-xs text-zinc-400">{stats.pendingBatches} Pending</span>
                </div>
                <div className="flex items-center">
                  <div className="w-2 h-2 rounded-full bg-red-500 mr-2"></div>
                  <span className="text-xs text-zinc-400">{stats.failedBatches} Failed</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-zinc-400 mb-2">Queries</p>
            <p className="text-3xl font-semibold">{stats.totalQueries}</p>
            <div className="mt-2">
              <Progress value={stats.totalQueries > 0 ? (stats.completedQueries / stats.totalQueries) * 100 : 0} />
              <div className="flex justify-between text-xs text-zinc-400 mt-1">
                <span>{stats.completedQueries} completed</span>
                <span>{stats.failedQueries} failed</span>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-zinc-400 mb-2">Ads Collected</p>
            <p className="text-3xl font-semibold">{stats.totalAds}</p>
            <div className="mt-2 space-y-1">
              <div className="flex items-center">
                <div className="w-2 h-2 rounded-full bg-blue-500 mr-2"></div>
                <span className="text-xs text-zinc-400">{stats.googleAds} Google Ads</span>
              </div>
              <div className="flex items-center">
                <div className="w-2 h-2 rounded-full bg-yellow-500 mr-2"></div>
                <span className="text-xs text-zinc-400">{stats.bingAds} Bing Ads</span>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-zinc-400 mb-2">Renderings</p>
            <p className="text-3xl font-semibold">{stats.totalAds * 4}</p>
            <div className="mt-2 space-y-1">
              <div className="flex items-center">
                <div className="w-2 h-2 rounded-full bg-green-500 mr-2"></div>
                <span className="text-xs text-zinc-400">{stats.totalAds * 2} HTML Renderings</span>
              </div>
              <div className="flex items-center">
                <div className="w-2 h-2 rounded-full bg-purple-500 mr-2"></div>
                <span className="text-xs text-zinc-400">{stats.totalAds * 2} PNG Renderings</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
      
      {/* Recent Batches */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Batches</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="p-6 text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500 mx-auto"></div>
              <p className="mt-2 text-zinc-400">Loading batches...</p>
            </div>
          ) : recentBatches.length === 0 ? (
            <div className="p-6 text-center text-zinc-500">
              No batches found
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Queries</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead>Completed</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {recentBatches.map((batch) => (
                    <TableRow key={batch.id}>
                      <TableCell>
                        <div className="font-medium">{batch.name}</div>
                        <div className="text-sm text-zinc-400">{batch.description}</div>
                      </TableCell>
                      <TableCell>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          batch.status === 'completed' ? 'bg-green-500/20 text-green-400' :
                          batch.status === 'processing' ? 'bg-blue-500/20 text-blue-400' :
                          batch.status === 'failed' ? 'bg-red-500/20 text-red-400' :
                          'bg-yellow-500/20 text-yellow-400'
                        }`}>
                          {batch.status}
                        </span>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center">
                          <span className="mr-2">{batch.completed_queries}/{batch.total_queries}</span>
                          <div className="w-20 bg-zinc-800 rounded-full h-1.5">
                            <div 
                              className="bg-blue-500 h-1.5 rounded-full" 
                              style={{ width: `${batch.total_queries > 0 ? (batch.completed_queries / batch.total_queries) * 100 : 0}%` }}
                            ></div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-sm">
                        {new Date(batch.created_at).toLocaleString()}
                      </TableCell>
                      <TableCell className="text-sm">
                        {batch.completed_at ? new Date(batch.completed_at).toLocaleString() : '-'}
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="link"
                          size="sm"
                          onClick={() => {
                            // Navigate to batch details
                            window.location.href = `/scrapi?batch=${batch.id}`;
                          }}
                          className="text-blue-400 hover:text-blue-300 p-0 h-auto"
                        >
                          View Details
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default ScrapiDashboard;