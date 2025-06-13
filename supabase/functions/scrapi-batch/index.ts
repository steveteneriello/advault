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
    // Get the request body
    const { name, queries, config = {} } = await req.json();
    
    if (!name || !queries || !Array.isArray(queries) || queries.length === 0) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Name and queries array are required' 
        }),
        { 
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // Create a Supabase client with the Auth context of the function
    const { createClient } = await import('npm:@supabase/supabase-js');
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );
    
    // Create a batch job record
    const { data: batchData, error: batchError } = await supabaseClient
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
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Failed to create batch job' 
        }),
        { 
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }
    
    // Create search query records for each query
    const queryRecords = queries.map((q: any) => ({
      batch_id: batchData.id,
      query: q.query,
      location: q.location,
      status: 'pending'
    }));
    
    const { error: queriesError } = await supabaseClient
      .from('scrapi_search_queries')
      .insert(queryRecords);
      
    if (queriesError) {
      console.error('Error creating search queries:', queriesError);
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Failed to create search queries' 
        }),
        { 
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }
    
    // In a real implementation, we would submit the batch to SCRAPI here
    // For now, we'll just return the batch ID
    
    return new Response(
      JSON.stringify({ 
        success: true, 
        batchId: batchData.id,
        message: 'Batch submitted successfully'
      }),
      { 
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  } catch (error) {
    console.error('Error submitting batch:', error);
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