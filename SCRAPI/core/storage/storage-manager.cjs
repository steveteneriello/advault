// Storage Manager - Handles file uploads to Supabase Storage and other storage backends
const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

// Import new centralized systems
const { validateAllConfigs, getOxylabsConfig, getSupabaseConfig } = require('../../config/environment.cjs');
const { Logger } = require('../../utils/logging/logger.cjs');
const { handleError, RetryableError } = require('../../utils/error-handling/error-handlers.cjs');

class StorageManager {
  constructor() {
    const validation = validateAllConfigs();
    if (!validation.isValid) {
      throw new Error(`Configuration validation failed: ${validation.errors.join(", ")}`);
    }
    this.config = {
      oxylabs: getOxylabsConfig(),
      supabase: getSupabaseConfig()
    };
    this.logger = new Logger('StorageManager');
    
    // Initialize Supabase clients
    this.supabase = createClient(this.config.supabase.url, this.config.supabase.anonKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false
      },
      global: {
        headers: { 'x-client-info': 'supabase-js/2.39.7' }
      },
      realtime: {
        timeout: 60000
      }
    });

    this.supabaseAdmin = this.config.supabase.serviceRoleKey ? 
      createClient(this.config.supabase.url, this.config.supabase.serviceRoleKey, {
        auth: {
          persistSession: false,
          autoRefreshToken: false
        },
        global: {
          headers: { 'x-client-info': 'supabase-js/2.39.7' }
        },
        realtime: {
          timeout: 60000
        }
      }) : 
      this.supabase;

    // Validate configurations
    this._validateConfigurations();
  }

  _validateConfigurations() {
    const validation = getSupabaseConfig();
    if (!validation.url || !validation.anonKey || !validation.serviceRoleKey) {
      this.logger.error('Invalid Supabase configuration');
      this.logger.error('- Missing required Supabase configuration values');
      throw new Error('Supabase configuration validation failed');
    }
  }

  /**
   * Test Supabase connection and storage access
   */
  async testConnection() {
    try {
      this.logger.info('Testing Supabase connection');
      
      // Test basic connection
      const { data, error } = await this.supabase
        .from('advertisers')
        .select('count', { count: 'exact', head: true });
      
      if (error) {
        this.logger.error('Supabase connection test failed', { error: error.message });
        return false;
      }
      
      this.logger.info('Supabase connection successful');
      
      // Test admin connection and storage access
      if (this.config.supabase.serviceRoleKey) {
        this.logger.info('Testing Supabase admin connection and storage access');
        
        const { data: adminData, error: adminError } = await this.supabaseAdmin
          .from('advertisers')
          .select('count', { count: 'exact', head: true });
          
        if (adminError) {
          this.logger.warn('Supabase admin connection failed, will proceed with regular client only', {
            error: adminError.message
          });
        } else {
          this.logger.info('Supabase admin connection successful');
          
          // Test storage access
          try {
            const { data: buckets, error: storageError } = await this.supabaseAdmin.storage.listBuckets();
            if (storageError) {
              this.logger.warn('Storage access test failed', { error: storageError.message });
            } else {
              this.logger.info('Storage access successful', { bucketCount: buckets.length });
            }
          } catch (storageTestError) {
            this.logger.warn('Storage access test error', { error: storageTestError.message });
          }
        }
      } else {
        this.logger.warn('No service role key provided, storage operations may fail');
      }
      
      return true;
    } catch (error) {
      this.logger.error('Connection test error', { error: error.message });
      return false;
    }
  }

  /**
   * Check if a storage bucket exists
   * @param {string} bucketName - Name of the bucket
   * @returns {Promise<boolean>} Whether bucket exists
   */
  async checkBucketExists(bucketName) {
    try {
      this.logger.info('Checking bucket existence', { bucketName });
      
      const { data: buckets, error } = await this.supabaseAdmin.storage.listBuckets();
      
      if (error) {
        this.logger.error('Failed to list buckets', { error: error.message });
        return false;
      }
      
      const bucketExists = buckets.some(bucket => bucket.name === bucketName);
      this.logger.info('Bucket existence check completed', { bucketName, exists: bucketExists });
      
      return bucketExists;
    } catch (error) {
      this.logger.error('Bucket existence check failed', { 
        bucketName, 
        error: error.message 
      });
      return false;
    }
  }

  /**
   * Create a storage bucket
   * @param {string} bucketName - Name of the bucket
   * @param {Object} options - Bucket configuration options
   * @returns {Promise<Object>} Creation result
   */
  async createBucket(bucketName, options = {}) {
    const startTime = Date.now();
    this.logger.info('Creating storage bucket', { bucketName, options });

    try {
      const bucketConfig = {
        public: options.public || false,
        allowedMimeTypes: options.allowedMimeTypes || ['image/*', 'text/*'],
        fileSizeLimit: options.fileSizeLimit || 1024 * 1024 * 10, // 10MB default
        ...options
      };

      const { data, error } = await this.supabaseAdmin.storage.createBucket(bucketName, bucketConfig);
      
      if (error) {
        throw new Error(`Failed to create bucket: ${error.message}`);
      }

      const executionTime = Date.now() - startTime;
      this.logger.info('Bucket created successfully', {
        bucketName,
        bucketId: data.name,
        executionTime: `${executionTime}ms`
      });

      return {
        success: true,
        bucketName: data.name,
        executionTime
      };

    } catch (error) {
      const executionTime = Date.now() - startTime;
      this.logger.error('Bucket creation failed', {
        bucketName,
        error: error.message,
        executionTime: `${executionTime}ms`
      });

      return handleError(error, 'StorageManager.createBucket', {
        bucketName,
        options,
        executionTime
      });
    }
  }

  /**
   * Upload a file to storage
   * @param {string} bucketName - Name of the bucket
   * @param {string} filePath - Local file path
   * @param {string} storagePath - Storage path (optional, derived from filePath if not provided)
   * @param {Object} options - Upload options
   * @returns {Promise<Object>} Upload result
   */
  async uploadFile(bucketName, filePath, storagePath = null, options = {}) {
    const startTime = Date.now();
    this.logger.info('Starting file upload', { bucketName, filePath, storagePath });

    try {
      // Validate file exists
      if (!fs.existsSync(filePath)) {
        throw new Error(`File does not exist: ${filePath}`);
      }

      // Generate storage path if not provided
      if (!storagePath) {
        storagePath = path.basename(filePath);
      }

      // Read file
      const fileBuffer = fs.readFileSync(filePath);
      const fileStats = fs.statSync(filePath);
      
      // Determine content type
      const contentType = this._getContentType(filePath);
      
      this.logger.info('File prepared for upload', {
        filePath,
        storagePath,
        fileSize: fileStats.size,
        contentType
      });

      // Upload to Supabase Storage
      const { data, error } = await this.supabaseAdmin.storage
        .from(bucketName)
        .upload(storagePath, fileBuffer, {
          contentType,
          duplex: options.duplex || 'replace',
          ...options
        });

      if (error) {
        throw new Error(`Upload failed: ${error.message}`);
      }

      // Get public URL if bucket is public
      let publicUrl = null;
      try {
        const { data: urlData } = this.supabaseAdmin.storage
          .from(bucketName)
          .getPublicUrl(storagePath);
        publicUrl = urlData.publicUrl;
      } catch (urlError) {
        this.logger.warn('Failed to get public URL', { error: urlError.message });
      }

      const executionTime = Date.now() - startTime;
      this.logger.info('File uploaded successfully', {
        filePath,
        storagePath,
        bucketName,
        fileSize: fileStats.size,
        publicUrl,
        executionTime: `${executionTime}ms`
      });

      return {
        success: true,
        path: data.path,
        fullPath: data.fullPath,
        id: data.id,
        publicUrl,
        fileSize: fileStats.size,
        contentType,
        executionTime
      };

    } catch (error) {
      const executionTime = Date.now() - startTime;
      this.logger.error('File upload failed', {
        bucketName,
        filePath,
        storagePath,
        error: error.message,
        executionTime: `${executionTime}ms`
      });

      return handleError(error, 'StorageManager.uploadFile', {
        bucketName,
        filePath,
        storagePath,
        executionTime
      });
    }
  }

  /**
   * Upload multiple files from a directory
   * @param {string} bucketName - Name of the bucket
   * @param {string} directoryPath - Local directory path
   * @param {Object} options - Upload options
   * @returns {Promise<Object>} Batch upload result
   */
  async uploadDirectory(bucketName, directoryPath, options = {}) {
    const startTime = Date.now();
    this.logger.info('Starting directory upload', { bucketName, directoryPath });

    try {
      if (!fs.existsSync(directoryPath)) {
        throw new Error(`Directory does not exist: ${directoryPath}`);
      }

      const files = fs.readdirSync(directoryPath).filter(file => {
        const filePath = path.join(directoryPath, file);
        return fs.statSync(filePath).isFile();
      });

      if (files.length === 0) {
        this.logger.warn('No files found in directory', { directoryPath });
        return {
          success: true,
          uploadedCount: 0,
          skippedCount: 0,
          results: []
        };
      }

      this.logger.info('Found files to upload', { 
        directoryPath, 
        fileCount: files.length 
      });

      // Filter files by type if specified
      const fileTypes = options.fileTypes || [];
      let filteredFiles = files;
      if (fileTypes.length > 0) {
        filteredFiles = files.filter(file => {
          const ext = path.extname(file).toLowerCase();
          return fileTypes.includes(ext);
        });
        this.logger.info('Filtered files by type', { 
          originalCount: files.length,
          filteredCount: filteredFiles.length,
          fileTypes 
        });
      }

      // Upload files
      const results = [];
      let uploadedCount = 0;
      let skippedCount = 0;

      for (const file of filteredFiles) {
        try {
          const filePath = path.join(directoryPath, file);
          const storagePath = options.preservePath ? 
            path.join(path.basename(directoryPath), file) : 
            file;

          const uploadResult = await this.uploadFile(bucketName, filePath, storagePath, options);
          
          if (uploadResult.success) {
            uploadedCount++;
            results.push({
              file,
              success: true,
              ...uploadResult
            });
          } else {
            skippedCount++;
            results.push({
              file,
              success: false,
              error: uploadResult.error
            });
          }

        } catch (fileError) {
          this.logger.error('Individual file upload failed', {
            file,
            error: fileError.message
          });
          skippedCount++;
          results.push({
            file,
            success: false,
            error: fileError.message
          });
        }
      }

      const executionTime = Date.now() - startTime;
      this.logger.info('Directory upload completed', {
        bucketName,
        directoryPath,
        totalFiles: filteredFiles.length,
        uploadedCount,
        skippedCount,
        executionTime: `${executionTime}ms`
      });

      return {
        success: true,
        totalFiles: filteredFiles.length,
        uploadedCount,
        skippedCount,
        results,
        executionTime
      };

    } catch (error) {
      const executionTime = Date.now() - startTime;
      this.logger.error('Directory upload failed', {
        bucketName,
        directoryPath,
        error: error.message,
        executionTime: `${executionTime}ms`
      });

      return handleError(error, 'StorageManager.uploadDirectory', {
        bucketName,
        directoryPath,
        executionTime
      });
    }
  }

  /**
   * Update ad rendering records with storage URLs
   * @param {string} bucketName - Name of the bucket
   * @returns {Promise<Object>} Update result
   */
  async updateAdRenderingsWithStorageUrls(bucketName) {
    const startTime = Date.now();
    this.logger.info('Updating ad renderings with storage URLs', { bucketName });

    try {
      // Get renderings without storage URLs
      const { data: renderings, error: fetchError } = await this.supabase
        .from('ad_renderings')
        .select('id, file_path, rendering_type')
        .is('storage_url', null)
        .not('file_path', 'is', null);

      if (fetchError) {
        throw new Error(`Failed to fetch renderings: ${fetchError.message}`);
      }

      if (!renderings || renderings.length === 0) {
        this.logger.info('No renderings found requiring storage URL updates');
        return {
          success: true,
          updatedCount: 0,
          skippedCount: 0
        };
      }

      this.logger.info('Found renderings to update', { 
        renderingCount: renderings.length 
      });

      let updatedCount = 0;
      let skippedCount = 0;

      for (const rendering of renderings) {
        try {
          // Extract filename from file path
          const fileName = path.basename(rendering.file_path);
          
          // Generate storage path
          const storagePath = `renderings/${rendering.rendering_type}/${fileName}`;
          
          // Get public URL
          const { data: urlData } = this.supabaseAdmin.storage
            .from(bucketName)
            .getPublicUrl(storagePath);

          if (urlData.publicUrl) {
            // Update rendering record
            const { error: updateError } = await this.supabaseAdmin
              .from('ad_renderings')
              .update({ 
                storage_url: urlData.publicUrl,
                storage_path: storagePath,
                updated_at: new Date().toISOString()
              })
              .eq('id', rendering.id);

            if (updateError) {
              this.logger.error('Failed to update rendering record', {
                renderingId: rendering.id,
                error: updateError.message
              });
              skippedCount++;
            } else {
              updatedCount++;
            }
          } else {
            this.logger.warn('No public URL generated for rendering', {
              renderingId: rendering.id,
              fileName
            });
            skippedCount++;
          }

        } catch (renderingError) {
          this.logger.error('Failed to process rendering', {
            renderingId: rendering.id,
            error: renderingError.message
          });
          skippedCount++;
        }
      }

      const executionTime = Date.now() - startTime;
      this.logger.info('Ad renderings storage URL update completed', {
        bucketName,
        totalRenderings: renderings.length,
        updatedCount,
        skippedCount,
        executionTime: `${executionTime}ms`
      });

      return {
        success: true,
        totalRenderings: renderings.length,
        updatedCount,
        skippedCount,
        executionTime
      };

    } catch (error) {
      const executionTime = Date.now() - startTime;
      this.logger.error('Ad renderings storage URL update failed', {
        bucketName,
        error: error.message,
        executionTime: `${executionTime}ms`
      });

      return handleError(error, 'StorageManager.updateAdRenderingsWithStorageUrls', {
        bucketName,
        executionTime
      });
    }
  }

  /**
   * Determine content type from file extension
   * @private
   */
  _getContentType(filePath) {
    const ext = path.extname(filePath).toLowerCase();
    const contentTypes = {
      '.png': 'image/png',
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.gif': 'image/gif',
      '.webp': 'image/webp',
      '.html': 'text/html',
      '.htm': 'text/html',
      '.txt': 'text/plain',
      '.json': 'application/json',
      '.pdf': 'application/pdf'
    };
    
    return contentTypes[ext] || 'application/octet-stream';
  }

  /**
   * Get storage manager statistics
   */
  getStats() {
    const config = getSupabaseConfig();
    return {
      configurationValid: Boolean(config.url && config.anonKey && config.serviceRoleKey),
      supabaseConfigured: Boolean(config.url),
      adminClientAvailable: Boolean(config.serviceRoleKey)
    };
  }
}

