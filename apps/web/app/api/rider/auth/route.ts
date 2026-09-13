import { NextRequest, NextResponse } from "next/server";
import { adminClient } from "@/lib/supabase/admin";
import { normalizeKenyanPhone } from "@/lib/orders/phone";
import {
  RIDER_SESSION_COOKIE,
  RIDER_SESSION_MAX_AGE,
  MAX_FAILED_ATTEMPTS,
  LOCKOUT_MINUTES,
  getRiderSession,
  signRiderSession,
  verifyPin,
} from "@/lib/rider/auth";

/**
 * Rider sign-in: phone number + 4-digit PIN.
 *
 * Phone rather than a name or a menu: it is the one thing a rider always
 * knows, never mistypes, and that identifies them across every restaurant
 * they serve.
 *
 * Failures are counted and the account locks for a while. Five tries against
 * a 4-digit PIN is nothing; unlimited tries against one is 10,000 and the
 * phone number is not a secret.
 */

export async function GET(req: NextRequest) {
  const session = getRiderSession(req);
  if (!session) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }
  return NextResponse.json({ rider_id: session.rider_id, name: session.name });
}

export async function POST(req: NextRequest) {
  let body: { phone?: string; pin?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const phone = normalizeKenyanPhone(body.phone ?? "");
  const pin = body.pin ?? "";

  if (!phone || !/^\d{4}$/.test(pin)) {
    return NextResponse.json(
      { error: "Enter your phone number and 4-digit PIN." },
      { status: 400 },
    );
  }

  const { data: rider } = await adminClient
    .from("riders")
    .select("id, name, pin_hash, pin_salt, is_active, failed_attempts, locked_until")
    .eq("phone", phone)
    .maybeSingle();

  // Same message whether the phone is unknown or the PIN is wrong — telling
  // someone which half they got right is free reconnaissance.
  const REJECT = NextResponse.json(
    { error: "That phone number and PIN don't match." },
    { status: 401 },
  );

  if (!rider || !rider.is_active) return REJECT;

  if (rider.locked_until && new Date(rider.locked_until) > new Date()) {
    return NextResponse.json(
      { error: `Too many wrong tries. Try again in ${LOCKOUT_MINUTES} minutes.` },
      { status: 429 },
    );
  }

  if (!verifyPin(pin, rider.pin_hash, rider.pin_salt)) {
    const attempts = (rider.failed_attempts ?? 0) + 1;
    await adminClient
      .from("riders")
      .update({
        failed_attempts: attempts,
        locked_until:
          attempts >= MAX_FAILED_ATTEMPTS
            ? new Date(Date.now() + LOCKOUT_MINUTES * 60_000).toISOString()
            : null,
      })
      .eq("id", rider.id);
    return REJECT;
  }

  // Clean slate on a good PIN.
  await adminClient
    .from("riders")
    .update({ failed_attempts: 0, locked_until: null })
    .eq("id", rider.id);

  const token = signRiderSession({ rider_id: rider.id, name: rider.name });
  const res = NextResponse.json({ rider_id: rider.id, name: rider.name });
  res.cookies.set(RIDER_SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: RIDER_SESSION_MAX_AGE,
  });
  return res;
}

export async function DELETE() {
  const res = NextResponse.json({ success: true });
  res.cookies.set(RIDER_SESSION_COOKIE, "", { path: "/", maxAge: 0 });
  return res;
}
