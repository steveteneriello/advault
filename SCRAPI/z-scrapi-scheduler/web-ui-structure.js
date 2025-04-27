// SCRAPI/z-scrapi-scheduler/web-ui-structure.js
// This file creates the necessary directory structure for the web interface

const fs = require('fs');
const path = require('path');

// Define the base directory
const baseDir = path.join(process.cwd(), 'SCRAPI', 'z-scrapi-scheduler');

// Define the directory structure
const directories = [
  // Views directory
  path.join(baseDir, 'views'),
  
  // Public directory and subdirectories
  path.join(baseDir, 'public'),
  path.join(baseDir, 'public', 'css'),
  path.join(baseDir, 'public', 'js'),
  path.join(baseDir, 'public', 'js', 'components'),
  path.join(baseDir, 'public', 'js', 'utils'),
  
  // View components
  path.join(baseDir, 'views', 'components'),
  path.join(baseDir, 'views', 'layouts'),
  path.join(baseDir, 'views', 'pages')
];

// Create directories if they don't exist
directories.forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
    console.log(`Created directory: ${dir}`);
  }
});

console.log('Web UI directory structure created successfully!');