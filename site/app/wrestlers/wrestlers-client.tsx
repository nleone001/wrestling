'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

interface WrestlerMatch {
  wrestler: string;
  opponent: string;
  result: 'Win' | 'Loss';
  wrestler_school: string;
  opponent_school: string;
  date: string;
  wt: number;
  location: string;
  event: string;
  score: string;
  result_type: string;
  criteria: string | null;
  fall_time: number | null;
  wrestler_score: number | null;
  opponent_score: number | null;
  dominance_score: number;
}

interface School {
  school: string;
  conference_2025: string | null;
  twitter: string;
  instagram: string;
  primary_color_1: string;
  primary_color_2: string | null;
  secondary_color_1: string | null;
  secondary_color_2: string | null;
}

interface WrestlerStats {
  name: string;
  school: string;
  conference: string | null;
  wins: number;
  losses: number;
  totalMatches: number;
  winPercentage: number;
  weightClasses: number[];
  primaryWeight: number;
  falls: number;
  techFalls: number;
  majors: number;
  decisions: number;
  dominanceScore: number;
}

export default function WrestlersClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  const [selectedWrestler, setSelectedWrestler] = useState<string>('');
  const [allMatches, setAllMatches] = useState<WrestlerMatch[]>([]);
  const [wrestlerMatches, setWrestlerMatches] = useState<WrestlerMatch[]>([]);
  const [schools, setSchools] = useState<School[]>([]);
  const [loading, setLoading] = useState(true);
  const [conferenceFilter, setConferenceFilter] = useState<string>('all');
  const [schoolFilter, setSchoolFilter] = useState<string>('all');
  const [seasonFilter, setSeasonFilter] = useState<string>('2024-2025');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [showCopied, setShowCopied] = useState(false);
  const [showStackedBar, setShowStackedBar] = useState(false);

  // Initialize state from URL params
  useEffect(() => {
    const wrestler = searchParams.get('wrestler') || '';
    const conference = searchParams.get('conference') || 'all';
    const school = searchParams.get('school') || 'all';
    const season = searchParams.get('season') || '2024-2025';
    
    setSelectedWrestler(wrestler);
    setConferenceFilter(conference);
    setSchoolFilter(school);
    setSeasonFilter(season);
  }, [searchParams]);

  // Update URL when filters change
  const updateURL = (newParams: { wrestler?: string; conference?: string; school?: string; season?: string }) => {
    const params = new URLSearchParams(searchParams.toString());
    
    if (newParams.wrestler !== undefined) {
      if (newParams.wrestler) params.set('wrestler', newParams.wrestler);
      else params.delete('wrestler');
    }
    
    if (newParams.conference !== undefined) {
      if (newParams.conference !== 'all') params.set('conference', newParams.conference);
      else params.delete('conference');
    }
    
    if (newParams.school !== undefined) {
      if (newParams.school !== 'all') params.set('school', newParams.school);
      else params.delete('school');
    }
    
    if (newParams.season !== undefined) {
      if (newParams.season !== '2024-2025') params.set('season', newParams.season);
      else params.delete('season');
    }
    
    router.replace(`/wrestlers?${params.toString()}`, { scroll: false });
  };

  // Copy URL to clipboard
  const copyURL = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setShowCopied(true);
      setTimeout(() => setShowCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy URL:', err);
    }
  };

  // Load all data
  useEffect(() => {
    async function loadData() {
      try {
        const [matchesResponse, schoolsResponse] = await Promise.all([
          fetch('/data/wrestlers-2025.json'),
          fetch('/data/schools.json')
        ]);
        
        const matches: WrestlerMatch[] = await matchesResponse.json();
        const schoolsData: School[] = await schoolsResponse.json();
        
        setAllMatches(matches);
        setSchools(schoolsData);
        setLoading(false);
      } catch (error) {
        console.error('Error loading data:', error);
        setLoading(false);
      }
    }

    loadData();
  }, []);

  // Get unique wrestlers with their stats
  const wrestlersData = useMemo(() => {
    if (allMatches.length === 0 || schools.length === 0) return [];
    
    const schoolConferenceMap = new Map<string, string | null>();
    schools.forEach(school => {
      schoolConferenceMap.set(school.school, school.conference_2025);
    });
    
    const wrestlerMap = new Map<string, WrestlerMatch[]>();
    
    // Group matches by wrestler
    allMatches.forEach(match => {
      const key = `${match.wrestler}|${match.wrestler_school}`;
      if (!wrestlerMap.has(key)) {
        wrestlerMap.set(key, []);
      }
      wrestlerMap.get(key)!.push(match);
    });
    
    // Calculate stats for each wrestler
    const wrestlers: WrestlerStats[] = [];
    wrestlerMap.forEach((matches, key) => {
      const [name, school] = key.split('|');
      const conference = schoolConferenceMap.get(school);
      
      // Only include D1 wrestlers (those from schools with conferences)
      if (!conference) return;
      
      const wins = matches.filter(m => m.result === 'Win').length;
      const losses = matches.filter(m => m.result === 'Loss').length;
      const weightClasses = [...new Set(matches.map(m => m.wt))].sort((a, b) => a - b);
      
      // Find primary weight class (most matches)
      const weightCounts = new Map<number, number>();
      matches.forEach(m => {
        weightCounts.set(m.wt, (weightCounts.get(m.wt) || 0) + 1);
      });
      const primaryWeight = [...weightCounts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] || 0;
      
      // Count result types (only from wins)
      const falls = matches.filter(m => m.result === 'Win' && m.result_type === 'Fall').length;
      const techFalls = matches.filter(m => m.result === 'Win' && m.result_type === 'Technical Fall').length;
      const majors = matches.filter(m => m.result === 'Win' && m.result_type === 'Major Decision').length;
      const decisions = matches.filter(m => m.result === 'Win' && m.result_type === 'Decision').length;
      
      // Calculate average dominance score
      const totalDominanceScore = matches.reduce((sum, match) => sum + match.dominance_score, 0);
      const dominanceScore = matches.length > 0 ? totalDominanceScore / matches.length : 0;
      
      wrestlers.push({
        name,
        school,
        conference,
        wins,
        losses,
        totalMatches: wins + losses,
        winPercentage: wins + losses > 0 ? (wins / (wins + losses)) * 100 : 0,
        weightClasses,
        primaryWeight,
        falls,
        techFalls,
        majors,
        decisions,
        dominanceScore
      });
    });
    
    // Sort by win percentage
    wrestlers.sort((a, b) => b.winPercentage - a.winPercentage);
    
    return wrestlers;
  }, [allMatches, schools]);

  // Filter wrestlers based on filters and search
  const filteredWrestlers = useMemo(() => {
    let filtered = wrestlersData;
    
    if (conferenceFilter !== 'all') {
      filtered = filtered.filter(w => w.conference === conferenceFilter);
    }
    
    if (schoolFilter !== 'all') {
      filtered = filtered.filter(w => w.school === schoolFilter);
    }
    
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(w => w.name.toLowerCase().includes(query));
    }
    
    return filtered;
  }, [wrestlersData, conferenceFilter, schoolFilter, searchQuery]);

  // Load matches for selected wrestler
  useEffect(() => {
    if (!selectedWrestler || allMatches.length === 0) {
      setWrestlerMatches([]);
      return;
    }

    const selectedWrestlerData = wrestlersData.find(w => w.name === selectedWrestler);
    if (!selectedWrestlerData) {
      setWrestlerMatches([]);
      return;
    }

    const matches = allMatches.filter(
      m => m.wrestler === selectedWrestler && m.wrestler_school === selectedWrestlerData.school
    );
    
    // Sort by date (most recent first)
    matches.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    
    setWrestlerMatches(matches);
  }, [selectedWrestler, allMatches, wrestlersData]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading wrestler data...</p>
        </div>
      </div>
    );
  }

  const selectedWrestlerData = wrestlersData.find(w => w.name === selectedWrestler);
  const wrestlerColor = selectedWrestlerData 
    ? schools.find(s => s.school === selectedWrestlerData.school)?.primary_color_1 || '#3B82F6'
    : '#3B82F6';

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-4xl font-bold text-gray-900 mb-2">Wrestler Results</h1>
              <p className="text-gray-600">Select a wrestler to view their individual match results</p>
            </div>
            <button
              onClick={copyURL}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
            >
              {showCopied ? (
                <>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  Copied!
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.367 2.684 3 3 0 00-5.367-2.684z" />
                  </svg>
                  Share
                </>
              )}
            </button>
          </div>
        </div>

        {/* Wrestler Selection */}
        <div className="bg-white rounded-lg shadow-lg p-6 mb-8">
          {/* Filter Bar */}
          <div className="flex flex-wrap gap-4 mb-4">
            <div className="flex items-center gap-2">
              <label className="text-sm font-medium text-gray-700">Season:</label>
              <select
                value={seasonFilter}
                onChange={(e) => {
                  const newSeason = e.target.value;
                  setSeasonFilter(newSeason);
                  updateURL({ season: newSeason });
                }}
                className="px-3 py-1 border border-gray-300 rounded-md text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="2024-2025">2024-2025</option>
              </select>
            </div>
            
            <div className="flex items-center gap-2">
              <label className="text-sm font-medium text-gray-700">Conference:</label>
              <select
                value={conferenceFilter}
                onChange={(e) => {
                  const newConference = e.target.value;
                  setConferenceFilter(newConference);
                  setSchoolFilter('all'); // Reset school filter when conference changes
                  updateURL({ conference: newConference, school: 'all' });
                }}
                className="px-3 py-1 border border-gray-300 rounded-md text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">All Conferences</option>
                {Array.from(new Set(wrestlersData.map(w => w.conference).filter(Boolean))).sort().map(conference => (
                  <option key={conference} value={conference!}>{conference}</option>
                ))}
              </select>
            </div>
            
            <div className="flex items-center gap-2">
              <label className="text-sm font-medium text-gray-700">School:</label>
              <select
                value={schoolFilter}
                onChange={(e) => {
                  const newSchool = e.target.value;
                  setSchoolFilter(newSchool);
                  updateURL({ school: newSchool });
                }}
                className="px-3 py-1 border border-gray-300 rounded-md text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">All Schools</option>
                {Array.from(new Set(
                  wrestlersData
                    .filter(w => conferenceFilter === 'all' || w.conference === conferenceFilter)
                    .map(w => w.school)
                )).sort().map(school => (
                  <option key={school} value={school}>{school}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Search Bar */}
          <div className="mb-4">
            <label htmlFor="wrestler-search" className="block text-sm font-medium text-gray-700 mb-2">
              Search Wrestler by Name
            </label>
            <input
              id="wrestler-search"
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Type wrestler name..."
              className="w-full max-w-md px-3 py-2 border border-gray-300 rounded-md shadow-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          
          {/* Wrestler Select Dropdown */}
          <label htmlFor="wrestler-select" className="block text-sm font-medium text-gray-700 mb-2">
            Select Wrestler
          </label>
          <select
            id="wrestler-select"
            value={selectedWrestler}
            onChange={(e) => {
              const newWrestler = e.target.value;
              setSelectedWrestler(newWrestler);
              updateURL({ wrestler: newWrestler });
            }}
            className="w-full max-w-2xl px-3 py-2 border border-gray-300 rounded-md shadow-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="">Choose a wrestler...</option>
            {filteredWrestlers.map((wrestler, idx) => (
              <option key={idx} value={wrestler.name}>
                {wrestler.name} ({wrestler.school}) - {wrestler.primaryWeight}lbs - {wrestler.wins}-{wrestler.losses} ({wrestler.winPercentage.toFixed(1)}%)
              </option>
            ))}
          </select>
          
          <p className="text-sm text-gray-500 mt-2">
            Showing {filteredWrestlers.length} wrestler{filteredWrestlers.length !== 1 ? 's' : ''}
          </p>
        </div>

        {/* Selected Wrestler Display */}
        {selectedWrestler && selectedWrestlerData && (
          <div 
            className="rounded-lg shadow-lg p-6 mb-8 border-4"
            style={{ 
              borderColor: wrestlerColor,
              backgroundColor: `${wrestlerColor}08`,
              backgroundImage: `linear-gradient(135deg, ${wrestlerColor}15 0%, ${wrestlerColor}05 100%)`
            }}
          >
            <div className="text-center mb-4">
              <h2 
                className="text-4xl font-bold mb-4"
                style={{ color: wrestlerColor }}
              >
                {selectedWrestlerData.name}
              </h2>
              <p className="text-2xl text-gray-600 mb-2">
                {selectedWrestlerData.school} • {selectedWrestlerData.conference}
              </p>
              <p className="text-xl text-gray-600">
                Weight: {selectedWrestlerData.primaryWeight} lbs
                {selectedWrestlerData.weightClasses.length > 1 && 
                  ` (also wrestled: ${selectedWrestlerData.weightClasses.filter(w => w !== selectedWrestlerData.primaryWeight).join(', ')})`
                }
              </p>
            </div>
          </div>
        )}

        {/* Wrestler Stats */}
        {selectedWrestler && selectedWrestlerData && wrestlerMatches.length > 0 && (
          <div className="mb-8">
            <h3 className="text-2xl font-semibold text-gray-900 mb-4">Season Statistics</h3>
            
            {/* Basic Stats Row */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
              {/* Overall Record */}
              <div className="bg-white rounded-lg shadow-lg p-4">
                <h4 className="text-sm font-medium text-gray-500 mb-2">Record</h4>
                <p className="text-2xl font-bold text-gray-900">
                  <span className="text-green-600">{selectedWrestlerData.wins}</span> - <span className="text-red-600">{selectedWrestlerData.losses}</span>
                </p>
              </div>

              {/* Win Percentage */}
              <div className="bg-white rounded-lg shadow-lg p-4">
                <h4 className="text-sm font-medium text-gray-500 mb-2">Win %</h4>
                <p className="text-2xl font-bold text-blue-600">
                  {selectedWrestlerData.winPercentage.toFixed(1)}%
                </p>
              </div>

              {/* Dominance Score */}
              <div className="bg-white rounded-lg shadow-lg p-4">
                <h4 className="text-sm font-medium text-gray-500 mb-2">Dominance Score</h4>
                <p className="text-2xl font-bold text-purple-600">
                  {selectedWrestlerData.dominanceScore > 0 ? '+' : ''}{selectedWrestlerData.dominanceScore.toFixed(2)}
                </p>
              </div>

              {/* Bonus Win % */}
              <div className="bg-white rounded-lg shadow-lg p-4">
                <h4 className="text-sm font-medium text-gray-500 mb-2">Bonus Win %</h4>
                <p className="text-2xl font-bold text-pink-600">
                  {selectedWrestlerData.wins > 0 
                    ? (((selectedWrestlerData.falls + selectedWrestlerData.techFalls + selectedWrestlerData.majors) / selectedWrestlerData.wins) * 100).toFixed(1)
                    : '0.0'
                  }%
                </p>
              </div>

              {/* Total Matches */}
              <div className="bg-white rounded-lg shadow-lg p-4">
                <h4 className="text-sm font-medium text-gray-500 mb-2">Total Matches</h4>
                <p className="text-2xl font-bold text-gray-900">
                  {selectedWrestlerData.totalMatches}
                </p>
              </div>
            </div>

            {/* Visualization Toggle */}
            <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
              <div className="flex items-center justify-between mb-4">
                <h4 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M3 4a1 1 0 011-1h12a1 1 0 011 1v2a1 1 0 01-1 1H4a1 1 0 01-1-1V4zM3 10a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H4a1 1 0 01-1-1v-6zM14 9a1 1 0 00-1 1v6a1 1 0 001 1h2a1 1 0 001-1v-6a1 1 0 00-1-1h-2z" />
                  </svg>
                  Win Visualization
                </h4>
                <div className="flex items-center gap-2">
                  <span className={`text-sm font-medium ${!showStackedBar ? 'text-blue-600' : 'text-gray-500'}`}>
                    Separate Bars
                  </span>
                  <button
                    onClick={() => setShowStackedBar(!showStackedBar)}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                      showStackedBar ? 'bg-blue-600' : 'bg-gray-200'
                    }`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                        showStackedBar ? 'translate-x-6' : 'translate-x-1'
                      }`}
                    />
                  </button>
                  <span className={`text-sm font-medium ${showStackedBar ? 'text-blue-600' : 'text-gray-500'}`}>
                    Stacked Bar
                  </span>
                </div>
              </div>

              {!showStackedBar && (
                <div>
                  <h5 className="text-md font-medium text-gray-700 mb-4">Wins by Type</h5>
              
              <div className="space-y-4">
                {/* Falls */}
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2 w-24">
                    <div className="w-4 h-4 bg-orange-500 rounded"></div>
                    <span className="text-sm font-medium text-gray-900">Falls</span>
                  </div>
                  <div className="flex-1 bg-gray-200 rounded-full h-6 relative">
                    <div 
                      className="bg-orange-500 h-6 rounded-full flex items-center justify-end pr-2"
                      style={{ width: `${selectedWrestlerData.wins > 0 ? (selectedWrestlerData.falls / selectedWrestlerData.wins) * 100 : 0}%` }}
                    >
                      <span className="text-white text-sm font-medium">{selectedWrestlerData.falls}</span>
                    </div>
                  </div>
                </div>

                {/* Tech Falls */}
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2 w-24">
                    <div className="w-4 h-4 bg-purple-500 rounded"></div>
                    <span className="text-sm font-medium text-gray-900">Tech Falls</span>
                  </div>
                  <div className="flex-1 bg-gray-200 rounded-full h-6 relative">
                    <div 
                      className="bg-purple-500 h-6 rounded-full flex items-center justify-end pr-2"
                      style={{ width: `${selectedWrestlerData.wins > 0 ? (selectedWrestlerData.techFalls / selectedWrestlerData.wins) * 100 : 0}%` }}
                    >
                      <span className="text-white text-sm font-medium">{selectedWrestlerData.techFalls}</span>
                    </div>
                  </div>
                </div>

                {/* Majors */}
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2 w-24">
                    <div className="w-4 h-4 bg-blue-500 rounded"></div>
                    <span className="text-sm font-medium text-gray-900">Majors</span>
                  </div>
                  <div className="flex-1 bg-gray-200 rounded-full h-6 relative">
                    <div 
                      className="bg-blue-500 h-6 rounded-full flex items-center justify-end pr-2"
                      style={{ width: `${selectedWrestlerData.wins > 0 ? (selectedWrestlerData.majors / selectedWrestlerData.wins) * 100 : 0}%` }}
                    >
                      <span className="text-white text-sm font-medium">{selectedWrestlerData.majors}</span>
                    </div>
                  </div>
                </div>

                {/* Decisions */}
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2 w-24">
                    <div className="w-4 h-4 bg-green-500 rounded"></div>
                    <span className="text-sm font-medium text-gray-900">Decisions</span>
                  </div>
                  <div className="flex-1 bg-gray-200 rounded-full h-6 relative">
                    <div 
                      className="bg-green-500 h-6 rounded-full flex items-center justify-end pr-2"
                      style={{ width: `${selectedWrestlerData.wins > 0 ? (selectedWrestlerData.decisions / selectedWrestlerData.wins) * 100 : 0}%` }}
                    >
                      <span className="text-white text-sm font-medium">{selectedWrestlerData.decisions}</span>
                    </div>
                  </div>
                </div>
              </div>
                </div>
              )}

              {showStackedBar && (
                <div>
                  <h5 className="text-md font-medium text-gray-700 mb-4">Match Results Visualization</h5>
              
              <div className="mb-4">
                
                {/* Stacked Bar Visualization */}
                <div className="bg-gray-800 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-white text-sm">Match Results</span>
                    <span className="text-white text-sm">{selectedWrestlerData.totalMatches} matches</span>
                  </div>
                  
                  <div className="flex h-8 rounded overflow-hidden border-2 border-gray-600 relative">
                    {/* Falls segments */}
                    {Array.from({ length: selectedWrestlerData.falls }, (_, i) => (
                      <div key={`fall-${i}`} className="bg-orange-500 flex-1 border-r border-gray-600 relative group" title="Fall">
                        {i === Math.floor(selectedWrestlerData.falls / 2) && selectedWrestlerData.falls > 0 && (
                          <div className="absolute inset-0 flex items-center justify-center px-1">
                            <span className="text-white text-sm font-bold drop-shadow-lg whitespace-nowrap">{selectedWrestlerData.falls}</span>
                          </div>
                        )}
                      </div>
                    ))}
                    {/* Tech Falls segments */}
                    {Array.from({ length: selectedWrestlerData.techFalls }, (_, i) => (
                      <div key={`tech-${i}`} className="bg-purple-500 flex-1 border-r border-gray-600 relative group" title="Technical Fall">
                        {i === Math.floor(selectedWrestlerData.techFalls / 2) && selectedWrestlerData.techFalls > 0 && (
                          <div className="absolute inset-0 flex items-center justify-center px-1">
                            <span className="text-white text-sm font-bold drop-shadow-lg whitespace-nowrap">{selectedWrestlerData.techFalls}</span>
                          </div>
                        )}
                      </div>
                    ))}
                    {/* Major Decisions segments */}
                    {Array.from({ length: selectedWrestlerData.majors }, (_, i) => (
                      <div key={`major-${i}`} className="bg-blue-500 flex-1 border-r border-gray-600 relative group" title="Major Decision">
                        {i === Math.floor(selectedWrestlerData.majors / 2) && selectedWrestlerData.majors > 0 && (
                          <div className="absolute inset-0 flex items-center justify-center px-1">
                            <span className="text-white text-sm font-bold drop-shadow-lg whitespace-nowrap">{selectedWrestlerData.majors}</span>
                          </div>
                        )}
                      </div>
                    ))}
                    {/* Decisions segments */}
                    {Array.from({ length: selectedWrestlerData.decisions }, (_, i) => (
                      <div key={`decision-${i}`} className="bg-green-500 flex-1 border-r border-gray-600 relative group" title="Decision">
                        {i === Math.floor(selectedWrestlerData.decisions / 2) && selectedWrestlerData.decisions > 0 && (
                          <div className="absolute inset-0 flex items-center justify-center px-1">
                            <span className="text-white text-sm font-bold drop-shadow-lg whitespace-nowrap">{selectedWrestlerData.decisions}</span>
                          </div>
                        )}
                      </div>
                    ))}
                    {/* Losses segments */}
                    {Array.from({ length: selectedWrestlerData.losses }, (_, i) => (
                      <div key={`loss-${i}`} className="bg-gray-400 flex-1 border-r border-gray-600 relative group" title="Loss">
                        {i === Math.floor(selectedWrestlerData.losses / 2) && selectedWrestlerData.losses > 0 && (
                          <div className="absolute inset-0 flex items-center justify-center px-1">
                            <span className="text-white text-sm font-bold drop-shadow-lg whitespace-nowrap">{selectedWrestlerData.losses}</span>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                  
                  {/* Legend */}
                  <div className="flex flex-wrap gap-4 mt-3 text-xs">
                    <div className="flex items-center gap-1">
                      <div className="w-3 h-3 bg-orange-500 rounded"></div>
                      <span className="text-white">Falls</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <div className="w-3 h-3 bg-purple-500 rounded"></div>
                      <span className="text-white">Tech Falls</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <div className="w-3 h-3 bg-blue-500 rounded"></div>
                      <span className="text-white">Majors</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <div className="w-3 h-3 bg-green-500 rounded"></div>
                      <span className="text-white">Decisions</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <div className="w-3 h-3 bg-gray-400 rounded"></div>
                      <span className="text-white">Losses</span>
                    </div>
                  </div>
                </div>
              </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Match Results Table */}
        {selectedWrestler && wrestlerMatches.length > 0 && (
          <div className="bg-white rounded-lg shadow-lg overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-2xl font-semibold text-gray-900">
                Match Results
              </h2>
              <p className="text-gray-600">
                {wrestlerMatches.length} match{wrestlerMatches.length !== 1 ? 'es' : ''} this season
              </p>
            </div>
            
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900 uppercase tracking-wider">
                      Date
                    </th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900 uppercase tracking-wider">
                      Weight
                    </th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900 uppercase tracking-wider">
                      Opponent
                    </th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900 uppercase tracking-wider">
                      Opponent School
                    </th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900 uppercase tracking-wider">
                      Location
                    </th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900 uppercase tracking-wider">
                      Result
                    </th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900 uppercase tracking-wider">
                      Score
                    </th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900 uppercase tracking-wider">
                      Type
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {wrestlerMatches.map((match, index) => (
                    <tr key={index} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {new Date(match.date).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {match.wt}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {match.opponent}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {match.opponent_school}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500">
                        {match.location}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          match.result === 'Win' 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-red-100 text-red-800'
                        }`}>
                          {match.result}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {match.score}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {match.result_type}
                        {match.criteria && ` (${match.criteria})`}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {selectedWrestler && wrestlerMatches.length === 0 && (
          <div className="bg-white rounded-lg shadow-lg p-8 text-center text-gray-500">
            No match data found for {selectedWrestler}
          </div>
        )}
      </div>
    </div>
  );
}

