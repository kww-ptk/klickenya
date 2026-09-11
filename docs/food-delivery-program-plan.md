# Food Delivery — Program Plan

Date: 2026-09-11 · Status: **planning only, nothing approved for build**
Destination: a full delivery aggregator with an owned rider fleet, served at
**`klickenya.com/eat`** (subdirectory, not a subdomain — see §2a).

This is a program plan, not an implementation spec. It exists so the programme can be
funded (or cut) in stages before any implementation spec is written. Each sub-project
below gets its own design spec + plan when, and only when, it is funded.

---

## 1. The decision

`eat.klickenya.com` becomes a consumer food-delivery marketplace where **Klickenya
contracts the riders and runs dispatch** — not a feature that lets restaurants dispatch
their own riders, and not a discovery-only storefront.

Chosen deliberately over two cheaper models:

| Model | What it is | Why not chosen |
|---|---|---|
| Restaurant's own riders | Delivery as a SaaS feature; restaurant dispatches its own guy | Rejected as the destination |
| Marketplace, restaurant fulfils | Klickenya = discovery + ordering + payments; restaurant delivers | Rejected as the destination |
| **Aggregator, own fleet** | Klickenya contracts riders, dispatches, tracks, reconciles cash | **Chosen** |

**Important:** the first two models are not alternatives that were discarded — they are
the *substrate* of the third. P0–P2 below build exactly the "marketplace, restaurant
fulfils" product. The aggregator is P0–P2 **plus** P3–P7. This matters for funding: real
orders can flow, and revenue can be measured, before a single rider is contracted.

---

## 2. Scope boundary

**In scope:** consumer ordering across multiple restaurants, prepaid orders, Klickenya-
contracted riders, dispatch, live tracking, rider earnings, restaurant payouts, ops
tooling.

**Out of scope for this programme** (may be separate programmes later): groceries and
non-restaurant verticals, scheduled/pre-ordered delivery, subscriptions, loyalty,
multi-country (see `docs/` country-agnostic work), rider-owned vehicle financing.

**Explicitly not a rewrite.** The restaurant-facing side (menu, kitchen, POS, stock)
stays exactly where it is and is consumed, not replaced.

---

## 2a. URL structure — decided 2026-09-11

The consumer surface lives at **`klickenya.com/eat`**, not `eat.klickenya.com`.

Reason: the go-to-market goal is ranking for restaurant searches in Watamu and Kilifi, and
klickenya.com already owns that query space. Live on the domain today:

- `/restaurants/watamu/<slug>` and `/restaurants/kilifi/<slug>` (`lib/listings/url.ts`),
  with city-level pages already emitted into `sitemap.ts`
- restaurant listings already seeded for both towns (`seed-kilifi-restaurants.ts`,
  `seed-kilifi-restaurants-batch2.ts`, `add-watamu-restaurants.ts`)
- ~25 Watamu/Kilifi posts linking into them, including `seed-blog-best-restaurants-watamu.ts`
  and `seed-blog-best-restaurants-kilifi.ts`

A subdomain would start from zero authority, compete with those pages for the same keywords,
and split signals across two versions of every restaurant. The subdirectory inherits all of it.

**Consequence:** `/eat` currently hosts the restaurant command center, which must move to
`app.klickenya.com`. CLAUDE.md already defines business tools as belonging there, so this
follows the documented architecture rather than bending it. Scheduled as part of **P2**.

---

## 3. Existing assets — what we do not rebuild

The delivery path was designed into the schema from the start and left dormant. Inventory:

| Asset | Location | State |
|---|---|---|
| `order_type` accepts `'delivery'` | `043_orders.sql:16` | CHECK already permits it |
| `orders.delivery_address / delivery_lat / delivery_lng / delivery_fee_kes` | `043_orders.sql:23-32` | Nullable, commented "V3", never written |
| `menus.delivery_enabled / delivery_radius_km / delivery_fee_kes` | `028_menu_system.sql:22-24`, healed by `072` | Present, never read |
| Payment provider interface | `apps/web/lib/payments/{index,types,paystack}.ts` | Live for tickets; `getPaymentProvider("paystack" \| "daraja")` already reserves an M-Pesa Daraja slot |
| Checkout → webhook → order-state flow | `api/events/tickets/checkout`, `api/webhooks/paystack` | Proven in production on event tickets |
| Platform commission in basis points | `PLATFORM_TICKET_FEE_BPS` env | Existing precedent for taking a cut |
| Supabase Realtime | POS shell (`components/pos/_shell/usePosStatus.ts`), `kitchen/[slug]/layout.tsx` | In production; this is the live-tracking transport |
| Device sessions without Supabase accounts | `api/pos/_lib/auth.ts`, `lib/tickets/doorSession.ts` (JWT via `POS_JWT_SECRET`) | This is the rider-app auth pattern |
| Order lifecycle + kitchen dashboard + stock auto-deduction | `062`, `063`, `StationDashboard` | Reused unchanged for the restaurant side |
| Accept/decline + live guest status page | Takeaway, migration `083`, spec `docs/superpowers/specs/2026-07-20-takeaway-ordering-design.md` | The direct template for P0 |
| Multi-restaurant discovery | Marketplace search + listing index | Reusable for P2 |
| Host-routing middleware | `middleware.ts` (partner storefronts) | The mechanism a subdomain would reuse |

