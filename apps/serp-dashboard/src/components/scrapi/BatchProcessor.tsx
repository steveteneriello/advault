import React, { useState, useEffect } from 'react';
import { scrapiClient } from '@/lib/scrapi-client';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";

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
    <Card>
      <CardHeader>
        <CardTitle>SCRAPI Batch Processor</CardTitle>
        <CardDescription>
          Submit multiple queries for batch processing
        </CardDescription>
        <div className="flex items-center mt-2">
          <div className={`w-3 h-3 rounded-full mr-2 ${
            apiStatus === 'connected' ? 'bg-green-500' : 
            apiStatus === 'disconnected' ? 'bg-red-500' : 'bg-yellow-500'
          }`}></div>
          <span className="text-sm text-zinc-400">
            API Status: {apiStatus === 'unknown' ? 'Checking...' : apiStatus}
          </span>
        </div>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="batchName">Batch Name</Label>
            <Input
              id="batchName"
              value={batchName}
              onChange={(e) => setBatchName(e.target.value)}
              placeholder="e.g., Home Services - June 2025"
              disabled={isLoading}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="queries">
              Queries (one per line, format: query|location)
            </Label>
            <Textarea
              id="queries"
              value={queries}
              onChange={(e) => setQueries(e.target.value)}
              placeholder="plumbers near me|Boston, MA
electricians|New York, NY
hvac repair|Miami, FL"
              disabled={isLoading}
              className="h-40"
            />
            <p className="text-xs text-zinc-500">
              Each line should contain a query and optional location separated by |
            </p>
          </div>

          <div className="space-y-2">
            <Label>Platform</Label>
            <RadioGroup 
              value={platform} 
              onValueChange={(value) => setPlatform(value as 'google' | 'bing' | 'both')}
              className="flex space-x-4"
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="google" id="platform-google" />
                <Label htmlFor="platform-google">Google</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="bing" id="platform-bing" />
                <Label htmlFor="platform-bing">Bing</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="both" id="platform-both" />
                <Label htmlFor="platform-both">Both</Label>
              </div>
            </RadioGroup>
          </div>

          <div className="space-y-2">
            <Label>Rendering Options</Label>
            <div className="flex space-x-4">
              <div className="flex items-center space-x-2">
                <Checkbox 
                  id="renderHtml" 
                  checked={renderHtml}
                  onCheckedChange={(checked) => setRenderHtml(checked === true)}
                />
                <Label htmlFor="renderHtml">HTML Rendering</Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox 
                  id="renderPng" 
                  checked={renderPng}
                  onCheckedChange={(checked) => setRenderPng(checked === true)}
                />
                <Label htmlFor="renderPng">PNG Rendering</Label>
              </div>
            </div>
          </div>

          <div>
            <Button
              type="button"
              variant="ghost"
              onClick={() => setAdvancedOptions(!advancedOptions)}
              className="text-sm text-blue-400 hover:text-blue-300 p-0 h-auto"
            >
              {advancedOptions ? 'Hide' : 'Show'} Advanced Options
            </Button>
            
            {advancedOptions && (
              <div className="mt-3 p-4 bg-zinc-800 rounded-lg">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="maxConcurrency">Max Concurrency</Label>
                    <Input
                      id="maxConcurrency"
                      type="number"
                      min="1"
                      max="20"
                      value={maxConcurrency}
                      onChange={(e) => setMaxConcurrency(parseInt(e.target.value))}
                      disabled={isLoading}
                    />
                    <p className="text-xs text-zinc-500">
                      Maximum number of concurrent queries
                    </p>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="delayBetweenQueries">Delay Between Queries (sec)</Label>
                    <Input
                      id="delayBetweenQueries"
                      type="number"
                      min="0"
                      max="60"
                      value={delayBetweenQueries}
                      onChange={(e) => setDelayBetweenQueries(parseInt(e.target.value))}
                      disabled={isLoading}
                    />
                    <p className="text-xs text-zinc-500">
                      Seconds to wait between queries
                    </p>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="maxRetries">Max Retries</Label>
                    <Input
                      id="maxRetries"
                      type="number"
                      min="0"
                      max="10"
                      value={maxRetries}
                      onChange={(e) => setMaxRetries(parseInt(e.target.value))}
                      disabled={isLoading}
                    />
                    <p className="text-xs text-zinc-500">
                      Maximum retry attempts for failed queries
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {error && (
            <div className="bg-red-500/20 border border-red-500/50 text-red-200 p-3 rounded-lg">
              {error}
            </div>
          )}
        </form>
      </CardContent>
      <CardFooter className="flex justify-end">
        <Button
          type="submit"
          onClick={handleSubmit}
          disabled={isLoading || apiStatus !== 'connected' || !batchName.trim() || !queries.trim()}
        >
          {isLoading ? 'Submitting...' : 'Submit Batch'}
        </Button>
      </CardFooter>
    </Card>
  );
};

export default BatchProcessor;