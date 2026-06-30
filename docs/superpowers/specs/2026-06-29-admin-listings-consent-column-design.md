# Admin Listings — Consent Column

**Date:** 2026-06-29
**Status:** Approved design

## Goal

In the admin listings table (`/admin/listings`), add a **Consent** column so an
admin can see at a glance which listings have had the claim/consent form
completed (and the host's photo-consent choice) and which haven't.

## Scope

Single file: `apps/web/app/admin/listings/page.tsx`. No new tables, API, or
migration. Read-only display.

## Data

A listing has consent on file when a `claim_requests` row exists for its Sanity
`_id` with `status = 'verified'`. This covers both the public `/claim` flow and
the new host-dashboard completion. Add one query to the existing `Promise.all`:

```
adminClient
  .from("claim_requests")
  .select("listing_sanity_id, photo_consent, created_at")
  .eq("status", "verified")
  .order("created_at", { ascending: false })
```

Build `consentMap = Map<listing_sanity_id, photo_consent | null>`, keeping the
FIRST row seen per listing (most recent, since ordered desc). A listing may have
multiple verified rows (public + host_dashboard); the latest wins.

## Column

- **Header:** "Consent", placed immediately **after Status** (between Status and
  Price). Update the empty-state `colSpan` from 9 → 10.
- **Cell:**
  - Not in `consentMap` → grey `—` (no form received).
  - In `consentMap` → green **✓** badge + the photo-consent label:
    - `yes_all` → "All photos"
    - `yes_logo_only` → "Logo only"
    - `no` → "Own photos"
    - `null`/other → "On file" (form completed, no photo preference recorded)

```ts
function photoConsentLabel(v: string | null | undefined): string {
  switch (v) {
    case "yes_all": return "All photos";
    case "yes_logo_only": return "Logo only";
    case "no": return "Own photos";
    default: return "On file";
  }
}
```

## Error handling / edge cases

- No verified claims → every cell shows `—` (the query returns `[]`).
- `photo_consent` null on a verified row → "On file".
- Filtering/tabs unchanged; the column renders for whatever rows are shown.

## Testing / verification

No test framework; verify via `npx tsc --noEmit` + ESLint, and a preview check of
the listings table showing the new column with a mix of on-file / — values.

## Out of scope

- Surfacing the full consent record (terms text, timestamp) — the column is a
  status indicator only.
- Any change to how consent is captured.
