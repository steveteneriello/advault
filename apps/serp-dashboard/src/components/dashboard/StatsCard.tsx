import React from 'react';

interface StatsCardProps {
  title: string;
  value: string;
  subtext: string;
}

const StatsCard: React.FC<StatsCardProps> = ({ title, value, subtext }) => {
  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-6">
      <p className="text-sm text-zinc-400 mb-2">{title}</p>
      <p className="text-3xl font-semibold mb-1">{value}</p>
      <p className="text-xs text-zinc-400">{subtext}</p>
    </div>
  );
};

export default StatsCard;