# Ticketing Management Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let event hosts (and admins) edit ticket tiers (price/availability), run per-event discount coupons, and monitor sales/guests/check-ins from one dashboard.

**Architecture:** Tier definitions stay in Sanity (`listing.ticketTypes`), host-edited via a server route that patches Sanity with the write token (preserving `_key`s) and revalidates. Coupons live in Supabase (migration 081) with an atomic reserve/release counter mirroring the existing ticket inventory, integrated into the existing checkout. The dashboard enhances the existing `/dashboard/events/[id]/tickets` server page. Admins reach any event via a widened owner-or-admin resolver.

**Tech Stack:** Next.js 16 App Router · Supabase (adminClient + Postgres RPCs) · Sanity write client · zod v4 · vitest.

**Spec:** `docs/superpowers/specs/2026-07-18-ticketing-management-design.md`

**Branch:** continue on `feat/event-ticketing` (ships in PR #86). Worktree: `/Users/patrikgiuliana/Desktop/CLAUDE CODE/klickenya-ticketing`. Verify `git branch --show-current` → `feat/event-ticketing` before each commit.

**Environment note (all tasks):** this environment cannot reach Supabase/Sanity/Paystack/browser. Gates are `pnpm vitest run` + `npx tsc --noEmit` + `pnpm lint` (repo has ~251 pre-existing lint errors under `scripts/*.ts` — ignore those; only touched files matter). DB migration application + runtime flows are manual user steps — flag, never fake.

**Reuse (already on this branch):**
- `@/lib/supabase/admin` → `adminClient`; `@/lib/supabase/server` → `createClient()` (async SSR).
- `@/lib/sanity/client` → `sanityClient` (read); `@/lib/sanity/writeClient` → confirm export name (patches Sanity via `SANITY_WRITE_TOKEN`). Pattern to copy: `apps/web/app/api/admin/listings/[id]/route.ts`.
- `@/lib/events/ownedEvent` → `resolveOwnedEvent(supabase, userId, id)` → `{ sanityEventId, eventTitle } | null`.
- `@/lib/tickets/pricing` → `computeTotals(lines, bps)`, type `OrderLine`.
- `@/lib/admin/auth` → `assertAdmin(request)` (throws) — admin = `users.role === "admin"`.
- Checkout route: `apps/web/app/api/events/tickets/checkout/route.ts`. Expiry cron: `apps/web/app/api/cron/expire-ticket-orders/route.ts`. Buyer UI: `apps/web/components/events/TicketPurchase.tsx`. Host dashboard: `apps/web/app/dashboard/events/[id]/tickets/page.tsx`.

---

## File Structure

```
apps/web/lib/events/manageableEvent.ts          # owner-OR-admin resolver (Part 1+3)
apps/web/lib/tickets/tierEdit.ts                 # pure: mergeTierKeys, validateTierInput (+test)
apps/web/lib/tickets/coupon.ts                   # pure: applyCoupon, couponError (+test)
apps/web/app/api/dashboard/events/[id]/tiers/route.ts        # PUT patch ticketTypes → Sanity
apps/web/app/api/dashboard/events/[id]/coupons/route.ts      # POST create / DELETE deactivate
apps/web/app/api/events/tickets/coupon/preview/route.ts      # POST live discount preview
apps/web/app/dashboard/events/[id]/tickets/TierManager.tsx   # client
apps/web/app/dashboard/events/[id]/tickets/CouponManager.tsx # client
apps/web/app/dashboard/events/[id]/tickets/GuestList.tsx     # client (search)
apps/web/app/dashboard/events/[id]/tickets/SalesTimeline.tsx # inline SVG bars
supabase/migrations/081_event_coupons.sql
```
Modified: checkout route, expiry cron, TicketPurchase, tickets page, scan page (admin access), `resolveOwnedEvent` callers.

---

## Task 1: Owner-or-admin resolver

**Files:**
- Create: `apps/web/lib/events/manageableEvent.ts`

Admins must reach any event's management surfaces; hosts only their own. This wraps `resolveOwnedEvent` and falls back to an admin check.

- [ ] **Step 1: Read the real admin check**

Open `apps/web/lib/admin/auth.ts` and confirm: `assertAdmin` reads the user then checks `users.role === "admin"` via the service-role client. Confirm the exact role value/column. You will replicate the role check (not `assertAdmin` itself, which throws and needs a `NextRequest`).

- [ ] **Step 2: Implement the resolver**

```typescript
// apps/web/lib/events/manageableEvent.ts
import type { SupabaseClient } from "@supabase/supabase-js";
import { adminClient } from "@/lib/supabase/admin";
import { sanityClient } from "@/lib/sanity/client";
import { resolveOwnedEvent } from "./ownedEvent";

/** Resolve an event [id] the current user may MANAGE: the host who owns it,
 *  or any admin. Returns { sanityEventId, eventTitle, isAdmin } or null. */
export async function resolveManageableEvent(
  supabase: SupabaseClient,
  userId: string,
  id: string,
): Promise<{ sanityEventId: string; eventTitle: string; isAdmin: boolean } | null> {
  const owned = await resolveOwnedEvent(supabase, userId, id);
  if (owned) return { ...owned, isAdmin: false };

  const { data: profile } = await adminClient
    .from("users").select("role").eq("id", userId).maybeSingle();
  if (profile?.role !== "admin") return null;

  // Admin: [id] may be an events_pending.id or a Sanity _id. Resolve without host scoping.
  const { data: pending } = await adminClient
    .from("events_pending").select("title, sanity_event_id").eq("id", id).maybeSingle();
  if (pending?.sanity_event_id) {
    return { sanityEventId: pending.sanity_event_id, eventTitle: pending.title ?? "Event", isAdmin: true };
  }
  const ev = await sanityClient.fetch<{ _id: string; title: string } | null>(
    `*[_type == "listing" && _id == $id && type == "event"][0]{ _id, title }`,
    { id },
  );
  if (!ev) return null;
  return { sanityEventId: ev._id, eventTitle: ev.title ?? "Event", isAdmin: true };
}
```

- [ ] **Step 3: Typecheck** — `cd apps/web && npx tsc --noEmit` → clean.

- [ ] **Step 4: Commit**

```bash
cd "/Users/patrikgiuliana/Desktop/CLAUDE CODE/klickenya-ticketing"
git add apps/web/lib/events/manageableEvent.ts
git commit -m "feat(tickets): owner-or-admin event resolver for management surfaces"
```

---

## Task 2: Tier-edit pure logic (TDD)

**Files:**
- Create: `apps/web/lib/tickets/tierEdit.ts`
- Test: `apps/web/lib/tickets/__tests__/tierEdit.test.ts`

`_key` preservation is the correctness invariant: edited tiers keep their key (so inventory counters stay attached); only new tiers get fresh keys.

- [ ] **Step 1: Write the failing test**

```typescript
// apps/web/lib/tickets/__tests__/tierEdit.test.ts
import { describe, it, expect } from "vitest";
import { mergeTierKeys, validateTierInput, type TierInput } from "../tierEdit";

describe("validateTierInput", () => {
  it("accepts a valid tier", () => {
    expect(validateTierInput({ name: "VIP", price: 5000, available: 100 })).toEqual({ ok: true });
  });
  it("rejects empty name, negative price, negative availability", () => {
    expect(validateTierInput({ name: "", price: 100 }).ok).toBe(false);
    expect(validateTierInput({ name: "GA", price: -1 }).ok).toBe(false);
    expect(validateTierInput({ name: "GA", price: 100, available: -5 }).ok).toBe(false);
  });
  it("allows blank/undefined availability (unlimited)", () => {
    expect(validateTierInput({ name: "GA", price: 100 }).ok).toBe(true);
  });
});

describe("mergeTierKeys", () => {
  const existing = [
    { _key: "k1", name: "GA", price: 1000 },
    { _key: "k2", name: "VIP", price: 5000 },
  ];
  it("keeps _key for tiers matched by _key", () => {
    const edited: TierInput[] = [{ _key: "k1", name: "GA", price: 1200 }];
    const out = mergeTierKeys(existing, edited, () => "NEW");
    expect(out[0]._key).toBe("k1");
    expect(out[0].price).toBe(1200);
  });
  it("assigns a fresh key to tiers with no _key", () => {
    const edited: TierInput[] = [{ name: "Early Bird", price: 500 }];
    const out = mergeTierKeys(existing, edited, () => "NEW");
    expect(out[0]._key).toBe("NEW");
  });
  it("drops tiers not present in the edited list (removal)", () => {
    const edited: TierInput[] = [{ _key: "k2", name: "VIP", price: 5000 }];
    const out = mergeTierKeys(existing, edited, () => "NEW");
    expect(out).toHaveLength(1);
    expect(out[0]._key).toBe("k2");
  });
  it("normalizes fields: rounds price, blank available → undefined, default isSoldOut false", () => {
    const edited: TierInput[] = [{ name: "GA", price: 100.7, available: undefined, isSoldOut: true }];
    const out = mergeTierKeys([], edited, () => "NEW");
    expect(out[0]).toMatchObject({ name: "GA", price: 101, isSoldOut: true });
    expect(out[0].available).toBeUndefined();
  });
});
```

- [ ] **Step 2: Run — verify FAIL** — `cd apps/web && pnpm vitest run lib/tickets/__tests__/tierEdit.test.ts` → FAIL (module missing).

- [ ] **Step 3: Implement**

```typescript
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
```

- [ ] **Step 4: Run — verify PASS** — `pnpm vitest run lib/tickets/__tests__/tierEdit.test.ts` → all pass. Paste output.

- [ ] **Step 5: Commit**

```bash
git add apps/web/lib/tickets/tierEdit.ts apps/web/lib/tickets/__tests__/tierEdit.test.ts
git commit -m "feat(tickets): tier-edit pure logic — _key preservation + validation (TDD)"
```

---

## Task 3: Tier update API (patch Sanity)

**Files:**
- Create: `apps/web/app/api/dashboard/events/[id]/tiers/route.ts`

- [ ] **Step 1: Confirm the write client + patch pattern**

Open `apps/web/lib/sanity/writeClient.ts` — confirm the export name (e.g. `writeClient`). Open `apps/web/app/api/admin/listings/[id]/route.ts` — confirm the patch/commit pattern (`writeClient.patch(id).set({...}).commit()`) and the revalidation call used after a listing edit. Match both.

- [ ] **Step 2: Implement**

```typescript
// apps/web/app/api/dashboard/events/[id]/tiers/route.ts
import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { randomUUID } from "crypto";
import { z } from "zod/v4";
import { createClient } from "@/lib/supabase/server";
import { sanityClient } from "@/lib/sanity/client";
import { writeClient } from "@/lib/sanity/writeClient"; // confirm export name in Step 1
import { resolveManageableEvent } from "@/lib/events/manageableEvent";
import { mergeTierKeys, validateTierInput, type TierInput } from "@/lib/tickets/tierEdit";

const tierSchema = z.object({
  _key: z.string().optional(),
  name: z.string().trim().min(1).max(60),
  price: z.number().min(0),
  description: z.string().trim().max(200).optional(),
  available: z.number().int().min(0).optional(),
  isSoldOut: z.boolean().optional(),
});
const bodySchema = z.object({ tiers: z.array(tierSchema).max(20) });

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const managed = await resolveManageableEvent(supabase, user.id, id);
  if (!managed) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const parsed = bodySchema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: "Invalid tiers" }, { status: 400 });
  for (const t of parsed.data.tiers) {
    const v = validateTierInput(t as TierInput);
    if (!v.ok) return NextResponse.json({ error: v.error }, { status: 400 });
  }

  // Load existing ticketTypes so mergeTierKeys can preserve keys, plus the URL parts.
  const doc = await sanityClient.fetch<{
    ticketTypes: { _key: string; name: string; price: number }[] | null;
    city: string | null; slug: string | null;
  } | null>(
    `*[_type == "listing" && _id == $id][0]{
      ticketTypes[]{_key, name, price},
      city, "slug": slug.current
    }`,
    { id: managed.sanityEventId },
  );

  const merged = mergeTierKeys(doc?.ticketTypes ?? [], parsed.data.tiers as TierInput[], randomUUID);

  try {
    await writeClient.patch(managed.sanityEventId).set({ ticketTypes: merged }).commit();
  } catch (e) {
    console.error("[tiers] sanity patch failed:", e);
    return NextResponse.json({ error: "Could not save tiers" }, { status: 500 });
  }

  // Revalidate the concrete listing URL (plural type + city segment).
  if (doc?.city && doc?.slug) {
    const city = doc.city.toLowerCase().replace(/\s+/g, "-");
    revalidatePath(`/events/${city}/${doc.slug}`);
  }

  return NextResponse.json({ ok: true, tiers: merged });
}
```

- [ ] **Step 3: Typecheck** — `npx tsc --noEmit` → clean. (If `writeClient` export name differs, fix the import and note it.)

- [ ] **Step 4: Commit**

```bash
git add "apps/web/app/api/dashboard/events/[id]/tiers/"
git commit -m "feat(tickets): tier update API — patch Sanity ticketTypes (owner/admin), revalidate listing"
```

---

## Task 4: TierManager UI + wire into dashboard

**Files:**
- Create: `apps/web/app/dashboard/events/[id]/tickets/TierManager.tsx`
- Modify: `apps/web/app/dashboard/events/[id]/tickets/page.tsx`

- [ ] **Step 1: Read the tickets page** to see how it resolves the event and where to fetch tiers. It already resolves `sanityEventId` and fetches tickets/orders; you will add a fresh Sanity tier fetch + counters and render `<TierManager>`.

- [ ] **Step 2: Implement TierManager**

```tsx
// apps/web/app/dashboard/events/[id]/tickets/TierManager.tsx
"use client";
import { useState } from "react";

type Tier = { _key?: string; name: string; price: number; description?: string; available?: number; isSoldOut?: boolean; sold?: number };

export default function TierManager({ eventId, initialTiers }: { eventId: string; initialTiers: Tier[] }) {
  const [tiers, setTiers] = useState<Tier[]>(initialTiers.length ? initialTiers : []);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  function update(i: number, patch: Partial<Tier>) {
    setTiers((t) => t.map((x, j) => (j === i ? { ...x, ...patch } : x)));
  }
  function addTier() { setTiers((t) => [...t, { name: "", price: 0 }]); }
  function removeTier(i: number) { setTiers((t) => t.filter((_, j) => j !== i)); }

  async function save() {
    setBusy(true); setError(null); setMsg(null);
    try {
      const payload = {
        tiers: tiers.map((t) => ({
          _key: t._key, name: t.name.trim(), price: Number(t.price),
          description: t.description?.trim() || undefined,
          available: t.available === undefined || (t.available as unknown as string) === "" ? undefined : Number(t.available),
          isSoldOut: !!t.isSoldOut,
        })),
      };
      const res = await fetch(`/api/dashboard/events/${eventId}/tiers`, {
        method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (!res.ok) { setError(json.error ?? "Could not save"); return; }
      setMsg("Saved. Public page updates within a minute.");
    } finally { setBusy(false); }
  }

  return (
    <section className="mt-8 rounded-xl border border-neutral-200 p-5">
      <h2 className="font-bold">Ticket tiers</h2>
      <p className="text-sm text-neutral-500">Edit prices and availability. Lowering availability below sold just stops further sales.</p>
      <div className="mt-4 space-y-3">
        {tiers.map((t, i) => (
          <div key={t._key ?? `new-${i}`} className="rounded-lg border border-neutral-100 p-3">
            <div className="flex flex-wrap gap-2">
              <input value={t.name} onChange={(e) => update(i, { name: e.target.value })} placeholder="Tier name"
                className="min-w-[8rem] flex-1 rounded border border-neutral-300 px-2 py-2 text-[16px]" />
              <input type="number" min={0} value={t.price} onChange={(e) => update(i, { price: Number(e.target.value) })} placeholder="Price KES"
                className="w-28 rounded border border-neutral-300 px-2 py-2 text-[16px]" />
              <input type="number" min={0} value={t.available ?? ""} onChange={(e) => update(i, { available: e.target.value === "" ? undefined : Number(e.target.value) })} placeholder="Cap (blank = ∞)"
                className="w-32 rounded border border-neutral-300 px-2 py-2 text-[16px]" />
            </div>
            <div className="mt-2 flex items-center justify-between text-sm">
              <label className="flex items-center gap-2 text-neutral-600">
                <input type="checkbox" checked={!!t.isSoldOut} onChange={(e) => update(i, { isSoldOut: e.target.checked })} />
                Sold out
              </label>
              <span className="text-neutral-400">{t.sold != null ? `${t.sold} sold` : ""}</span>
              <button onClick={() => removeTier(i)} className="text-red-600 hover:underline">Remove</button>
            </div>
          </div>
        ))}
        {tiers.length === 0 && <p className="text-sm text-neutral-500">No tiers yet — add one (or this is a free event).</p>}
      </div>
      <div className="mt-4 flex items-center gap-3">
        <button onClick={addTier} className="rounded-lg border border-neutral-300 px-3 py-2 text-sm font-semibold">+ Add tier</button>
        <button onClick={save} disabled={busy} className="rounded-lg bg-amber-500 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">
          {busy ? "Saving…" : "Save tiers"}
        </button>
      </div>
      {msg && <p className="mt-2 text-sm text-green-600">{msg}</p>}
      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
    </section>
  );
}
```

- [ ] **Step 3: Wire into the tickets page**

In `apps/web/app/dashboard/events/[id]/tickets/page.tsx`, after `sanityEventId` is resolved, fetch tiers fresh + counters and render the manager. Add:

```tsx
// near the other data fetches
const tierDoc = await sanityClient.fetch<{ ticketTypes: { _key: string; name: string; price: number; description?: string; available?: number; isSoldOut?: boolean }[] | null } | null>(
  `*[_type == "listing" && _id == $id][0]{ ticketTypes[]{_key, name, price, description, available, isSoldOut} }`,
  { id: sanityEventId },
);
const { data: counters } = await adminClient
  .from("event_ticket_counters").select("tier_key, sold").eq("event_sanity_id", sanityEventId);
const soldByKey = new Map((counters ?? []).map((c) => [c.tier_key, c.sold]));
const initialTiers = (tierDoc?.ticketTypes ?? []).map((t) => ({ ...t, sold: soldByKey.get(t._key) ?? 0 }));
```

Then render `<TierManager eventId={id} initialTiers={initialTiers} />` (import it) in the page, e.g. above the ticket list. Keep existing sections intact.

- [ ] **Step 4: Verify** — `npx tsc --noEmit` clean; `pnpm vitest run` unchanged; `pnpm lint` no new errors in touched files.

- [ ] **Step 5: Commit**

```bash
git add "apps/web/app/dashboard/events/[id]/tickets/TierManager.tsx" "apps/web/app/dashboard/events/[id]/tickets/page.tsx"
git commit -m "feat(tickets): host tier manager UI on the ticket dashboard"
```

---

## Task 5: Migration 081 — coupons

**Files:**
- Create: `supabase/migrations/081_event_coupons.sql`

- [ ] **Step 1: Write the migration** (confirm 080 is the highest on disk; 081 is next)

```sql
-- 081_event_coupons.sql
-- Per-event discount coupons with atomic redemption caps. Deny-all RLS.

CREATE TABLE event_coupons (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_sanity_id text NOT NULL,
  code text NOT NULL,                         -- stored uppercase
  discount_type text NOT NULL CHECK (discount_type IN ('percent','fixed')),
  discount_value integer NOT NULL CHECK (discount_value >= 0),
  max_redemptions integer,                    -- NULL = unlimited
  redeemed integer NOT NULL DEFAULT 0 CHECK (redeemed >= 0),
  expires_at timestamptz,
  one_per_customer boolean NOT NULL DEFAULT false,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_by_role text NOT NULL DEFAULT 'host' CHECK (created_by_role IN ('host','admin')),
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
-- One active code per event (case-insensitive via the uppercase-store convention).
CREATE UNIQUE INDEX idx_event_coupons_code ON event_coupons (event_sanity_id, code) WHERE active;
CREATE INDEX idx_event_coupons_event ON event_coupons (event_sanity_id) WHERE active;

CREATE TABLE coupon_redemptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  coupon_id uuid NOT NULL REFERENCES event_coupons(id) ON DELETE RESTRICT,
  order_id uuid NOT NULL REFERENCES ticket_orders(id) ON DELETE CASCADE,
  buyer_email text NOT NULL,
  discount_kes integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_coupon_redemptions_coupon ON coupon_redemptions (coupon_id);
CREATE INDEX idx_coupon_redemptions_email ON coupon_redemptions (coupon_id, buyer_email);

ALTER TABLE ticket_orders ADD COLUMN coupon_id uuid REFERENCES event_coupons(id) ON DELETE SET NULL;
ALTER TABLE ticket_orders ADD COLUMN discount_kes integer NOT NULL DEFAULT 0;

-- Atomic cap+expiry+active guard. Raises COUPON_UNAVAILABLE when exhausted/expired.
CREATE OR REPLACE FUNCTION reserve_coupon(p_coupon_id uuid) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE v_updated integer;
BEGIN
  UPDATE event_coupons
     SET redeemed = redeemed + 1
   WHERE id = p_coupon_id
     AND active
     AND (max_redemptions IS NULL OR redeemed < max_redemptions)
     AND (expires_at IS NULL OR expires_at > now());
  GET DIAGNOSTICS v_updated = ROW_COUNT;
  IF v_updated = 0 THEN RAISE EXCEPTION 'COUPON_UNAVAILABLE'; END IF;
END $$;

CREATE OR REPLACE FUNCTION release_coupon(p_coupon_id uuid) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  UPDATE event_coupons SET redeemed = GREATEST(0, redeemed - 1) WHERE id = p_coupon_id;
END $$;

ALTER TABLE event_coupons ENABLE ROW LEVEL SECURITY;      -- deny-all: adminClient only
ALTER TABLE coupon_redemptions ENABLE ROW LEVEL SECURITY;
```

**Note (add-column rule):** this ALTERs `ticket_orders`. Per CLAUDE.md, after adding columns, every `.select()` that should expose them must be updated. `coupon_id`/`discount_kes` are consumed by the host dashboard (Task 11) and are added to the checkout insert (Task 8) — no existing SELECT needs them, but do not `select("*")` assume; the dashboard task adds them explicitly.

- [ ] **Step 2: Structural sanity check** — `ls supabase/migrations | tail -3` shows 079, 080, 081. Confirm balanced `$$` (2 functions), both `ENABLE ROW LEVEL SECURITY`, both ALTER lines. DB application is a manual user step — do not claim it was applied.

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/081_event_coupons.sql
git commit -m "feat(tickets): migration 081 — event coupons, redemptions, atomic reserve/release, order cols"
```

---

## Task 6: Coupon pure logic (TDD)

**Files:**
- Create: `apps/web/lib/tickets/coupon.ts`
- Test: `apps/web/lib/tickets/__tests__/coupon.test.ts`

- [ ] **Step 1: Write the failing test**

```typescript
// apps/web/lib/tickets/__tests__/coupon.test.ts
import { describe, it, expect } from "vitest";
import { applyCoupon, couponError, type Coupon } from "../coupon";

const base: Coupon = {
  id: "c1", event_sanity_id: "evt1", discount_type: "percent", discount_value: 20,
  expires_at: null, active: true,
};

describe("applyCoupon", () => {
  it("percent discount floors and clamps", () => {
    expect(applyCoupon(7000, base)).toEqual({ discount_kes: 1400, total_kes: 5600 });
    expect(applyCoupon(999, { ...base, discount_value: 33 })).toEqual({ discount_kes: 329, total_kes: 670 });
  });
  it("fixed discount never exceeds subtotal (free floor)", () => {
    expect(applyCoupon(500, { ...base, discount_type: "fixed", discount_value: 800 }))
      .toEqual({ discount_kes: 500, total_kes: 0 });
  });
  it("100% percent → free", () => {
    expect(applyCoupon(3000, { ...base, discount_value: 100 })).toEqual({ discount_kes: 3000, total_kes: 0 });
  });
});

describe("couponError (non-DB checks)", () => {
  const now = new Date("2026-07-18T12:00:00Z");
  it("passes a valid coupon for its event", () => {
    expect(couponError(base, { now, eventSanityId: "evt1" })).toBeNull();
  });
  it("rejects inactive, wrong event, expired", () => {
    expect(couponError({ ...base, active: false }, { now, eventSanityId: "evt1" })).toBe("inactive");
    expect(couponError(base, { now, eventSanityId: "other" })).toBe("wrong_event");
    expect(couponError({ ...base, expires_at: "2026-07-18T11:00:00Z" }, { now, eventSanityId: "evt1" })).toBe("expired");
  });
});
```

- [ ] **Step 2: Run — verify FAIL** — `pnpm vitest run lib/tickets/__tests__/coupon.test.ts` → FAIL.

- [ ] **Step 3: Implement**

```typescript
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
```

- [ ] **Step 4: Run — verify PASS** — `pnpm vitest run lib/tickets/__tests__/coupon.test.ts` → pass. Paste output.

- [ ] **Step 5: Commit**

```bash
git add apps/web/lib/tickets/coupon.ts apps/web/lib/tickets/__tests__/coupon.test.ts
git commit -m "feat(tickets): coupon math + non-DB validation (TDD)"
```

---

## Task 7: Coupon preview endpoint

**Files:**
- Create: `apps/web/app/api/events/tickets/coupon/preview/route.ts`

Powers the buyer's live "apply code" field. Validates + computes discount, no reservation. Rate-limited (in-memory, like the door redeem).

- [ ] **Step 1: Implement**

```typescript
// apps/web/app/api/events/tickets/coupon/preview/route.ts
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod/v4";
import { adminClient } from "@/lib/supabase/admin";
import { sanityClient } from "@/lib/sanity/client";
import { buildOrderLines, computeTotals, type SanityTier } from "@/lib/tickets/pricing";
import { applyCoupon, couponError, type Coupon } from "@/lib/tickets/coupon";

const attempts = new Map<string, { count: number; resetAt: number }>();
function limited(ip: string): boolean {
  const now = Date.now();
  const r = attempts.get(ip);
  if (!r || now > r.resetAt) { attempts.set(ip, { count: 1, resetAt: now + 5 * 60_000 }); return false; }
  r.count++; return r.count > 20;
}

const schema = z.object({
  eventSanityId: z.string().min(5).max(120),
  code: z.string().trim().toUpperCase().min(1).max(40),
  tiers: z.array(z.object({ tierKey: z.string().max(60), qty: z.number().int() })).min(1).max(5),
});

export async function POST(req: NextRequest) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  if (limited(ip)) return NextResponse.json({ error: "Too many attempts" }, { status: 429 });

  const parsed = schema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  const { eventSanityId, code, tiers } = parsed.data;

  const event = await sanityClient.fetch<{ isFree: boolean | null; totalCapacity: number | null; ticketTypes: SanityTier[] | null } | null>(
    `*[_type == "listing" && _id == $id && type == "event"][0]{ isFree, totalCapacity, ticketTypes[]{_key, name, price, available, isSoldOut} }`,
    { id: eventSanityId },
  );
  if (!event || event.isFree) return NextResponse.json({ error: "No discount available" }, { status: 400 });

  let lines;
  try { lines = buildOrderLines(event.ticketTypes ?? [], tiers); }
  catch { return NextResponse.json({ error: "Invalid tickets" }, { status: 400 }); }
  const subtotal = computeTotals(lines, 0).subtotal_kes;

  const { data: coupon } = await adminClient
    .from("event_coupons")
    .select("id, event_sanity_id, discount_type, discount_value, expires_at, active")
    .eq("event_sanity_id", eventSanityId).eq("code", code).eq("active", true).maybeSingle();
  if (!coupon) return NextResponse.json({ valid: false, error: "Invalid code" });

  const err = couponError(coupon as Coupon, { now: new Date(), eventSanityId });
  if (err) return NextResponse.json({ valid: false, error: err === "expired" ? "Code expired" : "Invalid code" });

  const { discount_kes, total_kes } = applyCoupon(subtotal, coupon as Coupon);
  return NextResponse.json({ valid: true, discount_kes, total_kes });
}
```
Note: `couponError`'s `now` uses `new Date()` — fine in a route (this is not a workflow script).

- [ ] **Step 2: Typecheck** — `npx tsc --noEmit` → clean.

- [ ] **Step 3: Commit**

```bash
git add apps/web/app/api/events/tickets/coupon/
git commit -m "feat(tickets): coupon preview endpoint (rate-limited)"
```

---

## Task 8: Checkout + cron coupon integration

**Files:**
- Modify: `apps/web/app/api/events/tickets/checkout/route.ts`
- Modify: `apps/web/app/api/cron/expire-ticket-orders/route.ts`

- [ ] **Step 1: Read the current checkout route** to place edits precisely (schema, the reserve→order→issue sequence, the release-on-failure block).

- [ ] **Step 2: Add coupon to the checkout schema + logic**

In the zod `checkoutSchema`, add: `couponCode: z.string().trim().toUpperCase().min(1).max(40).optional(),`.

After `const totals = computeTotals(lines, feeBps);` and BEFORE the ticket reservation, insert coupon resolution:

```typescript
// ── Coupon (optional) ──────────────────────────────────────────────
let couponId: string | null = null;
let discountKes = 0;
let finalTotal = totals.total_kes;
if (body.couponCode && !event.isFree) {
  const { data: coupon } = await adminClient
    .from("event_coupons")
    .select("id, event_sanity_id, discount_type, discount_value, expires_at, active, one_per_customer")
    .eq("event_sanity_id", body.eventSanityId).eq("code", body.couponCode).eq("active", true).maybeSingle();
  if (!coupon) return NextResponse.json({ error: "Invalid coupon code" }, { status: 400 });

  const { couponError } = await import("@/lib/tickets/coupon");
  if (couponError(coupon as never, { now: new Date(), eventSanityId: body.eventSanityId })) {
    return NextResponse.json({ error: "Coupon not valid" }, { status: 400 });
  }
  if (coupon.one_per_customer) {
    const { data: prior } = await adminClient
      .from("coupon_redemptions").select("id").eq("coupon_id", coupon.id).eq("buyer_email", body.email).limit(1).maybeSingle();
    if (prior) return NextResponse.json({ error: "You've already used this coupon" }, { status: 409 });
  }
  const { applyCoupon } = await import("@/lib/tickets/coupon");
  const applied = applyCoupon(totals.subtotal_kes, coupon as never);
  couponId = coupon.id; discountKes = applied.discount_kes; finalTotal = applied.total_kes;

  const { error: cErr } = await adminClient.rpc("reserve_coupon", { p_coupon_id: coupon.id });
  if (cErr) return NextResponse.json({ error: "Coupon no longer available" }, { status: 409 });
}
const isFreeOrder = finalTotal === 0;
```

Replace subsequent uses so the ORDER and PAYSTACK use the discounted values:
- The ticket reservation stays as-is (tickets are still reserved for the tiers).
- Order insert: set `total_kes: finalTotal`, add `coupon_id: couponId`, `discount_kes: discountKes`. Keep `subtotal_kes: totals.subtotal_kes` and `platform_fee_bps` computed on the DISCOUNTED total's basis — keep `platform_fee_bps: isFreeOrder ? 0 : feeBps` (fee is bps, applied to finalTotal at ledger time — consistent with the dashboard which recomputes `floor(total_kes*bps/10000)`).
- The `isFreeOrder` free-issue branch and the Paystack `amountKes: finalTotal` both use `finalTotal`.
- After a successful paid/free order insert, insert the redemption row:
```typescript
if (couponId) {
  await adminClient.from("coupon_redemptions").insert({
    coupon_id: couponId, order_id: order.id, buyer_email: body.email, discount_kes: discountKes,
  });
}
```
- In the order-insert-failure rollback block (where `release_event_tickets` is called), ALSO release the coupon:
```typescript
if (couponId) await adminClient.rpc("release_coupon", { p_coupon_id: couponId });
```

Replace the two later references to `totals.total_kes` for the order/Paystack with `finalTotal` (the ticket reservation and `computeTotals` subtotal stay unchanged). Verify no remaining `totals.total_kes` is used where the discounted total is intended.

- [ ] **Step 3: Cron releases coupons for expired pending orders**

In `expire-ticket-orders/route.ts`, extend the stale-order select to include `coupon_id`, and after releasing tickets for an expired order, release its coupon:
```typescript
// select: add coupon_id
.select("id, event_sanity_id, lines, coupon_id")
// after release_event_tickets for the flipped order:
if (order.coupon_id) await adminClient.rpc("release_coupon", { p_coupon_id: order.coupon_id });
```

- [ ] **Step 4: Verify** — `npx tsc --noEmit` clean; `pnpm vitest run` unchanged (24+ from Tasks 2/6). Trace by eye: buyer charged `finalTotal`; ledger fee `floor(finalTotal*bps/10000)` still matches the dashboard recompute.

- [ ] **Step 5: Commit**

```bash
git add apps/web/app/api/events/tickets/checkout/route.ts apps/web/app/api/cron/expire-ticket-orders/route.ts
git commit -m "feat(tickets): apply coupons at checkout (atomic reserve, free path, cron release)"
```

---

## Task 9: Coupon management API

**Files:**
- Create: `apps/web/app/api/dashboard/events/[id]/coupons/route.ts`

- [ ] **Step 1: Implement create + deactivate**

```typescript
// apps/web/app/api/dashboard/events/[id]/coupons/route.ts
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
    // Unique-violation on (event, code) among active → friendly message.
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
```

- [ ] **Step 2: Typecheck** — `npx tsc --noEmit` → clean.

- [ ] **Step 3: Commit**

```bash
git add "apps/web/app/api/dashboard/events/[id]/coupons/"
git commit -m "feat(tickets): coupon create/deactivate API (owner/admin)"
```

---

## Task 10: CouponManager UI + buyer coupon field

**Files:**
- Create: `apps/web/app/dashboard/events/[id]/tickets/CouponManager.tsx`
- Modify: `apps/web/app/dashboard/events/[id]/tickets/page.tsx` (fetch coupons + usage, render)
- Modify: `apps/web/components/events/TicketPurchase.tsx` (coupon field)

- [ ] **Step 1: CouponManager**

```tsx
// apps/web/app/dashboard/events/[id]/tickets/CouponManager.tsx
"use client";
import { useState } from "react";

