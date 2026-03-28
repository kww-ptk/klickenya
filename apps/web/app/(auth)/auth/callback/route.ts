import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/dashboard";

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      // Upsert user row so the users table stays in sync
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (user) {
        await supabase.from("users").upsert(
          {
            id: user.id,
            email: user.email!,
            full_name:
              user.user_metadata?.full_name ??
              user.user_metadata?.name ??
              user.email!.split("@")[0],
            avatar_url: user.user_metadata?.avatar_url ?? null,
          },
          { onConflict: "id" }
        );
      }

      // Determine redirect based on role
      if (next === "/dashboard" && user) {
        const { data: profile } = await supabase
          .from("users")
          .select("role")
          .eq("id", user.id)
          .single();

        const role = profile?.role;
        const dest =
          role === "admin"
            ? "/admin"
            : role === "host"
              ? "/dashboard"
              : "/account";
        return NextResponse.redirect(`${origin}${dest}`);
      }

      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  // OAuth error — redirect to login with error
  return NextResponse.redirect(`${origin}/login`);
}
