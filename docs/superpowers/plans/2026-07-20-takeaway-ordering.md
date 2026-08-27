# Takeaway Ordering Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Guests order food for pickup from `/m/[slug]` (name + phone, no table); the restaurant accepts (with ready time) or declines from the kitchen dashboard; the guest follows a live polling status page. No emails.

**Architecture:** Reuse the existing dine-in order pipeline (`orders` + `order_items`, station-status-driven kitchen board, DB triggers for stock deduction on `preparing` and reversal on `cancelled`). Takeaway = `order_type='takeaway'`, no table, no session. Status `new` doubles as "awaiting acceptance" for takeaway; Accept = order-level PATCH to `preparing` (stamps `accepted_at`/`estimated_ready_at`, cascades items); Decline = existing cancel path + `decline_reason`.

**Tech Stack:** Next.js 15 App Router, Supabase (adminClient/PostgREST), zod v4, vitest, Tailwind. No new deps.

**Spec:** `docs/superpowers/specs/2026-07-20-takeaway-ordering-design.md`
**Branch:** `feat/takeaway-ordering` (already created from dev)

**Conventions that apply everywhere:**
- All inputs min 16px font-size (`text-[16px]`) — iOS Safari zoom prevention.
- Times displayed via `Intl.DateTimeFormat` with `timeZone: "Africa/Nairobi"`. Never `Date.getDay()` / manual offsets.
- Dynamic API route params are `ctx: { params: Promise<{ id: string }> }` then `const { id } = await ctx.params;` (Next 15 — copy from `apps/web/app/api/menu/sessions/[id]/route.ts`).
- Run commands from `apps/web/`: tests = `npx vitest run <file>`, typecheck/build = `npx next build` (or `npx tsc --noEmit` for speed).

---

### Task 1: Migration 083

**Files:**
- Create: `supabase/migrations/083_takeaway_orders.sql`

- [ ] **Step 1: Write the migration**

```sql
-- 083_takeaway_orders.sql
-- Takeaway ordering V1: accept-first flow columns on orders.
-- order_type='takeaway' + menus.takeaway_enabled already exist (028/043) — dormant until now.

alter table orders add column if not exists accepted_at        timestamptz;  -- ACTIVE V1: set when restaurant accepts a takeaway order
alter table orders add column if not exists estimated_ready_at timestamptz;  -- ACTIVE V1: promised pickup time (accept + N minutes)
alter table orders add column if not exists decline_reason     text;         -- ACTIVE V1: shown to the guest on the status page when declined
```

- [ ] **Step 2: Apply to Supabase**

The user applies migrations via the Supabase dashboard SQL editor (this environment has no direct DB access). Flag it in the final report: "Migration 083 must be applied before testing on the dev preview." Do NOT block on it — code merges safely because all three columns are only read/written on the new takeaway paths.

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/083_takeaway_orders.sql
git commit -m "feat(takeaway): migration 083 — accepted_at, estimated_ready_at, decline_reason on orders"
```

---

### Task 2: Phone normalization helper (TDD)

**Files:**
- Create: `apps/web/lib/orders/phone.ts`
- Test: `apps/web/lib/orders/__tests__/phone.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
import { describe, it, expect } from "vitest";
import { normalizeKenyanPhone } from "../phone";

