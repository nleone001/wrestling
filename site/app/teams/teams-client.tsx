'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

interface DualResult {
  date: string;
  location: string;
  criteria: string | null;
  school: string;
  score: number;
  opponent_school: string;
  opponent_score: number;
  result: 'Win' | 'Loss';
  d1: string;
  isConferenceMatch?: boolean;
}

interface Team {
  name: string;
  wins: number;
  losses: number;
  totalMatches: number;
  winPercentage: number;
  conference: string | null;
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

export default function TeamsClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  const [selectedTeam, setSelectedTeam] = useState<string>('');
  const [teams, setTeams] = useState<Team[]>([]);
  const [teamResults, setTeamResults] = useState<DualResult[]>([]);
  const [schools, setSchools] = useState<School[]>([]);
  const [loading, setLoading] = useState(true);
  const [sortBy, setSortBy] = useState<'name' | 'winPercentage'>('winPercentage');
  const [conferenceFilter, setConferenceFilter] = useState<string>('all');
  const [showCopied, setShowCopied] = useState(false);

  // Initialize state from URL params
  useEffect(() => {
    const team = searchParams.get('team') || '';
    const sort = (searchParams.get('sort') as 'name' | 'winPercentage') || 'winPercentage';
    const conference = searchParams.get('conference') || 'all';
    
    setSelectedTeam(team);
    setSortBy(sort);
    setConferenceFilter(conference);
  }, [searchParams]);

