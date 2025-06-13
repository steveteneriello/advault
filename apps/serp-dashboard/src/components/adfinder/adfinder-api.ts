/**
 * AdFinder API Client
 * This client interfaces with the AdFinder backend service
 * to search for ads based on keywords and locations.
 */

export class AdFinderAPI {
  private baseUrl: string;
  
  constructor() {
    // In a real implementation, this would come from environment variables
    this.baseUrl = 'https://api.example.com/adfinder';
  }

  /**
   * Search for ads based on query and location
   */
  async searchAds(query: string, location: string): Promise<any[]> {
    // This is a mock implementation since we don't have a real API
    console.log(`Searching ads for "${query}" in ${location}`);
    
    // Return mock data instead of making a real API call
    return this.getMockResults(query);
  }

  /**
   * Check if the API is healthy
   * This method is commented out to prevent errors
   */
  /*
  async checkHealth(): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/health`);
      return response.ok;
    } catch (error) {
      console.error('Health check failed:', error);
      return false;
    }
  }
  */

  /**
   * Generate mock results for demonstration
   */
  private getMockResults(query: string): any[] {
    // Generate 3-5 mock results
    const count = Math.floor(Math.random() * 3) + 3;
    const results = [];
    
    const keywords = query.toLowerCase().split(' ');
    
    for (let i = 0; i < count; i++) {
      results.push({
        id: `ad-${Date.now()}-${i}`,
        title: this.generateTitle(keywords, i),
        description: this.generateDescription(keywords, i),
        displayUrl: this.generateUrl(keywords, i),
        destinationUrl: this.generateUrl(keywords, i, true),
        position: i + 1,
        impressions: Math.floor(Math.random() * 1000) + 100,
        clicks: Math.floor(Math.random() * 100) + 10,
      });
    }
    
    return results;
  }
  
  private generateTitle(keywords: string[], index: number): string {
    const titles = [
      `Top ${keywords.join(' ')} Services`,
      `Professional ${keywords.join(' ')} - Fast & Reliable`,
      `${keywords.map(k => k.charAt(0).toUpperCase() + k.slice(1)).join(' ')} Experts`,
      `Best ${keywords.join(' ')} Solutions`,
      `Affordable ${keywords.join(' ')} Services`
    ];
    
    return titles[index % titles.length];
  }
  
  private generateDescription(keywords: string[], index: number): string {
    const descriptions = [
      `Professional ${keywords.join(' ')} services with 24/7 availability. Fast response times and competitive rates. Call now for a free quote!`,
      `Experienced ${keywords.join(' ')} experts serving your area for over 20 years. Licensed, bonded, and insured.`,
      `Need ${keywords.join(' ')}? Our team provides top-quality service with a 100% satisfaction guarantee. Same-day service available.`,
      `Affordable ${keywords.join(' ')} solutions for residential and commercial clients. No job too big or small.`,
      `Emergency ${keywords.join(' ')} services available. Fast response, fair prices, and quality workmanship guaranteed.`
    ];
    
    return descriptions[index % descriptions.length];
  }
  
  private generateUrl(keywords: string[], index: number, full: boolean = false): string {
    const domains = [
      'bestservice',
      'proexperts',
      'toprated',
      'quality',
      'affordable'
    ];
    
    const domain = domains[index % domains.length];
    const keyword = keywords.join('');
    
    return full 
      ? `https://www.${domain}${keyword}.com/services?utm_source=ads&utm_medium=search` 
      : `www.${domain}${keyword}.com`;
  }
}