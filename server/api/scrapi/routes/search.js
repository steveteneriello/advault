// Search routes
const express = require('express');
const router = express.Router();
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

// Initialize Supabase client
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Submit a single query
router.post('/', async (req, res) => {
  try {
    const { query, location, platform = 'google', renderHtml = true, renderPng = true } = req.body;
    
    if (!query || !location) {
      return res.status(400).json({ 
        success: false, 
        error: 'Query and location are required' 
      });
    }
    
    // Create a search query record
    const { data: batchData, error: batchError } = await supabase
      .from('scrapi_batch_jobs')
      .insert({
        name: `Single Query: ${query}`,
        description: `Single query for "${query}" in ${location}`,
        status: 'processing',
        total_queries: 1,
        config: { platform, renderHtml, renderPng }
      })
      .select()
      .single();
      
    if (batchError) {
      console.error('Error creating batch job:', batchError);
      return res.status(500).json({ 
        success: false, 
        error: 'Failed to create batch job' 
      });
    }
    
    // Create a search query record
    const { data: queryData, error: queryError } = await supabase
      .from('scrapi_search_queries')
      .insert({
        batch_id: batchData.id,
        query,
        location,
        status: 'processing',
        oxylabs_job_id: `oxylabs-${Date.now()}`
      })
      .select()
      .single();
      
    if (queryError) {
      console.error('Error creating search query:', queryError);
      return res.status(500).json({ 
        success: false, 
        error: 'Failed to create search query' 
      });
    }
    
    // In a real implementation, we would submit the job to SCRAPI here
    // For now, we'll just return the query ID
    
    res.json({ 
      success: true, 
      jobId: queryData.id,
      message: 'Query submitted successfully'
    });
  } catch (error) {
    console.error('Error submitting query:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Internal server error' 
    });
  }
});

module.exports = router;