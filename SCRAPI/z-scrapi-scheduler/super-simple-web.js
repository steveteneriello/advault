// SCRAPI/z-scrapi-scheduler/super-simple-web.js
// Ultra-minimal web interface for Oxylabs Scheduler with zero dependencies on other modules
const express = require('express');
const path = require('path');
const fs = require('fs');
const SimpleScheduler = require('./simple-scheduler');
require('dotenv').config();

// Create scheduler instance directly
const scheduler = new SimpleScheduler();

// Create Express app
const app = express();
const PORT = process.env.SCHEDULER_PORT || 3030;

// Set up middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Create base directory structure
const publicDir = path.join(__dirname, 'public');
const cssDir = path.join(publicDir, 'css');
const jsDir = path.join(publicDir, 'js');

if (!fs.existsSync(publicDir)) fs.mkdirSync(publicDir, { recursive: true });
if (!fs.existsSync(cssDir)) fs.mkdirSync(cssDir, { recursive: true });
if (!fs.existsSync(jsDir)) fs.mkdirSync(jsDir, { recursive: true });

// Create CSS file if it doesn't exist
const cssPath = path.join(cssDir, 'styles.css');
if (!fs.existsSync(cssPath)) {
  const cssContent = `/* SCRAPI Scheduler Styles */

:root {
  --primary-color: #2c3e50;
  --secondary-color: #3498db;
  --accent-color: #e74c3c;
  --text-color: #333;
  --light-bg: #f5f5f5;
  --card-bg: #fff;
  --border-color: #ddd;
}

* {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

body {
  font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
  line-height: 1.6;
  color: var(--text-color);
  background-color: var(--light-bg);
}

.container {
  width: 90%;
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 15px;
}

header {
  background-color: var(--primary-color);
  color: #fff;
  padding: 1rem 0;
}

header h1 {
  display: inline-block;
  margin-right: 2rem;
}

nav {
  display: inline-block;
}

nav ul {
  list-style: none;
  display: flex;
}

nav ul li {
  margin-right: 1rem;
}

nav ul li a {
  color: #fff;
  text-decoration: none;
  padding: 0.5rem;
}

nav ul li a:hover {
  color: var(--secondary-color);
}

main {
  padding: 2rem 0;
}

h2 {
  margin-bottom: 1.5rem;
  color: var(--primary-color);
}

.card {
  background-color: var(--card-bg);
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  padding: 1.5rem;
  margin-bottom: 1.5rem;
}

.card h3 {
  border-bottom: 1px solid var(--border-color);
  padding-bottom: 0.5rem;
  margin-bottom: 1rem;
  color: var(--primary-color);
}

.grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 1.5rem;
}

.stat-card {
  background-color: var(--card-bg);
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  padding: 1.5rem;
  text-align: center;
}

.stat-card h3 {
  font-size: 1rem;
  color: var(--text-color);
  margin-bottom: 0.5rem;
}

.stat-card .stat-value {
  font-size: 2rem;
  font-weight: bold;
  color: var(--secondary-color);
}

.btn {
  display: inline-block;
  background-color: var(--secondary-color);
  color: #fff;
  padding: 0.5rem 1rem;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  text-decoration: none;
  font-size: 0.9rem;
  margin-right: 0.5rem;
}

.btn-primary {
  background-color: var(--secondary-color);
}

.btn-secondary {
  background-color: #6c757d;
}

.btn-danger {
  background-color: var(--accent-color);
}

.btn-success {
  background-color: #28a745;
}

.btn:hover {
  opacity: 0.9;
}

table {
  width: 100%;
  border-collapse: collapse;
  margin-bottom: 1.5rem;
}

table th,
table td {
  padding: 0.75rem;
  text-align: left;
  border-bottom: 1px solid var(--border-color);
}

table th {
  background-color: var(--light-bg);
  font-weight: bold;
}

form .form-group {
  margin-bottom: 1rem;
}

form label {
  display: block;
  margin-bottom: 0.5rem;
  font-weight: bold;
}

form input[type="text"],
form input[type="number"],
form select,
form textarea {
  width: 100%;
  padding: 0.5rem;
  border: 1px solid var(--border-color);
  border-radius: 4px;
  font-size: 1rem;
}

form textarea {
  min-height: 150px;
}

.alert {
  padding: 1rem;
  border-radius: 4px;
  margin-bottom: 1rem;
}

.alert-success {
  background-color: #d4edda;
  color: #155724;
}

.alert-danger {
  background-color: #f8d7da;
  color: #721c24;
}

.alert-warning {
  background-color: #fff3cd;
  color: #856404;
}

.badge {
  display: inline-block;
  padding: 0.25rem 0.5rem;
  border-radius: 50px;
  font-size: 0.75rem;
  font-weight: bold;
}

.badge-active {
  background-color: #28a745;
  color: white;
}

.badge-inactive {
  background-color: #6c757d;
  color: white;
}

.badge-error {
  background-color: var(--accent-color);
  color: white;
}

footer {
  background-color: var(--primary-color);
  color: #fff;
  padding: 1rem 0;
  margin-top: 2rem;
}

/* Loading spinner */
.spinner {
  border: 4px solid rgba(0, 0, 0, 0.1);
  border-left: 4px solid var(--secondary-color);
  border-radius: 50%;
  width: 30px;
  height: 30px;
  animation: spin 1s linear infinite;
  margin: 20px auto;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

/* Responsive */
@media (max-width: 768px) {
  .grid {
    grid-template-columns: 1fr;
  }
  
  nav ul {
    flex-direction: column;
  }
  
  nav ul li {
    margin-bottom: 0.5rem;
  }
}`;
  
  fs.writeFileSync(cssPath, cssContent);
  console.log(`Created CSS file: ${cssPath}`);
}

