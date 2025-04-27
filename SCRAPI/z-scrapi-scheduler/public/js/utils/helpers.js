// SCRAPI/z-scrapi-scheduler/public/js/utils/helpers.js
// Helper functions for the web interface

// Format a date string
function formatDate(dateString) {
    if (!dateString) return 'N/A';
    
    try {
      const date = new Date(dateString);
      return date.toLocaleString();
    } catch (error) {
      console.error('Error formatting date:', error);
      return dateString;
    }
  }
  
  // Format a number with commas
  function formatNumber(number) {
    if (number === undefined || number === null) return 'N/A';
    
    try {
      return number.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
    } catch (error) {
      console.error('Error formatting number:', error);
      return number;
    }
  }
  
  // Calculate time difference in a human-readable format
  function timeAgo(dateString) {
    if (!dateString) return 'N/A';
    
    try {
      const date = new Date(dateString);
      const now = new Date();
      const seconds = Math.floor((now - date) / 1000);
      
      let interval = Math.floor(seconds / 31536000);
      if (interval >= 1) {
        return interval === 1 ? '1 year ago' : `${interval} years ago`;
      }
      
      interval = Math.floor(seconds / 2592000);
      if (interval >= 1) {
        return interval === 1 ? '1 month ago' : `${interval} months ago`;
      }
      
      interval = Math.floor(seconds / 86400);
      if (interval >= 1) {
        return interval === 1 ? '1 day ago' : `${interval} days ago`;
      }
      
      interval = Math.floor(seconds / 3600);
      if (interval >= 1) {
        return interval === 1 ? '1 hour ago' : `${interval} hours ago`;
      }
      
      interval = Math.floor(seconds / 60);
      if (interval >= 1) {
        return interval === 1 ? '1 minute ago' : `${interval} minutes ago`;
      }
      
      return seconds < 10 ? 'just now' : `${Math.floor(seconds)} seconds ago`;
    } catch (error) {
      console.error('Error calculating time ago:', error);
      return dateString;
    }
  }
  
  // Calculate time until a date in a human-readable format
  function timeUntil(dateString) {
    if (!dateString) return 'N/A';
    
    try {
      const date = new Date(dateString);
      const now = new Date();
      
      // If the date is in the past
      if (date <= now) {
        return 'Already passed';
      }
      
      const seconds = Math.floor((date - now) / 1000);
      
      let interval = Math.floor(seconds / 31536000);
      if (interval >= 1) {
        return interval === 1 ? 'in 1 year' : `in ${interval} years`;
      }
      
      interval = Math.floor(seconds / 2592000);
      if (interval >= 1) {
        return interval === 1 ? 'in 1 month' : `in ${interval} months`;
      }
      
      interval = Math.floor(seconds / 86400);
      if (interval >= 1) {
        return interval === 1 ? 'in 1 day' : `in ${interval} days`;
      }
      
      interval = Math.floor(seconds / 3600);
      if (interval >= 1) {
        return interval === 1 ? 'in 1 hour' : `in ${interval} hours`;
      }
      
      interval = Math.floor(seconds / 60);
      if (interval >= 1) {
        return interval === 1 ? 'in 1 minute' : `in ${interval} minutes`;
      }
      
      return 'in less than a minute';
    } catch (error) {
      console.error('Error calculating time until:', error);
      return dateString;
    }
  }
  
  // Truncate text with ellipsis
  function truncateText(text, maxLength = 100) {
    if (!text) return '';
    
    if (text.length <= maxLength) {
      return text;
    }
    
    return text.substring(0, maxLength) + '...';
  }
  
  // Convert a string to title case
  function toTitleCase(text) {
    if (!text) return '';
    
    return text.replace(
      /\w\S*/g,
      function(txt) {
        return txt.charAt(0).toUpperCase() + txt.substring(1).toLowerCase();
      }
    );
  }
  
  // Toggle visibility of an element
  function toggleVisibility(elementId) {
    const element = document.getElementById(elementId);
    
    if (element) {
      if (element.style.display === 'none') {
        element.style.display = 'block';
      } else {
        element.style.display = 'none';
      }
    }
  }
  
  // Show an alert message
  function showAlert(message, type = 'info', duration = 5000) {
    const alertBox = document.createElement('div');
    alertBox.className = `alert alert-${type}`;
    alertBox.textContent = message;
    
    // Add to the top of the main container
    const container = document.querySelector('main .container');
    
    if (container) {
      container.insertBefore(alertBox, container.firstChild);
      
      // Auto-dismiss after duration
      setTimeout(() => {
        alertBox.remove();
      }, duration);
    }
  }
  
  // Refresh data from an API endpoint
  function refreshData(endpoint, targetElementId) {
    const targetElement = document.getElementById(targetElementId);
    
    if (!targetElement) return;
    
    // Show loading indicator
    targetElement.innerHTML = '<div class="spinner"></div>';
    
    fetch(endpoint)
      .then(response => response.json())
      .then(data => {
        if (data.html) {
          targetElement.innerHTML = data.html;
        } else {
          targetElement.textContent = JSON.stringify(data, null, 2);
        }
      })
      .catch(error => {
        console.error('Error refreshing data:', error);
        targetElement.innerHTML = '<div class="alert alert-danger">Failed to refresh data</div>';
      });
  }
  
  // Copy text to clipboard
  function copyToClipboard(text) {
    const textarea = document.createElement('textarea');
    textarea.value = text;
    document.body.appendChild(textarea);
    textarea.select();
    document.execCommand('copy');
    document.body.removeChild(textarea);
    
    showAlert('Copied to clipboard!', 'success', 2000);
  }
  
  // Parse a cron expression into a human-readable format
  function parseCronExpression(cronExpression) {
    if (!cronExpression) return 'Invalid cron expression';
    
    const parts = cronExpression.split(' ');
    
    if (parts.length !== 5) {
      return 'Invalid cron expression';
    }
    
    const [minute, hour, dayOfMonth, month, dayOfWeek] = parts;
    
    // Check for common patterns
    if (minute === '*' && hour === '*' && dayOfMonth === '*' && month === '*' && dayOfWeek === '*') {
      return 'Every minute';
    }
    
    if (minute === '0' && hour === '*' && dayOfMonth === '*' && month === '*' && dayOfWeek === '*') {
      return 'Every hour at minute 0';
    }
    
    if (minute === '0' && hour === '0' && dayOfMonth === '*' && month === '*' && dayOfWeek === '*') {
      return 'Daily at midnight';
    }
    
    if (minute === '0' && hour === '12' && dayOfMonth === '*' && month === '*' && dayOfWeek === '*') {
      return 'Daily at noon';
    }
    
    if (minute === '0' && hour === '0' && dayOfMonth === '*' && month === '*' && dayOfWeek === '0') {
      return 'Weekly on Sunday at midnight';
    }
    
    if (minute === '0' && hour === '0' && dayOfMonth === '1' && month === '*' && dayOfWeek === '*') {
      return 'Monthly on the 1st at midnight';
    }
    
    if (minute === '0' && hour === '0' && dayOfMonth === '1' && month === '1' && dayOfWeek === '*') {
      return 'Yearly on January 1st at midnight';
    }
    
    // For other patterns, just return the cron expression
    return cronExpression;
  }