import React from 'react';

interface ScheduleConfigurationProps {
  campaignData: {
    startDate: string;
    endDate: string;
    noEndDate: boolean;
    frequency: string;
    runTime: string;
  };
  handleInputChange: (field: string, value: any) => void;
  selectedDays: string[];
  setSelectedDays: (days: string[]) => void;
  onContinue: () => void;
}

const ScheduleConfiguration: React.FC<ScheduleConfigurationProps> = ({
  campaignData,
  handleInputChange,
  selectedDays,
  setSelectedDays,
  onContinue
}) => {
  const toggleDay = (day: string) => {
    setSelectedDays(prev => 
      prev.includes(day) 
        ? prev.filter(d => d !== day)
        : [...prev, day]
    );
  };

  return (
    <div className="p-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        <div>
          <label className="block text-sm font-medium mb-2">Campaign Start Date</label>
          <input
            type="date"
            value={campaignData.startDate}
            onChange={(e) => handleInputChange('startDate', e.target.value)}
            className="w-full px-4 py-2 rounded-lg focus:outline-none focus:border-blue-500 bg-zinc-800 border-zinc-700 text-white"
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-2">Campaign End Date</label>
          <input
            type="date"
            value={campaignData.endDate}
            onChange={(e) => handleInputChange('endDate', e.target.value)}
            disabled={campaignData.noEndDate}
            className="w-full px-4 py-2 rounded-lg focus:outline-none focus:border-blue-500 disabled:opacity-50 bg-zinc-800 border-zinc-700 text-white"
          />
          <label className="flex items-center gap-2 mt-2 text-sm">
            <input
              type="checkbox"
              checked={campaignData.noEndDate}
              onChange={(e) => handleInputChange('noEndDate', e.target.checked)}
              className="rounded border-zinc-600"
            />
            No end date
          </label>
        </div>
      </div>

      <div className="mb-6">
        <h4 className="text-sm font-medium mb-4">Choose Frequency</h4>
        <div className="flex flex-wrap gap-3">
          {['daily', 'weekly', 'monthly', 'bi-monthly', 'specific'].map((freq) => (
            <button
              key={freq}
              onClick={() => handleInputChange('frequency', freq)}
              className={`px-4 py-2 rounded-lg border transition-all ${
                campaignData.frequency === freq
                  ? 'bg-blue-500/20 border-blue-500 text-blue-400'
                  : 'bg-zinc-800 border-zinc-700 hover:bg-zinc-700'
              }`}
            >
              {freq.charAt(0).toUpperCase() + freq.slice(1).replace('-', ' ')}
            </button>
          ))}
        </div>
      </div>

      {campaignData.frequency === 'specific' && (
        <div className="mb-6">
          <h4 className="text-sm font-medium mb-4">Select Days</h4>
          <div className="grid grid-cols-7 gap-2">
            {['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'].map((day) => (
              <button
                key={day}
                onClick={() => toggleDay(day)}
                className={`p-3 rounded-lg border transition-all ${
                  selectedDays.includes(day)
                    ? 'bg-blue-500/20 border-blue-500 text-blue-400'
                    : 'bg-zinc-800 border-zinc-700 hover:bg-zinc-700'
                }`}
              >
                {day.charAt(0).toUpperCase() + day.slice(1)}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="max-w-xs">
        <label className="block text-sm font-medium mb-2">Run Time</label>
        <input
          type="time"
          value={campaignData.runTime}
          onChange={(e) => handleInputChange('runTime', e.target.value)}
          className="w-full px-4 py-2 rounded-lg focus:outline-none focus:border-blue-500 bg-zinc-800 border-zinc-700 text-white"
        />
      </div>
      
      <div className="flex justify-end mt-6">
        <button 
          onClick={onContinue}
          className="px-4 py-2 bg-blue-500 rounded-lg text-sm font-medium hover:bg-blue-600 transition-colors text-white"
        >
          Save & Continue
        </button>
      </div>
    </div>
  );
};

export default ScheduleConfiguration;