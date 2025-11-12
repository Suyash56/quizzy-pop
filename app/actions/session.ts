"use server";

import { createClient } from "@/utils/supabase/server";
import { revalidatePath } from "next/cache";
import { createClient as createPublicClient } from "@supabase/supabase-js";

// Helper function to create public Supabase client for unauthenticated access
function createPublicSupabaseClient() {
  return createPublicClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}

export interface CreateSessionInput {
  quiz_id: string;
  room_code: string;
}

export interface UpdateSessionInput {
  session_id: string;
  status?: "waiting" | "live" | "ended";
  current_question_id?: string | null;
}

export async function createSession(input: CreateSessionInput) {
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return { error: "Unauthorized" };
  }

  // Verify quiz ownership
  const { data: quiz } = await supabase
    .from("quizzes")
    .select("owner_id")
    .eq("id", input.quiz_id)
    .eq("owner_id", user.id)
    .single();

  if (!quiz) {
    return { error: "Quiz not found or unauthorized" };
  }

  // Check if there's an existing active session (waiting, live, or ended)
  // Priority: live > waiting > ended
  const { data: liveSession } = await supabase
    .from("sessions")
    .select("id, room_code, status, current_question_id")
    .eq("quiz_id", input.quiz_id)
    .eq("status", "live")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (liveSession) {
    return { data: liveSession, isExisting: true };
  }

  const { data: waitingSession } = await supabase
    .from("sessions")
    .select("id, room_code, status, current_question_id")
    .eq("quiz_id", input.quiz_id)
    .eq("status", "waiting")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (waitingSession) {
    return { data: waitingSession, isExisting: true };
  }

  const { data, error } = await supabase
    .from("sessions")
    .insert({
      quiz_id: input.quiz_id,
      room_code: input.room_code,
      host_id: user.id,
      status: "waiting",
      current_question_id: null,
    })
    .select()
    .single();

  if (error) {
    return { error: error.message };
  }

  revalidatePath(`/present/${input.quiz_id}`);
  return { data };
}

export async function updateSession(input: UpdateSessionInput) {
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return { error: "Unauthorized" };
  }

  // Verify session ownership
  const { data: session } = await supabase
    .from("sessions")
    .select("host_id")
    .eq("id", input.session_id)
    .single();

  if (!session || session.host_id !== user.id) {
    return { error: "Session not found or unauthorized" };
  }

  const updateData: any = {};
  if (input.status !== undefined) {
    updateData.status = input.status;
  }
  if (input.current_question_id !== undefined) {
    updateData.current_question_id = input.current_question_id;
  }
  updateData.updated_at = new Date().toISOString();

  const { data, error } = await supabase
    .from("sessions")
    .update(updateData)
    .eq("id", input.session_id)
    .select()
    .single();

  if (error) {
    return { error: error.message };
  }

  revalidatePath(`/present/${input.session_id}`);
  return { data };
}

export async function getSessionByRoomCode(roomCode: string) {
  // Use public client for unauthenticated participants
  const supabase = createPublicSupabaseClient();

  const { data, error } = await supabase
    .from("sessions")
    .select(
      `
      *,
      quiz:quizzes (*)
    `
    )
    .eq("room_code", roomCode.toUpperCase())
    .single();

  if (error) {
    return { error: error.message };
  }

  return { data };
}

export async function getSessionById(sessionId: string) {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("sessions")
    .select(
      `
      *,
      quiz:quizzes (*)
    `
    )
    .eq("id", sessionId)
    .single();

  if (error) {
    return { error: error.message };
  }

  return { data };
}

export async function joinSession(sessionId: string, participantName: string) {
  // Use public client for unauthenticated participants
  const supabase = createPublicSupabaseClient();

  // Get session to verify it exists and is joinable
  const { data: session, error: sessionError } = await supabase
    .from("sessions")
    .select("id, status, quiz_id")
    .eq("id", sessionId)
    .single();

  if (sessionError || !session) {
    return { error: "Session not found" };
  }

  if (session.status === "ended") {
    return { error: "This quiz session has already ended" };
  }

  // Check if participant already exists (by name in same session)
  // For simplicity, we'll allow multiple participants with same name
  // In production, you might want to use cookies/localStorage to track

  const { data, error } = await supabase
    .from("participants")
    .insert({
      session_id: sessionId,
      name: participantName,
      score: 0,
    })
    .select()
    .single();

  if (error) {
    return { error: error.message };
  }

  return { data };
}

