# Claris → Klickenya — Remaining Work Plan

> Date: 2026-07-07 · Companion to [claris-integration-plan.md](./claris-integration-plan.md),
> [claris-handoff-patrick.md](./claris-handoff-patrick.md). Covers what's left AFTER the
> forms bridge + static public site were built.

---

## ✅ Done so far (local, uncommitted)

1. **Villa booking widget** — Claris villa pages embed the Klickenya booking widget;
   bookings save in Klickenya and show in the host dashboard.
2. **All guest forms dual-write to Klickenya** — contact, "Plan Your Stay" enquiry,
   tour/spa enquiries, owner/agency leads, and newsletter each save locally AND forward
   to Klickenya (`includes/klickenya.php`). Non-blocking: a Klickenya outage can't break
   the Claris form.
3. **Entire public site off Neon** — a static snapshot (`includes/villas-static.php`,
   built by `scripts/export-villas-static.php`) holds all villas, photos, tours, offers,
   for-sale properties, and settings. `includes/db.php` reads the snapshot (DB is the
   fallback). Verified: every public page renders with the database switched off.

## 🔴 What still keeps Neon alive

- The whole **`/admin`** panel reads and writes Neon (submissions, rooms, holds, offers,
  tours, properties, users, settings).
- The public **forms still ALSO write to Neon** (dual-write safety net).
- **Content edits** (villas/offers/tours/for-sale) are made in the Claris admin → Neon,
  then the static snapshot is regenerated.

---

## Direction (confirmed 2026-07-07)

**Claris must FULLY rely on the Klickenya engine — no Neon database at all.** The goal is to
retire Neon entirely (full replacement). The earlier "hybrid" idea of keeping a small Neon
content back-office is OUT; content management must move into Klickenya too.

## The plan to finish (full replacement)

### Phase 1 — Host-scoped submissions inbox in Klickenya
**Goal:** the Claris team sees *their* contacts/leads/newsletter inside Klickenya without
platform-wide admin access.

- Bookings/enquiries already appear in the Claris host dashboard (scoped by property). ✅
- Contacts/leads currently land in Klickenya's shared platform admin (`general_contacts`),
  newsletter in `newsletter_subscribers` — not in the Claris host's own view.
- **Build (Klickenya repo, feat→dev→main):**
  1. Add a `source` column to `general_contacts` (newsletter already has `source`); the
     Claris bridge already sends `source: "claris"` for newsletter — extend the contact/
     lead forwards to send a `source` too.
  2. Add a host-dashboard "Messages" page that lists `general_contacts` + newsletter
     filtered to the host's source/partner tag.
  3. Give the Claris team a Klickenya host login (the pilot host account already exists;
     set a real email + password for production).

### Phase 2 — Move content management into Klickenya (no Neon back-office)
Claris's admin also manages **offers, tours, for-sale listings, and rich villa content** —
Klickenya has no equivalent yet. Since Neon must go entirely, these have to be **rebuilt in
Klickenya** (data model + admin/host UI for offers, tours, for-sale, and full villa content),
then the static snapshot is generated from Klickenya instead of Neon. This is the largest piece
of the full-replacement work — scope and sequence it deliberately (villa content first, then
offers/tours/for-sale).

### Phase 3 — Flip forms to Klickenya-only
Once Phase 1 is proven, stop the Neon writes in `api/submit-*.php` (keep only the Klickenya
forward). Removes the last public-form dependency on Neon.

### Phase 4 — Retire / shrink Neon
- Hybrid: shrink Neon to just the content tables the back-office edits.
- Full: migrate old records into Klickenya, then shut Neon down.

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

## Files changed (all in the Claris repo unless noted)

- `includes/klickenya.php` (new) — Klickenya forward bridge
- `includes/villas-static.php` (new, generated) — content snapshot
- `scripts/export-villas-static.php` (new) — snapshot generator
- `dev-router.php` (new) — local dev clean-URL router
- `includes/db.php` — static-first content accessors
- `room.php`, `rooms.php`, `index.php`, `for-sale.php`, `tours.php`, `offers.php` — read snapshot
- `api/submit-contact.php`, `submit-newsletter.php`, `submit-enquiry.php`, `submit-agency.php` — forward to Klickenya
- Klickenya repo: **no changes needed** for the above (reused existing endpoints)
