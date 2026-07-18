# Event Ticketing System Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn Klickenya events into a real ticketing product: guests buy tickets with M-Pesa/card via Paystack (Daraja-ready abstraction), every ticket (free RSVP or paid) gets a QR code, and hosts validate tickets at the door with a phone camera scanner.

**Architecture:** Ticket tier *definitions* stay in Sanity (`ticketTypes` array, keyed by Sanity `_key`); all *transactional* state (orders, tickets, inventory counters, ledger) lives in Supabase behind deny-all RLS + adminClient, matching the platform's "content in Sanity, transactions in Supabase" rule. Payment flows through a small provider interface (`lib/payments/`) implemented first for Paystack (redirect checkout + signed webhook); Daraja STK can be added later as a second implementation without touching routes. Free events use the same checkout endpoint with a zero total and skip the provider entirely — one unified `tickets` table, one scanner. Ticket QRs encode `https://klickenya.com/t/{code}` where `code` is a random 20-char base32 stored server-side (revocable, no crypto needed on scan — validation is a DB lookup + atomic status flip).

**Tech Stack:** Next.js 16 App Router · Supabase (Postgres RPCs for atomic inventory) · Paystack API (transaction/initialize + HMAC-SHA512 webhook) · Resend (ticket emails w/ QR + .ics attachments) · `qrcode` (server-side QR PNG) · `qr-scanner` (client camera) · zod v4 · vitest (new — first test harness in the repo)

**Decisions locked with Patrik (2026-07-17):**
1. Provider: **Paystack now, Daraja later** → build the provider abstraction.
2. Money flow V1: **all revenue to the Klickenya Paystack account**; per-order ledger records `platform_fee_bps`; hosts paid manually after the event. No subaccounts in V1.
3. Scope: **unified QR tickets for free AND paid events** — the legacy `/api/events/join` flow is replaced; free events get capacity enforcement + check-in for the first time.

