import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import { HostPresentationView } from "@/components/host-presentation-view";

export default async function PresentQuizPage({
  params,
}: {
  params: Promise<{ quizId: string }>;
}) {
  const { quizId } = await params;
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    redirect("/auth/login");
  }

  // Fetch quiz with questions
  const { data: quiz, error: quizError } = await supabase
    .from("quizzes")
    .select("*")
    .eq("id", quizId)
    .eq("owner_id", user.id)
    .single();

  if (quizError || !quiz) {
    redirect("/dashboard");
  }

  // Get all questions with options
  const { data: questions } = await supabase
    .from("questions")
    .select(`
      *,
      options (*)
    `)
    .eq("quiz_id", quizId)
    .order("order_index", { ascending: true });

  if (!questions || questions.length === 0) {
    redirect(`/quiz/${quizId}`);
  }

  return (
    <HostPresentationView
      quiz={quiz}
      questions={(questions || []) as any}
      userId={user.id}
    />
  );
}

