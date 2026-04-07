import { NextRequest, NextResponse } from "next/server";
import { z } from "zod/v4";
import { getMenuAuth, verifyMenuAccess } from "@/app/api/menu/_lib/auth";

/* ── Schemas ─────────────────────────────────────────── */

const createTableSchema = z.object({
  menu_id:       z.string().uuid(),
  table_number:  z.string().min(1).max(50),
  capacity:      z.number().int().min(1).max(50).optional(),
  floor_section: z.string().max(100).nullable().optional(),
});

const updateTableSchema = z.object({
  table_number:  z.string().min(1).max(50).optional(),
  capacity:      z.number().int().min(1).max(50).optional(),
  floor_section: z.string().max(100).nullable().optional(),
  is_active:     z.boolean().optional(),
  display_order: z.number().int().optional(),
});

/* ── Bulk range parser ──────────────────────────────── */
// Accepts "T1-T10", "1-20", "Bar 1-Bar 10" (matching prefix)
// Returns null if unparseable or range > 100.

function parseBulkRange(range: string): string[] | null {
  const trimmed = range.trim();
  // Match optional prefix + number - optional same prefix + number
  const m = trimmed.match(/^([A-Za-z ]*?)(\d+)\s*-\s*([A-Za-z ]*?)(\d+)$/);
  if (!m) return null;
  const [, prefix1, startStr, prefix2, endStr] = m;
  // Prefixes must match (case-insensitive, trimmed)
  if (prefix1.trim().toLowerCase() !== prefix2.trim().toLowerCase()) return null;
  const start = parseInt(startStr, 10);
  const end   = parseInt(endStr, 10);
  if (end < start || end - start + 1 > 100) return null;
  const prefix = prefix1.trim();
  const labels: string[] = [];
  for (let i = start; i <= end; i++) labels.push(prefix ? `${prefix}${i}` : `${i}`);
  return labels;
}

/* ── GET — list tables for a menu ───────────────────── */

export async function GET(req: NextRequest) {
  const menuId = req.nextUrl.searchParams.get("menu_id");
  if (!menuId) return NextResponse.json({ error: "menu_id required" }, { status: 400 });

  const { userId, isAdmin, supabase } = await getMenuAuth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const access = await verifyMenuAccess(supabase, menuId, userId, isAdmin);
  if (!access) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { data, error } = await supabase
    .from("restaurant_tables")
    .select("id, table_number, capacity, floor_section, is_active, display_order")
    .eq("menu_id", menuId)
    .order("display_order", { ascending: true })
    .order("table_number", { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ tables: data ?? [] });
}

/* ── POST — create one table or bulk-create from range ─ */

export async function POST(req: NextRequest) {
  const { userId, isAdmin, supabase } = await getMenuAuth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();

  /* ── Bulk create ── */
  if (body.bulk === true) {
    const menuId = typeof body.menu_id === "string" ? body.menu_id : null;
    if (!menuId) return NextResponse.json({ error: "menu_id required" }, { status: 400 });

    const access = await verifyMenuAccess(supabase, menuId, userId, isAdmin);
    if (!access) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const range = typeof body.range === "string" ? body.range : "";
    const labels = parseBulkRange(range);
    if (!labels || labels.length === 0) {
      return NextResponse.json(
        { error: "Invalid range. Use formats like T1-T10 or 1-20." },
        { status: 400 }
      );
    }

    // Start display_order after current max
    const { data: existing } = await supabase
      .from("restaurant_tables")
      .select("display_order")
      .eq("menu_id", menuId)
      .order("display_order", { ascending: false })
      .limit(1);

    const startOrder = (existing?.[0]?.display_order ?? -1) + 1;
    const rows = labels.map((table_number, i) => ({
      menu_id: menuId,
      table_number,
      capacity:      4,
      display_order: startOrder + i,
    }));

    // upsert with ignoreDuplicates skips tables that already exist
    const { data, error } = await supabase
      .from("restaurant_tables")
      .upsert(rows, { onConflict: "menu_id,table_number", ignoreDuplicates: true })
      .select("id, table_number, capacity, floor_section, is_active, display_order");

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ created: data?.length ?? 0, tables: data ?? [] });
  }

  /* ── Single create ── */
  const parsed = createTableSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid data" }, { status: 400 });
  const d = parsed.data;

  const access = await verifyMenuAccess(supabase, d.menu_id, userId, isAdmin);
  if (!access) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { data: existing } = await supabase
    .from("restaurant_tables")
    .select("display_order")
    .eq("menu_id", d.menu_id)
    .order("display_order", { ascending: false })
    .limit(1);

  const display_order = (existing?.[0]?.display_order ?? -1) + 1;

  const { data, error } = await supabase
    .from("restaurant_tables")
    .insert({
      menu_id:       d.menu_id,
      table_number:  d.table_number,
      capacity:      d.capacity ?? 4,
      floor_section: d.floor_section ?? null,
      display_order,
    })
    .select("id, table_number, capacity, floor_section, is_active, display_order")
    .single();

  if (error) {
    if (error.code === "23505") {
      return NextResponse.json(
        { error: `Table "${d.table_number}" already exists.` },
        { status: 409 }
      );
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ table: data });
}

/* ── PATCH — update one table ───────────────────────── */

export async function PATCH(req: NextRequest) {
  const id = req.nextUrl.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

  const { userId, isAdmin, supabase } = await getMenuAuth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: tableRow } = await supabase
    .from("restaurant_tables")
    .select("id, menu_id")
    .eq("id", id)
    .single();

  if (!tableRow) return NextResponse.json({ error: "Table not found" }, { status: 404 });
  const access = await verifyMenuAccess(supabase, tableRow.menu_id, userId, isAdmin);
  if (!access) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json();
  const parsed = updateTableSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid data" }, { status: 400 });

  const { data, error } = await supabase
    .from("restaurant_tables")
    .update(parsed.data)
    .eq("id", id)
    .select("id, table_number, capacity, floor_section, is_active, display_order")
    .single();

  if (error) {
    if (error.code === "23505") {
      return NextResponse.json({ error: "Table number already exists." }, { status: 409 });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ table: data });
}

/* ── DELETE — remove a table ────────────────────────── */

export async function DELETE(req: NextRequest) {
  const id = req.nextUrl.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

  const { userId, isAdmin, supabase } = await getMenuAuth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: tableRow } = await supabase
    .from("restaurant_tables")
    .select("id, menu_id")
    .eq("id", id)
    .single();

  if (!tableRow) return NextResponse.json({ error: "Table not found" }, { status: 404 });
  const access = await verifyMenuAccess(supabase, tableRow.menu_id, userId, isAdmin);
  if (!access) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  // Block delete if an open session references this table
  const { data: openSessions } = await supabase
    .from("table_sessions")
    .select("id")
    .eq("table_id", id)
    .eq("status", "open")
    .limit(1);

  if (openSessions && openSessions.length > 0) {
    return NextResponse.json(
      { error: "Cannot delete a table that has an open session." },
      { status: 409 }
    );
  }

  const { error } = await supabase
    .from("restaurant_tables")
    .delete()
    .eq("id", id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
