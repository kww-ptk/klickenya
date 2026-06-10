# Klickenya White-Label Partner Platform — Design

**Date:** 2026-05-29 (revised 2026-06-10)
**Status:** Approved design, pending implementation plan
**Author:** Patrik Giuliana (with Claude)

> **Revision 2026-06-10 — storefront templating + restaurant-first.** Four
> refinements, detailed in §15. The foundation (§4–§7: partner record, theming,
> dashboard reuse, BFF) is unchanged.
> 1. The storefront is a **library of templates**, not one re-skinned layout.
> 2. A template is chosen **per listing type** — one partner site can mix a stay
>    template and a restaurant template under one brand/domain — mirroring the
>    dashboard's existing per-type / per-capability branching.
> 3. **Client #1 is now a restaurant / hospitality partner** (not the holiday
>    rental agency), so `restaurant` is in `enabledModules` and the **restaurant
>    template is the first one built**. The rental-agency profile in §4a is
>    retained as a future partner example.
> 4. The restaurant template is **reserve-a-table + view-menu**, reusing the
>    already-public `POST /api/menu/reservations` and the `/m/[slug]` menu data
>    path; the reservation notification email becomes **partner-aware**.

## 1. Purpose

Reuse Klickenya's engine and backend to launch branded websites for partner
businesses (first client: a restaurant / hospitality partner — see the
2026-06-10 revision and §15; the engine is identical for the holiday-rental
profile in §4a). Each partner gets a
fully branded public storefront and a branded dashboard, while availability,
pricing, and bookings are shared with Klickenya's existing backend — no data
syncing. The model must scale to many partners and reinforce the Klickenya
brand via a "Powered by Klickenya" association and optional cross-listing.

## 2. Decisions locked during brainstorming

1. **Inventory model:** A partner's storefront shows **only that partner's own
   listings**. The partner is effectively a branded host riding on Klickenya's
   booking engine.
2. **Operations:** The partner gets a **fully branded dashboard** — they never
   see "Klickenya" branding in their own management tools.
3. **Scale:** Build for **many partners**, not a one-off.
4. **Domain:** Each partner uses **their own domain** (e.g. `client.com`).
5. **Cross-listing:** **Per-listing toggle** — the partner decides which of
   their listings also publish onto the klickenya.com marketplace.
6. **Architecture:** **Approach B** — a **separate frontend app** that uses
   Klickenya as a headless backend (no syncing), with a **fresh copy per
   client** for the public storefront.
7. **Dashboard delivery:** **Reuse Klickenya's existing dashboard**,
   theme-swapped per domain. No rebuild.

## 3. Architecture overview — two surfaces

Each client gets two branded surfaces, delivered two different ways:

| Surface | URL | What it is | How it's built |
|---|---|---|---|
| **Public storefront** | `client.com` | Home, search, listing detail, availability, booking | **New** lightweight Next.js app, **fresh copy per client** from a shared starter template. Uses Klickenya as a headless backend. |
| **Dashboard** | `admin.client.com` | Manage listings, calendar, pricing, bookings, enquiries | **Reused** Klickenya host dashboard, **theme-swapped** by incoming domain. No rebuild. |

Klickenya itself remains the **house brand**: the default tenant, identified by
the absence of a partner. Existing Klickenya data and behavior are untouched.

### Rationale
- The storefront is the asset the client owns, brands, and shows off — so it is
  a clean, separate, lightweight app.
- The dashboard is an internal operational tool — theme-and-reuse of the proven
  Klickenya dashboard is far cheaper than rebuilding 40+ routes per client and
  avoids version skew on critical booking/PMS logic.

## 4. The partner record (single source of truth)

A new **Sanity `partner` document type** holds everything that varies per
client. It drives the storefront theme, the dashboard theme, and email
branding.

Fields:
- **Identity:** name, slug, `domains[]` (storefront + admin hostnames), logo,
  favicon
- **Theme tokens:** brand colors, font families, border radii — mapped onto the
  CSS custom properties already defined in `apps/web/app/globals.css`
  (`--color-amber`, `--color-purple`, `--font-display`, `--font-body`, radii,
  etc.)
