import React from 'react';
import { ChevronRight, Bell, User, Menu } from 'lucide-react';
import { useLocation } from 'react-router-dom';

interface HeaderProps {
  title?: string;
  toggleSidebar: () => void;
  sidebarCollapsed: boolean;
}

const Header: React.FC<HeaderProps> = ({ title, toggleSidebar, sidebarCollapsed }) => {
  const location = useLocation();
  
  // Generate breadcrumbs based on current path
  const generateBreadcrumbs = () => {
    const paths = location.pathname.split('/').filter(Boolean);
    
    if (paths.length === 0) {
      return [{ label: 'Dashboard', path: '/' }];
    }
    
    return [
      { label: 'Dashboard', path: '/' },
      ...paths.map((path, index) => {
        const url = `/${paths.slice(0, index + 1).join('/')}`;
        return {
          label: path.charAt(0).toUpperCase() + path.slice(1).replace(/-/g, ' '),
          path: url
        };
      })
    ];
  };
  
  const breadcrumbs = generateBreadcrumbs();

  return (
    <header className="h-16 bg-black px-8 flex items-center justify-between">
      <div className="flex items-center gap-2">
        <button 
          onClick={toggleSidebar} 
          className="p-2 rounded-lg hover:bg-zinc-800 transition-colors mr-2"
        >
          <Menu className="w-5 h-5" />
        </button>
        <div className="flex items-center gap-2 text-sm text-zinc-400">
          {breadcrumbs.map((crumb, index) => (
            <React.Fragment key={crumb.path}>
              <span className={index === breadcrumbs.length - 1 ? 'text-white' : ''}>
                {crumb.label}
              </span>
              {index < breadcrumbs.length - 1 && (
                <ChevronRight className="w-4 h-4" />
              )}
            </React.Fragment>
          ))}
        </div>
      </div>
      
      <div className="flex items-center gap-3">
        <button className="w-10 h-10 rounded-lg bg-zinc-800 flex items-center justify-center hover:bg-zinc-700 transition-colors">
          <Bell className="w-5 h-5" />
        </button>
        <button className="w-10 h-10 rounded-lg bg-zinc-800 flex items-center justify-center hover:bg-zinc-700 transition-colors">
          <User className="w-5 h-5" />
        </button>
      </div>
    </header>
  );
};

export default Header;