'use client';

import { useState, useEffect, useMemo } from 'react';
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
}

interface WrestlerStats {
  name: string;
  school: string;
  conference: string | null;
  totalMatches: number;
  avgDominanceScore: number;
  falls: number;
  totalFallTime: number;
  techFalls: number;
}

interface TeamStats {
  name: string;
  conference: string | null;
  totalWins: number;
  fallWins: number;
  techFallWins: number;
  individualWins: number;
}

export default function DominanceClient() {
  const [allMatches, setAllMatches] = useState<WrestlerMatch[]>([]);
  const [allDuals, setAllDuals] = useState<DualResult[]>([]);
  const [schools, setSchools] = useState<School[]>([]);
  const [loading, setLoading] = useState(true);
  const [seasonFilter, setSeasonFilter] = useState<string>('2024-2025');
  
  // Wrestler leaderboard pagination
  const [dominancePage, setDominancePage] = useState(1);
  const [fallsPage, setFallsPage] = useState(1);
  const [techFallsPage, setTechFallsPage] = useState(1);
  
  // Team leaderboard pagination
  const [teamWinsPage, setTeamWinsPage] = useState(1);
  const [teamFallWinsPage, setTeamFallWinsPage] = useState(1);
  const [teamTechFallWinsPage, setTeamTechFallWinsPage] = useState(1);
  const [teamIndividualWinsPage, setTeamIndividualWinsPage] = useState(1);
  
  const ITEMS_PER_PAGE = 10;

  // Load all data
  useEffect(() => {
    async function loadData() {
      try {
        const [matchesResponse, dualsResponse, schoolsResponse] = await Promise.all([
          fetch('/data/wrestlers-2025.json'),
          fetch('/data/duals-2025.json'),
          fetch('/data/schools.json')
        ]);
        
        const matches: WrestlerMatch[] = await matchesResponse.json();
        const duals: DualResult[] = await dualsResponse.json();
        const schoolsData: School[] = await schoolsResponse.json();
        
        setAllMatches(matches);
        setAllDuals(duals);
        setSchools(schoolsData);
        setLoading(false);
      } catch (error) {
        console.error('Error loading data:', error);
        setLoading(false);
      }
    }

    loadData();
  }, []);

  // Calculate wrestler statistics
  const wrestlerStats = useMemo(() => {
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
      
      const totalMatches = matches.length;
      
      // Calculate average dominance score
      const totalDominanceScore = matches.reduce((sum, match) => sum + match.dominance_score, 0);
      const avgDominanceScore = totalMatches > 0 ? totalDominanceScore / totalMatches : 0;
      
      // Count falls and total fall time (only from wins)
      const fallMatches = matches.filter(m => m.result === 'Win' && m.result_type === 'Fall');
      const falls = fallMatches.length;
      const totalFallTime = fallMatches.reduce((sum, match) => sum + (match.fall_time || 0), 0);
      
      // Count technical falls (only from wins)
      const techFalls = matches.filter(m => m.result === 'Win' && m.result_type === 'Technical Fall').length;
      
      wrestlers.push({
        name,
        school,
        conference,
        totalMatches,
        avgDominanceScore,
        falls,
        totalFallTime,
        techFalls
      });
    });
    
    return wrestlers;
  }, [allMatches, schools]);

  // Top wrestlers by dominance score (min 10 matches)
  const topByDominance = useMemo(() => {
    return [...wrestlerStats]
      .filter(w => w.totalMatches >= 10)
      .sort((a, b) => b.avgDominanceScore - a.avgDominanceScore);
  }, [wrestlerStats]);

  // Top wrestlers by falls (secondary sort by total fall time)
  const topByFalls = useMemo(() => {
    return [...wrestlerStats]
      .sort((a, b) => {
        if (b.falls !== a.falls) return b.falls - a.falls;
        return a.totalFallTime - b.totalFallTime; // Lower time is better
      });
  }, [wrestlerStats]);

  // Top wrestlers by technical falls
  const topByTechFalls = useMemo(() => {
    return [...wrestlerStats]
      .sort((a, b) => b.techFalls - a.techFalls);
  }, [wrestlerStats]);

  // Calculate team statistics
  const teamStats = useMemo(() => {
    if (allDuals.length === 0 || allMatches.length === 0 || schools.length === 0) return [];
    
    const schoolConferenceMap = new Map<string, string | null>();
    schools.forEach(school => {
      schoolConferenceMap.set(school.school, school.conference_2025);
    });
    
    const teamMap = new Map<string, { wins: number; fallWins: number; techFallWins: number; individualWins: number }>();
    
    // Initialize teams
    allDuals.forEach(dual => {
      if (!teamMap.has(dual.school)) {
        teamMap.set(dual.school, { wins: 0, fallWins: 0, techFallWins: 0, individualWins: 0 });
      }
      
      if (dual.result === 'Win') {
        teamMap.get(dual.school)!.wins++;
      }
    });
    
    // Count individual wins, fall wins and tech fall wins from individual matches
    allMatches.forEach(match => {
      if (match.result === 'Win') {
        const school = match.wrestler_school;
        if (!teamMap.has(school)) return;
        
        teamMap.get(school)!.individualWins++;
        
        if (match.result_type === 'Fall') {
          teamMap.get(school)!.fallWins++;
        } else if (match.result_type === 'Technical Fall') {
          teamMap.get(school)!.techFallWins++;
        }
      }
    });
    
    // Convert to array and filter D1 teams
    const teams: TeamStats[] = Array.from(teamMap.entries())
      .map(([name, stats]) => ({
        name,
        conference: schoolConferenceMap.get(name) || null,
        totalWins: stats.wins,
        fallWins: stats.fallWins,
        techFallWins: stats.techFallWins,
        individualWins: stats.individualWins
      }))
      .filter(team => team.conference !== null); // Only D1 teams
    
    return teams;
  }, [allDuals, allMatches, schools]);

  // Top teams by wins
  const topTeamsByWins = useMemo(() => {
    return [...teamStats].sort((a, b) => b.totalWins - a.totalWins);
  }, [teamStats]);

  // Top teams by fall wins
  const topTeamsByFallWins = useMemo(() => {
    return [...teamStats].sort((a, b) => b.fallWins - a.fallWins);
  }, [teamStats]);

  // Top teams by tech fall wins
  const topTeamsByTechFallWins = useMemo(() => {
    return [...teamStats].sort((a, b) => b.techFallWins - a.techFallWins);
  }, [teamStats]);

  // Top teams by individual wins
  const topTeamsByIndividualWins = useMemo(() => {
    return [...teamStats].sort((a, b) => b.individualWins - a.individualWins);
  }, [teamStats]);

  // Format fall time (seconds to MM:SS)
  const formatFallTime = (seconds: number): string => {
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  };

  // Pagination helper
  const paginate = <T,>(items: T[], page: number): { items: T[]; totalPages: number } => {
    const startIndex = (page - 1) * ITEMS_PER_PAGE;
    const endIndex = startIndex + ITEMS_PER_PAGE;
    return {
      items: items.slice(startIndex, endIndex),
      totalPages: Math.ceil(items.length / ITEMS_PER_PAGE)
    };
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading dominance data...</p>
        </div>
      </div>
    );
  }

  const dominanceData = paginate(topByDominance, dominancePage);
  const fallsData = paginate(topByFalls, fallsPage);
  const techFallsData = paginate(topByTechFalls, techFallsPage);
  
  const teamWinsData = paginate(topTeamsByWins, teamWinsPage);
  const teamFallWinsData = paginate(topTeamsByFallWins, teamFallWinsPage);
  const teamTechFallWinsData = paginate(topTeamsByTechFallWins, teamTechFallWinsPage);
  const teamIndividualWinsData = paginate(topTeamsByIndividualWins, teamIndividualWinsPage);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-4xl font-bold text-gray-900 mb-2">Dominance Leaderboards</h1>
              <p className="text-gray-600">The most dominant wrestlers and teams this season</p>
            </div>
            <div className="flex items-center gap-2">
              <label className="text-sm font-medium text-gray-700">Season:</label>
              <select
                value={seasonFilter}
                onChange={(e) => setSeasonFilter(e.target.value)}
                className="px-3 py-1 border border-gray-300 rounded-md text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="2024-2025">2024-2025</option>
              </select>
            </div>
          </div>
        </div>

        {/* Wrestler Leaderboards */}
        <div className="mb-12">
          <h2 className="text-3xl font-bold text-gray-900 mb-6">Wrestler Leaderboards</h2>
          
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Dominance Score Leaderboard */}
            <div className="bg-white rounded-lg shadow-lg overflow-hidden">
              <div className="bg-gradient-to-r from-purple-600 to-purple-700 px-6 py-4">
                <h3 className="text-xl font-bold text-white">Dominance Score</h3>
                <p className="text-purple-100 text-sm">Avg per match (min 10 matches)</p>
              </div>
              
              <div className="divide-y divide-gray-200">
                {dominanceData.items.map((wrestler, index) => {
                  const rank = (dominancePage - 1) * ITEMS_PER_PAGE + index + 1;
                  const schoolColor = schools.find(s => s.school === wrestler.school)?.primary_color_1 || '#3B82F6';
                  
                  return (
                    <div key={`${wrestler.name}-${wrestler.school}`} className="p-2 hover:bg-gray-50">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <span className="text-lg font-bold text-gray-400 w-6">#{rank}</span>
                          <div>
                            <Link 
                              href={`/wrestlers?wrestler=${encodeURIComponent(wrestler.name)}`}
                              className="font-medium text-sm text-blue-600 hover:text-blue-800 hover:underline"
                            >
                              {wrestler.name}
                            </Link>
                            <Link 
                              href={`/team-stats?team=${encodeURIComponent(wrestler.school)}`}
                              className="block text-xs hover:underline"
                              style={{ color: schoolColor }}
                            >
                              {wrestler.school}
                            </Link>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-lg font-bold text-purple-600">
                            {wrestler.avgDominanceScore > 0 ? '+' : ''}{wrestler.avgDominanceScore.toFixed(2)}
                          </p>
                          <p className="text-xs text-gray-500">{wrestler.totalMatches} matches</p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
              
              {/* Pagination */}
              {dominanceData.totalPages > 1 && (
                <div className="bg-gray-50 px-6 py-4 flex items-center justify-between border-t">
                  <button
                    onClick={() => setDominancePage(p => Math.max(1, p - 1))}
                    disabled={dominancePage === 1}
                    className="px-3 py-1 bg-white border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Previous
                  </button>
                  <span className="text-sm text-gray-700">
                    Page {dominancePage} of {dominanceData.totalPages}
                  </span>
                  <button
                    onClick={() => setDominancePage(p => Math.min(dominanceData.totalPages, p + 1))}
                    disabled={dominancePage === dominanceData.totalPages}
                    className="px-3 py-1 bg-white border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Next
                  </button>
                </div>
              )}
            </div>

            {/* Falls Leaderboard */}
            <div className="bg-white rounded-lg shadow-lg overflow-hidden">
              <div className="bg-gradient-to-r from-orange-600 to-orange-700 px-6 py-4">
                <h3 className="text-xl font-bold text-white">Most Falls</h3>
                <p className="text-orange-100 text-sm">Sorted by count, then average time</p>
              </div>
              
              <div className="divide-y divide-gray-200">
                {fallsData.items.map((wrestler, index) => {
                  const rank = (fallsPage - 1) * ITEMS_PER_PAGE + index + 1;
                  const schoolColor = schools.find(s => s.school === wrestler.school)?.primary_color_1 || '#3B82F6';
                  
                  return (
                    <div key={`${wrestler.name}-${wrestler.school}`} className="p-2 hover:bg-gray-50">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <span className="text-lg font-bold text-gray-400 w-6">#{rank}</span>
                          <div>
                            <Link 
                              href={`/wrestlers?wrestler=${encodeURIComponent(wrestler.name)}`}
                              className="font-medium text-sm text-blue-600 hover:text-blue-800 hover:underline"
                            >
                              {wrestler.name}
                            </Link>
                            <Link 
                              href={`/team-stats?team=${encodeURIComponent(wrestler.school)}`}
                              className="block text-xs hover:underline"
                              style={{ color: schoolColor }}
                            >
                              {wrestler.school}
                            </Link>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-lg font-bold text-orange-600">{wrestler.falls}</p>
                          {wrestler.falls > 0 && (
                            <p className="text-xs text-gray-500">
                              Avg: {formatFallTime(Math.round(wrestler.totalFallTime / wrestler.falls))}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
              
              {/* Pagination */}
              {fallsData.totalPages > 1 && (
                <div className="bg-gray-50 px-6 py-4 flex items-center justify-between border-t">
                  <button
                    onClick={() => setFallsPage(p => Math.max(1, p - 1))}
                    disabled={fallsPage === 1}
                    className="px-3 py-1 bg-white border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Previous
                  </button>
                  <span className="text-sm text-gray-700">
                    Page {fallsPage} of {fallsData.totalPages}
                  </span>
                  <button
                    onClick={() => setFallsPage(p => Math.min(fallsData.totalPages, p + 1))}
                    disabled={fallsPage === fallsData.totalPages}
                    className="px-3 py-1 bg-white border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Next
                  </button>
                </div>
              )}
            </div>

            {/* Technical Falls Leaderboard */}
            <div className="bg-white rounded-lg shadow-lg overflow-hidden">
              <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-6 py-4">
                <h3 className="text-xl font-bold text-white">Most Tech Falls</h3>
                <p className="text-blue-100 text-sm">Total technical falls</p>
              </div>
              
              <div className="divide-y divide-gray-200">
                {techFallsData.items.map((wrestler, index) => {
                  const rank = (techFallsPage - 1) * ITEMS_PER_PAGE + index + 1;
                  const schoolColor = schools.find(s => s.school === wrestler.school)?.primary_color_1 || '#3B82F6';
                  
                  return (
                    <div key={`${wrestler.name}-${wrestler.school}`} className="p-2 hover:bg-gray-50">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <span className="text-lg font-bold text-gray-400 w-6">#{rank}</span>
                          <div>
                            <Link 
                              href={`/wrestlers?wrestler=${encodeURIComponent(wrestler.name)}`}
                              className="font-medium text-sm text-blue-600 hover:text-blue-800 hover:underline"
                            >
                              {wrestler.name}
                            </Link>
                            <Link 
                              href={`/team-stats?team=${encodeURIComponent(wrestler.school)}`}
                              className="block text-xs hover:underline"
                              style={{ color: schoolColor }}
                            >
                              {wrestler.school}
                            </Link>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-lg font-bold text-blue-600">{wrestler.techFalls}</p>
                          <p className="text-xs text-gray-500">&nbsp;</p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
              
              {/* Pagination */}
              {techFallsData.totalPages > 1 && (
                <div className="bg-gray-50 px-6 py-4 flex items-center justify-between border-t">
                  <button
                    onClick={() => setTechFallsPage(p => Math.max(1, p - 1))}
                    disabled={techFallsPage === 1}
                    className="px-3 py-1 bg-white border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Previous
                  </button>
                  <span className="text-sm text-gray-700">
                    Page {techFallsPage} of {techFallsData.totalPages}
                  </span>
                  <button
                    onClick={() => setTechFallsPage(p => Math.min(techFallsData.totalPages, p + 1))}
                    disabled={techFallsPage === techFallsData.totalPages}
                    className="px-3 py-1 bg-white border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Next
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Team Leaderboards */}
        <div className="mb-12">
          <h2 className="text-3xl font-bold text-gray-900 mb-6">Team Leaderboards</h2>
          
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-4 gap-6">
            {/* Total Wins Leaderboard */}
            <div className="bg-white rounded-lg shadow-lg overflow-hidden">
              <div className="bg-gradient-to-r from-green-600 to-green-700 px-6 py-4">
                <h3 className="text-xl font-bold text-white">Most Dual Wins</h3>
                <p className="text-green-100 text-sm">Total dual meet victories</p>
              </div>
              
              <div className="divide-y divide-gray-200">
                {teamWinsData.items.map((team, index) => {
                  const rank = (teamWinsPage - 1) * ITEMS_PER_PAGE + index + 1;
                  const schoolColor = schools.find(s => s.school === team.name)?.primary_color_1 || '#3B82F6';
                  
                  return (
                    <div key={team.name} className="p-2 hover:bg-gray-50">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <span className="text-lg font-bold text-gray-400 w-6">#{rank}</span>
                          <div>
                            <Link 
                              href={`/team-stats?team=${encodeURIComponent(team.name)}`}
                              className="font-medium text-sm hover:underline"
                              style={{ color: schoolColor }}
                            >
                              {team.name}
                            </Link>
                            <p className="text-xs text-gray-500">{team.conference}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-lg font-bold text-green-600">{team.totalWins}</p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
              
              {/* Pagination */}
              {teamWinsData.totalPages > 1 && (
                <div className="bg-gray-50 px-6 py-4 flex items-center justify-between border-t">
                  <button
                    onClick={() => setTeamWinsPage(p => Math.max(1, p - 1))}
                    disabled={teamWinsPage === 1}
                    className="px-3 py-1 bg-white border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Previous
                  </button>
                  <span className="text-sm text-gray-700">
                    Page {teamWinsPage} of {teamWinsData.totalPages}
                  </span>
                  <button
                    onClick={() => setTeamWinsPage(p => Math.min(teamWinsData.totalPages, p + 1))}
                    disabled={teamWinsPage === teamWinsData.totalPages}
                    className="px-3 py-1 bg-white border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Next
                  </button>
                </div>
              )}
            </div>

            {/* Fall Wins Leaderboard */}
            <div className="bg-white rounded-lg shadow-lg overflow-hidden">
              <div className="bg-gradient-to-r from-orange-600 to-orange-700 px-6 py-4">
                <h3 className="text-xl font-bold text-white">Most Wins by Fall</h3>
                <p className="text-orange-100 text-sm">Individual match wins by fall</p>
              </div>
              
              <div className="divide-y divide-gray-200">
                {teamFallWinsData.items.map((team, index) => {
                  const rank = (teamFallWinsPage - 1) * ITEMS_PER_PAGE + index + 1;
                  const schoolColor = schools.find(s => s.school === team.name)?.primary_color_1 || '#3B82F6';
                  
                  return (
                    <div key={team.name} className="p-2 hover:bg-gray-50">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <span className="text-lg font-bold text-gray-400 w-6">#{rank}</span>
                          <div>
                            <Link 
                              href={`/team-stats?team=${encodeURIComponent(team.name)}`}
                              className="font-medium text-sm hover:underline"
                              style={{ color: schoolColor }}
                            >
                              {team.name}
                            </Link>
                            <p className="text-xs text-gray-500">{team.conference}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-lg font-bold text-orange-600">{team.fallWins}</p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
              
              {/* Pagination */}
              {teamFallWinsData.totalPages > 1 && (
                <div className="bg-gray-50 px-6 py-4 flex items-center justify-between border-t">
                  <button
                    onClick={() => setTeamFallWinsPage(p => Math.max(1, p - 1))}
                    disabled={teamFallWinsPage === 1}
                    className="px-3 py-1 bg-white border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Previous
                  </button>
                  <span className="text-sm text-gray-700">
                    Page {teamFallWinsPage} of {teamFallWinsData.totalPages}
                  </span>
                  <button
                    onClick={() => setTeamFallWinsPage(p => Math.min(teamFallWinsData.totalPages, p + 1))}
                    disabled={teamFallWinsPage === teamFallWinsData.totalPages}
                    className="px-3 py-1 bg-white border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Next
                  </button>
                </div>
              )}
            </div>

            {/* Tech Fall Wins Leaderboard */}
            <div className="bg-white rounded-lg shadow-lg overflow-hidden">
              <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-6 py-4">
                <h3 className="text-xl font-bold text-white">Most Wins by Tech Fall</h3>
                <p className="text-blue-100 text-sm">Individual match wins by tech fall</p>
              </div>
              
              <div className="divide-y divide-gray-200">
                {teamTechFallWinsData.items.map((team, index) => {
                  const rank = (teamTechFallWinsPage - 1) * ITEMS_PER_PAGE + index + 1;
                  const schoolColor = schools.find(s => s.school === team.name)?.primary_color_1 || '#3B82F6';
                  
                  return (
                    <div key={team.name} className="p-2 hover:bg-gray-50">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <span className="text-lg font-bold text-gray-400 w-6">#{rank}</span>
                          <div>
                            <Link 
                              href={`/team-stats?team=${encodeURIComponent(team.name)}`}
                              className="font-medium text-sm hover:underline"
                              style={{ color: schoolColor }}
                            >
                              {team.name}
                            </Link>
                            <p className="text-xs text-gray-500">{team.conference}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-lg font-bold text-blue-600">{team.techFallWins}</p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
              
              {/* Pagination */}
              {teamTechFallWinsData.totalPages > 1 && (
                <div className="bg-gray-50 px-6 py-4 flex items-center justify-between border-t">
                  <button
                    onClick={() => setTeamTechFallWinsPage(p => Math.max(1, p - 1))}
                    disabled={teamTechFallWinsPage === 1}
                    className="px-3 py-1 bg-white border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Previous
                  </button>
                  <span className="text-sm text-gray-700">
                    Page {teamTechFallWinsPage} of {teamTechFallWinsData.totalPages}
                  </span>
                  <button
                    onClick={() => setTeamTechFallWinsPage(p => Math.min(teamTechFallWinsData.totalPages, p + 1))}
                    disabled={teamTechFallWinsPage === teamTechFallWinsData.totalPages}
                    className="px-3 py-1 bg-white border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Next
                  </button>
                </div>
              )}
            </div>

            {/* Individual Wins Leaderboard */}
            <div className="bg-white rounded-lg shadow-lg overflow-hidden">
              <div className="bg-gradient-to-r from-indigo-600 to-indigo-700 px-6 py-4">
                <h3 className="text-xl font-bold text-white">Most Individual Wins</h3>
                <p className="text-indigo-100 text-sm">Total individual match wins</p>
              </div>
              
              <div className="divide-y divide-gray-200">
                {teamIndividualWinsData.items.map((team, index) => {
                  const rank = (teamIndividualWinsPage - 1) * ITEMS_PER_PAGE + index + 1;
                  const schoolColor = schools.find(s => s.school === team.name)?.primary_color_1 || '#3B82F6';
                  
                  return (
                    <div key={team.name} className="p-2 hover:bg-gray-50">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <span className="text-lg font-bold text-gray-400 w-6">#{rank}</span>
                          <div>
                            <Link 
                              href={`/team-stats?team=${encodeURIComponent(team.name)}`}
                              className="font-medium text-sm hover:underline"
                              style={{ color: schoolColor }}
                            >
                              {team.name}
                            </Link>
                            <p className="text-xs text-gray-500">{team.conference}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-lg font-bold text-indigo-600">{team.individualWins}</p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
              
              {/* Pagination */}
              {teamIndividualWinsData.totalPages > 1 && (
                <div className="bg-gray-50 px-6 py-4 flex items-center justify-between border-t">
                  <button
                    onClick={() => setTeamIndividualWinsPage(p => Math.max(1, p - 1))}
                    disabled={teamIndividualWinsPage === 1}
                    className="px-3 py-1 bg-white border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Previous
                  </button>
                  <span className="text-sm text-gray-700">
                    Page {teamIndividualWinsPage} of {teamIndividualWinsData.totalPages}
                  </span>
                  <button
                    onClick={() => setTeamIndividualWinsPage(p => Math.min(teamIndividualWinsData.totalPages, p + 1))}
                    disabled={teamIndividualWinsPage === teamIndividualWinsData.totalPages}
                    className="px-3 py-1 bg-white border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Next
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