export async function submitAnswer(
  sessionId: string,
  participantId: string,
  questionId: string,
  optionIds: string[]
) {
  // Use public client for unauthenticated participants
  const supabase = createPublicSupabaseClient();

  // Verify session is live
  const { data: session } = await supabase
    .from("sessions")
    .select("status, current_question_id")
    .eq("id", sessionId)
    .single();

  if (!session || session.status !== "live") {
    return { error: "Session is not live" };
  }

  // Check if already submitted for this question (any option)
  const { data: existing } = await supabase
    .from("submissions")
    .select("id")
    .eq("session_id", sessionId)
    .eq("participant_id", participantId)
    .eq("question_id", questionId)
    .limit(1);

  if (existing && existing.length > 0) {
    return { error: "Already submitted answer for this question" };
  }

  // Validate optionIds is an array and not empty
  if (!Array.isArray(optionIds) || optionIds.length === 0) {
    return { error: "Invalid option IDs" };
  }

  // Ensure all option IDs are valid UUIDs (strings)
  const validOptionIds = optionIds.filter(
    (id) => typeof id === "string" && id.trim().length > 0
  );

  if (validOptionIds.length === 0) {
    return { error: "No valid option IDs provided" };
  }

  // Get question type and correct options to determine is_correct
  const { data: question } = await supabase
    .from("questions")
    .select("id, type, options(id, is_correct)")
    .eq("id", questionId)
    .single();

  if (!question) {
    return { error: "Question not found" };
  }

  const correctOptionIds = question.options
    .filter((opt: any) => opt.is_correct)
    .map((opt: any) => opt.id);

  // Insert submission for each option and set is_correct immediately
  const insertedSubmissions = [];

  for (const optionId of validOptionIds) {
    // Check if this option is correct
    const isCorrect = correctOptionIds.includes(optionId);

    const submission = {
      session_id: sessionId.trim(),
      participant_id: participantId.trim(),
      question_id: questionId.trim(),
      option_id: optionId.trim(),
      is_correct: isCorrect,
      submitted_at: new Date().toISOString(),
    };

    try {
      const { data, error } = await supabase
        .from("submissions")
        .insert(submission)
        .select()
        .single();

      if (error) {
        console.error("Submission error for option:", optionId);
        console.error("Error details:", JSON.stringify(error, null, 2));
        // Continue with other options even if one fails
        continue;
      }

      if (data) {
        insertedSubmissions.push(data);
      }
    } catch (err) {
      console.error("Exception during submission insert:", err);
      continue;
    }
  }

  if (insertedSubmissions.length === 0) {
    return {
      error: "Failed to insert any submissions. Check server logs for details.",
    };
  }

  return { data: { success: true, count: insertedSubmissions.length } };
}

export async function getSubmissionsByQuestion(
  sessionId: string,
  questionId: string
) {
  const supabase = createPublicSupabaseClient();

  const { data, error } = await supabase
    .from("submissions")
    .select(
      `
      *,
      option:options (*)
    `
    )
    .eq("session_id", sessionId)
    .eq("question_id", questionId);

  if (error) {
    return { error: error.message };
  }

  return { data: data || [] };
}

export async function getParticipantsBySession(sessionId: string) {
  const supabase = createPublicSupabaseClient();

  const { data, error } = await supabase
    .from("participants")
    .select("*")
    .eq("session_id", sessionId)
    .order("score", { ascending: false });

  if (error) {
    return { error: error.message };
  }

  return { data: data || [] };
}

export async function calculateAndUpdateScores(sessionId: string) {
  const supabase = createPublicSupabaseClient();

  // Verify session ownership
  const { data: session } = await supabase
    .from("sessions")
    .select("host_id, quiz_id")
    .eq("id", sessionId)
    .single();

  if (!session) {
    return { error: "Session not found" };
  }

  // Get all questions for this quiz to count total questions
  const { data: questions } = await supabase
    .from("questions")
    .select("id, type, options(id, is_correct)")
    .eq("quiz_id", session.quiz_id)
    .order("order_index", { ascending: true });

  if (!questions || questions.length === 0) {
    return { error: "No questions found" };
  }

  // Get all participants
  const { data: participants } = await supabase
    .from("participants")
    .select("id")
    .eq("session_id", sessionId);

  if (!participants || participants.length === 0) {
    return { error: "No participants found" };
  }
  console.log("Participants:", participants);
  const hostSupabase = await createClient();

  // Calculate scores for each participant
  for (const participant of participants) {
    let totalScore = 0;

    for (const question of questions) {
      // Get participant's submissions for this question
      const { data: submissions } = await supabase
        .from("submissions")
        .select("is_correct")
        .eq("session_id", sessionId)
        .eq("participant_id", participant.id)
        .eq("question_id", question.id);
      console.log("Submissions:", submissions);
      if (!submissions || submissions.length === 0) {
        continue; // No answer submitted
      }

      // Get correct options count for this question
      const correctOptionsCount = question.options.filter(
        (o: any) => o.is_correct
      ).length;
      console.log("Correct options count:", correctOptionsCount);
      if (correctOptionsCount === 0) {
        // No correct options defined, skip this question
        continue;
      }

      // Count correct and incorrect submissions
      const correctSubmissions = submissions.filter(
        (s) => s.is_correct === true
      );
      const incorrectSubmissions = submissions.filter(
        (s) => s.is_correct === false
      );
      console.log("Correct submissions:", correctSubmissions);
      if (question.type === "single") {
        // For single select: must have exactly 1 correct submission and 0 incorrect
        if (
          correctSubmissions.length === 1 &&
          incorrectSubmissions.length === 0
        ) {
          totalScore += 1;
        }
      } else {
        // For multi select: must have all correct options selected (correctSubmissions === correctOptionsCount)
        // and no incorrect submissions
        if (
          correctSubmissions.length === correctOptionsCount &&
          incorrectSubmissions.length === 0
        ) {
          totalScore += 1;
        }
      }
    }

    console.log(
      `Calculated score for participant ${participant.id}: ${totalScore} out of ${questions.length}`
    );
    // Update participant score
    const { error: updateError } = await hostSupabase
      .from("participants")
      .update({ score: totalScore })
      .eq("id", participant.id);

    if (updateError) {
      console.error(
        `Error updating score for participant ${participant.id}:`,
        updateError
      );
    }
  }

  // Update session status to completed
  await hostSupabase
    .from("sessions")
    .update({ status: "ended" })
    .eq("id", sessionId);

  return { data: { success: true } };
}
