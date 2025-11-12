import { createClient } from "@/utils/supabase/server";
import { getUserQuizzes } from "@/app/actions/quiz";
import { QuizCard } from "@/components/quiz-card";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";

export default async function QuizzesPage() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();

  if (!data.user) {
    return (
      <div className="p-8">
        <h1 className="text-3xl font-semibold">My Quizzes</h1>
        <p className="mt-2 text-red-600">Not authenticated</p>
      </div>
    );
  }

  // Fetch user's quizzes from database
  const { data: quizzes = [] } = await getUserQuizzes();

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-semibold">My Quizzes</h1>
        <Link href="/quiz/create">
          <Button className="gap-2">
            <Plus className="w-4 h-4" />
            New Quiz
          </Button>
        </Link>
      </div>

      {quizzes.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {quizzes.map((quiz) => (
            <QuizCard key={quiz.id} quiz={quiz} variant="grid" />
          ))}
        </div>
      ) : (
        <div className="text-center py-16">
          <div className="max-w-md mx-auto">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Plus className="w-8 h-8 text-gray-400" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              No quizzes yet
            </h3>
            <p className="text-gray-600 mb-6">
              Create your first quiz to get started!
            </p>
            <Link href="/quiz/create">
              <Button size="lg" className="gap-2">
                <Plus className="w-4 h-4" />
                Create your first quiz
              </Button>
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}

