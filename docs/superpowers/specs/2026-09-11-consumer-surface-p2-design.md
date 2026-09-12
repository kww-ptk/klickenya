# Consumer Surface (P2) — Design Spec

Date: 2026-09-11 · Branch: `feat/eat-consumer-surface` · Migration: **087**
Programme: `docs/food-delivery-program-plan.md` — **P2 of Phase A**. Depends on P0 (`085`) and P1 (`086`).

## What we're building

Three things:

1. **Ordering moves onto the restaurant pages that already rank** —
   `/restaurants/watamu/<slug>` gains a working cart, instead of the read-only menu it shows today.
2. **`/eat` becomes the delivery discovery layer** — a home page and city hubs
   (`/eat/watamu`, `/eat/kilifi`) that filter by delivery, cuisine and open-now, and link into
   those canonical restaurant pages.
3. **The restaurant command center vacates `/eat`** and moves to `app.klickenya.com`.

No new restaurant pages are created. There is exactly one canonical page per restaurant, and
it is the one Google already knows about.

## Decisions made (with the user)

1. **Order on the existing pages.** `/eat` never gets its own `/eat/[city]/[slug]` restaurant
   pages — that would split ranking signals against the pages that are the whole reason we
   chose a subdirectory over a subdomain.
2. **Phone-only guest checkout.** No signup wall. Name, phone, zone, landmark — the same
   fields P0 already collects. An account is offered *after* ordering, never before.
3. **Addresses in the browser.** Saved addresses live in `localStorage` for everyone. A
   `delivery_addresses` table is deferred until there is demand for it.
4. **Orders link to a user when one happens to be signed in**, so order history works without
   ever requiring an account.

## The static-page problem — read this first

`/restaurants/[city]/[slug]` is `force-static` with `revalidate = 3600`
(`(listings)/[type]/[city]/[slug]/page.tsx:24`). That is correct for SEO and wrong for
commerce: an item marked unavailable can stay orderable for **up to an hour**. With P1
prepayment that means charging a guest for food that does not exist, then refunding over
M-Pesa across several days.

By contrast `/m/[slug]` runs `revalidate = 60`.

**Three layers of defence, all required:**

1. **Live availability on cart open.** The static page renders the menu for SEO; opening the
   cart fetches current `is_available` and prices from a small dynamic endpoint and reconciles
   the cart against it.
2. **Server-side validation at POST.** `/api/orders` must reject unavailable items explicitly,
   not merely check that the item exists. This is the authoritative gate.
3. **Re-check before payment.** For online orders, availability is verified immediately before
   `initialize()` is called — never charge first and validate after.

Do **not** solve this by lowering `revalidate` on the listing page. That trades ranking
stability for a problem that layer 2 already solves correctly.

## Ordering on the restaurant page

The page already fetches the Supabase menu and renders `MenuDisplay` (194 lines, read-only),
and already wires `ReservationSheet`. What is missing is the cart.

**The blocker: `MenuWithCart` is 990 lines** and P0 adds delivery to it while P1 adds payment
method and redirect handling. Embedding it in a second host page as-is would make it the
largest and most fragile component in the codebase.

**P2 splits it first**, as a prerequisite commit with no behaviour change:

- `useCart` — cart state, totals, option handling
- `CheckoutPanel` — order-type picker, customer fields, payment method, submit
- `MenuItems` — the rendering both surfaces share

`MenuDisplay` and `MenuWithCart` also declare **two different `MenuData` shapes**. P2
reconciles them onto one type in `packages/shared` rather than adding a third.

Only after the split does the listing page mount the cart, shown when the menu has
`delivery_enabled` or `takeaway_enabled`.

## `/eat` discovery layer

| Route | Purpose | Rendering |
|---|---|---|
| `/eat` | Delivery home — cities served, featured restaurants | static, `revalidate = 3600` |
| `/eat/[city]` | City hub — restaurants delivering in that city, cuisine and open-now filters | static, `revalidate = 3600`, `generateStaticParams` |

Both mirror the existing city pages exactly: `force-static`, hourly revalidate, generated
params. Every restaurant card links to `/restaurants/[city]/[slug]` — **never** to a `/eat`
detail page, because none exists.

**SEO:** `/eat` and `/eat/[city]` enter `sitemap.ts`. Each city hub carries its own title and
description targeting delivery intent ("food delivery in Watamu") — distinct from the existing
`/restaurants/watamu` page, which targets browsing intent. `JsonLd` gets an `ItemList` of
restaurants. The ~25 existing Watamu and Kilifi posts should link into these hubs; that is
content work, tracked separately, not code.

**Only restaurants with `delivery_enabled` and at least one active zone appear.** A city with
none renders an honest empty state, never a 404.