**Fixes from the 2026-07-17 audit bundled into this build (they're in the same code paths):**
- Mobile has no join/buy CTA (`EventDetail.tsx` aside is `hidden lg:block`) → the new `TicketPurchase` panel renders on mobile.
- No capacity enforcement / duplicate race on join → atomic `reserve_event_tickets` RPC.
- No rate limit / abuse protection on join → Turnstile on checkout.
- `event_attendees` RLS exposes PII publicly → policy dropped in the migration.
- No `.ics` / reminder infrastructure → `.ics` attachment ships here (reminder cron is future work).

**New env vars (add to Vercel + `.env.example` + CLAUDE.md in Task 12):**
```
PAYSTACK_SECRET_KEY=sk_live_...      # server only — initialize + webhook verify
PLATFORM_TICKET_FEE_BPS=500          # 5% platform fee on paid tickets; 0 disables
```

**Out of scope (explicitly):** Daraja implementation (interface only), host payout automation, refund UI (status enum supports it), reminder emails, seat maps, promo codes, GHL PAYING stage.

---

## File Structure

```
supabase/migrations/079_event_ticketing.sql          # tables + RPCs + RLS + attendee-RLS fix
apps/web/lib/payments/types.ts                       # PaymentProvider interface + shared types
apps/web/lib/payments/paystack.ts                    # Paystack implementation
apps/web/lib/payments/index.ts                       # getPaymentProvider()
apps/web/lib/tickets/codes.ts                        # ticket code generation
apps/web/lib/tickets/pricing.ts                      # server-side total + fee math (pure)
apps/web/lib/tickets/issue.ts                        # issue tickets for a paid/free order + attendee bridge
apps/web/lib/tickets/email.ts                        # ticket email w/ QR PNG + .ics attachments
apps/web/lib/tickets/ics.ts                          # minimal VEVENT builder (pure)
apps/web/app/api/events/tickets/checkout/route.ts    # POST — create order (free issues immediately)
apps/web/app/api/events/tickets/orders/[id]/route.ts # GET — order status polling
apps/web/app/api/webhooks/paystack/route.ts          # POST — signed webhook → mark paid → issue
apps/web/app/api/cron/expire-ticket-orders/route.ts  # release stale pending inventory
apps/web/app/api/dashboard/events/tickets/validate/route.ts  # POST — host scan validation
apps/web/app/t/[code]/page.tsx                       # public ticket page (QR + status)
apps/web/app/events/tickets/confirm/page.tsx         # Paystack callback landing / poller
apps/web/components/events/TicketPurchase.tsx        # tier selector + buyer form (desktop + mobile)
apps/web/app/dashboard/events/[id]/scan/page.tsx     # camera scanner page (host)
apps/web/app/dashboard/events/[id]/scan/ScannerClient.tsx
apps/web/app/dashboard/events/[id]/tickets/page.tsx  # sales + ledger + ticket list
apps/web/vitest.config.ts                            # NEW test harness
apps/web/lib/payments/__tests__/paystack.test.ts
apps/web/lib/tickets/__tests__/pricing.test.ts
apps/web/lib/tickets/__tests__/codes.test.ts
apps/web/lib/tickets/__tests__/ics.test.ts
```

Modified files:
- `apps/web/components/listings/detail/EventDetail.tsx` (mount TicketPurchase, mobile CTA)
- `apps/web/components/events/JoinEventModal.tsx` (free path → checkout endpoint)
- `apps/web/app/dashboard/events/page.tsx` (add Tickets/Scan links; fix `listingType` bug)
- `vercel.json` (new cron)
- `apps/web/package.json` (deps + test script)
- `.env.example`, `CLAUDE.md` (Task 12)
- Delete: `apps/web/app/api/events/join/route.ts` (after JoinEventModal migrates)

Branch: `feat/event-ticketing` off `dev` (per CLAUDE.md branching rules — never off main).

---

### Task 0: Test harness (vitest) + dependencies

The repo has zero tests. This task creates the harness the rest of the plan's TDD steps rely on.

**Files:**
- Create: `apps/web/vitest.config.ts`
- Modify: `apps/web/package.json`

- [ ] **Step 1: Install dependencies**

```bash
cd "/Users/patrikgiuliana/Desktop/CLAUDE CODE/klickenya/apps/web"
pnpm add qrcode qr-scanner
pnpm add -D vitest @types/qrcode
```

- [ ] **Step 2: Create vitest config**

```typescript
// apps/web/vitest.config.ts
import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  test: {
    include: ["lib/**/__tests__/**/*.test.ts"],
    environment: "node",
  },
  resolve: {
    alias: { "@": path.resolve(__dirname) },
  },
});
```

- [ ] **Step 3: Add test script to apps/web/package.json**

In `"scripts"`, add:

```json
"test": "vitest run",
"test:watch": "vitest"
```

Also fix the broken root script while here — in the ROOT `package.json`, change:

```json
"typecheck": "pnpm --filter @klickenya/web exec tsc --noEmit"
```

(The current version silently no-ops; audit finding.)

- [ ] **Step 4: Verify harness runs (no tests yet → passes trivially)**

Run: `cd apps/web && pnpm test`
Expected: `No test files found` exit 0 (vitest exits 1 on no tests by default — pass `--passWithNoTests` in this one-off check): `pnpm vitest run --passWithNoTests` → exit 0.

- [ ] **Step 5: Commit**

```bash
git checkout dev && git pull && git checkout -b feat/event-ticketing
git add apps/web/package.json apps/web/vitest.config.ts package.json pnpm-lock.yaml
git commit -m "chore: add vitest harness + qrcode/qr-scanner deps; fix root typecheck script"
```

---

### Task 1: Migration 079 — ticketing schema

**Files:**
- Create: `supabase/migrations/079_event_ticketing.sql`

Notes for the engineer:
- Next free migration number is **079** (077 + 078 exist on disk; 046/047/050 are gaps — never reuse; 073 is doubled — never reuse).
- RLS pattern: enable RLS with NO policies = deny-all for anon/authed clients; all app access goes through the service-role `adminClient`. This is deliberate — `event_attendees`'s public-SELECT policy was a PII leak (audit finding) and is dropped here.
- Inventory: `event_ticket_counters` + `reserve_event_tickets()` gives atomic capacity enforcement in ONE statement per tier (`UPDATE ... WHERE sold + qty <= capacity`), no advisory locks needed.

- [ ] **Step 1: Write the migration**

```sql
-- 079_event_ticketing.sql
-- Unified event ticketing: orders, tickets, atomic inventory, ledger.
-- Tier definitions live in Sanity listing.ticketTypes (keyed by _key);
-- everything transactional lives here. RLS is deny-all: adminClient only.

-- ── Orders ──────────────────────────────────────────────────────────────
CREATE TABLE ticket_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_sanity_id text NOT NULL,
  buyer_name text NOT NULL,
  buyer_email text NOT NULL,
  buyer_phone text,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending','paid','expired','cancelled','refunded')),
  currency text NOT NULL DEFAULT 'KES',
  subtotal_kes integer NOT NULL CHECK (subtotal_kes >= 0),
  total_kes integer NOT NULL CHECK (total_kes >= 0),
  platform_fee_bps integer NOT NULL DEFAULT 0,
  -- line-item snapshot: [{tier_key, tier_name, unit_price_kes, qty}]
  lines jsonb NOT NULL,
  provider text NOT NULL DEFAULT 'free'
    CHECK (provider IN ('free','paystack','daraja')),
  provider_ref text,                       -- Paystack reference (= order id)
  created_at timestamptz NOT NULL DEFAULT now(),
  paid_at timestamptz,
  expires_at timestamptz                   -- pending orders released after this
);
CREATE INDEX idx_ticket_orders_event   ON ticket_orders (event_sanity_id);
CREATE INDEX idx_ticket_orders_status  ON ticket_orders (status, expires_at);
CREATE UNIQUE INDEX idx_ticket_orders_provider_ref
  ON ticket_orders (provider_ref) WHERE provider_ref IS NOT NULL;

-- ── Tickets ─────────────────────────────────────────────────────────────
CREATE TABLE tickets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES ticket_orders(id) ON DELETE RESTRICT,
  event_sanity_id text NOT NULL,
  tier_key text NOT NULL,                  -- Sanity ticketTypes[]._key ('free' for free events)
  tier_name text NOT NULL,
  price_kes integer NOT NULL DEFAULT 0,
  code text NOT NULL UNIQUE,               -- random base32, encoded in the QR
  attendee_name text NOT NULL,
  attendee_email text NOT NULL,
  status text NOT NULL DEFAULT 'issued'
    CHECK (status IN ('issued','checked_in','cancelled')),
  checked_in_at timestamptz,
  checked_in_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_tickets_event ON tickets (event_sanity_id, status);
CREATE INDEX idx_tickets_order ON tickets (order_id);

-- ── Inventory counters (capacity enforcement) ───────────────────────────
CREATE TABLE event_ticket_counters (
  event_sanity_id text NOT NULL,
  tier_key text NOT NULL,
  sold integer NOT NULL DEFAULT 0 CHECK (sold >= 0),
  capacity integer,                        -- NULL = unlimited
  PRIMARY KEY (event_sanity_id, tier_key)
);

-- Atomically reserve seats for every line of an order. p_lines:
--   [{"tier_key":"abc","qty":2,"capacity":100}, ...]
-- Upserts the counter row (capacity refreshed from Sanity at checkout time),
-- then increments sold iff capacity allows. Raises on any sold-out tier so
-- the whole reservation rolls back together.
CREATE OR REPLACE FUNCTION reserve_event_tickets(
  p_event_sanity_id text,
  p_lines jsonb
) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  line jsonb;
  v_updated integer;
BEGIN
  FOR line IN SELECT * FROM jsonb_array_elements(p_lines) LOOP
    INSERT INTO event_ticket_counters (event_sanity_id, tier_key, sold, capacity)
    VALUES (
      p_event_sanity_id,
      line->>'tier_key',
      0,
      NULLIF(line->>'capacity','')::integer
    )
    ON CONFLICT (event_sanity_id, tier_key)
    DO UPDATE SET capacity = EXCLUDED.capacity;

    UPDATE event_ticket_counters
       SET sold = sold + (line->>'qty')::integer
     WHERE event_sanity_id = p_event_sanity_id
       AND tier_key = line->>'tier_key'
       AND (capacity IS NULL OR sold + (line->>'qty')::integer <= capacity);

    GET DIAGNOSTICS v_updated = ROW_COUNT;
    IF v_updated = 0 THEN
      RAISE EXCEPTION 'SOLD_OUT:%', line->>'tier_key';
    END IF;
  END LOOP;
END $$;

-- Release seats (order expiry / cancellation).
CREATE OR REPLACE FUNCTION release_event_tickets(
  p_event_sanity_id text,
  p_lines jsonb
) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE line jsonb;
BEGIN
  FOR line IN SELECT * FROM jsonb_array_elements(p_lines) LOOP
    UPDATE event_ticket_counters
       SET sold = GREATEST(0, sold - (line->>'qty')::integer)
     WHERE event_sanity_id = p_event_sanity_id
       AND tier_key = line->>'tier_key';
  END LOOP;
END $$;

-- ── RLS: deny-all (adminClient/service-role only) ───────────────────────
ALTER TABLE ticket_orders         ENABLE ROW LEVEL SECURITY;
ALTER TABLE tickets               ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_ticket_counters ENABLE ROW LEVEL SECURITY;

-- ── Audit fix: event_attendees PII was publicly selectable ──────────────
DROP POLICY IF EXISTS "public_select_attendees" ON event_attendees;
-- Join inserts now happen via adminClient in the checkout route:
DROP POLICY IF EXISTS "anyone_can_join" ON event_attendees;
```

- [ ] **Step 2: Sanity-check the SQL locally (syntax only)**

If a local Supabase stack is running: `supabase db push --dry-run` from repo root. If not (typical for this environment), paste into the Supabase SQL editor's "validate" or rely on the review step — do NOT apply to prod from this branch; migrations apply on the normal deploy path.

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/079_event_ticketing.sql
git commit -m "feat(tickets): migration 079 — orders, tickets, atomic inventory, deny-all RLS, attendee PII fix"
```

---

### Task 2: Pricing math (pure, TDD)

**Files:**
- Create: `apps/web/lib/tickets/pricing.ts`
- Test: `apps/web/lib/tickets/__tests__/pricing.test.ts`

The server is the only price authority: the client sends `{tierKey, qty}` pairs; we join them against Sanity's `ticketTypes` and compute everything here.

- [ ] **Step 1: Write the failing tests**

```typescript
// apps/web/lib/tickets/__tests__/pricing.test.ts
import { describe, it, expect } from "vitest";
import { buildOrderLines, computeTotals, type SanityTier } from "../pricing";

const tiers: SanityTier[] = [
  { _key: "ga", name: "General", price: 1000, available: 100, isSoldOut: false },
  { _key: "vip", name: "VIP", price: 5000, available: 10, isSoldOut: false },
  { _key: "gone", name: "Early Bird", price: 500, available: 0, isSoldOut: true },
];

describe("buildOrderLines", () => {
  it("joins requested tiers against Sanity tiers", () => {
    const lines = buildOrderLines(tiers, [{ tierKey: "ga", qty: 2 }]);
    expect(lines).toEqual([
      { tier_key: "ga", tier_name: "General", unit_price_kes: 1000, qty: 2, capacity: 100 },
    ]);
  });
  it("rejects unknown tier keys", () => {
    expect(() => buildOrderLines(tiers, [{ tierKey: "nope", qty: 1 }])).toThrow("UNKNOWN_TIER");
  });
  it("rejects sold-out tiers", () => {
    expect(() => buildOrderLines(tiers, [{ tierKey: "gone", qty: 1 }])).toThrow("SOLD_OUT");
  });
  it("rejects qty < 1, > 10, or duplicate tiers", () => {
    expect(() => buildOrderLines(tiers, [{ tierKey: "ga", qty: 0 }])).toThrow("BAD_QTY");
    expect(() => buildOrderLines(tiers, [{ tierKey: "ga", qty: 11 }])).toThrow("BAD_QTY");
    expect(() =>
      buildOrderLines(tiers, [{ tierKey: "ga", qty: 1 }, { tierKey: "ga", qty: 1 }]),
    ).toThrow("DUPLICATE_TIER");
  });
  it("builds a free line for free events (no tiers defined)", () => {
    const lines = buildOrderLines([], [{ tierKey: "free", qty: 2 }], { freeEvent: true, capacity: 50 });
    expect(lines).toEqual([
      { tier_key: "free", tier_name: "Free entry", unit_price_kes: 0, qty: 2, capacity: 50 },
    ]);
  });
});

describe("computeTotals", () => {
  it("sums line totals in whole KES", () => {
    const lines = buildOrderLines(tiers, [
      { tierKey: "ga", qty: 2 },
      { tierKey: "vip", qty: 1 },
    ]);
    expect(computeTotals(lines, 500)).toEqual({
      subtotal_kes: 7000,
      total_kes: 7000,          // buyer pays face value; fee is deducted from host share
      platform_fee_kes: 350,    // 5% of 7000
      host_share_kes: 6650,
    });
  });
  it("zero fee on free orders regardless of bps", () => {
    const lines = buildOrderLines([], [{ tierKey: "free", qty: 3 }], { freeEvent: true, capacity: null });
    expect(computeTotals(lines, 500)).toEqual({
      subtotal_kes: 0, total_kes: 0, platform_fee_kes: 0, host_share_kes: 0,
    });
  });
  it("rounds fee down to whole KES", () => {
    const lines = buildOrderLines(tiers, [{ tierKey: "ga", qty: 1 }]); // 1000
    expect(computeTotals(lines, 333).platform_fee_kes).toBe(33); // floor(1000*333/10000)
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd apps/web && pnpm vitest run lib/tickets/__tests__/pricing.test.ts`
Expected: FAIL — cannot resolve `../pricing`.

- [ ] **Step 3: Implement**

```typescript
// apps/web/lib/tickets/pricing.ts
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
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `pnpm vitest run lib/tickets/__tests__/pricing.test.ts`
Expected: all PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/web/lib/tickets/pricing.ts apps/web/lib/tickets/__tests__/pricing.test.ts
git commit -m "feat(tickets): server-side pricing + fee math (TDD)"
```

---

### Task 3: Ticket codes + .ics builder (pure, TDD)

**Files:**
- Create: `apps/web/lib/tickets/codes.ts`, `apps/web/lib/tickets/ics.ts`
- Test: `apps/web/lib/tickets/__tests__/codes.test.ts`, `apps/web/lib/tickets/__tests__/ics.test.ts`

- [ ] **Step 1: Write the failing tests**

```typescript
// apps/web/lib/tickets/__tests__/codes.test.ts
import { describe, it, expect } from "vitest";
import { generateTicketCode, TICKET_CODE_RE } from "../codes";

describe("generateTicketCode", () => {
  it("produces 20-char Crockford-base32 codes", () => {
    const code = generateTicketCode();
    expect(code).toHaveLength(20);
    expect(code).toMatch(TICKET_CODE_RE);
  });
  it("never repeats across 10k draws", () => {
    const seen = new Set(Array.from({ length: 10_000 }, generateTicketCode));
    expect(seen.size).toBe(10_000);
  });
  it("excludes ambiguous chars I L O U", () => {
    for (let i = 0; i < 200; i++) expect(generateTicketCode()).not.toMatch(/[ILOU]/);
  });
});
```

```typescript
// apps/web/lib/tickets/__tests__/ics.test.ts
import { describe, it, expect } from "vitest";
import { buildEventIcs } from "../ics";

describe("buildEventIcs", () => {
  it("builds a valid VEVENT with escaped text", () => {
    const ics = buildEventIcs({
      uid: "tick-123@klickenya.com",
      title: "Beach Party; Watamu",
      start: new Date("2026-08-01T18:00:00+03:00"),
      end: null,
      location: "Ocean Bar, Watamu",
      url: "https://klickenya.com/t/ABC",
    });
    expect(ics).toContain("BEGIN:VCALENDAR");
    expect(ics).toContain("BEGIN:VEVENT");
    expect(ics).toContain("SUMMARY:Beach Party\\; Watamu");   // ; escaped
    expect(ics).toContain("DTSTART:20260801T150000Z");        // UTC conversion
    expect(ics).toContain("DTEND:20260801T180000Z");          // default +3h when no end
    expect(ics).toContain("URL:https://klickenya.com/t/ABC");
    expect(ics.endsWith("END:VCALENDAR\r\n")).toBe(true);
    expect(ics).not.toContain("\n\n");                        // CRLF line endings only
  });
});
```

- [ ] **Step 2: Run to verify both fail** — `pnpm vitest run lib/tickets/__tests__/` → FAIL (modules missing).

- [ ] **Step 3: Implement**

```typescript
// apps/web/lib/tickets/codes.ts
import crypto from "crypto";

// Crockford base32 minus ambiguous chars — safe to read aloud at a door.
const ALPHABET = "0123456789ABCDEFGHJKMNPQRSTVWXYZ";
export const TICKET_CODE_RE = /^[0-9ABCDEFGHJKMNPQRSTVWXYZ]{20}$/;

/** 20 chars * 5 bits = 100 bits of entropy — unguessable, DB-lookup validated. */
export function generateTicketCode(): string {
  const bytes = crypto.randomBytes(20);
  let out = "";
  for (let i = 0; i < 20; i++) out += ALPHABET[bytes[i] % 32];
  return out;
}
```

```typescript
// apps/web/lib/tickets/ics.ts
// Minimal RFC-5545 VEVENT builder — enough for "add to calendar" attachments.

function icsEscape(s: string): string {
  return s.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\n/g, "\\n");
}

function icsDate(d: Date): string {
  return d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z");
}

export function buildEventIcs(ev: {
  uid: string;
  title: string;
  start: Date;
  end: Date | null;
  location?: string | null;
  url?: string | null;
}): string {
  const end = ev.end ?? new Date(ev.start.getTime() + 3 * 3600 * 1000);
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Klickenya//Event Tickets//EN",
    "BEGIN:VEVENT",
    `UID:${ev.uid}`,
    `DTSTAMP:${icsDate(new Date(ev.start.getTime()))}`,
    `DTSTART:${icsDate(ev.start)}`,
    `DTEND:${icsDate(end)}`,
    `SUMMARY:${icsEscape(ev.title)}`,
    ...(ev.location ? [`LOCATION:${icsEscape(ev.location)}`] : []),
    ...(ev.url ? [`URL:${ev.url}`] : []),
    "END:VEVENT",
    "END:VCALENDAR",
  ];
  return lines.join("\r\n") + "\r\n";
}
```

- [ ] **Step 4: Run to verify all pass** — `pnpm vitest run lib/tickets/__tests__/` → PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/web/lib/tickets/codes.ts apps/web/lib/tickets/ics.ts apps/web/lib/tickets/__tests__/
git commit -m "feat(tickets): ticket code generator + ics builder (TDD)"
```

---

### Task 4: Payment provider abstraction + Paystack (TDD on verify/convert)

**Files:**
- Create: `apps/web/lib/payments/types.ts`, `apps/web/lib/payments/paystack.ts`, `apps/web/lib/payments/index.ts`
- Test: `apps/web/lib/payments/__tests__/paystack.test.ts`

- [ ] **Step 1: Write the failing tests** (signature verification + KES→subunit conversion are the two things that silently break payments if wrong)

```typescript
// apps/web/lib/payments/__tests__/paystack.test.ts
import { describe, it, expect } from "vitest";
import crypto from "crypto";
import { verifyPaystackSignature, kesToSubunits } from "../paystack";

describe("verifyPaystackSignature", () => {
  const secret = "sk_test_abc";
  const body = JSON.stringify({ event: "charge.success", data: { reference: "ord-1" } });
  const goodSig = crypto.createHmac("sha512", secret).update(body).digest("hex");

  it("accepts a valid HMAC-SHA512 signature", () => {
    expect(verifyPaystackSignature(body, goodSig, secret)).toBe(true);
  });
  it("rejects a tampered body", () => {
    expect(verifyPaystackSignature(body + "x", goodSig, secret)).toBe(false);
  });
  it("rejects a malformed signature without throwing", () => {
    expect(verifyPaystackSignature(body, "nothex", secret)).toBe(false);
    expect(verifyPaystackSignature(body, "", secret)).toBe(false);
  });
});

describe("kesToSubunits", () => {
  it("converts whole KES to *100 subunits", () => {
    expect(kesToSubunits(7000)).toBe(700000);
  });
  it("rejects non-integer or negative amounts", () => {
    expect(() => kesToSubunits(10.5)).toThrow();
    expect(() => kesToSubunits(-1)).toThrow();
  });
});
```

- [ ] **Step 2: Run to verify fail** — `pnpm vitest run lib/payments/__tests__/paystack.test.ts` → FAIL.

- [ ] **Step 3: Implement the provider layer**

```typescript
// apps/web/lib/payments/types.ts
// Provider-agnostic payment interface. Paystack is the first implementation;
// Daraja STK push slots in later as a second one without touching routes.

export type InitializeInput = {
  orderId: string;          // becomes the provider reference
  amountKes: number;        // whole KES, > 0
  email: string;
  callbackUrl: string;      // where the guest lands after paying
  metadata?: Record<string, string>;
};

export type InitializeResult = {
  checkoutUrl: string;      // redirect the guest here
  providerRef: string;
};

export interface PaymentProvider {
  readonly name: "paystack" | "daraja";
  initialize(input: InitializeInput): Promise<InitializeResult>;
  /** Server-to-server confirmation — used by the callback poller as a
   *  webhook fallback. Returns true only for a successful charge. */
  verifyTransaction(providerRef: string): Promise<boolean>;
}
```

```typescript
// apps/web/lib/payments/paystack.ts
import crypto from "crypto";
import type { PaymentProvider, InitializeInput, InitializeResult } from "./types";

const BASE = "https://api.paystack.co";

function secretKey(): string {
  const key = process.env.PAYSTACK_SECRET_KEY;
  if (!key) throw new Error("PAYSTACK_SECRET_KEY is not set");
  return key;
}

export function kesToSubunits(amountKes: number): number {
  if (!Number.isInteger(amountKes) || amountKes < 0) {
    throw new Error(`Invalid KES amount: ${amountKes}`);
  }
  return amountKes * 100;
}

/** Paystack signs webhook bodies with HMAC-SHA512 of the raw body using the
 *  secret key, sent in the x-paystack-signature header. */
export function verifyPaystackSignature(
  rawBody: string,
  signature: string,
  secret: string,
): boolean {
  if (!signature) return false;
  const expected = crypto.createHmac("sha512", secret).update(rawBody).digest("hex");
  const a = Buffer.from(expected, "hex");
  let b: Buffer;
  try {
    b = Buffer.from(signature, "hex");
  } catch {
    return false;
  }
  return a.length === b.length && a.length > 0 && crypto.timingSafeEqual(a, b);
}

export const paystackProvider: PaymentProvider = {
  name: "paystack",

  async initialize(input: InitializeInput): Promise<InitializeResult> {
    const res = await fetch(`${BASE}/transaction/initialize`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${secretKey()}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email: input.email,
        amount: kesToSubunits(input.amountKes),
        currency: "KES",
        reference: input.orderId,
        callback_url: input.callbackUrl,
        metadata: input.metadata ?? {},
        // Paystack Kenya surfaces M-Pesa + card automatically for KES.
      }),
    });
    const json = await res.json();
    if (!res.ok || !json?.status || !json?.data?.authorization_url) {
      throw new Error(`Paystack initialize failed: ${json?.message ?? res.status}`);
    }
    return { checkoutUrl: json.data.authorization_url, providerRef: input.orderId };
  },

  async verifyTransaction(providerRef: string): Promise<boolean> {
    const res = await fetch(
      `${BASE}/transaction/verify/${encodeURIComponent(providerRef)}`,
      { headers: { Authorization: `Bearer ${secretKey()}` } },
    );
    if (!res.ok) return false;
    const json = await res.json();
    return json?.status === true && json?.data?.status === "success";
  },
};
```

```typescript
// apps/web/lib/payments/index.ts
import type { PaymentProvider } from "./types";
import { paystackProvider } from "./paystack";

export function getPaymentProvider(name: "paystack" | "daraja" = "paystack"): PaymentProvider {
  if (name === "paystack") return paystackProvider;
  throw new Error(`Payment provider not implemented: ${name}`);
}
export type { PaymentProvider } from "./types";
```

- [ ] **Step 4: Run to verify pass** — `pnpm vitest run lib/payments/__tests__/paystack.test.ts` → PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/web/lib/payments/
git commit -m "feat(payments): provider abstraction + Paystack implementation (TDD on signature/amount)"
```

---

### Task 5: Ticket issuance + email (`lib/tickets/issue.ts`, `lib/tickets/email.ts`)

**Files:**
- Create: `apps/web/lib/tickets/issue.ts`, `apps/web/lib/tickets/email.ts`

This is the shared "an order became payable-complete" path used by BOTH the free checkout branch and the Paystack webhook. It must be idempotent (webhooks retry).

- [ ] **Step 1: Implement issuance**

```typescript
// apps/web/lib/tickets/issue.ts
// Issue tickets for a paid (or free) order. Idempotent: if tickets already
// exist for the order, returns them without re-issuing or re-emailing.
import { adminClient } from "@/lib/supabase/admin";
import { generateTicketCode } from "./codes";
import { sendTicketEmail } from "./email";
import type { OrderLine } from "./pricing";

export type TicketRow = {
  id: string;
  code: string;
  tier_key: string;
  tier_name: string;
  price_kes: number;
  status: string;
};

export async function issueTicketsForOrder(orderId: string): Promise<TicketRow[]> {
  const { data: order, error } = await adminClient
    .from("ticket_orders")
    .select("id, event_sanity_id, buyer_name, buyer_email, buyer_phone, user_id, lines, status")
    .eq("id", orderId)
    .single();
  if (error || !order) throw new Error(`Order not found: ${orderId}`);

  // Idempotency guard — webhook retries and callback-poller races both land here.
  const { data: existing } = await adminClient
    .from("tickets")
    .select("id, code, tier_key, tier_name, price_kes, status")
    .eq("order_id", orderId);
  if (existing && existing.length > 0) return existing as TicketRow[];

  const lines = order.lines as OrderLine[];
  const rows = lines.flatMap((line) =>
    Array.from({ length: line.qty }, () => ({
      order_id: order.id,
      event_sanity_id: order.event_sanity_id,
      tier_key: line.tier_key,
      tier_name: line.tier_name,
      price_kes: line.unit_price_kes,
      code: generateTicketCode(),
      attendee_name: order.buyer_name,
      attendee_email: order.buyer_email,
    })),
  );

  const { data: inserted, error: insErr } = await adminClient
    .from("tickets")
    .insert(rows)
    .select("id, code, tier_key, tier_name, price_kes, status");
  if (insErr || !inserted) throw new Error(`Ticket insert failed: ${insErr?.message}`);

  // Bridge into event_attendees so WhosJoining counts, host attendee CRM,
  // CSV export and the /profile Events tab keep working unchanged.
  const { data: attendee } = await adminClient
    .from("event_attendees")
    .select("id")
    .eq("event_sanity_id", order.event_sanity_id)
    .eq("email", order.buyer_email)
    .eq("status", "confirmed")
    .maybeSingle();
  if (!attendee) {
    await adminClient.from("event_attendees").insert({
      event_sanity_id: order.event_sanity_id,
      name: order.buyer_name,
      email: order.buyer_email,
      phone: order.buyer_phone,
      user_id: order.user_id,
      status: "confirmed",
    });
  }

  // Non-blocking email — a failed send must never fail issuance.
  try {
    await sendTicketEmail(order.event_sanity_id, order.buyer_name, order.buyer_email, inserted);
  } catch (e) {
    console.error("[tickets] email failed for order", orderId, e);
  }

  return inserted as TicketRow[];
}
```

- [ ] **Step 2: Implement the email (QR PNG + .ics attachments)**

```typescript
// apps/web/lib/tickets/email.ts
import { Resend } from "resend";
import QRCode from "qrcode";
import { sanityClient } from "@/lib/sanity/client";
import { buildEventIcs } from "./ics";
import type { TicketRow } from "./issue";

const resend = new Resend(process.env.RESEND_API_KEY);
const SITE = process.env.NEXT_PUBLIC_SITE_URL ?? "https://klickenya.com";

export async function sendTicketEmail(
  eventSanityId: string,
  name: string,
  email: string,
  tickets: TicketRow[],
) {
  const event = await sanityClient.fetch<{
    title: string; city: string | null; venue: string | null;
    venueAddress: string | null; eventDate: string | null; eventEndDate: string | null;
  } | null>(
    `*[_type == "listing" && _id == $id][0]{title, city, venue, venueAddress, eventDate, eventEndDate}`,
    { id: eventSanityId },
  );
  const title = event?.title ?? "Your event";

  const attachments: { filename: string; content: string }[] = [];
  for (const t of tickets) {
    const png = await QRCode.toBuffer(`${SITE}/t/${t.code}`, { width: 480, margin: 2 });
    attachments.push({ filename: `ticket-${t.code}.png`, content: png.toString("base64") });
  }
  if (event?.eventDate) {
    const ics = buildEventIcs({
      uid: `${tickets[0].id}@klickenya.com`,
      title,
      start: new Date(event.eventDate),
      end: event.eventEndDate ? new Date(event.eventEndDate) : null,
      location: [event.venue, event.venueAddress, event.city].filter(Boolean).join(", ") || null,
      url: `${SITE}/t/${tickets[0].code}`,
    });
    attachments.push({ filename: "event.ics", content: Buffer.from(ics).toString("base64") });
  }

  const ticketList = tickets
    .map(
      (t) => `<tr>
        <td style="padding:8px 12px;border-bottom:1px solid #eee">${t.tier_name}</td>
        <td style="padding:8px 12px;border-bottom:1px solid #eee;font-family:monospace">${t.code}</td>
        <td style="padding:8px 12px;border-bottom:1px solid #eee"><a href="${SITE}/t/${t.code}">View QR</a></td>
      </tr>`,
    )
    .join("");

  await resend.emails.send({
    from: "Klickenya <hello@klickenya.com>",
    to: email,
    subject: `Your ticket${tickets.length > 1 ? "s" : ""} — ${title}`,
    attachments,
    html: `
      <div style="font-family:sans-serif;max-width:560px;margin:0 auto">
        <h2 style="color:#16130C">You're going to ${title}! 🎟️</h2>
        <p>Hi ${name},</p>
        <p>Your ticket${tickets.length > 1 ? "s are" : " is"} attached as QR code${tickets.length > 1 ? "s" : ""}.
           Show the QR at the door — screenshots work fine.</p>
        <table style="border-collapse:collapse;width:100%">${ticketList}</table>
        <p style="margin-top:20px;color:#9C9485;font-size:13px">
          Keep this email — each QR admits one person and can only be scanned once.</p>
      </div>`,
  });
}
```

Note: `name` and `title` here come from our own DB/Sanity (buyer_name was validated at checkout with a strict zod max-length; see Task 6) — do not interpolate raw request input into this template from anywhere else.

- [ ] **Step 3: Typecheck** — `cd apps/web && npx tsc --noEmit` → clean.

- [ ] **Step 4: Commit**

```bash
git add apps/web/lib/tickets/issue.ts apps/web/lib/tickets/email.ts
git commit -m "feat(tickets): idempotent issuance + QR/.ics ticket email"
```

---

### Task 6: Checkout route (free + paid)

**Files:**
- Create: `apps/web/app/api/events/tickets/checkout/route.ts`

Design: server fetches tiers from Sanity (price authority), reserves inventory atomically, creates the order, then either issues immediately (free) or returns a Paystack checkout URL. Turnstile-gated like `/api/contact` (see `apps/web/app/api/contact/route.ts:183-199` for the existing verification helper pattern — reuse its approach).

- [ ] **Step 1: Implement the route**

```typescript
// apps/web/app/api/events/tickets/checkout/route.ts
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod/v4";
import { adminClient } from "@/lib/supabase/admin";
import { sanityClient } from "@/lib/sanity/client";
import { getPaymentProvider } from "@/lib/payments";
import { buildOrderLines, computeTotals, type SanityTier } from "@/lib/tickets/pricing";
import { issueTicketsForOrder } from "@/lib/tickets/issue";

const PENDING_TTL_MINUTES = 20;

const checkoutSchema = z.object({
  eventSanityId: z.string().min(5).max(120),
  name: z.string().trim().min(2).max(80),
  email: z.string().trim().toLowerCase().email().max(120),
  phone: z.string().trim().max(20).optional(),
  userId: z.string().uuid().optional(),
  tiers: z.array(z.object({ tierKey: z.string().max(60), qty: z.number().int() })).min(1).max(5),
  turnstileToken: z.string().min(1),
});

async function verifyTurnstile(token: string, ip: string | null): Promise<boolean> {
  const secret = process.env.TURNSTILE_SECRET_KEY;
  if (!secret) return true; // dev fallback, same behavior as /api/contact
  const res = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ secret, response: token, remoteip: ip ?? undefined }),
  });
  const json = await res.json();
  return json?.success === true;
}

