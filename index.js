// Main entry point for the application

console.log(`
╔════════════════════════════════════════════════════════╗
║                                                        ║
║   SCRAPI - Automated Search & Ad Intelligence Platform ║
║                                                        ║
║   🚀 New Modernized Entry Points Available!           ║
║                                                        ║
║   Run the main CLI for all available commands:        ║
║     node SCRAPI/cli/main-cli.cjs                       ║
║                                                        ║
╚════════════════════════════════════════════════════════╝
`);

console.log('\n📋 Quick Start - New Entry Points:');
console.log('');
console.log('🔍 Single Query:');
console.log('   node SCRAPI/entry-points/single-query/scrapi-automation.cjs "disaster restoration" "Phoenix, AZ, United States"');
console.log('');
console.log('📦 Batch Processing:');
console.log('   node SCRAPI/entry-points/batch-processing/scrapi-batch-automation.cjs');
console.log('');
console.log('📊 Monitor Jobs:');
console.log('   node SCRAPI/entry-points/monitoring/batch-status-dashboard.cjs');
console.log('');
console.log('⏰ Scheduled Jobs:');
console.log('   node SCRAPI/z-scrapi-scheduler/scheduler-cli.js');
console.log('');
console.log('📖 Full Menu:');
console.log('   node SCRAPI/cli/main-cli.cjs');
console.log('');

// Also display the legacy menu for backward compatibility
console.log('\n📋 Legacy Commands (still supported):');
console.log(`
╔════════════════════════════════════════════════════════╗
║   Data Collection:                                     ║
║     npm run collect:ads                                ║
║     npm run collect:html                               ║
║     npm run collect:and-process                        ║
║                                                        ║
║   Data Processing:                                     ║
║     npm run process:stage                              ║
║     npm run process:all                                ║
║     npm run process:png-to-base64                      ║
║                                                        ║
║   Viewing Results:                                     ║
║     npm run view:serps                                 ║
║     npm run view:html-renderings                       ║
║     npm run view:images                                ║
║     npm run view:serp-gallery                          ║
║     npm run view:db                                    ║
║                                                        ║
║   HTML Rendering:                                      ║
║     npm run render:html                                ║
║                                                        ║
║   Reports:                                             ║
║     npm run report:generate                            ║
║                                                        ║
║   SCRAPI Commands:                                     ║
║     npm run scrapi                                     ║
║     npm run scrapi-batch                               ║
║     npm run serp                                       ║
║     npm run keyword:feeder                             ║
║     npm run batch:process                              ║
║                                                        ║
║   File Management:                                     ║
║     npm run organize:output                            ║
║                                                        ║
╚════════════════════════════════════════════════════════╝
`);

console.log('\n💡 Getting Started Tips:');
console.log('');
console.log('🔧 For comprehensive help and all available commands:');
console.log('   node SCRAPI/cli/main-cli.js');
console.log('');
console.log('📖 Legacy commands for backward compatibility:');
console.log('   npm run collect:html "your search query" "location"  # Collect with HTML rendering');
console.log('   npm run view:html-renderings                        # View HTML renderings');
console.log('   npm run scrapi "your search query" "location"       # Run SCRAPI automation');
console.log('   npm run organize:output                             # Organize output files');
console.log('');
console.log('🆕 Try the new modernized entry points for better error handling and logging!');