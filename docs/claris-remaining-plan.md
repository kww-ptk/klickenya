# Claris → Klickenya — Remaining Work Plan

> Date: 2026-07-08 (updated) · Companion to [claris-integration-plan.md](./claris-integration-plan.md),
> [claris-handoff-patrick.md](./claris-handoff-patrick.md), [partner-onboarding-playbook.md](./partner-onboarding-playbook.md).
> Covers what's left AFTER the forms bridge + static public site were built, and now covers the
> full `/admin` repointing + Neon retirement plan.

---

## ✅ Done so far (committed + pushed; Klickenya Phase 1 merged to main)

1. **Villa booking widget** — Claris villa pages embed the Klickenya booking widget;
   bookings save in Klickenya and show in the host dashboard.
2. **All guest forms dual-write to Klickenya** — contact, "Plan Your Stay" enquiry,
   tour/spa enquiries, owner/agency leads, and newsletter each save locally AND forward
   to Klickenya (`includes/klickenya.php`), tagged by source. Non-blocking.
3. **Entire public site off Neon** — a static snapshot (`includes/villas-static.php`,
   built by `scripts/export-villas-static.php`) holds all villas, photos, tours, offers,
   for-sale properties, and settings. `includes/db.php` reads the snapshot (DB is the
   fallback). Verified: every public page renders with the database switched off.
4. **Phase 1 shipped** — host **Messages** inbox, admin **Source** column + filter,
   `source` stored in Klickenya, host login fixed (role=host). Merged to `main` (PR #78).
   Pending: apply migration `077` on the Klickenya Supabase; run the prod villa import.

## 🔴 What still keeps Neon alive

- **`/admin`** — every page (`submissions.php`, `rooms.php`, `tours.php`, `offers.php`,
  `properties.php`, `holds.php`, `users.php`, `login.php`, etc.) reads/writes Neon via
  `includes/db.php`'s PDO layer, using Claris's own schema.
- **Public forms still ALSO write to Neon** (`api/submit-*.php`) — the dual-write safety net.
- **The static snapshot generator** (`scripts/export-villas-static.php`) sources its content
  from Neon.
- **iCal sync** (`api/ical.php`, `bin/ical-expire-holds.php`) reads/writes Neon's
  `holds`/`availability_blocks` directly.

---

## Direction (confirmed 2026-07-08)

**Claris must fully rely on the Klickenya engine — no Neon database at all.** This supersedes
the earlier "hybrid" idea of keeping a small Neon content back-office.

**Content → Sanity. Transactions/auth → Supabase.** This is not a new decision — it's Klickenya's
existing rule ("content in Sanity, transactions in Supabase — never mix," per Klickenya's
CLAUDE.md) applied to Claris instead of invented from scratch. Consequence: Claris villas/tours/
offers/properties become real Sanity documents, which means they become real Klickenya listings
(visible in the host dashboard/PMS), not just rows in a different database.

**Rejected for this project:** removing Sanity platform-wide from Klickenya. That's a much larger,
separate decision (it would mean rebuilding Sanity Studio's editor UI, image CDN, GROQ, and the
blog pipeline inside Supabase) and is not required to solve Claris's admin problem. If that idea
resurfaces, it should be evaluated on its own merits, decoupled from this plan.

**No change on the Claris `/admin` UI.** Every page keeps its exact markup and behavior — only
what `includes/db.php`'s functions call underneath changes, from Neon Postgres to Sanity/Supabase.

---

## The plan to finish (full replacement)

### Phase 1 — Host-scoped submissions inbox in Klickenya — ✅ DONE (PR #78)
See "Done so far" above.

### Phase 2 — Admin: repoint `/admin` to the Klickenya engine
Four buckets, in this order. Each is independently testable before moving to the next.

#### 2A — Submissions & bookings → Klickenya Supabase — 🟡 READ PATH DONE (2026-07-08)
**Files:** `admin/submissions.php`, `admin/submission-view.php`, `includes/klickenya.php`,
`apps/web/app/api/partner/submissions/route.ts` (new, Klickenya repo)
- ✅ New endpoint `GET /api/partner/submissions?partner=claris` (Klickenya repo,
  branch `feat/claris-partner-submissions-api`) merges `contact_requests` (villa enquiries),
  `general_contacts` (contact/agency), and `newsletter_subscribers` into one feed. No new
  migration needed — reuses existing tables.
- ✅ Auth: shared secret, `PARTNER_API_KEYS` (Vercel) / `KLICKENYA_PARTNER_KEY` (Render + local
  `.env` both repos), `Authorization: Bearer <key>`. Both env vars added by the user.
  Recommended: rotate before onboarding the next partner site, and give each partner its own
  key in the `PARTNER_API_KEYS` JSON map.
- ✅ `admin/submissions.php` / `submission-view.php` rewritten to call
  `klickenya_fetch_submissions()` (new function in `includes/klickenya.php`) instead of the
  local `submissions` table. Filtering/search/CSV export now run in-memory over the fetched
  feed. UI/layout unchanged (same CSS classes, same page structure).
- ✅ Verified end-to-end over real HTTP (Claris PHP dev server → Klickenya dev server →
  Supabase): 7 live records round-tripped correctly. PHP syntax-checked clean
  (`php -l`) on all three touched files.
- ⚠️ **Not yet verified:** the actual login-gated page render in a browser — this dev
  machine's local PHP has no `pdo_pgsql` driver, so it can't reach Neon locally at all
  (pre-existing environment gap, unrelated to this change — `admin_users` login check needs
  it). Do a real click-through test after deploying to a Neon-reachable environment.

**Remaining for this bucket (not yet built — next days):**
1. **Write path** — delete and workflow-status editing are disabled on `submission-view.php`
   right now (shows a "read from Klickenya" notice instead). Needs a companion authenticated
   write endpoint (`POST/DELETE /api/partner/submissions/[id]`?), guarded by the same partner
   key, that knows which of the three source tables an id belongs to (by its `enquiry-`/
   `contact-`/`newsletter-` prefix).
2. **Workflow-status parity** — Claris's 8-stage pipeline (Received → Answered → Option Sent →
   Waiting → To Follow Up → Booked → Not Interested → Dates Not Available) has no Klickenya
   equivalent for `general_contacts`/`newsletter_subscribers` (only `contact_requests` has a
   simple status). Decided to skip for now (option a from the two choices offered); revisit as
   a small migration (add `status` column, matching enum) once the write path above exists —
   do both together since the write endpoint needs a status column to write to anyway.
