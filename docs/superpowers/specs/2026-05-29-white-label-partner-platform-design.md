# Klickenya White-Label Partner Platform — Design

**Date:** 2026-05-29
**Status:** Approved design, pending implementation plan
**Author:** Patrik Giuliana (with Claude)

## 1. Purpose

Reuse Klickenya's engine and backend to launch branded websites for partner
businesses (first client: a short holiday rental agency). Each partner gets a
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

### First client (holiday rental agency)
- **Enabled modules:** `stays`, `tours` only.
- **Disabled:** events, and the entire restaurant suite (menu, POS, kitchen,
  stock).
- **Allowed listing types:** `stay` (and `rental` if needed), `experience`.

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
3. **Storefront starter** — build the starter template app + shared package
   (BFF → Klickenya availability/booking APIs + Sanity partner-filtered
   content). Includes search, listing detail, availability calendar, booking.
4. **Onboard client #1** — create partner doc, theme, host account, listings;
   deploy storefront to their domain; dashboard at `admin.client.com`; set
   cross-list toggles.
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
storefront starter template + shared package; per-storefront SEO.

## 14. Out of scope (for now)

- Payment integration (M-Pesa/Paystack) — inherits whatever Klickenya has;
  not built here.
- Reviews/ratings, iCal sync, and other Klickenya roadmap items unless a
  partner specifically requires them.
- A bespoke per-partner dashboard (explicitly rejected in favor of theme-reuse).