export async function POST(req: NextRequest) {
  try {
    const parsed = checkoutSchema.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid request" }, { status: 400 });
    }
    const body = parsed.data;

    const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null;
    if (!(await verifyTurnstile(body.turnstileToken, ip))) {
      return NextResponse.json({ error: "Verification failed — please retry" }, { status: 403 });
    }

    // Server-side event + tier lookup: the ONLY price authority.
    const event = await sanityClient.fetch<{
      title: string; status: string | null; isFree: boolean | null;
      totalCapacity: number | null; eventDate: string | null;
      ticketTypes: SanityTier[] | null;
    } | null>(
      `*[_type == "listing" && _id == $id && type == "event"][0]{
        title, status, isFree, totalCapacity, eventDate,
        ticketTypes[]{_key, name, price, available, isSoldOut}
      }`,
      { id: body.eventSanityId },
    );
    if (!event || event.status !== "published") {
      return NextResponse.json({ error: "Event not found" }, { status: 404 });
    }
    if (event.eventDate && new Date(event.eventDate).getTime() < Date.now() - 24 * 3600 * 1000) {
      return NextResponse.json({ error: "This event has ended" }, { status: 410 });
    }

    let lines;
    try {
      lines = event.isFree
        ? buildOrderLines([], body.tiers, { freeEvent: true, capacity: event.totalCapacity ?? null })
        : buildOrderLines(event.ticketTypes ?? [], body.tiers);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "BAD_REQUEST";
      const friendly: Record<string, string> = {
        SOLD_OUT: "That ticket type is sold out",
        UNKNOWN_TIER: "Unknown ticket type",
        BAD_QTY: "Invalid quantity",
        DUPLICATE_TIER: "Duplicate ticket type",
      };
      return NextResponse.json({ error: friendly[msg] ?? "Invalid request" }, { status: 400 });
    }

    const feeBps = Number(process.env.PLATFORM_TICKET_FEE_BPS ?? 0);
    const totals = computeTotals(lines, feeBps);
    const isFreeOrder = totals.total_kes === 0;

    // Atomic capacity reservation — raises SOLD_OUT:<tier> on any full tier.
    const { error: reserveErr } = await adminClient.rpc("reserve_event_tickets", {
      p_event_sanity_id: body.eventSanityId,
      p_lines: lines.map((l) => ({ tier_key: l.tier_key, qty: l.qty, capacity: l.capacity })),
    });
    if (reserveErr) {
      if (reserveErr.message?.includes("SOLD_OUT")) {
        return NextResponse.json({ error: "Sold out — not enough tickets left" }, { status: 409 });
      }
      console.error("[checkout] reserve failed:", reserveErr);
      return NextResponse.json({ error: "Could not reserve tickets" }, { status: 500 });
    }

    const { data: order, error: orderErr } = await adminClient
      .from("ticket_orders")
      .insert({
        event_sanity_id: body.eventSanityId,
        buyer_name: body.name,
        buyer_email: body.email,
        buyer_phone: body.phone ?? null,
        user_id: body.userId ?? null,
        status: isFreeOrder ? "paid" : "pending",
        subtotal_kes: totals.subtotal_kes,
        total_kes: totals.total_kes,
        platform_fee_bps: isFreeOrder ? 0 : feeBps,
        lines,
        provider: isFreeOrder ? "free" : "paystack",
        paid_at: isFreeOrder ? new Date().toISOString() : null,
        expires_at: isFreeOrder
          ? null
          : new Date(Date.now() + PENDING_TTL_MINUTES * 60_000).toISOString(),
      })
      .select("id")
      .single();
    if (orderErr || !order) {
      // Roll the reservation back — the order row never existed.
      await adminClient.rpc("release_event_tickets", {
        p_event_sanity_id: body.eventSanityId,
        p_lines: lines.map((l) => ({ tier_key: l.tier_key, qty: l.qty })),
      });
      console.error("[checkout] order insert failed:", orderErr);
      return NextResponse.json({ error: "Could not create order" }, { status: 500 });
    }

    if (isFreeOrder) {
      const tickets = await issueTicketsForOrder(order.id);
      return NextResponse.json({
        orderId: order.id,
        status: "paid",
        tickets: tickets.map((t) => ({ code: t.code, tierName: t.tier_name })),
      });
    }

    const site = process.env.NEXT_PUBLIC_SITE_URL ?? "https://klickenya.com";
    const provider = getPaymentProvider("paystack");
    const init = await provider.initialize({
      orderId: order.id,
      amountKes: totals.total_kes,
      email: body.email,
      callbackUrl: `${site}/events/tickets/confirm?order=${order.id}`,
      metadata: { event_sanity_id: body.eventSanityId, event_title: event.title },
    });
    await adminClient
      .from("ticket_orders")
      .update({ provider_ref: init.providerRef })
      .eq("id", order.id);

    return NextResponse.json({ orderId: order.id, status: "pending", checkoutUrl: init.checkoutUrl });
  } catch (err) {
    console.error("[checkout] error:", err);
    return NextResponse.json({ error: "Checkout failed" }, { status: 500 });
  }
}
```

- [ ] **Step 2: Typecheck** — `npx tsc --noEmit` → clean.

- [ ] **Step 3: Manual smoke (free path) against local dev**

Run dev server, then:

```bash
curl -s -X POST http://localhost:3000/api/events/tickets/checkout \
  -H 'Content-Type: application/json' \
  -d '{"eventSanityId":"<a real free event _id>","name":"Test Guest","email":"test@example.com","tiers":[{"tierKey":"free","qty":1}],"turnstileToken":"dev"}'
