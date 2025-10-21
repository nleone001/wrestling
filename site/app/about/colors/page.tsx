'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

interface School {
  school: string;
  conference_2025: string | null;
  primary_color_1: string;
  primary_color_2: string | null;
  secondary_color_1: string | null;
  secondary_color_2: string | null;
}

export default function ColorsPage() {
  const [schools, setSchools] = useState<School[]>([]);
  const [colorMode, setColorMode] = useState<'primary' | 'secondary' | 'both'>('both');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadSchools() {
      try {
        const response = await fetch('/data/schools.json');
        const schoolsData: School[] = await response.json();
        setSchools(schoolsData);
        setLoading(false);
      } catch (error) {
        console.error('Error loading schools data:', error);
        setLoading(false);
      }
    }

    loadSchools();
  }, []);

  const getTextColor = (hexColor: string) => {
    const hex = hexColor.replace('#', '');
    const r = parseInt(hex.substr(0, 2), 16);
    const g = parseInt(hex.substr(2, 2), 16);
    const b = parseInt(hex.substr(4, 2), 16);
    const brightness = (r * 299 + g * 587 + b * 114) / 1000;
    return brightness > 128 ? 'light' : '';
  };

  const getCardStyle = (school: School) => {
    if (colorMode === 'primary') {
      return {
        backgroundColor: school.primary_color_1,
        backgroundImage: 'none'
      };
    } else if (colorMode === 'secondary') {
      const secondaryColor = school.primary_color_2 || school.secondary_color_1 || school.primary_color_1;
      return {
        backgroundColor: secondaryColor,
        backgroundImage: 'none'
      };
    } else {
      // Both colors - minimal gradient zone (10-15% blend)
      const primaryColor = school.primary_color_1;
      const secondaryColor = school.primary_color_2 || school.secondary_color_1 || school.primary_color_1;
      return {
        backgroundColor: primaryColor,
        backgroundImage: `linear-gradient(135deg, ${primaryColor} 0%, ${primaryColor} 45%, ${secondaryColor} 55%, ${secondaryColor} 100%)`
      };
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading team colors...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <Link 
              href="/about"
              className="inline-flex items-center text-blue-600 hover:text-blue-800 mb-4"
            >
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              Back to About
            </Link>
            <h1 className="text-4xl font-bold text-gray-900 mb-2">School Color Heatmap</h1>
            <p className="text-gray-600">Explore the color palettes of all NCAA D1 wrestling teams</p>
          </div>

          {/* Toggle Controls */}
          <div className="bg-white rounded-lg shadow-lg p-6 mb-8">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Color Display Mode</h2>
            <div className="flex flex-wrap gap-4">
              <button
                onClick={() => setColorMode('both')}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  colorMode === 'both'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Primary + Secondary
              </button>
              <button
                onClick={() => setColorMode('primary')}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  colorMode === 'primary'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Primary Colors
              </button>
              <button
                onClick={() => setColorMode('secondary')}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  colorMode === 'secondary'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Secondary Colors
              </button>
            </div>
            <p className="text-sm text-gray-500 mt-2">
              {colorMode === 'primary' && 'Showing each team\'s primary marketing color'}
              {colorMode === 'secondary' && 'Showing each team\'s secondary marketing color'}
              {colorMode === 'both' && 'Showing gradient combinations of primary and secondary colors'}
            </p>
          </div>

          {/* Color Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {schools.map((school, index) => (
              <div
                key={index}
                className="group relative bg-white rounded-lg shadow-md hover:shadow-lg transition-all duration-300 overflow-hidden"
              >
                <div
                  className="h-20 flex flex-col items-center justify-center text-white font-bold transition-all duration-300 group-hover:scale-105 relative"
                  style={getCardStyle(school)}
                >
                  <span className="text-white text-center px-2 text-xs leading-tight font-semibold" style={{ textShadow: '1px 1px 0 #000, -1px -1px 0 #000, 1px -1px 0 #000, -1px 1px 0 #000' }}>
                    {school.school}
                  </span>
                </div>
                
                {/* Hover overlay with details */}
                <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-80 transition-all duration-300 flex items-center justify-center opacity-0 group-hover:opacity-100">
                  <div className="text-center text-white p-3">
                    <div className="font-bold text-sm mb-1">{school.school}</div>
                    <div className="text-xs opacity-90 mb-2">{school.conference_2025}</div>
                    <div className="text-xs opacity-75">
                      {colorMode === 'primary' && school.primary_color_1}
                      {colorMode === 'secondary' && (school.primary_color_2 || school.secondary_color_1 || school.primary_color_1)}
                      {colorMode === 'both' && `${school.primary_color_1} + ${school.primary_color_2 || school.secondary_color_1 || school.primary_color_1}`}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Footer Info */}
          <div className="mt-8 text-center text-gray-500 text-sm">
            <p>Hover over team cards to see details • {schools.length} NCAA D1 wrestling teams</p>
          </div>
        </div>
      </div>
    </div>
  );
}
