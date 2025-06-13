import React from 'react';
import DashboardView from '@/components/dashboard/DashboardView';
import AdFinder from '@/components/adfinder/AdFinder';

const Dashboard: React.FC = () => {
  return (
    <div>
      <DashboardView />
      {/* AdFinder component is included but will use mocked data */}
      <div className="p-8">
        <AdFinder query="plumbers near me" location="Boston, MA" />
      </div>
    </div>
  );
};

export default Dashboard;