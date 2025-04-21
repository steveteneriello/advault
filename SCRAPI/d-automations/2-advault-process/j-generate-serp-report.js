// GenerateSerpReport.js - Generate a comprehensive report of all SERPs and ads
const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');
const { getJobDirectories } = require('../../utils/job-directory-manager');
require('dotenv').config();

// Initialize Supabase client
const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Supabase credentials not found in environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// Test Supabase connection
async function testSupabaseConnection() {
  try {
    console.log('Testing Supabase connection...');
    
    // Try a simple query first
    const { data, error } = await supabase
      .from('advertisers')
      .select('count', { count: 'exact', head: true });
    
    if (error) {
      console.error('Supabase connection test failed:', error);
      return false;
    }
    
    console.log('✅ Supabase connection successful!');
    return true;
  } catch (error) {
    console.error('Supabase connection test error:', error);
    return false;
  }
}

// Generate a report of all SERPs and ads
async function generateSerpReport(jobId = null) {
  console.log('🔍 Generating SERP report...');
  
  try {
    // Get all SERPs from the database, filtered by jobId if provided
    let query = supabase
      .from('serps')
      .select(`
        id,
        job_id,
        query,
        location,
        timestamp,
        serp_ads (
          position,
          position_overall,
          ads (
            id,
            advertiser_domain,
            title,
            description,
            url,
            shown_url,
            rating,
            review_count,
            price,
            seller
          )
        )
      `)
      .order('timestamp', { ascending: false });
      
    if (jobId) {
      query = query.eq('job_id', jobId);
    }
    
    const { data: serps, error: serpsError } = await query;

    if (serpsError) {
      console.error('Error fetching SERPs:', serpsError);
      return {
        success: false,
        error: serpsError.message
      };
    }

    if (!serps || serps.length === 0) {
      console.log('No SERPs found in the database');
      return {
        success: false,
        error: 'No SERPs found in the database'
      };
    }

    console.log(`Found ${serps.length} SERPs in the database`);

    // Get all renderings with binary content
    const { data: renderings, error: renderingsError } = await supabase
      .from('ad_renderings')
      .select(`
        id,
        ad_id,
        serp_id
      `)
      .or('binary_content.neq.null,content_html.neq.null')
      .eq('rendering_type', 'png');

    if (renderingsError) {
      console.error('Error fetching renderings:', renderingsError);
    }

    // Create a map of serp_id to renderings
    const renderingMap = {};
    if (renderings) {
      renderings.forEach(rendering => {
        if (!renderingMap[rendering.serp_id]) {
          renderingMap[rendering.serp_id] = [];
        }
        renderingMap[rendering.serp_id].push(rendering);
      });
    }

    // Generate HTML report
    let html = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>SERP and Ad Report</title>
        <style>
          body {
            font-family: Arial, sans-serif;
            max-width: 1200px;
            margin: 0 auto;
            padding: 20px;
          }
          h1, h2, h3 {
            color: #333;
          }
          .serp-card {
            border: 1px solid #ddd;
            border-radius: 8px;
            padding: 20px;
            margin-bottom: 30px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
          }
          .serp-header {
            margin-bottom: 15px;
            padding-bottom: 15px;
            border-bottom: 1px solid #eee;
          }
          .serp-query {
            font-size: 20px;
            font-weight: bold;
            margin-bottom: 5px;
          }
          .serp-location {
            color: #666;
            margin-bottom: 5px;
          }
          .serp-date {
            color: #888;
            font-size: 14px;
          }
          .ad-section {
            margin-top: 20px;
          }
          .ad-card {
            border: 1px solid #eee;
            border-radius: 6px;
            padding: 15px;
            margin-bottom: 15px;
            background-color: #f9f9f9;
          }
          .ad-title {
            font-weight: bold;
            margin-bottom: 5px;
            color: #1a0dab;
          }
          .ad-url {
            color: #006621;
            margin-bottom: 5px;
            word-break: break-all;
          }
          .ad-desc {
            color: #545454;
            margin-bottom: 10px;
          }
          .ad-position {
            font-size: 12px;
            color: #888;
          }
          .no-ads {
            color: #888;
            font-style: italic;
          }
          .summary {
            margin-top: 30px;
            padding: 15px;
            background-color: #f5f5f5;
            border-radius: 8px;
          }
          .rendering-badge {
            display: inline-block;
            background-color: #4CAF50;
            color: white;
            padding: 3px 8px;
            border-radius: 12px;
            font-size: 12px;
            margin-left: 10px;
          }
        </style>
      </head>
      <body>
        <h1>SERP and Ad Report</h1>
        <p>Generated on ${new Date().toLocaleString()}</p>
        <div class="summary">
          <h2>Summary</h2>
          <p>Total SERPs: ${serps.length}</p>
          <p>Total Ads: ${serps.reduce((total, serp) => total + (serp.serp_ads ? serp.serp_ads.length : 0), 0)}</p>
          <p>Total Renderings: ${renderings ? renderings.length : 0}</p>
        </div>
    `;

    // Add each SERP to the report
    serps.forEach((serp, index) => {
      const date = new Date(serp.timestamp).toLocaleString();
      const serpRenderings = renderingMap[serp.id] || [];
      
      html += `
        <div class="serp-card">
          <div class="serp-header">
            <div class="serp-query">${serp.query}</div>
            <div class="serp-location">${serp.location}</div>
            <div class="serp-date">${date}</div>
          </div>
          
          <div class="ad-section">
            <h3>Paid Ads (${serp.serp_ads ? serp.serp_ads.length : 0})
              ${serpRenderings.length > 0 ? `<span class="rendering-badge">Renderings: ${serpRenderings.length}</span>` : ''}
            </h3>
      `;
      
      if (!serp.serp_ads || serp.serp_ads.length === 0) {
        html += `<p class="no-ads">No paid ads found in this SERP</p>`;
      } else {
        serp.serp_ads.forEach((serpAd) => {
          const ad = serpAd.ads;
          html += `
            <div class="ad-card">
              <div class="ad-title">${ad.title || 'No title'}</div>
              <div class="ad-url">${ad.shown_url || ad.url || 'No URL'}</div>
              <div class="ad-desc">${ad.description || 'No description'}</div>
              <div class="ad-position">Position: ${serpAd.position} (Overall: ${serpAd.position_overall || 'N/A'})</div>
            </div>
          `;
        });
      }
      
      html += `
          </div>
        </div>
      `;
    });
    
    html += `
      </body>
      </html>
    `;

    // Determine where to save the report
    let reportPath;
    if (jobId) {
      // Save to job-specific directory
      const jobDirs = getJobDirectories(jobId);
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      reportPath = path.join(jobDirs.reports, `serp-report-${timestamp}.html`);
    } else {
      // Save to standard directory for backward compatibility
      const reportsDir = path.join(process.cwd(), 'SCRAPI', 'output-staging', 'reports');
      if (!fs.existsSync(reportsDir)) {
        fs.mkdirSync(reportsDir, { recursive: true });
      }
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      reportPath = path.join(reportsDir, `serp-report-${timestamp}.html`);
    }
    
    // Ensure the directory exists
    const reportDir = path.dirname(reportPath);
    if (!fs.existsSync(reportDir)) {
      fs.mkdirSync(reportDir, { recursive: true });
    }
    
    fs.writeFileSync(reportPath, html);
    
    console.log(`✅ SERP report saved to: ${reportPath}`);
    
    return {
      success: true,
      reportPath
    };
  } catch (error) {
    console.error('Unexpected error generating SERP report:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

// Main function
async function main() {
  console.log('🚀 Starting GenerateSerpReport');
  
  // Test Supabase connection
  const connectionOk = await testSupabaseConnection();
  if (!connectionOk) {
    console.error('❌ Supabase connection failed, aborting');
    return;
  }
  
  // Get job ID from command line arguments
  const jobId = process.argv[2];
  
  // Generate SERP report
  const result = await generateSerpReport(jobId);
  
  if (result.success) {
    console.log('\n✅ SERP report generated successfully');
    console.log(`Report saved to: ${result.reportPath}`);
    console.log('\nYou can open this HTML file in your browser to view the report');
  } else {
    console.error('\n❌ SERP report generation failed');
    if (result.error) {
      console.error(`Error: ${result.error}`);
    }
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
  testSupabaseConnection,
  generateSerpReport
};