## Command center move

`/eat` currently hosts the restaurant command center. It moves to `app.klickenya.com`, which
CLAUDE.md already designates for business tools.

**This is blocked by a middleware bug and must be fixed first.** `isHouseHost()`
(`lib/storefront/houseHost.ts`) returns `true` only for `klickenya.com`, `www`, `localhost`
and `*.vercel.app`. Everything else is treated as a partner storefront and rewritten into
`/storefront`. Today `app.klickenya.com` would be rewritten into the storefront tree and break.

Order of work, non-negotiable:

1. Teach `isHouseHost()` that `app.<siteHost>` is a house host, with tests.
2. Add the domain in Vercel and DNS.
3. Move the `/eat` command-center routes to the new host.
4. Redirect old `/eat/*` command-center URLs to `app.klickenya.com/*` — hosts have these
   bookmarked and on their phones.
5. Only then land the consumer `/eat` routes.

Doing 5 before 4 serves a consumer page to a restaurant owner expecting their dashboard.

## Schema — migration `087_order_user_link.sql`

```sql
alter table orders add column if not exists guest_user_id uuid
  references auth.users(id) on delete set null;
create index if not exists idx_orders_guest_user_id on orders(guest_user_id);
```

Mirrors `040` (bookings) and `042` (contact_requests) exactly, including the RLS policy
letting a signed-in user read their own orders. Null for guest orders, which is the common case.

No `delivery_addresses` table. `localStorage` covers saved addresses for both signed-in and
anonymous guests; adding a table now would be schema written against a guess.

## Column drift

`orders` gains one column. Sweep the 12 `.from("orders")` call sites per the CLAUDE.md rule;
only the guest-history query needs `guest_user_id` in its projection, but confirm rather than
assume.

## API changes

- **`GET /api/menu/availability?menu_id=`** (new, public) — current `is_available` and prices.
  Small, cacheable for seconds, called on cart open. Exists specifically to serve live truth
  to a statically rendered page.
- **`POST /api/orders`** — rejects unavailable items with a message naming them; attaches
  `guest_user_id` when a session exists.
- **`GET /api/eat/restaurants?city=`** (new, public) — restaurants delivering in a city, for
  the hub filters.

## UI

**Restaurant page** — cart mounts when delivery or takeaway is enabled. Reservation stays
exactly where it is; ordering and booking a table are different intents and must not compete
for the same button.

**`/eat` hubs** — restaurant cards with cuisine, delivery zones served and open-now state.
Filters are client-side over the statically rendered set, so filtering never costs a request.

**Checkout** — unchanged from P0 and P1 apart from an address picker reading `localStorage`.

**Post-order** — the status page offers account creation to keep order history. Dismissible,
never blocking, never shown before the order is placed.

All inputs 16px minimum. Every new route gets a `loading.tsx` skeleton (project rule).

## Edge cases

- **Stale static page, item withdrawn** — caught at cart open, again at POST, again before
  payment. Layer 2 is authoritative.
- **Restaurant disables delivery while a guest browses a cached page** — POST rejects; the
  cart explains rather than failing silently.
- **City hub with no delivering restaurants** — honest empty state, page still returns 200.
- **Host hits an old `/eat` command-center URL** — redirected to `app.klickenya.com`.
- **`localStorage` unavailable** (private browsing) — address fields work, they just do not
  persist. Never block ordering on storage.
- **Signed-in user orders** — `guest_user_id` attaches; nothing else changes.

## Testing

- Component split is behaviour-neutral: `/m/[slug]` dine-in, takeaway and P0 delivery all
  regression-pass before the listing page mounts anything.
- Availability: an item switched unavailable is rejected at POST even when the static page
  still shows it; online orders re-check before `initialize()`.
- `isHouseHost`: `app.klickenya.com` is a house host; partner domains still rewrite to
  `/storefront`; `localhost` and `*.vercel.app` unchanged.
- `/eat/[city]`: only delivering restaurants listed; empty city returns 200; cards link to
  `/restaurants/[city]/[slug]`.
- Sitemap includes `/eat` and each city hub.
- Guest order with no session stores null `guest_user_id`; signed-in order attaches it.
- iPhone Safari pass on the listing-page cart and both hubs.
- Verify on the dev preview URL before promoting dev → main.

## Out of scope (explicit)

`/eat/[city]/[slug]` restaurant pages — deliberately never built. A `delivery_addresses`
table. Multi-restaurant carts. Scheduled ordering. Ratings and reviews. Search across cities.
Push notifications. Everything fleet-related (**P3–P7**). Content work linking the existing
blog posts into the new hubs, which is editorial rather than code.
