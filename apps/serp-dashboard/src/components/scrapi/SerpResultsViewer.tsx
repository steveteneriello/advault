import React, { useState, useEffect } from 'react';
import { scrapiClient } from '@/lib/scrapi-client';
import type { 
  ScrapiSerpResult, 
  ScrapiGoogleAd, 
  ScrapiBingAd,
  ScrapiGoogleAdRendering,
  ScrapiBingAdRendering
} from '@/lib/scrapi-schema';

interface SerpResultsViewerProps {
  queryId: string;
}

const SerpResultsViewer: React.FC<SerpResultsViewerProps> = ({ queryId }) => {
  const [serpResult, setSerpResult] = useState<ScrapiSerpResult | null>(null);
  const [googleAds, setGoogleAds] = useState<ScrapiGoogleAd[]>([]);
  const [bingAds, setBingAds] = useState<ScrapiBingAd[]>([]);
  const [selectedAd, setSelectedAd] = useState<{
    id: string;
    type: 'google' | 'bing';
  } | null>(null);
  const [adRenderings, setAdRenderings] = useState<(ScrapiGoogleAdRendering | ScrapiBingAdRendering)[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'google' | 'bing'>('google');

  useEffect(() => {
    loadSerpData();
  }, [queryId]);

  useEffect(() => {
    if (selectedAd) {
      loadAdRenderings(selectedAd.id, selectedAd.type);
    }
  }, [selectedAd]);

  const loadSerpData = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      // For development, we'll use mock data
      // In production, uncomment these lines
      // const serp = await scrapiClient.getSerpResults(queryId);
      // const googleAdsData = await scrapiClient.getGoogleAdsForSerp(serp.id);
      // const bingAdsData = await scrapiClient.getBingAdsForSerp(serp.id);
      
      // Mock data for development
      const mockSerpResult: ScrapiSerpResult = {
        id: `serp-${queryId}`,
        query_id: queryId,
        oxylabs_job_id: `oxylabs-${queryId}`,
        query: 'plumbers near me',
        location: 'Boston, MA',
        timestamp: new Date().toISOString(),
        total_results: 125,
        ads_count: 6,
        organic_count: 10,
        local_count: 3,
        content: {},
        raw_html: null,
        created_at: new Date().toISOString()
      };
      
      const mockGoogleAds: ScrapiGoogleAd[] = [
        {
          id: `google-ad-1-${queryId}`,
          serp_id: mockSerpResult.id,
          position: 1,
          position_overall: 1,
          title: 'Boston Plumbing Pros | 24/7 Emergency Service',
          description: 'Licensed & Insured Plumbers. Same Day Service. Call Now for Free Estimate. We handle all plumbing needs from leaks to installations. 100% Satisfaction Guaranteed.',
          display_url: 'www.bostonplumbingpros.com',
          destination_url: 'https://www.bostonplumbingpros.com/services',
          advertiser_domain: 'bostonplumbingpros.com',
          advertiser_name: 'Boston Plumbing Pros',
          phone: '(617) 555-1234',
          sitelinks: [
            { title: 'Emergency Service', url: 'https://www.bostonplumbingpros.com/emergency' },
            { title: 'Free Estimates', url: 'https://www.bostonplumbingpros.com/estimates' }
          ],
          extensions: {},
          created_at: new Date().toISOString()
        },
        {
          id: `google-ad-2-${queryId}`,
          serp_id: mockSerpResult.id,
          position: 2,
          position_overall: 2,
          title: 'Expert Plumbing Services | Available Now',
          description: 'Professional plumbers ready to solve any plumbing issue. Fast response times and competitive rates. Licensed, bonded, and insured for your peace of mind.',
          display_url: 'www.expertplumbingboston.com',
          destination_url: 'https://www.expertplumbingboston.com',
          advertiser_domain: 'expertplumbingboston.com',
          advertiser_name: 'Expert Plumbing Boston',
          phone: '(617) 555-5678',
          sitelinks: [],
          extensions: {},
          created_at: new Date().toISOString()
        },
        {
          id: `google-ad-3-${queryId}`,
          serp_id: mockSerpResult.id,
          position: 3,
          position_overall: 3,
          title: 'Affordable Plumbing Solutions | 5-Star Service',
          description: 'Quality plumbing at affordable prices. No hidden fees. Upfront pricing and experienced technicians. Serving Boston and surrounding areas.',
          display_url: 'www.affordableplumbingboston.com',
          destination_url: 'https://www.affordableplumbingboston.com',
          advertiser_domain: 'affordableplumbingboston.com',
          advertiser_name: 'Affordable Plumbing Boston',
          phone: '(617) 555-9012',
          sitelinks: [],
          extensions: {},
          created_at: new Date().toISOString()
        }
      ];
      
      const mockBingAds: ScrapiBingAd[] = [
        {
          id: `bing-ad-1-${queryId}`,
          serp_id: mockSerpResult.id,
          position: 1,
          position_overall: 1,
          title: 'Top-Rated Boston Plumbers | 24/7 Service',
          description: 'Experienced plumbers serving Boston area. Fast response, fair prices. Call now for immediate assistance with any plumbing emergency.',
          display_url: 'www.bostonplumbingexperts.com',
          destination_url: 'https://www.bostonplumbingexperts.com',
          advertiser_domain: 'bostonplumbingexperts.com',
          advertiser_name: 'Boston Plumbing Experts',
          phone: '(617) 555-3456',
          sitelinks: [],
          extensions: {},
          created_at: new Date().toISOString()
        },
        {
          id: `bing-ad-2-${queryId}`,
          serp_id: mockSerpResult.id,
          position: 2,
          position_overall: 2,
          title: 'Boston Plumbing Services | Licensed & Insured',
          description: 'Professional plumbing services for residential and commercial clients. No job too big or small. Free estimates and senior discounts.',
          display_url: 'www.bostonplumbingservices.com',
          destination_url: 'https://www.bostonplumbingservices.com',
          advertiser_domain: 'bostonplumbingservices.com',
          advertiser_name: 'Boston Plumbing Services',
          phone: '(617) 555-7890',
          sitelinks: [],
          extensions: {},
          created_at: new Date().toISOString()
        }
      ];
      
      setSerpResult(mockSerpResult);
      setGoogleAds(mockGoogleAds);
      setBingAds(mockBingAds);
      
      // Set default selected ad if available
      if (mockGoogleAds.length > 0) {
        setSelectedAd({
          id: mockGoogleAds[0].id,
          type: 'google'
        });
        setActiveTab('google');
      } else if (mockBingAds.length > 0) {
        setSelectedAd({
          id: mockBingAds[0].id,
          type: 'bing'
        });
        setActiveTab('bing');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load SERP data');
    } finally {
      setIsLoading(false);
    }
  };

  const loadAdRenderings = async (adId: string, type: 'google' | 'bing') => {
    try {
      setIsLoading(true);
      
      // For development, we'll use mock data
      // In production, uncomment these lines
      // if (type === 'google') {
      //   const renderings = await scrapiClient.getGoogleAdRenderings(adId);
      //   setAdRenderings(renderings);
      // } else {
      //   const renderings = await scrapiClient.getBingAdRenderings(adId);
      //   setAdRenderings(renderings);
      // }
      
      // Mock data for development
      const mockRenderings: (ScrapiGoogleAdRendering | ScrapiBingAdRendering)[] = [
        {
          id: `rendering-serp-html-${adId}`,
          ad_id: adId,
          rendering_type: 'html',
          rendering_target: 'serp',
          status: 'completed',
          content_path: '/path/to/serp-html.html',
          storage_url: 'https://via.placeholder.com/800x600?text=SERP+HTML+Rendering',
          content_size: 15000,
          created_at: new Date().toISOString(),
          completed_at: new Date().toISOString(),
          error_message: null
        },
        {
          id: `rendering-serp-png-${adId}`,
          ad_id: adId,
          rendering_type: 'png',
          rendering_target: 'serp',
          status: 'completed',
          content_path: '/path/to/serp-png.png',
          storage_url: 'https://via.placeholder.com/800x600?text=SERP+PNG+Rendering',
          content_size: 50000,
          created_at: new Date().toISOString(),
          completed_at: new Date().toISOString(),
          error_message: null
        },
        {
          id: `rendering-landing-html-${adId}`,
          ad_id: adId,
          rendering_type: 'html',
          rendering_target: 'landing_page',
          status: 'completed',
          content_path: '/path/to/landing-html.html',
          storage_url: 'https://via.placeholder.com/800x600?text=Landing+Page+HTML+Rendering',
          content_size: 25000,
          created_at: new Date().toISOString(),
          completed_at: new Date().toISOString(),
          error_message: null
        },
        {
          id: `rendering-landing-png-${adId}`,
          ad_id: adId,
          rendering_type: 'png',
          rendering_target: 'landing_page',
          status: 'completed',
          content_path: '/path/to/landing-png.png',
          storage_url: 'https://via.placeholder.com/800x600?text=Landing+Page+PNG+Rendering',
          content_size: 75000,
          created_at: new Date().toISOString(),
          completed_at: new Date().toISOString(),
          error_message: null
        }
      ];
      
      setAdRenderings(mockRenderings);
    } catch (err: any) {
      console.error('Failed to load ad renderings:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAdClick = (adId: string, type: 'google' | 'bing') => {
    setSelectedAd({ id: adId, type });
  };

  if (isLoading && !serpResult) {
    return (
      <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-6">
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-4 text-zinc-400">Loading SERP results...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-6">
        <div className="bg-red-500/20 border border-red-500/50 text-red-200 p-4 rounded-lg">
          <h3 className="font-medium mb-2">Error Loading Results</h3>
          <p>{error}</p>
        </div>
      </div>
    );
  }

  if (!serpResult) {
    return (
      <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-6">
        <div className="text-center py-12 text-zinc-500">
          No SERP results found
        </div>
      </div>
    );
  }

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-lg overflow-hidden">
      {/* SERP Header */}
      <div className="p-6 border-b border-zinc-800">
        <h2 className="text-xl font-semibold">SERP Results</h2>
        <div className="mt-2 grid grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <div className="text-sm text-zinc-500">Query</div>
            <div className="font-medium">{serpResult.query}</div>
          </div>
          <div>
            <div className="text-sm text-zinc-500">Location</div>
            <div className="font-medium">{serpResult.location}</div>
          </div>
          <div>
            <div className="text-sm text-zinc-500">Date</div>
            <div className="font-medium">{new Date(serpResult.timestamp).toLocaleString()}</div>
          </div>
          <div>
            <div className="text-sm text-zinc-500">Ads Found</div>
            <div className="font-medium">{serpResult.ads_count}</div>
          </div>
        </div>
      </div>

      {/* Tabs for Google/Bing */}
      <div className="border-b border-zinc-800">
        <div className="flex">
          <button
            className={`px-6 py-3 font-medium text-sm ${
              activeTab === 'google' 
                ? 'border-b-2 border-blue-500 text-blue-500' 
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
            onClick={() => setActiveTab('google')}
          >
            Google Ads ({googleAds.length})
          </button>
          <button
            className={`px-6 py-3 font-medium text-sm ${
              activeTab === 'bing' 
                ? 'border-b-2 border-blue-500 text-blue-500' 
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
            onClick={() => setActiveTab('bing')}
          >
            Bing Ads ({bingAds.length})
          </button>
        </div>
      </div>

      {/* Main content area */}
      <div className="flex h-[calc(100vh-300px)]">
        {/* Ads list */}
        <div className="w-1/3 border-r border-zinc-800 overflow-y-auto">
          <div className="p-4 border-b border-zinc-800">
            <h3 className="font-medium">
              {activeTab === 'google' ? 'Google Ads' : 'Bing Ads'}
            </h3>
          </div>
          
          {activeTab === 'google' ? (
            googleAds.length === 0 ? (
              <div className="p-4 text-zinc-500 text-center">No Google ads found</div>
            ) : (
              <div>
                {googleAds.map(ad => (
                  <div
                    key={ad.id}
                    className={`p-4 border-b border-zinc-800 cursor-pointer hover:bg-zinc-800 transition-colors ${
                      selectedAd?.id === ad.id ? 'bg-zinc-800' : ''
                    }`}
                    onClick={() => handleAdClick(ad.id, 'google')}
                  >
                    <div className="font-medium text-blue-400">{ad.title || 'No title'}</div>
                    <div className="text-green-400 text-sm">{ad.display_url || 'No URL'}</div>
                    <div className="text-zinc-400 text-sm mt-1 line-clamp-2">
                      {ad.description || 'No description'}
                    </div>
                    <div className="text-xs text-zinc-500 mt-2">
                      Position: {ad.position || 'N/A'}
                    </div>
                  </div>
                ))}
              </div>
            )
          ) : (
            bingAds.length === 0 ? (
              <div className="p-4 text-zinc-500 text-center">No Bing ads found</div>
            ) : (
              <div>
                {bingAds.map(ad => (
                  <div
                    key={ad.id}
                    className={`p-4 border-b border-zinc-800 cursor-pointer hover:bg-zinc-800 transition-colors ${
                      selectedAd?.id === ad.id ? 'bg-zinc-800' : ''
                    }`}
                    onClick={() => handleAdClick(ad.id, 'bing')}
                  >
                    <div className="font-medium text-blue-400">{ad.title || 'No title'}</div>
                    <div className="text-green-400 text-sm">{ad.display_url || 'No URL'}</div>
                    <div className="text-zinc-400 text-sm mt-1 line-clamp-2">
                      {ad.description || 'No description'}
                    </div>
                    <div className="text-xs text-zinc-500 mt-2">
                      Position: {ad.position || 'N/A'}
                    </div>
                  </div>
                ))}
              </div>
            )
          )}
        </div>
        
        {/* Ad details and renderings */}
        <div className="flex-1 overflow-y-auto">
          {!selectedAd ? (
            <div className="p-6 text-center text-zinc-500">
              Select an ad to view details
            </div>
          ) : (
            <div>
              {/* Ad details */}
              <div className="p-6 border-b border-zinc-800">
                <h3 className="font-medium mb-4">Ad Details</h3>
                
                {/* Ad information */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <div className="text-sm text-zinc-500">Title</div>
                    <div className="font-medium">
                      {activeTab === 'google' 
                        ? googleAds.find(ad => ad.id === selectedAd.id)?.title || 'N/A'
                        : bingAds.find(ad => ad.id === selectedAd.id)?.title || 'N/A'
                      }
                    </div>
                  </div>
                  <div>
                    <div className="text-sm text-zinc-500">Display URL</div>
                    <div className="font-medium text-green-400">
                      {activeTab === 'google' 
                        ? googleAds.find(ad => ad.id === selectedAd.id)?.display_url || 'N/A'
                        : bingAds.find(ad => ad.id === selectedAd.id)?.display_url || 'N/A'
                      }
                    </div>
                  </div>
                  <div className="col-span-2">
                    <div className="text-sm text-zinc-500">Description</div>
                    <div>
                      {activeTab === 'google' 
                        ? googleAds.find(ad => ad.id === selectedAd.id)?.description || 'N/A'
                        : bingAds.find(ad => ad.id === selectedAd.id)?.description || 'N/A'
                      }
                    </div>
                  </div>
                  <div>
                    <div className="text-sm text-zinc-500">Destination URL</div>
                    <div className="font-medium break-all">
                      <a 
                        href={activeTab === 'google' 
                          ? googleAds.find(ad => ad.id === selectedAd.id)?.destination_url || '#'
                          : bingAds.find(ad => ad.id === selectedAd.id)?.destination_url || '#'
                        } 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-blue-400 hover:underline"
                      >
                        {activeTab === 'google' 
                          ? googleAds.find(ad => ad.id === selectedAd.id)?.destination_url || 'N/A'
                          : bingAds.find(ad => ad.id === selectedAd.id)?.destination_url || 'N/A'
                        }
                      </a>
                    </div>
                  </div>
                  <div>
                    <div className="text-sm text-zinc-500">Advertiser Domain</div>
                    <div className="font-medium">
                      {activeTab === 'google' 
                        ? googleAds.find(ad => ad.id === selectedAd.id)?.advertiser_domain || 'N/A'
                        : bingAds.find(ad => ad.id === selectedAd.id)?.advertiser_domain || 'N/A'
                      }
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Renderings */}
              <div className="p-6">
                <h3 className="font-medium mb-4">Renderings</h3>
                
                {isLoading ? (
                  <div className="text-center py-4">
                    <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500 mx-auto"></div>
                    <p className="mt-2 text-zinc-400">Loading renderings...</p>
                  </div>
                ) : adRenderings.length === 0 ? (
                  <div className="text-center py-4 text-zinc-500">
                    No renderings available for this ad
                  </div>
                ) : (
                  <div>
                    {/* Group renderings by target (SERP vs Landing Page) */}
                    {['serp', 'landing_page'].map(target => {
                      const targetRenderings = adRenderings.filter(r => 
                        r.rendering_target === target
                      );
                      
                      if (targetRenderings.length === 0) return null;
                      
                      return (
                        <div key={target} className="mb-6">
                          <h4 className="text-sm font-medium mb-3 capitalize">
                            {target.replace('_', ' ')} Renderings
                          </h4>
                          
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {/* HTML Renderings */}
                            {targetRenderings.filter(r => r.rendering_type === 'html').map(rendering => (
                              <div key={rendering.id} className="bg-zinc-800 rounded-lg overflow-hidden">
                                <div className="p-3 border-b border-zinc-700 flex justify-between items-center">
                                  <span className="font-medium">HTML Rendering</span>
                                  {rendering.storage_url && (
                                    <a 
                                      href={rendering.storage_url} 
                                      target="_blank" 
                                      rel="noopener noreferrer"
                                      className="text-blue-400 text-sm hover:underline"
                                    >
                                      View Full
                                    </a>
                                  )}
                                </div>
                                <div className="p-4">
                                  {rendering.storage_url ? (
                                    <div className="bg-white rounded h-40 overflow-hidden">
                                      <iframe 
                                        src={rendering.storage_url} 
                                        className="w-full h-full border-0"
                                        title="HTML Rendering"
                                      ></iframe>
                                    </div>
                                  ) : (
                                    <div className="text-center py-4 text-zinc-500">
                                      HTML rendering not available
                                    </div>
                                  )}
                                </div>
                              </div>
                            ))}
                            
                            {/* PNG Renderings */}
                            {targetRenderings.filter(r => r.rendering_type === 'png').map(rendering => (
                              <div key={rendering.id} className="bg-zinc-800 rounded-lg overflow-hidden">
                                <div className="p-3 border-b border-zinc-700 flex justify-between items-center">
                                  <span className="font-medium">PNG Rendering</span>
                                  {rendering.storage_url && (
                                    <a 
                                      href={rendering.storage_url} 
                                      target="_blank" 
                                      rel="noopener noreferrer"
                                      className="text-blue-400 text-sm hover:underline"
                                    >
                                      View Full
                                    </a>
                                  )}
                                </div>
                                <div className="p-4">
                                  {rendering.storage_url ? (
                                    <div className="bg-white rounded h-40 overflow-hidden">
                                      <img 
                                        src={rendering.storage_url} 
                                        alt="PNG Rendering"
                                        className="w-full h-full object-contain"
                                      />
                                    </div>
                                  ) : (
                                    <div className="text-center py-4 text-zinc-500">
                                      PNG rendering not available
                                    </div>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SerpResultsViewer;