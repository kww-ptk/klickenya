import { NextRequest, NextResponse } from "next/server";
import { adminClient } from "@/lib/supabase/admin";
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

  // Verify menu exists and at least one of the POS-related features is on.
  // (table_ordering OR reservations_enabled — either justifies running a POS.)
  const { data: menu } = await adminClient
    .from("menus")
    .select("id, table_ordering, reservations_enabled")
    .eq("id", menuId)
    .single();

  if (!menu) {
    return NextResponse.json({ error: "Menu not found" }, { status: 404 });
  }
  if (!menu.table_ordering && !menu.reservations_enabled) {
    return NextResponse.json(
      { error: "POS is not enabled for this restaurant" },
      { status: 400 },
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
    return NextResponse.json({ error: "Invalid PIN" }, { status: 401 });
  }

  const { token, maxAge } = signPosSession({
    staff_id:   staff.id,
    menu_id:    menu.id,
    staff_name: staff.name,
    role:       staff.role as "waiter" | "manager" | "cashier",
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