```

Expected: `{"orderId":"...","status":"paid","tickets":[{"code":"...20 chars...","tierName":"Free entry"}]}` and rows in `ticket_orders`/`tickets`/`event_ticket_counters`, plus a bridged `event_attendees` row. (Requires migration 079 applied to the dev database and TURNSTILE_SECRET_KEY unset locally.)

- [ ] **Step 4: Commit**

```bash
git add apps/web/app/api/events/tickets/checkout/
git commit -m "feat(tickets): checkout route — server-priced, Turnstile-gated, atomic reservation, free + Paystack paths"
```

---

### Task 7: Paystack webhook + order status route + confirm page

**Files:**
- Create: `apps/web/app/api/webhooks/paystack/route.ts`
- Create: `apps/web/app/api/events/tickets/orders/[id]/route.ts`
- Create: `apps/web/app/events/tickets/confirm/page.tsx`

- [ ] **Step 1: Webhook route** (raw-body signature verification — do NOT parse before verifying; this is the audit's Resend-webhook mistake done right)

```typescript
// apps/web/app/api/webhooks/paystack/route.ts
import { NextRequest, NextResponse } from "next/server";
import { adminClient } from "@/lib/supabase/admin";
import { verifyPaystackSignature } from "@/lib/payments/paystack";
import { issueTicketsForOrder } from "@/lib/tickets/issue";

