#!/usr/bin/env node
// filepath: /workspaces/advault/SCRAPI/demo.cjs

const { ConsoleColors } = require('./utils/console-colors.cjs');

console.log(`
${ConsoleColors.BOLD}🚀 SCRAPI System Demo${ConsoleColors.RESET}
${ConsoleColors.CYAN}=================================${ConsoleColors.RESET}

Welcome to SCRAPI! This demo will show you the key features of the system.

${ConsoleColors.YELLOW}What SCRAPI does:${ConsoleColors.RESET}
✅ Searches Google for businesses (e.g., "restaurants near me")
✅ Extracts business URLs and contact information  
✅ Scrapes individual business websites for detailed data
✅ Stores everything in a Supabase database
✅ Generates organized files for easy access

${ConsoleColors.BOLD}Demo Options:${ConsoleColors.RESET}
`);

const readline = require('readline');
const { exec } = require('child_process');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function runCommand(command, description) {
  return new Promise((resolve, reject) => {
    console.log(`\n${ConsoleColors.BLUE}${description}${ConsoleColors.RESET}`);
    console.log(`${ConsoleColors.DIM}Running: ${command}${ConsoleColors.RESET}\n`);
    
    const process = exec(command, { cwd: __dirname });
    
    process.stdout.on('data', (data) => {
      console.log(data.toString());
    });
    
    process.stderr.on('data', (data) => {
      console.error(data.toString());
    });
    
    process.on('close', (code) => {
      if (code === 0) {
        console.log(`\n${ConsoleColors.GREEN}✅ ${description} completed successfully!${ConsoleColors.RESET}\n`);
        resolve();
      } else {
        console.log(`\n${ConsoleColors.RED}❌ ${description} failed with code ${code}${ConsoleColors.RESET}\n`);
        reject(new Error(`Command failed with code ${code}`));
      }
    });
  });
}

async function showMainMenu() {
  console.log(`
${ConsoleColors.BOLD}Choose a demo:${ConsoleColors.RESET}

1️⃣  Quick System Test (30 seconds)
    - Validates configuration
    - Runs a simple test query
    - Shows system is working

2️⃣  Real Business Search (2-3 minutes)
    - Search for actual businesses
    - See complete data extraction
    - Review saved results

3️⃣  Batch Processing Demo (5-10 minutes)
    - Process multiple queries at once
    - Monitor batch progress
    - Generate summary report

4️⃣  System Status & Monitoring
    - Check system health
    - View recent jobs
    - Show performance metrics

5️⃣  View Documentation
    - Open comprehensive usage guide
    - Show available commands
    - Display API reference

0️⃣  Exit Demo

${ConsoleColors.YELLOW}Enter your choice (1-5, or 0 to exit):${ConsoleColors.RESET} `);

  return new Promise((resolve) => {
    rl.question('', (answer) => {
      resolve(answer.trim());
    });
  });
}

async function quickSystemTest() {
  try {
    await runCommand(
      'node config/validation/supabase-validator.cjs',
      '🔧 Validating Supabase Configuration'
    );
    
    await runCommand(
      'node config/validation/oxylabs-validator.cjs', 
      '🔧 Validating Oxylabs Configuration'
    );
    
    await runCommand(
      'node test-basic-automation.cjs',
      '🧪 Running Basic System Test'
    );
    
    console.log(`
${ConsoleColors.GREEN}🎉 Success! Your SCRAPI system is fully operational.${ConsoleColors.RESET}

${ConsoleColors.BOLD}What just happened:${ConsoleColors.RESET}
✅ Verified API connections (Supabase + Oxylabs)
✅ Tested complete search → scrape → store pipeline
✅ Generated sample data files
✅ Stored results in database

${ConsoleColors.CYAN}Next steps:${ConsoleColors.RESET} Try option 2 for a real business search!
`);
  } catch (error) {
    console.log(`
${ConsoleColors.RED}❌ System test failed. Please check your configuration:${ConsoleColors.RESET}

1. Verify .env files have correct API credentials
2. Check individual components:
   - node config/validation/supabase-validator.cjs
   - node config/validation/oxylabs-validator.cjs
3. Check the troubleshooting section in USAGE-INSTRUCTIONS.md
`);
  }
}

