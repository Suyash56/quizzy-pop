export default function DashboardLoading() {
  return (
    <div className="p-6 md:p-8 lg:p-10 max-w-7xl mx-auto animate-pulse">
      {/* Welcome Section */}
      <div className="mb-10">
        <div className="flex items-center justify-between mb-6">
          <div>
            <div className="h-10 w-64 bg-gray-200 rounded mb-2"></div>
            <div className="h-6 w-96 bg-gray-200 rounded"></div>
          </div>
          <div className="h-12 w-32 bg-gray-200 rounded-lg"></div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
        {[1, 2, 3].map((i) => (
          <div key={i} className="bg-gray-100 rounded-xl p-6 border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <div className="h-4 w-24 bg-gray-200 rounded mb-2"></div>
                <div className="h-8 w-16 bg-gray-200 rounded"></div>
              </div>
              <div className="w-12 h-12 bg-gray-200 rounded-lg"></div>
            </div>
          </div>
        ))}
      </div>

      {/* Recently Viewed Section */}
      <div className="mt-8">
        <div className="flex items-center justify-between mb-2">
          <div className="h-8 w-48 bg-gray-200 rounded"></div>
          <div className="h-8 w-24 bg-gray-200 rounded"></div>
        </div>
        <div className="flex gap-4 overflow-x-auto pb-4 pt-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="min-w-[280px] h-48 bg-gray-100 rounded-xl border border-gray-200"></div>
          ))}
        </div>
      </div>
    </div>
  );
}

