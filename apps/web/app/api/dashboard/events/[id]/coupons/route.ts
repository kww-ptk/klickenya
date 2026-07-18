import { NextRequest, NextResponse } from "next/server";
import { z } from "zod/v4";
import { createClient } from "@/lib/supabase/server";
import { adminClient } from "@/lib/supabase/admin";
import { resolveManageableEvent } from "@/lib/events/manageableEvent";

const createSchema = z.object({
  code: z.string().trim().toUpperCase().regex(/^[A-Z0-9]{3,20}$/),
  discount_type: z.enum(["percent", "fixed"]),
  discount_value: z.number().int().min(1),
  max_redemptions: z.number().int().min(1).nullable().optional(),
  expires_at: z.string().datetime().nullable().optional(),
  one_per_customer: z.boolean().optional(),
});

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const managed = await resolveManageableEvent(supabase, user.id, id);
  if (!managed) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const parsed = createSchema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: "Invalid coupon" }, { status: 400 });
  const c = parsed.data;
  if (c.discount_type === "percent" && c.discount_value > 100) {
    return NextResponse.json({ error: "Percent must be 1–100" }, { status: 400 });
  }

  const { data, error } = await adminClient.from("event_coupons").insert({
    event_sanity_id: managed.sanityEventId,
    code: c.code, discount_type: c.discount_type, discount_value: c.discount_value,
    max_redemptions: c.max_redemptions ?? null,
    expires_at: c.expires_at ?? null,
    one_per_customer: c.one_per_customer ?? false,
    created_by: user.id, created_by_role: managed.isAdmin ? "admin" : "host",
  }).select("id, code, discount_type, discount_value, max_redemptions, redeemed, expires_at, one_per_customer, created_at").single();
  if (error || !data) {
    const dup = (error?.message ?? "").includes("idx_event_coupons_code");
    return NextResponse.json({ error: dup ? "That code already exists for this event" : "Could not create coupon" }, { status: dup ? 409 : 500 });
  }
  return NextResponse.json(data);
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const managed = await resolveManageableEvent(supabase, user.id, id);
  if (!managed) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const parsed = z.object({ couponId: z.string().uuid() }).safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: "Invalid request" }, { status: 400 });

  await adminClient.from("event_coupons")
    .update({ active: false }).eq("id", parsed.data.couponId).eq("event_sanity_id", managed.sanityEventId);
  return NextResponse.json({ ok: true });
}
