import React, { useState } from 'react';
import { 
  Calendar, 
  MapPin, 
  Search, 
  Users, 
  Settings, 
  ChevronDown, 
  ChevronRight,
  Plus,
  Edit,
  Copy,
  Play,
  Pause,
  BarChart3,
  TrendingUp,
  Clock,
  Target,
  Database,
  Layout,
  FileText,
  Globe,
  Building2,
  X,
  Check,
  AlertCircle,
  Filter,
  Download,
  Save,
  Eye,
  Home,
  DollarSign,
  GraduationCap,
  Briefcase,
  RefreshCw,
  Trash2,
  Sun,
  Moon,
  Bell,
  User
} from 'lucide-react';

const Preview = () => {
  const [darkMode, setDarkMode] = useState(true);
  const [activeView, setActiveView] = useState('dashboard');
  const [activeSection, setActiveSection] = useState(1);
  const [selectedLocations, setSelectedLocations] = useState([]);
  const [selectedCampaigns, setSelectedCampaigns] = useState([]);
  const [selectedKeywords, setSelectedKeywords] = useState([]);
  const [selectedDays, setSelectedDays] = useState(['mon', 'tue', 'wed', 'thu', 'fri']);
  const [campaignData, setCampaignData] = useState({
    name: '',
    type: 'client',
    assignment: '',
    network: 'google',
    targetingType: 'local',
    savedConfig: 'none',
    category: 'plumbing',
    startDate: '',
    endDate: '',
    noEndDate: false,
    frequency: 'daily',
    runTime: '09:00',
    worker: 'default',
    adhocKeywords: ''
  });

  // Theme colors
  const theme = darkMode ? {
    bg: 'bg-black',
    bgSecondary: 'bg-zinc-900',
    bgTertiary: 'bg-zinc-800',
    border: 'border-zinc-800',
    text: 'text-white',
    textMuted: 'text-zinc-400',
    hover: 'hover:bg-zinc-800',
    selected: 'bg-blue-500/10 border-blue-500',
    input: 'bg-zinc-800 border-zinc-700 text-white',
    primary: 'bg-blue-500',
    primaryHover: 'hover:bg-blue-600'
  } : {
    bg: 'bg-gray-50',
    bgSecondary: 'bg-white',
    bgTertiary: 'bg-gray-100',
    border: 'border-gray-200',
    text: 'text-gray-900',
    textMuted: 'text-gray-600',
    hover: 'hover:bg-gray-50',
    selected: 'bg-blue-50 border-blue-500',
    input: 'bg-white border-gray-300 text-gray-900',
    primary: 'bg-blue-500',
    primaryHover: 'hover:bg-blue-600'
  };

  // Sample data
  const locations = [
    { id: 1, city: 'Phoenix', state: 'AZ', zip: '85001', population: '1.6M', income: '$57K', homes: '590K' },
    { id: 2, city: 'Scottsdale', state: 'AZ', zip: '85250', population: '255K', income: '$88K', homes: '122K' },
    { id: 3, city: 'Mesa', state: 'AZ', zip: '85201', population: '508K', income: '$53K', homes: '187K' },
    { id: 4, city: 'Tempe', state: 'AZ', zip: '85281', population: '195K', income: '$54K', homes: '78K' },
    { id: 5, city: 'Chandler', state: 'AZ', zip: '85224', population: '261K', income: '$82K', homes: '98K' },
    { id: 6, city: 'Gilbert', state: 'AZ', zip: '85295', population: '267K', income: '$95K', homes: '89K' }
  ];

  const campaigns = [
    { id: 1, name: 'Water Heater Services', keywords: 12, category: 'plumbing' },
    { id: 2, name: 'Emergency Plumbing', keywords: 8, category: 'plumbing' },
    { id: 3, name: 'Drain Cleaning', keywords: 15, category: 'plumbing' },
    { id: 4, name: 'Build Custom Campaign', keywords: 0, category: 'custom' }
  ];

  const keywords = [
    { id: 1, text: 'water heater repair', volume: '2.9K', cpc: '$12', competition: 'High' },
    { id: 2, text: 'water heater replacement', volume: '1.8K', cpc: '$15', competition: 'High' },
    { id: 3, text: 'tankless water heater', volume: '3.2K', cpc: '$18', competition: 'Med' },
    { id: 4, text: 'water heater installation', volume: '2.1K', cpc: '$14', competition: 'High' },
    { id: 5, text: 'hot water heater repair', volume: '1.5K', cpc: '$13', competition: 'Med' }
  ];

  const existingCampaigns = [
    { id: 1, name: 'Phoenix Plumbers Q1', client: 'ABC Plumbing Co.', keywords: 24, schedule: 'Daily @ 9:00 AM', status: 'active' },
    { id: 2, name: 'Las Vegas HVAC Services', client: 'Cool Air LLC', keywords: 18, schedule: 'Weekly @ 6:00 AM', status: 'paused' },
    { id: 3, name: 'Market Intel - Roofing', client: 'Internal', keywords: 45, schedule: 'Monthly @ 12:00 AM', status: 'completed' }
  ];

  const handleInputChange = (field, value) => {
    setCampaignData(prev => ({ ...prev, [field]: value }));
  };

  const toggleLocation = (locationId) => {
    setSelectedLocations(prev => 
      prev.includes(locationId) 
        ? prev.filter(id => id !== locationId)
        : [...prev, locationId]
    );
  };

  const toggleCampaign = (campaignId) => {
    setSelectedCampaigns(prev => 
      prev.includes(campaignId) 
        ? prev.filter(id => id !== campaignId)
        : [...prev, campaignId]
    );
  };

  const toggleKeyword = (keywordId) => {
    setSelectedKeywords(prev => 
      prev.includes(keywordId) 
        ? prev.filter(id => id !== keywordId)
        : [...prev, keywordId]
    );
  };

  const toggleDay = (day) => {
    setSelectedDays(prev => 
      prev.includes(day) 
        ? prev.filter(d => d !== day)
        : [...prev, day]
    );
  };

  const calculateSearchVolume = () => {
    const locationsCount = selectedLocations.length || 1;
    const keywordsCount = selectedKeywords.length + (campaignData.adhocKeywords ? campaignData.adhocKeywords.split(',').length : 0);
    const frequency = campaignData.frequency === 'daily' ? 30 : campaignData.frequency === 'weekly' ? 4 : 1;
    return locationsCount * keywordsCount * frequency;
  };

  // Navigation items
  const navItems = [
    { section: 'Main', items: [
      { icon: Layout, label: 'Dashboard', view: 'dashboard', active: activeView === 'dashboard' },
      { icon: Target, label: 'Campaigns', view: 'campaigns', active: activeView === 'campaigns' },
      { icon: Calendar, label: 'Schedule', view: 'schedule', active: activeView === 'schedule' },
      { icon: MapPin, label: 'Locations', view: 'locations', active: activeView === 'locations' }
    ]},
    { section: 'Data Management', items: [
      { icon: Database, label: 'Keyword Data', view: 'keywords', active: activeView === 'keywords' },
      { icon: BarChart3, label: 'Campaign Manager', view: 'campaign-manager', active: activeView === 'campaign-manager' },
      { icon: FileText, label: 'Flight Templates', view: 'templates', active: activeView === 'templates' }
    ]},
    { section: 'Management', items: [
      { icon: Users, label: 'Clients', view: 'clients', active: activeView === 'clients' },
      { icon: Building2, label: 'Advertisers', view: 'advertisers', active: activeView === 'advertisers' },
      { icon: Settings, label: 'App Configuration', view: 'settings', active: activeView === 'settings' }
    ]}
  ];

  // Location Builder Component (from previous implementation)
  const LocationBuilder = () => {
    const [searchResults, setSearchResults] = useState([]);
    const [centerCoords, setCenterCoords] = useState(null);
    const [savedLists, setSavedLists] = useState([]);
    const [isLoading, setIsLoading] = useState(false);

    const handleSearchResults = (results, coords) => {
      setSearchResults(results);
      setCenterCoords(coords);
    };

    const handleListSaved = () => {
      console.log('List saved');
    };

    return (
      <div className={`min-h-screen ${theme.bg}`}>
        <div className="w-full">
          {/* Header with search */}
          <div className={`${theme.bgSecondary} border-b ${theme.border} shadow-sm`}>
            <div className="max-w-full p-4">
              <div className="flex items-center justify-between">
                <div>
                  <h1 className={`text-2xl font-bold ${theme.text}`}>Location Builder</h1>
                </div>
                
                {/* Search bar */}
                <div className="flex-1 max-w-4xl mx-8">
                  <LocationFilters 
                    onSearchResults={handleSearchResults}
                    onListSaved={handleListSaved}
                    theme={theme}
                    darkMode={darkMode}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Map and Results */}
          <div className="flex" style={{ height: 'calc(100vh - 180px)' }}>
            {/* Map */}
            <div className={`flex-1 h-full ${darkMode ? 'bg-zinc-950' : 'bg-gray-100'}`}>
              <LocationMap 
                searchResults={searchResults}
                centerCoords={centerCoords}
                darkMode={darkMode}
              />
            </div>
            
            {/* Search Results */}
            {searchResults.length > 0 && (
              <div className={`w-[480px] border-l ${theme.bgSecondary} ${theme.border} h-full`}>
                <LocationResults 
                  searchResults={searchResults}
                  centerCoords={centerCoords}
                  onListSaved={handleListSaved}
                  theme={theme}
                  darkMode={darkMode}
                />
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className={`flex h-screen ${theme.bg} ${theme.text}`}>
      {/* Sidebar */}
      <aside className={`w-60 ${theme.bgSecondary} border-r ${theme.border}`}>
        <div className="p-6">
          <h1 className="text-xl font-semibold text-blue-500">SERP Analytics</h1>
        </div>
        
        <nav className="px-3">
          {navItems.map((section, idx) => (
            <div key={idx} className="mb-6">
              <h3 className={`px-3 mb-2 text-xs font-medium ${theme.textMuted} uppercase tracking-wider`}>
                {section.section}
              </h3>
              {section.items.map((item, itemIdx) => (
                <a
                  key={itemIdx}
                  href="#"
                  onClick={(e) => {
                    e.preventDefault();
                    setActiveView(item.view);
                  }}
                  className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
                    item.active 
                      ? 'bg-blue-500/10 text-blue-500 border-l-2 border-blue-500' 
                      : `${theme.textMuted} ${theme.hover}`
                  }`}
                >
                  <item.icon className="w-5 h-5" />
                  {item.label}
                </a>
              ))}
            </div>
          ))}
        </nav>

        {/* Theme Toggle - subtle in corner */}
        <div className="absolute bottom-4 right-4">
          <button
            onClick={() => setDarkMode(!darkMode)}
            className={`p-2 rounded-lg ${theme.bgTertiary} ${theme.hover} transition-colors`}
            title={darkMode ? 'Light mode' : 'Dark mode'}
          >
            {darkMode ? (
              <Sun className={`w-4 h-4 ${theme.textMuted}`} />
            ) : (
              <Moon className={`w-4 h-4 ${theme.textMuted}`} />
            )}
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col overflow-hidden">
        {activeView === 'locations' ? (
          <LocationBuilder />
        ) : (
          <>
            {/* Header */}
            <header className={`h-16 ${theme.bgSecondary} border-b ${theme.border} px-8 flex items-center justify-between`}>
              <div className={`flex items-center gap-2 text-sm ${theme.textMuted}`}>
                <span>Dashboard</span>
                <ChevronRight className="w-4 h-4" />
                <span className={theme.text}>Campaign Overview</span>
              </div>
              
              <div className="flex items-center gap-3">
                <button className={`w-10 h-10 rounded-lg ${theme.bgTertiary} border ${theme.border} flex items-center justify-center ${theme.hover} transition-colors`}>
                  <Bell className="w-5 h-5" />
                </button>
                <button className={`w-10 h-10 rounded-lg ${theme.bgTertiary} border ${theme.border} flex items-center justify-center ${theme.hover} transition-colors`}>
                  <User className="w-5 h-5" />
                </button>
              </div>
            </header>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-8">
              {/* Stats Grid */}
              <div className="grid grid-cols-4 gap-6 mb-8">
                <div className={`${theme.bgSecondary} border ${theme.border} rounded-lg p-6`}>
                  <p className={`text-sm ${theme.textMuted} mb-2`}>Active Campaigns</p>
                  <p className="text-3xl font-semibold mb-1">24</p>
                  <p className={`text-xs ${theme.textMuted}`}>8 upcoming campaigns</p>
                </div>
                <div className={`${theme.bgSecondary} border ${theme.border} rounded-lg p-6`}>
                  <p className={`text-sm ${theme.textMuted} mb-2`}>Scheduled Campaigns</p>
                  <p className="text-3xl font-semibold mb-1">12</p>
                  <p className={`text-xs ${theme.textMuted}`}>Campaigns scheduled today</p>
                </div>
                <div className={`${theme.bgSecondary} border ${theme.border} rounded-lg p-6`}>
                  <p className={`text-sm ${theme.textMuted} mb-2`}>Campaigns Completed</p>
                  <p className="text-3xl font-semibold mb-1">156</p>
                  <p className={`text-xs ${theme.textMuted}`}>This month across 10 active clients</p>
                </div>
                <div className={`${theme.bgSecondary} border ${theme.border} rounded-lg p-6`}>
                  <p className={`text-sm ${theme.textMuted} mb-2`}>Search Volume</p>
                  <p className="text-3xl font-semibold mb-1">48.2K</p>
                  <p className={`text-xs ${theme.textMuted}`}>Forecasted 72K through end of month</p>
                </div>
              </div>

              {/* Chart */}
              <div className={`${theme.bgSecondary} border ${theme.border} rounded-lg p-6 mb-8`}>
                <h3 className="text-lg font-semibold mb-4">Campaign Performance Overview</h3>
                <div className={`h-64 ${theme.bgTertiary} rounded-lg flex items-center justify-center ${theme.textMuted}`}>
                  <BarChart3 className="w-8 h-8 mr-2" />
                  [Bar Chart: Active | Scheduled | Completed | Search Volume]
                </div>
              </div>

              {/* Campaign Builder */}
              <div className={`${theme.bgSecondary} border ${theme.border} rounded-lg overflow-hidden`}>
                <div className={`p-6 border-b ${theme.border} flex items-center justify-between`}>
                  <h2 className="text-xl font-semibold">Create New Campaign</h2>
                  <div className="flex gap-3">
                    <button className={`px-4 py-2 ${theme.bgTertiary} border ${theme.border} rounded-lg text-sm font-medium ${theme.hover} transition-colors`}>
                      Save Draft
                    </button>
                    <button className="px-4 py-2 bg-blue-500 rounded-lg text-sm font-medium hover:bg-blue-600 transition-colors flex items-center gap-2 text-white">
                      <Plus className="w-4 h-4" />
                      Create Campaign
                    </button>
                  </div>
                </div>

                {/* Section 1: Campaign Details */}
                <div className={`border-b ${theme.border}`}>
                  <button
                    onClick={() => setActiveSection(activeSection === 1 ? null : 1)}
                    className={`w-full p-6 ${darkMode ? 'bg-zinc-800/50 hover:bg-zinc-800' : 'bg-gray-50 hover:bg-gray-100'} transition-colors flex items-center justify-between`}
                  >
                    <div className="flex items-center gap-3">
                      <span className="w-7 h-7 bg-blue-500 rounded-full flex items-center justify-center text-sm font-medium text-white">
                        1
                      </span>
                      <span className="font-medium">Campaign Details</span>
                    </div>
                    <ChevronDown className={`w-5 h-5 transition-transform ${activeSection === 1 ? 'rotate-180' : ''}`} />
                  </button>
                  
                  {activeSection === 1 && (
                    <div className="p-6">
                      <div className="grid grid-cols-2 gap-6">
                        <div>
                          <label className="block text-sm font-medium mb-2">Campaign Name</label>
                          <input
                            type="text"
                            value={campaignData.name}
                            onChange={(e) => handleInputChange('name', e.target.value)}
                            className={`w-full px-4 py-2 rounded-lg focus:outline-none focus:border-blue-500 ${theme.input}`}
                            placeholder="e.g., Phoenix Plumbers Q1 2024"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium mb-2">Campaign Type</label>
                          <select
                            value={campaignData.type}
                            onChange={(e) => handleInputChange('type', e.target.value)}
                            className={`w-full px-4 py-2 rounded-lg focus:outline-none focus:border-blue-500 ${theme.input}`}
                          >
                            <option value="client">Client Campaign</option>
                            <option value="market">Market Campaign</option>
                            <option value="prospect">Prospect Campaign</option>
                            <option value="data">Data Collection</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-sm font-medium mb-2">Assignment</label>
                          <select
                            value={campaignData.assignment}
                            onChange={(e) => handleInputChange('assignment', e.target.value)}
                            className={`w-full px-4 py-2 rounded-lg focus:outline-none focus:border-blue-500 ${theme.input}`}
                          >
                            <option value="">Select Client/Market/Prospect</option>
                            <option value="abc-plumbing">ABC Plumbing Co.</option>
                            <option value="xyz-hvac">XYZ HVAC Services</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-sm font-medium mb-2">Network</label>
                          <select
                            value={campaignData.network}
                            onChange={(e) => handleInputChange('network', e.target.value)}
                            className={`w-full px-4 py-2 rounded-lg focus:outline-none focus:border-blue-500 ${theme.input}`}
                          >
                            <option value="google">Google</option>
                            <option value="bing">Bing</option>
                          </select>
                        </div>
                      </div>
                      <div className="flex justify-end mt-6">
                        <button 
                          onClick={() => setActiveSection(2)}
                          className="px-4 py-2 bg-blue-500 rounded-lg text-sm font-medium hover:bg-blue-600 transition-colors text-white"
                        >
                          Save & Continue
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                {/* Section 2: Choose Locations */}
                <div className={`border-b ${theme.border}`}>
                  <button
                    onClick={() => setActiveSection(activeSection === 2 ? null : 2)}
                    className={`w-full p-6 ${darkMode ? 'bg-zinc-800/50 hover:bg-zinc-800' : 'bg-gray-50 hover:bg-gray-100'} transition-colors flex items-center justify-between`}
                  >
                    <div className="flex items-center gap-3">
                      <span className="w-7 h-7 bg-blue-500 rounded-full flex items-center justify-center text-sm font-medium text-white">
                        2
                      </span>
                      <span className="font-medium">Choose Locations</span>
                    </div>
                    <ChevronDown className={`w-5 h-5 transition-transform ${activeSection === 2 ? 'rotate-180' : ''}`} />
                  </button>
                  
                  {activeSection === 2 && (
                    <div className="p-6">
                      <div className="grid grid-cols-2 gap-6 mb-6">
                        <div>
                          <label className="block text-sm font-medium mb-2">Location Targeting Type</label>
                          <select
                            value={campaignData.targetingType}
                            onChange={(e) => handleInputChange('targetingType', e.target.value)}
                            className={`w-full px-4 py-2 rounded-lg focus:outline-none focus:border-blue-500 ${theme.input}`}
                          >
                            <option value="local">Local (City/Zip Radius)</option>
                            <option value="regional">Regional (Market Based)</option>
                            <option value="timezone">Time Zone (State/County)</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-sm font-medium mb-2">Saved Location Configuration</label>
                          <select
                            value={campaignData.savedConfig}
                            onChange={(e) => handleInputChange('savedConfig', e.target.value)}
                            className={`w-full px-4 py-2 rounded-lg focus:outline-none focus:border-blue-500 ${theme.input}`}
                          >
                            <option value="none">None</option>
                            <option value="saved">My Saved Locations</option>
                          </select>
                        </div>
                      </div>

                      <div className="grid grid-cols-[25%_75%] gap-6 h-96">
                        <div className={`${theme.bgTertiary} rounded-lg p-4 overflow-y-auto`}>
                          <div className="space-y-2 mb-4">
                            <input
                              type="text"
                              placeholder="Filter by city..."
                              className={`w-full px-3 py-1.5 ${theme.input} rounded text-sm`}
                            />
                            <input
                              type="number"
                              placeholder="Min population"
                              className={`w-full px-3 py-1.5 ${theme.input} rounded text-sm`}
                            />
                            <input
                              type="number"
                              placeholder="Min income"
                              className={`w-full px-3 py-1.5 ${theme.input} rounded text-sm`}
                            />
                          </div>
                          
                          <div className="space-y-2">
                            {locations.map(location => (
                              <div
                                key={location.id}
                                onClick={() => toggleLocation(location.id)}
                                className={`p-3 ${theme.bgSecondary} rounded-lg cursor-pointer transition-all ${
                                  selectedLocations.includes(location.id) 
                                    ? 'border border-blue-500 bg-blue-500/10' 
                                    : `border ${theme.border} ${theme.hover}`
                                }`}
                              >
                                <div className="font-medium text-sm">{location.city}, {location.state} • {location.zip}</div>
                                <div className={`text-xs ${theme.textMuted}`}>
                                  Pop: {location.population} | Income: {location.income} | Homes: {location.homes}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                        
                        <div className={`${theme.bgTertiary} rounded-lg flex items-center justify-center ${theme.textMuted}`}>
                          <MapPin className="w-8 h-8 mr-2" />
                          [Google Maps with Location Pins]
                        </div>
                      </div>
                      
                      <div className="flex justify-end mt-6">
                        <button 
                          onClick={() => setActiveSection(3)}
                          className="px-4 py-2 bg-blue-500 rounded-lg text-sm font-medium hover:bg-blue-600 transition-colors text-white"
                        >
                          Save & Continue
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                {/* Section 3: Keyword Selection */}
                <div className={`border-b ${theme.border}`}>
                  <button
                    onClick={() => setActiveSection(activeSection === 3 ? null : 3)}
                    className={`w-full p-6 ${darkMode ? 'bg-zinc-800/50 hover:bg-zinc-800' : 'bg-gray-50 hover:bg-gray-100'} transition-colors flex items-center justify-between`}
                  >
                    <div className="flex items-center gap-3">
                      <span className="w-7 h-7 bg-blue-500 rounded-full flex items-center justify-center text-sm font-medium text-white">
                        3
                      </span>
                      <span className="font-medium">Keyword Selection</span>
                    </div>
                    <ChevronDown className={`w-5 h-5 transition-transform ${activeSection === 3 ? 'rotate-180' : ''}`} />
                  </button>
                  
                  {activeSection === 3 && (
                    <div className="p-6">
                      <div className="mb-6">
                        <label className="block text-sm font-medium mb-2">Category</label>
                        <select
                          value={campaignData.category}
                          onChange={(e) => handleInputChange('category', e.target.value)}
                          className={`w-full px-4 py-2 rounded-lg focus:outline-none focus:border-blue-500 ${theme.input}`}
                        >
                          <option value="plumbing">Plumbing</option>
                          <option value="hvac">HVAC</option>
                          <option value="roofing">Roofing</option>
                          <option value="electrical">Electrical</option>
                        </select>
                      </div>

                      <div className="grid grid-cols-2 gap-6 h-96">
                        <div className={`${theme.bgTertiary} rounded-lg p-4 overflow-y-auto`}>
                          <h4 className="font-medium mb-4">Campaigns</h4>
                          <div className="space-y-3">
                            {campaigns.map(campaign => (
                              <div
                                key={campaign.id}
                                onClick={() => toggleCampaign(campaign.id)}
                                className={`p-4 ${theme.bgSecondary} border rounded-lg cursor-pointer transition-all ${
                                  selectedCampaigns.includes(campaign.id)
                                    ? 'border-blue-500 bg-blue-500/10'
                                    : `${theme.border} ${theme.hover}`
                                }`}
                              >
                                <div className="font-medium">{campaign.name}</div>
                                <div className={`text-sm ${theme.textMuted}`}>{campaign.keywords} keywords</div>
                              </div>
                            ))}
                          </div>
                        </div>
                        
                        <div className={`${theme.bgTertiary} rounded-lg p-4 overflow-y-auto`}>
                          <h4 className="font-medium mb-4">Keywords</h4>
                          <div className="space-y-2">
                            {keywords.map(keyword => (
                              <div
                                key={keyword.id}
                                onClick={() => toggleKeyword(keyword.id)}
                                className={`p-3 ${theme.bgSecondary} border rounded-lg cursor-pointer transition-all ${
                                  selectedKeywords.includes(keyword.id)
                                    ? 'border-blue-500 bg-blue-500/10'
                                    : `${theme.border} ${theme.hover}`
                                }`}
                              >
                                <div className="flex justify-between items-center">
                                  <div className="font-medium text-sm">{keyword.text}</div>
                                  <div className={`flex gap-4 text-xs ${theme.textMuted}`}>
                                    <span>Vol: {keyword.volume}</span>
                                    <span>CPC: {keyword.cpc}</span>
                                    <span>Comp: {keyword.competition}</span>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                      
                      <div className="mt-4">
                        <label className="block text-sm font-medium mb-2">Additional Ad-hoc Keywords (comma separated)</label>
                        <input
                          type="text"
                          value={campaignData.adhocKeywords}
                          onChange={(e) => handleInputChange('adhocKeywords', e.target.value)}
                          className={`w-full px-4 py-2 rounded-lg focus:outline-none focus:border-blue-500 ${theme.input}`}
                          placeholder="Enter custom keywords..."
                        />
                      </div>
                      
                      <div className="flex justify-end mt-6">
                        <button 
                          onClick={() => setActiveSection(4)}
                          className="px-4 py-2 bg-blue-500 rounded-lg text-sm font-medium hover:bg-blue-600 transition-colors text-white"
                        >
                          Save & Continue
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                {/* Section 4: Schedule */}
                <div className={`border-b ${theme.border}`}>
                  <button
                    onClick={() => setActiveSection(activeSection === 4 ? null : 4)}
                    className={`w-full p-6 ${darkMode ? 'bg-zinc-800/50 hover:bg-zinc-800' : 'bg-gray-50 hover:bg-gray-100'} transition-colors flex items-center justify-between`}
                  >
                    <div className="flex items-center gap-3">
                      <span className="w-7 h-7 bg-blue-500 rounded-full flex items-center justify-center text-sm font-medium text-white">
                        4
                      </span>
                      <span className="font-medium">Schedule Configuration</span>
                    </div>
                    <ChevronDown className={`w-5 h-5 transition-transform ${activeSection === 4 ? 'rotate-180' : ''}`} />
                  </button>
                  
                  {activeSection === 4 && (
                    <div className="p-6">
                      <div className="grid grid-cols-2 gap-6 mb-6">
                        <div>
                          <label className="block text-sm font-medium mb-2">Campaign Start Date</label>
                          <input
                            type="date"
                            value={campaignData.startDate}
                            onChange={(e) => handleInputChange('startDate', e.target.value)}
                            className={`w-full px-4 py-2 rounded-lg focus:outline-none focus:border-blue-500 ${theme.input}`}
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium mb-2">Campaign End Date</label>
                          <input
                            type="date"
                            value={campaignData.endDate}
                            onChange={(e) => handleInputChange('endDate', e.target.value)}
                            disabled={campaignData.noEndDate}
                            className={`w-full px-4 py-2 rounded-lg focus:outline-none focus:border-blue-500 disabled:opacity-50 ${theme.input}`}
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
                        <div className="flex gap-3">
                          {['daily', 'weekly', 'monthly', 'bi-monthly', 'specific'].map((freq) => (
                            <button
                              key={freq}
                              onClick={() => handleInputChange('frequency', freq)}
                              className={`px-4 py-2 rounded-lg border transition-all ${
                                campaignData.frequency === freq
                                  ? 'bg-blue-500/20 border-blue-500 text-blue-400'
                                  : `${theme.bgTertiary} ${theme.border} ${theme.hover}`
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
                            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day, idx) => (
                              <button
                                key={day}
                                onClick={() => toggleDay(day.toLowerCase())}
                                className={`p-3 rounded-lg border transition-all ${
                                  selectedDays.includes(day.toLowerCase())
                                    ? 'bg-blue-500/20 border-blue-500 text-blue-400'
                                    : `${theme.bgTertiary} ${theme.border} ${theme.hover}`
                                }`}
                              >
                                {day}
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
                          className={`w-full px-4 py-2 rounded-lg focus:outline-none focus:border-blue-500 ${theme.input}`}
                        />
                      </div>
                      
                      <div className="flex justify-end mt-6">
                        <button 
                          onClick={() => setActiveSection(5)}
                          className="px-4 py-2 bg-blue-500 rounded-lg text-sm font-medium hover:bg-blue-600 transition-colors text-white"
                        >
                          Save & Continue
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                {/* Section 5: Preflight Checklist */}
                <div>
                  <button
                    onClick={() => setActiveSection(activeSection === 5 ? null : 5)}
                    className={`w-full p-6 ${darkMode ? 'bg-zinc-800/50 hover:bg-zinc-800' : 'bg-gray-50 hover:bg-gray-100'} transition-colors flex items-center justify-between`}
                  >
                    <div className="flex items-center gap-3">
                      <span className="w-7 h-7 bg-blue-500 rounded-full flex items-center justify-center text-sm font-medium text-white">
                        5
                      </span>
                      <span className="font-medium">Preflight Checklist</span>
                    </div>
                    <ChevronDown className={`w-5 h-5 transition-transform ${activeSection === 5 ? 'rotate-180' : ''}`} />
                  </button>
                  
                  {activeSection === 5 && (
                    <div className="p-6">
                      <div className={`${theme.bgTertiary} rounded-lg p-6 mb-6`}>
                        <div className="space-y-3">
                          <div className={`flex justify-between py-2 border-b ${theme.border}`}>
                            <span className={theme.textMuted}>Campaign Name</span>
                            <span className="font-medium">{campaignData.name || 'Not set'}</span>
                          </div>
                          <div className={`flex justify-between py-2 border-b ${theme.border}`}>
                            <span className={theme.textMuted}>Type</span>
                            <span className="font-medium">{campaignData.type} Campaign</span>
                          </div>
                          <div className={`flex justify-between py-2 border-b ${theme.border}`}>
                            <span className={theme.textMuted}>Network</span>
                            <span className="font-medium">{campaignData.network}</span>
                          </div>
                          <div className={`flex justify-between py-2 border-b ${theme.border}`}>
                            <span className={theme.textMuted}>Locations</span>
                            <span className="font-medium">{selectedLocations.length} cities selected</span>
                          </div>
                          <div className={`flex justify-between py-2 border-b ${theme.border}`}>
                            <span className={theme.textMuted}>Keywords</span>
                            <span className="font-medium">{selectedKeywords.length} keywords</span>
                          </div>
                          <div className={`flex justify-between py-2 border-b ${theme.border}`}>
                            <span className={theme.textMuted}>Schedule</span>
                            <span className="font-medium">{campaignData.frequency} @ {campaignData.runTime}</span>
                          </div>
                          <div className="flex justify-between py-2">
                            <span className={theme.textMuted}>Est. Monthly Searches</span>
                            <span className="font-medium">{calculateSearchVolume().toLocaleString()} searches</span>
                          </div>
                        </div>
                      </div>

                      <div className="mb-6">
                        <label className="block text-sm font-medium mb-2">Choose Worker (API User)</label>
                        <select
                          value={campaignData.worker}
                          onChange={(e) => handleInputChange('worker', e.target.value)}
                          className={`w-full px-4 py-2 rounded-lg focus:outline-none focus:border-blue-500 ${theme.input}`}
                        >
                          <option value="default">Default Worker</option>
                          <option value="worker2">Worker 2</option>
                          <option value="worker3">Worker 3</option>
                        </select>
                      </div>

                      <div className="flex justify-end gap-3">
                        <button className={`px-4 py-2 ${theme.bgTertiary} border ${theme.border} rounded-lg text-sm font-medium ${theme.hover} transition-colors`}>
                          Save as Template
                        </button>
                        <button className={`px-4 py-2 ${theme.bgTertiary} border ${theme.border} rounded-lg text-sm font-medium ${theme.hover} transition-colors`}>
                          Save
                        </button>
                        <button className="px-4 py-2 bg-blue-500 rounded-lg text-sm font-medium hover:bg-blue-600 transition-colors text-white">
                          Schedule Now
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Job List */}
              <div className={`${theme.bgSecondary} border ${theme.border} rounded-lg mt-8`}>
                <div className={`p-4 border-b ${theme.border} flex items-center justify-between`}>
                  <div className="flex-1 max-w-md relative">
                    <Search className={`absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 ${theme.textMuted}`} />
                    <input
                      type="text"
                      placeholder="Search campaigns..."
                      className={`w-full pl-12 pr-4 py-2 rounded-lg focus:outline-none focus:border-blue-500 ${theme.input}`}
                    />
                  </div>
                  <div className="flex gap-2">
                    <button className={`px-4 py-2 ${theme.bgTertiary} border ${theme.border} rounded-lg text-sm font-medium ${theme.hover} transition-colors`}>
                      Filter
                    </button>
                    <button className={`px-4 py-2 ${theme.bgTertiary} border ${theme.border} rounded-lg text-sm font-medium ${theme.hover} transition-colors`}>
                      Export
                    </button>
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className={`${theme.bgTertiary} text-xs font-medium ${theme.textMuted} uppercase tracking-wider`}>
                        <th className="px-6 py-3 text-left">Campaign Name</th>
                        <th className="px-6 py-3 text-left">Client</th>
                        <th className="px-6 py-3 text-left">Keywords</th>
                        <th className="px-6 py-3 text-left">Schedule</th>
                        <th className="px-6 py-3 text-left">Status</th>
                        <th className="px-6 py-3 text-left">Actions</th>
                      </tr>
                    </thead>
                    <tbody className={`divide-y ${theme.border}`}>
                      {existingCampaigns.map((campaign) => (
                        <tr key={campaign.id} className={`${theme.hover} transition-colors`}>
                          <td className="px-6 py-4">{campaign.name}</td>
                          <td className="px-6 py-4">{campaign.client}</td>
                          <td className="px-6 py-4">{campaign.keywords} keywords</td>
                          <td className="px-6 py-4">{campaign.schedule}</td>
                          <td className="px-6 py-4">
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                              campaign.status === 'active' ? 'bg-green-500/20 text-green-400' :
                              campaign.status === 'paused' ? 'bg-yellow-500/20 text-yellow-400' :
                              'bg-gray-500/20 text-gray-400'
                            }`}>
                              {campaign.status}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex gap-2">
                              <button className={`p-1.5 rounded ${theme.bgTertiary} ${theme.hover} transition-colors`}>
                                <Edit className="w-4 h-4" />
                              </button>
                              <button className={`p-1.5 rounded ${theme.bgTertiary} ${theme.hover} transition-colors`}>
                                <Copy className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Supporting Pages */}
              <div className={`${theme.bgSecondary} border ${theme.border} rounded-lg p-6 mt-8`}>
                <h3 className="text-lg font-semibold mb-6">Supporting Pages</h3>
                <div className="grid grid-cols-4 gap-4">
                  {[
                    { icon: Calendar, title: 'Schedule', desc: 'Manage job schedules' },
                    { icon: Database, title: 'Keyword Data', desc: 'Browse keyword metrics' },
                    { icon: BarChart3, title: 'Campaign Manager', desc: 'Build keyword campaigns' },
                    { icon: MapPin, title: 'Location Manager', desc: 'Configure locations' },
                    { icon: FileText, title: 'Flight Templates', desc: 'Save campaign templates' },
                    { icon: Settings, title: 'App Configuration', desc: 'System settings' },
                    { icon: Users, title: 'Clients', desc: 'Manage client accounts' },
                    { icon: Building2, title: 'Advertisers', desc: 'Advertiser management' }
                  ].map((page, idx) => (
                    <div
                      key={idx}
                      className={`${theme.bgTertiary} border ${theme.border} rounded-lg p-6 text-center cursor-pointer ${theme.hover} transition-all hover:-translate-y-0.5`}
                    >
                      <page.icon className={`w-12 h-12 mx-auto mb-3 ${theme.textMuted}`} />
                      <h4 className="font-medium mb-1">{page.title}</h4>
                      <p className={`text-xs ${theme.textMuted}`}>{page.desc}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </>
        )}
      </main>
    </div>
  );
};

// Location Components (simplified versions - would be imported in real app)
const LocationFilters = ({ onSearchResults, onListSaved, theme, darkMode }) => {
  const [filters, setFilters] = useState({
    centerZipCode: '',
    radiusMiles: 50
  });
  const [isSearching, setIsSearching] = useState(false);

  const handleSearch = () => {
    if (!filters.centerZipCode.trim()) {
      alert('Please enter a ZIP code');
      return;
    }
    
    setIsSearching(true);
    // Simulate search
    setTimeout(() => {
      const mockResults = [
        { id: 1, city: 'Phoenix', state_name: 'AZ', county_name: 'Maricopa', postal_code: '85001', latitude: 33.4484, longitude: -112.0740, distance_miles: 0, population: 1608000, age_median: 34, income_household_median: 57000, housing_units: 590000, home_value: 285000, home_ownership: 54.2 },
        { id: 2, city: 'Scottsdale', state_name: 'AZ', county_name: 'Maricopa', postal_code: '85250', latitude: 33.4942, longitude: -111.9261, distance_miles: 12.3, population: 255000, age_median: 45, income_household_median: 88000, housing_units: 122000, home_value: 475000, home_ownership: 70.1 },
      ];
      onSearchResults(mockResults, { lat: 33.4484, lng: -112.0740 });
      setIsSearching(false);
    }, 1000);
  };

  return (
    <div className="flex items-center gap-4">
      <div>
        <input
          type="text"
          value={filters.centerZipCode}
          onChange={(e) => setFilters(prev => ({ ...prev, centerZipCode: e.target.value }))}
          placeholder="ZIP code"
          className={`px-4 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${theme.input}`}
        />
      </div>
      
      <div className="flex-1">
        <label className={`text-sm ${theme.textMuted} block mb-1`}>
          Radius: {filters.radiusMiles} miles
        </label>
        <input
          type="range"
          min="5"
          max="250"
          step="5"
          value={filters.radiusMiles}
          onChange={(e) => setFilters(prev => ({ ...prev, radiusMiles: parseInt(e.target.value) }))}
          className="w-full"
        />
      </div>

      <button
        onClick={handleSearch}
        disabled={isSearching}
        className="px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors disabled:opacity-50"
      >
        <Search className="h-4 w-4 mr-2 inline-block" />
        {isSearching ? 'Searching...' : 'Search'}
      </button>
    </div>
  );
};

const LocationMap = ({ searchResults, centerCoords, darkMode }) => {
  if (!centerCoords) {
    return (
      <div className={`h-full flex items-center justify-center ${darkMode ? 'bg-zinc-950' : 'bg-gray-50'}`}>
        <div className={`text-center ${darkMode ? 'text-zinc-500' : 'text-gray-500'}`}>
          <MapPin className="h-16 w-16 mx-auto mb-4 opacity-30" />
          <p className="text-lg">Enter a ZIP code and search to see locations on the map</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full w-full relative">
      <div className={`h-full flex items-center justify-center ${darkMode ? 'bg-zinc-950' : 'bg-gray-100'}`}>
        <div className={`text-center ${darkMode ? 'text-zinc-500' : 'text-gray-500'}`}>
          <MapPin className="h-16 w-16 mx-auto mb-4 opacity-30" />
          <p className="text-lg">Map showing {searchResults.length} locations</p>
        </div>
      </div>
    </div>
  );
};

const LocationResults = ({ searchResults, centerCoords, onListSaved, theme, darkMode }) => {
  const [selectedCities, setSelectedCities] = useState(new Set());

  if (searchResults.length === 0) return null;

  return (
    <div className="h-full flex flex-col">
      <div className={`p-4 border-b ${theme.border}`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <MapPin className="w-5 h-5" />
            <span className="font-semibold">Locations</span>
            <span className={`px-2 py-1 rounded-full text-xs ${theme.bgTertiary}`}>
              {searchResults.length} cities
            </span>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        <div className="space-y-4">
          {searchResults.map((location, index) => (
            <div key={index} className={`border rounded-lg p-4 ${theme.bgSecondary} ${theme.border}`}>
              <h3 className="font-semibold">{location.city}, {location.state_name}</h3>
              <p className={`text-sm ${theme.textMuted}`}>
                {location.county_name} County • {location.postal_code}
              </p>
              <div className="grid grid-cols-2 gap-2 mt-2 text-sm">
                <div>Pop: {location.population?.toLocaleString()}</div>
                <div>Income: ${location.income_household_median?.toLocaleString()}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Preview;