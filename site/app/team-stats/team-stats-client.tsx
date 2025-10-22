'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';

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

interface WrestlerRosterStats {
  name: string;
  weight: number;
  wins: number;
  losses: number;
  winPercentage: number;
  bonusPercentage: number;
  dominanceScore: number;
  falls: number;
  techFalls: number;
  majors: number;
  decisions: number;
}

export default function TeamStatsClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  const [selectedTeam, setSelectedTeam] = useState<string>('');
  const [allMatches, setAllMatches] = useState<WrestlerMatch[]>([]);
  const [schools, setSchools] = useState<School[]>([]);
  const [loading, setLoading] = useState(true);
  const [sortBy, setSortBy] = useState<'name' | 'winPercentage'>('winPercentage');
  const [conferenceFilter, setConferenceFilter] = useState<string>('all');
  const [seasonFilter, setSeasonFilter] = useState<string>('2024-2025');
  const [showCopied, setShowCopied] = useState(false);
  const [showStackedBar, setShowStackedBar] = useState(false);
  const [rosterSortBy, setRosterSortBy] = useState<'weight' | 'name' | 'wins' | 'losses' | 'winPercentage' | 'bonusPercentage' | 'dominanceScore' | 'falls' | 'techFalls' | 'majors' | 'decisions'>('weight');
  const [rosterSortOrder, setRosterSortOrder] = useState<'asc' | 'desc'>('asc');

  // Initialize state from URL params
  useEffect(() => {
    const team = searchParams.get('team') || '';
    const sort = (searchParams.get('sort') as 'name' | 'winPercentage') || 'winPercentage';
    const conference = searchParams.get('conference') || 'all';
    const season = searchParams.get('season') || '2024-2025';
    
    setSelectedTeam(team);
    setSortBy(sort);
    setConferenceFilter(conference);
    setSeasonFilter(season);
  }, [searchParams]);

  // Update URL when filters change
  const updateURL = (newParams: { team?: string; sort?: string; conference?: string; season?: string }) => {
    const params = new URLSearchParams(searchParams.toString());
    
    if (newParams.team !== undefined) {
      if (newParams.team) params.set('team', newParams.team);
      else params.delete('team');
    }
    
    if (newParams.sort !== undefined) {
      params.set('sort', newParams.sort);
    }
    
    if (newParams.conference !== undefined) {
      if (newParams.conference !== 'all') params.set('conference', newParams.conference);
      else params.delete('conference');
    }
    
    if (newParams.season !== undefined) {
      if (newParams.season !== '2024-2025') params.set('season', newParams.season);
      else params.delete('season');
    }
    
    router.replace(`/team-stats?${params.toString()}`, { scroll: false });
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

  // Get unique teams
  const teams = useMemo(() => {
    if (schools.length === 0) return [];
    
    return schools
      .filter(school => school.conference_2025 !== null) // Only D1 teams
      .map(school => ({
        name: school.school,
        conference: school.conference_2025 as string
      }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [schools]);

  // Calculate team aggregate stats
  const teamStats = useMemo(() => {
    if (!selectedTeam || allMatches.length === 0) return null;

    const teamMatches = allMatches.filter(m => m.wrestler_school === selectedTeam);
    
    const wins = teamMatches.filter(m => m.result === 'Win').length;
    const losses = teamMatches.filter(m => m.result === 'Loss').length;
    
    const winsByFall = teamMatches.filter(m => m.result === 'Win' && m.result_type === 'Fall').length;
    const winsByTechFall = teamMatches.filter(m => m.result === 'Win' && m.result_type === 'Technical Fall').length;
    const winsByMajor = teamMatches.filter(m => m.result === 'Win' && m.result_type === 'Major Decision').length;
    const winsByDecision = teamMatches.filter(m => m.result === 'Win' && m.result_type === 'Decision').length;
    
    return {
      wins,
      losses,
      winsByFall,
      winsByTechFall,
      winsByMajor,
      winsByDecision,
      totalMatches: wins + losses
    };
  }, [selectedTeam, allMatches]);

  // Calculate roster stats
  const rosterStats = useMemo(() => {
    if (!selectedTeam || allMatches.length === 0) return [];

    const teamMatches = allMatches.filter(m => m.wrestler_school === selectedTeam);
    
    // Group by wrestler
    const wrestlerMap = new Map<string, WrestlerMatch[]>();
    teamMatches.forEach(match => {
      if (!wrestlerMap.has(match.wrestler)) {
        wrestlerMap.set(match.wrestler, []);
      }
      wrestlerMap.get(match.wrestler)!.push(match);
    });

    // Calculate stats for each wrestler
    const roster: WrestlerRosterStats[] = [];
    wrestlerMap.forEach((matches, name) => {
      const wins = matches.filter(m => m.result === 'Win').length;
      const losses = matches.filter(m => m.result === 'Loss').length;
      const totalMatches = wins + losses;
      
      const falls = matches.filter(m => m.result === 'Win' && m.result_type === 'Fall').length;
      const techFalls = matches.filter(m => m.result === 'Win' && m.result_type === 'Technical Fall').length;
      const majors = matches.filter(m => m.result === 'Win' && m.result_type === 'Major Decision').length;
      const decisions = matches.filter(m => m.result === 'Win' && m.result_type === 'Decision').length;
      
      const bonusWins = falls + techFalls + majors;
      const bonusPercentage = wins > 0 ? (bonusWins / wins) * 100 : 0;
      
      // Calculate average dominance score
      const totalDominanceScore = matches.reduce((sum, match) => sum + match.dominance_score, 0);
      const dominanceScore = matches.length > 0 ? totalDominanceScore / matches.length : 0;
      
      // Find primary weight class (most matches)
      const weightCounts = new Map<number, number>();
      matches.forEach(m => {
        weightCounts.set(m.wt, (weightCounts.get(m.wt) || 0) + 1);
      });
      const weight = [...weightCounts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] || 0;
      
      roster.push({
        name,
        weight,
        wins,
        losses,
        winPercentage: totalMatches > 0 ? (wins / totalMatches) * 100 : 0,
        bonusPercentage,
        dominanceScore,
        falls,
        techFalls,
        majors,
        decisions
      });
    });

    return roster;
  }, [selectedTeam, allMatches]);

  // Sort roster based on selected column and order
  const sortedRosterStats = useMemo(() => {
    const sorted = [...rosterStats].sort((a, b) => {
      let aValue: number | string;
      let bValue: number | string;

      switch (rosterSortBy) {
        case 'weight':
          aValue = a.weight;
          bValue = b.weight;
          break;
        case 'name':
          aValue = a.name;
          bValue = b.name;
          break;
        case 'wins':
          aValue = a.wins;
          bValue = b.wins;
          break;
        case 'losses':
          aValue = a.losses;
          bValue = b.losses;
          break;
        case 'winPercentage':
          aValue = a.winPercentage;
          bValue = b.winPercentage;
          break;
        case 'bonusPercentage':
          aValue = a.bonusPercentage;
          bValue = b.bonusPercentage;
          break;
        case 'dominanceScore':
          aValue = a.dominanceScore;
          bValue = b.dominanceScore;
          break;
        case 'falls':
          aValue = a.falls;
          bValue = b.falls;
          break;
        case 'techFalls':
          aValue = a.techFalls;
          bValue = b.techFalls;
          break;
        case 'majors':
          aValue = a.majors;
          bValue = b.majors;
          break;
        case 'decisions':
          aValue = a.decisions;
          bValue = b.decisions;
          break;
        default:
          return 0;
      }

      if (typeof aValue === 'string' && typeof bValue === 'string') {
        return rosterSortOrder === 'asc' 
          ? aValue.localeCompare(bValue)
          : bValue.localeCompare(aValue);
      } else {
        return rosterSortOrder === 'asc' 
          ? (aValue as number) - (bValue as number)
          : (bValue as number) - (aValue as number);
      }
    });

    return sorted;
  }, [rosterStats, rosterSortBy, rosterSortOrder]);

  // Handle column header click
  const handleRosterSort = (column: typeof rosterSortBy) => {
    if (rosterSortBy === column) {
      // Toggle sort order if same column
      setRosterSortOrder(rosterSortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      // Set new column with default order
      setRosterSortBy(column);
      // Weight defaults to ascending, everything else to descending
      setRosterSortOrder(column === 'weight' ? 'asc' : 'desc');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading team stats...</p>
        </div>
      </div>
    );
  }

  const selectedTeamData = teams.find(t => t.name === selectedTeam);
  const teamColor = schools.find(s => s.school === selectedTeam)?.primary_color_1 || '#3B82F6';

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-4xl font-bold text-gray-900 mb-2">Team Stats</h1>
              <p className="text-gray-600">Select a team to view their aggregated statistics and roster</p>
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

        {/* Team Selection */}
        <div className="bg-white rounded-lg shadow-lg p-6 mb-8">
          <label htmlFor="team-select" className="block text-sm font-medium text-gray-700 mb-2">
            Select Team
          </label>
          
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
              <label className="text-sm font-medium text-gray-700">Sort by:</label>
              <select
                value={sortBy}
                onChange={(e) => {
                  const newSort = e.target.value as 'name' | 'winPercentage';
                  setSortBy(newSort);
                  updateURL({ sort: newSort });
                }}
                className="px-3 py-1 border border-gray-300 rounded-md text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="name">A-Z</option>
                <option value="winPercentage">Conference</option>
              </select>
            </div>
            
            <div className="flex items-center gap-2">
              <label className="text-sm font-medium text-gray-700">Conference:</label>
              <select
                value={conferenceFilter}
                onChange={(e) => {
                  const newConference = e.target.value;
                  setConferenceFilter(newConference);
                  updateURL({ conference: newConference });
                }}
                className="px-3 py-1 border border-gray-300 rounded-md text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">All Conferences</option>
                {Array.from(new Set(teams.map(t => t.conference).filter(Boolean))).sort().map(conference => (
                  <option key={conference} value={conference!}>{conference}</option>
                ))}
              </select>
            </div>
          </div>
          
          <select
            id="team-select"
            value={selectedTeam}
            onChange={(e) => {
              const newTeam = e.target.value;
              setSelectedTeam(newTeam);
              updateURL({ team: newTeam });
            }}
            className="w-full max-w-md px-3 py-2 border border-gray-300 rounded-md shadow-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="">Choose a team...</option>
            {teams
              .filter(team => conferenceFilter === 'all' || team.conference === conferenceFilter)
              .sort((a, b) => {
                if (sortBy === 'name') {
                  return a.name.localeCompare(b.name);
                } else {
                  // Sort by conference
                  return (a.conference || '').localeCompare(b.conference || '');
                }
              })
              .map((team) => (
                <option key={team.name} value={team.name}>
                  {team.name} ({team.conference})
                </option>
              ))}
          </select>
        </div>

        {/* Selected Team Display */}
        {selectedTeam && selectedTeamData && (
          <div 
            className="rounded-lg shadow-lg p-6 mb-8 border-4"
            style={{ 
              borderColor: teamColor,
              backgroundColor: `${teamColor}08`,
              backgroundImage: `linear-gradient(135deg, ${teamColor}15 0%, ${teamColor}05 100%)`
            }}
          >
            <div className="text-center">
              <h2 
                className="text-4xl font-bold mb-2"
                style={{ color: teamColor }}
              >
                {selectedTeamData.name}
              </h2>
              <p className="text-xl text-gray-600">
                Conference: {selectedTeamData.conference}
              </p>
            </div>
          </div>
        )}

        {/* Team Aggregate Stats */}
        {selectedTeam && teamStats && (
          <div className="mb-8">
            <h3 className="text-2xl font-semibold text-gray-900 mb-4">Overall Team Statistics</h3>
            
            {/* Basic Stats Row */}
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-6">
              {/* Overall Record */}
              <div className="bg-white rounded-lg shadow-lg p-4">
                <h4 className="text-sm font-medium text-gray-500 mb-2">Overall Record</h4>
                <p className="text-2xl font-bold text-gray-900">
                  <span className="text-green-600">{teamStats.wins}</span> - <span className="text-red-600">{teamStats.losses}</span>
                </p>
              </div>

              {/* Win Percentage */}
              <div className="bg-white rounded-lg shadow-lg p-4">
                <h4 className="text-sm font-medium text-gray-500 mb-2">Win %</h4>
                <p className="text-2xl font-bold text-blue-600">
                  {teamStats.totalMatches > 0 ? ((teamStats.wins / teamStats.totalMatches) * 100).toFixed(1) : '0.0'}%
                </p>
              </div>

              {/* Total Matches */}
              <div className="bg-white rounded-lg shadow-lg p-4">
                <h4 className="text-sm font-medium text-gray-500 mb-2">Total Matches</h4>
                <p className="text-2xl font-bold text-gray-900">
                  {teamStats.totalMatches}
                </p>
              </div>
            </div>

            {/* Win Type Visualization */}
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
                          style={{ width: `${teamStats.wins > 0 ? (teamStats.winsByFall / teamStats.wins) * 100 : 0}%` }}
                        >
                          <span className="text-white text-sm font-medium">{teamStats.winsByFall}</span>
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
                          style={{ width: `${teamStats.wins > 0 ? (teamStats.winsByTechFall / teamStats.wins) * 100 : 0}%` }}
                        >
                          <span className="text-white text-sm font-medium">{teamStats.winsByTechFall}</span>
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
                          style={{ width: `${teamStats.wins > 0 ? (teamStats.winsByMajor / teamStats.wins) * 100 : 0}%` }}
                        >
                          <span className="text-white text-sm font-medium">{teamStats.winsByMajor}</span>
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
                          style={{ width: `${teamStats.wins > 0 ? (teamStats.winsByDecision / teamStats.wins) * 100 : 0}%` }}
                        >
                          <span className="text-white text-sm font-medium">{teamStats.winsByDecision}</span>
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
                        <span className="text-white text-sm">{teamStats.totalMatches} matches</span>
                      </div>
                      
                      <div className="flex h-8 rounded overflow-hidden border-2 border-gray-600 relative">
                        {/* Falls segment */}
                        {teamStats.winsByFall > 0 && (
                          <div 
                            className="bg-orange-500 flex items-center justify-center relative group" 
                            style={{ width: `${(teamStats.winsByFall / teamStats.totalMatches) * 100}%` }}
                            title="Falls"
                          >
                            <span className="text-white text-sm font-bold drop-shadow-lg">{teamStats.winsByFall}</span>
                          </div>
                        )}
                        {/* Tech Falls segment */}
                        {teamStats.winsByTechFall > 0 && (
                          <div 
                            className="bg-purple-500 flex items-center justify-center relative group" 
                            style={{ width: `${(teamStats.winsByTechFall / teamStats.totalMatches) * 100}%` }}
                            title="Technical Falls"
                          >
                            <span className="text-white text-sm font-bold drop-shadow-lg">{teamStats.winsByTechFall}</span>
                          </div>
                        )}
                        {/* Major Decisions segment */}
                        {teamStats.winsByMajor > 0 && (
                          <div 
                            className="bg-blue-500 flex items-center justify-center relative group" 
                            style={{ width: `${(teamStats.winsByMajor / teamStats.totalMatches) * 100}%` }}
                            title="Major Decisions"
                          >
                            <span className="text-white text-sm font-bold drop-shadow-lg">{teamStats.winsByMajor}</span>
                          </div>
                        )}
                        {/* Decisions segment */}
                        {teamStats.winsByDecision > 0 && (
                          <div 
                            className="bg-green-500 flex items-center justify-center relative group" 
                            style={{ width: `${(teamStats.winsByDecision / teamStats.totalMatches) * 100}%` }}
                            title="Decisions"
                          >
                            <span className="text-white text-sm font-bold drop-shadow-lg">{teamStats.winsByDecision}</span>
                          </div>
                        )}
                        {/* Losses segment */}
                        {teamStats.losses > 0 && (
                          <div 
                            className="bg-gray-400 flex items-center justify-center relative group" 
                            style={{ width: `${(teamStats.losses / teamStats.totalMatches) * 100}%` }}
                            title="Losses"
                          >
                            <span className="text-white text-sm font-bold drop-shadow-lg">{teamStats.losses}</span>
                          </div>
                        )}
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

        {/* Roster Table */}
        {selectedTeam && sortedRosterStats.length > 0 && (
          <div className="bg-white rounded-lg shadow-lg overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-2xl font-semibold text-gray-900">
                Team Roster
              </h2>
              <p className="text-gray-600">
                {sortedRosterStats.length} wrestler{sortedRosterStats.length !== 1 ? 's' : ''} on the roster
              </p>
            </div>
            
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th 
                      className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 select-none"
                      onClick={() => handleRosterSort('weight')}
                    >
                      <div className="flex items-center gap-1">
                        Weight
                        {rosterSortBy === 'weight' && (
                          <span className="text-blue-600">
                            {rosterSortOrder === 'asc' ? '↑' : '↓'}
                          </span>
                        )}
                      </div>
                    </th>
                    <th 
                      className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 select-none"
                      onClick={() => handleRosterSort('name')}
                    >
                      <div className="flex items-center gap-1">
                        Wrestler
                        {rosterSortBy === 'name' && (
                          <span className="text-blue-600">
                            {rosterSortOrder === 'asc' ? '↑' : '↓'}
                          </span>
                        )}
                      </div>
                    </th>
                    <th 
                      className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 select-none"
                      onClick={() => handleRosterSort('wins')}
                    >
                      <div className="flex items-center gap-1">
                        Wins
                        {rosterSortBy === 'wins' && (
                          <span className="text-blue-600">
                            {rosterSortOrder === 'asc' ? '↑' : '↓'}
                          </span>
                        )}
                      </div>
                    </th>
                    <th 
                      className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 select-none"
                      onClick={() => handleRosterSort('losses')}
                    >
                      <div className="flex items-center gap-1">
                        Losses
                        {rosterSortBy === 'losses' && (
                          <span className="text-blue-600">
                            {rosterSortOrder === 'asc' ? '↑' : '↓'}
                          </span>
                        )}
                      </div>
                    </th>
                    <th 
                      className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 select-none"
                      onClick={() => handleRosterSort('winPercentage')}
                    >
                      <div className="flex items-center gap-1">
                        Win %
                        {rosterSortBy === 'winPercentage' && (
                          <span className="text-blue-600">
                            {rosterSortOrder === 'asc' ? '↑' : '↓'}
                          </span>
                        )}
                      </div>
                    </th>
                    <th 
                      className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 select-none"
                      onClick={() => handleRosterSort('bonusPercentage')}
                    >
                      <div className="flex items-center gap-1">
                        Bonus %
                        {rosterSortBy === 'bonusPercentage' && (
                          <span className="text-blue-600">
                            {rosterSortOrder === 'asc' ? '↑' : '↓'}
                          </span>
                        )}
                      </div>
                    </th>
                    <th 
                      className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 select-none"
                      onClick={() => handleRosterSort('dominanceScore')}
                    >
                      <div className="flex items-center gap-1">
                        Dominance
                        {rosterSortBy === 'dominanceScore' && (
                          <span className="text-blue-600">
                            {rosterSortOrder === 'asc' ? '↑' : '↓'}
                          </span>
                        )}
                      </div>
                    </th>
                    <th 
                      className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 select-none"
                      onClick={() => handleRosterSort('falls')}
                    >
                      <div className="flex items-center gap-1">
                        Falls
                        {rosterSortBy === 'falls' && (
                          <span className="text-blue-600">
                            {rosterSortOrder === 'asc' ? '↑' : '↓'}
                          </span>
                        )}
                      </div>
                    </th>
                    <th 
                      className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 select-none"
                      onClick={() => handleRosterSort('techFalls')}
                    >
                      <div className="flex items-center gap-1">
                        Tech Falls
                        {rosterSortBy === 'techFalls' && (
                          <span className="text-blue-600">
                            {rosterSortOrder === 'asc' ? '↑' : '↓'}
                          </span>
                        )}
                      </div>
                    </th>
                    <th 
                      className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 select-none"
                      onClick={() => handleRosterSort('majors')}
                    >
                      <div className="flex items-center gap-1">
                        Majors
                        {rosterSortBy === 'majors' && (
                          <span className="text-blue-600">
                            {rosterSortOrder === 'asc' ? '↑' : '↓'}
                          </span>
                        )}
                      </div>
                    </th>
                    <th 
                      className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 select-none"
                      onClick={() => handleRosterSort('decisions')}
                    >
                      <div className="flex items-center gap-1">
                        Decisions
                        {rosterSortBy === 'decisions' && (
                          <span className="text-blue-600">
                            {rosterSortOrder === 'asc' ? '↑' : '↓'}
                          </span>
                        )}
                      </div>
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      View Wrestler
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {sortedRosterStats.map((wrestler, index) => (
                    <tr key={index} className="hover:bg-gray-50">
                      <td className="px-4 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {wrestler.weight}
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                        {wrestler.name}
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-green-600 font-semibold">
                        {wrestler.wins}
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-red-600 font-semibold">
                        {wrestler.losses}
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                        {wrestler.winPercentage.toFixed(1)}%
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                        {wrestler.bonusPercentage.toFixed(1)}%
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-purple-600 font-semibold">
                        {wrestler.dominanceScore > 0 ? '+' : ''}{wrestler.dominanceScore.toFixed(2)}
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-orange-600">
                        {wrestler.falls}
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-purple-600">
                        {wrestler.techFalls}
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-blue-600">
                        {wrestler.majors}
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-green-600">
                        {wrestler.decisions}
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm">
                        <Link
                          href={`/wrestlers?wrestler=${encodeURIComponent(wrestler.name)}`}
                          className="inline-flex items-center px-3 py-1 border border-gray-300 rounded-md text-xs font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                          View
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {selectedTeam && sortedRosterStats.length === 0 && (
          <div className="bg-white rounded-lg shadow-lg p-8 text-center text-gray-500">
            No roster data found for {selectedTeam}
          </div>
        )}
      </div>
    </div>
  );
}

