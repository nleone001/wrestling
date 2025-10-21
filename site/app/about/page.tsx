import Link from 'next/link';

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-4xl font-bold text-gray-900 mb-8">About MatAnalytics</h1>
          
          {/* About Section */}
          <div className="bg-white rounded-lg shadow-lg p-8 mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">About This Project</h2>
            <p className="text-gray-600 mb-4">
              MatAnalytics is a comprehensive NCAA D1 wrestling statistics dashboard built with modern web technologies. 
              Our goal is to provide wrestling fans, coaches, and analysts with easy access to team and individual 
              performance data through an intuitive, zero-cost platform.
            </p>
            <p className="text-gray-600 mb-4">
              The platform features real-time team results, detailed dual meet breakdowns, conference standings, 
              and interactive visualizations. All data is processed through a weekly ETL pipeline and served 
              as static artifacts for fast, reliable performance.
            </p>
            <p className="text-gray-600">
              Built with Next.js, React, and Tailwind CSS, MatAnalytics demonstrates how modern web development 
              can create powerful analytics tools without the need for expensive backend infrastructure.
            </p>
          </div>

          {/* Contact Section */}
          <div className="bg-white rounded-lg shadow-lg p-8 mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">Connect</h2>
            <p className="text-gray-600 mb-4">
              Follow the development and get updates on new features:
            </p>
            <a 
              href="https://x.com/CauliFriend" 
              target="_blank" 
              rel="noopener noreferrer"
              className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 24 24">
                <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
              </svg>
              @CauliFriend
            </a>
          </div>

          {/* Fun Pages Section */}
          <div className="bg-white rounded-lg shadow-lg p-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-6">Fun Pages</h2>
            <p className="text-gray-600 mb-6">
              Explore some interesting visualizations and data insights:
            </p>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <Link 
                href="/about/colors"
                className="group bg-gradient-to-br from-blue-50 to-indigo-100 rounded-lg p-6 hover:shadow-lg transition-all duration-300 border border-gray-200 hover:border-blue-300"
              >
                <div className="flex items-center mb-4">
                  <div className="w-12 h-12 bg-gradient-to-br from-red-500 to-blue-500 rounded-lg flex items-center justify-center mr-4">
                    <span className="text-white font-bold text-lg">🎨</span>
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 group-hover:text-blue-600 transition-colors">
                    School Color Heatmap
                  </h3>
                </div>
                <p className="text-gray-600 text-sm">
                  Interactive visualization of all NCAA D1 wrestling team colors. 
                  Explore primary and secondary colors, and see the color distribution across conferences.
                </p>
              </Link>

              {/* Placeholder for future fun pages */}
              <div className="group bg-gradient-to-br from-gray-50 to-gray-100 rounded-lg p-6 border border-gray-200 opacity-60">
                <div className="flex items-center mb-4">
                  <div className="w-12 h-12 bg-gradient-to-br from-gray-400 to-gray-500 rounded-lg flex items-center justify-center mr-4">
                    <span className="text-white font-bold text-lg">📊</span>
                  </div>
                  <h3 className="text-lg font-semibold text-gray-500">
                    More Visualizations
                  </h3>
                </div>
                <p className="text-gray-500 text-sm">
                  Coming soon! More data visualizations and interactive features.
                </p>
              </div>

              <div className="group bg-gradient-to-br from-gray-50 to-gray-100 rounded-lg p-6 border border-gray-200 opacity-60">
                <div className="flex items-center mb-4">
                  <div className="w-12 h-12 bg-gradient-to-br from-gray-400 to-gray-500 rounded-lg flex items-center justify-center mr-4">
                    <span className="text-white font-bold text-lg">🏆</span>
                  </div>
                  <h3 className="text-lg font-semibold text-gray-500">
                    Conference Analysis
                  </h3>
                </div>
                <p className="text-gray-500 text-sm">
                  Coming soon! Deep dive into conference performance and trends.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
