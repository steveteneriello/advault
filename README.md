# Perimeter360 Monorepo

This monorepo contains all the applications and packages for the Perimeter360 platform.

## Architecture

### 1. Frontend (`apps/` directory)
- Contains standalone frontend applications
- Each app is a complete React application with its own package.json, build process, and dependencies
- Currently includes the SERP Dashboard app
- Each app can be built and deployed independently

### 2. Backend (multiple options)
- **Express Server** (`server/` directory): Serves as a central API server and static file server
- **Supabase Functions** (`supabase/functions/` directory): Edge functions for serverless API endpoints
- **Server Directory** (`server/` directory): Contains dedicated backend services

### 3. API Layer
- **REST API** (`server/api/scrapi/`): Express-based API endpoints
- **Supabase API**: Direct database access via Supabase client
- **Edge Functions**: Serverless functions for specific operations

### 4. Shared Resources (`packages/` directory)
- **UI Library** (`packages/ui`): Shared UI components
- **Utils Library** (`packages/utils`): Shared utility functions
- **Config Package** (`packages/config`): Shared configuration

## Getting Started

```bash
# Install dependencies
npm install

# Start the SERP Dashboard development server
npm run dev:serp

# Build all applications
npm run build

# Start the production server
npm run start
```

## Applications

### SERP Dashboard
A modern dashboard for SERP (Search Engine Results Page) analytics and campaign management.

```bash
# Start the development server
npm run dev:serp

# Build for production
npm run build:serp
```

### SCRAPI
A powerful search and ad intelligence platform.

```bash
# Run a single query
npm run scrapi "query" "location"

# Process a batch of queries
npm run batch

# Monitor job status
npm run monitor
```

## Deployment

The project is configured for deployment to:
- Frontend: Vercel
- Backend: Railway
- Database: Supabase

See the deployment configuration in:
- `vercel.json` - Vercel configuration
- `railway.toml` - Railway configuration