describe("normalizeKenyanPhone", () => {
  it("accepts 07XX local format and normalizes to +254", () => {
    expect(normalizeKenyanPhone("0712345678")).toBe("+254712345678");
  });
  it("accepts 01XX local format (Airtel/Telkom ranges)", () => {
    expect(normalizeKenyanPhone("0112345678")).toBe("+254112345678");
  });
  it("accepts +254 international format as-is", () => {
    expect(normalizeKenyanPhone("+254712345678")).toBe("+254712345678");
  });
  it("accepts 254 without plus and adds it", () => {
    expect(normalizeKenyanPhone("254712345678")).toBe("+254712345678");
  });
  it("strips spaces, dashes and parentheses", () => {
    expect(normalizeKenyanPhone("0712 345-678")).toBe("+254712345678");
  });
  it("passes through non-Kenyan international numbers", () => {
    expect(normalizeKenyanPhone("+393331234567")).toBe("+393331234567");
  });
  it("rejects garbage", () => {
    expect(normalizeKenyanPhone("hello")).toBeNull();
    expect(normalizeKenyanPhone("071234")).toBeNull();   // too short
    expect(normalizeKenyanPhone("")).toBeNull();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd apps/web && npx vitest run lib/orders/__tests__/phone.test.ts`
Expected: FAIL — "Cannot find module '../phone'"

- [ ] **Step 3: Write the implementation**

```ts
/**
 * Normalize a Kenyan mobile number to +254XXXXXXXXX.
 * Accepts 07XX/01XX local, 254…, +254…, and generic +international.
 * Returns null when the input can't be a valid phone number.
 */
export function normalizeKenyanPhone(raw: string): string | null {
  const cleaned = raw.replace(/[\s\-()]/g, "");
  if (/^\+254[17]\d{8}$/.test(cleaned)) return cleaned;
  if (/^254[17]\d{8}$/.test(cleaned)) return `+${cleaned}`;
  if (/^0[17]\d{8}$/.test(cleaned)) return `+254${cleaned.slice(1)}`;
  // Non-Kenyan guests (tourists) — same rule reservations use: + then 7–15 digits.
  if (/^\+\d{7,15}$/.test(cleaned)) return cleaned;
  return null;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd apps/web && npx vitest run lib/orders/__tests__/phone.test.ts`
Expected: PASS (7 tests)

- [ ] **Step 5: Commit**

```bash
git add apps/web/lib/orders/phone.ts apps/web/lib/orders/__tests__/phone.test.ts
git commit -m "feat(takeaway): Kenyan phone normalization helper"
```

---

### Task 3: wa.me pickup-link helper (TDD)

**Files:**
- Create: `apps/web/lib/orders/takeaway.ts`
- Test: `apps/web/lib/orders/__tests__/takeaway.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
import { describe, it, expect } from "vitest";
import { pickupWaMeLink } from "../takeaway";

describe("pickupWaMeLink", () => {
  it("builds a wa.me link with digits-only phone and encoded message", () => {
    const url = pickupWaMeLink("+254712345678", "Alice", "AB12CD34");
    expect(url.startsWith("https://wa.me/254712345678?text=")).toBe(true);
    const text = decodeURIComponent(url.split("?text=")[1]);
    expect(text).toBe("Hi Alice, your order #AB12CD34 is ready for pickup!");
  });
  it("omits the name gracefully when null", () => {
    const url = pickupWaMeLink("+254712345678", null, "AB12CD34");
    const text = decodeURIComponent(url.split("?text=")[1]);
    expect(text).toBe("Hi, your order #AB12CD34 is ready for pickup!");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd apps/web && npx vitest run lib/orders/__tests__/takeaway.test.ts`
Expected: FAIL — "Cannot find module '../takeaway'"

- [ ] **Step 3: Write the implementation**

```ts
/**
 * Manual WhatsApp fallback for takeaway pickup notifications — same pattern
 * as reservation wa.me links. The owner taps this; nothing is sent automatically.
 */
export function pickupWaMeLink(
  phone: string,
  name: string | null,
  shortId: string,
): string {
  const digits = phone.replace(/\D/g, "");
  const greeting = name ? `Hi ${name}, ` : "Hi, ";
  const text = `${greeting}your order #${shortId} is ready for pickup!`;
  return `https://wa.me/${digits}?text=${encodeURIComponent(text)}`;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd apps/web && npx vitest run lib/orders/__tests__/takeaway.test.ts`
Expected: PASS (2 tests)

- [ ] **Step 5: Commit**

```bash
git add apps/web/lib/orders/takeaway.ts apps/web/lib/orders/__tests__/takeaway.test.ts
git commit -m "feat(takeaway): wa.me pickup link helper"
```

---

### Task 4: `POST /api/orders` — takeaway path

**Files:**
- Modify: `apps/web/app/api/orders/route.ts`

- [ ] **Step 1: Update the zod schema (lines 30–47)**

`table_number` becomes optional (enforced per-type in the handler); add `order_type` and `customer_phone`:

```ts
const orderSchema = z.object({
  menu_id:        z.string().uuid(),
  order_type:     z.enum(["dine_in", "takeaway"]).default("dine_in"),
  table_number:   z.string().min(1).max(20).optional(),
  table_id:       z.string().uuid().optional(), // registered table (optional)
  customer_name:  z.string().max(100).optional(),
  customer_phone: z.string().max(30).optional(),
  order_note:     z.string().max(500).optional(),
  items: z
    .array(
      z.object({
        menu_item_id:     z.string().uuid(),
        quantity:         z.number().int().min(1).max(99),
        selected_options: z.array(selectedOptionSchema).max(30).optional().default([]),
        allergy_notes:    z.string().max(500).optional(),
      })
    )
    .min(1)
    .max(50),
});
```

Add the import at the top:

```ts
import { normalizeKenyanPhone } from "@/lib/orders/phone";
```

- [ ] **Step 2: Replace STEP 1 validation (lines 56–72)**

Add `takeaway_enabled` to the menu select and branch the gate by order type. Declare `normalizedPhone` in the handler scope so STEP 8 can use it:

```ts
    /* STEP 1 — Verify menu exists and the requested ordering mode is enabled */
    const { data: menu } = await adminClient
      .from("menus")
      .select("id, table_ordering, takeaway_enabled, is_published, default_service_charge_pct")
      .eq("id", data.menu_id)
      .single();

    if (!menu) {
      return NextResponse.json({ error: "Menu not found." }, { status: 404 });
    }

    let normalizedPhone: string | null = null;

    if (data.order_type === "takeaway") {
      if (!menu.takeaway_enabled) {
        return NextResponse.json(
          { error: "Takeaway ordering is not enabled for this menu." },
          { status: 400 }
        );
      }
      if (!data.customer_name?.trim()) {
        return NextResponse.json(
          { error: "Please enter your name." },
          { status: 400 }
        );
      }
      normalizedPhone = normalizeKenyanPhone(data.customer_phone ?? "");
      if (!normalizedPhone) {
        return NextResponse.json(
          { error: "Enter a valid phone number (e.g. 0712 345 678 or +254712345678)." },
          { status: 400 }
        );
      }
    } else {
      if (!menu.table_ordering) {
        return NextResponse.json(
          { error: "Table ordering is not enabled for this menu." },
          { status: 400 }
        );
      }
      if (!data.table_number) {
        return NextResponse.json(
          { error: "Please enter your table number." },
          { status: 400 }
        );
      }
    }
```

- [ ] **Step 3: Skip table resolution + session attach for takeaway**

The existing table-resolution block (around lines 220–260, starts with the comment about resolving `table_id`/`table_number`) and the session block (STEP 7.5) must only run for dine-in. Wrap the table-resolution block:

```ts
    let resolvedTableId: string | null = null;
    let tableDisplayNumber: string | null = data.table_number ?? null;

    if (data.order_type === "dine_in") {
      // ... existing table lookup code, unchanged, assigning resolvedTableId
      //     and tableDisplayNumber exactly as it does today ...
    }
```

Note: the file already declares these two variables inside that block's scope today — lift the declarations out as shown and delete the originals so both branches compile. STEP 7.5 already guards on `if (resolvedTableId)`, which stays null for takeaway — no change needed there, but confirm the `TODO V3: handle tableless orders (takeaway?)` comment gets updated:

```ts
    /* STEP 7.5 — Attach to (or auto-create) a table session.
       ...existing comment...
       Takeaway orders (order_type='takeaway') are intentionally session-less. */
```

- [ ] **Step 4: Update STEP 8 insert (around line 330)**

```ts
      .insert({
        menu_id:          data.menu_id,
        order_type:       data.order_type,
        status:           "new",
        table_number:     data.order_type === "takeaway" ? null : tableDisplayNumber,
        table_id:         resolvedTableId,
        table_session_id: sessionId,
        customer_name:    data.customer_name ?? null,
        customer_phone:   normalizedPhone,
        notes:            sanitizeNotes(data.order_note),
        subtotal_kes:     subtotal,
        delivery_fee_kes: 0,
        total_kes:        total,
        payment_status:   "pending",
      })
```

- [ ] **Step 5: Add `order_type` to the STEP 10 response**

```ts
    return NextResponse.json({
      order_id:          order.id,
      short_id:          order.id.slice(0, 8).toUpperCase(),
      order_type:        data.order_type,
      estimated_minutes: 20,
      table_number:      tableDisplayNumber,
      line_items,
      order_total:       total,
    });
```

- [ ] **Step 6: Typecheck**

Run: `cd apps/web && npx tsc --noEmit`
Expected: no new errors (pre-existing errors, if any, are unrelated — note them).

- [ ] **Step 7: Commit**

```bash
git add apps/web/app/api/orders/route.ts
git commit -m "feat(takeaway): POST /api/orders accepts takeaway orders (no table, phone required)"
```

---

### Task 5: Public status endpoint `GET /api/orders/[id]`

**Files:**
- Create: `apps/web/app/api/orders/[id]/route.ts`

- [ ] **Step 1: Write the route**

No auth: the order UUID is the capability token. Serves takeaway orders only; 404 for everything else so the endpoint can't be used to probe dine-in orders.

```ts
import { NextRequest, NextResponse } from "next/server";
import { adminClient } from "@/lib/supabase/admin";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/* ── GET — public takeaway order status (guest polling) ──────────────
   The unguessable order UUID is the access token. Minimal projection:
   never lists orders, never exposes another guest's data. */
export async function GET(
  _req: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await ctx.params;
    if (!UUID_RE.test(id)) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const { data: order } = await adminClient
      .from("orders")
      .select(`
        id, menu_id, order_type, status, created_at,
        accepted_at, estimated_ready_at, decline_reason, total_kes,
        order_items ( item_name, quantity, line_total, is_voided )
      `)
      .eq("id", id)
      .single();

    if (!order || order.order_type !== "takeaway") {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const { data: menu } = await adminClient
      .from("menus")
      .select("name, slug")
      .eq("id", order.menu_id)
      .single();

    return NextResponse.json({
      order: {
        id:                 order.id,
        short_id:           order.id.slice(0, 8).toUpperCase(),
        status:             order.status,
        created_at:         order.created_at,
        accepted_at:        order.accepted_at,
        estimated_ready_at: order.estimated_ready_at,
        decline_reason:     order.decline_reason,
        total_kes:          order.total_kes,
        items: (order.order_items ?? [])
          .filter((i) => !i.is_voided)
          .map((i) => ({
            name:       i.item_name,
            quantity:   i.quantity,
            line_total: i.line_total,
          })),
        restaurant: { name: menu?.name ?? "", slug: menu?.slug ?? "" },
      },
    });
  } catch {
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
```

- [ ] **Step 2: Typecheck**

Run: `cd apps/web && npx tsc --noEmit`
Expected: no new errors.

- [ ] **Step 3: Commit**

```bash
git add "apps/web/app/api/orders/[id]/route.ts"
git commit -m "feat(takeaway): public order status endpoint (UUID-scoped, takeaway only)"
```

---

### Task 6: Guest live status page `/m/[slug]/order/[orderId]`

**Files:**
- Create: `apps/web/app/m/[slug]/order/[orderId]/page.tsx`
- Create: `apps/web/app/m/[slug]/order/[orderId]/OrderStatusClient.tsx`
- Create: `apps/web/app/m/[slug]/order/[orderId]/loading.tsx`

- [ ] **Step 1: Write the server page (thin shell)**

```tsx
import { OrderStatusClient } from "./OrderStatusClient";

export const dynamic = "force-dynamic";

export default async function OrderStatusPage(props: {
  params: Promise<{ slug: string; orderId: string }>;
}) {
  const { orderId } = await props.params;
  return <OrderStatusClient orderId={orderId} />;
}
```

- [ ] **Step 2: Write the polling client**

Polls every 8s, pauses when the tab is hidden (project polling pattern). All copy inline; times via Intl with Africa/Nairobi.

```tsx
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

interface StatusOrder {
  id: string;
  short_id: string;
  status: "new" | "preparing" | "ready" | "delivered" | "cancelled";
  created_at: string;
  accepted_at: string | null;
  estimated_ready_at: string | null;
  decline_reason: string | null;
  total_kes: number | null;
  items: Array<{ name: string; quantity: number; line_total: number | null }>;
  restaurant: { name: string; slug: string };
}

function readyTimeLabel(iso: string | null): string | null {
  if (!iso) return null;
  return new Intl.DateTimeFormat("en-KE", {
    timeZone: "Africa/Nairobi",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(iso));
}

const STATUS_UI: Record<
  StatusOrder["status"],
  { emoji: string; title: string; tone: string }
> = {
  new:       { emoji: "⏳", title: "Waiting for the restaurant to confirm", tone: "text-amber" },
  preparing: { emoji: "👨‍🍳", title: "Order accepted — being prepared",     tone: "text-purple" },
  ready:     { emoji: "🎉", title: "Ready for pickup!",                     tone: "text-emerald-600" },
  delivered: { emoji: "✅", title: "Picked up — thank you!",                tone: "text-emerald-700" },
  cancelled: { emoji: "😔", title: "Order declined",                        tone: "text-[#DC2626]" },
};

export function OrderStatusClient({ orderId }: { orderId: string }) {
  const [order, setOrder] = useState<StatusOrder | null>(null);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const poll = async () => {
      if (document.hidden) return;
      try {
        const res = await fetch(`/api/orders/${orderId}`);
        if (res.status === 404) {
          if (!cancelled) setNotFound(true);
          return;
        }
        if (!res.ok) return;
        const data = await res.json();
        if (!cancelled) setOrder(data.order);
      } catch {
        // Network blip — next poll heals
      }
    };
    poll();
    const i = setInterval(poll, 8000);
    return () => {
      cancelled = true;
      clearInterval(i);
    };
  }, [orderId]);

  if (notFound) {
    return (
      <div className="min-h-screen bg-canvas flex items-center justify-center px-6">
        <p className="text-[15px] text-text2 text-center">
          Order not found. Check the link and try again.
        </p>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="min-h-screen bg-canvas flex items-center justify-center">
        <div className="size-8 rounded-full border-2 border-amber border-t-transparent animate-spin" />
      </div>
    );
  }

  const ui = STATUS_UI[order.status];
  const readyAt = readyTimeLabel(order.estimated_ready_at);

  return (
    <div className="min-h-screen bg-canvas flex flex-col items-center px-5 py-10">
      <div className="w-full max-w-[420px] bg-white rounded-2xl border border-border shadow-sm p-6 text-center">
        <p className="text-[40px] leading-none mb-3">{ui.emoji}</p>
        <h1 className={`font-display text-[22px] font-extrabold tracking-tight ${ui.tone}`}>
          {ui.title}
        </h1>

        {order.status === "new" && (
          <p className="text-[13px] text-text2 mt-2">
            {order.restaurant.name} will confirm your order shortly. Keep this page open —
            it updates automatically.
          </p>
        )}
        {order.status === "preparing" && readyAt && (
          <p className="text-[14px] text-text2 mt-2">
            Ready around <span className="font-bold text-dark">{readyAt}</span>
          </p>
        )}
        {order.status === "ready" && (
          <p className="text-[13px] text-text2 mt-2">
            Head to {order.restaurant.name} to collect your order.
          </p>
        )}
        {order.status === "cancelled" && order.decline_reason && (
          <p className="text-[13px] text-text2 mt-2">“{order.decline_reason}”</p>
        )}

        <p className="text-[11px] font-bold text-text3 uppercase tracking-widest mt-5 mb-1">
          Takeaway order
        </p>
        <p className="font-mono text-[18px] font-bold text-dark">#{order.short_id}</p>

        {/* Items */}
        <div className="mt-5 text-left border-t border-surface pt-4 space-y-1.5">
          {order.items.map((it, i) => (
            <div key={i} className="flex items-baseline gap-2">
              <span className="text-[13px] font-bold text-dark w-[22px] text-right tabular-nums shrink-0">
                {it.quantity}×
              </span>
              <span className="flex-1 text-[13px] text-dark">{it.name}</span>
              {it.line_total != null && (
                <span className="text-[12px] font-bold text-dark tabular-nums">
                  KSh {it.line_total.toLocaleString("en-KE")}
                </span>
              )}
            </div>
          ))}
          {order.total_kes != null && (
            <div className="flex items-center justify-between pt-2 mt-2 border-t border-surface">
              <span className="text-[13px] font-semibold text-text2">Total (pay at pickup)</span>
              <span className="text-[15px] font-extrabold text-dark tabular-nums">
                KSh {order.total_kes.toLocaleString("en-KE")}
              </span>
            </div>
          )}
        </div>
      </div>

      <Link
        href={`/m/${order.restaurant.slug}`}
        className="mt-5 text-[13px] font-semibold text-text2 hover:text-dark transition-colors"
      >
        ← Back to menu
      </Link>
    </div>
  );
}
```

- [ ] **Step 3: Write loading.tsx**

```tsx
export default function Loading() {
  return (
    <div className="min-h-screen bg-canvas flex flex-col items-center px-5 py-10">
      <div className="w-full max-w-[420px] bg-white rounded-2xl border border-border shadow-sm p-6">
        <div className="animate-pulse space-y-4">
          <div className="size-10 bg-surface rounded-full mx-auto" />
          <div className="h-6 bg-surface rounded w-3/4 mx-auto" />
          <div className="h-4 bg-surface rounded w-1/2 mx-auto" />
          <div className="h-24 bg-surface rounded" />
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Typecheck**

Run: `cd apps/web && npx tsc --noEmit`
Expected: no new errors.

- [ ] **Step 5: Commit**

```bash
git add "apps/web/app/m/[slug]/order"
git commit -m "feat(takeaway): guest live status page with 8s polling"
```

---

### Task 7: Cart takeaway mode + `/m/[slug]` wiring

**Files:**
- Modify: `apps/web/components/menu/MenuWithCart.tsx`
- Modify: `apps/web/app/m/[slug]/page.tsx`

- [ ] **Step 1: Extend `MenuWithCartProps` and `CartPanelProps`**

In `MenuWithCart.tsx`, add to `MenuWithCartProps` (line ~569) and thread through to `CartPanel`:

```ts
interface MenuWithCartProps {
  sections: MenuSection[];
  menuId: string;
  menuSlug: string;
  initialTable?: string;
  tables?: Array<{ id: string; table_number: string; floor_section: string | null }>;
  tableOrdering: boolean;
  takeawayEnabled: boolean;
}
```

`CartPanel` gets the same three new props (`menuSlug`, `tableOrdering`, `takeawayEnabled`). Pass them where `<CartPanel …>` is rendered (line ~770).

- [ ] **Step 2: Add order-type state + fields to `CartPanel` (line ~176)**

Add imports at top of file: `import { useRouter } from "next/navigation";`

Inside `CartPanel`:

```ts
  const router = useRouter();
  const [orderType, setOrderType] = useState<"dine_in" | "takeaway">(
    tableOrdering ? "dine_in" : "takeaway",
  );
  const [customerPhone, setCustomerPhone] = useState("");
```

Replace the `handlePlaceOrder` validation and body:

```ts
  async function handlePlaceOrder() {
    if (orderType === "dine_in" && !tableNumber.trim()) {
      setError("Please enter your table number.");
      return;
    }
    if (orderType === "takeaway") {
      if (!customerName.trim()) {
        setError("Please enter your name.");
        return;
      }
      if (!/^\+?[\d\s\-()]{7,18}$/.test(customerPhone.trim())) {
        setError("Enter a valid phone number (e.g. 0712 345 678).");
        return;
      }
    }

    setSubmitting(true);
    setError(null);

    try {
      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          menu_id: menuId,
          order_type: orderType,
          table_number: orderType === "dine_in" ? tableNumber.trim() : undefined,
          customer_name: customerName.trim() || undefined,
          customer_phone: orderType === "takeaway" ? customerPhone.trim() : undefined,
          order_note: orderNote.trim() || undefined,
          items: entries.map((e) => ({
            /* …existing item mapping unchanged… */
          })),
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? "Something went wrong. Please try again.");
        return;
      }

      if (orderType === "takeaway") {
        router.push(`/m/${menuSlug}/order/${data.order_id}`);
        return;
      }

      onConfirmed({
        /* …existing ConfirmData mapping unchanged… */
      });
    } catch {
      setError("Network error — please check your connection and try again.");
    } finally {
      setSubmitting(false);
    }
  }
```

- [ ] **Step 3: Render the mode picker + takeaway fields**

In `CartPanel`'s JSX, where the table picker currently renders (line ~360 area), wrap it:

```tsx
      {/* Order-type picker — only when both modes are available */}
      {tableOrdering && takeawayEnabled && (
        <div className="flex rounded-xl border border-border overflow-hidden mb-3">
          {(
            [
              { key: "dine_in", label: "At a table" },
              { key: "takeaway", label: "Takeaway (pickup)" },
            ] as const
          ).map((opt) => (
            <button
              key={opt.key}
              type="button"
              onClick={() => setOrderType(opt.key)}
              className={`flex-1 py-3 text-[14px] font-bold transition-colors ${
                orderType === opt.key
                  ? "bg-amber text-dark"
                  : "bg-white text-text2 hover:bg-surface"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      )}

      {orderType === "dine_in" ? (
        <>
          {/* existing table picker + optional name input — UNCHANGED, moved inside this branch */}
        </>
      ) : (
        <>
          <input
            type="text"
            value={customerName}
            onChange={(e) => setCustomerName(e.target.value)}
            placeholder="Your name *"
            className={inputCls}
            style={{ fontSize: 16 }}
          />
          <input
            type="tel"
            inputMode="tel"
            value={customerPhone}
            onChange={(e) => setCustomerPhone(e.target.value)}
            placeholder="Phone number * (e.g. 0712 345 678)"
            className={inputCls}
            style={{ fontSize: 16 }}
          />
          <p className="text-[12px] text-text3">
            Pay at pickup. The restaurant confirms your order and you follow progress live.
          </p>
        </>
      )}
```

Match the exact surrounding markup/classNames when moving the existing table-picker block — do not restyle it. Reuse the existing `inputCls` variable; keep every input at 16px.

- [ ] **Step 4: Wire `/m/[slug]/page.tsx`**

Three changes:
1. Menu select (line ~40): add `takeaway_enabled` to the projection string: `id, name, is_published, table_ordering, takeaway_enabled, …`.
2. Render condition (line ~232): `{(menu.table_ordering || menu.takeaway_enabled) ? (<MenuWithCart … />) : (<MenuWithFilters … />)}` — also update the two other `menu.table_ordering` guards in that region: the header action-buttons condition (line ~204) becomes `(menu.table_ordering || menu.takeaway_enabled || showBookButton)`, and the "Powered by" condition (line ~245) becomes `!(menu.table_ordering || menu.takeaway_enabled)`.
3. Pass the new props:

```tsx
        <MenuWithCart
          sections={sections}
          menuId={menu.id}
          menuSlug={slug}
          initialTable={prefilledTable}
          tables={tables}
          tableOrdering={menu.table_ordering ?? false}
          takeawayEnabled={menu.takeaway_enabled ?? false}
        />
```

(`slug` is the page's route param — confirm the local variable name at the top of the page component and use that.)

Also update the page's local `MenuData`-style interface (line ~18 has `table_ordering: boolean;`) to include `takeaway_enabled: boolean;`.

- [ ] **Step 5: Typecheck + build**

Run: `cd apps/web && npx tsc --noEmit`
Expected: no new errors. If other components render `MenuWithCart` (grep `<MenuWithCart`), update their props too — as of planning, `/m/[slug]/page.tsx` is the only call site.

- [ ] **Step 6: Commit**

```bash
git add apps/web/components/menu/MenuWithCart.tsx "apps/web/app/m/[slug]/page.tsx"
git commit -m "feat(takeaway): cart takeaway mode with name+phone, redirect to live status page"
```

---

### Task 8: Kitchen API — GET projection + PATCH accept/decline

**Files:**
- Modify: `apps/web/app/api/menu/orders/route.ts`

- [ ] **Step 1: Extend the GET projection (line ~43)**

Add four fields to the orders select (drift rule — the kitchen board needs them):

```ts
      .select(`
        id,
        status,
        order_type,
        table_number,
        customer_name,
        customer_phone,
        estimated_ready_at,
        notes,
        total_kes,
        created_at,
        waiter_id,
        order_items (
          id,
          item_name,
          item_price,
          quantity,
          notes,
          selected_options,
          allergy_notes,
          line_total,
          station,
          station_status,
          is_voided
        )
      `)
```

- [ ] **Step 2: PATCH — read the new body field and fetch `order_type`**

In `PATCH` (line ~121): add after the existing body reads:

```ts
    const estimatedReadyMinutes = Number(body?.estimated_ready_minutes);
```

Extend the order fetch (line ~137):

```ts
    const { data: order } = await adminClient
      .from("orders")
      .select("id, status, menu_id, order_type")
      .eq("id", order_id)
      .single();
```

- [ ] **Step 3: PATCH — accept semantics on `new → preparing` for takeaway**

Replace the non-cancel else-branch (the `else { const { error } = await adminClient.from("orders").update({ status: newStatus })… }` block) with:

```ts
    } else {
      const updatePayload: Record<string, unknown> = { status: newStatus };

      // Takeaway accept: new → preparing stamps acceptance + promised time,
      // and cascades items so the station board and the derive_order_status
      // trigger agree (same cascade idea the cancel path uses).
      const isTakeawayAccept =
        order.order_type === "takeaway" &&
        order.status === "new" &&
        newStatus === "preparing";

      if (isTakeawayAccept) {
        updatePayload.accepted_at = new Date().toISOString();
        if (Number.isFinite(estimatedReadyMinutes) && estimatedReadyMinutes > 0 && estimatedReadyMinutes <= 240) {
          updatePayload.estimated_ready_at = new Date(
            Date.now() + estimatedReadyMinutes * 60_000,
          ).toISOString();
        }
      }

      const { error } = await adminClient
        .from("orders")
        .update(updatePayload)
        .eq("id", order_id);
      if (error) {
        console.error("[menu/orders PATCH] error:", error);
        return NextResponse.json({ error: "Failed to update order." }, { status: 500 });
      }

      if (isTakeawayAccept) {
        const { error: cascadeErr } = await adminClient
          .from("order_items")
          .update({ station_status: "preparing" })
          .eq("order_id", order_id)
          .eq("is_voided", false)
          .eq("station_status", "new");
        if (cascadeErr) {
          console.error("[menu/orders PATCH takeaway cascade] error:", cascadeErr);
        }
      }
    }
```

- [ ] **Step 4: PATCH — record `decline_reason` on takeaway cancels**

In the `newStatus === "cancelled"` branch, the belt-and-braces force-set line becomes:

```ts
      await adminClient
        .from("orders")
        .update(
          order.order_type === "takeaway" && reason
            ? { status: "cancelled", decline_reason: reason }
            : { status: "cancelled" },
        )
        .eq("id", order_id);
```

- [ ] **Step 5: Typecheck**

Run: `cd apps/web && npx tsc --noEmit`
Expected: no new errors.

- [ ] **Step 6: Commit**

```bash
git add apps/web/app/api/menu/orders/route.ts
git commit -m "feat(takeaway): kitchen orders API — takeaway projection, accept stamps + cascade, decline reason"
```

---

### Task 9: StationDashboard takeaway cards

**Files:**
- Modify: `apps/web/components/dashboard/menu/StationDashboard.tsx`

- [ ] **Step 1: Extend `DashboardOrder` (line ~28)**

```ts
export interface DashboardOrder {
  id: string;
  status: string;
  order_type: "dine_in" | "takeaway" | "delivery";
  table_number: string | null;
  customer_name: string | null;
  customer_phone: string | null;
  estimated_ready_at: string | null;
  /* …rest unchanged (notes, total_kes, created_at, waiter_id, waiter_name, order_items)… */
}
```

Add the import: `import { pickupWaMeLink } from "@/lib/orders/takeaway";`

Then fix every place that constructs a `DashboardOrder` server-side: the SSR pages that pass `initialOrders` (grep `initialOrders=` — `apps/web/app/dashboard/menu/[id]/orders/page.tsx`, `apps/web/app/dashboard/menu/[id]/orders/[station]/page.tsx`, `apps/web/app/kitchen/[slug]/orders/page.tsx`, `apps/web/app/kitchen/[slug]/orders/[station]/page.tsx`). Each fetches orders with its own `.select()` — add `order_type, customer_phone, estimated_ready_at` to each projection (drift rule) and to any local interfaces/casts in those files.

- [ ] **Step 2: Card header — takeaway variant (line ~154)**

Replace the "Table number + status badge" block's left side:

```tsx
        <div>
          {order.order_type === "takeaway" ? (
            <>
              <p className="text-[11px] font-bold text-amber uppercase tracking-widest mb-0.5">
                🛍 Takeaway
              </p>
              <p className="font-display text-[22px] font-extrabold text-dark leading-tight tracking-tight">
                {order.customer_name ?? "Guest"}
              </p>
              {order.customer_phone && (
                <a
                  href={`tel:${order.customer_phone}`}
                  className="text-[13px] text-text2 mt-0.5 underline decoration-border underline-offset-2"
                >
                  {order.customer_phone}
                </a>
              )}
            </>
          ) : (
            <>
              <p className="text-[11px] font-bold text-text3 uppercase tracking-widest mb-0.5">Table</p>
              <p className="font-display text-[36px] font-extrabold text-dark leading-none tracking-tight">
                {order.table_number ?? "—"}
              </p>
              {order.customer_name && (
                <p className="text-[13px] text-text2 mt-0.5">{order.customer_name}</p>
              )}
            </>
          )}
          {order.waiter_name && (
            <p className="text-[11px] text-text3 mt-0.5">via {order.waiter_name}</p>
          )}
        </div>
```

- [ ] **Step 3: Card footer — Accept/Decline for new takeaway, wa.me for ready (line ~281)**

`OrderCard` needs one new prop:

```ts
  onAcceptTakeaway: (order: DashboardOrder, items: OrderItem[], minutes: number) => void;
```

Replace the footer actions `<div className="flex items-center gap-2">…</div>` with:

```tsx
        <div className="flex items-center gap-2 flex-wrap justify-end">
          {order.order_type === "takeaway" && status === "new" ? (
            <>
              <button
                onClick={() => onCancel(order.id, order.table_number, shortId)}
                disabled={updating}
                className="text-[11px] font-semibold text-text3 hover:text-[#DC2626] border border-border hover:border-[#DC2626]/40 px-3 h-[30px] rounded-full transition-colors disabled:opacity-50"
              >
                Decline
              </button>
              <span className="text-[11px] font-bold text-text3 uppercase">Accept:</span>
              {[15, 30, 45].map((mins) => (
                <button
                  key={mins}
                  onClick={() => onAcceptTakeaway(order, items, mins)}
                  disabled={updating}
                  className="text-[12px] font-bold px-3 h-[34px] rounded-full bg-amber text-dark hover:bg-[#d4911c] transition-colors disabled:opacity-50"
                >
                  {mins}m
                </button>
              ))}
            </>
          ) : (
            <>
              {order.order_type === "takeaway" && status === "ready" && order.customer_phone && (
                <a
                  href={pickupWaMeLink(order.customer_phone, order.customer_name, shortId)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[11px] font-semibold text-emerald-700 border border-emerald-300 hover:bg-emerald-50 px-3 h-[30px] rounded-full transition-colors inline-flex items-center"
                >
                  WhatsApp
                </a>
              )}
              <button
                onClick={() => onCancel(order.id, order.table_number, shortId)}
                disabled={updating}
                className="text-[11px] font-semibold text-text3 hover:text-[#DC2626] border border-border hover:border-[#DC2626]/40 px-3 h-[30px] rounded-full transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              {action && (
                <button
                  onClick={() => onAdvance(items, action.next)}
                  disabled={updating}
                  className={`text-[12px] font-bold px-4 h-[34px] rounded-full transition-colors disabled:opacity-50 ${action.color}`}
                >
                  {updating ? "…" : action.label}
                </button>
              )}
            </>
          )}
        </div>
```

The takeaway `ready` column keeps the existing "Done" button — that advances items `ready → delivered`, which is the pickup completion.

- [ ] **Step 4: `handleAcceptTakeaway` in `StationDashboard` (after `handleAdvance`, line ~463)**

```ts
  /* ── Accept a takeaway order: order-level PATCH stamps accepted_at +
   * estimated_ready_at and cascades items to preparing server-side.
   * Optimistic locally; the next poll confirms. ── */
  const handleAcceptTakeaway = useCallback(
    async (order: DashboardOrder, items: OrderItem[], minutes: number) => {
      const cardKey = items.map((i) => i.id).join(",");
      const snapshot = ordersRef.current;

      const optimistic = snapshot.map((o) =>
        o.id === order.id
          ? {
              ...o,
              status: "preparing",
              order_items: (o.order_items ?? []).map((it) =>
                it.station_status === "new"
                  ? { ...it, station_status: "preparing" as OrderItem["station_status"] }
                  : it,
              ),
            }
          : o,
      );
      ordersRef.current = optimistic;
      setOrders(optimistic);

      setUpdatingKeys((p) => new Set(p).add(cardKey));
      try {
        const res = await fetch("/api/menu/orders", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            order_id: order.id,
            status: "preparing",
            estimated_ready_minutes: minutes,
          }),
        });
        if (!res.ok) {
          console.warn("[StationDashboard] takeaway accept failed:", res.status);
          ordersRef.current = snapshot;
          setOrders(snapshot);
        }
      } catch (e) {
        console.warn("[StationDashboard] takeaway accept error:", e);
        ordersRef.current = snapshot;
        setOrders(snapshot);
      } finally {
        setUpdatingKeys((p) => {
          const n = new Set(p);
          n.delete(cardKey);
          return n;
        });
      }
    },
    [],
  );
```

Pass `onAcceptTakeaway={handleAcceptTakeaway}` to all three `<OrderCard …>` render sites (New/Preparing/Ready columns).

Also update `handleCancel`'s confirm copy so declines read correctly (line ~468):

```ts
      const label = tableNumber ? `table ${tableNumber}` : `takeaway #${shortId}`;
      if (!window.confirm(`Cancel/decline order #${shortId} (${label})?`)) return;
      const reason = window.prompt("Reason (shown to the guest for takeaway orders)") ?? "";
```

- [ ] **Step 5: Typecheck**

Run: `cd apps/web && npx tsc --noEmit`
Expected: no new errors (the SSR pages from Step 1 are the usual culprits if any).

- [ ] **Step 6: Commit**

```bash
git add apps/web/components/dashboard/menu/StationDashboard.tsx apps/web/app/dashboard/menu apps/web/app/kitchen
git commit -m "feat(takeaway): kitchen board — takeaway cards with accept/decline, wa.me pickup link"
```

---

### Task 10: Settings toggle + feature registry

**Files:**
- Modify: `apps/web/app/api/menu/settings/route.ts`
- Modify: `apps/web/app/dashboard/listings/[id]/_lib/features.config.ts`
- Modify: `apps/web/app/dashboard/listings/[id]/orders/TableOrderingClient.tsx`
- Modify: `apps/web/app/dashboard/listings/[id]/orders/page.tsx`
- Modify: `apps/web/app/eat/listings/[id]/orders/page.tsx`
- Modify: `apps/web/app/eat/listings/[id]/features/page.tsx`

- [ ] **Step 1: Settings PATCH accepts `takeaway_enabled`**

In `route.ts`, add `takeaway_enabled` to the body destructure (line ~74) and after the `table_ordering` block (line ~109):

```ts
    if (typeof takeaway_enabled === "boolean") {
      updates.takeaway_enabled = takeaway_enabled;
    }
```

- [ ] **Step 2: Registry — takeaway goes live**

In `features.config.ts` (line ~71):

```ts
  {
    id: 'takeaway',
    label: 'Takeaway orders',
    shortDescription: 'Customers order ahead for pickup.',
    longDescription:
      'Guests order from your public menu without a table, you accept with a ready time, they pick up and pay at the counter.',
    icon: 'ShoppingBag',
    appliesTo: ['restaurant'],
    getStatus: (ctx) => (ctx.menu?.takeaway_enabled ? 'active' : 'inactive'),
  },
```

(No `tabSegment` — takeaway shares the existing Orders tab.)

- [ ] **Step 3: Toggle card in `TableOrderingClient`**

Add to `Props`: `initialTakeawayEnabled: boolean;`. In `Inner`, alongside the existing toggle state:

```ts
  const [takeaway, setTakeaway] = useState(initialTakeawayEnabled);
  const [togglingTakeaway, setTogglingTakeaway] = useState(false);

  async function toggleTakeaway() {
    const next = !takeaway;
    if (!next && !confirm("Disable takeaway? Guests will no longer be able to order for pickup.")) {
      return;
    }
    setTogglingTakeaway(true);
    try {
      const res = await fetch("/api/menu/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ menu_id: menuId, takeaway_enabled: next }),
      });
      if (!res.ok) throw new Error();
      showToast(next ? "Takeaway ordering enabled" : "Takeaway ordering disabled");
      setTakeaway(next);
    } catch {
      showToast("Failed to update takeaway setting", "error");
    } finally {
      setTogglingTakeaway(false);
    }
  }
```

Render a second toggle card directly below the existing "Table ordering" card (copy its exact markup):

```tsx
      <div className="bg-white rounded-2xl border border-border shadow-sm p-5">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div>
            <p className="text-[14px] font-bold text-dark">Takeaway orders</p>
            <p className="text-[12px] text-text3 mt-0.5 max-w-[480px]">
              {takeaway
                ? "Active — guests can order for pickup from your public menu. Accept each order from the kitchen view."
                : "Off. Turn it on to let guests order ahead and collect at the counter."}
            </p>
          </div>
          <Toggle checked={takeaway} onChange={toggleTakeaway} disabled={togglingTakeaway} />
        </div>
      </div>
```

- [ ] **Step 4: Pass the new prop from both pages**

`apps/web/app/dashboard/listings/[id]/orders/page.tsx` (line ~51): select becomes
`"id, name, slug, table_ordering, takeaway_enabled, listing_slug"`, and (line ~107) add
`initialTakeawayEnabled={menu.takeaway_enabled ?? false}`.

`apps/web/app/eat/listings/[id]/orders/page.tsx` (line ~42 + ~92): same two changes.

- [ ] **Step 5: /eat features page — takeaway toggle row**

In `apps/web/app/eat/listings/[id]/features/page.tsx`, add cases to the two switch helpers (line ~102) and the `currentValue` switch (line ~160):

```ts
      case "takeaway":       return "takeaway_enabled";   // in toggleColumnFor
      case "takeaway":       return `/eat/listings/${id}/orders`;   // in configureHrefFor
      case "takeaway": return menu.takeaway_enabled ?? false;   // in currentValue switch
```

(The row itself renders automatically from `LISTING_FEATURES` once the registry status is no longer `coming_soon`.)

- [ ] **Step 6: Typecheck**

Run: `cd apps/web && npx tsc --noEmit`
Expected: no new errors.

- [ ] **Step 7: Commit**

```bash
git add apps/web/app/api/menu/settings/route.ts "apps/web/app/dashboard/listings/[id]" "apps/web/app/eat/listings/[id]"
git commit -m "feat(takeaway): owner toggle (orders tab + /eat features), registry entry live"
```

---

### Task 11: Full verification

- [ ] **Step 1: Run the whole test suite**

Run: `cd apps/web && npx vitest run`
Expected: all tests pass (new phone + takeaway tests plus the pre-existing tickets suite).

- [ ] **Step 2: Production build**

Run: `cd apps/web && npx next build`
Expected: build succeeds. Fix any type or route errors it surfaces.

- [ ] **Step 3: Manual end-to-end on the dev server (requires migration 083 applied)**

If migration 083 is not yet applied to the Supabase project, stop here and report. Otherwise, with the dev server running (use the project's launch config / preview tooling):

1. Owner: `/dashboard/listings/[id]/orders` → flip "Takeaway orders" on → toast confirms.
2. Guest: open `/m/[slug]` → add items → cart shows "At a table / Takeaway (pickup)" picker → choose takeaway → name + phone → place order → lands on `/m/[slug]/order/[id]` showing "Waiting for the restaurant to confirm".
3. Kitchen: `/dashboard/menu/[id]/orders` → takeaway card in New column with TAKEAWAY chip, name, phone → tap "30m" Accept → card moves to Preparing; guest page flips to "Accepted — ready around HH:MM" within 8s.
4. Kitchen: Mark ready → guest page shows "Ready for pickup"; WhatsApp button opens wa.me with the pre-filled message.
5. Kitchen: Done → guest page shows "Picked up".
6. Decline path: place a second takeaway order → Decline with a reason → guest page shows "Order declined" + the reason.
7. Regression: place a dine-in order with a table number → confirmation screen unchanged, order attaches to a session, kitchen flow unchanged.
8. Toggle off takeaway → new POST with `order_type: "takeaway"` returns 400; menu page hides the picker.

- [ ] **Step 4: Mobile pass**

Resize to mobile viewport (375px): cart picker, name/phone inputs (no zoom — 16px), status page layout.

- [ ] **Step 5: Final commit + report**

Report to the user: what shipped, migration 083 instructions (paste SQL into Supabase dashboard), and that merge goes feat/takeaway-ordering → dev → verify on dev preview URL → main.

---

## Self-review notes

- **Spec coverage:** schema (T1), POST takeaway (T4), public status endpoint (T5), guest status page (T6), cart mode (T7), kitchen accept/decline + chip + wa.me (T8–T9), toggle + registry (T10), drift-rule projections (T4 step 2, T8 step 1, T9 step 1, T7 step 4, T10 step 4), stock triggers need no work (verified: 062 fires on `preparing`/`cancelled`).
- **Type consistency:** `DashboardOrder.order_type/customer_phone/estimated_ready_at` (T9) matches GET projection (T8); `pickupWaMeLink(phone, name, shortId)` signature identical in T3 and T9; `normalizeKenyanPhone` in T2 and T4.
- **Known judgment calls:** waiter-role staff cannot accept takeaway orders (PATCH role gate limits `new → preparing` to kitchen/manager/owner — acceptable, acceptance is a kitchen decision). Declines by kitchen staff require manager approval per the existing cancel path — consistent with dine-in voids.