- **Content:** contact email/phone, footer text, social links, default
  region/city
- **Flags:** "Powered by Klickenya" badge on/off
- **Enabled modules:** the set of Klickenya capabilities this partner uses
  (e.g. `stays`, `tours`, `events`, `restaurant`). Drives feature scoping — see
  section 4a.
- **Allowed listing types:** which `listing.type` values this partner can
  create (subset of `stay`, `experience`, `event`, `rental`, `service`).

Adding a partner = creating one `partner` document plus operational setup
(section 9).

## 4a. Feature scoping per partner

Klickenya is feature-rich (property PMS, QR menu, POS, kitchen, stock, events,
real estate). **A partner must only ever see the modules relevant to them.** A
holiday-rental agency, for example, must never see QR-menu/POS/kitchen/stock.

This is distinct from the gating that already exists. Today the dashboard gates
features **per listing**: `apps/web/app/dashboard/listings/[id]/layout.tsx`
defines `DEPLOYED_SEGMENTS` + `getActiveTabs`, and the listing hub branches on
`listing.type` (`stay`/`rental` vs restaurant) and per-listing capability flags
(`reservations_enabled`, `ordering_enabled`, `stock_enabled`, etc.). White-label
adds a higher level: gating **per partner**.

The `enabledModules` set on the partner record gates three things:
1. **Dashboard top-level nav** — the global dashboard routes (`menu`, `menus`,
   `events`, `property`, `enquiries`, `stats`, `settings`, etc.) are filtered to
   the partner's enabled modules. Implemented by extending the existing
   `DEPLOYED_SEGMENTS`/`getActiveTabs` gating from per-listing to also
   per-partner.
2. **Allowed listing types** — listing creation/import is restricted to the
   partner's `allowedListingTypes`, so an agency host can only create stays and
   experiences.
3. **Storefront surfaces** — the storefront only renders the categories/listing
   types the partner is enabled for (search filters, nav, listing pages).

### Client #1 (revised 2026-06-10) — restaurant / hospitality
- **Enabled modules:** `restaurant` (and `stays` if the venue also has rooms).
- **Disabled in public:** the back-office restaurant pieces are never exposed on
  the storefront — POS, kitchen, and stock stay dashboard/in-venue only. The
  storefront shows only reservations + menu (see §15).
- **Allowed listing types:** the dining listing type(s) (+ `stay` if the venue
  has rooms). Restaurant identity is "a listing with a linked `menus` row,"
  matching the dashboard's own resolution.

### Future partner profile — holiday rental agency
- **Enabled modules:** `stays`, `tours` only.
- **Disabled:** events and the entire restaurant suite.
- **Allowed listing types:** `stay` (and `rental` if needed), `experience`.
- Retained as the second profile/template to build (stay template + enquiry
  template); no longer client #1.

### Caveat — tours/experiences booking
Klickenya's booking engine (`properties`/`rooms`/availability RPCs) is built for
**stays**. Experiences/tours exist as a listing type but may not have a
date/availability booking flow yet. For this client, tours are likely
**enquiry-based** (contact/booking request) rather than calendar-bookable until
a tour availability model is added. The implementation plan must confirm the
tour booking flow before promising calendar availability for tours.

## 5. Data model changes (small, additive, non-breaking)

### Sanity
- `listing` schema (`apps/studio/schemas/listing.ts`): add
  - `partner` — reference to a `partner` doc. **Empty = Klickenya house brand.**
  - `publishToMarketplace` — boolean. The per-listing cross-list toggle.

