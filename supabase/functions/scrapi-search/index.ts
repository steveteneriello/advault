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
    const { query, location, platform = 'google', renderHtml = true, renderPng = true } = await req.json();
    
    if (!query || !location) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Query and location are required' 
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
    
    // Create a search query record
    const { data: queryData, error: queryError } = await supabaseClient
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
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Failed to create search query' 
        }),
        { 
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }
    
    // In a real implementation, we would submit the job to SCRAPI here
    // For now, we'll just return the query ID
    
    return new Response(
      JSON.stringify({ 
        success: true, 
        jobId: queryData.id,
        message: 'Query submitted successfully'
      }),
      { 
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  } catch (error) {
    console.error('Error submitting query:', error);
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