# Claris Integration Plan — Pilot Resort → Klickenya

> Status: **Ready to execute** · Pilot: **Claris African Experience** · Date: 2026-07-01
> Companion docs: [resort-integration-plan.md](./resort-integration-plan.md) ·
> [partner-api-integration.md](./partner-api-integration.md)

---

## Decisions locked (2026-07-01)

| Decision | Choice | Consequence |
|---|---|---|
| **Pilot resort** | Claris African Experience (DB: **Neon PostgreSQL** — verified in the Claris `.env`; the resort-integration-plan.md had this as Render, which is wrong) | Seven Islands / Tribal Sand follow the same recipe later |
| **Onboarding path** | **Scenario 1 — Embed** (`/embed/booking/[slug]`) | No API-key system needed for the pilot |
| **Booking flow** | **Enquiry** (guest enquires → host converts in PMS) | Matches the built code; no overbooking risk |
| **Payments** | **None for now** | Confirmed-booking / instant-book deferred to V2 |

**Why enquiry, not instant-book:** the goal is to consolidate resorts onto one DB
fast and safely. Instant-book needs an atomic availability hold + payment
(M-Pesa/Paystack — not built). Enquiry is already built, matches how coast
resorts actually operate, and gets Claris off its Render DB in days. Instant-book
becomes V2 once payments land.

---

## Doc alignment fix (do this first, 5 min)

`partner-api-integration.md` over-promises: it describes the guest clicking
**"Book"** → *"Klickenya saves the booking and sends a confirmation email"* as
**already built**. The built embed only creates an **enquiry**. Before we build
on top of it, correct that doc so "instant-book + guest confirmation" is marked
**V2 (needs payments + availability hold)**, and the current state is described as
the enquiry flow.

- [ ] Task 0 — Reword the booking-flow sections in `partner-api-integration.md`
      to match the enquiry reality; mark instant-book as V2.

---

## What already exists (verified in code, 2026-07-01)

| Piece | Location | State |
|---|---|---|
| Booking embed page | `apps/web/app/embed/booking/[slug]/page.tsx` | Built — looks up `properties` by `booking_slug`, loads active `rooms` |
| Embed client wrapper | `apps/web/app/embed/booking/[slug]/EmbeddedBooking.tsx` | Built — reuses `<BookingWidget>`, postMessage height bridge |
| Enquiry API | `apps/web/app/api/properties/booking-enquiry/route.ts` | Built — inserts `contact_requests`, emails guest + host + admin, GHL |
| PMS dashboard (rooms/calendar/prices) | `apps/web/app/dashboard/...` | Built |
| Host provisioning | claim/register/upgrade paths | **Fragile** — see F-4 (below) |

**Single technical blocker:** none of the above has been **live-tested end to
end**. That is Phase A.

---

## Known risks to clear along the way

