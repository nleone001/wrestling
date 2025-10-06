export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">
          <h1 className="text-6xl font-bold text-gray-900 mb-6">
            🏆 MatAnalytics
          </h1>
          <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
            Zero-cost dashboards for NCAA D1 wrestling stats. 
            Weekly local ETL in Python → static artifacts → Cloudflare Pages.
          </p>
          
          <div className="bg-white rounded-lg shadow-lg p-8 max-w-4xl mx-auto">
            <h2 className="text-3xl font-semibold text-gray-800 mb-4">
              Welcome to MatAnalytics
            </h2>
            <p className="text-lg text-gray-600 mb-6">
              Your wrestling analytics platform is ready for development!
            </p>
            
            <div className="mt-8 p-4 bg-gray-50 rounded-lg">
              <p className="text-sm text-gray-600">
                <strong>Status:</strong> Homepage placeholder - team results page coming soon!
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
