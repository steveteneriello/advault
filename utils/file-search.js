const fs = require('fs');
const path = require('path');

/**
 * Recursively search for files containing a specific pattern
 * @param {string} dir - Directory to search in
 * @param {string} pattern - Pattern to search for
 * @param {string[]} extensions - File extensions to include (optional)
 * @returns {string[]} - Array of file paths containing the pattern
 */
function searchFilesForPattern(dir, pattern, extensions = []) {
  const results = [];
  
  function searchDirectory(currentDir) {
    try {
      const items = fs.readdirSync(currentDir);
      
      for (const item of items) {
        const fullPath = path.join(currentDir, item);
        const stat = fs.statSync(fullPath);
        
        if (stat.isDirectory()) {
          // Skip node_modules and other common directories to avoid
          if (!item.startsWith('.') && item !== 'node_modules') {
            searchDirectory(fullPath);
          }
        } else if (stat.isFile()) {
          // Check if file has the right extension (if specified)
          if (extensions.length > 0) {
            const ext = path.extname(fullPath);
            if (!extensions.includes(ext)) {
              continue;
            }
          }
          
          try {
            const content = fs.readFileSync(fullPath, 'utf8');
            if (content.includes(pattern)) {
              results.push(fullPath);
            }
          } catch (err) {
            // Skip files that can't be read (binary files, etc.)
            console.warn(`Could not read file: ${fullPath}`);
          }
        }
      }
    } catch (err) {
      console.warn(`Could not access directory: ${currentDir}`);
    }
  }
  
  searchDirectory(dir);
  return results;
}

/**
 * Search for files by name pattern
 * @param {string} dir - Directory to search in
 * @param {string} namePattern - Name pattern to match
 * @returns {string[]} - Array of matching file paths
 */
function searchFilesByName(dir, namePattern) {
  const results = [];
  
  function searchDirectory(currentDir) {
    try {
      const items = fs.readdirSync(currentDir);
      
      for (const item of items) {
        const fullPath = path.join(currentDir, item);
        const stat = fs.statSync(fullPath);
        
        if (stat.isDirectory()) {
          if (!item.startsWith('.') && item !== 'node_modules') {
            searchDirectory(fullPath);
          }
        } else if (stat.isFile()) {
          if (item.includes(namePattern)) {
            results.push(fullPath);
          }
        }
      }
    } catch (err) {
      console.warn(`Could not access directory: ${currentDir}`);
    }
  }
  
  searchDirectory(dir);
  return results;
}

// Command line interface
if (require.main === module) {
  const args = process.argv.slice(2);
  
  if (args.length < 2) {
    console.log('Usage:');
    console.log('  node file-search.js pattern <search-term> [extensions...]');
    console.log('  node file-search.js name <name-pattern>');
    console.log('');
    console.log('Examples:');
    console.log('  node file-search.js pattern "checkHealth" .ts .tsx');
    console.log('  node file-search.js pattern "AdFinder" .ts .tsx');
    console.log('  node file-search.js name "AdFinder"');
    process.exit(1);
  }
  
  const command = args[0];
  const searchTerm = args[1];
  const extensions = args.slice(2);
  
  let results = [];
  
  if (command === 'pattern') {
    results = searchFilesForPattern('.', searchTerm, extensions);
    console.log(`Files containing "${searchTerm}":`);
  } else if (command === 'name') {
    results = searchFilesByName('.', searchTerm);
    console.log(`Files with name containing "${searchTerm}":`);
  } else {
    console.error('Invalid command. Use "pattern" or "name"');
    process.exit(1);
  }
  
  if (results.length === 0) {
    console.log('No files found.');
  } else {
    results.forEach(file => console.log(file));
  }
}

module.exports = {
  searchFilesForPattern,
  searchFilesByName
};