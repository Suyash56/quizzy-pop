import { redirect } from "next/navigation";
import { ParticipantQuizView } from "@/components/participant-quiz-view";
import { createClient as createPublicClient } from "@supabase/supabase-js";

export default async function PlayQuizPage({
  params,
  searchParams,
}: {
  params: Promise<{ sessionId: string }>;
  searchParams: Promise<{ participantId?: string }>;
}) {
  const { sessionId } = await params;
  const { participantId } = await searchParams;

  if (!participantId) {
    redirect("/");
  }

  // Use public client for unauthenticated participants
  const supabase = createPublicClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  // Get session with quiz and questions
  const { data: session, error: sessionError } = await supabase
    .from("sessions")
    .select(`
      *,
      quiz:quizzes (*)
    `)
    .eq("id", sessionId)
    .single();

  if (sessionError || !session) {
    redirect("/");
  }

  // Verify participant exists
  const { data: participant, error: participantError } = await supabase
    .from("participants")
    .select("*")
    .eq("id", participantId)
    .eq("session_id", sessionId)
    .single();

  if (participantError || !participant) {
    redirect("/");
  }

  // Ensure session.quiz exists, otherwise provide default
  if (!session.quiz) {
    // Fetch quiz separately if not included
    const { data: quiz } = await supabase
      .from("quizzes")
      .select("id, title, settings_json")
      .eq("id", session.quiz_id)
      .single();
    
    if (quiz) {
      session.quiz = quiz;
    } else {
      // Fallback if quiz not found
      session.quiz = {
        id: session.quiz_id,
        title: "Quiz",
        settings_json: {},
      };
    }
  }

  // Get all questions with options using public client
  // Note: This requires RLS policies to allow public SELECT on questions and options tables
  const { data: questions, error: questionsError } = await supabase
    .from("questions")
    .select(`
      *,
      options (*)
    `)
    .eq("quiz_id", session.quiz_id)
    .order("order_index", { ascending: true });

  if (questionsError) {
    console.error("Questions fetch error:", questionsError);
    console.error("Error details:", JSON.stringify(questionsError, null, 2));
    console.log("Quiz ID:", session.quiz_id);
    console.log("Session data:", session);
    
    // If RLS error, show helpful message
    if (questionsError.message?.includes("row-level security") || questionsError.message?.includes("RLS")) {
      console.error("RLS Policy Error: Make sure you have a policy allowing public SELECT on questions table");
    }
  }

  // If no questions found, log for debugging
  if (!questions || questions.length === 0) {
    console.warn("No questions found for quiz:", session.quiz_id);
    console.warn("This could be due to:");
    console.warn("1. RLS policies blocking access");
    console.warn("2. No questions exist for this quiz");
    console.warn("3. Questions exist but quiz_id doesn't match");
  }

  return (
    <ParticipantQuizView
      session={session as any}
      participant={participant}
      questions={(questions || []) as any}
    />
  );
}

