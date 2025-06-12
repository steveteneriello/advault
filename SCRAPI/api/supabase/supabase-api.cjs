// Supabase API Integration - Handles all Supabase database and storage interactions
const { createClient } = require('@supabase/supabase-js');

// Import new centralized systems
const { validateAllConfigs, getOxylabsConfig, getSupabaseConfig } = require('../../config/environment.cjs');
const { Logger } = require('../../utils/logging/logger.cjs');
const { handleError } = require('../../utils/error-handling/error-handlers.cjs');

class SupabaseAPI {
  constructor() {
    const validation = validateAllConfigs();
    if (!validation.isValid) {
      throw new Error(`Configuration validation failed: ${validation.errors.join(", ")}`);
    }
    this.config = {
      oxylabs: getOxylabsConfig(),
      supabase: getSupabaseConfig()
    };
    this.logger = new Logger('SupabaseAPI');
    
    // Initialize clients
    this._initializeClients();
    
    // Validate configuration
    this._validateConfiguration();
  }

  _initializeClients() {
    // Regular client for standard operations
    this.client = createClient(this.config.supabase.url, this.config.supabase.anonKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false
      },
      global: {
        headers: { 'x-client-info': 'supabase-js/2.39.7' }
      }
    });

    // Admin client for privileged operations
    this.adminClient = this.config.supabase.serviceRoleKey ? 
      createClient(this.config.supabase.url, this.config.supabase.serviceRoleKey, {
        auth: {
          persistSession: false,
          autoRefreshToken: false
        },
        global: {
          headers: { 'x-client-info': 'supabase-js/2.39.7' }
        }
      }) : 
      this.client;
  }

  _validateConfiguration() {
    const validation = getSupabaseConfig();
    if (!validation.url || !validation.anonKey || !validation.serviceRoleKey) {
      this.logger.error('Invalid Supabase configuration');
      this.logger.error('- Missing required Supabase configuration values');
      throw new Error('Supabase configuration validation failed');
    }
  }

  /**
   * Test database connection
   */
  async testConnection() {
    try {
      this.logger.info('Testing Supabase connection');
      
      // Test basic connection
      const { data, error } = await this.client
        .from('advertisers')
        .select('count', { count: 'exact', head: true });
      
      if (error) {
        this.logger.error('Supabase connection test failed', { error: error.message });
        return {
          success: false,
          error: error.message,
          basicConnection: false,
          adminConnection: false
        };
      }
      
      this.logger.info('Basic Supabase connection successful');
      
      // Test admin connection if available
      let adminConnectionWorks = false;
      if (this.config.supabase.serviceRoleKey) {
        try {
          const { data: adminData, error: adminError } = await this.adminClient
            .from('advertisers')
            .select('count', { count: 'exact', head: true });
            
          if (adminError) {
            this.logger.warn('Admin connection failed', { error: adminError.message });
          } else {
            this.logger.info('Admin Supabase connection successful');
            adminConnectionWorks = true;
          }
        } catch (adminTestError) {
          this.logger.warn('Admin connection test error', { error: adminTestError.message });
        }
      } else {
        this.logger.warn('No service role key provided');
      }
      
      return {
        success: true,
        basicConnection: true,
        adminConnection: adminConnectionWorks,
        serviceKeyAvailable: Boolean(this.config.supabase.serviceRoleKey)
      };
      
    } catch (error) {
      this.logger.error('Connection test failed', { error: error.message });
      return {
        success: false,
        error: error.message,
        basicConnection: false,
        adminConnection: false
      };
    }
  }

  /**
   * Insert data into a table
   * @param {string} table - Table name
   * @param {Object|Array} data - Data to insert
   * @param {Object} options - Insert options
   * @returns {Promise<Object>} Insert result
   */
  async insert(table, data, options = {}) {
    const startTime = Date.now();
    const isArray = Array.isArray(data);
    const recordCount = isArray ? data.length : 1;
    
    this.logger.info('Inserting data', { 
      table, 
      recordCount,
      useAdmin: options.useAdmin || false
    });

    try {
      const client = options.useAdmin ? this.adminClient : this.client;
      
      let query = client.from(table).insert(data);
      
      if (options.select) {
        query = query.select(options.select);
      }

      const { data: result, error } = await query;
      
      if (error) {
        throw new Error(`Insert failed: ${error.message}`);
      }

      const executionTime = Date.now() - startTime;
      this.logger.info('Data inserted successfully', {
        table,
        recordCount,
        insertedCount: result ? result.length : recordCount,
        executionTime: `${executionTime}ms`
      });

      return {
        success: true,
        data: result,
        recordCount,
        executionTime
      };

    } catch (error) {
      const executionTime = Date.now() - startTime;
      this.logger.error('Insert failed', {
        table,
        recordCount,
        error: error.message,
        executionTime: `${executionTime}ms`
      });

      return handleError(error, 'SupabaseAPI.insert', {
        table,
        recordCount,
        executionTime
      });
    }
  }

  /**
   * Select data from a table
   * @param {string} table - Table name
   * @param {Object} options - Query options
   * @returns {Promise<Object>} Select result
   */
  async select(table, options = {}) {
    const startTime = Date.now();
    this.logger.info('Selecting data', { table, options });

    try {
      const client = options.useAdmin ? this.adminClient : this.client;
      let query = client.from(table);

      // Apply select columns
      if (options.select) {
        query = query.select(options.select);
      } else {
        query = query.select('*');
      }

      // Apply filters
      if (options.filters) {
        for (const [column, value] of Object.entries(options.filters)) {
          if (typeof value === 'object' && value.operator) {
            // Complex filter with operator
            switch (value.operator) {
              case 'eq':
                query = query.eq(column, value.value);
                break;
              case 'neq':
                query = query.neq(column, value.value);
                break;
              case 'gt':
                query = query.gt(column, value.value);
                break;
              case 'gte':
                query = query.gte(column, value.value);
                break;
              case 'lt':
                query = query.lt(column, value.value);
                break;
              case 'lte':
                query = query.lte(column, value.value);
                break;
              case 'like':
                query = query.like(column, value.value);
                break;
              case 'in':
                query = query.in(column, value.value);
                break;
              case 'is':
                query = query.is(column, value.value);
                break;
              default:
                query = query.eq(column, value.value);
            }
          } else {
            // Simple equality filter
            query = query.eq(column, value);
          }
        }
      }

      // Apply ordering
      if (options.orderBy) {
        const { column, ascending = true } = options.orderBy;
        query = query.order(column, { ascending });
      }

      // Apply limit
      if (options.limit) {
        query = query.limit(options.limit);
      }

      // Apply range
      if (options.range) {
        query = query.range(options.range.from, options.range.to);
      }

      // Execute query
      const { data, error, count } = await query;
      
      if (error) {
        throw new Error(`Select failed: ${error.message}`);
      }

      const executionTime = Date.now() - startTime;
      this.logger.info('Data selected successfully', {
        table,
        recordCount: data ? data.length : 0,
        totalCount: count,
        executionTime: `${executionTime}ms`
      });

      return {
        success: true,
        data,
        count,
        recordCount: data ? data.length : 0,
        executionTime
      };

    } catch (error) {
      const executionTime = Date.now() - startTime;
      this.logger.error('Select failed', {
        table,
        error: error.message,
        executionTime: `${executionTime}ms`
      });

      return handleError(error, 'SupabaseAPI.select', {
        table,
        options,
        executionTime
      });
    }
  }

  /**
   * Update data in a table
   * @param {string} table - Table name
   * @param {Object} data - Data to update
   * @param {Object} filters - Update filters
   * @param {Object} options - Update options
   * @returns {Promise<Object>} Update result
   */
  async update(table, data, filters, options = {}) {
    const startTime = Date.now();
    this.logger.info('Updating data', { table, filters, dataKeys: Object.keys(data) });

    try {
      const client = options.useAdmin ? this.adminClient : this.client;
      let query = client.from(table).update(data);

      // Apply filters
      for (const [column, value] of Object.entries(filters)) {
        query = query.eq(column, value);
      }

      if (options.select) {
        query = query.select(options.select);
      }

      const { data: result, error } = await query;
      
      if (error) {
        throw new Error(`Update failed: ${error.message}`);
      }

      const executionTime = Date.now() - startTime;
      this.logger.info('Data updated successfully', {
        table,
        updatedCount: result ? result.length : 0,
        executionTime: `${executionTime}ms`
      });

      return {
        success: true,
        data: result,
        updatedCount: result ? result.length : 0,
        executionTime
      };

    } catch (error) {
      const executionTime = Date.now() - startTime;
      this.logger.error('Update failed', {
        table,
        filters,
        error: error.message,
        executionTime: `${executionTime}ms`
      });

      return handleError(error, 'SupabaseAPI.update', {
        table,
        filters,
        executionTime
      });
    }
  }

  /**
   * Delete data from a table
   * @param {string} table - Table name
   * @param {Object} filters - Delete filters
   * @param {Object} options - Delete options
   * @returns {Promise<Object>} Delete result
   */
  async delete(table, filters, options = {}) {
    const startTime = Date.now();
    this.logger.info('Deleting data', { table, filters });

    try {
      const client = options.useAdmin ? this.adminClient : this.client;
      let query = client.from(table).delete();

      // Apply filters
      for (const [column, value] of Object.entries(filters)) {
        query = query.eq(column, value);
      }

      if (options.select) {
        query = query.select(options.select);
      }

      const { data: result, error } = await query;
      
      if (error) {
        throw new Error(`Delete failed: ${error.message}`);
      }

      const executionTime = Date.now() - startTime;
      this.logger.info('Data deleted successfully', {
        table,
        deletedCount: result ? result.length : 0,
        executionTime: `${executionTime}ms`
      });

      return {
        success: true,
        data: result,
        deletedCount: result ? result.length : 0,
        executionTime
      };

    } catch (error) {
      const executionTime = Date.now() - startTime;
      this.logger.error('Delete failed', {
        table,
        filters,
        error: error.message,
        executionTime: `${executionTime}ms`
      });

      return handleError(error, 'SupabaseAPI.delete', {
        table,
        filters,
        executionTime
      });
    }
  }

  /**
   * Execute a custom SQL query
   * @param {string} query - SQL query
   * @param {Array} params - Query parameters
   * @param {Object} options - Query options
   * @returns {Promise<Object>} Query result
   */
  async executeSQL(query, params = [], options = {}) {
    const startTime = Date.now();
    this.logger.info('Executing SQL query', { 
      query: query.substring(0, 100) + (query.length > 100 ? '...' : ''),
      paramCount: params.length
    });

    try {
      const client = options.useAdmin ? this.adminClient : this.client;
      const { data, error } = await client.rpc('execute_sql', {
        query,
        params
      });
      
      if (error) {
        throw new Error(`SQL execution failed: ${error.message}`);
      }

      const executionTime = Date.now() - startTime;
      this.logger.info('SQL query executed successfully', {
        resultCount: data ? data.length : 0,
        executionTime: `${executionTime}ms`
      });

      return {
        success: true,
        data,
        resultCount: data ? data.length : 0,
        executionTime
      };

    } catch (error) {
      const executionTime = Date.now() - startTime;
      this.logger.error('SQL execution failed', {
        query: query.substring(0, 100),
        error: error.message,
        executionTime: `${executionTime}ms`
      });

      return handleError(error, 'SupabaseAPI.executeSQL', {
        query,
        paramCount: params.length,
        executionTime
      });
    }
  }

  /**
   * Get table statistics
   * @param {string} table - Table name
   * @returns {Promise<Object>} Statistics result
   */
  async getTableStats(table) {
    const startTime = Date.now();
    this.logger.info('Getting table statistics', { table });

    try {
      const { data, error, count } = await this.client
        .from(table)
        .select('*', { count: 'exact', head: true });
      
      if (error) {
        throw new Error(`Failed to get table stats: ${error.message}`);
      }

      const executionTime = Date.now() - startTime;
      this.logger.info('Table statistics retrieved', {
        table,
        recordCount: count,
        executionTime: `${executionTime}ms`
      });

      return {
        success: true,
        table,
        recordCount: count,
        executionTime
      };

    } catch (error) {
      const executionTime = Date.now() - startTime;
      this.logger.error('Failed to get table statistics', {
        table,
        error: error.message,
        executionTime: `${executionTime}ms`
      });

      return handleError(error, 'SupabaseAPI.getTableStats', {
        table,
        executionTime
      });
    }
  }

  /**
   * Get database health and statistics
   */
  async getDatabaseStats() {
    const startTime = Date.now();
    this.logger.info('Getting database statistics');

    try {
      const tables = ['advertisers', 'ads', 'serps', 'serp_ads', 'ad_renderings', 'job_tracking'];
      const stats = {};
      
      for (const table of tables) {
        const tableStats = await this.getTableStats(table);
        if (tableStats.success) {
          stats[table] = tableStats.recordCount;
        } else {
          stats[table] = 'Error';
        }
      }

      const executionTime = Date.now() - startTime;
      this.logger.info('Database statistics retrieved', {
        stats,
        executionTime: `${executionTime}ms`
      });

      return {
        success: true,
        stats,
        executionTime
      };

    } catch (error) {
      const executionTime = Date.now() - startTime;
      this.logger.error('Failed to get database statistics', {
        error: error.message,
        executionTime: `${executionTime}ms`
      });

      return handleError(error, 'SupabaseAPI.getDatabaseStats', {
        executionTime
      });
    }
  }

  /**
   * Get API statistics and health
   */
  getStats() {
    const config = getSupabaseConfig();
    return {
      configurationValid: Boolean(config.url && config.anonKey && config.serviceRoleKey),
      urlConfigured: Boolean(config.url),
      anonKeyConfigured: Boolean(config.anonKey),
      serviceKeyConfigured: Boolean(config.serviceRoleKey),
      adminClientAvailable: this.adminClient !== this.client
    };
  }

  /**
   * Job Tracking Methods
   */

  /**
   * Insert a new job tracking record
   * @param {Object} jobData - Job tracking data
   * @returns {Promise<Object>} Insert result
   */
  async insertJobTracking(jobData) {
    return this.insert('job_tracking', jobData, { 
      useAdmin: true, 
      select: '*' 
    });
  }

  /**
   * Update a job tracking record
   * @param {string} jobId - The Oxylabs job ID
   * @param {Object} updateData - Data to update
   * @returns {Promise<Object>} Update result
   */
  async updateJobTracking(jobId, updateData) {
    return this.update('job_tracking', updateData, { job_id: jobId }, { 
      useAdmin: true, 
      select: '*' 
    });
  }

  /**
   * Get a job tracking record by job ID
   * @param {string} jobId - The Oxylabs job ID
   * @returns {Promise<Object>} Select result
   */
  async getJobTracking(jobId) {
    const result = await this.select('job_tracking', {
      filters: { job_id: jobId },
      select: '*'
    });

    if (result.success && result.data && result.data.length > 0) {
      return {
        success: true,
        data: result.data[0]
      };
    } else if (result.success && result.data && result.data.length === 0) {
      return {
        success: false,
        error: { message: 'Job tracking record not found' }
      };
    }

    return result;
  }

  /**
   * Get all job tracking records with pagination
   * @param {number} limit - Limit of records
   * @param {number} offset - Offset for pagination
   * @returns {Promise<Object>} Select result
   */
  async getAllJobTracking(limit = 100, offset = 0) {
    return this.select('job_tracking', {
      select: '*',
      orderBy: { column: 'started_at', ascending: false },
      range: { from: offset, to: offset + limit - 1 }
    });
  }

  /**
   * Get job tracking statistics
   * @returns {Promise<Object>} Statistics result
   */
  async getJobTrackingStats() {
    try {
      // Get total count
      const countResult = await this.select('job_tracking', {
        select: '*',
        range: { from: 0, to: 0 }
      });

      const totalCount = countResult.count || 0;

      // Get status counts
      const statusCountsResult = await this.executeSQL(`
        SELECT status, COUNT(*) as count
        FROM job_tracking
        GROUP BY status
        ORDER BY count DESC
      `);

      // Get step counts
      const stepCountsResult = await this.executeSQL(`
        SELECT 
          'api_call' as step,
          api_call_status as status,
          COUNT(*) as count
        FROM job_tracking
        GROUP BY api_call_status
        UNION ALL
        SELECT 
          'serp_processing' as step,
          serp_processing_status as status,
          COUNT(*) as count
        FROM job_tracking
        GROUP BY serp_processing_status
        UNION ALL
        SELECT 
          'ads_extraction' as step,
          ads_extraction_status as status,
          COUNT(*) as count
        FROM job_tracking
        GROUP BY ads_extraction_status
        UNION ALL
        SELECT 
          'rendering' as step,
          rendering_status as status,
          COUNT(*) as count
        FROM job_tracking
        GROUP BY rendering_status
        ORDER BY step, status
      `);

      // Get recent jobs
      const recentJobsResult = await this.select('job_tracking', {
        select: '*',
        orderBy: { column: 'started_at', ascending: false },
        limit: 10
      });

      const stats = {
        totalCount,
        statusCounts: statusCountsResult.success ? statusCountsResult.data : [],
        stepCounts: stepCountsResult.success ? stepCountsResult.data : [],
        recentJobs: recentJobsResult.success ? recentJobsResult.data : []
      };

      return {
        success: true,
        data: stats
      };

    } catch (error) {
      this.logger.error('Failed to get job tracking statistics', { error: error.message });
      return handleError(error, 'SupabaseAPI.getJobTrackingStats');
    }
  }

  /**
   * Get SERP by job ID
   * @param {string} jobId - The Oxylabs job ID
   * @returns {Promise<Object>} Select result
   */
  async getSerpByJobId(jobId) {
    const result = await this.select('google_ads_serps', {
      filters: { oxylabs_job_id: jobId },
      select: '*'
    });

    if (result.success && result.data && result.data.length > 0) {
      return {
        success: true,
        data: result.data[0]
      };
    }

    return {
      success: false,
      error: { message: 'SERP not found for job ID' }
    };
  }

  /**
   * Get staging data by job ID
   * @param {string} jobId - The Oxylabs job ID
   * @returns {Promise<Object>} Select result
   */
  async getStagingByJobId(jobId) {
    const result = await this.select('staging_serps', {
      filters: { oxylabs_job_id: jobId },
      select: '*'
    });

    if (result.success && result.data && result.data.length > 0) {
      return {
        success: true,
        data: result.data[0]
      };
    }

    return {
      success: false,
      error: { message: 'Staging data not found for job ID' }
    };
  }

  /**
   * Get processing logs for a staging record
   * @param {number} stagingId - The staging record ID
   * @returns {Promise<Object>} Select result
   */
  async getProcessingLogs(stagingId) {
    return this.select('processing_logs', {
      filters: { staging_id: stagingId },
      select: '*',
      orderBy: { column: 'created_at', ascending: true }
    });
  }

  /**
   * Get ad renderings for a SERP
   * @param {number} serpId - The SERP ID
   * @returns {Promise<Object>} Select result
   */
  async getAdRenderings(serpId) {
    return this.select('ad_renderings', {
      filters: { serp_id: serpId },
      select: '*',
      orderBy: { column: 'created_at', ascending: false }
    });
  }

  // ...existing code...
}

// Export both class and convenience functions for backward compatibility
const supabaseAPI = new SupabaseAPI();

/**
 * Legacy compatibility functions
 */
async function getSupabaseClient() {
  return supabaseAPI.client;
}

async function getSupabaseAdminClient() {
  return supabaseAPI.adminClient;
}

module.exports = {
  SupabaseAPI,
  getSupabaseClient,
  getSupabaseAdminClient
};

// CLI support for direct execution
if (require.main === module) {
  const action = process.argv[2];
  
  if (action === 'test') {
    supabaseAPI.testConnection().then(result => {
      console.log('Connection test result:', JSON.stringify(result, null, 2));
    });
  } else if (action === 'stats') {
    supabaseAPI.getDatabaseStats().then(result => {
      console.log('Database statistics:', JSON.stringify(result, null, 2));
    });
  } else {
    console.log('Available actions: test, stats');
    console.log('Usage: node supabase-api.cjs <action>');
  }
}