// Export both class and convenience functions for backward compatibility
const storageManager = new StorageManager();

/**
 * Legacy compatibility functions
 */
async function uploadFile(bucketName, filePath, storagePath = null, options = {}) {
  return await storageManager.uploadFile(bucketName, filePath, storagePath, options);
}

async function uploadDirectory(bucketName, directoryPath, options = {}) {
  return await storageManager.uploadDirectory(bucketName, directoryPath, options);
}

async function checkBucketExists(bucketName) {
  return await storageManager.checkBucketExists(bucketName);
}

module.exports = {
  StorageManager,
  uploadFile,
  uploadDirectory,
  checkBucketExists
};

// CLI support for direct execution
if (require.main === module) {
  const bucketName = process.argv[2];
  const filePath = process.argv[3];
  
  if (!bucketName || !filePath) {
    console.error('❌ Usage: node storage-manager.cjs <bucketName> <filePath>');
    process.exit(1);
  }

  uploadFile(bucketName, filePath).then(result => {
    if (result.success) {
      console.log(`✅ Upload completed: ${result.publicUrl}`);
    } else {
      console.error(`❌ Upload failed: ${result.error}`);
      process.exit(1);
    }
  }).catch(error => {
    console.error('❌ Unhandled error:', error);
    process.exit(1);
  });
}
