import React, { useState } from 'react';
import { scrapiClient } from '@/lib/scrapi-client';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";

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
    <Card>
      <CardHeader>
        <CardTitle>Single Query Search</CardTitle>
        <CardDescription>
          Search for ads with a specific query and location
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div className="space-y-2">
              <Label htmlFor="query">Search Query</Label>
              <Input
                id="query"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="e.g., plumbers near me"
                disabled={isLoading}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="location">Location</Label>
              <Input
                id="location"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="e.g., Boston, MA"
                disabled={isLoading}
              />
            </div>
          </div>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Platform</Label>
              <RadioGroup 
                value={platform} 
                onValueChange={(value) => setPlatform(value as 'google' | 'bing' | 'both')}
                className="flex space-x-4"
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="google" id="google" />
                  <Label htmlFor="google">Google</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="bing" id="bing" />
                  <Label htmlFor="bing">Bing</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="both" id="both" />
                  <Label htmlFor="both">Both</Label>
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
          </div>

          {error && (
            <div className="bg-red-500/20 border border-red-500/50 text-red-200 p-3 rounded-lg mt-4">
              {error}
            </div>
          )}
        </form>
      </CardContent>
      <CardFooter className="flex justify-end">
        <Button
          type="submit"
          onClick={handleSubmit}
          disabled={isLoading || !query.trim() || !location.trim()}
        >
          {isLoading ? 'Searching...' : 'Search Now'}
        </Button>
      </CardFooter>
    </Card>
  );
};

export default ScrapiSingleQuery;