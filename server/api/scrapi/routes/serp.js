// SERP routes
const express = require('express');
const router = express.Router();
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

// Initialize Supabase client
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Get SERP results
router.get('/:queryId', async (req, res) => {
  try {
    const { queryId } = req.params;
    
    const { data: query, error: queryError } = await supabase
      .from('scrapi_search_queries')
      .select('*')
      .eq('id', queryId)
      .single();
      
    if (queryError) {
      console.error('Error fetching query:', queryError);
      return res.status(404).json({ 
        success: false, 
        error: 'Query not found' 
      });
    }
    
    const { data: serp, error: serpError } = await supabase
      .from('scrapi_serp_results')
      .select('*')
      .eq('query_id', queryId)
      .single();
      
    if (serpError) {
      console.error('Error fetching SERP:', serpError);
      return res.status(404).json({ 
        success: false, 
        error: 'SERP not found' 
      });
    }
    
    res.json(serp);
  } catch (error) {
    console.error('Error getting SERP results:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Internal server error' 
    });
  }
});

// Get Google ads for a SERP
router.get('/:serpId/google-ads', async (req, res) => {
  try {
    const { serpId } = req.params;
    
    const { data: ads, error: adsError } = await supabase
      .from('scrapi_google_ads')
      .select('*')
      .eq('serp_id', serpId)
      .order('position', { ascending: true });
      
    if (adsError) {
      console.error('Error fetching Google ads:', adsError);
      return res.status(500).json({ 
        success: false, 
        error: 'Failed to fetch Google ads' 
      });
    }
    
    res.json(ads || []);
  } catch (error) {
    console.error('Error getting Google ads:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Internal server error' 
    });
  }
});

// Get Bing ads for a SERP
router.get('/:serpId/bing-ads', async (req, res) => {
  try {
    const { serpId } = req.params;
    
    const { data: ads, error: adsError } = await supabase
      .from('scrapi_bing_ads')
      .select('*')
      .eq('serp_id', serpId)
      .order('position', { ascending: true });
      
    if (adsError) {
      console.error('Error fetching Bing ads:', adsError);
      return res.status(500).json({ 
        success: false, 
        error: 'Failed to fetch Bing ads' 
      });
    }
    
    res.json(ads || []);
  } catch (error) {
    console.error('Error getting Bing ads:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Internal server error' 
    });
  }
});

module.exports = router;