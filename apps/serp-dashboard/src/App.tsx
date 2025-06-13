import React from 'react';
import { Routes, Route } from 'react-router-dom';
import { ThemeProvider } from './hooks/useTheme';
import MainLayout from './components/layout/MainLayout';

// Pages
import Dashboard from './pages/Dashboard';
import Campaigns from './pages/Campaigns';
import Locations from './pages/Locations';
import NotFound from './pages/NotFound';

const App: React.FC = () => {
  return (
    <ThemeProvider>
      <MainLayout>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/campaigns" element={<Campaigns />} />
          <Route path="/locations" element={<Locations />} />
          
          {/* Add placeholder routes for other sections */}
          <Route path="/schedule" element={<ComingSoon title="Schedule" />} />
          <Route path="/keywords" element={<ComingSoon title="Keyword Data" />} />
          <Route path="/campaign-manager" element={<ComingSoon title="Campaign Manager" />} />
          <Route path="/templates" element={<ComingSoon title="Flight Templates" />} />
          <Route path="/clients" element={<ComingSoon title="Clients" />} />
          <Route path="/advertisers" element={<ComingSoon title="Advertisers" />} />
          <Route path="/settings" element={<ComingSoon title="App Configuration" />} />
          
          {/* 404 route */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </MainLayout>
    </ThemeProvider>
  );
};

// Simple component for routes that aren't implemented yet
const ComingSoon: React.FC<{ title: string }> = ({ title }) => (
  <div className="flex flex-col items-center justify-center h-full">
    <h1 className="text-2xl font-bold mb-4">{title}</h1>
    <p className="text-lg text-zinc-400">Coming soon</p>
  </div>
);

export default App;