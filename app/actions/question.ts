"use server";

import { createClient } from "@/utils/supabase/server";
import { revalidatePath } from "next/cache";

export interface CreateQuestionInput {
  quiz_id: string;
  type: "single" | "multi";
  text: string;
  timer_seconds?: number | null;
  order_index: number;
}

export interface UpdateQuestionInput {
  id: string;
  text?: string;
  type?: "single" | "multi";
  timer_seconds?: number | null;
  order_index?: number;
}

export interface CreateOptionInput {
  question_id: string;
  text: string;
  is_correct: boolean;
  order_index: number;
}

export interface UpdateOptionInput {
  id: string;
  text?: string;
  is_correct?: boolean;
  order_index?: number;
}

export async function createQuestion(input: CreateQuestionInput) {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();

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

  const { data, error } = await supabase
    .from("questions")
    .insert({
      quiz_id: input.quiz_id,
      type: input.type,
      text: input.text,
      timer_seconds: input.timer_seconds || null,
      order_index: input.order_index,
    })
    .select()
    .single();

  if (error) {
    return { error: error.message };
  }

  revalidatePath(`/quiz/${input.quiz_id}`);
  return { data };
}

export async function updateQuestion(input: UpdateQuestionInput) {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    return { error: "Unauthorized" };
  }

  // Verify question ownership through quiz
  const { data: question } = await supabase
    .from("questions")
    .select("quiz_id, quizzes!inner(owner_id)")
    .eq("id", input.id)
    .single();

  if (!question || (question.quizzes as any).owner_id !== user.id) {
    return { error: "Question not found or unauthorized" };
  }

  const updateData: any = {
    updated_at: new Date().toISOString(),
  };

  if (input.text !== undefined) updateData.text = input.text;
  if (input.type !== undefined) updateData.type = input.type;
  if (input.timer_seconds !== undefined) updateData.timer_seconds = input.timer_seconds;
  if (input.order_index !== undefined) updateData.order_index = input.order_index;

  const { data, error } = await supabase
    .from("questions")
    .update(updateData)
    .eq("id", input.id)
    .select()
    .single();

  if (error) {
    return { error: error.message };
  }

  revalidatePath(`/quiz/${question.quiz_id}`);
  return { data };
}

export async function deleteQuestion(questionId: string) {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    return { error: "Unauthorized" };
  }

  // Verify ownership
  const { data: question } = await supabase
    .from("questions")
    .select("quiz_id, quizzes!inner(owner_id)")
    .eq("id", questionId)
    .single();

  if (!question || (question.quizzes as any).owner_id !== user.id) {
    return { error: "Question not found or unauthorized" };
  }

  const { error } = await supabase
    .from("questions")
    .delete()
    .eq("id", questionId);

  if (error) {
    return { error: error.message };
  }

  revalidatePath(`/quiz/${question.quiz_id}`);
  return { data: { success: true } };
}

export async function createOption(input: CreateOptionInput) {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    return { error: "Unauthorized" };
  }

  // Verify ownership through question -> quiz
  const { data: question } = await supabase
    .from("questions")
    .select("quiz_id, quizzes!inner(owner_id)")
    .eq("id", input.question_id)
    .single();

  if (!question || (question.quizzes as any).owner_id !== user.id) {
    return { error: "Question not found or unauthorized" };
  }

  const { data, error } = await supabase
    .from("options")
    .insert({
      question_id: input.question_id,
      text: input.text,
      is_correct: input.is_correct,
      order_index: input.order_index,
    })
    .select()
    .single();

  if (error) {
    return { error: error.message };
  }

  revalidatePath(`/quiz/${question.quiz_id}`);
  return { data };
}

export async function updateOption(input: UpdateOptionInput) {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    return { error: "Unauthorized" };
  }

  // Verify ownership
  const { data: option } = await supabase
    .from("options")
    .select("question_id, questions!inner(quiz_id, quizzes!inner(owner_id))")
    .eq("id", input.id)
    .single();

  if (!option || ((option.questions as any).quizzes as any).owner_id !== user.id) {
    return { error: "Option not found or unauthorized" };
  }

  const updateData: any = {};

  if (input.text !== undefined) updateData.text = input.text;
  if (input.is_correct !== undefined) updateData.is_correct = input.is_correct;
  if (input.order_index !== undefined) updateData.order_index = input.order_index;

  const { data, error } = await supabase
    .from("options")
    .update(updateData)
    .eq("id", input.id)
    .select()
    .single();

  if (error) {
    return { error: error.message };
  }

  const quizId = ((option.questions as any).quizzes as any).id;
  revalidatePath(`/quiz/${quizId}`);
  return { data };
}

export async function deleteOption(optionId: string) {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    return { error: "Unauthorized" };
  }

  // Verify ownership
  const { data: option } = await supabase
    .from("options")
    .select("question_id, questions!inner(quiz_id, quizzes!inner(owner_id))")
    .eq("id", optionId)
    .single();

  if (!option || ((option.questions as any).quizzes as any).owner_id !== user.id) {
    return { error: "Option not found or unauthorized" };
  }

  const { error } = await supabase
    .from("options")
    .delete()
    .eq("id", optionId);

  if (error) {
    return { error: error.message };
  }

  const quizId = ((option.questions as any).quizzes as any).id;
  revalidatePath(`/quiz/${quizId}`);
  return { data: { success: true } };
}

export async function reorderOptions(optionIds: string[]) {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    return { error: "Unauthorized" };
  }

  // Update order_index for each option
  const updates = optionIds.map((id, index) =>
    supabase
      .from("options")
      .update({ order_index: index })
      .eq("id", id)
  );

  const results = await Promise.all(updates);
  const hasError = results.some((r) => r.error);

  if (hasError) {
    return { error: "Failed to reorder options" };
  }

  // Get quiz_id from first option to revalidate
  const { data: firstOption } = await supabase
    .from("options")
    .select("question_id, questions!inner(quiz_id)")
    .eq("id", optionIds[0])
    .single();

  if (firstOption) {
    revalidatePath(`/quiz/${(firstOption.questions as any).quiz_id}`);
  }

  return { data: { success: true } };
}

