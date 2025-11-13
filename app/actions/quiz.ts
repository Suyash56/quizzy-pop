"use server";

import { createClient } from "@/utils/supabase/server";
import { revalidatePath } from "next/cache";
import { createClient as createPublicClient } from "@supabase/supabase-js";

export interface CreateQuizInput {
  title: string;
  description?: string;
}

export interface UpdateQuizInput {
  id: string;
  title?: string;
  description?: string;
  settings_json?: Record<string, any>;
}

// Public function to get quiz for join page (no auth required)
export async function getQuizForJoin(quizId: string) {
  // Use public client with anon key for unauthenticated access
  const supabase = createPublicClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const { data, error } = await supabase
    .from("quizzes")
    .select("id, title, settings_json")
    .eq("id", quizId)
    .single();

  if (error) {
    return { error: error.message, data: null };
  }

  return { data, error: null };
}

export async function createQuiz(input: CreateQuizInput) {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    return { error: "Unauthorized" };
  }

  const { data, error } = await supabase
    .from("quizzes")
    .insert({
      owner_id: user.id,
      title: input.title,
      description: input.description || null,
      settings_json: {
        leaderboardEnabled: true,
        defaultTimer: 30,
        participationEnabled: true,
      },
    })
    .select()
    .single();

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/presentations");
  return { data };
}

export async function updateQuiz(input: UpdateQuizInput) {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    return { error: "Unauthorized" };
  }

  // Verify ownership
  const { data: existingQuiz } = await supabase
    .from("quizzes")
    .select("owner_id")
    .eq("id", input.id)
    .single();

  if (!existingQuiz || existingQuiz.owner_id !== user.id) {
    return { error: "Unauthorized" };
  }

  const updateData: any = {
    updated_at: new Date().toISOString(),
  };

  if (input.title !== undefined) updateData.title = input.title;
  if (input.description !== undefined) updateData.description = input.description;
  if (input.settings_json !== undefined) updateData.settings_json = input.settings_json;

  const { data, error } = await supabase
    .from("quizzes")
    .update(updateData)
    .eq("id", input.id)
    .select()
    .single();

  if (error) {
    return { error: error.message };
  }

  revalidatePath(`/quiz/${input.id}`);
  revalidatePath("/dashboard");
  return { data };
}

export async function getQuiz(quizId: string) {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    return { error: "Unauthorized" };
  }

  const { data, error } = await supabase
    .from("quizzes")
    .select("*")
    .eq("id", quizId)
    .eq("owner_id", user.id)
    .single();

  if (error) {
    return { error: error.message };
  }

  return { data };
}

export async function getUserQuizzes() {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    return { error: "Unauthorized", data: [] };
  }

  const { data, error } = await supabase
    .from("quizzes")
    .select("*")
    .eq("owner_id", user.id)
    .order("updated_at", { ascending: false });

  if (error) {
    return { error: error.message, data: [] };
  }

  return { data: data || [] };
}

export async function trackQuizView(quizId: string) {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    return { error: "Unauthorized" };
  }

  const { data: existingQuiz } = await supabase
    .from("quizzes")
    .select("owner_id")
    .eq("id", quizId)
    .single();

  if (!existingQuiz || existingQuiz.owner_id !== user.id) {
    return { error: "Unauthorized" };
  }

  const { error } = await supabase
    .from("quizzes")
    .update({ view_timestamp: new Date().toISOString() })
    .eq("id", quizId);

  if (error) {
    return { error: error.message };
  }

  // Note: revalidatePath cannot be called during render
  // The dashboard will refresh naturally when user navigates back
  return { data: { success: true } };
}

export async function getRecentlyViewedQuizzes(limit: number = 5) {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    return { error: "Unauthorized", data: [] };
  }

  const { data, error } = await supabase
    .from("quizzes")
    .select("*")
    .eq("owner_id", user.id)
    .not("view_timestamp", "is", null)
    .order("view_timestamp", { ascending: false })
    .limit(limit);

  if (error) {
    return { error: error.message, data: [] };
  }

  return { data: data || [] };
}

export async function updateParticipationSetting(quizId: string, enabled: boolean) {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    return { error: "Unauthorized" };
  }

  // Verify ownership
  const { data: existingQuiz } = await supabase
    .from("quizzes")
    .select("owner_id, settings_json")
    .eq("id", quizId)
    .single();

  if (!existingQuiz || existingQuiz.owner_id !== user.id) {
    return { error: "Unauthorized" };
  }

  // Update participation setting
  const currentSettings = existingQuiz.settings_json || {};
  const updatedSettings = {
    ...currentSettings,
    participationEnabled: enabled,
  };

  const { data, error } = await supabase
    .from("quizzes")
    .update({
      settings_json: updatedSettings,
      updated_at: new Date().toISOString(),
    })
    .eq("id", quizId)
    .select()
    .single();

  if (error) {
    return { error: error.message };
  }

  revalidatePath(`/quiz/${quizId}`);
  return { data };
}
