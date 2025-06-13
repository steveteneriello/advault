// Ads routes
const express = require('express');
const router = express.Router();
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

// Initialize Supabase client
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Get Google ad renderings
router.get('/google-ads/:adId/renderings', async (req, res) => {
  try {
    const { adId } = req.params;
    
    const { data: renderings, error: renderingsError } = await supabase
      .from('scrapi_google_ad_renderings')
      .select('*')
      .eq('ad_id', adId);
      
    if (renderingsError) {
      console.error('Error fetching Google ad renderings:', renderingsError);
      return res.status(500).json({ 
        success: false, 
        error: 'Failed to fetch Google ad renderings' 
      });
    }
    
    res.json(renderings || []);
  } catch (error) {
    console.error('Error getting Google ad renderings:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Internal server error' 
    });
  }
});

// Get Bing ad renderings
router.get('/bing-ads/:adId/renderings', async (req, res) => {
  try {
    const { adId } = req.params;
    
    const { data: renderings, error: renderingsError } = await supabase
      .from('scrapi_bing_ad_renderings')
      .select('*')
      .eq('ad_id', adId);
      
    if (renderingsError) {
      console.error('Error fetching Bing ad renderings:', renderingsError);
      return res.status(500).json({ 
        success: false, 
        error: 'Failed to fetch Bing ad renderings' 
      });
    }
    
    res.json(renderings || []);
  } catch (error) {
    console.error('Error getting Bing ad renderings:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Internal server error' 
    });
  }
});

module.exports = router;