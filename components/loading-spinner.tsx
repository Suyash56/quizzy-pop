import { LoaderCircle, Trophy } from "lucide-react";

interface LoadingSpinnerProps {
  message?: string;
  showLogo?: boolean;
}

export function LoadingSpinner({
  message = "Loading...",
  showLogo = true,
}: LoadingSpinnerProps) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-50 via-blue-50 to-white p-4">
      <div className="text-center space-y-6">
        {showLogo && (
          <div className="inline-flex items-center gap-2 mb-4">
            <Trophy className="w-10 h-10 text-purple-600" />
            <h1 className="text-3xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
              QuizzyPop
            </h1>
          </div>
        )}
        <div className="flex flex-col items-center gap-4">
          <div className="relative">
            <LoaderCircle className="w-12 h-12 text-purple-600 animate-spin" />
          </div>
          <p className="text-gray-600 font-medium">{message}</p>
        </div>
      </div>
    </div>
  );
}
