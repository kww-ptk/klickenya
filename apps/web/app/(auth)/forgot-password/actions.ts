"use server";

import { createClient } from "@/lib/supabase/server";

export async function forgotPasswordAction(formData: FormData) {
  const email = formData.get("email") as string;

  if (!email) {
    return { error: "Email is required." };
  }

  const supabase = await createClient();

  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: "https://www.klickenya.com/auth/callback?next=/reset-password",
  });

  if (error) {
    return { error: error.message };
  }

  return { success: true };
}
