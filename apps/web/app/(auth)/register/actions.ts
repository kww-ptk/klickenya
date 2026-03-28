"use server";

import { createClient } from "@/lib/supabase/server";

export async function registerAction(formData: FormData) {
  const name = formData.get("name") as string;
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;

  if (!name || !email || !password) {
    return { error: "All fields are required." };
  }

  if (password.length < 8) {
    return { error: "Password must be at least 8 characters." };
  }

  const supabase = await createClient();

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { role: "guest", name },
      emailRedirectTo: "https://www.klickenya.com/auth/callback",
    },
  });

  if (error) {
    return { error: error.message };
  }

  // Insert into users table
  if (data.user) {
    await supabase.from("users").upsert(
      {
        id: data.user.id,
        email,
        full_name: name,
        role: "guest",
      },
      { onConflict: "id" }
    );
  }

  return { success: true };
}
