import { NextRequest, NextResponse } from "next/server";
import { adminClient } from "@/lib/supabase/admin";
import { assertAdmin, AdminAuthError } from "@/lib/admin/auth";
import { normalizeKenyanPhone } from "@/lib/orders/phone";
import { makePinHash } from "@/lib/rider/auth";

/**
 * Admin rider management — hiring for the Klickenya fleet.
 *
 * Restaurants keep adding their own riders from their command center; this is
 * the other kind. A Klickenya rider carries is_platform and works every
 * delivery-enabled restaurant, so onboarding a new one needs no rider admin
 * at all.
 *
 * ADMIN ONLY, guarded in the handler. Middleware does not cover /api/admin/*.
 */

function fail(err: unknown) {
  if (err instanceof AdminAuthError) {
    return NextResponse.json({ error: err.message }, { status: err.status });
  }
  console.error("[admin/eat/riders]", err);
  return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
}

export async function POST(req: NextRequest) {
  try {
    await assertAdmin(req);
    const body = (await req.json()) as {
      name?: string; phone?: string; pin?: string;
      is_platform?: boolean; menu_ids?: string[];
    };

    const name = (body.name ?? "").trim();
    const phone = normalizeKenyanPhone(body.phone ?? "");
    const pin = body.pin ?? "";
    const isPlatform = body.is_platform === true;
    const menuIds = Array.isArray(body.menu_ids) ? body.menu_ids : [];

    if (!name) return NextResponse.json({ error: "Name required" }, { status: 400 });
    if (!phone) {
      return NextResponse.json({ error: "Enter a valid phone number." }, { status: 400 });
    }
    if (!/^\d{4}$/.test(pin)) {
      return NextResponse.json({ error: "PIN must be 4 digits." }, { status: 400 });
    }
    // A restaurant rider with no restaurants can never see a job. Better to
    // refuse than to create someone who signs in to an empty screen.
    if (!isPlatform && menuIds.length === 0) {
      return NextResponse.json(
        { error: "Pick at least one restaurant, or make them a Klickenya rider." },
        { status: 400 },
      );
    }

    const { hash, salt } = makePinHash(pin);

    const { data: existing } = await adminClient
      .from("riders").select("id").eq("phone", phone).maybeSingle();

    let riderId: string;
    if (existing) {
      await adminClient
        .from("riders")
        .update({
          name, pin_hash: hash, pin_salt: salt, is_platform: isPlatform,
          is_active: true, failed_attempts: 0, locked_until: null,
        })
        .eq("id", existing.id);
      riderId = existing.id;
    } else {
      const { data: created, error } = await adminClient
        .from("riders")
        .insert({ name, phone, pin_hash: hash, pin_salt: salt, is_platform: isPlatform })
        .select("id").single();
      if (error || !created) return fail(error);
      riderId = created.id;
    }

    // Links only matter for restaurant riders. A platform rider's scope is
    // resolved live, so writing rows here would be dead weight that drifts.
    if (!isPlatform && menuIds.length > 0) {
      await adminClient
        .from("rider_menus")
        .upsert(
          menuIds.map((menu_id) => ({ rider_id: riderId, menu_id })),
          { onConflict: "rider_id,menu_id" },
        );
    }

    return NextResponse.json({ success: true, rider_id: riderId });
  } catch (err) {
    return fail(err);
  }
}

export async function PATCH(req: NextRequest) {
  try {
    await assertAdmin(req);
    const body = (await req.json()) as {
      rider_id?: string; name?: string; is_active?: boolean;
      is_platform?: boolean; pin?: string;
    };
    const riderId = body.rider_id ?? "";
    if (!riderId) {
      return NextResponse.json({ error: "rider_id required" }, { status: 400 });
    }

    const updates: Record<string, unknown> = {};
    if (typeof body.name === "string" && body.name.trim()) updates.name = body.name.trim();
    if (typeof body.is_active === "boolean") updates.is_active = body.is_active;
    if (typeof body.is_platform === "boolean") updates.is_platform = body.is_platform;
    if (typeof body.pin === "string" && body.pin) {
      if (!/^\d{4}$/.test(body.pin)) {
        return NextResponse.json({ error: "PIN must be 4 digits." }, { status: 400 });
      }
      const { hash, salt } = makePinHash(body.pin);
      updates.pin_hash = hash;
      updates.pin_salt = salt;
      // A new PIN clears a lockout — that is usually why it is being reset.
      updates.failed_attempts = 0;
      updates.locked_until = null;
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: "Nothing to change" }, { status: 400 });
    }

    const { error } = await adminClient.from("riders").update(updates).eq("id", riderId);
    if (error) return fail(error);
    return NextResponse.json({ success: true });
  } catch (err) {
    return fail(err);
  }
}
