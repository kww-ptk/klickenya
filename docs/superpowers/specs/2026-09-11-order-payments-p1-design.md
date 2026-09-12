# Order Payments (P1) — Design Spec

Date: 2026-09-11 · Branch: `feat/order-payments` · Migration: **086**
Programme: `docs/food-delivery-program-plan.md` — **P1 of Phase A**. Depends on P0 (`085`).

## What we're building

Delivery and takeaway orders can be **paid online at placement** (Paystack, M-Pesa or card),
alongside the existing **cash at handover**. Each restaurant chooses which methods it accepts.
A restaurant decline, or any cancellation of a paid order, **refunds automatically**.

Payment is recorded on the existing `orders` table — food orders do **not** get a parallel
table like `ticket_orders`. The provider plumbing, webhook shape and expiry cron are all
lifted from event ticketing, which has been charging money in production since July.

## Decisions made (with the user)

1. **Charge at placement.** The guest pays when ordering; a decline refunds.
2. **Cash survives.** Prepay and cash-at-handover both exist; the restaurant decides which
   it accepts. P1 must never block an order that P0 could already take.
3. **Full refunds only** in P1. Partial refunds (one item unavailable) are deferred — the
   restaurant declines the whole order or delivers it.
4. **Payouts are not P1.** Commission is *recorded* per order; moving money to restaurants
   is P6. P1 changes nothing about how restaurants get paid today.

## The constraint that shapes this spec

**M-Pesa cannot authorize and capture separately.** A card can be held and captured on
acceptance; an STK push either takes the money or does not. Since M-Pesa is the rail most
guests will use, "hold until the restaurant accepts" is not available, and a decline is a
real refund that settles in days rather than seconds.

Two consequences, both designed for rather than hoped away:

- **Declines are expensive.** The restaurant UI must make the cost visible — declining a
  paid order says so explicitly before confirming.
- **Unpaid orders must never reach the kitchen.** An online order that is created but not
  yet paid is invisible to the restaurant until the webhook confirms the charge. Otherwise
  restaurants cook for money that never arrives.

## Schema — migration `086_order_payments.sql`

```sql
-- Payment lifecycle. 'refunded' and 'refund_pending' are new; a refund is
-- asynchronous and can fail, so it needs its own in-flight state.
alter table orders drop constraint orders_payment_status_check;
alter table orders add constraint orders_payment_status_check
  check (payment_status in ('pending','paid','failed','refund_pending','refunded'));

alter table orders add column if not exists payment_method     text
  check (payment_method in ('cash','online'));            -- null = legacy/dine-in
alter table orders add column if not exists payment_provider   text
  check (payment_provider in ('paystack','daraja'));
alter table orders add column if not exists payment_ref        text;   -- provider reference
alter table orders add column if not exists paid_at            timestamptz;
alter table orders add column if not exists payment_expires_at timestamptz;
alter table orders add column if not exists refund_ref         text;
alter table orders add column if not exists refunded_at        timestamptz;
alter table orders add column if not exists refund_failure     text;
alter table orders add column if not exists platform_fee_bps   integer not null default 0;

-- Which methods a restaurant accepts. Cash defaults true so enabling payments
-- never silently removes an option a restaurant already relies on.
alter table menus add column if not exists accepts_cash   boolean not null default true;
alter table menus add column if not exists accepts_online boolean not null default false;

create index if not exists idx_orders_payment_expiry
  on orders(payment_expires_at) where payment_status = 'pending';
```

**`orders.mpesa_ref` (`043`) is left dormant and deprecated.** It predates the provider
abstraction and is misnamed for a world with two providers. Comment it as such in `086`;
do not write to it.

## Payment provider interface

`lib/payments/types.ts` currently exposes only `initialize` and `verifyTransaction`. Add:

```ts
export type RefundInput  = { providerRef: string; amountKes?: number; reason?: string };
export type RefundResult = { refundRef: string; status: "pending" | "processed" };

export interface PaymentProvider {
  // ...existing
  refund(input: RefundInput): Promise<RefundResult>;
}
```

Paystack implementation posts to `/refund`. Omitting `amountKes` refunds in full — P1 always
omits it. The Daraja slot stays unimplemented, as it is today.

## Webhook — `/api/webhooks/paystack`

Currently handles `charge.success` only, and matches on `provider_ref` against `ticket_orders`.
It must now route by which table owns the reference, and handle refunds:

| Event | Action |
|---|---|
| `charge.success` | Existing ticket path unchanged. New: food order → `payment_status='paid'`, `paid_at=now()`, clear `payment_expires_at`. The order becomes visible to the kitchen at this moment. |
| `refund.processed` | `payment_status='refunded'`, `refunded_at=now()` |
| `refund.failed` | `payment_status` stays `refund_pending`, `refund_failure` set, surfaced to admin |

**Idempotency:** every transition is a conditional update guarded on the expected current
state (the ticket path already does this with `.eq("status","pending")`). Paystack retries
webhooks; a second `charge.success` must be a no-op, not a double transition.

**Ordering:** a webhook can arrive before the checkout redirect returns. Treat the webhook as
the source of truth and the redirect as a UI convenience, exactly as ticketing does.

## Order flow

**Cash** — unchanged from P0. `payment_method='cash'`, `payment_status='pending'`, order is
immediately visible to the kitchen, settles at handover.

**Online**
1. `POST /api/orders` with `payment_method='online'` → order inserted with
   `payment_status='pending'`, `payment_expires_at = now() + 15 minutes`,
   `platform_fee_bps` snapshotted from env.
