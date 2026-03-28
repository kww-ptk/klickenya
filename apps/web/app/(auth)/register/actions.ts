"use server";

import { createClient } from "@/lib/supabase/server";
import { createClient as createServiceClient } from "@supabase/supabase-js";

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

  // Insert into users table (use service role — anon client can't write before email confirmation)
  if (data.user) {
    const serviceClient = createServiceClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
    await serviceClient.from("users").upsert(
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
