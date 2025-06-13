// Batch routes
const express = require('express');
const router = express.Router();
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

// Initialize Supabase client
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Submit a batch of queries
router.post('/', async (req, res) => {
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
router.get('/:batchId/status', async (req, res) => {
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
router.get('/', async (req, res) => {
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
router.get('/:batchId', async (req, res) => {
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

// Cancel batch
router.post('/:batchId/cancel', async (req, res) => {
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
router.post('/:batchId/retry-failed', async (req, res) => {
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

module.exports = router;