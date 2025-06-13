# Supabase Edge Functions

This directory contains Supabase Edge Functions for the SCRAPI system.

## Available Functions

- `scrapi-search`: Process a single search query
- `scrapi-batch`: Process a batch of search queries
- `scrapi-monitor`: Monitor job status

## Development

To develop and test edge functions locally:

```bash
# Install Supabase CLI
npm install -g supabase

# Start local development
supabase start

# Link to your Supabase project
supabase link --project-ref your-project-ref

# Serve functions locally
supabase functions serve --no-verify-jwt

# Deploy functions
supabase functions deploy
```

## Environment Variables

Edge functions require the following environment variables:

```bash
# Set environment variables
supabase secrets set SUPABASE_URL=your-supabase-url
supabase secrets set SUPABASE_ANON_KEY=your-supabase-anon-key
supabase secrets set SUPABASE_SERVICE_ROLE_KEY=your-supabase-service-role-key
supabase secrets set OXYLABS_USERNAME=your-oxylabs-username
supabase secrets set OXYLABS_PASSWORD=your-oxylabs-password
```

## Function Invocation

Functions can be invoked via HTTP requests:

```bash
# Invoke a function
curl -X POST https://your-project-ref.supabase.co/functions/v1/scrapi-search \
  -H "Authorization: Bearer $SUPABASE_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{"query": "plumbers near me", "location": "Boston, MA"}'
```