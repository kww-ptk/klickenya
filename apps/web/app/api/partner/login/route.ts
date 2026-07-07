import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { adminClient } from "@/lib/supabase/admin";
import { verifyPartnerKey } from "@/lib/partner/auth";

/**
 * POST /api/partner/login
 * Authorization: Bearer <partner's key from PARTNER_API_KEYS>
 * Body: { partner: string, email: string, password: string }
 *
 * Lets a partner site's own admin backend (e.g. Claris African Experience)
 * authenticate its shared admin login against Klickenya's Supabase Auth
 * instead of keeping its own password table. Server-to-server only — the
 * partner's PHP/backend calls this, not the browser.
 *
 * One shared login per partner for now: any Klickenya host user tagged with
 * this partner_id can sign in. There is no staff/super_admin distinction on
 * the Klickenya side yet — that's tracked as follow-up work, not built here.
 */

const rateLimitMap = new Map<string, { count: number; resetAt: number }>();
function isRateLimited(key: string): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(key);
  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(key, { count: 1, resetAt: now + 600_000 });
    return false;
  }
  entry.count++;
  return entry.count > 5;
}

export async function POST(request: NextRequest) {
  let body: { partner?: string; email?: string; password?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ success: false, error: "Invalid request body" }, { status: 400 });
  }

  const { partner, email, password } = body;
  if (!partner || !email || !password) {
    return NextResponse.json(
      { success: false, error: "partner, email, and password are required" },
      { status: 400 }
    );
  }

  if (!verifyPartnerKey(request.headers.get("authorization"), partner)) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  const rateLimitKey = `${partner}:${email.toLowerCase()}`;
  if (isRateLimited(rateLimitKey)) {
    return NextResponse.json(
      { success: false, error: "Too many attempts. Please wait 10 minutes." },
      { status: 429 }
    );
  }

  const anonClient = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );

  const { data: signInData, error: signInError } = await anonClient.auth.signInWithPassword({
    email,
    password,
  });

  if (signInError || !signInData.user) {
    return NextResponse.json(
      { success: false, error: "Invalid email or password" },
      { status: 401 }
    );
  }

  const userId = signInData.user.id;

  // Confirm this user is a host scoped to the requesting partner. Uses the
  // service-role client so the check can't be spoofed via RLS.
  const [{ data: userRow }, { data: hostProfile }] = await Promise.all([
    adminClient.from("users").select("role").eq("id", userId).single(),
    adminClient
      .from("host_profiles")
      .select("user_id, display_name, partner_id")
      .eq("user_id", userId)
      .maybeSingle(),
  ]);

  if (userRow?.role !== "host" || !hostProfile || hostProfile.partner_id !== partner) {
    return NextResponse.json(
      { success: false, error: "This account is not authorized for this site's admin." },
      { status: 403 }
    );
  }

  return NextResponse.json({
    success: true,
    user: {
      id: userId,
      email: signInData.user.email,
      display_name: hostProfile.display_name,
    },
  });
}
