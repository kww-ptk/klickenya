import { NextRequest, NextResponse } from "next/server";
import { adminClient } from "@/lib/supabase/admin";
import { assertAdmin, AdminAuthError } from "@/lib/admin/auth";

/**
 * PATCH /api/admin/eat/commission — set a restaurant's commission rates.
 *
 * ADMIN ONLY, guarded in the handler: middleware does not cover /api/admin/*.
 *
 * Rates apply to orders placed AFTER the change. Every order snapshots the
 * rate it was placed under, so nothing already in the system moves — which is
 * the only way a restaurant can be given a new rate without silently
 * rewriting what they are owed for last week.
 *
 * Deliberately not exposed to owners. A restaurant setting its own commission
 * is not a feature.
 */
export async function PATCH(req: NextRequest) {
  try {
    await assertAdmin(req);

    const body = (await req.json()) as {
      menu_id?: string;
      commission_delivery_bps?: number;
      commission_pickup_bps?: number;
      delivery_fee_kes?: number;
    };

    const menuId = body.menu_id ?? "";
    if (!menuId) {
      return NextResponse.json({ error: "menu_id required" }, { status: 400 });
    }

    const updates: Record<string, number> = {};

    for (const key of ["commission_delivery_bps", "commission_pickup_bps"] as const) {
      const value = body[key];
      if (value === undefined) continue;
      if (!Number.isFinite(value) || !Number.isInteger(value)) {
        return NextResponse.json({ error: "Rates must be whole basis points." }, { status: 400 });
      }
      // 0–50%. A hard ceiling because a typo here is the difference between
      // 10% and 100% of a restaurant's revenue, and nothing else would catch it.
      if (value < 0 || value > 5000) {
        return NextResponse.json(
          { error: "Commission must be between 0% and 50%." },
          { status: 400 },
        );
      }
      updates[key] = value;
    }

    if (body.delivery_fee_kes !== undefined) {
      const fee = Number(body.delivery_fee_kes);
      if (!Number.isFinite(fee) || fee < 0 || fee > 10000) {
        return NextResponse.json(
          { error: "Delivery fee must be between 0 and 10,000." },
          { status: 400 },
        );
      }
      updates.delivery_fee_kes = Math.round(fee);
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: "Nothing to change" }, { status: 400 });
    }

    const { error } = await adminClient.from("menus").update(updates).eq("id", menuId);
    if (error) {
      console.error("[admin/eat/commission]", error);
      return NextResponse.json({ error: "Could not save that." }, { status: 500 });
    }

    return NextResponse.json({ success: true, updated: updates });
  } catch (err) {
    if (err instanceof AdminAuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    console.error("[admin/eat/commission]", err);
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
  }
}
