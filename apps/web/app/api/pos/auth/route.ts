import { NextRequest, NextResponse } from "next/server";
import { adminClient } from "@/lib/supabase/admin";
import { clientIp, rateLimit } from "@/lib/security/rateLimit";
import {
  POS_SESSION_COOKIE,
  signPosSession,
  getPosStaffSession,
} from "@/app/api/pos/_lib/auth";

/* ── GET — return the current staff session ─────────────────────────────────── */

export async function GET(req: NextRequest) {
  const session = getPosStaffSession(req);
  if (!session) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }
  return NextResponse.json({
    staff_id:   session.staff_id,
    menu_id:    session.menu_id,
    staff_name: session.staff_name,
    role:       session.role,
  });
}

/* ── POST — sign in with PIN ────────────────────────────────────────────────── */

export async function POST(req: NextRequest) {
  let body: { menu_id?: string; pin?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const menuId = body.menu_id;
  const pin = body.pin;

  if (!menuId || typeof menuId !== "string") {
    return NextResponse.json({ error: "menu_id required" }, { status: 400 });
  }
  if (typeof pin !== "string" || !/^\d{4}$/.test(pin)) {
    return NextResponse.json({ error: "Invalid PIN" }, { status: 400 });
  }

  // Per-connection throttle. PINs are four digits and the menu id is in the
  // public menu's HTML, so without this a script could walk the whole PIN
  // space overnight and sign in as a manager.
  const ip = clientIp(req);
  if (!rateLimit(`pos-auth:${ip}`, { limit: 20, windowMs: 10 * 60_000 }).ok) {
    return NextResponse.json(
      { error: "Too many sign-in attempts. Try again in a few minutes." },
      { status: 429 },
    );
  }

  // Verify the menu exists and that ANY ordering channel is on. This used to
  // require table ordering or reservations, which is how a delivery-only
  // restaurant found its Food Delivery Orders tablet refusing every PIN.
  const { data: menu } = await adminClient
    .from("menus")
    .select(
      "id, table_ordering, reservations_enabled, takeaway_enabled, delivery_enabled, pos_enabled",
    )
    .eq("id", menuId)
    .single();

  if (!menu) {
    return NextResponse.json({ error: "Menu not found" }, { status: 404 });
  }
  if (
    !menu.table_ordering &&
    !menu.reservations_enabled &&
    !menu.takeaway_enabled &&
    !menu.delivery_enabled &&
    !menu.pos_enabled
  ) {
    return NextResponse.json(
      { error: "No ordering channel is switched on for this restaurant yet." },
      { status: 400 },
    );
  }

  // Lockout state, read on its own so a database without migration 093
  // degrades to "no lockout" instead of failing the sign-in entirely.
  let lock: { pos_failed_attempts: number | null; pos_locked_until: string | null } | null = null;
  {
    const { data, error } = await adminClient
      .from("menus")
      .select("pos_failed_attempts, pos_locked_until")
      .eq("id", menuId)
      .maybeSingle();
    if (error) {
      console.warn("[pos/auth] lock columns unavailable (093 not applied?):", error.message);
    } else {
      lock = data;
    }
  }
  if (lock?.pos_locked_until && new Date(lock.pos_locked_until) > new Date()) {
    return NextResponse.json(
      { error: "Too many wrong PINs. Try again in 10 minutes." },
      { status: 429 },
    );
  }

  // Lookup active staff with this PIN within this menu.
  const { data: staff } = await adminClient
    .from("restaurant_staff")
    .select("id, name, role, is_active, menu_id, pin")
    .eq("menu_id", menuId)
    .eq("pin", pin)
    .eq("is_active", true)
    .maybeSingle();

  if (!staff) {
    // The PIN is looked up by (menu, pin), so a miss cannot be pinned on a
    // staff row. Count it against the menu: ten misses lock sign-in for ten
    // minutes, which turns 10,000 guesses into a week.
    if (lock) {
      const attempts = (lock.pos_failed_attempts ?? 0) + 1;
      const locking = attempts >= 10;
      await adminClient
        .from("menus")
        .update({
          pos_failed_attempts: locking ? 0 : attempts,
          pos_locked_until: locking ? new Date(Date.now() + 10 * 60_000).toISOString() : null,
        })
        .eq("id", menuId);
    }
    return NextResponse.json({ error: "Invalid PIN" }, { status: 401 });
  }

  if (lock && (lock.pos_failed_attempts ?? 0) > 0) {
    await adminClient
      .from("menus")
      .update({ pos_failed_attempts: 0, pos_locked_until: null })
      .eq("id", menuId);
  }

  const { token, maxAge } = signPosSession({
    staff_id:   staff.id,
    menu_id:    menu.id,
    staff_name: staff.name,
    role:       staff.role as "waiter" | "manager" | "cashier" | "kitchen" | "bar",
  });

  const res = NextResponse.json({
    staff_id:   staff.id,
    menu_id:    menu.id,
    staff_name: staff.name,
    role:       staff.role,
  });
  res.cookies.set(POS_SESSION_COOKIE, token, {
    httpOnly: true,
    secure:   process.env.NODE_ENV === "production",
    sameSite: "lax",
    path:     "/",
    maxAge,
  });
  return res;
}

/* ── DELETE — sign out (clear cookie) ───────────────────────────────────────── */

export async function DELETE() {
  const res = NextResponse.json({ success: true });
  res.cookies.set(POS_SESSION_COOKIE, "", {
    httpOnly: true,
    secure:   process.env.NODE_ENV === "production",
    sameSite: "lax",
    path:     "/",
    maxAge:   0,
  });
  return res;
}
