const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
};

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Create a Supabase client with the Auth context of the function
    const { createClient } = await import('npm:@supabase/supabase-js');
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

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
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
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
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
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
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
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
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
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
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }
    
    // Get system status
    if (path === 'system-status') {
      // Get basic counts from tables directly since RPC functions may not exist
      const { count: batchCount } = await supabaseClient
        .from('scrapi_batch_jobs')
        .select('*', { count: 'exact', head: true });
        
      const { count: queryCount } = await supabaseClient
        .from('scrapi_search_queries')
        .select('*', { count: 'exact', head: true });
        
      const { count: adCount } = await supabaseClient
        .from('scrapi_google_ads')
        .select('*', { count: 'exact', head: true });
      
      return new Response(
        JSON.stringify({
          batches: { total: batchCount || 0 },
          queries: { total: queryCount || 0 },
          ads: { total: adCount || 0 },
          timestamp: new Date().toISOString()
        }),
        { 
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
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
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
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
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});