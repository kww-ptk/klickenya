import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // Refresh the session
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const pathname = request.nextUrl.pathname;

  // Protected routes
  const isDashboard = pathname.startsWith("/dashboard");
  const isAdmin = pathname.startsWith("/admin");
  const isAccount = pathname.startsWith("/account");
  const isProfile = pathname.startsWith("/profile");

  if ((isDashboard || isAdmin || isAccount || isProfile) && !user) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("returnTo", pathname);
    return NextResponse.redirect(url);
  }

  // Role-based access: fetch role once for protected routes
  if ((isAdmin || isDashboard || isProfile) && user) {
    const { createClient } = await import("@supabase/supabase-js");
    const adminSupabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    const { data: profile } = await adminSupabase
      .from("users")
      .select("role")
      .eq("id", user.id)
      .single();

    const role = profile?.role;

    // Admin routes: must be admin
    if (isAdmin && role !== "admin") {
      const url = request.nextUrl.clone();
      url.pathname = role === "host" ? "/dashboard" : "/profile";
      return NextResponse.redirect(url);
    }

    // Dashboard routes: must be host or admin
    if (isDashboard && role !== "host" && role !== "admin") {
      const url = request.nextUrl.clone();
      url.pathname = "/profile";
      return NextResponse.redirect(url);
    }

    // Profile routes: guests only (hosts go to dashboard)
    if (isProfile && (role === "host" || role === "admin")) {
      const url = request.nextUrl.clone();
      url.pathname = role === "admin" ? "/admin" : "/dashboard";
      return NextResponse.redirect(url);
    }
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
