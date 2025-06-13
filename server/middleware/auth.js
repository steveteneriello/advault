// Authentication middleware
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

// Initialize Supabase client
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

/**
 * Middleware to authenticate requests using Supabase JWT
 */
function authMiddleware(req, res, next) {
  const authHeader = req.headers.authorization;
  
  if (!authHeader) {
    return res.status(401).json({ 
      success: false, 
      error: 'Authorization header is required' 
    });
  }
  
  const token = authHeader.split(' ')[1];
  
  if (!token) {
    return res.status(401).json({ 
      success: false, 
      error: 'Bearer token is required' 
    });
  }
  
  // Verify the token
  supabase.auth.getUser(token)
    .then(({ data, error }) => {
      if (error) {
        return res.status(401).json({ 
          success: false, 
          error: 'Invalid token' 
        });
      }
      
      // Add user to request
      req.user = data.user;
      next();
    })
    .catch(error => {
      console.error('Error verifying token:', error);
      res.status(500).json({ 
        success: false, 
        error: 'Internal server error' 
      });
    });
}

/**
 * Middleware to authenticate API key
 */
async function apiKeyMiddleware(req, res, next) {
  const apiKey = req.headers['x-api-key'];
  
  if (!apiKey) {
    return res.status(401).json({ 
      success: false, 
      error: 'API key is required' 
    });
  }
  
  try {
    // Check if API key exists
    const { data, error } = await supabase
      .from('scrapi_api_keys')
      .select('*')
      .eq('key', apiKey)
      .single();
      
    if (error || !data) {
      return res.status(401).json({ 
        success: false, 
        error: 'Invalid API key' 
      });
    }
    
    // Check if API key is expired
    if (data.expires_at && new Date(data.expires_at) < new Date()) {
      return res.status(401).json({ 
        success: false, 
        error: 'API key has expired' 
      });
    }
    
    // Update last used timestamp
    await supabase
      .from('scrapi_api_keys')
      .update({ last_used_at: new Date().toISOString() })
      .eq('id', data.id);
    
    // Add API key data to request
    req.apiKey = data;
    next();
  } catch (error) {
    console.error('Error verifying API key:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Internal server error' 
    });
  }
}

module.exports = {
  authMiddleware,
  apiKeyMiddleware
};