// apps/web/lib/tickets/tierEdit.ts
// Pure helpers for host tier editing. Sanity ticketTypes[] items carry a _key;
// preserving it on edit keeps event_ticket_counters attached to the tier.

export type SanityTierDoc = {
  _key: string;
  name: string;
  price: number;
  description?: string;
  available?: number;
  isSoldOut?: boolean;
};

export type TierInput = {
  _key?: string;
  name: string;
  price: number;
  description?: string;
  available?: number;
  isSoldOut?: boolean;
};

export function validateTierInput(t: TierInput): { ok: true } | { ok: false; error: string } {
  if (!t.name || !t.name.trim()) return { ok: false, error: "Name is required" };
  if (!Number.isFinite(t.price) || t.price < 0) return { ok: false, error: "Price must be ≥ 0" };
  if (t.available != null && (!Number.isInteger(t.available) || t.available < 0)) {
    return { ok: false, error: "Availability must be a whole number ≥ 0" };
  }
  return { ok: true };
}

/** Rebuild the ticketTypes array from edited input, preserving _key for tiers
 *  that already had one and minting a fresh key (via genKey) for new tiers.
 *  Tiers absent from `edited` are dropped (removal). */
export function mergeTierKeys(
  _existing: SanityTierDoc[],
  edited: TierInput[],
  genKey: () => string,
): SanityTierDoc[] {
  return edited.map((t) => {
    const doc: SanityTierDoc = {
      _key: t._key ?? genKey(),
      name: t.name.trim(),
      price: Math.round(t.price),
      isSoldOut: t.isSoldOut ?? false,
    };
    if (t.description && t.description.trim()) doc.description = t.description.trim();
    if (t.available != null) doc.available = Math.round(t.available);
    return doc;
  });
}
