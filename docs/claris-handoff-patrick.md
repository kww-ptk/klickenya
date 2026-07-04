# Claris → Klickenya — Handoff for Patrick

> Date: 2026-07-02 · Author: Cali (with Claude) · Status: **Dev-verified, ready for production**
> Companion docs: [claris-integration-plan.md](./claris-integration-plan.md) ·
> [partner-api-integration.md](./partner-api-integration.md) ·
> [resort-integration-plan.md](./resort-integration-plan.md)

---

## ⚠️ Read first — the git rule
**Do NOT push anything to the Claris repo (`D:\ClarisAfricanExperience`) until a
backup of the current live Claris site exists.** Cali/Patrick agreed to snapshot
Claris before any update. The `room.php` change below is applied **locally only,
uncommitted**, behind a toggle flag. Back up first, then commit.

---

## What this is
Making Klickenya the booking engine behind the Claris site, **enquiry flow, no
payments** (Claris has no prices — it's price-on-request). Pilot for Seven
Islands + Tribal Sand to follow the same recipe.

Decision recap (locked): **Option B** — each of Claris's 42 villas is its own
Klickenya property keyed by the villa's own slug (`twiga-house`, etc.), so each
villa page embeds a widget scoped to just that villa.

---

## ✅ Done and verified in DEV (Klickenya dev Supabase + local Claris site)

1. **42 villas imported** from Claris's live Neon DB into Klickenya dev — one
   property per villa (`booking_slug` = villa slug), each with a single room,
   price 0. Script: `apps/web/scripts/claris/import-villas.mjs`.
2. **Photos** — 616/617 villa images uploaded from the LOCAL Claris files
   (`D:\ClarisAfricanExperience\assets\img\`) into Supabase bucket `room-photos`
   under `claris/<slug>/`; each villa's `rooms.photos` set to those URLs.
   Verified an image loads (`200 image/jpeg`). Script:
   `apps/web/scripts/claris/upload-photos.mjs`. (1 malformed file skipped:
   `Horizon_Apartment_5.jpg` — ignore or re-encode.)
3. **Per-villa embed verified** — `/embed/booking/twiga-house` renders "Twiga
   House" only; availability returns just that villa; photo displays;
   **"Price on request"** shows (not KSh 0).
4. **Claris site → Klickenya, verified locally** — ran the Claris PHP site on
   `localhost:8765`; the Twiga House page loads the Klickenya widget
   (`localhost:3000/embed/booking/twiga-house`). Cali confirmed it working.

## ✅ Klickenya code changes made (need normal feat→dev→main merge)

All in the Klickenya repo (safe to commit/push via normal flow):

| File | Change | Why |
|---|---|---|
| `apps/web/app/dashboard/enquiries/page.tsx` | List enquiries by the host's **property_id** too, not only Sanity `listing_sanity_id` (two queries, merged/de-duped) | So resort embed enquiries (no Sanity listing) appear in the dashboard |
| `apps/web/app/api/properties/booking-enquiry/route.ts` | Host-email fallback: resolve host from **property owner** when there's no Sanity listing | So the host is notified for embed enquiries |
| `apps/web/app/dashboard/enquiries/[id]/page.tsx` | **Security (Issue 3):** verify ownership via property_id too, and **deny** if ownership can't be established | Previously any host could open any enquiry that had no Sanity listing, by id |
| `apps/web/components/booking/BookingWidget.tsx` | Show **"Price on request"** when price is 0 (4 spots) | Claris has no prices |
| `apps/web/app/admin/hosts/page.tsx` | (from the main merge) kept `HostFormModal` | conflict resolution |

## 🖊 The Claris site change (LOCAL only, uncommitted — DO NOT push yet)
`D:\ClarisAfricanExperience\room.php` — the "Book This Villa" block now renders
the Klickenya widget behind a `$USE_KLICKENYA = true` toggle, keeping the old
PHP forms as fallback. It auto-points at `localhost:3000` locally and
`https://klickenya.com` in production. One edit covers all 42 villa pages because
it uses `$room['slug']`.

---

## 📋 What Patrick needs to do — production cutover

### 0. Back up Claris (blocking)
Snapshot the live Claris site + its Neon DB **before** anything else.

### 1. Merge the Klickenya code changes
Normal flow: feature branch → dev → verify on dev preview → main. The 5 files
above. No DB migration is strictly required for these (they read existing
columns), but see "Security follow-up" below.

### 2. Import Claris into Klickenya **production**
Point the two scripts at prod and run them. They read:
- Claris data from `D:\ClarisAfricanExperience\.env` (`DATABASE_URL` → Neon)
- Klickenya target from `apps/web/.env.local` (`NEXT_PUBLIC_SUPABASE_URL` +
  `SUPABASE_SERVICE_ROLE_KEY`) — **set these to PRODUCTION values** before running.
- Requires `npm i pg @supabase/supabase-js` in the run environment.
- `import-villas.mjs` first (creates host + 42 properties + rooms), then
  `upload-photos.mjs` (uploads images, sets `rooms.photos`).
- The host is created as `claris-pilot@klickenya.test` — **change this to the
  real Claris host email** before the prod run so the host can log in and gets
  notifications.

### 3. Apply the widget to the real Claris site
- With `$USE_KLICKENYA = true` (already set), in production it points at
  `https://klickenya.com`. Confirm `embed.js` + `/embed/booking/[slug]` are live
  on prod Klickenya.
- Keep the old PHP forms as fallback (the toggle). Commit **after** the backup.

### 4. Parallel run, then decommission
- Run both systems ~2 weeks; confirm enquiries land in the Klickenya dashboard
  and the host is notified.
- Then remove the old form (set toggle false or delete) and **shut down Claris's
  Neon DB**.

---

## 🔎 Open items / decisions for Patrick

1. **Security follow-up (do before many resorts):** I fixed the enquiry *detail
   view* ownership. **Audit the enquiry ACTION endpoints** (reply / convert /
   hold / decline under `app/api/dashboard/...` and `EnquiryActions`) to ensure
   they also verify the enquiry belongs to the host. And the base RLS policy in
   `002_rls_policies.sql` still references a legacy `listings.listing_id` — worth
   a proper `contact_requests` RLS migration (next number **077**) since the app
   reads via service role today.
2. **Marketplace listings (optional, Phase F):** to also list Claris villas on
   klickenya.com for discovery, run `apps/web/scripts/seed-claris-listings.ts`
   (needs Sanity write token + Sanity network access — blocked in Cali's env, run
   locally). Not required for the booking pilot.
3. **Storage at scale:** pilot uses Supabase `room-photos`. Before onboarding
   many resorts, move public images to **Cloudflare R2 + CDN** (no egress fees).
   Claris `.env` already has R2 placeholders.
4. **Availability/holds:** enquiry flow only. Instant-book needs an availability
   hold + payments (M-Pesa/Paystack) — future V2.
5. **Prices:** all villas are price-on-request (0). If Claris ever sets prices,
   they'll flow through `rooms.base_price_kes`.

---

## 🧹 Dev cleanup note
The dev Klickenya DB currently holds the Claris rehearsal (host
`claris-pilot@klickenya.test`, 42 properties, photos). Leave for testing or
delete when done. The Claris villas' `booking_slug`s equal their Claris slugs.
