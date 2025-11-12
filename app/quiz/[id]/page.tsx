import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import { QuizEditor } from "@/components/quiz-editor";
import { trackQuizView } from "@/app/actions/quiz";

export default async function QuizEditPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    redirect("/auth/login");
  }

  // Fetch quiz with questions and options
  const { data: quiz, error: quizError } = await supabase
    .from("quizzes")
    .select("*")
    .eq("id", id)
    .eq("owner_id", user.id)
    .single();

  if (quizError || !quiz) {
    redirect("/dashboard");
  }

  // Track quiz view
  await trackQuizView(id);

  const { data: questions } = await supabase
    .from("questions")
    .select(`
      *,
      options (*)
    `)
    .eq("quiz_id", id)
    .order("order_index", { ascending: true });

  return (
    <QuizEditor
      quiz={quiz}
      initialQuestions={(questions || []) as any}
    />
  );
}

