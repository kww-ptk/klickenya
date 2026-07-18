// Server-side price authority for event tickets. Pure functions — no I/O.

export type SanityTier = {
  _key: string;
  name: string;
  price: number;
  available?: number | null;
  isSoldOut?: boolean;
};

export type OrderLine = {
  tier_key: string;
  tier_name: string;
  unit_price_kes: number;
  qty: number;
  capacity: number | null;
};

const MAX_QTY_PER_TIER = 10;

export function buildOrderLines(
  tiers: SanityTier[],
  requested: { tierKey: string; qty: number }[],
  opts: { freeEvent?: boolean; capacity?: number | null } = {},
): OrderLine[] {
  if (requested.length === 0) throw new Error("BAD_QTY");
  const seen = new Set<string>();
  return requested.map(({ tierKey, qty }) => {
    if (!Number.isInteger(qty) || qty < 1 || qty > MAX_QTY_PER_TIER) throw new Error("BAD_QTY");
    if (seen.has(tierKey)) throw new Error("DUPLICATE_TIER");
    seen.add(tierKey);

    if (opts.freeEvent && tierKey === "free") {
      return {
        tier_key: "free",
        tier_name: "Free entry",
        unit_price_kes: 0,
        qty,
        capacity: opts.capacity ?? null,
      };
    }
    const tier = tiers.find((t) => t._key === tierKey);
    if (!tier) throw new Error("UNKNOWN_TIER");
    if (tier.isSoldOut) throw new Error("SOLD_OUT");
    return {
      tier_key: tier._key,
      tier_name: tier.name,
      unit_price_kes: Math.round(tier.price),
      qty,
      capacity: tier.available ?? null,
    };
  });
}

export function computeTotals(lines: OrderLine[], platformFeeBps: number) {
  const subtotal_kes = lines.reduce((s, l) => s + l.unit_price_kes * l.qty, 0);
  const platform_fee_kes =
    subtotal_kes === 0 ? 0 : Math.floor((subtotal_kes * platformFeeBps) / 10_000);
  return {
    subtotal_kes,
    total_kes: subtotal_kes,
    platform_fee_kes,
    host_share_kes: subtotal_kes - platform_fee_kes,
  };
}