**Every delivery column P0 needs already exists on disk** — the only schema gap is the missing
`out_for_delivery` status value. P0 needs no new tables.

---

## 4. Genuinely new — no precedent in this codebase

- **Riders** — no identity, table, role, onboarding, KYC, or availability model exists.
- **Dispatch** — assignment, offer/accept/timeout, reassignment, batching: all new.
- **Geo** — no PostGIS, no `earthdistance`, and no spatial index anywhere in the migration history.
  Radius checks and nearest-rider queries need a deliberate choice (see §9).
- **Consumer addresses** — guests have profiles but no saved address concept.
- **Refunds** — ticketing charges but never refunds. Delivery cancels and must refund.
- **Cash float reconciliation** — the hardest money problem here, and wholly new.
- **Ops console** — live intervention on in-flight orders.
- **Offline tolerance** — riders work on poor mobile networks; every other surface in
  this codebase assumes connectivity.

---

## 5. Sub-projects

Each is independently reviewable and, where marked, independently shippable.

### P0 — Delivery order primitive
Activate `order_type='delivery'`: address capture at checkout, delivery fee and radius
per menu, `out_for_delivery` status, restaurant accept → prepare → hand off.
**Reuses:** takeaway end-to-end as the template; kitchen dashboard; stock triggers.
**Risk:** the status enum change. `orders.status` is
`new|preparing|ready|delivered|cancelled` (`043:18`) and migrations `062`/`063` branch on
`preparing` and `delivered` for stock. Adding a status means a CHECK migration **and** a
trigger audit, plus the 12 `.from("orders")` and 7 `.from("order_items")` projections the
CLAUDE.md column-drift rule covers.
**Shippable alone:** yes — as restaurant-dispatched delivery.
**Size:** takeaway-class (1 migration, ~12 files, one branch).

### P1 — Order payments
Prepay at checkout; refund on restaurant decline, cancellation, or failed delivery.
**Reuses:** `lib/payments`, the Paystack webhook, the ticketing checkout shape.
**New:** refunds, partial refunds, and the reconciliation of a refund against an order
that may already have deducted stock.
**Shippable alone:** yes, on top of P0.
**Size:** ticketing-class, minus the scanner.

### P2 — Consumer surface (`klickenya.com/eat`)
Subdomain shell, multi-restaurant discovery and search, saved addresses, cross-restaurant
cart rules, checkout, order status.
**Reuses:** marketplace search, `/m/[slug]` cart, host-routing middleware.
**New:** consumer accounts distinct from marketplace guests, saved addresses, address →
serviceable-restaurant matching. Also moves the restaurant command center off `/eat` to
`app.klickenya.com` (see §2a).
**Scope reduction (2026-09-11):** the launch restaurants are already Sanity listings in
Watamu and Kilifi, so onboarding is flipping `delivery_enabled` and adding zones per listing.
No self-serve signup and no new identity model are needed for launch, which removes the
largest unknown originally scoped here.
**Shippable alone:** yes. **At the end of P2 there is a live, revenue-generating delivery
marketplace** with restaurants fulfilling. This is the funding gate.
**Size:** white-label-class (multi-branch, several plans).

### P3 — Rider identity + rider app
Rider records, onboarding and document capture, availability toggle, offer/accept,
proof of delivery.
**Reuses:** the POS/door JWT device-session pattern — riders should **not** need Supabase
accounts; a phone-bound device session is the right shape and already proven twice.
**New:** everything else, including offline tolerance.
**Shippable alone:** no — inert without P4.
**Size:** larger than any single feature shipped so far.

### P4 — Dispatch engine
Assignment, offer timeout and fallback, manual override, reassignment, ETA estimation.
**New:** all of it. The single highest-uncertainty item in the programme; quality here
determines unit economics.
**Shippable alone:** no.
**Size:** unknown until P3's rider model exists. Do not estimate before then.

### P5 — Live tracking
Rider GPS ingestion, throttling, and realtime fan-out to the consumer.
**Reuses:** Supabase Realtime, already proven in POS.
**New:** location ingest cadence, geo storage, battery/data cost on rider devices.
**Shippable alone:** no.

### P6 — Money and reconciliation
Rider earnings, cash float, restaurant payouts, commission ledger.
**Reuses:** `PLATFORM_TICKET_FEE_BPS` as the commission precedent; ticketing's manual
payout flow as the v1 payout shape.
**New:** float reconciliation — the genuinely hard one, and the usual failure point of
delivery businesses.
**Shippable alone:** no, but **required before the first rider is paid**, which means it
cannot be deferred to the end.

### P7 — Ops console
Live order board, manual reassignment, refunds, incident handling.
**Reuses:** the admin panel shell.
**Shippable alone:** no, but required before fleet go-live — dispatch will need human
override from day one.