// Create JavaScript file if it doesn't exist
const jsPath = path.join(jsDir, 'main.js');
if (!fs.existsSync(jsPath)) {
  const jsContent = `// SCRAPI Scheduler Main JavaScript

// Helper function to format dates
function formatDate(dateString) {
  if (!dateString) return 'N/A';
  
  const date = new Date(dateString);
  return date.toLocaleString();
}

// Document ready function
document.addEventListener('DOMContentLoaded', function() {
  // Add event listeners for any collapsible elements
  const collapsibles = document.querySelectorAll('.collapsible');
  
  collapsibles.forEach(item => {
    const header = item.querySelector('.collapsible-header');
    
    if (header) {
      header.addEventListener('click', () => {
        item.classList.toggle('active');
      });
    }
  });
  
  // Handle any form submissions with AJAX
  const ajaxForms = document.querySelectorAll('form.ajax-form');
  
  ajaxForms.forEach(form => {
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      
      const formData = new FormData(form);
      const data = {};
      
      formData.forEach((value, key) => {
        data[key] = value;
      });
      
      // Show loading spinner
      const spinner = form.querySelector('.spinner');
      if (spinner) spinner.style.display = 'block';
      
      // Disable submit button
      const submitBtn = form.querySelector('button[type="submit"]');
      if (submitBtn) submitBtn.disabled = true;
      
      fetch(form.action, {
        method: form.method,
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(data)
      })
      .then(response => response.json())
      .then(result => {
        // Hide spinner
        if (spinner) spinner.style.display = 'none';
        
        // Show result message
        const resultElement = document.getElementById(form.dataset.result);
        if (resultElement) {
          resultElement.textContent = result.success 
            ? result.message || 'Success!' 
            : result.error || 'An error occurred';
          
          resultElement.className = result.success 
            ? 'alert alert-success' 
            : 'alert alert-danger';
          
          resultElement.style.display = 'block';
          
          // Auto-hide after 5 seconds
          setTimeout(() => {
            resultElement.style.display = 'none';
          }, 5000);
        }
        
        // Enable submit button
        if (submitBtn) submitBtn.disabled = false;
        
        // If we need to refresh after submission
        if (result.success && form.dataset.refresh === 'true') {
          window.location.reload();
        }
      })
      .catch(error => {
        console.error('Error:', error);
        
        // Hide spinner
        if (spinner) spinner.style.display = 'none';
        
        // Enable submit button
        if (submitBtn) submitBtn.disabled = false;
        
        // Show error message
        const resultElement = document.getElementById(form.dataset.result);
        if (resultElement) {
          resultElement.textContent = 'A network error occurred';
          resultElement.className = 'alert alert-danger';
          resultElement.style.display = 'block';
        }
      });
    });
  });
});

// Function to toggle visibility of an element
function toggleVisibility(elementId) {
  const element = document.getElementById(elementId);
  if (element) {
    element.style.display = element.style.display === 'none' ? 'block' : 'none';
  }
}

// Function to toggle schedule state
function toggleScheduleState(scheduleId, active) {
  if (!confirm('Are you sure you want to ' + (active ? 'activate' : 'deactivate') + ' this schedule?')) {
    return;
  }
  
  fetch('/api/schedules/' + scheduleId + '/state', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ active })
  })
  .then(response => response.json())
  .then(result => {
    const resultElement = document.getElementById('result-message');
    
    if (resultElement) {
      resultElement.textContent = result.success 
        ? 'Schedule ' + (active ? 'activated' : 'deactivated') + ' successfully!' 
        : result.error || 'An error occurred';
      
      resultElement.className = result.success 
        ? 'alert alert-success' 
        : 'alert alert-danger';
      
      resultElement.style.display = 'block';
      
      if (result.success) {
        setTimeout(() => {
          window.location.reload();
        }, 1500);
      }
    }
  })
  .catch(error => {
    console.error('Error:', error);
    
    const resultElement = document.getElementById('result-message');
    
    if (resultElement) {
      resultElement.textContent = 'A network error occurred';
      resultElement.className = 'alert alert-danger';
      resultElement.style.display = 'block';
    }
  });
}`;
  
  fs.writeFileSync(jsPath, jsContent);
  console.log(`Created JavaScript file: ${jsPath}`);
}

