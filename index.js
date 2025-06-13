// Main entry point for the application
const express = require('express');
const path = require('path');
const fs = require('fs');

// Create Express app
const app = express();
const PORT = process.env.PORT || 3000;

// Check if we're in a production environment
const isProduction = process.env.NODE_ENV === 'production';

// Serve static files from the SERP dashboard build directory if it exists
const serpDashboardPath = path.join(__dirname, 'apps/serp-dashboard/dist');
if (fs.existsSync(serpDashboardPath)) {
  console.log('Serving SERP dashboard from:', serpDashboardPath);
  app.use(express.static(serpDashboardPath));
  
  // For any routes that don't match API routes, serve the index.html
  app.get('*', (req, res) => {
    if (!req.path.startsWith('/api/')) {
      res.sendFile(path.join(serpDashboardPath, 'index.html'));
    }
  });
}

// Check if the SCRAPI API server exists
const scrapiApiPath = path.join(__dirname, 'server/api/scrapi/index.js');
if (fs.existsSync(scrapiApiPath)) {
  console.log('Loading SCRAPI API from:', scrapiApiPath);
  try {
    const scrapiApi = require(scrapiApiPath);
    // If scrapiApi is an Express app, use it as middleware
    if (typeof scrapiApi === 'function' && scrapiApi.listen) {
      app.use('/api', (req, res, next) => {
        // Remove /api prefix from the path
        req.url = req.url.replace(/^\/api/, '');
        return scrapiApi(req, res, next);
      });
    }
  } catch (error) {
    console.error('Error loading SCRAPI API:', error);
  }
} else {
  console.log('SCRAPI API not found at:', scrapiApiPath);
  
  // Create a simple API endpoint for health checks
  app.get('/api/health', (req, res) => {
    res.json({ status: 'healthy', timestamp: new Date().toISOString() });
  });
}

// Start the server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`http://localhost:${PORT}`);
  
  // Display available routes
  console.log('\nAvailable routes:');
  console.log('- / (SERP Dashboard)');
  console.log('- /api/health (Health check)');
  
  // Display SCRAPI CLI commands if available
  if (fs.existsSync(path.join(__dirname, 'SCRAPI'))) {
    console.log('\nSCRAPI Commands:');
    console.log('- npm run scrapi "query" "location" (Run single query)');
    console.log('- npm run batch (Run batch processing)');
    console.log('- npm run monitor (View job status)');
  }
});