// SCRAPI API Server
const express = require('express');
const cors = require('cors');
const { createClient } = require('@supabase/supabase-js');
const { loadConfig } = require('../../config/config');
require('dotenv').config();

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Load configuration
const config = loadConfig();

// Initialize Supabase client
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase credentials. Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Import routes
const searchRoutes = require('./routes/search');
const batchRoutes = require('./routes/batch');
const serpRoutes = require('./routes/serp');
const adsRoutes = require('./routes/ads');

// Register routes
app.use('/api/health', (req, res) => {
  res.json({ status: 'healthy', timestamp: new Date().toISOString() });
});
app.use('/api/search', searchRoutes);
app.use('/api/batch', batchRoutes);
app.use('/api/serp', serpRoutes);
app.use('/api/ads', adsRoutes);

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('API Error:', err);
  res.status(500).json({ 
    success: false, 
    error: 'Internal server error' 
  });
});

// Export the app for use in index.js
module.exports = app;

// Start the server if this file is run directly
if (require.main === module) {
  const PORT = process.env.PORT || 3000;
  app.listen(PORT, () => {
    console.log(`SCRAPI API server running on port ${PORT}`);
  });
}