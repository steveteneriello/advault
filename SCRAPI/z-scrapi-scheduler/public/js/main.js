// SCRAPI/z-scrapi-scheduler/public/js/main.js
// Main JavaScript file that initializes components

document.addEventListener('DOMContentLoaded', function() {
    // Initialize form handlers
    initAjaxForms();
    
    // Initialize collapsible elements
    initCollapsibles();
    
    // Initialize charts if any exist
    initCharts();
    
    // Add data-label attributes to table cells for responsive display
    prepareResponsiveTables();
  });
  
  // Initialize AJAX forms
  function initAjaxForms() {
    const ajaxForms = document.querySelectorAll('form.ajax-form');
    
    ajaxForms.forEach(form => {
      form.addEventListener('submit', handleAjaxFormSubmit);
    });
  }
  
  // Handle AJAX form submission
  function handleAjaxFormSubmit(e) {
    e.preventDefault();
    
    const form = e.target;
    const formData = new FormData(form);
    const data = {};
    
    formData.forEach((value, key) => {
      data[key] = value;
    });
    
    // Show loading spinner
    const spinner = form.querySelector('.spinner');
    if (spinner) spinner.style.display = 'block';
    
    // Disable submit button
    const submitBtn = form.querySelector('button[type="submit"]');
    if (submitBtn) submitBtn.disabled = true;
    
    fetch(form.action, {
      method: form.method,
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(data)
    })
    .then(response => response.json())
    .then(result => {
      // Hide spinner
      if (spinner) spinner.style.display = 'none';
      
      // Show result message
      const resultElement = document.getElementById(form.dataset.result);
      if (resultElement) {
        resultElement.textContent = result.success 
          ? result.message || 'Success!' 
          : result.error || 'An error occurred';
        
        resultElement.className = result.success 
          ? 'alert alert-success' 
          : 'alert alert-danger';
        
        resultElement.style.display = 'block';
        
        // Auto-hide after 5 seconds
        setTimeout(() => {
          resultElement.style.display = 'none';
        }, 5000);
      }
      
      // Enable submit button
      if (submitBtn) submitBtn.disabled = false;
      
      // If we need to refresh after submission
      if (result.success && form.dataset.refresh === 'true') {
        window.location.reload();
      }
    })
    .catch(error => {
      console.error('Error:', error);
      
      // Hide spinner
      if (spinner) spinner.style.display = 'none';
      
      // Enable submit button
      if (submitBtn) submitBtn.disabled = false;
      
      // Show error message
      const resultElement = document.getElementById(form.dataset.result);
      if (resultElement) {
        resultElement.textContent = 'A network error occurred';
        resultElement.className = 'alert alert-danger';
        resultElement.style.display = 'block';
      }
    });
  }
  
  // Initialize collapsible elements
  function initCollapsibles() {
    const collapsibles = document.querySelectorAll('.collapsible');
    
    collapsibles.forEach(item => {
      const header = item.querySelector('.collapsible-header');
      
      if (header) {
        header.addEventListener('click', () => {
          item.classList.toggle('active');
        });
      }
    });
  }
  
  // Initialize charts
  function initCharts() {
    const chartElements = document.querySelectorAll('[data-chart]');
    
    chartElements.forEach(element => {
      const chartType = element.dataset.chart;
      const chartData = JSON.parse(element.dataset.data || '{}');
      const chartOptions = JSON.parse(element.dataset.options || '{}');
      
      if (chartType && chartData) {
        new Chart(element, {
          type: chartType,
          data: chartData,
          options: chartOptions
        });
      }
    });
  }
  
  // Add data-label attributes to table cells for responsive display
  function prepareResponsiveTables() {
    const tables = document.querySelectorAll('table');
    
    tables.forEach(table => {
      const headers = Array.from(table.querySelectorAll('thead th')).map(th => th.textContent.trim());
      
      table.querySelectorAll('tbody tr').forEach(row => {
        Array.from(row.querySelectorAll('td')).forEach((cell, index) => {
          if (headers[index]) {
            cell.setAttribute('data-label', headers[index]);
          }
        });
      });
    });
  }