async function realBusinessSearch() {
  console.log(`
${ConsoleColors.BOLD}🏢 Real Business Search Demo${ConsoleColors.RESET}

Let's search for actual businesses in a city of your choice!
`);

  const keyword = await new Promise((resolve) => {
    rl.question(`${ConsoleColors.YELLOW}Enter business type (e.g., 'restaurants', 'dentists', 'plumbers'): ${ConsoleColors.RESET}`, resolve);
  });

  const location = await new Promise((resolve) => {
    rl.question(`${ConsoleColors.YELLOW}Enter city and state (e.g., 'Miami, FL', 'Seattle, WA'): ${ConsoleColors.RESET}`, resolve);
  });

  try {
    console.log(`\n${ConsoleColors.BLUE}🔍 Searching for "${keyword}" in "${location}"...${ConsoleColors.RESET}`);
    
    const startTime = Date.now();
    await runCommand(
      `node entry-points/single-query/single-query-handler.cjs "${keyword}" "${location}"`,
      `🔍 Searching for ${keyword} in ${location}`
    );
    const endTime = Date.now();
    
    console.log(`
${ConsoleColors.GREEN}🎉 Search completed in ${((endTime - startTime) / 1000).toFixed(1)} seconds!${ConsoleColors.RESET}

${ConsoleColors.BOLD}Results are available in:${ConsoleColors.RESET}
📁 Files: output-staging/jobs/ (latest folder)
🗄️  Database: Check your Supabase dashboard
📊 Logs: output-staging/logs/scrapi.log

${ConsoleColors.CYAN}Want to see the files?${ConsoleColors.RESET}
`);

    const showFiles = await new Promise((resolve) => {
      rl.question('View result files? (y/n): ', resolve);
    });

    if (showFiles.toLowerCase() === 'y') {
      await runCommand(
        'ls -la output-staging/jobs/ | tail -5',
        '📁 Recent Job Folders'
      );
      
      await runCommand(
        'find output-staging/jobs -name "*.json" | tail -1 | xargs head -20',
        '📄 Sample Results Preview'
      );
    }

  } catch (error) {
    console.log(`
${ConsoleColors.RED}❌ Search failed. This might be due to:${ConsoleColors.RESET}
- Invalid location format
- API rate limits
- Network connectivity issues

Try again with a different keyword/location combination.
`);
  }
}

async function batchProcessingDemo() {
  console.log(`
${ConsoleColors.BOLD}📦 Batch Processing Demo${ConsoleColors.RESET}

This will create and process a small batch of searches to demonstrate
how SCRAPI handles multiple queries efficiently.
`);

  const proceed = await new Promise((resolve) => {
    rl.question(`${ConsoleColors.YELLOW}Proceed with batch demo? (y/n): ${ConsoleColors.RESET}`, resolve);
  });

  if (proceed.toLowerCase() !== 'y') {
    return;
  }

  try {
    // Create a demo batch file
    const batchContent = `[
  {"keyword": "coffee shops", "location": "Portland, OR"},
  {"keyword": "bookstores", "location": "Seattle, WA"},
  {"keyword": "pizza places", "location": "Chicago, IL"},
  {"keyword": "gyms", "location": "Denver, CO"},
  {"keyword": "hair salons", "location": "Austin, TX"}
]`;

    require('fs').writeFileSync('demo-batch.json', batchContent);
    
    console.log(`\n${ConsoleColors.BLUE}📝 Created demo batch with 5 searches${ConsoleColors.RESET}`);
    
    await runCommand(
      'cat demo-batch.json',
      '📄 Demo Batch Contents'
    );

    const startTime = Date.now();
    await runCommand(
      'node entry-points/batch-processing/batch-processor.cjs --file demo-batch.json',
      '⚡ Processing Batch'
    );
    const endTime = Date.now();

    console.log(`
${ConsoleColors.GREEN}🎉 Batch processing completed in ${((endTime - startTime) / 1000 / 60).toFixed(1)} minutes!${ConsoleColors.RESET}

${ConsoleColors.BOLD}What happened:${ConsoleColors.RESET}
✅ Processed 5 different searches across 5 cities
✅ Extracted business data for each location
✅ Stored all results in organized folders
✅ Updated database with new business records

${ConsoleColors.CYAN}Check the results:${ConsoleColors.RESET}
📁 Files: output-staging/jobs/
🗄️  Database: Your Supabase dashboard
📊 Logs: output-staging/logs/
`);

    // Cleanup
    require('fs').unlinkSync('demo-batch.json');

  } catch (error) {
    console.log(`
${ConsoleColors.RED}❌ Batch processing failed.${ConsoleColors.RESET}
Check the logs for details: tail -f output-staging/logs/scrapi.log
`);
  }
}

