export default function JoinQuizLoading() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-50 via-blue-50 to-white p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 mb-2">
            <div className="w-10 h-10 bg-gray-200 rounded animate-pulse"></div>
            <div className="h-8 w-32 bg-gray-200 rounded animate-pulse"></div>
          </div>
          <div className="h-4 w-48 bg-gray-200 rounded mx-auto animate-pulse"></div>
        </div>

        <div className="bg-white rounded-2xl shadow-xl p-8 border border-gray-100 animate-pulse">
          <div className="space-y-5">
            <div className="h-6 w-24 bg-gray-200 rounded"></div>
            <div className="h-12 w-full bg-gray-100 rounded-lg"></div>
            <div className="h-6 w-32 bg-gray-200 rounded"></div>
            <div className="h-12 w-full bg-gray-100 rounded-lg"></div>
            <div className="h-12 w-full bg-gray-200 rounded-lg"></div>
          </div>
        </div>
      </div>
    </div>
  );
}

