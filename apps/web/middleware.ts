import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { eatOrigin, isEatHost, isHouseHost } from "@/lib/storefront/houseHost";

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

  // ── Public embed/SDK API — CORS so a third-party site's own frontend can
  // call these endpoints directly (Phase 5: public API). Scoped to an explicit
  // allowlist of already-public, anonymous endpoints — admin/dashboard APIs are
  // NOT included and stay same-origin only. Abuse is bounded by per-IP rate
  // limiting + honeypot on the write endpoints. OPTIONS preflight handled here.
  const PUBLIC_API_CORS_PATHS = [
    "/api/menu/reservations",
    "/api/properties/availability-by-booking-slug",
    "/api/properties/booking-enquiry",
  ];
  if (PUBLIC_API_CORS_PATHS.includes(pathname)) {
    const corsHeaders = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
      "Access-Control-Max-Age": "86400",
    };
    if (request.method === "OPTIONS") {
      return new NextResponse(null, { status: 204, headers: corsHeaders });
    }
    const response = NextResponse.next({ request });
    for (const [k, v] of Object.entries(corsHeaders)) {
      response.headers.set(k, v);
    }
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

  // ── eat.klickenya.com — the food app, and only the food app ─────────────
  // The subdomain serves ONE product: the town → category → browse flow that
  // lives at /eatklick. Everything else on it 308s back to the marketplace.
  //
  // That redirect is the point, not a leftover. Without it every marketplace
  // page would answer on two hosts and Google would have to pick a winner.
  // Putting the food app on a subdomain is only safe because the subdomain
  // refuses to be a second copy of klickenya.com.
  //
  // `?eathost=1` forces this branch where there is no real subdomain to test
  // on: localhost and Vercel preview deployments. It is gated on the host
  // rather than NODE_ENV because previews run with NODE_ENV=production, and a
  // preview URL is where this actually gets verified.
  const bareHost = (host ?? "").split(":")[0].toLowerCase();
  const isTestHost =
    bareHost === "localhost" ||
    bareHost === "127.0.0.1" ||
    bareHost.endsWith(".vercel.app");
  const forceEatHost =
    isTestHost && request.nextUrl.searchParams.get("eathost") === "1";
  const onEatHost = isEatHost(host) || forceEatHost;

  if (onEatHost) {
    // Infrastructure and the app's own data plane must answer on this host —
    // the cart POSTs to /api/orders from eat.klickenya.com.
    const passThrough =
      pathname.startsWith("/api") ||
      pathname.startsWith("/_next") ||
      pathname === "/favicon.ico" ||
      pathname === "/robots.txt" ||
      pathname === "/sitemap.xml";

    if (!passThrough) {
      // Root serves the flow.
      if (pathname === "/") {
        const url = request.nextUrl.clone();
        url.pathname = "/eatklick";
        return NextResponse.rewrite(url);
      }
      // The flow answers at "/" here, so its internal path is not a second
      // public URL for it. Collapse rather than bounce to the marketplace.
      if (pathname.startsWith("/eatklick")) {
        const url = request.nextUrl.clone();
        url.pathname = "/";
        return NextResponse.redirect(url, 308);
      }
      // /m/<slug> is the public menu the flow links out to, and /order/<id>
      // is the tracking page whose link the guest is handed at checkout.
      // Both belong to the app and must answer on this host — bouncing a
      // guest to the marketplace to watch their own order would be absurd.
      if (!pathname.startsWith("/m/") && !pathname.startsWith("/order/")) {
        const url = new URL(
          pathname,
          process.env.NEXT_PUBLIC_SITE_URL || "https://klickenya.com",
        );
        url.search = request.nextUrl.search;
        // Carrying ?eathost=1 through would re-enter this branch on arrival.
        // On localhost the marketplace origin IS this origin, so the redirect
        // would target the page it just left: an infinite loop.
        url.searchParams.delete("eathost");
        return NextResponse.redirect(url, 308);
      }
    }
  } else if (pathname.startsWith("/eatklick")) {
    // House host: once the subdomain is live, the flow has one public home
    // and it is there — this keeps it from being indexed at two URLs.
    // Dormant until NEXT_PUBLIC_EAT_ORIGIN is set, so shipping this before
    // DNS exists cannot strand /eatklick on an unresolvable host.
    const origin = eatOrigin();
    if (origin) return NextResponse.redirect(new URL("/", origin), 308);
  }

  // ── API routes authenticate themselves ────────────────────────────────
  // Every /api/* handler verifies its own caller (Supabase session, staff
  // PIN cookie, rider cookie, or nothing for the public order endpoints).
  // Running the Supabase Auth round-trip here as well doubled the cost of
  // every 10-second owner poll and every rider poll for no decision this
  // middleware ever made. /api/admin/* is the exception: it is gated below
  // as defence in depth, because assertAdmin() inside each route is the only
  // other thing standing between an anonymous caller and claim-approve.
  const isAdminApi = pathname.startsWith("/api/admin");
  if (pathname.startsWith("/api/") && !isAdminApi) {
    return NextResponse.next();
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

  // /api/admin/*: JSON, never a redirect. A missing session or a non-admin
  // role is a 401 here; the route's own assertAdmin() still runs after.
  if (isAdminApi) {
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
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
    if (profile?.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return supabaseResponse;
  }

  // Protected routes
  const isDashboard = pathname.startsWith("/dashboard");
  const isAdmin = pathname.startsWith("/admin");
  const isAccount = pathname.startsWith("/account");
  const isProfile = pathname.startsWith("/profile");
  // /manage/* is the restaurant-only command center. Same gating as
  // /dashboard (host or admin), different navigation shell + route tree.
  // Lived at /eat until 2026-09-11; /eat is now the public food-discovery
  // surface, so the command center moved here. Next stop is
  // app.klickenya.com, which needs isHouseHost() taught about the subdomain
  // first (see the P2 spec) — until then it stays a path on the house host.
  const isManage = pathname.startsWith("/manage");

  if ((isDashboard || isAdmin || isAccount || isProfile || isManage) && !user) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("returnTo", pathname);
    return NextResponse.redirect(url);
  }

  // Role-based access: fetch role once for protected routes
  if ((isAdmin || isDashboard || isProfile || isManage) && user) {
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

    // /manage: same gating as /dashboard — host or admin only
    if (isManage && role !== "host" && role !== "admin") {
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
