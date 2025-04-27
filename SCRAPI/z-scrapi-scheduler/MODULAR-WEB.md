# SCRAPI Scheduler Modular Web Interface

A modern, maintainable web dashboard for the SCRAPI Scheduler system with separated CSS, HTML, and JavaScript files.

## Overview

The modular web interface provides a clean, maintainable structure for the SCRAPI Scheduler dashboard. Unlike the original monolithic interface, this version:

- Separates CSS into modular files using CSS imports
- Uses separate template files for each page
- Organizes JavaScript into utility modules
- Automatically creates the necessary directory structure on first run

## Directory Structure

```
SCRAPI/z-scrapi-scheduler/
├── views/                  # HTML templates
│   ├── layouts/            # Layout templates
│   │   └── main.html       # Main layout template
│   ├── pages/              # Page templates
│   │   ├── dashboard.html
│   │   ├── schedules.html
│   │   ├── configs.html
│   │   ├── jobs.html
│   │   └── settings.html
│   └── components/         # Reusable components
│
├── public/                 # Static assets
│   ├── css/                # Stylesheets
│   │   ├── main.css        # Main CSS importing all modules
│   │   ├── variables.css   # CSS variables
│   │   ├── layout.css      # Layout styles
│   │   ├── components.css  # Component styles
│   │   ├── utilities.css   # Utility classes
│   │   └── responsive.css  # Responsive design
│   └── js/                 # JavaScript files
│       ├── main.js         # Main JavaScript
│       ├── utils/          # Utility functions
│       │   └── helpers.js  # Helper functions
│       └── components/     # Component-specific scripts
```

## Installation

No additional installation is required beyond the main SCRAPI Scheduler system setup.

## Setup

1. Initialize the directory structure:

```bash
npm run ui-init
```

2. Start the web interface:

```bash
npm run scheduler-web
```

This will start the web server on port 3030 (or the port specified in the `SCHEDULER_PORT` environment variable).

You can then access the dashboard by opening a browser and navigating to:

```
http://localhost:3030
```

## Customization

### CSS Customization

The CSS is broken down into several files for easier maintenance:

- `variables.css` - Color schemes, spacing, typography
- `layout.css` - Grid system, containers, header, footer
- `components.css` - Buttons, cards, tables, forms
- `utilities.css` - Helper classes
- `responsive.css` - Media queries

To customize the look and feel, edit these files directly. Changes will be reflected when you refresh the page.

### HTML Templates

The interface uses a simple templating system with HTML files:

- `views/layouts/main.html` - The main layout with header and footer
- `views/pages/*.html` - Individual page templates

You can edit these files to customize the structure of each page.

### JavaScript Modules

JavaScript is organized into modular files:

- `public/js/main.js` - Main initialization and event handlers
- `public/js/utils/helpers.js` - Helper functions (date formatting, etc.)

## Features

The modular interface offers the same functionality as the original version:

1. **Dashboard**
   - Overview of active schedules
   - Recent jobs and their status
   - Quick actions

2. **Schedules**
   - List all schedules
   - Create new schedules
   - View schedule details
   - Activate/deactivate schedules
   - Check schedules for new results

3. **Configurations**
   - List saved configurations
   - View configuration details
   - Create schedules from configurations
   - Delete configurations

4. **Jobs**
   - List all jobs
   - View job details
   - Process job results

5. **Settings**
   - Configure automatic checking
   - Set up cleanup options

## Benefits of the Modular Approach

- **Easier Maintenance**: Each file has a single responsibility
- **Better Organization**: Clear separation of concerns
- **Easier Debugging**: Isolated modules make issue tracking simpler
- **Improved Performance**: CSS files can be loaded when needed
- **Customization**: Simpler to adapt and customize parts of the interface

## Future Improvements

This modular structure supports several potential future improvements:

1. CSS preprocessing with Sass or Less
2. Component-based JavaScript framework integration
3. Theme support with multiple CSS variables files
4. Server-side rendering with a more sophisticated template engine
5. API-focused backend with a modern frontend framework

## Troubleshooting

**Files Not Found**
- The system creates necessary files on first run. If you're seeing errors, try running `npm run ui-init` to ensure all directories are created.

**Styling Issues**
- If CSS changes don't apply, check that all CSS files are properly imported in `main.css`.
- Clear your browser cache if you've made changes that aren't appearing.

**JavaScript Errors**
- Check the browser console for detailed error messages.
- Ensure all required JavaScript files are being loaded in the correct order.