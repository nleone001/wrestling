'use client';

import { useState, useEffect, useMemo } from 'react';
import dynamic from 'next/dynamic';

// Dynamically import Chart.js components to avoid SSR issues
const Bar = dynamic(() => import('react-chartjs-2').then((mod) => mod.Bar), {
  ssr: false,
  loading: () => <div className="h-full flex items-center justify-center bg-gray-50 rounded-lg">
    <div className="text-center">
      <div className="text-gray-500 text-lg mb-2">Loading chart...</div>
    </div>
  </div>
});

// Register Chart.js components on client side only
if (typeof window !== 'undefined') {
  import('chart.js').then((chart) => {
    chart.Chart.register(
      chart.CategoryScale,
      chart.LinearScale,
      chart.BarElement,
      chart.Title,
      chart.Tooltip,
      chart.Legend
    );
  });
}

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

interface WeightClassStats {
  weight: number;
  totalMatches: number;
  totalWrestlers: number;
  falls: number;
  techFalls: number;
  majors: number;
  decisions: number;
  otherResults: number;
}

const weightClasses = [125, 133, 141, 149, 157, 165, 174, 184, 197, 285];

export default function WeightsClient() {
  const [matches, setMatches] = useState<WrestlerMatch[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [chartType, setChartType] = useState<'results' | 'participation'>('results');
  const [displayMode, setDisplayMode] = useState<'counts' | 'percentages'>('counts');

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await fetch('/data/wrestlers-2025.json');
        if (!response.ok) {
          throw new Error('Failed to fetch data');
        }
        const data = await response.json();
        console.log('Loaded matches:', data.length);
        console.log('Sample match:', data[0]);
        setMatches(data);
        setLoading(false);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred');
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const weightClassStats = useMemo((): WeightClassStats[] => {
    if (!matches.length) {
      console.log('No matches loaded yet');
      return [];
    }

    console.log('Processing', matches.length, 'matches for weight class stats');
    return weightClasses.map(weight => {
      // Filter matches for this weight class
      const weightMatches = matches.filter(match => match.wt === weight);
      console.log(`Weight ${weight}: found ${weightMatches.length} matches`);
      
      // Create a set to track unique matches (avoid double counting)
      const uniqueMatches = new Set<string>();
      const matchResults: { result_type: string }[] = [];
      
      // Process matches to avoid double counting
      weightMatches.forEach(match => {
        // Create a unique key for each match (combine wrestlers and date)
        const matchKey = `${match.date}-${[match.wrestler, match.opponent].sort().join('-')}`;
        
        if (!uniqueMatches.has(matchKey)) {
          uniqueMatches.add(matchKey);
          // Only count the winning result type
          if (match.result === 'Win') {
            matchResults.push({ result_type: match.result_type });
          }
        }
      });
      
      const uniqueWrestlers = new Set(weightMatches.map(match => match.wrestler)).size;
      
      const falls = matchResults.filter(match => 
        match.result_type?.toLowerCase().includes('fall') || 
        match.result_type?.toLowerCase().includes('pin')
      ).length;
      
      const techFalls = matchResults.filter(match => 
        match.result_type?.toLowerCase().includes('tech')
      ).length;
      
      const majors = matchResults.filter(match => 
        match.result_type?.toLowerCase().includes('major')
      ).length;
      
      const decisions = matchResults.filter(match => 
        match.result_type?.toLowerCase().includes('decision')
      ).length;
      
      const otherResults = matchResults.filter(match => 
        match.result_type?.toLowerCase().includes('medical') ||
        match.result_type?.toLowerCase().includes('default') ||
        match.result_type?.toLowerCase().includes('forfeit') ||
        match.result_type?.toLowerCase().includes('disqualific')
      ).length;

      console.log(`Weight ${weight} results: Falls=${falls}, TechFalls=${techFalls}, Majors=${majors}, Decisions=${decisions}, Other=${otherResults}, Total=${matchResults.length}`);

      return {
        weight,
        totalMatches: uniqueMatches.size,
        totalWrestlers: uniqueWrestlers,
        falls,
        techFalls,
        majors,
        decisions,
        otherResults
      };
    });
  }, [matches]);

  const chartData = useMemo(() => {
    const labels = weightClasses.map(w => `${w} lbs`);
    
    // Calculate totals for percentage calculations
    const totalWrestlers = weightClassStats.reduce((sum, stats) => sum + stats.totalWrestlers, 0);
    const totalMatches = weightClassStats.reduce((sum, stats) => sum + stats.totalMatches, 0);
    
    if (chartType === 'results') {
      return {
        labels,
        datasets: [
          {
            label: 'Falls',
            data: weightClassStats.map(stats => {
              if (displayMode === 'percentages') {
                const totalResults = stats.falls + stats.techFalls + stats.majors + stats.decisions + stats.otherResults;
                return totalResults > 0 ? (stats.falls / totalResults) * 100 : 0;
              }
              return stats.falls;
            }),
            backgroundColor: 'rgba(239, 68, 68, 0.8)',
            borderColor: 'rgba(239, 68, 68, 1)',
            borderWidth: 1,
          },
          {
            label: 'Technical Falls',
            data: weightClassStats.map(stats => {
              if (displayMode === 'percentages') {
                const totalResults = stats.falls + stats.techFalls + stats.majors + stats.decisions + stats.otherResults;
                return totalResults > 0 ? (stats.techFalls / totalResults) * 100 : 0;
              }
              return stats.techFalls;
            }),
            backgroundColor: 'rgba(245, 158, 11, 0.8)',
            borderColor: 'rgba(245, 158, 11, 1)',
            borderWidth: 1,
          },
          {
            label: 'Major Decisions',
            data: weightClassStats.map(stats => {
              if (displayMode === 'percentages') {
                const totalResults = stats.falls + stats.techFalls + stats.majors + stats.decisions + stats.otherResults;
                return totalResults > 0 ? (stats.majors / totalResults) * 100 : 0;
              }
              return stats.majors;
            }),
            backgroundColor: 'rgba(59, 130, 246, 0.8)',
            borderColor: 'rgba(59, 130, 246, 1)',
            borderWidth: 1,
          },
          {
            label: 'Decisions',
            data: weightClassStats.map(stats => {
              if (displayMode === 'percentages') {
                const totalResults = stats.falls + stats.techFalls + stats.majors + stats.decisions + stats.otherResults;
                return totalResults > 0 ? (stats.decisions / totalResults) * 100 : 0;
              }
              return stats.decisions;
            }),
            backgroundColor: 'rgba(34, 197, 94, 0.8)',
            borderColor: 'rgba(34, 197, 94, 1)',
            borderWidth: 1,
          },
          {
            label: 'Other Results (Forfeits, Defaults, etc.)',
            data: weightClassStats.map(stats => {
              if (displayMode === 'percentages') {
                const totalResults = stats.falls + stats.techFalls + stats.majors + stats.decisions + stats.otherResults;
                return totalResults > 0 ? (stats.otherResults / totalResults) * 100 : 0;
              }
              return stats.otherResults;
            }),
            backgroundColor: 'rgba(156, 163, 175, 0.8)',
            borderColor: 'rgba(156, 163, 175, 1)',
            borderWidth: 1,
          },
        ],
      };
    } else {
      return {
        labels,
        datasets: [
          {
            label: 'Wrestlers',
            data: weightClassStats.map(stats => {
              if (displayMode === 'percentages') {
                return totalWrestlers > 0 ? (stats.totalWrestlers / totalWrestlers) * 100 : 0;
              }
              return stats.totalWrestlers;
            }),
            backgroundColor: 'rgba(99, 102, 241, 0.8)',
            borderColor: 'rgba(99, 102, 241, 1)',
            borderWidth: 1,
          },
          {
            label: 'Matches',
            data: weightClassStats.map(stats => {
              if (displayMode === 'percentages') {
                return totalMatches > 0 ? (stats.totalMatches / totalMatches) * 100 : 0;
              }
              return stats.totalMatches;
            }),
            backgroundColor: 'rgba(168, 85, 247, 0.8)',
            borderColor: 'rgba(168, 85, 247, 1)',
            borderWidth: 1,
          },
        ],
      };
    }
  }, [weightClassStats, chartType, displayMode]);

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top' as const,
      },
      title: {
        display: true,
        text: chartType === 'results' 
          ? (displayMode === 'percentages' 
              ? 'Match Result Types by Weight Class (%)' 
              : 'Match Result Types by Weight Class')
          : (displayMode === 'percentages' 
              ? 'Participation by Weight Class (%)' 
              : 'Participation by Weight Class'),
      },
    },
    scales: {
      x: {
        title: {
          display: true,
          text: 'Weight Class (lbs)',
        },
      },
      y: {
        beginAtZero: true,
        title: {
          display: true,
          text: displayMode === 'percentages' 
            ? (chartType === 'results' ? 'Percentage of Results' : 'Percentage of Total')
            : (chartType === 'results' ? 'Number of Wins' : 'Count'),
        },
        ticks: displayMode === 'percentages' ? {
          callback: function(value: number | string) {
            return value + '%';
          }
        } : undefined,
      },
    },
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading weight class statistics...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600 mb-4">Error loading data: {error}</p>
          <button 
            onClick={() => window.location.reload()} 
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="container mx-auto px-4 py-8">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            📊 Weight Class Analysis
          </h1>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Visual analysis of NCAA D1 wrestling by weight class for the 2025 season.
          </p>
        </div>

        <div className="bg-white rounded-lg shadow-lg p-8 max-w-7xl mx-auto">
          {/* Chart Type Toggle */}
          <div className="flex justify-center mb-4">
            <div className="bg-gray-100 p-1 rounded-lg">
              <button
                onClick={() => setChartType('results')}
                className={`px-6 py-2 rounded-md text-sm font-medium transition-colors ${
                  chartType === 'results'
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Match Result Types
              </button>
              <button
                onClick={() => setChartType('participation')}
                className={`px-6 py-2 rounded-md text-sm font-medium transition-colors ${
                  chartType === 'participation'
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Participation
              </button>
            </div>
          </div>

          {/* Display Mode Toggle */}
          <div className="flex justify-center mb-8">
            <div className="bg-gray-100 p-1 rounded-lg">
              <button
                onClick={() => setDisplayMode('counts')}
                className={`px-6 py-2 rounded-md text-sm font-medium transition-colors ${
                  displayMode === 'counts'
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Counts
              </button>
              <button
                onClick={() => setDisplayMode('percentages')}
                className={`px-6 py-2 rounded-md text-sm font-medium transition-colors ${
                  displayMode === 'percentages'
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Percentages
              </button>
            </div>
          </div>

          {/* Chart Container */}
          <div className="h-96 w-full">
            {weightClassStats.length > 0 && weightClassStats.some(stats => stats.totalMatches > 0) ? (
              <Bar data={chartData} options={chartOptions} />
            ) : (
              <div className="h-full flex items-center justify-center bg-gray-50 rounded-lg">
                <div className="text-center">
                  <div className="text-gray-500 text-lg mb-2">No data available</div>
                  <div className="text-gray-400 text-sm">
                    {matches.length === 0 ? 'Loading data...' : 'No matches found for the selected criteria'}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Summary Statistics */}
          <div className="mt-8 flex justify-center">
            <div className="bg-blue-50 p-6 rounded-lg max-w-md">
              <h3 className="text-lg font-semibold text-blue-800 mb-3">Total Statistics</h3>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-gray-600">Total Matches:</span>
                  <span className="font-medium text-gray-900">{weightClassStats.reduce((sum, stats) => sum + stats.totalMatches, 0).toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Total Wrestlers:</span>
                  <span className="font-medium text-gray-900">{weightClassStats.reduce((sum, stats) => sum + stats.totalWrestlers, 0).toLocaleString()}</span>
                </div>
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