3. Browser/login verification of the rewritten pages once tested against a real (non-local)
   Neon connection.

#### 2B — Auth → Klickenya Supabase Auth — ✅ DONE (2026-07-08)
**Files:** `admin/login.php` (unchanged — same call signature), `admin/users.php`,
`includes/auth.php`, `includes/klickenya.php`,
`apps/web/app/api/partner/login/route.ts` (new, Klickenya repo),
`apps/web/lib/partner/auth.ts` (new — shared partner-key check, also refactored into
`api/partner/submissions/route.ts`)
- ✅ New endpoint `POST /api/partner/login` — same partner-key auth pattern as 2A, calls
  Supabase Auth `signInWithPassword`, then confirms `users.role = 'host'` AND
  `host_profiles.partner_id = 'claris'` via the service-role client (can't be spoofed via RLS).
- ✅ **Decision made (asked, answered):** one shared Klickenya host login for the whole Claris
  team, not per-person accounts. `includes/auth.php`'s `current_admin()` now builds its return
  value straight from the session (set at login) instead of querying local `admin_users`;
  `is_super_admin()` is simply "are you logged in" since there's only one shared identity.
  `admin/users.php` rewritten from a full CRUD (create/delete/change-role against local
  `admin_users`) to an informational page — that table is no longer read by auth at all.
- ✅ Local `login_attempts` throttle kept as a second layer (Neon still alive until Phase 6;
  no reason to drop a working security control early).
- ✅ Verified end-to-end over real HTTP with deliberately wrong credentials (confirms the full
  Claris → Klickenya → Supabase Auth round-trip works, not just each half in isolation).
  **Not yet verified:** an actual successful login with real credentials — same local
  `pdo_pgsql`-missing limitation as 2A blocks a full browser click-through here.

**Known gaps from this decision (remaining for next days):**
1. **No staff/super_admin distinction anymore** — Klickenya's `host_profiles` has no
   role/permission field. Everyone who can sign in gets full access. If per-person accountability
   or restricted "staff" access is needed later, that requires a real decision + schema work on
   the Klickenya side (a team-members-per-host concept doesn't exist yet).
2. **`admin/forgot-password.php` / `admin/reset-password.php` are now stale** — they still reset
   the local `admin_users.password_hash`, which login no longer checks. Not touched in this pass
   (out of the stated 2B file list) — needs its own fix: either point password reset at Klickenya
   too, or remove these pages and document that password changes happen in Klickenya.

#### 2C — Content → split target (revised 2026-07-08 after checking the live schema)
**Correction:** the original assumption — all content goes to Sanity — was wrong for villas and
for-sale properties. Verified by querying live Supabase directly (the migration *files* for
`properties` were stale/drifted from production, per the drift warning in CLAUDE.md):
- Klickenya has a real PMS in Supabase (`properties` + child `rooms` tables) — check-in/out
  times, stay-length rules, currency, `booking_slug` for the embed widget, and — confirmed live —
  **Claris's villas are already imported into it**: real rows ("Jiwe Leupe", "Serenity
  Apartment," city Watamu, county Kilifi) with full description, amenities, and photos already
  uploaded to Supabase storage (`room-photos/claris/...`). Phase 1's villa import did more than
  the earlier docs credited it for.
- **Revised mapping:**

| Claris table | Real target |
|---|---|
| `rooms` (villas) | Existing Supabase PMS `properties` + `rooms` (already populated — build admin CRUD against it, not new content) |
| `properties` (for-sale) | Needs its own check — likely Supabase `properties` too (same table, different `listing_category`), not yet confirmed live the way villas were |
| `tours` | Sanity `listing` documents, `type: 'experience'`, `partner: → claris` (no Supabase equivalent exists) |
| `offers` | New `promotions` array field on the Sanity `partner` document (no existing Klickenya equivalent; too lightweight/partner-specific to warrant a new top-level document type) |

**Also confirmed live:** Klickenya's Sanity `partner` document type already exists and is built
exactly for this (white-label identity/theme/modules) — currently only one partner document
exists ("Napulè Restaurant"), none yet for Claris. `listing.ts` already has a `partner` reference
field + `publishToMarketplace` toggle (**decided: OFF** — Claris villas stay scoped to Claris's
own site, not mixed into Klickenya's general marketplace search, revisit later per-listing if
wanted). `property.ts` (real estate) has no `partner` field yet — needs one added, mirroring
`listing.ts`, if for-sale properties end up going there.

**Files:** `admin/rooms.php`, `room-edit.php`, `properties.php`, `property-edit.php` (→ Supabase
PMS, new Klickenya endpoint needed, same partner-key pattern as 2A/2B); `admin/tours.php`,
`tour-edit.php`, `offers.php`, `offer-edit.php` (→ Sanity, GROQ reads + Mutate API writes).

**Before writing more code:** confirm the for-sale `properties` price/pricing-field gap seen on
villas (`base_price_kes: 0` on the live rows checked) isn't a sign the import is incomplete, and
finish mapping the `rooms` child table's full column set (this pass only confirmed
name/description/amenities/photos exist — pricing, availability wiring not yet checked).

##### Villas — ✅ DONE (2026-07-08), scoped down
**Files:** `admin/rooms.php`, `room-edit.php`, `includes/klickenya.php`,
`apps/web/app/api/partner/properties/route.ts` (new),
`apps/web/app/api/partner/properties/[roomId]/route.ts` (new),
`apps/web/lib/partner/auth.ts` (added `resolvePartnerOwner`, reused by 2A/2B/2C routes)
- ✅ New endpoints: `GET /api/partner/properties` (list), `GET`/`PATCH
  /api/partner/properties/[roomId]` (single villa read/update) — same partner-key pattern,
  ownership checked via the room's parent `properties.owner_id`.
- ✅ `admin/rooms.php` (list) and `room-edit.php` (edit) rewritten against this — **42 real Claris
  villas** confirmed live through the full path (list → single → round-trip update all verified
  over real HTTP).
- ⚠️ **Deliberately scoped down** — the original `room-edit.php` had 5 tabs (Details, Gallery,
  Units, SEO, Publish) with image upload/re-encoding, a FAQ editor, and iCal-backed
  units/availability management. Only **Details** (name, description, price, max guests, size,
  amenities) plus a **read-only** photo gallery are wired. Not yet built — logged as remaining
  work, not silently dropped:
  1. Gallery upload/reorder/delete (needs a Supabase Storage upload endpoint, not just Sanity/DB)
  2. FAQs — no field for this on Klickenya's `rooms` table yet
  3. Units/iCal management — Klickenya's PMS doesn't have a matching "units per room" concept the
     same way; needs its own design pass, likely folds into bucket 2D (holds/availability)
  4. SEO title/description fields — no equivalent column on Klickenya's `rooms` yet
  5. Slug editing and villa create/delete — higher-risk write actions, deferred deliberately
- ⚠️ **Public site is now decoupled from admin edits** — the static snapshot (`includes/villas-static.php`) still generates from the old Neon data, not Klickenya. Edits made in the
  new `room-edit.php` won't appear on the live site until Phase 4 repoints the snapshot generator.
  Flagged in-page with an admin notice so this isn't a silent surprise.

##### For-sale properties — ✅ DONE (2026-07-08)
**Confirmed:** unlike villas, no for-sale data existed anywhere in Klickenya yet (checked live —
empty). Genuinely new content, not just rewiring.
**Files:** `admin/properties.php`, `property-edit.php`, `includes/klickenya.php` (added
`klickenya_request()` generic helper + for-sale wrappers),
`apps/studio/schemas/property.ts` (added `partner` reference field, mirroring `listing.ts`),
`apps/web/app/api/partner/for-sale/route.ts` (new), `apps/web/app/api/partner/for-sale/[id]/route.ts` (new).
- ✅ Created the Klickenya `partner` Sanity document for Claris (`partner-claris` — none existed
  before this; only "Napulè Restaurant" did). Unblocks tours/offers too.
- ✅ For-sale properties are Sanity `property` documents, scoped via the new `partner` field.
- ✅ Full create → list → update round-trip verified live (test documents created and deleted
  during verification, not left in production content).
- ⚠️ Scoped down like villas: photo upload, SEO Google-preview widget, and delete aren't wired.

##### Tours — ✅ DONE (2026-07-08)
**Files:** `admin/tours.php`, `tour-edit.php`, `includes/klickenya.php` (tour wrappers),
`apps/web/app/api/partner/tours/route.ts` (new), `apps/web/app/api/partner/tours/[id]/route.ts` (new).
- ✅ Tours are Sanity `listing` documents (`type: "experience"`, `partner` → claris,
  `publishToMarketplace: false`), scoped via the partner reference.
- ✅ Full create → list → update round-trip verified live via both the browser fetch and the
  Claris PHP path (test docs created and deleted during verification).
- ⚠️ Scoped down: photo upload and delete aren't wired.

##### Offers — ✅ DONE (2026-07-08)
**Files:** `admin/offers.php`, `offer-edit.php`, `includes/klickenya.php` (offer wrappers),
`apps/studio/schemas/partner.ts` (added `promotions` array field),
`apps/web/app/api/partner/offers/route.ts` (new), `apps/web/app/api/partner/offers/[key]/route.ts` (new).
- ✅ Offers stored as the `promotions` array on the Claris `partner` Sanity document (not a
  top-level type — lightweight marketing banners, not marketplace inventory). Each addressed by
  Sanity array `_key`.
- ✅ Full CRUD (create/list/update/delete) verified live via both browser and Claris PHP path
  (test data self-cleans via the delete step).
- ⚠️ Scoped down: image upload isn't wired.

**2C is now functionally complete** (villas, for-sale, tours, offers all rewired to Klickenya).
Remaining across 2C, deferred deliberately and logged above per type: image/photo upload for all
four (needs Supabase Storage / Sanity asset upload endpoints), plus villa gallery/FAQ/units/iCal,
SEO Google-preview widgets, and slug editing. None block the Neon-retirement path; they're
fidelity gaps in the admin UI, not data-layer gaps.

#### 2D — Availability/holds → Klickenya booking engine — ✅ DONE (2026-07-08), read-only + stubs
**Files:** `admin/holds.php`, `gantt.php`, `conflicts.php`, `includes/klickenya.php`
(`klickenya_fetch_bookings`), `apps/web/app/api/partner/bookings/route.ts` (new).
**Model mismatch (key finding):** Claris used a `holds` table (pending→confirmed) over
`units`/`availability_blocks`. Klickenya models this differently — confirmed reservations live in
`bookings` (verified live, not from migration files — `nights` is a generated column, financials
in `*_kes`), and hold state is enquiry-level (`contact_requests.calendar_status = 'held'`,
`hold_type`, `expires_at`). No 1:1 mapping, and Klickenya's confirm/cancel/convert flows are
owner-session-authenticated with different semantics.
- ✅ `GET /api/partner/bookings` — merges the partner's confirmed `bookings` + held enquiries into
  one feed, scoped via `resolvePartnerOwner`. Verified live: correctly excluded another owner's
  booking (count 0), then surfaced a throwaway Claris booking with the right room name (count 1),
  then cleaned up.
- ✅ `admin/holds.php` rewritten as a **read-only** Holds & Bookings view (KPIs + table). Confirm/
  cancel deliberately deferred to the Klickenya host dashboard (same deferral pattern as 2A's
  write path) — flagged in-page.
- ✅ `admin/gantt.php` (calendar-block editor) and `admin/conflicts.php` (iCal channel-conflict
  resolver) converted to informational stubs pointing at the Klickenya dashboard. Both previously
  wrote Claris-only availability tables; conflicts.php overlaps Phase 5 (iCal). Off Neon now,
  clearly communicated, no hidden regression.
- ⚠️ **Remaining for 2D (deferred):** confirm/cancel/convert write actions from the Claris admin;
  a partner-scoped calendar-block edit API (to restore gantt.php's editor); channel-conflict
  resolution (folds into Phase 5 iCal). All need owner-scoped write endpoints that don't exist
  yet.

#### 2E — Remaining admin pages still on Neon (newly surfaced 2026-07-08)
Buckets 2A–2D covered submissions, auth, content, and holds — but the admin has a few more pages
that still read Neon directly, found while doing 2D:
- `admin/dashboard.php` — KPI tiles (counts from Neon).
- `admin/audit.php` — the admin audit log (`admin_audit_log` table).
- `admin/settings.php` — site settings (`settings` table); note `set_setting`/`setting` in
  `includes/db.php` still hit Neon, and `audit_log()` writes to Neon on every admin action.
- `includes/_layout.php` sidebar — a `channel_conflicts` count query on every page load (already
  wrapped in try/catch, so it degrades to 0 when Neon is gone — safe, but still a live query
  until then).
These weren't in the original 2A–2D plan. Decide per page: repoint (dashboard KPIs could read the
partner API), drop (audit log may not be needed once Klickenya owns the data), or leave until
Phase 6. None block the public-site/forms work (Phases 3–5).

### Full Neon audit — everything still touching Neon (2026-07-08)
Grep of the whole Claris repo for live DB calls. **Key finding: much of it is already dormant** —
villa pages use the Klickenya booking widget (`room.php`: `$USE_KLICKENYA = true`, embed.js), so
the local booking/availability/iCal stack is a fallback that the live site no longer exercises.

**ACTIVE Neon dependencies (still hit on the live site):**
- Public form writes — `api/submit-contact.php`, `submit-enquiry.php`, `submit-agency.php`,
  `submit-newsletter.php` (INSERT into `submissions` + a Neon `COUNT` rate-limit on every submit).
  Each already forwards to Klickenya; the Neon write is the redundant half. **Nuance:**
  `submit-enquiry.php` interleaves the active enquiry+forward path with a *dormant* local
  hold-creation branch (`create_hold_with_block`, only reached when `$form_mode==='availability'`
  — legacy fallback). Flipping to Klickenya-only means dropping that legacy branch.
  Rate-limiting must move to a non-Neon mechanism (file-based, or rely on Klickenya's built-in
  per-IP limit). Local `send_notification` (Claris-team email) lives in `mail.php` and is
  Neon-free — keep it so the Claris team keeps getting alerts.
- Public content pages that still read Neon directly — `property.php` (for-sale detail;
  for-sale data now lives in Sanity via 2C, so this should read Sanity/Klickenya), `sitemap.php`
  (rooms/tours listing). NOTE: `index.php`, `rooms.php`, `room.php`, `tours.php`, `offers.php`,
  `for-sale.php` already read the static snapshot, not Neon directly.
- Admin leftovers (see 2E) — `dashboard.php`, `audit.php`, `settings.php`, `hold-action.php`.

**DORMANT Neon code (fallback-only, live site doesn't use it):**
- `booking.php`, `api/check-availability.php` — legacy local booking form (superseded by widget).
- `api/ical.php`, `api/sync-ical.php`, `bin/ical-expire-holds.php` — local iCal engine
  (Klickenya has its own; `rooms.ical_export_token` seen live).
- `create_hold_with_block` / `expire_stale_holds` in `includes/db.php`.

**Stale after 2B (login is Klickenya now) — safe to remove/stub:**
- `admin/forgot-password.php`, `admin/reset-password.php`, `bin/create-admin.php`,
  `bin/reset-admin-password.php`, and the `login_attempts` rate-limit still in `includes/auth.php`.

**Migration/infra (retire with Neon in Phase 6):**
- `admin/migrate.php`, `bin/migrate.php`, `db/schema.sql`, `db/migrations/*`, and the PDO
  connector + `setting`/`set_setting`/`audit_log` helpers in `includes/db.php`.

**Reality check:** "no more Neon" is not one more edit. It's Phases 3–5 + 2E (code) **plus Phase 6**
(migrate existing rows, ~2-week parallel run, then drop the DB) — the last part is operational, not
code, so it cannot be completed in a single session. The DB connector stays wired until Phase 6
regardless of how much code is repointed.

### Phase 3 — Flip public forms to Klickenya-only — ✅ DONE (2026-07-08)
**Files:** `api/submit-contact.php`, `submit-enquiry.php`, `submit-agency.php`,
`submit-newsletter.php`, `includes/ratelimit.php` (new).
- ✅ All four forms: removed the Neon `INSERT` into `submissions` and the Neon `COUNT`
  rate-limit. Added `includes/ratelimit.php` — a file-based per-IP limiter (same limits: 5/10min
  for contact/enquiry/agency, 3/hr for newsletter). Kept `klickenya_forward(...)` and the
  Neon-free `send_notification` (so the Claris team still gets email alerts).
- ✅ `submit-enquiry.php`: dropped the dormant local availability/24h-hold branch
  (`find_available_unit` / `create_hold_with_block`) — villa pages use the Klickenya widget,
  which owns availability. Room/tour lookup kept (reads the snapshot, not Neon) for the subject.
- ✅ Verified live: newsletter POST through the real Claris PHP server → `forwarded:true` (no
  Neon), and the file-based limiter returned 200,200,429 per-IP as expected. Test subscribers
  cleaned from dev.
- **The public forms no longer touch Neon at all.** (`includes/db.php` is still `require`d for
  `client_ip()`/`e()`/`parse_env()`, which don't open a DB connection unless a query runs.)

### 2E — Leftover admin pages → off Neon — ✅ DONE (2026-07-08)
- ✅ `admin/dashboard.php` — repointed KPIs + recent list to `klickenya_fetch_submissions()`.
- ✅ `admin/settings.php`, `admin/audit.php` — stubbed to informational pages (their options were
  all legacy-booking / local-auth, now handled by Klickenya). Removes the last
  `setting`/`set_setting`/`audit_log` callers among admin pages.
- ✅ `admin/forgot-password.php`, `admin/reset-password.php`, `admin/hold-action.php` — stubbed
  (login + holds are Klickenya now).
- ✅ `includes/auth.php` — `login_attempts` Neon throttle replaced with a file-based per-IP
  failure counter (`is_rate_limited`/`login_record_failure`/`login_clear_failures`); Klickenya
  also rate-limits server-side.
- ✅ `admin/_layout.php` — removed the per-page `channel_conflicts` COUNT query (now hard 0).

### Phase 4 — Public pages off Neon — 🟡 PARTIAL (2026-07-08)
- ✅ `property.php` (for-sale detail + "other properties"), `sitemap.php` — repointed to the
  snapshot-first accessors (added `fetch_property_by_slug` / `fetch_property_images` to
  `includes/db.php`); no direct Neon reads at request time.
- ✅ `booking.php` — stubbed to a "contact us" notice (local hold management retired).
- ❌ **Remaining (the keystone) — and it is BLOCKED ON DATA, not code (verified 2026-07-08):**
  `scripts/export-villas-static.php` still builds the snapshot from Neon. Repointing it to
  Klickenya was investigated in depth and **cannot be done yet without gutting the live public
  site**, because Klickenya does not hold complete content:
  - **Slugs are fine** — all **42/42** villa slugs match Klickenya's `booking_slug` exactly, so
    public URLs/SEO would be preserved. (Earlier worry was a false alarm from an unsorted peek.)
  - **But the data is incomplete in Klickenya:**
    - **42/42 villas have `price_kes = 0`** — the Phase 1 import brought name/description/photos/
      amenities/slug but NOT prices. Sourcing villas from Klickenya today → every villa shows no
      price. The live snapshot still has the real prices.
    - **0 tours, 0 for-sale, 0 offers in Klickenya** — these were never migrated; the admin can
      now *create* them (2C), but the existing content still lives only in Neon. Sourcing from
      Klickenya today → blank `/tours`, `/for-sale`, `/offers`.
    - Also lost in the current villa data: FAQs, the short/long description split, bed counts,
      and display currency/unit (Klickenya is KES-only).
  - **Sequencing correction:** Phase 4 (generator) therefore depends on the **content migration**
    (Phase 6's "import existing Neon rows into Klickenya"), not the other way round. The generator
    can only source from Klickenya once Klickenya actually holds the complete, priced content.
    Building it before then would break the live site — so it is intentionally NOT done.
  - Secondary shape mismatch to handle at that point: partner API returns `photos` as URL arrays
    per item; the snapshot uses separate `images`/`tourImages`/`propertyImages` maps keyed by id.
    Assign synthetic int ids in the generator (the `fetch_*` accessors cast ids to int).

### Phase 5 — iCal / local booking engine retired — ✅ DONE (2026-07-08)
- ✅ `api/ical.php` → 410 Gone (OTAs should use Klickenya's per-room iCal export).
- ✅ `api/sync-ical.php`, `bin/ical-expire-holds.php`, `api/check-availability.php` → no-op
  stubs (no local availability store to sync/expire/check).

### ✅ Milestone (2026-07-08): the entire LIVE request path is off Neon
Every public page, admin page, and API endpoint now serves without a Neon query. A full-repo grep
for live DB calls returns only **offline/CLI** files: `scripts/export-villas-static.php` (Phase 4
keystone), and `admin/migrate.php` / `bin/migrate.php` / `bin/create-admin.php` /
`bin/reset-admin-password.php` (infra + dead-after-2B CLI — deleted with Neon in Phase 6).
**Neon is not yet gone** — the snapshot generator still sources content from it, the connector +
helpers remain in `includes/db.php` as the Phase-6 fallback, and existing data hasn't been
migrated — but nothing the browser hits touches Neon anymore.

### Phase 6 — Data migration & safe cutover (do not skip this)
This is what makes retirement *safe*, not just *code-complete*.
1. **Export existing Neon data:** every row in `rooms`, `room_images`, `tours`, `tour_images`,
   `offers`, `properties`, `property_images`, `submissions` (history), `admin_users`, `settings`.
2. **Import into Sanity/Supabase:** a one-time migration script (same pattern as Klickenya's own
   `import-villas.mjs`) that creates the equivalent Sanity docs / Supabase rows for every existing
   Neon record. Run once, verify record counts match on both sides.
3. **Parallel-run ~2 weeks:** keep Neon reachable and read-only while the new code paths run in
   production. Verify: new submissions land correctly in Klickenya, holds still block dates
   correctly, content edited in the new admin matches what the public site renders.
4. **Keep a rollback path during the parallel run:** don't delete the old Neon-querying code in
   `includes/db.php` until cutover is confirmed — same pattern already used by
   `content_snapshot()` falling back to Neon when the snapshot file is absent.
5. **Decommission Neon:** only after 2 weeks of matching data and zero incidents. Then: drop the
   Render Postgres instance, remove `DATABASE_URL` from env, delete the old Neon-only code paths,
   mark `db/schema.sql` + `db/migrations/*` as historical (no longer run).

---

## How to run & test locally

**Two servers:** the Claris site + the Klickenya app (for the booking widget and form
forwarding).

1. **Klickenya app** on `http://localhost:3000` (Next.js dev server).
2. **Claris site** on `http://localhost:8765`:
   - Public pages render from the static snapshot — **no database needed**.
   - Forms need PHP with the `pdo_pgsql` + `curl` extensions (to write Neon + forward).
   - Clean URLs need the dev router:
     `php -S localhost:8765 dev-router.php`  (run from the Claris folder)

**What to test:**
- Browse: homepage, `/rooms`, a villa (e.g. `/room?slug=twiga-house`), `/tours`,
  `/for-sale`, `/offers` — all should render fully.
- Villa page → the **Klickenya booking widget** (calendar) appears in "Book This Villa".
- Submit the **contact form** and **newsletter** → they appear in Klickenya
  (`general_contacts` / `newsletter_subscribers`).

**Regenerate the content snapshot** after any villa/offer/tour/for-sale edit:
`php scripts/export-villas-static.php`

---

## Files changed

**Phase 1 (all in the Claris repo unless noted):**
- `includes/klickenya.php` (new) — Klickenya forward bridge
- `includes/villas-static.php` (new, generated) — content snapshot
- `scripts/export-villas-static.php` (new) — snapshot generator
- `dev-router.php` (new) — local dev clean-URL router
- `includes/db.php` — static-first content accessors
- `room.php`, `rooms.php`, `index.php`, `for-sale.php`, `tours.php`, `offers.php` — read snapshot
- `api/submit-contact.php`, `submit-newsletter.php`, `submit-enquiry.php`, `submit-agency.php` — forward to Klickenya
- Klickenya repo: **no changes needed** for the above (reused existing endpoints)

**Phase 2–6:** file lists are per-bucket above (2A–2D) and per-phase (3–6). Append actual PRs/
commits here as each phase lands.
