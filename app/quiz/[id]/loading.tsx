export default function QuizEditLoading() {
  return (
    <div className="flex h-screen bg-gray-50">
      {/* Left Sidebar Skeleton */}
      <div className="w-64 bg-white border-r border-gray-200 p-4 animate-pulse">
        <div className="h-8 w-32 bg-gray-200 rounded mb-6"></div>
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-16 bg-gray-100 rounded-lg"></div>
          ))}
        </div>
      </div>

      {/* Main Content Skeleton */}
      <div className="flex-1 p-8">
        <div className="max-w-4xl mx-auto space-y-6">
          <div className="h-10 w-64 bg-gray-200 rounded"></div>
          <div className="h-32 bg-gray-100 rounded-lg"></div>
          <div className="space-y-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-20 bg-gray-100 rounded-lg"></div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

