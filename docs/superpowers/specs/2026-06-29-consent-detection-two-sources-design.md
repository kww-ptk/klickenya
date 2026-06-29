# Consent Detection from Both Sources

**Date:** 2026-06-29
**Status:** Approved design

## Goal

Treat a listing as "consent already on file" if consent was captured by **either**
flow, so the dashboard never re-asks an owner who already gave consent when they
submitted the listing, and the admin "Consent" column reflects both flows.

## Problem

Consent can be captured two ways, stored in two tables:
1. **Claim flow** → `claim_requests` (public `/claim` OTP flow, or the logged-in
   host-dashboard completion). Keyed by `listing_sanity_id`, `status = 'verified'`.
2. **Submission flow** → `listing_requests` (owner fills `/list`, includes
   `consent_given` / `photo_consent` / `consent_text`). On admin approval the row
   gets `sanity_listing_id` (= the published listing's Sanity `_id`).

Today the dashboard "Fully claim your listing" prompt and the admin "Consent"
column only look at `claim_requests`. So a listing the owner submitted **with**
consent, then approved by admin, is treated as having no consent — the dashboard
wrongly prompts the owner again, and the admin column shows "—".

## Solution

A listing has consent on file when EITHER:
- a `claim_requests` row exists with `status = 'verified'` for its `listing_sanity_id`, OR
- a `listing_requests` row exists with `consent_given = true` and
  `sanity_listing_id` = the listing's id.

### Shared helper — `apps/web/lib/admin/listingConsent.ts` (new)
```
getConsentByListingId(ids: string[]): Promise<Map<string /* listing _id */, string | null /* photo_consent */>>
```
- Returns an entry for every listing in `ids` that has consent from either
  source; the value is the recorded `photo_consent` (may be null).
- Empty `ids` → empty map (skip the queries).
- Queries `listing_requests` (consent_given true, `sanity_listing_id` in ids) and
  `claim_requests` (status verified, `listing_sanity_id` in ids, newest first).
  Claim-flow consent takes precedence on the `photo_consent` value when a listing
  has both; for `claim_requests`, the most recent verified row wins.

### Consumers
- **Dashboard** (`apps/web/app/dashboard/page.tsx`): replace the existing
  `claim_requests`-only query with `getConsentByListingId(listings.map(l => l._id))`;
  `claimedListingIds = new Set(map.keys())`; `listingsNeedingClaim` unchanged.
- **Admin listings column** (`apps/web/app/admin/listings/page.tsx`): replace the
  inline `claim_requests` query + `consentMap` build with
  `getConsentByListingId(listings.map(l => l._id))`. The existing column rendering
  (`consentMap.has(_id)` → ✓ + `photoConsentLabel(...)`, else "—") is unchanged.

## Data flow

Owner submits via `/list` (consent stored in `listing_requests`) → admin approves
(sets `sanity_listing_id`, publishes Sanity listing) → owner logs in: the
dashboard calls `getConsentByListingId`, finds the submission consent, and does
NOT show the "Fully claim" prompt for that listing. The admin Consent column shows
✓ for it too.

## Error handling / edge cases

- Listing with consent in both tables → counted once; admin column shows the
  claim-flow `photo_consent`.
- Listing approved before this change with submission consent → now correctly
  recognized (no backfill needed; reads existing `listing_requests` rows).
- No consent in either table → dashboard prompt shows; admin column shows "—".

## Testing / verification

No test framework; verify via `npx tsc --noEmit` + ESLint, and a preview check: a
listing created via the `/list` → admin-approve path does NOT show the dashboard
prompt for its owner and shows ✓ in the admin Consent column.

## Out of scope

- Changing how consent is captured in either flow.
- Backfilling or migrating consent records (the helper reads what exists).
