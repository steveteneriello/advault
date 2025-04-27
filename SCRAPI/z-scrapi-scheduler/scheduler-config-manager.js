// SCRAPI/z-scrapi-scheduler/scheduler-config-manager.js
// Manages scheduler configurations and profiles
const fs = require('fs');
const path = require('path');

class SchedulerConfigManager {
  constructor(configDir = path.join(process.cwd(), 'SCRAPI', 'z-scrapi-scheduler', 'configs')) {
    this.configDir = configDir;
    if (!fs.existsSync(this.configDir)) {
      fs.mkdirSync(this.configDir, { recursive: true });
      console.log(`📁 Created scheduler config directory: ${this.configDir}`);
    }
  }

  // Save a schedule configuration
  saveConfig(name, config) {
    const configPath = path.join(this.configDir, `${name}.json`);
    fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
    console.log(`💾 Saved configuration '${name}' to ${configPath}`);
    return { success: true, path: configPath };
  }

  // Load a schedule configuration
  loadConfig(name) {
    const configPath = path.join(this.configDir, `${name}.json`);
    if (!fs.existsSync(configPath)) {
      console.error(`❌ Configuration '${name}' not found at ${configPath}`);
      return { success: false, error: `Configuration '${name}' not found` };
    }
    
    try {
      const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
      console.log(`📂 Loaded configuration '${name}'`);
      return { success: true, config };
    } catch (error) {
      console.error(`❌ Error parsing configuration: ${error.message}`);
      return { success: false, error: `Error parsing configuration: ${error.message}` };
    }
  }

  // List all available configurations
  listConfigs() {
    if (!fs.existsSync(this.configDir)) {
      console.log(`📁 Config directory doesn't exist yet: ${this.configDir}`);
      return [];
    }
    
    const files = fs.readdirSync(this.configDir);
    const configs = files
      .filter(file => file.endsWith('.json'))
      .map(file => file.replace('.json', ''));
    
    console.log(`📋 Found ${configs.length} configurations`);
    return configs;
  }

  // Delete a configuration
  deleteConfig(name) {
    const configPath = path.join(this.configDir, `${name}.json`);
    if (!fs.existsSync(configPath)) {
      console.error(`❌ Configuration '${name}' not found at ${configPath}`);
      return { success: false, error: `Configuration '${name}' not found` };
    }
    
    fs.unlinkSync(configPath);
    console.log(`🗑️ Deleted configuration '${name}'`);
    return { success: true };
  }
  
  // Update an existing configuration
  updateConfig(name, updatedConfig) {
    const configPath = path.join(this.configDir, `${name}.json`);
    if (!fs.existsSync(configPath)) {
      console.error(`❌ Configuration '${name}' not found at ${configPath}`);
      return { success: false, error: `Configuration '${name}' not found` };
    }
    
    fs.writeFileSync(configPath, JSON.stringify(updatedConfig, null, 2));
    console.log(`✏️ Updated configuration '${name}'`);
    return { success: true };
  }
  
  // Get configuration details with stats
  getConfigDetails(name) {
    const result = this.loadConfig(name);
    if (!result.success) {
      return result;
    }
    
    const config = result.config;
    
    // Calculate some stats
    const stats = {
      itemCount: config.items ? config.items.length : 0,
      sources: {},
      queries: []
    };
    
    // Collect statistics on items
    if (config.items && config.items.length > 0) {
      // Count by source
      config.items.forEach(item => {
        const source = item.source || 'unknown';
        stats.sources[source] = (stats.sources[source] || 0) + 1;
        
        // Collect queries for google_ads
        if (source === 'google_ads' && item.query) {
          stats.queries.push({
            query: item.query,
            location: item.geo_location || 'unknown'
          });
        }
      });
    }
    
    return {
      success: true,
      config,
      stats
    };
  }
}

module.exports = SchedulerConfigManager;