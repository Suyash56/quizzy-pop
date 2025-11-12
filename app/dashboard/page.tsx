import { createClient } from "@/utils/supabase/server";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Plus, BarChart3, Home } from "lucide-react";
import { getRecentlyViewedQuizzes } from "@/app/actions/quiz";
import { QuizCard } from "@/components/quiz-card";

export default async function DashboardPage() {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getUser();

  if (error || !data.user) {
    return (
      <div className="p-8">
        <h1 className="text-3xl font-semibold">Dashboard</h1>
        <p className="mt-2 text-red-600">Not authenticated</p>
      </div>
    );
  }

  const userName =
    data.user?.user_metadata?.name ||
    data.user?.user_metadata?.full_name ||
    data.user?.email?.split("@")[0] ||
    "User";

  // Fetch recently viewed quizzes
  const { data: recentlyViewed = [] } = await getRecentlyViewedQuizzes(5);

  return (
    <div className="p-6 md:p-8 lg:p-10 max-w-7xl mx-auto">
      {/* Welcome Section */}
      <div className="mb-10">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-4xl font-bold text-gray-900 mb-2">
              Welcome back, <span className="bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">{userName}</span>!
            </h1>
            <p className="text-gray-600">
              Create and manage your interactive quizzes
            </p>
          </div>
          <Link href="/quiz/create">
            <Button size="lg" className="gap-2 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white shadow-lg hover:shadow-xl transition-all">
              <Plus className="w-5 h-5" />
              New Quiz
            </Button>
          </Link>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
        <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl p-6 border border-purple-200 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-purple-700 mb-1">Total Quizzes</p>
              <p className="text-3xl font-bold text-purple-900">
                {recentlyViewed.length > 0 ? recentlyViewed.length : 0}
              </p>
            </div>
            <div className="w-12 h-12 bg-purple-200 rounded-lg flex items-center justify-center">
              <BarChart3 className="w-6 h-6 text-purple-700" />
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl p-6 border border-blue-200 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-blue-700 mb-1">Recently Viewed</p>
              <p className="text-3xl font-bold text-blue-900">
                {recentlyViewed.length}
              </p>
            </div>
            <div className="w-12 h-12 bg-blue-200 rounded-lg flex items-center justify-center">
              <Home className="w-6 h-6 text-blue-700" />
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-xl p-6 border border-green-200 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-green-700 mb-1">Active Sessions</p>
              <p className="text-3xl font-bold text-green-900">0</p>
            </div>
            <div className="w-12 h-12 bg-green-200 rounded-lg flex items-center justify-center">
              <Plus className="w-6 h-6 text-green-700" />
            </div>
          </div>
        </div>
      </div>

      {/* Recently Viewed Section */}
      {recentlyViewed.length > 0 ? (
        <div className="mt-8">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-2xl font-bold text-gray-900">
              Recently viewed
            </h2>
            <Link href="/dashboard/quizzes">
              <Button variant="ghost" className="text-purple-600 hover:text-purple-700 hover:bg-purple-50">
                View all →
              </Button>
            </Link>
          </div>
          <div className="flex gap-4 overflow-x-auto pb-4 pt-4 -mx-2 px-2 scrollbar-hide">
            {recentlyViewed.map((quiz) => (
              <QuizCard key={quiz.id} quiz={quiz} variant="horizontal" />
            ))}
          </div>
        </div>
      ) : (
        <div className="mt-12 text-center py-16 bg-white rounded-xl border-2 border-dashed border-gray-300">
          <BarChart3 className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-gray-900 mb-2">
            No quizzes yet
          </h3>
          <p className="text-gray-600 mb-6">
            Get started by creating your first quiz
          </p>
          <Link href="/quiz/create">
            <Button size="lg" className="gap-2 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white">
              <Plus className="w-5 h-5" />
              Create Your First Quiz
            </Button>
          </Link>
        </div>
      )}
    </div>
  );
}