### Supabase
- Add **partner linkage** so a logged-in host resolves to their partner. This
  powers:
  - dashboard theming (resolve the partner from the host or the incoming
    domain),
  - booking attribution (a booking made on a partner storefront is owned by the
    partner's host),
  - branded transactional emails.
- **Source of truth:** a `partner_id` column on `host_profiles`. A host belongs
  to exactly one partner (empty = Klickenya house brand). Properties derive
  their partner via their owning host.
- **Denormalization (only if needed):** add `partner_id` to `properties` if
  marketplace/attribution queries need to filter by partner without a join.
  Default to *not* adding it until a query demands it (avoids extra
  projection-drift surface).

### Schema-projection discipline (CLAUDE.md rule)
After any `ALTER TABLE ADD COLUMN`, grep every `.from("TABLE")` call and update
each `.select()` projection that must expose the new column:
```
grep -rn '\.from("properties")' apps/web --include='*.ts' --include='*.tsx'
grep -rn '\.from("host_profiles")' apps/web --include='*.ts' --include='*.tsx'
```
This rule has caused production bugs before; treat it as mandatory.

### Backward compatibility
Existing Klickenya listings have no `partner` (house brand) and appear on the
marketplace exactly as today. No backfill required.

## 6. Data flow

### Storefront → backend (no CORS)
The storefront's own Next.js server is a thin **backend-for-frontend (BFF)**.
All calls to Klickenya happen server-to-server, so there is **no cross-origin
problem**. The BFF calls:
- **Content:** Sanity directly, filtered to `partner == thisClient`. Sanity is
  already a headless content API (GROQ over CDN/HTTP).
- **Availability / price:** the existing public, no-auth endpoint
  `apps/web/app/api/properties/availability-by-slug/route.ts` (keyed by Sanity
  `listing_slug` → Supabase `properties`/`rooms`, via the `is_room_available`
  RPC).
- **Booking:** POST server-to-server to a Klickenya booking endpoint
  (`/api/properties/bookings` / `create_booking_with_payment` RPC or an
  enquiry endpoint). The booking lands in the shared Supabase, attributed to
  the partner's host, and surfaces in the partner's themed dashboard.

### Cross-listing onto klickenya.com
The marketplace listing query becomes:
> house listings **OR** partner listings where `publishToMarketplace == true`.

Concretely, the default marketplace GROQ filter is roughly
`!defined(partner) || publishToMarketplace == true`, so **non-flagged partner
inventory never leaks** onto klickenya.com. Bookings of cross-listed inventory
remain attributed to the partner.

## 7. Theming mechanism (nearly free)

`apps/web/app/globals.css` already defines the entire UI through CSS variables
in an `@theme inline` block (colors, fonts, radii, shadows). Both surfaces
inject a small `<style>` block derived from the partner doc that overrides
those variables at `:root`. **No component changes are required to re-skin.**

- **Storefront:** the partner app reads its own partner doc and injects the
  theme in its root layout.
- **Dashboard:** the Klickenya app resolves the partner by incoming domain (or
  by the logged-in host's partner) and injects the same overrides on dashboard
  routes; the wordmark/logo is replaced with the partner's.
- **Fonts:** loaded via a CSS `@font-face` / Google Fonts `<link>` sourced from
  the partner doc — **not** `next/font`, which is build-time only and cannot
  take arbitrary per-tenant fonts at runtime.

## 8. Maintainability of "fresh copy per client"

To prevent N storefront copies from diverging and rotting:
- Shared logic (Klickenya API client, booking widget, availability calendar,
  search UI, listing card/detail) lives in a **shared package** in the
  monorepo.
- Each client storefront is a **thin shell** that imports the shared package
  and supplies config (partner slug, API base URL, theme source).
- A bugfix or feature is a **version bump** of the shared package, not N
  hand-edits.
- "Fresh copy" therefore preserves per-client isolation and the ability to hand
  over or fork a single client, without maintaining N fully divergent
  codebases.

## 9. Operational steps to onboard a client

A repeatable checklist, not a build:
1. Create the Sanity `partner` doc (identity, theme, domains, flags).
2. Create the partner's host account (or link an existing one) and set the
   partner linkage in Supabase.
3. Create/import the partner's listings (Sanity), linked to the partner; mark
   any cross-listed ones with `publishToMarketplace`.
4. Add the partner's storefront and admin domains to **Supabase OAuth redirect
   URLs** and any auth/site-URL config that must be tenant-aware.
5. Point DNS: `client.com` → storefront app; `admin.client.com` → Klickenya
   dashboard.
6. Deploy the storefront (fresh copy from the starter template) with the
   partner config.

## 10. Rollout phases

1. **Partner data model** — Sanity `partner` doc type + `listing.partner` +
   `publishToMarketplace`; Supabase partner linkage. Verify the klickenya.com
   marketplace is unchanged for house listings.
2. **Dashboard white-labeling + feature scoping** — per-domain (or per-host)
   theme resolution + auth on the partner admin domain + partner-aware
   transactional email branding, plus per-partner module gating (nav + allowed
   listing types) via the extended `DEPLOYED_SEGMENTS`/`getActiveTabs`
   mechanism. All on the existing dashboard.
3. **Storefront + template registry** — build the shared package with a
   **template registry keyed per listing type** (§15) and a thin client shell.
   The **first template built is `restaurant`** (reserve-a-table + view-menu),
   reusing `POST /api/menu/reservations` + the `/m/[slug]` menu data path.
   BFF → Klickenya APIs + Sanity partner-filtered content.
4. **Onboard client #1 (restaurant / hospitality)** — create partner doc, theme,
   host account, restaurant listing + linked menu; deploy storefront to their
   domain; dashboard at `admin.client.com`; set cross-list toggles.
5. **Polish** — per-storefront SEO (sitemap, robots, OG, favicon), "Powered by
   Klickenya" footer, booking attribution + analytics.

## 11. Testing & verification

- **Marketplace regression:** after the data-model change, confirm house
  listings still render and that non-flagged partner listings do **not** appear
  on klickenya.com. Apply the schema-projection grep discipline.
- **Theme/data isolation:** client A's dashboard never shows client B's brand
  or data. Data isolation already exists via Supabase RLS + per-host ownership;
  theming must additionally be keyed per partner (cache keys/tags included to
  avoid cross-tenant bleed).
- **Booking round-trip:** a booking made on a partner storefront lands in the
  correct host's dashboard with a correctly **branded confirmation email**.
- **Mobile-first / iOS Safari:** per CLAUDE.md, verify storefront and themed
  dashboard on iPhone Safari before declaring done (16px min inputs, etc.).

## 12. Risks & mitigations

- **Schema projection drift** (CLAUDE.md) — mandatory grep after column adds.
- **CORS** — avoided entirely via the storefront BFF (server-to-server calls).
- **Cross-tenant cache bleed** — include the partner in cache keys/tags
  (Sanity `revalidate`, any `unstable_cache` usage).
- **Dynamic per-tenant fonts** — use CSS/Google-Fonts links, not `next/font`.
- **Auth redirect URLs** — each new partner domain must be added to Supabase
  allowed OAuth redirect URLs.
- **"Fresh copy" maintenance burden** — mitigated by the shared package +
  starter template; document a divergence policy.
- **Booking attribution & email branding** — must reliably resolve the partner
  from the property/host context at booking time.

## 13. Reused vs new

**Reused (little/no change):** booking engine + `create_booking_with_payment` /
`is_room_available` RPCs, Supabase schema (plus partner linkage), Sanity content
+ Studio, public availability API, the entire host dashboard (themed), listing
detail data, and UI components/logic (via the shared package).

**New:** the `partner` Sanity schema (incl. `enabledModules` +
`allowedListingTypes`); `listing.partner` + `publishToMarketplace` fields;
partner linkage in Supabase; per-domain theme/auth/email branding for the
dashboard; **per-partner feature/module gating** (extending
`DEPLOYED_SEGMENTS`/`getActiveTabs`); tenant-aware marketplace GROQ; the
storefront **template registry** + shared package (per-listing-type layouts,
restaurant template first — §15); **partner-aware reservation notification
email**; per-storefront SEO.

## 14. Out of scope (for now)

- Payment integration (M-Pesa/Paystack) — inherits whatever Klickenya has;
  not built here.
- Reviews/ratings, iCal sync, and other Klickenya roadmap items unless a
  partner specifically requires them.
- A bespoke per-partner dashboard (explicitly rejected in favor of theme-reuse).
- **Public online ordering / pickup / delivery** on the restaurant storefront —
  the restaurant template is reserve-a-table + view-menu only; POS/ordering stay
  in-venue/staff-facing (revised 2026-06-10).
- **Per-listing or fully bespoke storefront layouts** — templates attach per
  listing *type*, not per individual listing.

## 15. Storefront templating — per listing type (revision 2026-06-10)

The storefront is a **library of templates**, not a single re-skinned layout.
This refines §3 and §8 (the storefront surface). The foundation (§4–§7: the
`partner` record, theming, dashboard reuse, and the BFF) is unchanged.

### 15.1 Template scope — per listing type
A template attaches to a **listing type**, not to a partner or an individual
listing. One partner site, at one domain and one brand, can therefore render a
**stay** listing with the stay template and a **restaurant** listing with the
restaurant template. This mirrors a pattern Klickenya already has on the
dashboard: `apps/web/app/dashboard/listings/[id]/layout.tsx` branches on
`listing.type` (`stay`/`rental` → property PMS) and otherwise resolves a linked
`menus` row (restaurant), then reads capability flags (`reservations_enabled`,
`ordering_enabled`, …) off the menu. The storefront reuses the same resolution
so there is **one source of truth** for "what kind of thing is this listing."

### 15.2 Template registry (the architecture choice)
Templates live in the **shared package** as a registry:

```
packages/storefront/templates/
  stay/        → <ListingPage>, <BookingWidget>   (calendar + create_booking_with_payment)
  restaurant/  → <ListingPage>, <BookingWidget>   (reservations + menu)
  experience/  → <ListingPage>, <EnquiryWidget>   (enquiry-based)
```

Each template exports components against a **common interface**
(`{ listing, partner, backend }`). The storefront's `[slug]` route calls
`resolveTemplate(listing)` (the shared per-type/per-capability logic from 15.1)
and renders `registry[key]`. **Adding a template = adding a folder**; client
shells never change. A bespoke per-client page approach is rejected for the same
reason §2/§14 reject a bespoke dashboard — it does not scale to many partners.

### 15.3 Restaurant template (first one built)
Scope: **reserve-a-table + view-menu**. Both halves reuse proven, already
guest-callable backends — almost no new backend is required:

- **View menu** — mirror the data path of the existing public QR page
  `apps/web/app/m/[slug]/page.tsx`.
- **Reserve a table** — `POST /api/menu/reservations`
  (`apps/web/app/api/menu/reservations/route.ts`). The POST handler has **no
  auth gate** and already accepts `source: "listing" | "direct"`; the storefront
  posts server-to-server with `source: "direct"` (or a new `"partner"` value).
  It already validates `reservations_enabled`, lead time, max party size, max
  advance days, time windows, and area selection server-side.
- **Resolution chain:** partner → Sanity restaurant listing (filtered by
  `partner`) → `listing_slug` → `menus.id` (the `menu_id` the reservation POST
  needs).
- **Bookable slots:** the create path is public, but rendering *available* slots
  needs the menu's reservation settings + `reservation_time_windows` readable
  from the storefront. Confirm `/api/menu/settings` + `/api/menu/time-windows`
  are guest-readable, or add a small public read endpoint (Plan 4).
- **Explicitly NOT public:** POS / table ordering, kitchen, and stock stay
  dashboard/in-venue only (see §14).

### 15.4 Partner-aware reservation email (new task)
The reservation notification email in `POST /api/menu/reservations`
(`reservationNotificationHtml` + `sendHostNotification`) is currently
hard-branded Klickenya: the wordmark, the amber `#E8A020` header, the
`bookings@klickenya.com` from-address, the `© Klickenya` footer, and a
`klickenya.com/dashboard/...` action link. For a white-label partner these must
resolve from the `partner` record (logo/wordmark, primary colour, from-name, and
an `admin.client.com/...` dashboard URL). This lands with the dashboard
email-branding work in Phase 2 / Plan 3.

### 15.5 Plan-time confirmations
1. Guest-readable reservation settings / time-windows for slot rendering (15.3).
2. The exact `listing.type` / subcategory a dining listing uses, so
   `resolveTemplate()` keys correctly — though keying off "has a linked menu"
   (as the dashboard does) is the safer default.
