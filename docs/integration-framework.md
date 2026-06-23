# Klickenya Integration Framework — Review & Development

> Technical audit, integration report, proposed architecture, proof of concept,
> and development roadmap for embedding Klickenya services (reservations,
> bookings, menus, PMS) into external websites.
>
> Author: engineering · Status: PoC delivered, design approved-pending · Date: 2026-06-22

---

## 0. Executive summary

Klickenya already ships a **working iframe embed layer** for restaurants:
menu, reservations, and a combined "menu + booking" widget, all generated from
the host dashboard as a one-line `<iframe>` snippet. It is live, themable, and
attributes bookings back to the embedding site.

The goal of this project is to evolve that from *hand-pasted iframes* into a
**modern, script-driven embed framework** — the `embed.js` + `data-*` attribute
pattern named in the brief — and to extend coverage to **property / PMS
booking**, which today has a public widget (`/b/[slug]`) but **no embeddable
surface**.

The headline findings:

| Area | State today | Gap |
|---|---|---|
| Restaurant menu embed | ✅ Live (`/embed/menu/[slug]`) | Fixed-height iframe; no loader |
| Reservation embed | ✅ Live (`/embed/reservations/[slug]`) | No parent-side auto-resize |
| Menu + booking combo | ✅ Live (`/embed/restaurant/[slug]`) | — |
| Property / PMS embed | ✅ Built (PoC) | `/embed/booking/[slug]` + `/api/properties/booking-enquiry` added this PR; framable, themed, attributed |
| `embed.js` loader | ❌ None | Brief's core ask; **delivered as PoC here** |
| Auto-resize | ⚠️ Half-built | Child emits `klickenya:resize`, nothing listens |
| Domain allowlist | ❌ `frame-ancestors *` | Any site can embed any business |
| Rate limiting on embed POST | ❌ None on `/api/menu/reservations` | Pattern exists elsewhere, not applied |
| Public SDK / API docs | ❌ None | APIs are internal-shaped |

**The PoC in this PR** (`apps/web/public/embed.js`) implements the brief's exact
target syntax against the *existing* `/embed/*` routes, adding the missing
auto-resize bridge with zero backend changes. It proves the architecture end to
end and is the recommended foundation for V1.

---

## Phase 1 — Codebase analysis

### Stack & topology
- **Next.js 15 App Router** monorepo (`apps/web`, `apps/studio`,
  `packages/shared`, `packages/database`).
- **Content** in Sanity, **transactions/dynamic data** in Supabase (Postgres +
  PostgREST + RLS). Hard separation — never mixed.
- **Email** Resend · **CRM** GHL webhooks · **AI** Anthropic API.
- Hosting on Vercel. `main` → production (`klickenya.com`), `dev` → staging.

### Routing model (relevant to embedding)
Middleware (`apps/web/middleware.ts`) does three things that matter here:
1. **`/embed/*`** is special-cased *first*: sets
   `Content-Security-Policy: frame-ancestors *`, deletes `X-Frame-Options`, and
   skips the Supabase session entirely. This is what makes third-party framing
   work at all.
2. **Partner-host rewrite**: any non-house host is rewritten into the
   `/storefront` route tree — this is the existing **white-label storefront**
   (`/w/[slug]` and custom domains), already serving the brief's "business runs
   a static site, Klickenya powers it" end goal for restaurants.
3. **House-host auth gating** for `/dashboard`, `/admin`, `/profile`, `/eat`.

### Data surfaces consumed by embeds
- **Menus**: `menus`, `menu_sections`, `menu_items` (read via `adminClient`,
  service-role, RLS-bypassing — embeds are anonymous).
- **Reservations**: `restaurant_areas`, `reservation_time_windows`, written via
  `POST /api/menu/reservations` with `source='embed'`.
- **PMS / property**: `properties`, `rooms`, availability via
  `is_room_available` RPC; bookings via `create_booking_with_payment()` RPC.

### Key observation — the "schema projection" hazard (from CLAUDE.md)
Embeds read through hand-written `.select()` projections in multiple places.
PostgREST returns 400 (→ silent null) on a stale projection, degrading the
embed to an empty state. Any new embed-exposed column **must** be added to every
projection — see CLAUDE.md "When you add a column" and the
`order_items.station` regression. The framework should **centralize embed
projections into shared constants** to remove this class of bug.