type Coupon = {
  id: string; code: string; discount_type: "percent" | "fixed"; discount_value: number;
  max_redemptions: number | null; redeemed: number; expires_at: string | null;
  one_per_customer: boolean; uses?: number; discount_given?: number;
};

export default function CouponManager({ eventId, initial }: { eventId: string; initial: Coupon[] }) {
  const [coupons, setCoupons] = useState<Coupon[]>(initial);
  const [form, setForm] = useState({ code: "", discount_type: "percent" as "percent" | "fixed", discount_value: 10, max_redemptions: "", expires_at: "", one_per_customer: false });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function create() {
    setBusy(true); setError(null);
    try {
      const res = await fetch(`/api/dashboard/events/${eventId}/coupons`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code: form.code.trim().toUpperCase(),
          discount_type: form.discount_type,
          discount_value: Number(form.discount_value),
          max_redemptions: form.max_redemptions ? Number(form.max_redemptions) : null,
          expires_at: form.expires_at ? new Date(form.expires_at).toISOString() : null,
          one_per_customer: form.one_per_customer,
        }),
      });
      const json = await res.json();
      if (!res.ok) { setError(json.error ?? "Could not create"); return; }
      setCoupons((c) => [{ ...json, uses: 0, discount_given: 0 }, ...c]);
      setForm({ ...form, code: "", discount_value: 10, max_redemptions: "", expires_at: "" });
    } finally { setBusy(false); }
  }

  async function deactivate(couponId: string) {
    setBusy(true);
    try {
      const res = await fetch(`/api/dashboard/events/${eventId}/coupons`, {
        method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ couponId }),
      });
      if (res.ok) setCoupons((c) => c.filter((x) => x.id !== couponId));
    } finally { setBusy(false); }
  }

  return (
    <section className="mt-8 rounded-xl border border-neutral-200 p-5">
      <h2 className="font-bold">Coupons</h2>
      <div className="mt-3 flex flex-wrap items-end gap-2">
        <input value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })} placeholder="CODE"
          className="w-32 rounded border border-neutral-300 px-2 py-2 text-[16px] font-mono uppercase" />
        <select value={form.discount_type} onChange={(e) => setForm({ ...form, discount_type: e.target.value as "percent" | "fixed" })}
          className="rounded border border-neutral-300 px-2 py-2 text-[16px]">
          <option value="percent">% off</option>
          <option value="fixed">KSh off</option>
        </select>
        <input type="number" min={1} value={form.discount_value} onChange={(e) => setForm({ ...form, discount_value: Number(e.target.value) })}
          className="w-24 rounded border border-neutral-300 px-2 py-2 text-[16px]" />
        <input type="number" min={1} value={form.max_redemptions} onChange={(e) => setForm({ ...form, max_redemptions: e.target.value })} placeholder="Max uses"
          className="w-28 rounded border border-neutral-300 px-2 py-2 text-[16px]" />
        <input type="date" value={form.expires_at} onChange={(e) => setForm({ ...form, expires_at: e.target.value })}
          className="rounded border border-neutral-300 px-2 py-2 text-[16px]" />
        <label className="flex items-center gap-1 text-sm text-neutral-600">
          <input type="checkbox" checked={form.one_per_customer} onChange={(e) => setForm({ ...form, one_per_customer: e.target.checked })} />
          1/customer
        </label>
        <button onClick={create} disabled={busy || !form.code.trim()} className="rounded-lg bg-amber-500 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">Create</button>
      </div>
      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
      <div className="mt-4 divide-y divide-neutral-100">
        {coupons.length === 0 && <p className="py-2 text-sm text-neutral-500">No active coupons.</p>}
        {coupons.map((c) => (
          <div key={c.id} className="flex items-center justify-between gap-3 py-2 text-sm">
            <span>
              <span className="font-mono font-semibold">{c.code}</span>{" "}
              <span className="text-neutral-500">
                {c.discount_type === "percent" ? `${c.discount_value}% off` : `KSh ${c.discount_value} off`}
                {" · "}{c.uses ?? c.redeemed} used{c.max_redemptions ? `/${c.max_redemptions}` : ""}
                {c.discount_given != null ? ` · KSh ${c.discount_given.toLocaleString("en-KE")} given` : ""}
                {c.expires_at ? ` · exp ${new Date(c.expires_at).toLocaleDateString("en-KE")}` : ""}
              </span>
            </span>
            <button onClick={() => deactivate(c.id)} disabled={busy} className="text-red-600 hover:underline disabled:opacity-50">Deactivate</button>
          </div>
        ))}
      </div>
    </section>
  );
}
```

- [ ] **Step 2: Fetch coupons + usage in the tickets page and render**

In `tickets/page.tsx`, after `sanityEventId`, add:
```tsx
const { data: couponRows } = await adminClient
  .from("event_coupons")
  .select("id, code, discount_type, discount_value, max_redemptions, redeemed, expires_at, one_per_customer")
  .eq("event_sanity_id", sanityEventId).eq("active", true).order("created_at", { ascending: false });