---

## 6. Sequencing and funding gates

**Phase A — marketplace without fleet: P0 → P1 → P2.**
Indicative sizing at the March–July 2026 velocity (one pair; see §10): P0 1–2 weeks,
P1 2–3 weeks, P2 4–6 weeks — roughly **2–3 months**. August–September commit volume ran
4–10x lower than that period; if that is the new normal, scale accordingly.
Exit: real prepaid delivery orders flowing, restaurants fulfilling, commission collected.
*Gate: do the order volumes and margins justify buying logistics? If not, stop here — the
product is complete and sellable as it stands.*

**Phase B — fleet: P3 + P6 → P4 → P7 → P5.**
P6 is deliberately early: riders must be payable before they are dispatched. P5 is last
because live tracking is a retention feature, not a functional prerequisite — orders
deliver fine with status updates alone.
*Gate: single-city unit economics positive before expanding coverage.*

Phase A is a normal extension of this codebase. Phase B is a different kind of company.

---

## 7. Non-code dependencies

These run in parallel with Phase A, not after it. None is engineering work, and all are
on the critical path for Phase B:

- Rider contracts and employment classification
- Rider and third-party insurance
- Cash float policy, limits, and daily settlement
- Rider recruitment, training, and replacement pipeline
- Support coverage for in-flight incidents
- Restaurant commercial terms (commission rate, payout cadence)

---

## 8. Risks

| Risk | Why it matters | Mitigation |
|---|---|---|
| Status-enum change breaks stock accounting | `062`/`063` triggers branch on `preparing`/`delivered`; silent wrong stock | Trigger audit is part of P0's definition of done, with tests |
| PostgREST column drift | Documented as the cause of three production bugs | Grep every `.from("orders")` / `.from("order_items")` per the CLAUDE.md rule |
| Dispatch quality determines margin | Bad assignment burns the fleet's economics | Keep manual override (P7) from day one; do not ship dispatch without it |
| Cash float leakage | The standard way delivery businesses lose money invisibly | P6 lands before the first rider is dispatched, not after |
| Rider offline / poor network | Every other surface here assumes connectivity | Explicit offline design in P3; not an afterthought |
| Fleet capex before demand proof | Largest financial exposure in the programme | Phase A gate exists precisely for this |
| **Host-facing promise expires Q4 2026** | `features.config.ts:84` currently tells every restaurant "Coming Q4 2026 · Full delivery with live rider tracking". Q4 begins three weeks from this document's date and the programme will not deliver that scope by then | Soften the string to "Coming soon" now, independently of this programme |

---

## 9. Open decisions

Deferred deliberately; each is listed with the sub-project that forces it.

| Decision | Forced by |
|---|---|
| ~~Geo approach for P0~~ — **decided 2026-09-11: named zones with per-zone flat fees, no coordinates.** Map pins deferred to P5 when riders need navigation. See the P0 spec. | — |
| ~~Subdomain vs subdirectory~~ — **decided 2026-09-11: `klickenya.com/eat`** (§2a) | — |
| Geo approach for dispatch — lat/lng + haversine vs PostGIS vs external routing API | P4 (nearest rider) |
| Payment rail — Paystack M-Pesa vs direct Daraja integration | P1 |
| Do consumers get accounts distinct from marketplace guests, or one identity? | P2 |
| Cross-restaurant cart: single-restaurant per order, or multi? | P2 |
| Rider pay model — per delivery, hourly, or hybrid | P3 / P6 |
| Commission rate and whether restaurants can opt out of fleet delivery | P6 |
| Launch city and coverage radius | Phase B gate |

---

## 10. Sizing method

No day estimates appear in this document. Sub-projects are sized against work this team
has actually shipped, which is more honest than invented durations:

- **takeaway-class** — one migration, ~12 files, single branch, one spec (migration `083`)
- **ticketing-class** — three migrations, payments, webhooks, ledger (migrations `079`–`081`)
- **white-label-class** — multiple stacked branches and plans over weeks

P4 is deliberately unsized: it cannot be estimated before P3 defines the rider model.
Estimating it now would be fiction.

---

## Appendix — schema inventory for delivery

Dormant columns already on disk (next migration number: **085**):

```
orders.order_type            check allows 'dine_in' | 'takeaway' | 'delivery'   (043)
orders.delivery_address      text                                              (043)
orders.delivery_lat          numeric                                           (043)
orders.delivery_lng          numeric                                           (043)
orders.delivery_fee_kes      numeric default 0                                 (043)
menus.delivery_enabled       boolean default false                        (028, 072)
menus.delivery_radius_km     numeric                                           (028)
menus.delivery_fee_kes       numeric                                           (028)
```

Needed and absent:

```
orders.status                no 'out_for_delivery' — CHECK at 043:18, triggers at 062/063
riders                       no table
rider_sessions               no table
dispatch_offers              no table
rider_locations              no table
consumer_addresses           no table
refunds                      no table
rider_earnings / float       no table
geo                          no PostGIS, no earthdistance, no spatial index
```
