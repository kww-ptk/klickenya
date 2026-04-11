import { NextRequest, NextResponse } from "next/server";
import { adminClient } from "@/lib/supabase/admin";
import { getMenuAuth, verifyMenuAccess } from "../_lib/auth";

function timeToMinutes(t: string): number {
  const parts = t.split(":");
  return parseInt(parts[0], 10) * 60 + parseInt(parts[1], 10);
}

export async function GET(req: NextRequest) {
  try {
    const { userId, isAdmin, supabase } = await getMenuAuth();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const menu_id = searchParams.get("menu_id");
    if (!menu_id) return NextResponse.json({ error: "menu_id required" }, { status: 400 });

    const access = await verifyMenuAccess(supabase, menu_id, userId, isAdmin);
    if (!access) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const { data } = await adminClient
      .from("reservation_time_windows")
      .select("id, menu_id, open_time, close_time, label, display_order, is_active")
      .eq("menu_id", menu_id)
      .order("display_order");

    return NextResponse.json({ windows: data ?? [] });
  } catch {
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { userId, isAdmin, supabase } = await getMenuAuth();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const { menu_id, open_time, close_time, label } = body;

    if (!menu_id || !open_time || !close_time) {
      return NextResponse.json({ error: "menu_id, open_time, close_time required" }, { status: 400 });
    }

    const access = await verifyMenuAccess(supabase, menu_id, userId, isAdmin);
    if (!access) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const normalizedOpen = open_time.slice(0, 5);
    const normalizedClose = close_time.slice(0, 5);

    if (timeToMinutes(normalizedClose) <= timeToMinutes(normalizedOpen)) {
      return NextResponse.json({ error: "Close time must be after open time." }, { status: 400 });
    }

    const { count } = await adminClient
      .from("reservation_time_windows")
      .select("id", { count: "exact", head: true })
      .eq("menu_id", menu_id);

    const { data, error } = await adminClient
      .from("reservation_time_windows")
      .insert({
        menu_id,
        open_time: normalizedOpen,
        close_time: normalizedClose,
        label: label?.trim() || null,
        display_order: count ?? 0,
      })
      .select("id, menu_id, open_time, close_time, label, display_order, is_active")
      .single();

    if (error || !data) {
      return NextResponse.json({ error: "Failed to create time window." }, { status: 500 });
    }

    return NextResponse.json({ window: data }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const { userId, isAdmin, supabase } = await getMenuAuth();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const { id, menu_id, open_time, close_time, label, is_active, display_order } = body;

    if (!id || !menu_id) {
      return NextResponse.json({ error: "id and menu_id required" }, { status: 400 });
    }

    const access = await verifyMenuAccess(supabase, menu_id, userId, isAdmin);
    if (!access) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const updates: Record<string, unknown> = {};

    if (typeof open_time === "string") updates.open_time = open_time.slice(0, 5);
    if (typeof close_time === "string") updates.close_time = close_time.slice(0, 5);
    if (typeof label === "string") updates.label = label.trim() || null;
    if (typeof is_active === "boolean") updates.is_active = is_active;
    if (typeof display_order === "number") updates.display_order = display_order;

    // Validate merged open/close
    if (updates.open_time || updates.close_time) {
      const { data: current } = await adminClient
        .from("reservation_time_windows")
        .select("open_time, close_time")
        .eq("id", id)
        .single();

      const effectiveOpen = ((updates.open_time as string | undefined) ?? current?.open_time ?? "00:00").slice(0, 5);
      const effectiveClose = ((updates.close_time as string | undefined) ?? current?.close_time ?? "23:59").slice(0, 5);

      if (timeToMinutes(effectiveClose) <= timeToMinutes(effectiveOpen)) {
        return NextResponse.json({ error: "Close time must be after open time." }, { status: 400 });
      }
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: "No fields to update." }, { status: 400 });
    }

    const { data, error } = await adminClient
      .from("reservation_time_windows")
      .update(updates)
      .eq("id", id)
      .eq("menu_id", menu_id)
      .select("id, menu_id, open_time, close_time, label, display_order, is_active")
      .single();

    if (error || !data) {
      return NextResponse.json({ error: "Failed to update time window." }, { status: 500 });
    }

    return NextResponse.json({ window: data });
  } catch {
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { userId, isAdmin, supabase } = await getMenuAuth();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    const menu_id = searchParams.get("menu_id");

    if (!id || !menu_id) {
      return NextResponse.json({ error: "id and menu_id required" }, { status: 400 });
    }

    const access = await verifyMenuAccess(supabase, menu_id, userId, isAdmin);
    if (!access) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const { error } = await adminClient
      .from("reservation_time_windows")
      .delete()
      .eq("id", id)
      .eq("menu_id", menu_id);

    if (error) {
      return NextResponse.json({ error: "Failed to delete time window." }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