// Serve static files
app.use('/static', express.static(publicDir));

// HTML layout template
const layoutTemplate = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>{{title}} - SCRAPI Scheduler</title>
  <link rel="stylesheet" href="/static/css/styles.css">
</head>
<body>
  <header>
    <div class="container">
      <h1>SCRAPI Scheduler</h1>
      <nav>
        <ul>
          <li><a href="/">Dashboard</a></li>
          <li><a href="/schedules">Schedules</a></li>
          <li><a href="/settings">Settings</a></li>
        </ul>
      </nav>
    </div>
  </header>
  
  <main class="container">
    <h2>{{title}}</h2>
    {{content}}
  </main>
  
  <footer>
    <div class="container">
      <p>&copy; 2025 SCRAPI Scheduler System</p>
    </div>
  </footer>
  
  <script src="/static/js/main.js"></script>
  {{extraScripts}}
</body>
</html>`;

// Simple template engine
function renderTemplate(template, data = {}) {
  let result = template;
  
  // Replace variables
  Object.keys(data).forEach(key => {
    const regex = new RegExp(`{{${key}}}`, 'g');
    result = result.replace(regex, data[key] || '');
  });
  
  return result;
}

// Dashboard route
app.get('/', async (req, res) => {
  try {
    // Get all schedules
    const schedulesResult = await scheduler.getAllSchedules();
    const scheduleIds = schedulesResult.success ? schedulesResult.schedules : [];
    
    // Get schedule details one by one
    const schedules = [];
    let activeCount = 0;
    
    for (const id of scheduleIds) {
      const infoResult = await scheduler.getScheduleInfo(id);
      if (infoResult.success) {
        schedules.push({
          id,
          ...infoResult.details
        });
        
        if (infoResult.details.active) {
          activeCount++;
        }
      }
    }
    
    // Prepare schedule rows
    let scheduleRows = '';
    
    // Take only first 5 schedules
    const recentSchedules = schedules.slice(0, 5);
    
    recentSchedules.forEach(schedule => {
      const statusBadge = schedule.active 
        ? '<span class="badge badge-active">Active</span>' 
        : '<span class="badge badge-inactive">Inactive</span>';
      
      scheduleRows += `
        <tr>
          <td>${schedule.schedule_id || schedule.id}</td>
          <td>${statusBadge}</td>
          <td>${schedule.items_count}</td>
          <td>${schedule.next_run_at || 'N/A'}</td>
          <td>
            <a href="/schedules/${schedule.schedule_id || schedule.id}" class="btn btn-primary">View</a>
          </td>
        </tr>
      `;
    });
    
    if (scheduleRows === '') {
      scheduleRows = '<tr><td colspan="5">No schedules found</td></tr>';
    }
    
    // Dashboard content
    const content = `
    <div class="dashboard">
      <div class="grid">
        <div class="stat-card">
          <h3>Active Schedules</h3>
          <div class="stat-value">${activeCount}</div>
        </div>
        <div class="stat-card">
          <h3>Total Schedules</h3>
          <div class="stat-value">${schedules.length}</div>
        </div>
      </div>
      
      <div class="card">
        <h3>Recent Schedules</h3>
        <table>
          <thead>
            <tr>
              <th>ID</th>
              <th>Status</th>
              <th>Items</th>
              <th>Next Run</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            ${scheduleRows}
          </tbody>
        </table>
        <a href="/schedules" class="btn btn-primary">View All Schedules</a>
      </div>
    </div>
    `;
    
    // Render using our simple template engine
    const html = renderTemplate(layoutTemplate, {
      title: 'Dashboard',
      content,
      extraScripts: ''
    });
    
    res.send(html);
  } catch (error) {
    console.error('Error rendering dashboard:', error);
    res.status(500).send('Internal server error');
  }
});

// Schedules route
app.get('/schedules', async (req, res) => {
  try {
    // Get all schedules
    const schedulesResult = await scheduler.getAllSchedules();
    const scheduleIds = schedulesResult.success ? schedulesResult.schedules : [];
    
    // Get schedule details one by one
    const schedules = [];
    
    for (const id of scheduleIds) {
      const infoResult = await scheduler.getScheduleInfo(id);
      if (infoResult.success) {
        schedules.push({
          id,
          ...infoResult.details
        });
      }
    }
    
    // Prepare schedule rows
    let scheduleRows = '';
    
    schedules.forEach(schedule => {
      const statusBadge = schedule.active 
        ? '<span class="badge badge-active">Active</span>' 
        : '<span class="badge badge-inactive">Inactive</span>';
      
      scheduleRows += `
        <tr>
          <td>${schedule.schedule_id || schedule.id}</td>
          <td>${statusBadge}</td>
          <td>${schedule.items_count}</td>
          <td>${schedule.cron}</td>
          <td>${schedule.next_run_at || 'N/A'}</td>
          <td>${schedule.end_time || 'N/A'}</td>
          <td>
            <a href="/schedules/${schedule.schedule_id || schedule.id}" class="btn btn-primary">View</a>
            <button class="btn ${schedule.active ? 'btn-danger' : 'btn-success'}" 
              onclick="toggleScheduleState('${schedule.schedule_id || schedule.id}', ${!schedule.active})">
              ${schedule.active ? 'Deactivate' : 'Activate'}
            </button>
          </td>
        </tr>
      `;
    });
    
    if (scheduleRows === '') {
      scheduleRows = '<tr><td colspan="7">No schedules found</td></tr>';
    }
    
    // Schedules content
    const content = `
    <div class="schedules">
      <div id="result-message" style="display: none;" class="alert"></div>
      
      <div class="card">
        <table>
          <thead>
            <tr>
              <th>ID</th>
              <th>Status</th>
              <th>Items</th>
              <th>Cron</th>
              <th>Next Run</th>
              <th>End Time</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            ${scheduleRows}
          </tbody>
        </table>
      </div>
    </div>
    `;
    
    // Render using our simple template engine
    const html = renderTemplate(layoutTemplate, {
      title: 'All Schedules',
      content,
      extraScripts: ''
    });
    
    res.send(html);
  } catch (error) {
    console.error('Error rendering schedules:', error);
    res.status(500).send('Internal server error');
  }
});

// Individual schedule view
app.get('/schedules/:id', async (req, res) => {
  try {
    const scheduleId = req.params.id;
    
    // Get schedule info from Oxylabs
    const infoResult = await scheduler.getScheduleInfo(scheduleId);
    
    if (!infoResult.success) {
      return res.status(404).send('Schedule not found');
    }
    
    const scheduleInfo = infoResult.details;
    
    // Get runs for this schedule
    const runsResult = await scheduler.getScheduleRuns(scheduleId);
    const runs = runsResult.success ? runsResult.runs : [];
    
    // Format runs table
    let runsTable = '';
    
    if (runs.length > 0) {
      runsTable = `
      <table>
        <thead>
          <tr>
            <th>Run ID</th>
            <th>Jobs</th>
            <th>Success Rate</th>
          </tr>
        </thead>
        <tbody>
      `;
      
      runs.forEach(run => {
        runsTable += `
          <tr>
            <td>${run.run_id}</td>
            <td>${run.jobs?.length || 0}</td>
            <td>${Math.round((run.success_rate || 0) * 100)}%</td>
          </tr>
        `;
      });
      
      runsTable += `
        </tbody>
      </table>
      `;
    } else {
      runsTable = '<p>No runs found for this schedule</p>';
    }
    
    // Schedule content
    const content = `
    <div class="schedule-details">
      <div id="result-message" style="display: none;" class="alert"></div>
      
      <div class="actions">
        <a href="/schedules" class="btn btn-secondary">Back to Schedules</a>
        <button class="btn ${scheduleInfo.active ? 'btn-danger' : 'btn-success'}" 
          onclick="toggleScheduleState('${scheduleId}', ${!scheduleInfo.active})">
          ${scheduleInfo.active ? 'Deactivate' : 'Activate'}
        </button>
      </div>
      
      <div class="card">
        <h3>Schedule Info</h3>
        <table>
          <tr>
            <th>ID</th>
            <td>${scheduleId}</td>
          </tr>
          <tr>
            <th>Status</th>
            <td>${scheduleInfo.active ? 'Active' : 'Inactive'}</td>
          </tr>
          <tr>
            <th>Items Count</th>
            <td>${scheduleInfo.items_count}</td>
          </tr>
          <tr>
            <th>Cron Expression</th>
            <td>${scheduleInfo.cron}</td>
          </tr>
          <tr>
            <th>End Time</th>
            <td>${scheduleInfo.end_time}</td>
          </tr>
          <tr>
            <th>Next Run</th>
            <td>${scheduleInfo.next_run_at || 'N/A'}</td>
          </tr>
        </table>
      </div>
      
      <div class="card">
        <h3>Runs (${runs.length})</h3>
        ${runsTable}
      </div>
    </div>
    `;
    
    // Render using our simple template engine
    const html = renderTemplate(layoutTemplate, {
      title: `Schedule: ${scheduleId}`,
      content,
      extraScripts: ''
    });
    
    res.send(html);
  } catch (error) {
    console.error('Error rendering schedule details:', error);
    res.status(500).send('Internal server error');
  }
});

// Settings route
app.get('/settings', async (req, res) => {
  try {
    // Settings content
    const content = `
    <div class="settings">
      <div id="result-message" style="display: none;" class="alert"></div>
      
      <div class="card">
        <h3>Oxylabs API Connection</h3>
        <p>Username: ${process.env.OXYLABS_USERNAME ? '✅ Set' : '❌ Not set'}</p>
        <p>Password: ${process.env.OXYLABS_PASSWORD ? '✅ Set' : '❌ Not set'}</p>
        <p class="mt-md">To configure credentials, set the following in your .env file:</p>
        <pre>
OXYLABS_USERNAME=your_username
OXYLABS_PASSWORD=your_password</pre>
      </div>
    </div>
    `;
    
    // Render using our simple template engine
    const html = renderTemplate(layoutTemplate, {
      title: 'Settings',
      content,
      extraScripts: ''
    });
    
    res.send(html);
  } catch (error) {
    console.error('Error rendering settings:', error);
    res.status(500).send('Internal server error');
  }
});

// API routes
// Toggle schedule state
app.post('/api/schedules/:id/state', async (req, res) => {
  try {
    const scheduleId = req.params.id;
    const active = req.body.active === true;
    
    // Set schedule state
    const result = await scheduler.setScheduleState(scheduleId, active);
    
    res.json(result);
  } catch (error) {
    console.error('Error setting schedule state:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// Start the server
app.listen(PORT, () => {
  console.log(`🚀 SCRAPI Scheduler Web Interface listening on port ${PORT}`);
  console.log(`Open http://localhost:${PORT} in your browser`);
});