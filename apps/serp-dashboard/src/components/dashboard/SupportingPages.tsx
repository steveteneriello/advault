import React from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Calendar, 
  Database, 
  BarChart3, 
  MapPin, 
  FileText, 
  Settings, 
  Users, 
  Building2,
  Layers
} from 'lucide-react';

interface PageCard {
  icon: React.ElementType;
  title: string;
  description: string;
  path: string;
}

const SupportingPages: React.FC = () => {
  const navigate = useNavigate();
  
  const pages: PageCard[] = [
    { icon: Calendar, title: 'Schedule', description: 'Manage job schedules', path: '/schedule' },
    { icon: Database, title: 'Keyword Data', description: 'Browse keyword metrics', path: '/keywords' },
    { icon: Layers, title: 'Campaign Builder', description: 'Build keyword campaigns', path: '/campaign-builder' },
    { icon: MapPin, title: 'Location Manager', description: 'Configure locations', path: '/locations' },
    { icon: FileText, title: 'Flight Templates', description: 'Save campaign templates', path: '/templates' },
    { icon: Settings, title: 'App Configuration', description: 'System settings', path: '/settings' },
    { icon: Users, title: 'Clients', description: 'Manage client accounts', path: '/clients' },
    { icon: Building2, title: 'Advertisers', description: 'Advertiser management', path: '/advertisers' }
  ];

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-6">
      <h3 className="text-lg font-semibold mb-6">Supporting Pages</h3>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {pages.map((page, idx) => (
          <div
            key={idx}
            onClick={() => navigate(page.path)}
            className="bg-zinc-800 border border-zinc-700 rounded-lg p-6 text-center cursor-pointer hover:bg-zinc-700 transition-all hover:-translate-y-0.5"
          >
            <page.icon className="w-8 h-8 mx-auto mb-3 text-white" />
            <h4 className="font-medium mb-1">{page.title}</h4>
            <p className="text-xs text-zinc-400">{page.description}</p>
          </div>
        ))}
      </div>
    </div>
  );
};

export default SupportingPages;