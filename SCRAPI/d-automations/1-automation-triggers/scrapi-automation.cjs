// ScrapiAutomation.js - Automates running advault and serp commands sequentially
const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');
const { validateSupabaseConfig, getSupabaseConfig } = require('../../utils/validateSupabaseConfig.cjs');
const { validateOxylabsConfig, getOxylabsConfig } = require('../../utils/validateOxylabsConfig.cjs');
require('dotenv').config();

// Create logs directory if it doesn't exist
const logsDir = path.join(process.cwd(), 'SCRAPI', 'output-staging', 'logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

// Log file path
const logFile = path.join(logsDir, `scrapi-${new Date().toISOString().replace(/[:.]/g, '-')}.log`);

// Function to log messages to both console and file
function log(message) {
  const timestamp = new Date().toISOString();
  const logMessage = `[${timestamp}] ${message}`;
  
  console.log(logMessage);
  fs.appendFileSync(logFile, logMessage + '\n');
}

// Validate Supabase configuration before proceeding
const supabaseValidation = validateSupabaseConfig();
if (!supabaseValidation.isValid) {
  log('❌ Invalid Supabase configuration:');
  supabaseValidation.errors.forEach(error => log(`- ${error}`));
  process.exit(1);
}

// Validate Oxylabs configuration before proceeding
const oxylabsValidation = validateOxylabsConfig();
if (!oxylabsValidation.isValid) {
  log('❌ Invalid Oxylabs configuration:');
  oxylabsValidation.errors.forEach(error => log(`- ${error}`));
  process.exit(1);
}

// Function to run a command and return a promise
function runCommand(command, args) {
  return new Promise((resolve, reject) => {
    log(`Running command: ${command} ${args.join(' ')}`);
    
    // Create environment variables object with all current env vars
    const env = { ...process.env };
    
    // Explicitly add Supabase and Oxylabs credentials to ensure they're passed to child processes
    const supabaseConfig = getSupabaseConfig();
    const oxylabsConfig = getOxylabsConfig();
    
    env.SUPABASE_URL = supabaseConfig.url;
    env.VITE_SUPABASE_URL = supabaseConfig.url;
    env.SUPABASE_ANON_KEY = supabaseConfig.anonKey;
    env.VITE_SUPABASE_ANON_KEY = supabaseConfig.anonKey;
    env.SUPABASE_SERVICE_ROLE_KEY = supabaseConfig.serviceRoleKey;
    
    env.OXYLABS_USERNAME = oxylabsConfig.username;
    env.OXYLABS_PASSWORD = oxylabsConfig.password;
    
    const childProcess = spawn(command, args, { 
      stdio: 'inherit',
      env: env
    });
    
    childProcess.on('close', (code) => {
      if (code === 0) {
        log(`Command completed successfully: ${command} ${args.join(' ')}`);
        resolve();
      } else {
        const errorMessage = `Command failed with code ${code}: ${command} ${args.join(' ')}`;
        log(errorMessage);
        reject(new Error(errorMessage));
      }
    });
    
    childProcess.on('error', (err) => {
      const errorMessage = `Error running command: ${err.message}`;
      log(errorMessage);
      reject(new Error(errorMessage));
    });
  });
}

// Main function to run the automation
async function runAutomation() {
  try {
    // Handle arguments properly
    const args = process.argv.slice(2);
    let query, location;
    
    if (args.length === 0) {
      log('❌ Error: Not enough arguments provided');
      log('Usage: node SCRAPI/d-automations/1-automation-triggers/scrapi-automation.js "query" "city, state, country"');
      log('Example: node SCRAPI/d-automations/1-automation-triggers/scrapi-automation.js "disaster restoration" "Phoenix, Arizona, United States"');
      process.exit(1);
    } else if (args.length === 1) {
      // Only one argument provided, assume it's the query and use default location
      query = args[0];
      location = "Boston, Massachusetts, United States";
      log('⚠️ Warning: No location provided, using default: "Boston, Massachusetts, United States"');
    } else if (args.length === 2) {
      // Two arguments provided, use them as query and location
      query = args[0];
      location = args[1];
    } else {
      // More than two arguments, assume first is query and rest is location
      query = args[0];
      location = args.slice(1).join(' ');
    }
    
    // Remove quotes if they exist
    query = query.replace(/^"|"$/g, '');
    location = location.replace(/^"|"$/g, '');
    
    log('🚀 Starting Scrapi Automation');
    log(`Query: "${query}"`);
    log(`Location: "${location}"`);
    
    // Step 1: Run advault command - using direct path to the script
    log('\n📊 Step 1: Running advault command...');
    await runCommand('node', [
      'SCRAPI/d-automations/2-advault-process/a-advault-automation-master.cjs',
      query,
      location
    ]);
    
    // Step 2: Wait for 15 seconds
    log('\n⏳ Step 2: Waiting for 15 seconds...');
    await new Promise(resolve => setTimeout(resolve, 15000));
    
    // Step 3: Run serp command
    log('\n🔍 Step 3: Running serp command...');
    await runCommand('node', [
      'SCRAPI/d-automations/3-serp-runner/automate-serp.js',
      query,
      location
    ]);
    
    log('\n✅ Scrapi Automation completed successfully');
  } catch (error) {
    log(`\n❌ Automation failed: ${error.message}`);
    process.exit(1);
  }
}

// Run the automation if this file is executed directly
if (require.main === module) {
  runAutomation().catch(error => {
    log(`❌ Fatal error: ${error.message}`);
    process.exit(1);
  });
}

module.exports = { runAutomation };