2. Route calls `initialize()`; guest is redirected to Paystack.
3. **Order is hidden from the kitchen** while `payment_method='online' AND payment_status='pending'`.
4. `charge.success` → `paid`. Order now appears in the kitchen as `new`, awaiting acceptance.
5. Restaurant accepts → P0's flow, unchanged.
6. Restaurant declines, or any cancellation of a paid order → `refund()` →
   `payment_status='refund_pending'` → `refund.processed` → `refunded`.
7. Never paid by `payment_expires_at` → cron cancels it.

## Expiry cron

`/api/cron/expire-orders`, modelled directly on `/api/cron/expire-ticket-orders`
(`vercel.json`, every 10 minutes). Cancels orders where `payment_method='online'`,
`payment_status='pending'` and `payment_expires_at < now()`: sets `status='cancelled'`,
`payment_status='failed'`. Guarded by `CRON_SECRET`, same as the existing jobs.

Safe because the order never reached the kitchen and never deducted stock.

## Stock interaction

Verified against `062` and `063`; **no stock code changes needed**:

- `062` deducts on `→ 'preparing'`. Acceptance happens after payment, so deduction still
  happens exactly once, at the right moment.
- An unpaid online order sits at `new` and never deducts.
- Declining a paid, unaccepted order cancels from `new` — nothing was deducted, nothing reverses.
- Cancelling *after* acceptance reverses stock via `062` **and** refunds. Both fire; they are
  independent. Needs an explicit test.

## Column drift — mandatory sweep

Ten new columns on `orders` and two on `menus`. Per the CLAUDE.md rule, sweep all 12
`.from("orders")` call sites and update every projection that renders payment state:

- `GET /api/menu/orders` (kitchen) → payment columns, **and the new unpaid filter**
- `GET /api/orders/[id]` (guest status) → payment state so the status page can show it
- `menus` projections need `accepts_cash, accepts_online`: `/m/[slug]/page.tsx`,
  `/api/menu/settings` GET **and** PATCH, command-center feature context

## API changes

### `POST /api/orders`
- Accepts `payment_method: 'cash' | 'online'`, validated against the menu's
  `accepts_cash` / `accepts_online`.
- Online: returns `{ checkoutUrl }` for redirect; the order id is the provider reference,
  mirroring ticketing.
- Rejects `online` when `PAYSTACK_SECRET_KEY` is unset — degrade to cash rather than 500.

### `GET /api/orders/[id]`
- Returns `payment_method`, `payment_status`, `paid_at`, and refund state.

### `PATCH /api/menu/orders`
- Declining or cancelling a `paid` order triggers the refund call, sets `refund_pending`,
  and **cannot** silently succeed if the refund call fails — the order still cancels, but
  `refund_failure` is recorded and flagged to admin. Never leave a guest paid with no record.

### `PATCH /api/menu/settings`
- Allows `accepts_cash`, `accepts_online`. Refuse to disable both — a menu must accept
  something.

## UI

**Guest checkout** — payment method choice appears only when the restaurant accepts more
than one. Copy is explicit that paying now means a refund takes a few days if the restaurant
cannot fulfil. All inputs 16px minimum.

**Guest status page** — shows paid state; refund states get their own copy
("Refund on the way — it can take a few days to reach M-Pesa").

**Kitchen card** — a **PAID** chip distinct from cash orders, so staff can see at a glance
that money is already in. Declining a paid order shows a confirmation naming the refund
before it proceeds.

**Admin** — a list of orders in `refund_pending` with a `refund_failure`, so a failed refund
is visible to a human. This is a deliberate stand-in until the P7 ops console exists; without
it, failed refunds are invisible.

## Edge cases

- **Webhook before redirect** — webhook wins; the redirect page reads current state.
- **Duplicate webhook** — conditional updates make it a no-op.
- **Guest abandons at Paystack** — cron cancels after 15 minutes; kitchen never saw it.
- **Refund API fails** — order still cancels; `refund_failure` recorded and surfaced.
- **Restaurant disables online payments with paid orders in flight** — existing orders keep
  their payment state and remain fully actionable; only new submissions are affected.
- **Cash order cancelled** — no refund path, nothing to reverse.
- **Paystack keys missing** — online is refused at validation time, not at checkout.

## Testing

- POST: online happy path returns `checkoutUrl`; `online` rejected when
  `accepts_online=false`; cash unaffected; `platform_fee_bps` snapshotted.
- Webhook: `charge.success` marks paid and reveals the order to the kitchen; replay is a
  no-op; `refund.processed` and `refund.failed` both land correctly; bad signature 401s.
- Kitchen visibility: an unpaid online order is **absent** from `GET /api/menu/orders`;
  it appears the moment the webhook lands.
- Refund: decline of a paid order calls refund once; refund failure records
  `refund_failure` and still cancels; cancel after acceptance both restocks and refunds.
- Cron: expires only unpaid online orders past their window; never touches cash, paid, or
  dine-in orders.
- Regression: dine-in, takeaway, and P0 cash delivery all unchanged.
- Verify on the dev preview URL before promoting dev → main.

## Out of scope (explicit)

Partial refunds. Restaurant payouts and commission settlement (**P6**). Daraja direct
integration — Paystack's M-Pesa channel is the P1 rail. Tips. Saved cards. Subscriptions.
The `/eat` consumer surface (**P2**). Any rider or fleet concern (**P3–P7**).
