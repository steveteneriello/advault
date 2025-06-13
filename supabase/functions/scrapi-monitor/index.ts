// Supabase Edge Function for SCRAPI Monitoring
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'npm:@supabase/supabase-js';

// Create a Supabase client with the Auth context of the function
const supabaseClient = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_ANON_KEY') ?? '',
  {
    global: {
      headers: { Authorization: `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}` },
    },
  }
);

serve(async (req) => {
  // This is needed if you're planning to invoke your function from a browser.
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Get the request URL
    const url = new URL(req.url);
    const path = url.pathname.split('/').pop();
    
    // Get batch status
    if (path === 'batch-status') {
      const batchId = url.searchParams.get('batchId');
      
      if (!batchId) {
        return new Response(
          JSON.stringify({ 
            success: false, 
            error: 'Batch ID is required' 
          }),
          { 
            status: 400,
            headers: { 'Content-Type': 'application/json' }
          }
        );
      }
      
      const { data: batch, error: batchError } = await supabaseClient
        .from('scrapi_batch_jobs')
        .select('*')
        .eq('id', batchId)
        .single();
        
      if (batchError) {
        console.error('Error fetching batch:', batchError);
        return new Response(
          JSON.stringify({ 
            success: false, 
            error: 'Batch not found' 
          }),
          { 
            status: 404,
            headers: { 'Content-Type': 'application/json' }
          }
        );
      }
      
      return new Response(
        JSON.stringify({
          batchId: batch.id,
          status: batch.status,
          progress: batch.total_queries > 0 ? Math.round((batch.completed_queries / batch.total_queries) * 100) : 0,
          completedQueries: batch.completed_queries,
          totalQueries: batch.total_queries,
          failedQueries: batch.failed_queries,
          startedAt: batch.started_at,
          completedAt: batch.completed_at,
          updatedAt: new Date().toISOString()
        }),
        { 
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }
    
    // Get all batches
    if (path === 'batches') {
      const limit = parseInt(url.searchParams.get('limit') || '20', 10);
      const offset = parseInt(url.searchParams.get('offset') || '0', 10);
      
      const { data: batches, error: batchesError, count } = await supabaseClient
        .from('scrapi_batch_jobs')
        .select('*', { count: 'exact' })
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);
        
      if (batchesError) {
        console.error('Error fetching batches:', batchesError);
        return new Response(
          JSON.stringify({ 
            success: false, 
            error: 'Failed to fetch batches' 
          }),
          { 
            status: 500,
            headers: { 'Content-Type': 'application/json' }
          }
        );
      }
      
      return new Response(
        JSON.stringify({
          batches,
          count
        }),
        { 
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }
    
    // Get system status
    if (path === 'system-status') {
      // Get batch counts
      const { data: batchCounts, error: batchCountsError } = await supabaseClient
        .rpc('get_batch_counts');
        
      if (batchCountsError) {
        console.error('Error fetching batch counts:', batchCountsError);
        return new Response(
          JSON.stringify({ 
            success: false, 
            error: 'Failed to fetch batch counts' 
          }),
          { 
            status: 500,
            headers: { 'Content-Type': 'application/json' }
          }
        );
      }
      
      // Get query counts
      const { data: queryCounts, error: queryCountsError } = await supabaseClient
        .rpc('get_query_counts');
        
      if (queryCountsError) {
        console.error('Error fetching query counts:', queryCountsError);
        return new Response(
          JSON.stringify({ 
            success: false, 
            error: 'Failed to fetch query counts' 
          }),
          { 
            status: 500,
            headers: { 'Content-Type': 'application/json' }
          }
        );
      }
      
      // Get ad counts
      const { data: adCounts, error: adCountsError } = await supabaseClient
        .rpc('get_ad_counts');
        
      if (adCountsError) {
        console.error('Error fetching ad counts:', adCountsError);
        return new Response(
          JSON.stringify({ 
            success: false, 
            error: 'Failed to fetch ad counts' 
          }),
          { 
            status: 500,
            headers: { 'Content-Type': 'application/json' }
          }
        );
      }
      
      return new Response(
        JSON.stringify({
          batches: batchCounts,
          queries: queryCounts,
          ads: adCounts,
          timestamp: new Date().toISOString()
        }),
        { 
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }
    
    // Unknown endpoint
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: 'Unknown endpoint' 
      }),
      { 
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  } catch (error) {
    console.error('Error in monitor function:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: 'Internal server error' 
      }),
      { 
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
});

// CORS headers for browser requests
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
};