- **F-4 / host provisioning** — `host_profiles.slug` is NOT NULL with no default;
  some host-creation paths leave a host with no profile. Recent main PRs (#55/#56/#58)
  addressed parts of this. **Verify** the Claris host account gets a real
  `host_profiles` row before relying on the dashboard.
- **Issue 3 — RLS on `contact_requests`** — enquiries land in `contact_requests`;
  the current policy may let hosts read other hosts' enquiries. Since resort
  bookings now flow through this table, tighten RLS (host reads only enquiries for
  their own listings) **before** multiple resorts are live.

---

## Claris data — CONFIRMED (2026-07-01, local seed + live Neon agree)

Source: `D:\ClarisAfricanExperience` (full PHP site, `db/schema.sql`, `db/seed_claris.sql`,
and a reachable live **Neon** DB). Seed and live cross-checked — they match.

- **42 villas/apartments**, all published. (Claris calls them "rooms", but each is a
  whole standalone rental — e.g. Twiga House = 5 beds, sleeps 10.)
- **No prices** — `price_amount = 0` for all 42, in BOTH seed and live. Claris is
  **price-on-request / pure enquiry**. Currency field says USD.
- **Live submissions:** 14 total, 2 of type `enquiry` — very low volume, easy cutover.
- Claris booking model = `submissions(type='enquiry')` with room, guest, dates,
  adults/children. **No confirmed-booking table** → maps cleanly to Klickenya's
  enquiry flow (`contact_requests`).

### Two modeling decisions this forces (resolve before Phase C)

1. **How to represent 42 whole villas — DECIDED: Option B.**
   The Claris site is built villa-by-villa (`room.php` per villa), so each villa
   became its own Klickenya property keyed by the villa's own slug
   (`twiga-house`, etc.), each with a single room. This lets each villa page embed
   a widget scoped to just that villa. Verified in dev: `booking_slug=twiga-house`
   returns only Twiga House. (Option A — one property, 42 rooms — was tried first
   but showed all 42 on every villa page; rejected.)
2. **Price-on-request.** Klickenya `rooms.base_price_kes` is `NOT NULL`. Claris has
   no prices. Options: set `0` and rely on the enquiry (guest gets a quote back), or
   add a "price on request" display mode. **Recommend `0` + enquiry for pilot.**

## Prerequisites — needed before Phase A

- [ ] **Testable DB** — confirm what the local `.env` points at (dev vs prod
      Supabase). We need to be able to create/read a test `properties` row with a
      `booking_slug`. If local points at prod, seed against **dev** instead.
- [ ] **Claris data** — rooms, prices, photos, descriptions, availability rules
      (export from the Render DB, or read access to it).
- [ ] **Claris PHP site** — repo location / access to swap the booking form.
- [ ] **Branch** — create `feat/resort-integration` off `dev` (per CLAUDE.md
      workflow: feat → dev → main).

---

## Phase A — Prove the embed works (the blocker) · 🟡 MOSTLY VERIFIED (2026-07-01)

Done with a throwaway test property (`booking_slug = "test-resort"`) in dev.

1. [x] Created a test `properties` row + 2 active `rooms` in the dev DB.
2. [x] `/embed/booking/test-resort` renders — property `<h1>` "Test Resort
       (Phase A)", widget step 1 (dates + guest count). SSR HTML 94KB, no errors.
3. [x] Submitted an enquiry via the API — `201`, returned a row id.
4. [x] `contact_requests` row created correctly: right `property_id`, dates,
       `listing_type="stay"`, `status="new"`, notes captured room + guests +
       attribution (`source: embed (clarisafrican.com)`).
5. [ ] **Emails** — endpoint attempts guest + host/admin sends (non-blocking, no
       errors logged). Not yet confirmed in a real inbox — do with a real address.
6. [~] **Dashboard visibility** — traced the code. ⚠️ **Key gotcha found:** the
       enquiry only shows up if it is linked correctly. Two surfaces:
       - **Enquiries page** (`dashboard/enquiries/page.tsx`) filters by
         `listing_sanity_id` (the host's Sanity listing IDs) — NOT by
         `property_id`. So an embed enquiry appears here **only if the property
         has a `listing_slug` pointing to a Sanity listing owned by that host.**
       - **Property PMS calendar** (`dashboard/property/[id]/page.tsx`) filters by
         `property_id` **AND** `room_id not null` **AND** `calendar_status in
         (pending, held)`.
       → **Implication for Claris:** the Claris property MUST be linked to a
         Sanity listing (set `listing_slug`), or enquiries land in the DB but the
         host never sees them. Add this as a Phase C requirement. My bare test
         property had neither link, so it correctly did NOT appear — expected.
7. [x] iframe height bridge verified in code — `public/embed.js` maps the
       `booking`/`property` tool to `/embed/booking/[slug]`, applies theme params,
       and listens for the `klickenya:resize` postMessage the widget broadcasts.
       A working demo already exists at `public/embed-demo.html`.
8. [ ] Fix nits found (see below), then re-confirm email delivery + dashboard.

**Nit found:** the enquiry `notes` list "Room:" **twice** (once manually, once
from the enquiry summary) in `booking-enquiry/route.ts`. Cosmetic — tidy later.

**Exit criteria:** a guest enquiry from an embedded iframe lands in the dashboard
and both emails arrive in a real inbox.

---

## Phase B — Dashboard embed snippet generator · ✅ ALREADY BUILT

Discovered 2026-07-01: this is done. `PropertyEmbedPanel.tsx`
(`apps/web/components/dashboard/property/PropertyEmbedPanel.tsx`) is a complete
snippet generator — script/iframe toggle, theme/accent/bg picker, campaign ref
tag, and a live preview iframe. It is wired into the property settings page
(`apps/web/app/dashboard/property/[id]/settings/page.tsx`).

- [x] Snippet generator exists and is wired into the dashboard
- [ ] (Optional) sanity-check it renders for the Claris property in Phase C

---

## Phase C — DEV REHEARSAL DONE (2026-07-01) ✅

Ran a full dry-run against Klickenya **dev** Supabase (decision B + price 0):
- Created a Claris host (`claris-pilot@klickenya.test`) + `host_profiles` row.
- Created **42 properties** — one per villa, each `booking_slug` = the villa's
  own Claris slug, `renting_type = by_room`, Watamu/Kilifi, each with a single
  room (the villa itself: name, capacity→max_guests, beds, description,
  amenities, price 0).
- **Verified:** `/embed/booking/twiga-house` renders "Twiga House" and its
  availability returns only that villa; `white-house-...` returns only White
  House. Per-villa scoping works end to end.

### Photos — DONE in dev (2026-07-01) ✅
Uploaded local Claris images (`D:\ClarisAfricanExperience\assets\img\`) into the
Supabase `room-photos` bucket under `claris/<villa-slug>/`, and set each villa
room's `photos` to the public URLs. Result: 42/42 villas, 252 images (hero + up
to 5 each), 0 missing. Verified a photo URL is embedded in the widget SSR and
loads `200 image/jpeg`. (Full galleries — all ~617 — can be uploaded later by
raising the per-villa cap.)

### Phase D snippet (per-villa, dynamic — ONE edit covers all 42 pages)
In `room.php`, replace the `form-availability.php`/`form-enquiry.php` include
block (lines ~264–268) with:
```php
<script src="https://klickenya.com/embed.js" async></script>
<div data-klickenya-tool="booking" data-slug="<?= e($room['slug']) ?>"></div>
```
Because it uses `$room['slug']`, the single edit works for every villa page.
Klickenya `booking_slug` values match Claris villa slugs exactly (that's how the
dev rehearsal was built).

### Gaps that remain for the REAL (production) Phase C
- **Images 404 on the live site.** DB stores paths like
  `rooms/Claris_..._Twiga_House_46.jpg`; the public site (clarisafricanexperience.com)
  does not serve them (404). The 639 image files DO exist locally in
  `D:\ClarisAfricanExperience\assets\img\`. → Real migration must **upload the
  images to Klickenya storage** (Supabase Storage / R2) and store those URLs, not
  hotlink the live site.
- **Sanity listing link** — can't be done from this environment (network to
  Sanity is blocked). Must be run where Sanity is reachable, or via the dashboard.
  Without it, enquiries won't show on the Enquiries page (see Phase A gotcha).
- The rehearsal was on **dev**, not production.

## Phase C (production) — Onboard Claris onto Klickenya · ~1 day

1. [ ] Create a host account for Claris (verify a `host_profiles` row exists — F-4).
2. [ ] Set up the Claris property in the PMS: name, city, `renting_type`,
       `booking_slug = "claris-african-experience"`, `is_active = true`.
   - [ ] **CRITICAL:** set the property's `listing_slug` to a Sanity listing
         owned by the Claris host. Without this, embed enquiries will NOT appear
         on the dashboard Enquiries page (see Phase A gotcha). This is how the
         host actually sees incoming bookings.
3. [ ] Add all rooms: names, descriptions, photos, `base_price_kes`, `max_guests`,
       amenities, display order.
4. [ ] Enter availability / calendar rules.
5. [ ] Load `/embed/booking/claris-african-experience` and confirm real Claris
       data renders correctly.

---

## Phase D — Go live on the Claris site (parallel run) · ~1 week

1. [ ] Paste the embed snippet onto the Claris PHP site where the booking form is.
2. [ ] **Keep the old PHP form** as a fallback during the parallel run.
3. [ ] End-to-end test on the live site: guest enquiry → dashboard → emails.
4. [ ] Run both systems in parallel ~2 weeks; monitor that enquiries arrive
       reliably and the host is comfortable converting them in the PMS.

---

## Phase E — Decommission (the actual "kill") · after parallel run

1. [ ] Remove the PHP booking form from the Claris site.
2. [ ] Confirm no traffic hits the old booking backend.
3. [ ] **Shut down the Claris Render PostgreSQL DB** — saves ~$7–15/mo.
4. [ ] Claris site is now a pure branded front door; Klickenya runs operations.

---

## Phase F — (Optional, later) List Claris on the marketplace

1. [ ] Publish Claris as a listing on `klickenya.com` for extra discovery.
2. [ ] Bridge PMS property ↔ Sanity marketplace listing (relates to open item D-2).

---

## After the pilot — repeat for the other two

Same recipe, one at a time:
- **Seven Islands Watamu** → embed → parallel → shut down Render DB
- **Tribal Sand** → embed → parallel → shut down **Neon** DB

Then, as a separate track (not required for the resort migration), build the
**Scenario 2 API-key system** from `partner-api-integration.md` for partners who
want fully custom-branded forms.

---

## Storage decision — pilot vs scale

- **Pilot (now):** use Klickenya's existing path — PMS room photos live in the
  Supabase Storage bucket **`room-photos`** (see `api/properties/upload/route.ts`),
  public URLs stored in `rooms.photos`. Matches existing code; no new infra.
  Marketplace listing images go to **Sanity** via `scripts/seed-claris-listings.ts`
  (already exists) — that's a separate destination for the public /stays pages.
- **Scale (later, when onboarding many resorts):** move public image serving to
  **Cloudflare R2 + CDN** (no egress fees, global CDN, what Claris's `.env` R2
  placeholder anticipated). Supabase stays the data store. Decide before scaling
  past a handful of resorts — image egress is the cost that bites at volume.

## Two images destinations (don't confuse them)

- `rooms.photos` (Supabase `room-photos` bucket) → shown in the **booking embed
  widget** (the villa cards in the widget).
- Sanity listing images → shown on the **marketplace /stays pages** (public
  discovery). Populated by `seed-claris-listings.ts`.

## Task summary (execution order)

| # | Task | Phase | Blocked by |
|---|---|---|---|
| 0 | Fix partner-api doc wording (enquiry, not instant-book) | Pre | — |
| P | Prereqs: testable DB, Claris data, PHP access, branch | Pre | you |
| A | Live-test embed end-to-end with a test property | A | P (testable DB) |
| B | Dashboard embed snippet generator for properties | B | A |
| C | Onboard Claris (host + property + rooms + availability) | C | A, Claris data |
| D | Embed on Claris PHP site, parallel run | D | B, C, PHP access |
| E | Decommission Claris Render DB | E | D (parallel proven) |
| F | List Claris on marketplace (optional) | F | C |
</content>
