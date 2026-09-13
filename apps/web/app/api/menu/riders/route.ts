import { NextRequest, NextResponse } from "next/server";
import { adminClient } from "@/lib/supabase/admin";
import { getMenuAuth, verifyMenuAccess } from "../_lib/auth";
import { normalizeKenyanPhone } from "@/lib/orders/phone";
import { makePinHash } from "@/lib/rider/auth";

/**
 * Riders attached to one menu — the owner's side of the rider app.
 *
 * A rider is a person, not a per-restaurant record: the same phone number
 * can serve several kitchens. So POST either creates a rider or links an
 * existing one, and DELETE unlinks rather than deletes — removing someone
 * from your restaurant must not remove them from another owner's.
 */

async function ownerFor(menuId: string) {
  const { userId, isAdmin, supabase } = await getMenuAuth();
  if (!userId) return null;
  const menu = await verifyMenuAccess(supabase, menuId, userId, isAdmin);
  return menu ? { userId, isAdmin } : null;
}

export async function GET(req: NextRequest) {
  const menuId = req.nextUrl.searchParams.get("menu_id");
  if (!menuId) return NextResponse.json({ error: "menu_id required" }, { status: 400 });
  if (!(await ownerFor(menuId))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: links } = await adminClient
    .from("rider_menus")
    .select("rider_id")
    .eq("menu_id", menuId);

  const ids = (links ?? []).map((l) => l.rider_id as string);
  if (ids.length === 0) return NextResponse.json({ riders: [] });

  // Never select pin_hash / pin_salt — they have no business leaving the server.
  const { data: riders } = await adminClient
    .from("riders")
    .select("id, name, phone, is_active, created_at")
    .in("id", ids)
    .order("name", { ascending: true });

  return NextResponse.json({ riders: riders ?? [] });
}

export async function POST(req: NextRequest) {
  let body: { menu_id?: string; name?: string; phone?: string; pin?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const menuId = body.menu_id ?? "";
  if (!menuId) return NextResponse.json({ error: "menu_id required" }, { status: 400 });
  if (!(await ownerFor(menuId))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const name = (body.name ?? "").trim();
  const phone = normalizeKenyanPhone(body.phone ?? "");
  const pin = body.pin ?? "";

  if (!name) return NextResponse.json({ error: "Name required" }, { status: 400 });
  if (!phone) {
    return NextResponse.json(
      { error: "Enter a valid phone number (e.g. 0712 345 678)." },
      { status: 400 },
    );
  }
  if (!/^\d{4}$/.test(pin)) {
    return NextResponse.json({ error: "PIN must be 4 digits." }, { status: 400 });
  }

  const { data: existing } = await adminClient
    .from("riders")
    .select("id")
    .eq("phone", phone)
    .maybeSingle();

  let riderId: string;

  if (existing) {
    // Already rides for someone. Link them, and reset the PIN to the one this
    // owner just chose — they are handing it to the person in front of them.
    const { hash, salt } = makePinHash(pin);
    await adminClient
      .from("riders")
      .update({ name, pin_hash: hash, pin_salt: salt, is_active: true, failed_attempts: 0, locked_until: null })
      .eq("id", existing.id);
    riderId = existing.id;
  } else {
    const { hash, salt } = makePinHash(pin);
    const { data: created, error } = await adminClient
      .from("riders")
      .insert({ name, phone, pin_hash: hash, pin_salt: salt })
      .select("id")
      .single();
    if (error || !created) {
      console.error("[menu/riders POST]", error);
      return NextResponse.json({ error: "Could not add that rider." }, { status: 500 });
    }
    riderId = created.id;
  }

  const { error: linkErr } = await adminClient
    .from("rider_menus")
    .upsert({ rider_id: riderId, menu_id: menuId }, { onConflict: "rider_id,menu_id" });

  if (linkErr) {
    console.error("[menu/riders POST link]", linkErr);
    return NextResponse.json({ error: "Could not link that rider." }, { status: 500 });
  }

  return NextResponse.json({ success: true, rider_id: riderId });
}

export async function DELETE(req: NextRequest) {
  let body: { menu_id?: string; rider_id?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
  const menuId = body.menu_id ?? "";
  const riderId = body.rider_id ?? "";
  if (!menuId || !riderId) {
    return NextResponse.json({ error: "menu_id and rider_id required" }, { status: 400 });
  }
  if (!(await ownerFor(menuId))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Unlink only. The rider may work for another restaurant, and their
  // delivery history stays attached to the orders either way.
  const { error } = await adminClient
    .from("rider_menus")
    .delete()
    .eq("rider_id", riderId)
    .eq("menu_id", menuId);

  if (error) {
    console.error("[menu/riders DELETE]", error);
    return NextResponse.json({ error: "Could not remove that rider." }, { status: 500 });
  }
  return NextResponse.json({ success: true });
}
