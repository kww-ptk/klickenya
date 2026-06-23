"use server";

import { createClient } from "@/lib/supabase/server";
import { createClient as createServiceClient } from "@supabase/supabase-js";

// Canonical site URL for auth redirects — never hardcode the domain. Falls back
// to the production host. (Was previously hardcoded to https://www.klickenya.com,
// which mismatched the live domain and made confirmation links appear "expired".)
const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") || "https://klickenya.com";

export async function registerAction(formData: FormData) {
  const name = formData.get("name") as string;
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;
  // Honour the host intent from /register?role=host so email signup matches the
  // Google sign-up path (which already promotes via the oauth_role_intent cookie).
  const role = formData.get("role") === "host" ? "host" : "guest";

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
      data: { role, name },
      emailRedirectTo: `${SITE_URL}/auth/callback`,
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
        role,
      },
      { onConflict: "id" }
    );

    // Create the profile row matching the chosen role.
    if (role === "host") {
      await serviceClient.from("host_profiles").upsert(
        {
          user_id: data.user.id,
          display_name: name,
          email,
        },
        { onConflict: "user_id" }
      );
    } else {
      await serviceClient.from("guest_profiles").upsert(
        {
          user_id: data.user.id,
          display_name: name,
          email,
        },
        { onConflict: "user_id" }
      );
    }
  }

  return { success: true };
}