export async function POST(req: NextRequest) {
  const secret = process.env.PAYSTACK_SECRET_KEY;
  if (!secret) return NextResponse.json({ error: "Not configured" }, { status: 503 });

  const rawBody = await req.text();
  const signature = req.headers.get("x-paystack-signature") ?? "";
  if (!verifyPaystackSignature(rawBody, signature, secret)) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  let payload: { event?: string; data?: { reference?: string } };
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: "Bad payload" }, { status: 400 });
  }

  if (payload.event !== "charge.success" || !payload.data?.reference) {
    return NextResponse.json({ received: true }); // ack everything else
  }

  const orderId = payload.data.reference;
  // Idempotent flip: only a pending order transitions. Retries no-op here
  // and issueTicketsForOrder has its own existing-tickets guard.
  const { data: updated } = await adminClient
    .from("ticket_orders")
    .update({ status: "paid", paid_at: new Date().toISOString(), expires_at: null })
    .eq("id", orderId)
    .eq("status", "pending")
    .select("id")
    .maybeSingle();

  if (updated) {
    try {
      await issueTicketsForOrder(orderId);
    } catch (e) {
      // Return 500 so Paystack retries — the status flip is idempotent-safe.
      console.error("[paystack-webhook] issuance failed:", orderId, e);
      return NextResponse.json({ error: "Issuance failed" }, { status: 500 });
    }
  }
  return NextResponse.json({ received: true });
}
```

- [ ] **Step 2: Order status route** (polled by the confirm page; also verifies with Paystack directly as a webhook fallback so a delayed webhook can't strand a paying guest)

```typescript
// apps/web/app/api/events/tickets/orders/[id]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod/v4";
import { adminClient } from "@/lib/supabase/admin";
import { getPaymentProvider } from "@/lib/payments";
import { issueTicketsForOrder } from "@/lib/tickets/issue";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  if (!z.string().uuid().safeParse(id).success) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const { data: order } = await adminClient
    .from("ticket_orders")
    .select("id, status, provider, total_kes, event_sanity_id")
    .eq("id", id)
    .maybeSingle();
  if (!order) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Webhook fallback: if still pending, ask the provider directly.
  if (order.status === "pending" && order.provider === "paystack") {
    const paid = await getPaymentProvider("paystack").verifyTransaction(order.id);
    if (paid) {
      await adminClient
        .from("ticket_orders")
        .update({ status: "paid", paid_at: new Date().toISOString(), expires_at: null })
        .eq("id", order.id)
        .eq("status", "pending");
      order.status = "paid";
    }
  }

  if (order.status !== "paid") {
    return NextResponse.json({ status: order.status });
  }
  const tickets = await issueTicketsForOrder(order.id); // idempotent
  return NextResponse.json({
    status: "paid",
    totalKes: order.total_kes,
    tickets: tickets.map((t) => ({ code: t.code, tierName: t.tier_name })),
  });
}
```

- [ ] **Step 3: Confirm page** (Paystack redirects here; polls the status route)

```tsx
// apps/web/app/events/tickets/confirm/page.tsx
import { Suspense } from "react";
import ConfirmClient from "./ConfirmClient";

export const metadata = { title: "Confirming your tickets — Klickenya", robots: { index: false } };

export default function ConfirmPage() {
  return (
    <Suspense>
      <ConfirmClient />
    </Suspense>
  );
}
```

```tsx
// apps/web/app/events/tickets/confirm/ConfirmClient.tsx
"use client";
import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";

type TicketOut = { code: string; tierName: string };

export default function ConfirmClient() {
  const orderId = useSearchParams().get("order");
  const [state, setState] = useState<"polling" | "paid" | "failed">("polling");
  const [tickets, setTickets] = useState<TicketOut[]>([]);

  useEffect(() => {
    if (!orderId) { setState("failed"); return; }
    let tries = 0;
    const poll = async () => {
      tries++;
      try {
        const res = await fetch(`/api/events/tickets/orders/${orderId}`);
        const json = await res.json();
        if (json.status === "paid") {
          setTickets(json.tickets ?? []);
          setState("paid");
          return;
        }
        if (json.status === "expired" || json.status === "cancelled" || tries > 30) {
          setState("failed");
          return;
        }
      } catch { /* keep polling */ }
      setTimeout(poll, 2000);
    };
    poll();
  }, [orderId]);

  if (state === "polling") {
    return (
      <main className="mx-auto max-w-md px-4 py-24 text-center">
        <div className="mx-auto mb-6 h-10 w-10 animate-spin rounded-full border-4 border-amber-500 border-t-transparent" />
        <h1 className="text-xl font-bold">Confirming your payment…</h1>
        <p className="mt-2 text-sm text-neutral-500">This usually takes a few seconds. Don&apos;t close this page.</p>
      </main>
    );
  }
  if (state === "failed") {
    return (
      <main className="mx-auto max-w-md px-4 py-24 text-center">
        <h1 className="text-xl font-bold">We couldn&apos;t confirm this payment</h1>
        <p className="mt-2 text-sm text-neutral-500">
          If you were charged, your tickets will arrive by email shortly. Otherwise, please try again.
        </p>
        <Link href="/events" className="mt-6 inline-block rounded-lg bg-amber-500 px-6 py-3 font-semibold text-white">
          Back to events
        </Link>
      </main>
    );
  }
  return (
    <main className="mx-auto max-w-md px-4 py-16 text-center">
      <h1 className="text-2xl font-bold">You&apos;re in! 🎟️</h1>
      <p className="mt-2 text-sm text-neutral-500">
        {tickets.length} ticket{tickets.length !== 1 ? "s" : ""} issued — also sent to your email with QR codes.
      </p>
      <div className="mt-8 space-y-3">
        {tickets.map((t) => (
          <Link
            key={t.code}
            href={`/t/${t.code}`}
            className="block rounded-xl border border-neutral-200 p-4 text-left hover:border-amber-500"
          >
            <span className="font-semibold">{t.tierName}</span>
            <span className="ml-2 font-mono text-xs text-neutral-500">{t.code}</span>
            <span className="float-right text-amber-600 text-sm font-semibold">View QR →</span>
          </Link>
        ))}
      </div>
    </main>
  );
}
```

- [ ] **Step 4: Typecheck** — `npx tsc --noEmit` → clean.

- [ ] **Step 5: Commit**

```bash
git add apps/web/app/api/webhooks/paystack/ apps/web/app/api/events/tickets/orders/ apps/web/app/events/tickets/confirm/
git commit -m "feat(tickets): Paystack webhook (signed, idempotent), order polling w/ provider fallback, confirm page"
```

---

### Task 8: Public ticket page `/t/[code]`

**Files:**
- Create: `apps/web/app/t/[code]/page.tsx`
- Create: `apps/web/app/t/[code]/TicketQr.tsx`

- [ ] **Step 1: Implement the page** (server component fetches the ticket; QR rendered client-side with the already-installed `qrcode.react`)

```tsx
// apps/web/app/t/[code]/page.tsx
import { notFound } from "next/navigation";
import { adminClient } from "@/lib/supabase/admin";
import { sanityClient } from "@/lib/sanity/client";
import { TICKET_CODE_RE } from "@/lib/tickets/codes";
import TicketQr from "./TicketQr";

export const dynamic = "force-dynamic"; // status must always be live
export const metadata = { title: "Your ticket — Klickenya", robots: { index: false } };

