// Main server entry point
const express = require('express');
const path = require('path');
const fs = require('fs');
const { initializeDatabase } = require('./database');
const { loadConfig, validateConfig } = require('./config/config');
const Logger = require('./utils/logger');

// Create Express app
const app = express();
const PORT = process.env.PORT || 3000;

// Initialize logger
const logger = new Logger('server');

// Load and validate configuration
const config = loadConfig();
const configValidation = validateConfig(config);

if (!configValidation.isValid) {
  logger.error('Invalid configuration:', configValidation.errors);
  process.exit(1);
}

// Initialize database
initializeDatabase()
  .then(initialized => {
    if (!initialized) {
      logger.error('Failed to initialize database');
      process.exit(1);
    }
    
    logger.info('Database initialized successfully');
  })
  .catch(error => {
    logger.error('Error initializing database:', error);
    process.exit(1);
  });

// Serve static files from the SERP dashboard build directory if it exists
const serpDashboardPath = path.join(__dirname, '..', 'apps', 'serp-dashboard', 'dist');
if (fs.existsSync(serpDashboardPath)) {
  logger.info('Serving SERP dashboard from:', serpDashboardPath);
  app.use(express.static(serpDashboardPath));
}

// Check if the SCRAPI API server exists
const scrapiApiPath = path.join(__dirname, 'api', 'scrapi', 'index.js');
if (fs.existsSync(scrapiApiPath)) {
  logger.info('Loading SCRAPI API from:', scrapiApiPath);
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
    logger.error('Error loading SCRAPI API:', error);
  }
} else {
  logger.info('SCRAPI API not found at:', scrapiApiPath);
  
  // Create a simple API endpoint for health checks
  app.get('/api/health', (req, res) => {
    res.json({ status: 'healthy', timestamp: new Date().toISOString() });
  });
}

// For any routes that don't match API routes, serve the index.html
app.get('*', (req, res) => {
  if (!req.path.startsWith('/api/')) {
    if (fs.existsSync(serpDashboardPath)) {
      res.sendFile(path.join(serpDashboardPath, 'index.html'));
    } else {
      res.send('SERP Dashboard not built. Run `npm run build:serp` to build it.');
    }
  }
});

// Start the server
app.listen(PORT, () => {
  logger.info(`Server running on port ${PORT}`);
  logger.info(`http://localhost:${PORT}`);
  
  // Display available routes
  logger.info('Available routes:');
  logger.info('- / (SERP Dashboard)');
  logger.info('- /api/health (Health check)');
  
  // Display SCRAPI CLI commands if available
  if (fs.existsSync(path.join(__dirname, '..', 'SCRAPI'))) {
    logger.info('SCRAPI Commands:');
    logger.info('- npm run scrapi "query" "location" (Run single query)');
    logger.info('- npm run batch (Run batch processing)');
    logger.info('- npm run monitor (View job status)');
  }
});