const { data: redemptions } = await adminClient
  .from("coupon_redemptions").select("coupon_id, discount_kes")
  .in("coupon_id", (couponRows ?? []).map((c) => c.id).length ? (couponRows ?? []).map((c) => c.id) : ["00000000-0000-0000-0000-000000000000"]);
const useMap = new Map<string, { uses: number; given: number }>();
for (const r of redemptions ?? []) {
  const cur = useMap.get(r.coupon_id) ?? { uses: 0, given: 0 };
  useMap.set(r.coupon_id, { uses: cur.uses + 1, given: cur.given + r.discount_kes });
}
const initialCoupons = (couponRows ?? []).map((c) => ({ ...c, uses: useMap.get(c.id)?.uses ?? 0, discount_given: useMap.get(c.id)?.given ?? 0 }));
```
Render `<CouponManager eventId={id} initial={initialCoupons} />` (import it) below the TierManager.

- [ ] **Step 3: Buyer coupon field in TicketPurchase**

Read `TicketPurchase.tsx`. Add state `const [coupon, setCoupon] = useState(""); const [discount, setDiscount] = useState<{discount_kes:number; total_kes:number} | null>(null); const [couponMsg, setCouponMsg] = useState<string|null>(null);`. For non-free events, render a small "Have a coupon?" input + Apply button that POSTs to `/api/events/tickets/coupon/preview` with `{ eventSanityId, code: coupon, tiers: selected }`; on `{valid:true}` set `discount` and show the new total; on error show `couponMsg`. When a valid discount is applied, show `total_kes` as the pay amount and include `couponCode: coupon` in the checkout body. If `selected` changes after applying, clear `discount` (re-preview needed). Keep the existing pay button label using the discounted total when present.

- [ ] **Step 4: Verify** — `npx tsc --noEmit` clean; `pnpm vitest run` unchanged; lint clean on touched files.

- [ ] **Step 5: Commit**

```bash
git add "apps/web/app/dashboard/events/[id]/tickets/CouponManager.tsx" "apps/web/app/dashboard/events/[id]/tickets/page.tsx" apps/web/components/events/TicketPurchase.tsx
git commit -m "feat(tickets): coupon manager UI + buyer coupon field with live preview"
```

---

## Task 11: Dashboard polish + admin access

**Files:**
- Create: `apps/web/app/dashboard/events/[id]/tickets/GuestList.tsx`
- Create: `apps/web/app/dashboard/events/[id]/tickets/SalesTimeline.tsx`
- Modify: `apps/web/app/dashboard/events/[id]/tickets/page.tsx`
- Modify: `apps/web/app/dashboard/events/[id]/scan/page.tsx`

- [ ] **Step 1: SalesTimeline (inline SVG bars, no lib)**

```tsx
// apps/web/app/dashboard/events/[id]/tickets/SalesTimeline.tsx
"use client";