async function systemStatus() {
  try {
    await runCommand(
      'node config/validation/supabase-validator.cjs',
      '🔧 Supabase Configuration Status'
    );

    await runCommand(
      'node config/validation/oxylabs-validator.cjs',
      '🔧 Oxylabs Configuration Status'
    );

    await runCommand(
      'ls -la output-staging/jobs/ | head -10',
      '📁 Recent Jobs'
    );

    await runCommand(
      'find output-staging/logs -name "*.log" -exec tail -5 {} \\; 2>/dev/null || echo "No log files found"',
      '📋 Recent Log Entries'
    );

    await runCommand(
      'df -h .',
      '💾 Disk Space'
    );

    console.log(`
${ConsoleColors.GREEN}📊 System Status Summary:${ConsoleColors.RESET}

${ConsoleColors.BOLD}Available Commands:${ConsoleColors.RESET}
• Basic Test: node test-basic-automation.cjs
• Complete Test: node test-complete-pipeline.cjs
• Monitor Jobs: node monitoring/job-status-dashboard.cjs
• Single Query: node entry-points/single-query/single-query-handler.cjs
• Clean Up: node utils/cleanup/daily-cleanup.cjs

${ConsoleColors.BOLD}Configuration Validation:${ConsoleColors.RESET}
• Supabase: node config/validation/supabase-validator.cjs
• Oxylabs: node config/validation/oxylabs-validator.cjs
• Environment: node config/environment.cjs

${ConsoleColors.BOLD}Monitoring Tools:${ConsoleColors.RESET}
• Job Status: node monitoring/job-status-dashboard.cjs
• Batch Status: node monitoring/batch-status-dashboard.cjs
• View Logs: tail -f output-staging/logs/scrapi.log
`);

  } catch (error) {
    console.log(`${ConsoleColors.RED}❌ Could not retrieve full system status${ConsoleColors.RESET}`);
  }
}

async function viewDocumentation() {
  console.log(`
${ConsoleColors.BOLD}📚 SCRAPI Documentation${ConsoleColors.RESET}

${ConsoleColors.CYAN}Main Documentation Files:${ConsoleColors.RESET}
📖 USAGE-INSTRUCTIONS.md - Complete usage guide
📋 claude/README.md - System overview
🧪 claude/COMPREHENSIVE-TESTING-SUCCESS-REPORT.md - Test results
🔧 claude/MIGRATION-SUMMARY.md - Technical details

${ConsoleColors.CYAN}Quick Reference Commands:${ConsoleColors.RESET}

${ConsoleColors.BOLD}Single Searches:${ConsoleColors.RESET}
node entry-points/single-query/single-query-handler.cjs "keyword" "location"

${ConsoleColors.BOLD}Batch Processing:${ConsoleColors.RESET}
node entry-points/batch-processing/batch-processor.cjs --file queries.json

${ConsoleColors.BOLD}System Health:${ConsoleColors.RESET}
node config/validation/validate-all.cjs
node test-complete-pipeline.cjs

${ConsoleColors.BOLD}Monitoring:${ConsoleColors.RESET}
node monitoring/job-status-dashboard.cjs
tail -f output-staging/logs/scrapi.log

${ConsoleColors.BOLD}Configuration:${ConsoleColors.RESET}
node config/environment.cjs --status
node config/validation/test-connections.cjs

${ConsoleColors.YELLOW}💡 Pro Tip:${ConsoleColors.RESET} Start with single searches, then move to batch processing
when you're comfortable with the system!
`);

  const viewFile = await new Promise((resolve) => {
    rl.question(`${ConsoleColors.YELLOW}View full usage instructions? (y/n): ${ConsoleColors.RESET}`, resolve);
  });

  if (viewFile.toLowerCase() === 'y') {
    await runCommand(
      'head -100 USAGE-INSTRUCTIONS.md',
      '📖 Usage Instructions (First 100 lines)'
    );
  }
}

async function main() {
  console.log(`${ConsoleColors.BOLD}Welcome to the SCRAPI Interactive Demo!${ConsoleColors.RESET}\n`);

  while (true) {
    const choice = await showMainMenu();

    switch (choice) {
      case '1':
        await quickSystemTest();
        break;
      case '2':
        await realBusinessSearch();
        break;
      case '3':
        await batchProcessingDemo();
        break;
      case '4':
        await systemStatus();
        break;
      case '5':
        await viewDocumentation();
        break;
      case '0':
        console.log(`\n${ConsoleColors.GREEN}Thanks for trying SCRAPI! 🚀${ConsoleColors.RESET}`);
        console.log(`${ConsoleColors.CYAN}For more help, check USAGE-INSTRUCTIONS.md${ConsoleColors.RESET}\n`);
        process.exit(0);
        break;
      default:
        console.log(`${ConsoleColors.RED}Invalid choice. Please enter 1-5 or 0 to exit.${ConsoleColors.RESET}`);
    }

    // Wait for user to continue
    await new Promise((resolve) => {
      rl.question(`\n${ConsoleColors.DIM}Press Enter to continue...${ConsoleColors.RESET}`, resolve);
    });
  }
}

// Handle Ctrl+C gracefully
process.on('SIGINT', () => {
  console.log(`\n\n${ConsoleColors.YELLOW}Demo interrupted by user${ConsoleColors.RESET}`);
  console.log(`${ConsoleColors.GREEN}Thanks for trying SCRAPI! 🚀${ConsoleColors.RESET}\n`);
  rl.close();
  process.exit(0);
});

// Start the demo
main().catch((error) => {
  console.error(`${ConsoleColors.RED}Demo error:${ConsoleColors.RESET}`, error.message);
  rl.close();
  process.exit(1);
});
