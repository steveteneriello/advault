// view-file-backups.js - View and manage file backups
const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

// Initialize Supabase client
const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Supabase credentials not found in environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// Directory for restored files
const RESTORED_FILES_DIR = path.join(process.cwd(), 'SCRAPI', 'output-staging', 'restored-files');

// Ensure restored files directory exists
if (!fs.existsSync(RESTORED_FILES_DIR)) {
  fs.mkdirSync(RESTORED_FILES_DIR, { recursive: true });
}

/**
 * Get all file backups
 * @param {number} limit - Maximum number of backups to retrieve
 * @param {number} offset - Offset for pagination
 * @returns {Promise<Object>} - File backups
 */
async function getFileBackups(limit = 100, offset = 0) {
  console.log(`Getting file backups (limit: ${limit}, offset: ${offset})...`);
  
  try {
    const { data, error, count } = await supabase
      .from('file_backups')
      .select('id, file_path, created_at', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);
      
    if (error) {
      console.error('Error getting file backups:', error);
      return {
        success: false,
        error: error.message
      };
    }
    
    console.log(`Found ${data.length} file backups (total: ${count})`);
    
    return {
      success: true,
      data,
      count
    };
  } catch (error) {
    console.error('Error getting file backups:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Get a specific file backup
 * @param {string} id - The backup ID
 * @returns {Promise<Object>} - File backup
 */
async function getFileBackup(id) {
  console.log(`Getting file backup ${id}...`);
  
  try {
    const { data, error } = await supabase
      .from('file_backups')
      .select('*')
      .eq('id', id)
      .single();
      
    if (error) {
      console.error('Error getting file backup:', error);
      return {
        success: false,
        error: error.message
      };
    }
    
    console.log(`Found file backup: ${data.file_path}`);
    
    return {
      success: true,
      data
    };
  } catch (error) {
    console.error('Error getting file backup:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Restore a file backup
 * @param {string} id - The backup ID
 * @returns {Promise<Object>} - Restore result
 */
async function restoreFileBackup(id) {
  console.log(`Restoring file backup ${id}...`);
  
  try {
    // Get the backup
    const { data, error } = await supabase
      .from('file_backups')
      .select('*')
      .eq('id', id)
      .single();
      
    if (error) {
      console.error('Error getting file backup:', error);
      return {
        success: false,
        error: error.message
      };
    }
    
    // Create the restored file
    const fileName = path.basename(data.file_path);
    const restorePath = path.join(RESTORED_FILES_DIR, fileName);
    
    fs.writeFileSync(restorePath, data.content);
    
    console.log(`✅ File restored to ${restorePath}`);
    
    return {
      success: true,
      path: restorePath
    };
  } catch (error) {
    console.error('Error restoring file backup:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Delete a file backup
 * @param {string} id - The backup ID
 * @returns {Promise<Object>} - Delete result
 */
async function deleteFileBackup(id) {
  console.log(`Deleting file backup ${id}...`);
  
  try {
    const { error } = await supabase
      .from('file_backups')
      .delete()
      .eq('id', id);
      
    if (error) {
      console.error('Error deleting file backup:', error);
      return {
        success: false,
        error: error.message
      };
    }
    
    console.log(`✅ File backup ${id} deleted`);
    
    return {
      success: true
    };
  } catch (error) {
    console.error('Error deleting file backup:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Search for file backups
 * @param {string} searchTerm - The search term
 * @returns {Promise<Object>} - Search results
 */
async function searchFileBackups(searchTerm) {
  console.log(`Searching for file backups with term: ${searchTerm}...`);
  
  try {
    const { data, error } = await supabase
      .from('file_backups')
      .select('id, file_path, created_at')
      .ilike('file_path', `%${searchTerm}%`)
      .order('created_at', { ascending: false });
      
    if (error) {
      console.error('Error searching file backups:', error);
      return {
        success: false,
        error: error.message
      };
    }
    
    console.log(`Found ${data.length} matching file backups`);
    
    return {
      success: true,
      data
    };
  } catch (error) {
    console.error('Error searching file backups:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Main function
 */
async function main() {
  console.log('🚀 Starting View File Backups');
  
  // Get command line arguments
  const command = process.argv[2];
  const arg = process.argv[3];
  
  if (!command) {
    // No command provided, show all backups
    const result = await getFileBackups();
    
    if (result.success) {
      console.log('\n📋 File Backups:');
      
      if (result.data.length === 0) {
        console.log('No file backups found');
      } else {
        result.data.forEach((backup, index) => {
          const createdAt = new Date(backup.created_at).toLocaleString();
          console.log(`${index + 1}. ID: ${backup.id}`);
          console.log(`   Path: ${backup.file_path}`);
          console.log(`   Created: ${createdAt}`);
        });
        
        console.log('\nTo view a specific backup:');
        console.log(`node SCRAPI/utils/file-archive-system/view-file-backups.js view ${result.data[0].id}`);
        
        console.log('\nTo restore a backup:');
        console.log(`node SCRAPI/utils/file-archive-system/view-file-backups.js restore ${result.data[0].id}`);
        
        console.log('\nTo search for backups:');
        console.log('node SCRAPI/utils/file-archive-system/view-file-backups.js search <search-term>');
      }
    } else {
      console.error('❌ Error getting file backups:', result.error);
    }
  } else if (command === 'view' && arg) {
    // View a specific backup
    const result = await getFileBackup(arg);
    
    if (result.success) {
      console.log('\n📄 File Backup:');
      console.log(`ID: ${result.data.id}`);
      console.log(`Path: ${result.data.file_path}`);
      console.log(`Created: ${new Date(result.data.created_at).toLocaleString()}`);
      console.log('\nContent:');
      console.log(result.data.content.substring(0, 1000) + (result.data.content.length > 1000 ? '...' : ''));
      
      console.log('\nTo restore this backup:');
      console.log(`node SCRAPI/utils/file-archive-system/view-file-backups.js restore ${result.data.id}`);
    } else {
      console.error('❌ Error getting file backup:', result.error);
    }
  } else if (command === 'restore' && arg) {
    // Restore a backup
    const result = await restoreFileBackup(arg);
    
    if (result.success) {
      console.log(`✅ File restored to ${result.path}`);
    } else {
      console.error('❌ Error restoring file backup:', result.error);
    }
  } else if (command === 'delete' && arg) {
    // Delete a backup
    const result = await deleteFileBackup(arg);
    
    if (result.success) {
      console.log('✅ File backup deleted');
    } else {
      console.error('❌ Error deleting file backup:', result.error);
    }
  } else if (command === 'search' && arg) {
    // Search for backups
    const result = await searchFileBackups(arg);
    
    if (result.success) {
      console.log(`\n📋 Search Results for "${arg}":`);
      
      if (result.data.length === 0) {
        console.log('No matching file backups found');
      } else {
        result.data.forEach((backup, index) => {
          const createdAt = new Date(backup.created_at).toLocaleString();
          console.log(`${index + 1}. ID: ${backup.id}`);
          console.log(`   Path: ${backup.file_path}`);
          console.log(`   Created: ${createdAt}`);
        });
        
        console.log('\nTo view a specific backup:');
        console.log(`node SCRAPI/utils/file-archive-system/view-file-backups.js view ${result.data[0].id}`);
      }
    } else {
      console.error('❌ Error searching file backups:', result.error);
    }
  } else {
    // Invalid command
    console.log('Usage:');
    console.log('node SCRAPI/utils/file-archive-system/view-file-backups.js                  - Show all backups');
    console.log('node SCRAPI/utils/file-archive-system/view-file-backups.js view <id>        - View a specific backup');
    console.log('node SCRAPI/utils/file-archive-system/view-file-backups.js restore <id>     - Restore a backup');
    console.log('node SCRAPI/utils/file-archive-system/view-file-backups.js delete <id>      - Delete a backup');
    console.log('node SCRAPI/utils/file-archive-system/view-file-backups.js search <term>    - Search for backups');
  }
}

// Run the main function if this file is executed directly
if (require.main === module) {
  main().catch(error => {
    console.error('❌ Fatal error:', error);
    process.exit(1);
  });
}

// Export functions for use in other modules
module.exports = {
  getFileBackups,
  getFileBackup,
  restoreFileBackup,
  deleteFileBackup,
  searchFileBackups
};