export default async function TicketPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  if (!TICKET_CODE_RE.test(code)) notFound();

  const { data: ticket } = await adminClient
    .from("tickets")
    .select("code, tier_name, price_kes, status, attendee_name, event_sanity_id, checked_in_at")
    .eq("code", code)
    .maybeSingle();
  if (!ticket) notFound();

  const event = await sanityClient.fetch<{
    title: string; venue: string | null; city: string | null; eventDate: string | null;
  } | null>(
    `*[_type == "listing" && _id == $id][0]{title, venue, city, eventDate}`,
    { id: ticket.event_sanity_id },
  );

  const dateStr = event?.eventDate
    ? new Date(event.eventDate).toLocaleString("en-KE", {
        dateStyle: "full", timeStyle: "short", timeZone: "Africa/Nairobi",
      })
    : null;

  return (
    <main className="mx-auto max-w-sm px-4 py-10">
      <div className="overflow-hidden rounded-2xl border border-neutral-200 shadow-sm">
        <div className="bg-[#16130C] p-5 text-white">
          <p className="text-xs uppercase tracking-wide text-amber-400">Klickenya Ticket</p>
          <h1 className="mt-1 text-lg font-bold">{event?.title ?? "Event"}</h1>
          {dateStr && <p className="mt-1 text-sm text-neutral-300">{dateStr}</p>}
          {event?.venue && (
            <p className="text-sm text-neutral-300">{event.venue}{event.city ? `, ${event.city}` : ""}</p>
          )}
        </div>
        <div className="flex flex-col items-center gap-3 p-6">
          {ticket.status === "issued" && <TicketQr value={`${process.env.NEXT_PUBLIC_SITE_URL ?? "https://klickenya.com"}/t/${ticket.code}`} />}
          {ticket.status === "checked_in" && (
            <p className="rounded-lg bg-green-50 px-4 py-3 text-sm font-semibold text-green-700">
              ✓ Checked in{ticket.checked_in_at ? ` · ${new Date(ticket.checked_in_at).toLocaleTimeString("en-KE", { timeZone: "Africa/Nairobi" })}` : ""}
            </p>
          )}
          {ticket.status === "cancelled" && (
            <p className="rounded-lg bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">This ticket was cancelled</p>
          )}
          <p className="font-mono text-sm tracking-widest text-neutral-500">{ticket.code}</p>
          <div className="w-full border-t border-dashed pt-3 text-center">
            <p className="text-sm font-semibold">{ticket.tier_name}</p>
            <p className="text-xs text-neutral-500">{ticket.attendee_name}</p>
            {ticket.price_kes > 0 && <p className="text-xs text-neutral-500">KSh {ticket.price_kes.toLocaleString("en-KE")}</p>}
          </div>
        </div>
      </div>
      <p className="mt-4 text-center text-xs text-neutral-400">One scan per ticket. Screenshot-friendly.</p>
    </main>
  );
}
```

```tsx
// apps/web/app/t/[code]/TicketQr.tsx
"use client";
import { QRCodeSVG } from "qrcode.react";

export default function TicketQr({ value }: { value: string }) {
  return <QRCodeSVG value={value} size={220} marginSize={2} />;
}
```

- [ ] **Step 2: Typecheck + visual check** — `npx tsc --noEmit`; then with a ticket issued in Task 6's smoke test, open `http://localhost:3000/t/<code>` → dark header, QR, tier + name shown.

- [ ] **Step 3: Commit**

```bash
git add apps/web/app/t/
git commit -m "feat(tickets): public /t/[code] ticket page with live status + QR"
```

---

### Task 9: Scan validation route + host scanner page

**Files:**
- Create: `apps/web/app/api/dashboard/events/tickets/validate/route.ts`
- Create: `apps/web/app/dashboard/events/[id]/scan/page.tsx`
- Create: `apps/web/app/dashboard/events/[id]/scan/ScannerClient.tsx`

Auth model: mirror `apps/web/app/api/dashboard/events/attendees/remove/route.ts` — authenticated user must own the event (Sanity `hostId == user.id` OR an `events_pending` row with `host_user_id == user.id`). Read that file first and copy its ownership-check helper verbatim if one is exported; otherwise inline the same two checks.

- [ ] **Step 1: Validation route** (atomic check-in — the `WHERE status='issued'` guard is the double-scan defense)

```typescript
// apps/web/app/api/dashboard/events/tickets/validate/route.ts
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod/v4";
import { createClient } from "@/lib/supabase/server";
import { adminClient } from "@/lib/supabase/admin";
import { sanityClient } from "@/lib/sanity/client";
import { TICKET_CODE_RE } from "@/lib/tickets/codes";

const schema = z.object({
  eventSanityId: z.string().min(5).max(120),
  code: z.string().regex(TICKET_CODE_RE),
});

async function userOwnsEvent(userId: string, eventSanityId: string): Promise<boolean> {
  const hostId = await sanityClient.fetch<string | null>(
    `*[_type == "listing" && _id == $id][0].hostId`,
    { id: eventSanityId },
  );
  if (hostId === userId) return true;
  const { data } = await adminClient
    .from("events_pending")
    .select("id")
    .eq("sanity_id", eventSanityId)
    .eq("host_user_id", userId)
    .maybeSingle();
  return !!data;
}

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const parsed = schema.safeParse(await req.json());
    if (!parsed.success) return NextResponse.json({ error: "Invalid request" }, { status: 400 });
    const { eventSanityId, code } = parsed.data;

    if (!(await userOwnsEvent(user.id, eventSanityId))) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { data: ticket } = await adminClient
      .from("tickets")
      .select("id, event_sanity_id, tier_name, attendee_name, status, checked_in_at")
      .eq("code", code)
      .maybeSingle();

    if (!ticket) return NextResponse.json({ result: "invalid" });
    if (ticket.event_sanity_id !== eventSanityId) {
      return NextResponse.json({ result: "wrong_event", tierName: ticket.tier_name });
    }
    if (ticket.status === "cancelled") {
      return NextResponse.json({ result: "cancelled", attendeeName: ticket.attendee_name });
    }
    if (ticket.status === "checked_in") {
      return NextResponse.json({
        result: "already_used",
        attendeeName: ticket.attendee_name,
        checkedInAt: ticket.checked_in_at,
      });
    }

    // Atomic flip — a concurrent second scan loses the WHERE and reports already_used.
    const { data: flipped } = await adminClient
      .from("tickets")
      .update({ status: "checked_in", checked_in_at: new Date().toISOString(), checked_in_by: user.id })
      .eq("id", ticket.id)
      .eq("status", "issued")
      .select("id")
      .maybeSingle();
    if (!flipped) {
      return NextResponse.json({ result: "already_used", attendeeName: ticket.attendee_name });
    }

    const { count } = await adminClient
      .from("tickets")
      .select("id", { count: "exact", head: true })
      .eq("event_sanity_id", eventSanityId)
      .eq("status", "checked_in");

    return NextResponse.json({
      result: "valid",
      attendeeName: ticket.attendee_name,
      tierName: ticket.tier_name,
      checkedInCount: count ?? 1,
    });
  } catch (err) {
    console.error("[validate] error:", err);
    return NextResponse.json({ error: "Validation failed" }, { status: 500 });
  }
}
```

- [ ] **Step 2: Scanner page (server shell)**

```tsx
// apps/web/app/dashboard/events/[id]/scan/page.tsx
// [id] here is the Sanity event _id, same convention as the attendees page.
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { sanityClient } from "@/lib/sanity/client";
import ScannerClient from "./ScannerClient";

export const metadata = { title: "Scan tickets — Klickenya" };

export default async function ScanPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const event = await sanityClient.fetch<{ title: string } | null>(
    `*[_type == "listing" && _id == $id][0]{title}`,
    { id },
  );

  return <ScannerClient eventSanityId={id} eventTitle={event?.title ?? "Event"} />;
}
```

- [ ] **Step 3: Scanner client** (camera via `qr-scanner`, dynamic-imported — never in the route chunk; big color-coded result states readable in sunlight; manual code entry fallback for broken cameras)

```tsx
// apps/web/app/dashboard/events/[id]/scan/ScannerClient.tsx
"use client";
import { useEffect, useRef, useState } from "react";

type ScanResult =
  | { result: "valid"; attendeeName: string; tierName: string; checkedInCount: number }
  | { result: "already_used"; attendeeName?: string; checkedInAt?: string }
  | { result: "wrong_event"; tierName?: string }
  | { result: "cancelled"; attendeeName?: string }
  | { result: "invalid" };

const COLORS: Record<ScanResult["result"], string> = {
  valid: "bg-green-600",
  already_used: "bg-amber-600",
  wrong_event: "bg-orange-700",
  cancelled: "bg-red-700",
  invalid: "bg-red-700",
};
const LABELS: Record<ScanResult["result"], string> = {
  valid: "✓ VALID — LET IN",
  already_used: "⚠ ALREADY SCANNED",
  wrong_event: "✗ WRONG EVENT",
  cancelled: "✗ CANCELLED",
  invalid: "✗ NOT A VALID TICKET",
};

export default function ScannerClient({
  eventSanityId,
  eventTitle,
}: {
  eventSanityId: string;
  eventTitle: string;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const busyRef = useRef(false);
  const [last, setLast] = useState<ScanResult | null>(null);
  const [checkedIn, setCheckedIn] = useState<number | null>(null);
  const [manual, setManual] = useState("");
  const [cameraError, setCameraError] = useState(false);

  async function validate(code: string) {
    if (busyRef.current) return;
    busyRef.current = true;
    try {
      const res = await fetch("/api/dashboard/events/tickets/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ eventSanityId, code }),
      });
      if (!res.ok) { setLast({ result: "invalid" }); return; }
      const json = (await res.json()) as ScanResult;
      setLast(json);
      if (json.result === "valid") setCheckedIn(json.checkedInCount);
      if (navigator.vibrate) navigator.vibrate(json.result === "valid" ? 80 : [80, 60, 80]);
    } finally {
      // Hold the result on screen for 2s before accepting the next scan.
      setTimeout(() => { busyRef.current = false; }, 2000);
    }
  }

  useEffect(() => {
    let scanner: { stop: () => void; destroy: () => void } | null = null;
    (async () => {
      try {
        const { default: QrScanner } = await import("qr-scanner");
        if (!videoRef.current) return;
        scanner = new QrScanner(
          videoRef.current,
          (r: { data: string }) => {
            // QR encodes https://klickenya.com/t/<CODE> — take the last path segment.
            const code = r.data.split("/").pop()?.trim().toUpperCase() ?? "";
            if (code) validate(code);
          },
          { returnDetailedScanResult: true, highlightScanRegion: true },
        );
        await scanner.start();
      } catch {
        setCameraError(true);
      }
    })();
    return () => { scanner?.stop(); scanner?.destroy(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <main className="mx-auto max-w-md px-4 py-6">
      <h1 className="text-lg font-bold">{eventTitle}</h1>
      <p className="text-sm text-neutral-500">
        Ticket scanner{checkedIn != null ? ` · ${checkedIn} checked in` : ""}
      </p>

      {!cameraError ? (
        <div className="mt-4 overflow-hidden rounded-2xl bg-black">
          <video ref={videoRef} className="aspect-square w-full object-cover" />
        </div>
      ) : (
        <p className="mt-4 rounded-lg bg-neutral-100 p-4 text-sm">
          Camera unavailable — use manual entry below.
        </p>
      )}

      {last && (
        <div className={`mt-4 rounded-2xl p-5 text-center text-white ${COLORS[last.result]}`}>
          <p className="text-xl font-extrabold tracking-wide">{LABELS[last.result]}</p>
          {"attendeeName" in last && last.attendeeName && (
            <p className="mt-1 text-sm opacity-90">{last.attendeeName}</p>
          )}
          {last.result === "valid" && <p className="text-sm opacity-90">{last.tierName}</p>}
          {last.result === "already_used" && last.checkedInAt && (
            <p className="text-sm opacity-90">
              at {new Date(last.checkedInAt).toLocaleTimeString("en-KE", { timeZone: "Africa/Nairobi" })}
            </p>
          )}
        </div>
      )}

      <form
        className="mt-6 flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          if (manual.trim()) validate(manual.trim().toUpperCase());
          setManual("");
        }}
      >
        <input
          value={manual}
          onChange={(e) => setManual(e.target.value)}
          placeholder="Enter code manually"
          className="min-w-0 flex-1 rounded-lg border border-neutral-300 px-3 py-3 text-[16px] font-mono uppercase"
        />
        <button className="rounded-lg bg-[#16130C] px-4 py-3 font-semibold text-white">Check</button>
      </form>
    </main>
  );
}
```

