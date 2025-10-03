export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="container mx-auto px-4 py-16">
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
              Hello, World! 🎉
            </h2>
            <p className="text-lg text-gray-600 mb-6">
              Your wrestling analytics platform is up and running!
            </p>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mt-8">
              <div className="bg-blue-50 p-4 rounded-lg">
                <h3 className="font-semibold text-blue-800">Wrestlers</h3>
                <p className="text-sm text-blue-600">Individual stats & performance</p>
              </div>
              <div className="bg-green-50 p-4 rounded-lg">
                <h3 className="font-semibold text-green-800">Teams</h3>
                <p className="text-sm text-green-600">Team rankings & comparisons</p>
              </div>
              <div className="bg-purple-50 p-4 rounded-lg">
                <h3 className="font-semibold text-purple-800">Weights</h3>
                <p className="text-sm text-purple-600">Weight class analysis</p>
              </div>
              <div className="bg-orange-50 p-4 rounded-lg">
                <h3 className="font-semibold text-orange-800">Duals</h3>
                <p className="text-sm text-orange-600">Match results & history</p>
              </div>
            </div>
            
            <div className="mt-8 p-4 bg-gray-50 rounded-lg">
              <p className="text-sm text-gray-600">
                <strong>Next steps:</strong> Add your data files to <code className="bg-gray-200 px-2 py-1 rounded">public/data/</code> 
                and start building the analytics dashboard!
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