export default function SalesTimeline({ data }: { data: { day: string; count: number }[] }) {
  if (data.length === 0) return null;
  const max = Math.max(...data.map((d) => d.count), 1);
  return (
    <section className="mt-8 rounded-xl border border-neutral-200 p-5">
      <h2 className="font-bold">Sales</h2>
      <div className="mt-3 flex items-end gap-1" style={{ height: 120 }}>
        {data.map((d) => (
          <div key={d.day} className="flex flex-1 flex-col items-center justify-end gap-1" title={`${d.day}: ${d.count}`}>
            <div className="w-full rounded-t bg-amber-400" style={{ height: `${(d.count / max) * 100}%` }} />
            <span className="text-[9px] text-neutral-400">{d.day.slice(5)}</span>
          </div>
        ))}
      </div>
    </section>
  );
}
```

- [ ] **Step 2: GuestList (searchable)**

```tsx
// apps/web/app/dashboard/events/[id]/tickets/GuestList.tsx
"use client";
import { useState } from "react";

type Guest = { id: string; attendee_name: string; attendee_email: string; tier_name: string; status: string; coupon_code: string | null };

export default function GuestList({ guests }: { guests: Guest[] }) {
  const [q, setQ] = useState("");
  const filtered = q.trim()
    ? guests.filter((g) => (g.attendee_name + " " + g.attendee_email).toLowerCase().includes(q.trim().toLowerCase()))
    : guests;
  return (
    <section className="mt-8 rounded-xl border border-neutral-200 p-5">
      <div className="flex items-center justify-between gap-3">
        <h2 className="font-bold">Guests ({guests.length})</h2>
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search name or email"
          className="w-48 rounded border border-neutral-300 px-3 py-2 text-[16px]" />
      </div>
      <div className="mt-3 divide-y divide-neutral-100">
        {filtered.length === 0 && <p className="py-2 text-sm text-neutral-500">No matches.</p>}
        {filtered.map((g) => (
          <div key={g.id} className="flex items-center justify-between gap-3 py-2 text-sm">
            <div className="min-w-0">
              <p className="truncate font-semibold">{g.attendee_name}</p>
              <p className="truncate text-xs text-neutral-500">
                {g.tier_name} · {g.attendee_email}{g.coupon_code ? ` · 🎟 ${g.coupon_code}` : ""}
              </p>
            </div>
            <span className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold ${g.status === "checked_in" ? "bg-green-100 text-green-700" : "bg-neutral-100 text-neutral-600"}`}>
              {g.status === "checked_in" ? "Checked in" : "Issued"}
            </span>
          </div>
        ))}
      </div>
    </section>
  );
}
```

- [ ] **Step 3: Enhance the tickets page (KPIs, per-tier, timeline data, guest data)**

In `tickets/page.tsx`:
- Widen the tickets/orders selects to include what the KPIs and guest list need: orders already select `total_kes, platform_fee_bps, discount_kes, coupon_id, created_at`; add `discount_kes, coupon_id` to the order select (migration 081 columns). For guests, join tickets to their order's coupon: fetch a `{coupon_id → code}` map from `event_coupons` for this event, and tickets need their `order_id`; map ticket → order → coupon_id → code.
- Compute KPIs: `couponsUsed = redemptions count`, `discountGiven = sum(discount_kes)`, `avgOrder = gross / paidOrders`, plus the existing sold/gross/fee/payout/checkedIn.
- Build `perTier`: group tickets by `tier_name` → sold, revenue (sum price_kes), checkedIn.
- Build `timeline`: group paid orders by `created_at` date (Africa/Nairobi) → count.
- Build `guests`: map each issued ticket to `{ id, attendee_name, attendee_email, tier_name, status, coupon_code }` (coupon_code via ticket→order→coupon map; null if none).
- Render a KPI card grid, a per-tier `<table>`, `<SalesTimeline data={timeline} />`, `<GuestList guests={guests} />`, keeping TierManager, CouponManager, DoorCodesPanel.

Provide the KPI grid inline (mirror the existing stat-card markup already in the page). Keep the file readable; if it grows past ~250 lines, that is acceptable for a dashboard page but prefer extracting the KPI grid into a small server-rendered fragment in the same file.

- [ ] **Step 4: Admin access on both event pages**

In `tickets/page.tsx` and `scan/page.tsx`, replace the `resolveOwnedEvent(supabase, user.id, id)` call with `resolveManageableEvent(supabase, user.id, id)` (import from `@/lib/events/manageableEvent`); on `null` → `notFound()` (same as before). This lets admins open any event's dashboard/scanner. Behavior for hosts is unchanged.

- [ ] **Step 5: Verify** — `npx tsc --noEmit` clean; `pnpm vitest run` unchanged; lint clean on touched files.

- [ ] **Step 6: Commit**

```bash
git add "apps/web/app/dashboard/events/[id]/tickets/" "apps/web/app/dashboard/events/[id]/scan/page.tsx"
git commit -m "feat(tickets): host dashboard — KPIs, per-tier, sales timeline, guest search; admin access"
```

---

## Task 12: Docs + final verification

**Files:**
- Modify: `CLAUDE.md`

- [ ] **Step 1: Update CLAUDE.md** — migration counter → next is 082 (081 = event coupons). Add a line to the live ticketing feature: "host tier editing, per-event coupons (%/fixed, caps/expiry/one-per-customer), sales/guest dashboard, admin access to any event's ticketing."

- [ ] **Step 2: Full verification**
```bash
cd "/Users/patrikgiuliana/Desktop/CLAUDE CODE/klickenya-ticketing/apps/web" && pnpm vitest run && npx tsc --noEmit && cd .. && npx eslint apps/web/lib/tickets apps/web/lib/events
```
Expected: all tests pass (24 + tierEdit + coupon suites), tsc clean, no lint errors in touched lib dirs.

- [ ] **Step 3: Commit + push (updates PR #86)**
```bash
git add CLAUDE.md
git commit -m "docs: note ticketing management (tiers, coupons, dashboard) in CLAUDE.md"
git push
```

---

## Deployment checklist (manual, outside code)
1. Apply migration **081** to Supabase (079 + 080 already applied).
2. Confirm `SANITY_WRITE_TOKEN` is set in the environment (tier edits patch Sanity with it).
3. Test on dev preview: edit a tier price → public page updates; create a coupon → buyer applies it → discounted/free order issues; dashboard shows per-tier + guest search + coupon usage; an admin can open another host's event dashboard.

## Self-review notes
- **Spec coverage:** tier editing (T2–4) ✓ · coupons schema/logic/checkout/preview/UI (T5–10) ✓ · atomic cap with expiry-in-guard (T5) ✓ · dashboard KPIs/per-tier/timeline/guest search (T11) ✓ · admin access (T1, T11) ✓ · one-per-customer + max + expiry (T5, T8) ✓ · free-path at 100%/over (T6, T8) ✓.
- **Type consistency:** `Coupon` shape shared across coupon.ts/preview/checkout ✓ · `TierInput`/`SanityTierDoc` shared tierEdit ↔ tiers route ✓ · `resolveManageableEvent` return `{sanityEventId, eventTitle, isAdmin}` used in tiers/coupons/pages ✓ · order columns `coupon_id`/`discount_kes` defined in 081 and read in T10/T11 ✓.
- **Accepted simplification:** platform fee stays computed on the discounted `total_kes` at ledger time (`floor(total_kes*bps/10000)`), consistent between checkout storage and the dashboard recompute — no schema change needed.
