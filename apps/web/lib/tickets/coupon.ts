// apps/web/lib/tickets/coupon.ts
// Pure coupon math + non-DB validation. Cap and one-per-customer need the DB
// and are enforced in the checkout route (atomic reserve + redemption lookup).

export type Coupon = {
  id: string;
  event_sanity_id: string;
  discount_type: "percent" | "fixed";
  discount_value: number;
  expires_at: string | null;
  active: boolean;
};

export function applyCoupon(subtotalKes: number, c: Coupon): { discount_kes: number; total_kes: number } {
  const raw = c.discount_type === "percent"
    ? Math.floor((subtotalKes * c.discount_value) / 100)
    : c.discount_value;
  const discount_kes = Math.max(0, Math.min(raw, subtotalKes));
  return { discount_kes, total_kes: subtotalKes - discount_kes };
}

export type CouponErrorCode = "inactive" | "wrong_event" | "expired";

export function couponError(
  c: Coupon,
  ctx: { now: Date; eventSanityId: string },
): CouponErrorCode | null {
  if (!c.active) return "inactive";
  if (c.event_sanity_id !== ctx.eventSanityId) return "wrong_event";
  if (c.expires_at && new Date(c.expires_at).getTime() <= ctx.now.getTime()) return "expired";
  return null;
}
