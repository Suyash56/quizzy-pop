import { getQuizForJoin } from "@/app/actions/quiz";
import { JoinQuizForm } from "@/components/join-quiz-form";
import { Trophy, AlertCircle, XCircle } from "lucide-react";
import Link from "next/link";

export default async function JoinQuizPage({
  params,
}: {
  params: Promise<{ quizId: string }>;
}) {
  const { quizId } = await params;
  
  try {
    // Use public server action that doesn't require authentication
    const result = await getQuizForJoin(quizId);

    if (result.error || !result.data) {
      console.error("Quiz fetch error:", result.error);
      console.log("Quiz ID:", quizId);
      // Show error page instead of redirecting
      return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-50 via-blue-50 to-white p-4">
          <div className="w-full max-w-md">
            <div className="text-center mb-8">
              <div className="inline-flex items-center gap-2 mb-2">
                <Trophy className="w-10 h-10 text-purple-600" />
                <h1 className="text-3xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
                  QuizzyPop
                </h1>
              </div>
            </div>
            <div className="bg-white rounded-2xl shadow-xl p-8 border border-gray-100 text-center">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-red-100 flex items-center justify-center">
                <XCircle className="w-8 h-8 text-red-600" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Quiz Not Found</h2>
              <p className="text-gray-600 mb-4">
                {result.error || "The quiz you're looking for doesn't exist or is no longer available."}
              </p>
              <p className="text-sm text-gray-500 mb-6">Quiz ID: {quizId}</p>
              <Link
                href="/"
                className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white rounded-lg font-medium transition-all shadow-md hover:shadow-lg"
              >
                Go back home
              </Link>
            </div>
          </div>
        </div>
      );
    }

    const quiz = result.data;

    const settings = quiz.settings_json || {};
    if (settings.participationEnabled === false) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-50 via-blue-50 to-white p-4">
          <div className="w-full max-w-md">
            <div className="text-center mb-8">
              <div className="inline-flex items-center gap-2 mb-2">
                <Trophy className="w-10 h-10 text-purple-600" />
                <h1 className="text-3xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
                  QuizzyPop
                </h1>
              </div>
            </div>
            <div className="bg-white rounded-2xl shadow-xl p-8 border border-gray-100 text-center">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-yellow-100 flex items-center justify-center">
                <AlertCircle className="w-8 h-8 text-yellow-600" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Participation Disabled</h2>
              <p className="text-gray-600 mb-6">
                This quiz is not accepting participants at the moment.
              </p>
              <Link
                href="/"
                className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white rounded-lg font-medium transition-all shadow-md hover:shadow-lg"
              >
                Go back home
              </Link>
            </div>
          </div>
        </div>
      );
    }

    return <JoinQuizForm quizId={quizId} quizTitle={quiz.title} />;
  } catch (error) {
    console.error("Join page error:", error);
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-50 via-blue-50 to-white p-4">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <div className="inline-flex items-center gap-2 mb-2">
              <Trophy className="w-10 h-10 text-purple-600" />
              <h1 className="text-3xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
                QuizzyPop
              </h1>
            </div>
          </div>
          <div className="bg-white rounded-2xl shadow-xl p-8 border border-gray-100 text-center">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-red-100 flex items-center justify-center">
              <AlertCircle className="w-8 h-8 text-red-600" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Error</h2>
            <p className="text-gray-600 mb-6">
              Something went wrong. Please try again later.
            </p>
            <Link
              href="/"
              className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white rounded-lg font-medium transition-all shadow-md hover:shadow-lg"
            >
              Go back home
            </Link>
          </div>
        </div>
      </div>
    );
  }
}

