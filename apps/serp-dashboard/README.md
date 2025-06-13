# SERP Analytics Dashboard

A modern dashboard for SERP (Search Engine Results Page) analytics and campaign management, built with React, Vite, and Tailwind CSS.

## Features

- Campaign creation and management
- Location targeting and selection
- Keyword management
- Scheduling and automation
- Real-time analytics
- Dark/light theme support

## Getting Started

### Prerequisites

- Node.js 16+
- npm or yarn

### Installation

```bash
# From the root of the monorepo
npm install

# Start the development server
npm run dev:serp
```

### Environment Variables

Create a `.env.local` file with the following variables:

```
VITE_SUPABASE_URL=your-supabase-url
VITE_SUPABASE_ANON_KEY=your-supabase-anon-key
VITE_GOOGLE_MAPS_API_KEY=your-google-maps-api-key
```

## Development

### Available Scripts

- `npm run dev` - Start the development server
- `npm run build` - Build for production
- `npm run preview` - Preview the production build
- `npm run lint` - Run ESLint
- `npm run type-check` - Run TypeScript type checking

### Project Structure

```
src/
├── components/     # UI components
├── hooks/          # Custom React hooks
├── lib/            # Utilities and API clients
├── pages/          # Page components
├── styles/         # Global styles
└── App.tsx         # Main application component
```

## Connecting to Backend

This dashboard connects to the SCRAPI backend for data retrieval and campaign management. The connection is configured through Supabase and direct API calls.

## License

This project is private and proprietary.