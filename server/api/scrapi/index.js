// SCRAPI API Server
const express = require('express');
const cors = require('cors');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Initialize Supabase client
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase credentials. Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'healthy', timestamp: new Date().toISOString() });
});

// Submit a single query
app.post('/api/search', async (req, res) => {
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

// Submit a batch of queries
app.post('/api/batch', async (req, res) => {
  try {
    const { name, queries, config = {} } = req.body;
    
    if (!name || !queries || !Array.isArray(queries) || queries.length === 0) {
      return res.status(400).json({ 
        success: false, 
        error: 'Name and queries array are required' 
      });
    }
    
    // Create a batch job record
    const { data: batchData, error: batchError } = await supabase
      .from('scrapi_batch_jobs')
      .insert({
        name,
        description: `Batch job with ${queries.length} queries`,
        status: 'pending',
        total_queries: queries.length,
        config
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
    
    // Create search query records for each query
    const queryRecords = queries.map(q => ({
      batch_id: batchData.id,
      query: q.query,
      location: q.location,
      status: 'pending'
    }));
    
    const { error: queriesError } = await supabase
      .from('scrapi_search_queries')
      .insert(queryRecords);
      
    if (queriesError) {
      console.error('Error creating search queries:', queriesError);
      return res.status(500).json({ 
        success: false, 
        error: 'Failed to create search queries' 
      });
    }
    
    // In a real implementation, we would submit the batch to SCRAPI here
    // For now, we'll just return the batch ID
    
    res.json({ 
      success: true, 
      batchId: batchData.id,
      message: 'Batch submitted successfully'
    });
  } catch (error) {
    console.error('Error submitting batch:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Internal server error' 
    });
  }
});

// Get batch status
app.get('/api/batch/:batchId/status', async (req, res) => {
  try {
    const { batchId } = req.params;
    
    const { data: batch, error: batchError } = await supabase
      .from('scrapi_batch_jobs')
      .select('*')
      .eq('id', batchId)
      .single();
      
    if (batchError) {
      console.error('Error fetching batch:', batchError);
      return res.status(404).json({ 
        success: false, 
        error: 'Batch not found' 
      });
    }
    
    res.json({
      batchId: batch.id,
      status: batch.status,
      progress: batch.total_queries > 0 ? Math.round((batch.completed_queries / batch.total_queries) * 100) : 0,
      completedQueries: batch.completed_queries,
      totalQueries: batch.total_queries,
      failedQueries: batch.failed_queries,
      startedAt: batch.started_at,
      completedAt: batch.completed_at,
      updatedAt: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error getting batch status:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Internal server error' 
    });
  }
});

// Get all batches
app.get('/api/batches', async (req, res) => {
  try {
    const { limit = 20, offset = 0 } = req.query;
    
    const { data: batches, error: batchesError, count } = await supabase
      .from('scrapi_batch_jobs')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);
      
    if (batchesError) {
      console.error('Error fetching batches:', batchesError);
      return res.status(500).json({ 
        success: false, 
        error: 'Failed to fetch batches' 
      });
    }
    
    res.json({
      batches,
      count
    });
  } catch (error) {
    console.error('Error getting batches:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Internal server error' 
    });
  }
});

// Get batch details
app.get('/api/batch/:batchId', async (req, res) => {
  try {
    const { batchId } = req.params;
    
    const { data: batch, error: batchError } = await supabase
      .from('scrapi_batch_jobs')
      .select('*')
      .eq('id', batchId)
      .single();
      
    if (batchError) {
      console.error('Error fetching batch:', batchError);
      return res.status(404).json({ 
        success: false, 
        error: 'Batch not found' 
      });
    }
    
    const { data: queries, error: queriesError } = await supabase
      .from('scrapi_search_queries')
      .select('*')
      .eq('batch_id', batchId)
      .order('created_at', { ascending: true });
      
    if (queriesError) {
      console.error('Error fetching queries:', queriesError);
      return res.status(500).json({ 
        success: false, 
        error: 'Failed to fetch queries' 
      });
    }
    
    res.json({
      batch,
      queries: queries || []
    });
  } catch (error) {
    console.error('Error getting batch details:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Internal server error' 
    });
  }
});

