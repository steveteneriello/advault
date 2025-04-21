// Main entry point for the application
console.log(`
╔════════════════════════════════════════════════════════╗
║                                                        ║
║   Ad Data Collection and Processing System             ║
║                                                        ║
║   Available commands:                                  ║
║                                                        ║
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

console.log('To start collecting data with HTML rendering, run:');
console.log('  npm run collect:html "your search query" "location"');
console.log('\nTo view HTML renderings, run:');
console.log('  npm run view:html-renderings');
console.log('\nTo run SCRAPI automation, run:');
console.log('  npm run scrapi "your search query" "location"');
console.log('\nTo organize output files into output-staging folder, run:');
console.log('  npm run organize:output');