  // Update URL when filters change
  const updateURL = (newParams: { team?: string; sort?: string; conference?: string }) => {
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
    
    router.replace(`/teams?${params.toString()}`, { scroll: false });
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

  // Load teams and their results
  useEffect(() => {
    async function loadData() {
      try {
        const [dualsResponse, schoolsResponse] = await Promise.all([
          fetch('/data/duals-2025.json'),
          fetch('/data/schools.json')
        ]);
        
        const duals: DualResult[] = await dualsResponse.json();
        const schoolsData: School[] = await schoolsResponse.json();
        
        setSchools(schoolsData);
        
        // Create a map of school names to conferences
        const schoolConferenceMap = new Map<string, string | null>();
        schoolsData.forEach(school => {
          schoolConferenceMap.set(school.school, school.conference_2025);
        });
        
        // Extract unique teams and calculate stats
        const teamMap = new Map<string, { wins: number; losses: number; matches: DualResult[] }>();
        
        duals.forEach(dual => {
          const team = dual.school;
          if (!teamMap.has(team)) {
            teamMap.set(team, { wins: 0, losses: 0, matches: [] });
          }
          
          const teamData = teamMap.get(team)!;
          teamData.matches.push(dual);
          
          if (dual.result === 'Win') {
            teamData.wins++;
          } else {
            teamData.losses++;
          }
        });

        // Convert to array and calculate win percentage, filter for D1 teams only
        const teamsList: Team[] = Array.from(teamMap.entries())
          .map(([name, data]) => ({
            name,
            wins: data.wins,
            losses: data.losses,
            totalMatches: data.wins + data.losses,
            winPercentage: data.wins + data.losses > 0 ? (data.wins / (data.wins + data.losses)) * 100 : 0,
            conference: schoolConferenceMap.get(name) || null
          }))
          .filter(team => team.conference !== null); // Only show D1 teams (those with conferences)

        // Sort by win percentage (descending)
        teamsList.sort((a, b) => b.winPercentage - a.winPercentage);
        
        setTeams(teamsList);
        setLoading(false);
      } catch (error) {
        console.error('Error loading data:', error);
        setLoading(false);
      }
    }

    loadData();
  }, []);

  // Load results for selected team
  useEffect(() => {
    if (!selectedTeam || schools.length === 0) {
      setTeamResults([]);
      return;
    }

    async function loadTeamResults() {
      try {
        const response = await fetch('/data/duals-2025.json');
        const duals: DualResult[] = await response.json();
        
        // Create a map of school names to conferences
        const schoolConferenceMap = new Map<string, string | null>();
        schools.forEach(school => {
          schoolConferenceMap.set(school.school, school.conference_2025);
        });
        
        const selectedTeamConference = schoolConferenceMap.get(selectedTeam);
        
        const teamDuals = duals
          .filter(dual => dual.school === selectedTeam)
          .map(dual => ({
            ...dual,
            isConferenceMatch: Boolean(selectedTeamConference && 
                              schoolConferenceMap.get(dual.opponent_school) === selectedTeamConference)
          }));
        
        // Sort by date (most recent first)
        teamDuals.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        
        setTeamResults(teamDuals);
      } catch (error) {
        console.error('Error loading team results:', error);
      }
    }

    loadTeamResults();
  }, [selectedTeam, schools]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading team data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-4xl font-bold text-gray-900 mb-2">Team Results</h1>
              <p className="text-gray-600">Select a team to view their dual meet results</p>
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
                <option value="winPercentage">Win %</option>
                <option value="name">A-Z</option>
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
                  return b.winPercentage - a.winPercentage;
                }
              })
              .map((team) => (
                <option key={team.name} value={team.name}>
                  {team.name} ({team.wins}-{team.losses}, {team.winPercentage.toFixed(1)}%)
                </option>
              ))}
          </select>
        </div>

        {/* Selected Team Display */}
        {selectedTeam && (() => {
          const selectedTeamData = teams.find(t => t.name === selectedTeam);
          return selectedTeamData ? (
            <div className="bg-white rounded-lg shadow-lg p-6 mb-8">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-4xl font-bold text-gray-900 mb-2">
                    {selectedTeamData.name}
                  </h2>
                  <p className="text-xl text-gray-600">
                    Conference: {selectedTeamData.conference}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-semibold text-gray-900">
                    {selectedTeamData.wins}-{selectedTeamData.losses}
                  </p>
                  <p className="text-lg text-gray-600">
                    {selectedTeamData.winPercentage.toFixed(1)}%
                  </p>
                </div>
              </div>
            </div>
          ) : null;
        })()}

        {/* Team Stats Summary */}
        {selectedTeam && teamResults.length > 0 && (() => {
          const conferenceResults = teamResults.filter(r => r.isConferenceMatch);
          const nonConferenceResults = teamResults.filter(r => !r.isConferenceMatch);
          
          const conferenceWins = conferenceResults.filter(r => r.result === 'Win').length;
          const conferenceLosses = conferenceResults.filter(r => r.result === 'Loss').length;
          const conferenceWinPct = conferenceResults.length > 0 ? (conferenceWins / conferenceResults.length) * 100 : 0;
          
          const nonConferenceWins = nonConferenceResults.filter(r => r.result === 'Win').length;
          const nonConferenceLosses = nonConferenceResults.filter(r => r.result === 'Loss').length;
          const nonConferenceWinPct = nonConferenceResults.length > 0 ? (nonConferenceWins / nonConferenceResults.length) * 100 : 0;
          
          const overallWins = teamResults.filter(r => r.result === 'Win').length;
          const overallLosses = teamResults.filter(r => r.result === 'Loss').length;
          const overallWinPct = (overallWins / teamResults.length) * 100;
          
          return (
            <div className="mb-8">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Overall Stats */}
                <div className="bg-white rounded-lg shadow-lg p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Overall</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <h4 className="text-sm font-medium text-gray-500 mb-2">Record</h4>
                      <p className="text-2xl font-bold text-gray-900">
                        <span className="text-green-600">{overallWins}</span> - <span className="text-red-600">{overallLosses}</span>
                      </p>
                    </div>
                    <div>
                      <h4 className="text-sm font-medium text-gray-500 mb-2">Win %</h4>
                      <p className="text-2xl font-bold text-blue-600">
                        {overallWinPct.toFixed(1)}%
                      </p>
                    </div>
                  </div>
                </div>
                
                {/* Conference Stats */}
                <div className="bg-white rounded-lg shadow-lg p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Conference</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <h4 className="text-sm font-medium text-gray-500 mb-2">Record</h4>
                      <p className="text-2xl font-bold text-gray-900">
                        <span className="text-green-600">{conferenceWins}</span> - <span className="text-red-600">{conferenceLosses}</span>
                      </p>
                    </div>
                    <div>
                      <h4 className="text-sm font-medium text-gray-500 mb-2">Win %</h4>
                      <p className="text-2xl font-bold text-blue-600">
                        {conferenceWinPct.toFixed(1)}%
                      </p>
                    </div>
                  </div>
                </div>
                
                {/* Non-Conference Stats */}
                <div className="bg-white rounded-lg shadow-lg p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Non-Conference</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <h4 className="text-sm font-medium text-gray-500 mb-2">Record</h4>
                      <p className="text-2xl font-bold text-gray-900">
                        <span className="text-green-600">{nonConferenceWins}</span> - <span className="text-red-600">{nonConferenceLosses}</span>
                      </p>
                    </div>
                    <div>
                      <h4 className="text-sm font-medium text-gray-500 mb-2">Win %</h4>
                      <p className="text-2xl font-bold text-blue-600">
                        {nonConferenceWinPct.toFixed(1)}%
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          );
        })()}

        {/* Team Results Table */}
        {selectedTeam && (
          <div className="bg-white rounded-lg shadow-lg overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-2xl font-semibold text-gray-900">
                {selectedTeam} Results
              </h2>
              <p className="text-gray-600">
                {teamResults.length} dual meet{teamResults.length !== 1 ? 's' : ''} this season
              </p>
            </div>
            
            {teamResults.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900 uppercase tracking-wider">
                        Date
                      </th>
                      <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900 uppercase tracking-wider">
                        Opponent
                      </th>
                      <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900 uppercase tracking-wider">
                        Location
                      </th>
                      <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900 uppercase tracking-wider">
                        Score
                      </th>
                      <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900 uppercase tracking-wider">
                        Non-D1
                      </th>
                      <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900 uppercase tracking-wider">
                        Result
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {teamResults.map((result, index) => (
                      <tr key={index} className={`hover:bg-gray-50 ${result.isConferenceMatch ? 'bg-gray-50' : ''}`}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {new Date(result.date).toLocaleDateString()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {result.opponent_school}
                          {result.isConferenceMatch && (
                            <span className="ml-2 inline-flex px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded-full">
                              Conference
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {result.location}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          <span className="font-medium">{result.score}</span> - {result.opponent_score}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {result.d1 === 'D1' ? (
                            <span className="inline-flex px-2 py-1 text-xs font-medium bg-gray-100 text-gray-800 rounded-full">
                              D1
                            </span>
                          ) : (
                            <span className="inline-flex px-2 py-1 text-xs font-medium bg-orange-100 text-orange-800 rounded-full">
                              Non-D1
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                            result.result === 'Win' 
                              ? 'bg-green-100 text-green-800' 
                              : 'bg-red-100 text-red-800'
                          }`}>
                            {result.result}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="px-6 py-8 text-center text-gray-500">
                No results found for {selectedTeam}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
