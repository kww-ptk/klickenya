import { NextRequest, NextResponse } from "next/server";
import { adminClient } from "@/lib/supabase/admin";
import { getMenuAuth, verifyMenuAccess } from "@/app/api/menu/_lib/auth";

/* ── Helpers ────────────────────────────────────────────────────────────────── */

function isValidPin(v: unknown): v is string {
  return typeof v === "string" && /^\d{4}$/.test(v);
}

function isValidRole(v: unknown): v is "waiter" | "manager" | "cashier" | "kitchen" {
  return v === "waiter" || v === "manager" || v === "cashier" || v === "kitchen";
}

const STAFF_SELECT = "id, name, role, is_active, created_at";

/* ── GET — list active staff for a menu ──────────────────────────────────────── */
// PIN is never returned in the response body.

export async function GET(req: NextRequest) {
  const menuId = req.nextUrl.searchParams.get("menu_id");
  if (!menuId) {
    return NextResponse.json({ error: "menu_id required" }, { status: 400 });
  }

  const { userId, isAdmin, supabase } = await getMenuAuth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const access = await verifyMenuAccess(supabase, menuId, userId, isAdmin);
  if (!access) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { data, error } = await adminClient
    .from("restaurant_staff")
    .select(STAFF_SELECT)
    .eq("menu_id", menuId)
    .order("created_at", { ascending: true });

  if (error) {
    console.error("[menu/staff GET] error:", error);
    return NextResponse.json({ error: "Failed to fetch staff" }, { status: 500 });
  }

  return NextResponse.json({ staff: data });
}

/* ── POST — create a staff member ───────────────────────────────────────────── */

export async function POST(req: NextRequest) {
  const { userId, isAdmin, supabase } = await getMenuAuth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const { menu_id, name, pin, role } = body ?? {};

  if (!menu_id || typeof menu_id !== "string") {
    return NextResponse.json({ error: "menu_id required" }, { status: 400 });
  }
  if (typeof name !== "string" || !name.trim()) {
    return NextResponse.json({ error: "Name required" }, { status: 400 });
  }
  if (!isValidPin(pin)) {
    return NextResponse.json({ error: "PIN must be exactly 4 digits" }, { status: 400 });
  }
  const resolvedRole = role == null || role === "" ? "waiter" : role;
  if (!isValidRole(resolvedRole)) {
    return NextResponse.json({ error: "Invalid role" }, { status: 400 });
  }

  const access = await verifyMenuAccess(supabase, menu_id, userId, isAdmin);
  if (!access) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { data, error } = await adminClient
    .from("restaurant_staff")
    .insert({
      menu_id,
      name: name.trim().slice(0, 80),
      pin,
      role: resolvedRole,
      is_active: true,
    })
    .select(STAFF_SELECT)
    .single();

  if (error) {
    if (error.code === "23505") {
      return NextResponse.json({ error: "This PIN is already in use" }, { status: 400 });
    }
    console.error("[menu/staff POST] error:", error);
    return NextResponse.json({ error: "Failed to create staff" }, { status: 500 });
  }

  return NextResponse.json({ staff: data });
}

/* ── PATCH — update name / role / is_active / pin ───────────────────────────── */

export async function PATCH(req: NextRequest) {
  const { userId, isAdmin, supabase } = await getMenuAuth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const id = req.nextUrl.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

  const body = await req.json().catch(() => ({}));
  const { menu_id, name, role, pin, is_active } = body ?? {};

  if (!menu_id || typeof menu_id !== "string") {
    return NextResponse.json({ error: "menu_id required" }, { status: 400 });
  }

  const access = await verifyMenuAccess(supabase, menu_id, userId, isAdmin);
  if (!access) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const updates: Record<string, unknown> = {};
  if (typeof name === "string") {
    if (!name.trim()) {
      return NextResponse.json({ error: "Name cannot be empty" }, { status: 400 });
    }
    updates.name = name.trim().slice(0, 80);
  }
  if (role !== undefined) {
    if (!isValidRole(role)) {
      return NextResponse.json({ error: "Invalid role" }, { status: 400 });
    }
    updates.role = role;
  }
  if (pin !== undefined) {
    if (!isValidPin(pin)) {
      return NextResponse.json({ error: "PIN must be exactly 4 digits" }, { status: 400 });
    }
    updates.pin = pin;
  }
  if (typeof is_active === "boolean") {
    updates.is_active = is_active;
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: "No valid fields to update" }, { status: 400 });
  }

  const { data, error } = await adminClient
    .from("restaurant_staff")
    .update(updates)
    .eq("id", id)
    .eq("menu_id", menu_id)
    .select(STAFF_SELECT)
    .single();

  if (error) {
    if (error.code === "23505") {
      return NextResponse.json({ error: "This PIN is already in use" }, { status: 400 });
    }
    console.error("[menu/staff PATCH] error:", error);
    return NextResponse.json({ error: "Failed to update staff" }, { status: 500 });
  }

  if (!data) return NextResponse.json({ error: "Staff not found" }, { status: 404 });

  return NextResponse.json({ staff: data });
}

/* ── DELETE — soft delete (is_active = false) ───────────────────────────────── */
// Hard delete is intentionally avoided: orders.waiter_id may reference this row
// and we want historical attribution preserved.

export async function DELETE(req: NextRequest) {
  const { userId, isAdmin, supabase } = await getMenuAuth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const id = req.nextUrl.searchParams.get("id");
  const menuId = req.nextUrl.searchParams.get("menu_id");
  if (!id || !menuId) {
    return NextResponse.json({ error: "id and menu_id required" }, { status: 400 });
  }

  const access = await verifyMenuAccess(supabase, menuId, userId, isAdmin);
  if (!access) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { error } = await adminClient
    .from("restaurant_staff")
    .update({ is_active: false })
    .eq("id", id)
    .eq("menu_id", menuId);

  if (error) {
    console.error("[menu/staff DELETE] error:", error);
    return NextResponse.json({ error: "Failed to deactivate staff" }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
