import { createClient } from "@/lib/supabase/server";
import { adminClient } from "@/lib/supabase/admin";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const returnTo = searchParams.get("returnTo");
  const next = returnTo ?? searchParams.get("next") ?? null;

  // Handle Supabase error redirects (expired/invalid links)
  const errorParam = searchParams.get("error");
  const errorDescription = searchParams.get("error_description");
  if (errorParam) {
    const message =
      errorDescription?.includes("expired")
        ? "link_expired"
        : "auth_error";
    return NextResponse.redirect(
      `${origin}/login?error=${message}`
    );
  }

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (user) {
        // Check if user row already exists
        const { data: existing } = await supabase
          .from("users")
          .select("full_name, role")
          .eq("id", user.id)
          .single();

        const isNewUser = !existing;

        const fullName =
          existing?.full_name ??
          user.user_metadata?.full_name ??
          user.user_metadata?.name ??
          user.email!.split("@")[0];

        const avatarUrl = user.user_metadata?.avatar_url ?? null;

        // Upsert user row — default role is ALWAYS guest
        await supabase.from("users").upsert(
          {
            id: user.id,
            email: user.email!,
            full_name: fullName,
            avatar_url: avatarUrl,
            ...(isNewUser ? { role: "guest" } : {}),
          },
          { onConflict: "id" }
        );

        // Check for role intent cookie (only from /register?role=host)
        const cookieStore = await cookies();
        const roleIntent = cookieStore.get("oauth_role_intent")?.value;

        if (roleIntent === "host") {
          // Clear cookie immediately
          cookieStore.delete("oauth_role_intent");

          const currentRole = existing?.role ?? "guest";
          if (currentRole === "guest") {
            // Promote to host
            await adminClient
              .from("users")
              .update({ role: "host" })
              .eq("id", user.id);

            // Create host_profiles row if not exists
            const { data: existingHost } = await adminClient
              .from("host_profiles")
              .select("id")
              .eq("user_id", user.id)
              .maybeSingle();

            if (!existingHost) {
              await adminClient.from("host_profiles").insert({
                user_id: user.id,
                display_name: fullName,
              });
            }
          }
        }

        // Create guest_profiles row for new users (if they're a guest)
        if (isNewUser) {
          const finalRole = roleIntent === "host" ? "host" : "guest";
          if (finalRole === "guest") {
            await adminClient.from("guest_profiles").upsert(
              {
                user_id: user.id,
                display_name: fullName,
                avatar_url: avatarUrl,
                email: user.email!,
              },
              { onConflict: "user_id" }
            );
          }
        }

        // Determine redirect
        const { data: finalProfile } = await supabase
          .from("users")
          .select("role")
          .eq("id", user.id)
          .single();

        const role = finalProfile?.role ?? "guest";

        if (next) {
          return NextResponse.redirect(`${origin}${next}`);
        }

        // Role-based default redirect
        const dest =
          role === "admin"
            ? "/admin"
            : role === "host"
              ? "/dashboard"
              : "/profile";
        return NextResponse.redirect(`${origin}${dest}`);
      }
    }
  }

  // Code exchange failed — likely expired
  return NextResponse.redirect(`${origin}/login?error=link_expired`);
}
