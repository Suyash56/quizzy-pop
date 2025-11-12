"use server";

import { createClient } from "@/utils/supabase/server";
import { revalidatePath } from "next/cache";

export async function updatePassword(currentPassword: string, newPassword: string) {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    return { error: "Unauthorized" };
  }

  // Verify current password by attempting to sign in
  const { error: signInError } = await supabase.auth.signInWithPassword({
    email: user.email!,
    password: currentPassword,
  });

  if (signInError) {
    return { error: "Current password is incorrect" };
  }

  // Update password
  const { error: updateError } = await supabase.auth.updateUser({
    password: newPassword,
  });

  if (updateError) {
    return { error: updateError.message };
  }

  return { data: { success: true } };
}

export async function updateAvatar(avatarUrl: string) {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    return { error: "Unauthorized" };
  }

  // Update user metadata with avatar URL
  const { error: updateError } = await supabase.auth.updateUser({
    data: {
      ...user.user_metadata,
      avatar_url: avatarUrl,
    },
  });

  if (updateError) {
    return { error: updateError.message };
  }

  revalidatePath("/dashboard");
  return { data: { success: true } };
}

// Note: This function should be called from client-side
// We'll handle file conversion in the client component instead