// Get SERP results
app.get('/api/serp/:queryId', async (req, res) => {
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
app.get('/api/serp/:serpId/google-ads', async (req, res) => {
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
app.get('/api/serp/:serpId/bing-ads', async (req, res) => {
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

// Get Google ad renderings
app.get('/api/google-ads/:adId/renderings', async (req, res) => {
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
app.get('/api/bing-ads/:adId/renderings', async (req, res) => {
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

// Cancel batch
app.post('/api/batch/:batchId/cancel', async (req, res) => {
  try {
    const { batchId } = req.params;
    
    // Update batch status
    const { error: batchError } = await supabase
      .from('scrapi_batch_jobs')
      .update({
        status: 'failed',
        error_message: 'Batch cancelled by user'
      })
      .eq('id', batchId);
      
    if (batchError) {
      console.error('Error updating batch status:', batchError);
      return res.status(500).json({ 
        success: false, 
        error: 'Failed to update batch status' 
      });
    }
    
    // Update pending and processing queries
    const { error: queriesError } = await supabase
      .from('scrapi_search_queries')
      .update({
        status: 'failed',
        error_message: 'Batch cancelled by user'
      })
      .eq('batch_id', batchId)
      .in('status', ['pending', 'processing']);
      
    if (queriesError) {
      console.error('Error updating queries status:', queriesError);
      return res.status(500).json({ 
        success: false, 
        error: 'Failed to update queries status' 
      });
    }
    
    res.json({ 
      success: true, 
      message: 'Batch cancelled successfully' 
    });
  } catch (error) {
    console.error('Error cancelling batch:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Internal server error' 
    });
  }
});

// Retry failed queries
app.post('/api/batch/:batchId/retry-failed', async (req, res) => {
  try {
    const { batchId } = req.params;
    
    // Get failed queries
    const { data: failedQueries, error: queriesError } = await supabase
      .from('scrapi_search_queries')
      .select('id')
      .eq('batch_id', batchId)
      .eq('status', 'failed');
      
    if (queriesError) {
      console.error('Error fetching failed queries:', queriesError);
      return res.status(500).json({ 
        success: false, 
        error: 'Failed to fetch failed queries' 
      });
    }
    
    if (!failedQueries || failedQueries.length === 0) {
      return res.json({ 
        success: true, 
        retriedCount: 0,
        message: 'No failed queries to retry' 
      });
    }
    
    // Update failed queries to pending
    const { error: updateError } = await supabase
      .from('scrapi_search_queries')
      .update({
        status: 'pending',
        error_message: null,
        retry_count: supabase.rpc('increment_retry_count', { row_id: null })
      })
      .eq('batch_id', batchId)
      .eq('status', 'failed');
      
    if (updateError) {
      console.error('Error updating failed queries:', updateError);
      return res.status(500).json({ 
        success: false, 
        error: 'Failed to update failed queries' 
      });
    }
    
    // Update batch status to processing
    const { error: batchError } = await supabase
      .from('scrapi_batch_jobs')
      .update({
        status: 'processing',
        error_message: null
      })
      .eq('id', batchId);
      
    if (batchError) {
      console.error('Error updating batch status:', batchError);
      return res.status(500).json({ 
        success: false, 
        error: 'Failed to update batch status' 
      });
    }
    
    res.json({ 
      success: true, 
      retriedCount: failedQueries.length,
      message: `Retrying ${failedQueries.length} failed queries` 
    });
  } catch (error) {
    console.error('Error retrying failed queries:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Internal server error' 
    });
  }
});

// Start the server
app.listen(PORT, () => {
  console.log(`SCRAPI API server running on port ${PORT}`);
});

module.exports = app;