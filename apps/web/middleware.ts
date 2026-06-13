import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { isHouseHost } from "@/lib/storefront/houseHost";

export async function middleware(request: NextRequest) {
  const host = request.headers.get("host");
  const pathname = request.nextUrl.pathname;

  // ── /embed/* — public, iframe-friendly, no auth, no Supabase session ─────
  // Override Next.js's default X-Frame-Options: SAMEORIGIN so third-party
  // sites (Squarespace, Wix, anything) can embed the reservation form.
  // Posture matches Calendly / Resy. Per-menu allowlist deferred to V1.5.
  // Checked BEFORE host-routing so embeds work on any host.
  if (pathname.startsWith("/embed/")) {
    const response = NextResponse.next({ request });
    response.headers.set("Content-Security-Policy", "frame-ancestors *");
    response.headers.delete("X-Frame-Options");
    return response;
  }

  // ── Partner storefront host: serve the /storefront route tree, no auth ──
  if (!isHouseHost(host)) {
    // Let API routes, Next internals, and already-rewritten paths pass through
    // unchanged — only PAGE routes get rewritten into the /storefront segment.
    // (Critical: the storefront's reservation POST hits /api/menu/reservations
    // on the partner host; rewriting it to /storefront/api/... would 404.)
    if (
      pathname.startsWith("/storefront") ||
      pathname.startsWith("/api") ||
      pathname.startsWith("/_next")
    ) {
      return NextResponse.next();
    }
    const url = request.nextUrl.clone();
    url.pathname = `/storefront${pathname === "/" ? "" : pathname}`;
    return NextResponse.rewrite(url);
  }

  // ── House host: never expose the internal /storefront segment ──
  if (pathname.startsWith("/storefront")) {
    const url = request.nextUrl.clone();
    url.pathname = "/";
    return NextResponse.redirect(url);
  }

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

  // Protected routes
  const isDashboard = pathname.startsWith("/dashboard");
  const isAdmin = pathname.startsWith("/admin");
  const isAccount = pathname.startsWith("/account");
  const isProfile = pathname.startsWith("/profile");
  // /eat/* is the restaurant-only command center preview. Same gating as
  // /dashboard (host or admin), different navigation shell + route tree.
  // Will move to a real eat.klickenya.com subdomain once the IA is proven.
  const isEat = pathname.startsWith("/eat");

  if ((isDashboard || isAdmin || isAccount || isProfile || isEat) && !user) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("returnTo", pathname);
    return NextResponse.redirect(url);
  }

  // Role-based access: fetch role once for protected routes
  if ((isAdmin || isDashboard || isProfile || isEat) && user) {
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

    // /eat: same gating as /dashboard — host or admin only
    if (isEat && role !== "host" && role !== "admin") {
      const url = request.nextUrl.clone();
      url.pathname = "/profile";
      return NextResponse.redirect(url);
    }

    // Profile routes: admins go to admin (hosts can access profile too)
    if (isProfile && role === "admin") {
      const url = request.nextUrl.clone();
      url.pathname = "/admin";
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