---

## Phase 2 — Existing integration review (iframe embeds)

### What exists
Three server-rendered routes under `apps/web/app/embed/`, each with a
`force-dynamic` page + a `"use client"` presentational wrapper:

| Route | Purpose | Notes |
|---|---|---|
| `/embed/menu/[slug]` | View-only menu | Not the QR ordering page; no cart/pay |
| `/embed/reservations/[slug]` | Table booking form | Writes via `/api/menu/reservations` |
| `/embed/restaurant/[slug]` | Menu + booking combo | Default when reservations on |

Snippet generators in the dashboard:
`components/dashboard/menu/MenuEmbedPanel.tsx` and `ReservationsEmbedPanel.tsx`.
Both produce:

```html
<iframe src="https://klickenya.com/embed/<kind>/<slug>?theme=…&accent=…&bg=…&ref=…"
        style="width:100%;height:900px;border:0"></iframe>
```

### Capabilities (strengths)
- **Themable** via query params: `theme` (light/dark), `accent` (hex), `bg`
  (white/transparent/hex), all server-sanitized.
- **Attribution**: `source_origin` derived from the `Referer` header
  server-side (un-forgeable by the embedder's JS) + `source_ref` campaign tag.
  Surfaced in the reservations dashboard.
- **SEO-safe**: `robots: noindex` on the embed layout — avoids duplicate-content
  penalties across thousands of embedder pages.
- **CMS-fresh**: `dynamic = "force-dynamic"`, so owner edits appear on next load.
- **Works anywhere**: Squarespace, Wix, Webflow, WordPress, plain HTML.

### Limitations (the gaps this project closes)
1. **No loader / single entry point.** Each widget is a separate hand-pasted
   iframe with a *guessed fixed height* (`900px` menu, `680px` reservations).
   The brief explicitly wants the `embed.js` + `data-*` model instead.
2. **Auto-resize is half-wired.** Every embed child *emits*
   `postMessage({ type: "klickenya:resize", height })` on a `ResizeObserver`,
   but **no script on the parent side consumes it** — so in practice embedders
   are stuck with a fixed height (scrollbars or dead space on mobile). This is
   the single highest-leverage fix and the PoC addresses it.
3. **`frame-ancestors *` — no per-business allowlist.** Any site can frame any
   business's widget. Acknowledged in middleware as "deferred to V1.5". Fine for
   launch posture (matches Calendly/Resy), but needed before billing/abuse
   controls.
4. **No rate limiting** on the embed-reachable `POST /api/menu/reservations`.
   An in-memory limiter pattern exists on `/api/contact`, `/api/search`, etc.,
   but is not applied to the reservation endpoint — the most abusable embed path.
5. **Responsiveness** relies on the iframe's *own* inner width
   (`EmbeddedRestaurant` reads `window.innerWidth` to pick layout) — correct,
   but only works because the iframe is full-width. A narrow container breaks
   the layout heuristic. The loader should pass container width as a hint.
6. **No versioning / cache strategy** for the embed contract. Query-param API is
   implicit and undocumented.

---

## Phase 3 — PMS expansion analysis

### Property model today
- `properties` (with `listing_slug`, `booking_slug`, `entire_place_price`,
  `renting_type`), `rooms` (price, capacity, photos, `sanity_room_key`),
  `property_fees` / `booking_fees`, `ical_feeds` (dormant — no sync engine).
- **Availability**: `GET /api/properties/availability-by-booking-slug` →
  per-room `is_room_available` RPC. Public, anonymous-safe. ✅
- **Public widget**: `/b/[slug]` renders `<BookingWidget>` on a **chrome-free
  standalone page** (its own bare `<html>/<body>`, no site header/footer/nav —
  verified in `app/b/[slug]/layout.tsx`). So it is *visually* embed-ready
  already. What it lacks: it is **not** under `/embed/*`, so middleware does not
  apply `frame-ancestors *` → it **cannot be framed cross-origin yet** (default
  `X-Frame-Options: SAMEORIGIN` blocks it). It also has no theme params, no
  `noindex`, and is not in the `klickenya:resize` auto-resize family.
- **Guest flow already works anonymously**: `BookingWidget` checks availability
  via `GET /api/properties/availability-by-booking-slug` (public) and submits a
  guest **enquiry** via `POST /api/contact` (public) — **no login required**.
  Verified in `components/booking/BookingWidget.tsx` ("Confirm & send enquiry").
- **Instant-book creation**: `POST /api/properties/bookings` **requires an
  authenticated user** and calls the `create_booking_with_payment` RPC — this is
  the **owner-side** booking-entry path, not for anonymous guests. So today the
  public room flow is **availability → enquiry** (works); instant-book is
  owner-only. Verified: lines 12–14 (401 Unauthorized) + 140–141 (RPC).

### Integration opportunities / required work for a PMS widget
**Good news from the audit: most of this already exists.** The chrome-free page
(`/b/[slug]`), the anonymous availability check, and the anonymous enquiry
submit are all built and working. The PMS embed is therefore mostly a
*packaging* job, not a *build-from-scratch* job:

1. **Make it framable cross-origin.** Either add **`/embed/booking/[slug]`**
   (mirrors `/embed/reservations`) reusing `BookingWidget`, or extend the
   middleware's `frame-ancestors *` rule to cover `/b/*`. This is the single
   blocking gap — the page renders fine, it just can't be put in an iframe on
   another domain yet.
2. **Add the embed niceties** the restaurant embeds already have: theme params
   (`theme`/`accent`/`bg`), `noindex`, the `klickenya:resize` postMessage
   bridge, and `source_origin`/`ref` attribution on the enquiry.
3. **Completion semantics** — ship **enquiry mode first** (it already works:
   availability → `POST /api/contact`). Instant-book stays a V2 item (needs an
   anonymous-safe wrapper around `create_booking_with_payment` + M-Pesa/Paystack,
   which is not yet integrated, behind a per-property flag).
4. Reuse `availability-by-booking-slug` as the data source — already anonymous
   and correct.
5. **Centralize the property projection** (`properties`/`rooms` select lists)
   into a shared constant before exposing more columns (schema-projection rule).

---

## Phase 4 — New integration architecture

### Target developer experience (from the brief)
```html
<script src="https://klickenya.com/embed.js" async></script>

<div data-klickenya-tool="reservation" data-slug="napule"></div>
<div data-klickenya-tool="menu"        data-slug="napule" data-theme="dark"></div>
<div data-klickenya-tool="restaurant"  data-slug="napule" data-accent="0EA5E9"></div>
<div data-klickenya-tool="booking"     data-slug="kilifi-villa"></div>
```

### How it works (and why this is low-risk)
The loader is a **thin client over the existing `/embed/*` routes** — it does
not replace them, it *drives* them. This means:
- Zero backend rewrite for the restaurant widgets that already work.
- The auto-resize that was already half-built (child emits `klickenya:resize`)
  becomes real the moment a parent listener ships — which is exactly what the
  loader provides.

```
business site                      klickenya.com
┌────────────────────────┐         ┌───────────────────────────────┐
│ <script src=embed.js>  │         │                               │
│  1. scan data-* nodes  │         │                               │
│  2. build iframe URL ──┼────────▶│  /embed/<tool>/<slug>?theme…  │
│  3. inject <iframe>    │         │   (force-dynamic SSR + RLS-    │
│  4. listen for message │◀────────┼──  bypassing adminClient read)│
│  5. set iframe height  │  postMessage{klickenya:resize,height}   │
└────────────────────────┘         └───────────────────────────────┘
```

### Tool → route mapping
| `data-klickenya-tool` | Route | Status |
|---|---|---|
| `menu` | `/embed/menu/[slug]` | live |
| `reservation` / `reservations` | `/embed/reservations/[slug]` | live |
| `restaurant` (combo) | `/embed/restaurant/[slug]` | live |
| `booking` / `property` | `/embed/booking/[slug]` | **to build (Phase 3)** |

### Attribute contract (V1)
| Attribute | Required | Notes |
|---|---|---|
| `data-klickenya-tool` | ✅ | one of the tools above |
| `data-slug` | ✅ (canonical key) | the business/menu/property slug |
| `data-business-id` | alias | accepted for the brief's example syntax; resolves to slug server-side in V1.1 |
| `data-theme` | — | `light` \| `dark` |
| `data-accent` | — | hex without `#` |
| `data-bg` | — | `white` \| `transparent` \| hex |
| `data-ref` | — | campaign tag (≤64 chars) → attribution |
| `data-height` | — | initial height before first resize message |

> **Note on `data-business-id`.** The brief shows `data-business-id='123'`, but
> Klickenya keys every public surface by **slug**, not a numeric id. The loader
> accepts both; `data-slug` is canonical. A numeric-id → slug resolver endpoint
> is a small V1.1 addition if customers prefer opaque ids.

### Why iframe (not inline DOM injection)
- **Style isolation** — the embedder's CSS can't break the widget and vice
  versa. Critical for Wix/Squarespace's aggressive global styles.
- **Security** — the widget runs in its own origin; the embedder's JS can't read
  the booking form, and `Referer`-based attribution stays un-forgeable.
- **Reuses the entire existing render path** — no duplicate React bundle on the
  host page.

Inline (Shadow DOM) injection is a possible V3 for "chromeless" widgets, but
iframe is the correct V1 trade-off and is what Calendly/Resy/OpenTable ship.

---

## Phase 5 — API & SDK planning

### Existing public/anonymous endpoints (the embed data plane)
- `POST /api/menu/reservations` (source=`embed`) — reservation create. ✅
- `GET  /api/properties/availability-by-booking-slug` — availability. ✅
- Menu data is read server-side in the `/embed/menu` page (no public JSON API).

### Missing endpoints to build
1. `GET /api/embed/menu/[slug]` — public JSON menu (enables headless/SDK use
   without an iframe). Backed by a **shared projection constant**.
2. `POST /api/embed/booking/[slug]` — anonymous booking **enquiry** create
   (enquiry mode from Phase 3), rate-limited.
3. `GET /api/embed/config/[slug]` — returns enabled tools + theme defaults for a
   business, so the loader can render the right widgets without the embedder
   knowing which are on.
4. (V1.5) `GET /api/embed/allowed-origins/[slug]` — backs the domain allowlist.

### SDK opportunities
- **`embed.js`** (this PoC) — the no-code loader. Primary deliverable.
- **`@klickenya/embed`** (npm, V2) — typed programmatic API for React/Vue devs:
  `Klickenya.render(el, { tool, slug, theme })`, lifecycle events
  (`onBooking`, `onResize`), imperative `.refresh()`. Wraps the same iframe
  contract — no new surface area.
- **Versioning**: serve `embed.js` (latest, short cache) and `embed.v1.js`
  (pinned, long cache) so we can ship breaking changes without breaking live
  embeds.

---

## Phase 6 — Security & performance

### Security
| Concern | Today | Recommendation |
|---|---|---|
| Framing | `frame-ancestors *` (open) | V1 OK; V1.5 per-business allowlist via `frame-ancestors` built from `allowed-origins` |
| Auth on read | Anonymous via `adminClient` (service role) | Keep, but **only published + flagged-embeddable** rows (already enforced on menus; add an explicit `embed_enabled` flag) |
| Booking write | `source='embed'` accepted, sanitized | Add **rate limiting** (IP + slug) — reuse the in-memory limiter pattern; move to Upstash for multi-instance correctness |
| Input | Phone regex, hex/host sanitizers in place | Good; extend to booking embed |
| Attribution spoofing | `source_origin` from `Referer` (server-side) | Robust; document that JS `?origin=` is *not* trusted |
| postMessage | child posts to `"*"`, parent loader filters by `event.source === iframe.contentWindow` | Correct origin-pinning in the PoC; do **not** trust message `origin` for actions, only for height |
| XSS in dashboard | `source_ref` strips HTML before display | Keep |

### Performance
- **`embed.js`**: tiny (~3 KB), dependency-free IIFE, `async`, no render-blocking.
  Serve from Vercel's CDN with `Cache-Control: public, max-age=300,
  stale-while-revalidate=86400` for the rolling file.
- **Embed pages** are `force-dynamic` (correct for freshness) but each is a full
  SSR. At scale, add **per-owner `unstable_cache` with `revalidateTag`** (already
  the documented plan in CLAUDE.md) so menu reads don't hit Postgres on every
  impression.
- **Lazy mount**: loader should use `IntersectionObserver` to defer iframe
  creation until the widget scrolls near viewport — saves load on long pages
  with a footer widget. (PoC mounts eagerly; flagged as a fast follow.)
- **Auto-resize debounced** to one `requestAnimationFrame` per frame to avoid
  layout thrash on the host page.

---

## Deliverables in this PR

1. **Technical audit / integration report / proposed architecture / roadmap** —
   this document.
2. **`embed.js` proof of concept** — `apps/web/public/embed.js`: the brief's
   exact `<script>` + `data-klickenya-tool` syntax, driving the live `/embed/*`
   routes, with the auto-resize bridge wired end to end.
3. **Demo harness** — `apps/web/public/embed-demo.html`.
4. **Property / PMS booking embed (new)** — closes the only red item on the
   widget list:
   - `app/embed/booking/[slug]/page.tsx` + `EmbeddedBooking.tsx` — framable
     (inherits `/embed/*` `frame-ancestors *` + `noindex`), themable, with the
     `klickenya:resize` bridge and `Referer`/`ref` attribution.
   - `app/api/properties/booking-enquiry/route.ts` — public, rate-limited,
     honeypot-protected enquiry endpoint whose `contact_requests` insert
     **mirrors the proven `/api/contact` insert** (no new schema surface;
     `listing_sanity_id` confirmed nullable via migration 023).
   - `components/booking/BookingWidget.tsx` — gains optional embed props
     (`propertyId`, `enquiryEndpoint`, `sourceOrigin`, `sourceRef`); `/b/[slug]`
     behaviour is unchanged when they're absent.
   - **Note:** this also routes around a **pre-existing bug** — the `/b/[slug]`
     `BookingWidget` submits a payload `/api/contact` rejects (snake_case keys,
     missing `listingId`/`listingType`/`turnstileToken`). The embed uses the new
     working endpoint; the `/b/[slug]` bug should be fixed separately.
   - **Verification done:** full `tsc --noEmit` clean; insert columns + nullable
     constraint confirmed against `supabase/migrations`. **Not yet runtime-
     tested** (needs a dev/staging deploy with a real property `booking_slug`).

---

## Development roadmap

### V1 — Loader foundation (this PR + small follow-ups)
- [x] `embed.js` loader driving existing menu/reservation/restaurant embeds.
- [x] Parent-side auto-resize consuming `klickenya:resize`.
- [ ] Swap the dashboard snippet generators to emit the `<script>`+`<div>` form
      (keep raw-iframe as a fallback tab).
- [ ] `IntersectionObserver` lazy mount.
- [ ] Rate-limit `POST /api/menu/reservations`.

### V1.5 — Trust & control
- [ ] Per-business **domain allowlist** → dynamic `frame-ancestors`.
- [ ] `embed_enabled` flag per menu/property in the dashboard.
- [ ] `GET /api/embed/config/[slug]` so the loader self-configures.

### V2 — PMS embed + public API
- [x] `/embed/booking/[slug]` property widget (enquiry mode). **Done this PR.**
- [x] `POST /api/properties/booking-enquiry` anonymous enquiry create. **Done.**
- [ ] Runtime-test the property embed on dev; add a dashboard snippet generator
      for property owners (parity with `MenuEmbedPanel`).
- [ ] Fix the pre-existing `/b/[slug]` enquiry bug (payload mismatch).
- [ ] `GET /api/embed/menu/[slug]` public JSON (headless).
- [ ] `@klickenya/embed` npm SDK with lifecycle events.

### V3 — Scale & polish
- [ ] Instant-book embed (needs M-Pesa/Paystack + anonymous booking RPC).
- [ ] `unstable_cache`/`revalidateTag` on embed reads + CDN tuning.
- [ ] Versioned `embed.v1.js` / `embed.v2.js`.
- [ ] Shadow-DOM "chromeless" inline widget option.

---

## End goal alignment

> *"Create a platform where any business can operate a static website while
> Klickenya provides bookings, reservations, menus and PMS functionality through
> embedded components managed from a central dashboard."*

Two complementary mechanisms get there:
1. **White-label storefront** (already live via host-rewrite + `/w/[slug]`) — for
   businesses that want Klickenya to *be* their site.
2. **`embed.js` framework** (this project) — for businesses that keep their own
   static site and drop in Klickenya-powered components.

All widgets remain **managed from the host dashboard** (publish toggles, theme,
reservation settings, attribution) exactly as they are today — the loader changes
*how the widget is placed*, not *who controls it*.
