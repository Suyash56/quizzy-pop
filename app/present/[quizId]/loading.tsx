export default function PresentQuizLoading() {
  return (
    <div className="min-h-screen bg-gray-900 text-white">
      {/* Header Skeleton */}
      <div className="bg-gray-800 border-b border-gray-700 px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div>
            <div className="h-8 w-32 bg-gray-700 rounded mb-2 animate-pulse"></div>
            <div className="h-4 w-56 bg-gray-700 rounded animate-pulse"></div>
          </div>
          <div className="flex items-center gap-4">
            <div className="h-10 w-20 bg-gray-700 rounded-lg animate-pulse"></div>
            <div className="h-10 w-24 bg-gray-700 rounded-lg animate-pulse"></div>
            <div className="h-10 w-32 bg-purple-700 rounded-lg animate-pulse"></div>
          </div>
        </div>
      </div>

      {/* Main Content - Waiting to Start Skeleton */}
      <div className="max-w-7xl mx-auto p-6">
        <div className="text-center py-20">
          <div className="max-w-2xl mx-auto space-y-6">
            <div className="bg-gray-800 rounded-lg p-8 border border-gray-700">
              {/* Title */}
              <div className="h-10 w-64 bg-gray-700 rounded mx-auto mb-4 animate-pulse"></div>
              
              {/* Instructions */}
              <div className="h-5 w-full max-w-md bg-gray-700 rounded mx-auto mb-6 animate-pulse"></div>
              
              {/* Room Code Box */}
              <div className="bg-gray-700 rounded-lg p-6 mb-6">
                <div className="h-4 w-28 bg-gray-600 rounded mx-auto mb-3 animate-pulse"></div>
                <div className="h-12 w-48 bg-gray-600 rounded mx-auto animate-pulse"></div>
              </div>
              
              {/* Participants Count */}
              <div className="text-left">
                <div className="h-4 w-56 bg-gray-700 rounded animate-pulse"></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

