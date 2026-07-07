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

##### For-sale properties, tours, offers — not started
Still pending: confirm whether Claris's for-sale properties belong in the same Supabase PMS
`properties` table (different category) or need the Sanity `property` schema; build the Sanity
`partner` document for Claris (none exists yet — only "Napulè Restaurant" does) plus the
`promotions` array field on it for offers; build the `listing` (type: experience) integration for
tours. Each is roughly its own build the size of the villas work above.

#### 2D — Availability/holds → Klickenya booking engine (do fourth — depends on 2C)
**Files:** `admin/holds.php`, `conflicts.php`, `gantt.php`
- Replace `units`/`holds`/`availability_blocks` queries with Klickenya's
  `create_booking_with_payment()` RPC + `property_fees`/`booking_fees`, keyed by the Sanity
  document `_id` from 2C (not the old Neon `room_id`/`unit_id`).
- **Test:** create a hold from admin, confirm it blocks the correct date range on the public
  availability calendar.

### Phase 3 — Flip public forms to Klickenya-only
**Files:** `api/submit-contact.php`, `submit-enquiry.php`, `submit-agency.php`,
`submit-newsletter.php`
- Remove the Neon `INSERT`, keep only `klickenya_forward(...)`.
- **Sequencing:** only after 2A is live and verified — submissions need somewhere real to land
  before you cut off the Neon write.

### Phase 4 — Static snapshot sources from Sanity, not Neon
**File:** `scripts/export-villas-static.php`
- Rewrite the generator to pull rooms/tours/offers/properties from Sanity's GROQ API instead of
  Neon `SELECT`s.
- `includes/db.php`'s snapshot-reading functions (`fetch_room_by_slug`, `fetch_published_villas`,
  etc.) don't need to change — they already read the snapshot file first, DB second. Only the
  generator's data source changes.
- **Sequencing:** only after 2C is live and verified.

### Phase 5 — iCal sync repoints to Klickenya
**Files:** `api/ical.php`, `bin/ical-expire-holds.php`
- Repoint from Neon's `holds`/`availability_blocks` to the same Klickenya booking tables 2D uses.
- **Sequencing:** only after 2D is live and verified.

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
