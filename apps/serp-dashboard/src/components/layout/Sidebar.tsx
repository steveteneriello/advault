import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { 
  Layout, 
  Target, 
  Calendar, 
  MapPin, 
  Database, 
  BarChart3, 
  FileText, 
  Users, 
  Building2, 
  Settings,
  Sun,
  Moon,
  Search // Add Search icon for SCRAPI
} from 'lucide-react';
import { useTheme } from '@/hooks/useTheme';

interface NavItem {
  icon: React.ElementType;
  label: string;
  path: string;
}

interface NavSection {
  title: string;
  items: NavItem[];
}

const navigation: NavSection[] = [
  {
    title: 'Main',
    items: [
      { icon: Layout, label: 'Dashboard', path: '/' },
      { icon: Target, label: 'Campaigns', path: '/campaigns' },
      { icon: Calendar, label: 'Schedule', path: '/schedule' },
      { icon: MapPin, label: 'Locations', path: '/locations' },
      { icon: Search, label: 'SCRAPI', path: '/scrapi' } // Add SCRAPI to navigation
    ]
  },
  {
    title: 'Data Management',
    items: [
      { icon: Database, label: 'Keyword Data', path: '/keywords' },
      { icon: BarChart3, label: 'Campaign Manager', path: '/campaign-manager' },
      { icon: FileText, label: 'Flight Templates', path: '/templates' }
    ]
  },
  {
    title: 'Management',
    items: [
      { icon: Users, label: 'Clients', path: '/clients' },
      { icon: Building2, label: 'Advertisers', path: '/advertisers' },
      { icon: Settings, label: 'App Configuration', path: '/settings' }
    ]
  }
];

const Sidebar: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === 'dark';

  return (
    <aside className="w-60 bg-zinc-900 border-r border-zinc-800 h-screen flex flex-col">
      <div className="p-6">
        <h1 className="text-xl font-semibold text-blue-500">SERP Analytics</h1>
      </div>
      
      <nav className="px-3 flex-1 overflow-y-auto">
        {navigation.map((section, idx) => (
          <div key={idx} className="mb-6">
            <h3 className="px-3 mb-2 text-xs font-medium text-zinc-400 uppercase tracking-wider">
              {section.title}
            </h3>
            {section.items.map((item, itemIdx) => {
              const isActive = location.pathname === item.path || 
                (item.path !== '/' && location.pathname.startsWith(item.path));
              
              return (
                <button
                  key={itemIdx}
                  onClick={() => navigate(item.path)}
                  className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors w-full ${
                    isActive
                      ? 'bg-blue-500/10 text-blue-500 border-l-2 border-blue-500'
                      : 'text-zinc-400 hover:bg-zinc-800 hover:text-white'
                  }`}
                >
                  <item.icon className="w-5 h-5" />
                  {item.label}
                </button>
              );
            })}
          </div>
        ))}
      </nav>

      {/* Theme Toggle */}
      <div className="p-4 border-t border-zinc-800">
        <button
          onClick={toggleTheme}
          className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-zinc-400 hover:bg-zinc-800 hover:text-white transition-colors w-full"
        >
          {isDark ? (
            <>
              <Sun className="w-5 h-5" />
              <span>Light Mode</span>
            </>
          ) : (
            <>
              <Moon className="w-5 h-5" />
              <span>Dark Mode</span>
            </>
          )}
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;