(Note the input is `text-[16px]` — the project's iOS-zoom rule.)

- [ ] **Step 4: Typecheck + manual verification** — `npx tsc --noEmit`; then in the browser: issue a free ticket (Task 6 smoke), open the scan page while logged in as the event's host, scan the QR from `/t/<code>` on another screen → green VALID; scan again → amber ALREADY SCANNED; try a garbage code manually → red.

- [ ] **Step 5: Commit**

```bash
git add apps/web/app/api/dashboard/events/tickets/ "apps/web/app/dashboard/events/[id]/scan/"
git commit -m "feat(tickets): host scanner page + atomic validate route (ownership-checked)"
```

---

### Task 10: Guest purchase UI in EventDetail (desktop + mobile)

**Files:**
- Create: `apps/web/components/events/TicketPurchase.tsx`
- Modify: `apps/web/components/listings/detail/EventDetail.tsx`
- Modify: `apps/web/components/events/JoinEventModal.tsx`

Read `EventDetail.tsx` fully before editing (582 lines). Key integration points found in the audit: ticket tier list renders at lines ~305-355; the desktop-only aside is at ~462 (`hidden lg:block`); `WhosJoining` mounts at ~554; `MobileBookingBar` at ~566 renders only for paid events. Reuse the Turnstile widget pattern from `components/listings/detail/ContactForm.tsx` (`@marsidev/react-turnstile` is already a dependency).

- [ ] **Step 1: Build `TicketPurchase`**

```tsx
// apps/web/components/events/TicketPurchase.tsx
"use client";
import { useState } from "react";
import { Turnstile } from "@marsidev/react-turnstile";

type Tier = { _key: string; name: string; price: number; description?: string; isSoldOut?: boolean };

export function TicketPurchase({
  eventSanityId,
  isFree,
  tiers,
  userId,
  defaultName,
  defaultEmail,
}: {
  eventSanityId: string;
  isFree: boolean;
  tiers: Tier[];
  userId?: string;
  defaultName?: string;
  defaultEmail?: string;
}) {
  const effectiveTiers: Tier[] = isFree
    ? [{ _key: "free", name: "Free entry", price: 0 }]
    : tiers.filter((t) => !t.isSoldOut);
  const [qty, setQty] = useState<Record<string, number>>({});
  const [name, setName] = useState(defaultName ?? "");
  const [email, setEmail] = useState(defaultEmail ?? "");
  const [token, setToken] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [freeDone, setFreeDone] = useState<{ code: string }[] | null>(null);

  const selected = effectiveTiers
    .map((t) => ({ tierKey: t._key, qty: qty[t._key] ?? 0 }))
    .filter((l) => l.qty > 0);
  const total = effectiveTiers.reduce((s, t) => s + t.price * (qty[t._key] ?? 0), 0);

  async function submit() {
    setError(null);
    if (selected.length === 0) { setError("Pick at least one ticket"); return; }
    if (!name.trim() || !email.trim()) { setError("Name and email are required"); return; }
    setBusy(true);
    try {
      const res = await fetch("/api/events/tickets/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          eventSanityId, name, email, userId,
          tiers: selected,
          turnstileToken: token || "dev",
        }),
      });
      const json = await res.json();
      if (!res.ok) { setError(json.error ?? "Something went wrong"); return; }
      if (json.status === "paid") {
        setFreeDone(json.tickets);
      } else if (json.checkoutUrl) {
        window.location.href = json.checkoutUrl; // → Paystack (M-Pesa / card)
      }
    } catch {
      setError("Network error — please retry");
    } finally {
      setBusy(false);
    }
  }

  if (freeDone) {
    return (
      <div className="rounded-2xl border border-green-200 bg-green-50 p-5 text-center">
        <p className="font-bold text-green-800">You&apos;re in! 🎟️</p>
        <p className="mt-1 text-sm text-green-700">
          Ticket{freeDone.length > 1 ? "s" : ""} sent to your email with QR code{freeDone.length > 1 ? "s" : ""}.
        </p>
        <a href={`/t/${freeDone[0].code}`} className="mt-3 inline-block text-sm font-semibold text-green-800 underline">
          View your ticket →
        </a>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-neutral-200 p-5">
      <h3 className="font-bold">{isFree ? "Get your free ticket" : "Buy tickets"}</h3>
      <div className="mt-3 space-y-2">
        {effectiveTiers.map((t) => (
          <div key={t._key} className="flex items-center justify-between gap-3 rounded-lg border border-neutral-100 p-3">
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold">{t.name}</p>
              {t.description && <p className="truncate text-xs text-neutral-500">{t.description}</p>}
              <p className="text-sm text-amber-600 font-semibold">
                {t.price > 0 ? `KSh ${t.price.toLocaleString("en-KE")}` : "Free"}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button type="button" aria-label={`Fewer ${t.name}`}
                onClick={() => setQty((q) => ({ ...q, [t._key]: Math.max(0, (q[t._key] ?? 0) - 1) }))}
                className="h-9 w-9 rounded-full border text-lg leading-none">−</button>
              <span className="w-5 text-center text-sm font-semibold">{qty[t._key] ?? 0}</span>
              <button type="button" aria-label={`More ${t.name}`}
                onClick={() => setQty((q) => ({ ...q, [t._key]: Math.min(10, (q[t._key] ?? 0) + 1) }))}
                className="h-9 w-9 rounded-full border text-lg leading-none">+</button>
            </div>
          </div>
        ))}
      </div>
      <div className="mt-3 space-y-2">
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Your name"
          className="w-full rounded-lg border border-neutral-300 px-3 py-3 text-[16px]" />
        <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email" type="email"
          className="w-full rounded-lg border border-neutral-300 px-3 py-3 text-[16px]" />
      </div>
      {process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY && (
        <Turnstile
          siteKey={process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY}
          onSuccess={setToken}
          options={{ size: "invisible" }}
        />
      )}
      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
      <button
        onClick={submit}
        disabled={busy}
        className="mt-4 w-full rounded-xl bg-amber-500 py-3.5 font-bold text-white disabled:opacity-50"
      >
        {busy ? "One moment…" : isFree ? "Get free ticket" : `Pay KSh ${total.toLocaleString("en-KE")} — M-Pesa / Card`}
      </button>
      {!isFree && (
        <p className="mt-2 text-center text-xs text-neutral-400">
          Secure payment via Paystack. Tickets arrive by email instantly.
        </p>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Mount it in `EventDetail.tsx`**

Three edits (exact anchors from the audit):
1. In the desktop aside (the `hidden lg:block` block near line 462), render `<TicketPurchase eventSanityId={listing._id} isFree={isFree} tiers={ticketTypes} />` ABOVE `WhosJoining`, replacing the external-`ticketLink` CTA as primary (keep `ticketLink` as a secondary "or buy on external site" link below it when set).
2. Below the existing static tier list section (~line 355), add a mobile-only mount: `<div className="lg:hidden mt-6"><TicketPurchase ... /></div>` — this is the audit's missing-mobile-CTA fix; it must render for BOTH free and paid events.
3. Leave `MobileBookingBar` as-is but change its CTA to scroll to the mobile TicketPurchase (`href="#tickets"`, add `id="tickets"` to the mobile mount div) instead of opening the enquiry flow.

- [ ] **Step 3: Point `JoinEventModal` at the unified flow**

`components/events/JoinEventModal.tsx` currently POSTs to `/api/events/join`. Change its submit handler to POST to `/api/events/tickets/checkout` with `tiers: [{ tierKey: "free", qty: 1 }]` and `turnstileToken: "dev"` fallback, and treat `{status:"paid"}` as success (show the existing success state plus a "View your ticket" link to `/t/${json.tickets[0].code}`). Keep the component's props/UI otherwise unchanged so `WhosJoining` keeps working.

- [ ] **Step 4: Verify in browser** — dev server: free event on mobile viewport (375px) shows the ticket panel (previously nothing); paid event shows tier steppers and the Pay button; free purchase end-to-end issues a ticket and shows the link.

- [ ] **Step 5: Commit**

```bash
git add apps/web/components/events/TicketPurchase.tsx apps/web/components/events/JoinEventModal.tsx apps/web/components/listings/detail/EventDetail.tsx
git commit -m "feat(tickets): purchase UI in EventDetail — desktop + mobile (fixes missing mobile CTA), unified free flow"
```

---

### Task 11: Host tickets dashboard + expiry cron + nav

**Files:**
- Create: `apps/web/app/dashboard/events/[id]/tickets/page.tsx`
- Create: `apps/web/app/api/cron/expire-ticket-orders/route.ts`
- Modify: `apps/web/app/dashboard/events/page.tsx`
- Modify: `vercel.json`

- [ ] **Step 1: Host tickets page** (server component; mirror the auth/ownership pattern of `apps/web/app/dashboard/events/[id]/attendees/page.tsx` — read it first and copy its guard structure)

```tsx
// apps/web/app/dashboard/events/[id]/tickets/page.tsx
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { adminClient } from "@/lib/supabase/admin";
import { sanityClient } from "@/lib/sanity/client";

export const metadata = { title: "Ticket sales — Klickenya" };

export default async function TicketsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const event = await sanityClient.fetch<{ title: string; hostId: string | null } | null>(
    `*[_type == "listing" && _id == $id][0]{title, hostId}`,
    { id },
  );
  const { data: pending } = await adminClient
    .from("events_pending").select("id").eq("sanity_id", id).eq("host_user_id", user.id).maybeSingle();
  if (!event || (event.hostId !== user.id && !pending)) notFound();

  const [{ data: orders }, { data: tickets }] = await Promise.all([
    adminClient
      .from("ticket_orders")
      .select("id, status, total_kes, platform_fee_bps, buyer_name, buyer_email, created_at, lines")
      .eq("event_sanity_id", id)
      .order("created_at", { ascending: false })
      .limit(500),
    adminClient
      .from("tickets")
      .select("id, tier_name, attendee_name, attendee_email, status, price_kes, checked_in_at, code")
      .eq("event_sanity_id", id)
      .order("created_at", { ascending: false })
      .limit(1000),
  ]);

  const paid = (orders ?? []).filter((o) => o.status === "paid");
  const gross = paid.reduce((s, o) => s + o.total_kes, 0);
  const fees = paid.reduce((s, o) => s + Math.floor((o.total_kes * o.platform_fee_bps) / 10_000), 0);
  const issued = (tickets ?? []).filter((t) => t.status !== "cancelled");
  const checkedIn = issued.filter((t) => t.status === "checked_in").length;

  return (
    <main className="mx-auto max-w-3xl px-4 py-8">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold">{event.title}</h1>
          <p className="text-sm text-neutral-500">Ticket sales &amp; check-ins</p>
        </div>
        <Link href={`/dashboard/events/${id}/scan`}
          className="rounded-lg bg-[#16130C] px-4 py-2.5 text-sm font-semibold text-white">
          📷 Scan tickets
        </Link>
      </div>

      <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          ["Tickets sold", String(issued.length)],
          ["Checked in", `${checkedIn}/${issued.length}`],
          ["Gross (KSh)", gross.toLocaleString("en-KE")],
          ["Your payout (KSh)", (gross - fees).toLocaleString("en-KE")],
        ].map(([label, value]) => (
          <div key={label} className="rounded-xl border border-neutral-200 p-4">
            <p className="text-xs text-neutral-500">{label}</p>
            <p className="mt-1 text-lg font-bold">{value}</p>
          </div>
        ))}
      </div>
      {fees > 0 && (
        <p className="mt-2 text-xs text-neutral-400">
          Payout = gross − KSh {fees.toLocaleString("en-KE")} platform fee. Paid out manually after the event.
        </p>
      )}

      <h2 className="mt-8 font-bold">Tickets</h2>
      <div className="mt-3 divide-y divide-neutral-100 rounded-xl border border-neutral-200">
        {issued.length === 0 && <p className="p-4 text-sm text-neutral-500">No tickets yet.</p>}
        {issued.map((t) => (
          <div key={t.id} className="flex items-center justify-between gap-3 p-3 text-sm">
            <div className="min-w-0">
              <p className="truncate font-semibold">{t.attendee_name}</p>
              <p className="truncate text-xs text-neutral-500">{t.tier_name} · {t.attendee_email}</p>
            </div>
            <span className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold ${
              t.status === "checked_in" ? "bg-green-100 text-green-700" : "bg-neutral-100 text-neutral-600"
            }`}>
              {t.status === "checked_in" ? "Checked in" : "Issued"}
            </span>
          </div>
        ))}
      </div>
    </main>
  );
}
```

- [ ] **Step 2: Expiry cron** (releases reserved inventory for abandoned Paystack checkouts)

```typescript
// apps/web/app/api/cron/expire-ticket-orders/route.ts
import { NextRequest, NextResponse } from "next/server";
import { adminClient } from "@/lib/supabase/admin";
import type { OrderLine } from "@/lib/tickets/pricing";

export async function GET(req: NextRequest) {
  if (req.headers.get("authorization") !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: stale } = await adminClient
    .from("ticket_orders")
    .select("id, event_sanity_id, lines")
    .eq("status", "pending")
    .lt("expires_at", new Date().toISOString())
    .limit(200);

  let expired = 0;
  for (const order of stale ?? []) {
    // Flip first (idempotent guard vs a late webhook), then release seats.
    const { data: flipped } = await adminClient
      .from("ticket_orders")
      .update({ status: "expired" })
      .eq("id", order.id)
      .eq("status", "pending")
      .select("id")
      .maybeSingle();
    if (!flipped) continue;
    const lines = order.lines as OrderLine[];
    await adminClient.rpc("release_event_tickets", {
      p_event_sanity_id: order.event_sanity_id,
      p_lines: lines.map((l) => ({ tier_key: l.tier_key, qty: l.qty })),
    });
    expired++;
  }
  return NextResponse.json({ expired });
}
```

Add to `vercel.json` crons array (runs every 10 minutes):

```json
{ "path": "/api/cron/expire-ticket-orders", "schedule": "*/10 * * * *" }
```

While editing `vercel.json`: DELETE the dead `/api/cron/backfill-embeddings` entry (audit finding — the route doesn't exist and 404s nightly).

- [ ] **Step 3: Wire nav + fix the audit's `listingType` bug**

In `apps/web/app/dashboard/events/page.tsx`:
1. Line ~49: change the GROQ filter `listingType == "event"` → `type == "event"` (audit P1: the current filter matches nothing, so approved events lose slugs/dates/thumbnails).
2. On each approved event row (next to the existing Attendees link), add: `Tickets` → `/dashboard/events/${sanityId}/tickets` and `Scan` → `/dashboard/events/${sanityId}/scan`.

- [ ] **Step 4: Typecheck + verify** — `npx tsc --noEmit` clean; dashboard events list now shows dates/thumbnails (the one-word fix) plus Tickets/Scan links; tickets page shows the free ticket from earlier smokes; cron route returns `{expired:0}` with the right Bearer header and 401 without.

- [ ] **Step 5: Commit**

```bash
git add "apps/web/app/dashboard/events/[id]/tickets/" apps/web/app/api/cron/expire-ticket-orders/ apps/web/app/dashboard/events/page.tsx vercel.json
git commit -m "feat(tickets): host sales/ledger page, expiry cron, nav links; fix listingType filter bug + dead cron"
```

---### Task 12: Retire the legacy join route + docs

**Files:**
- Delete: `apps/web/app/api/events/join/route.ts`
- Modify: `.env.example`, `CLAUDE.md`

- [ ] **Step 1: Confirm nothing references the old route anymore**

Run: `grep -rn "api/events/join" apps/web --include='*.ts' --include='*.tsx'`
Expected: zero hits outside the route file itself (JoinEventModal was migrated in Task 10). If any remain, migrate them the same way before deleting.

- [ ] **Step 2: Delete the route**

```bash
git rm apps/web/app/api/events/join/route.ts
```

- [ ] **Step 3: Update `.env.example`** — add:

```
PAYSTACK_SECRET_KEY=          # Paystack secret key (sk_live_/sk_test_) — ticket payments
PLATFORM_TICKET_FEE_BPS=500   # platform fee on paid tickets in basis points (500 = 5%)
```

- [ ] **Step 4: Update `CLAUDE.md`** — in the live-features list add: "Event ticketing: Paystack checkout (M-Pesa/card), unified free+paid QR tickets, door scanner at /dashboard/events/[id]/scan, ledger + manual payouts (migration 079)". Update migration counter to "Next: 080". Add both env vars to the env table. Remove "backfill-embeddings" if mentioned; note the join route was replaced by /api/events/tickets/checkout.

- [ ] **Step 5: Full verification pass**

```bash
cd apps/web && pnpm vitest run && npx tsc --noEmit && cd .. && pnpm lint
```
Expected: all tests pass, typecheck clean, lint clean.

- [ ] **Step 6: Commit + PR**

```bash
git add -A
git commit -m "feat(tickets): retire legacy join route; env + CLAUDE.md docs"
git push -u origin feat/event-ticketing
gh pr create --base dev --title "feat: event ticketing — Paystack payments, QR tickets, door scanner" --body "..."
```

PR body should list: what's new (checkout/webhook/scanner/ledger/cron), the bundled audit fixes (mobile CTA, capacity, attendee RLS, listingType filter, dead cron, typecheck script), env vars to set BEFORE merging to main (`PAYSTACK_SECRET_KEY`, `PLATFORM_TICKET_FEE_BPS`), and the Paystack dashboard step: set the webhook URL to `https://klickenya.com/api/webhooks/paystack` (and the dev-preview URL for staging testing).

---

## Deployment checklist (outside the code, do before prod promotion)

1. Apply migration 079 to the Supabase project (normal migration path).
2. Create/confirm the Klickenya Paystack account; grab `sk_live_...`; add `PAYSTACK_SECRET_KEY` + `PLATFORM_TICKET_FEE_BPS` to Vercel env (production + preview with test key `sk_test_...`).
3. In the Paystack dashboard → Settings → Webhooks: set `https://klickenya.com/api/webhooks/paystack`.
4. Test on the dev preview URL with `sk_test_` keys and Paystack's test M-Pesa flow before promoting dev → main (per CLAUDE.md branch rules).
5. After first real sales: manual payout workflow = host tickets page shows "Your payout"; pay via M-Pesa/bank and keep records (V1 is manual by design).

## Self-review notes

- **Spec coverage:** payments (Tasks 4,6,7) ✓ · QR issuance (3,5,8) ✓ · scan validation (9) ✓ · unified free flow (6,10,12) ✓ · provider abstraction for Daraja (4) ✓ · ledger/manual payouts (1,11) ✓ · capacity + abuse fixes (1,6) ✓.
- **Type consistency:** `OrderLine` (pricing.ts) is the shape stored in `ticket_orders.lines` and read back in issue.ts + cron ✓ · `TicketRow` shared issue.ts → email.ts ✓ · `TICKET_CODE_RE` shared codes.ts → /t page + validate route ✓ · tier `_key` flows Sanity → checkout → counters → tickets ✓.
- **Known simplification accepted:** attendee bridge stores tickets under the buyer's name (no per-ticket attendee names in V1 — matches how local events actually run; per-ticket names can be added later on the `tickets` table which already has the columns).
