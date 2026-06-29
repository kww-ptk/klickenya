# Admin Listing Requests — Edit Submission + Approve Anytime

**Date:** 2026-06-29
**Status:** Approved design

## Goal

In the admin listing-request review page (`/admin/listing-requests/[id]`):
1. Allow **Approve / Reject at any time** — including after a reply, a status
   change ("Mark Responded"), or a **rejection** — so a submission can always be
   approved and published. (Re-approving an already-approved request stays
   blocked to avoid creating a duplicate Sanity listing.)
2. Let the admin **edit the submission's core content** before approving; the
   edited values flow into the published Sanity listing.

## Background (current behavior)

- Page gating: `canApprove = status === "submitted" || "new"`; once status becomes
  `responded` / `converted` / `closed` / `rejected`, the Approve button is hidden.
- The **approve route already allows** approving from any status except
  `approved` (returns 409 "Already approved"); the reject route blocks only when
  `approved`. So the limitation is purely the page's UI gating.
- Draft fields are read-only on the page; there is no edit endpoint (only
  note / status / reply / approve / reject). The approve route builds the Sanity
  listing from the `draft_*` columns of `listing_requests`.

## Part 1 — Approve / Reject anytime

In `apps/web/app/admin/listing-requests/[id]/page.tsx`, change:
```ts
const canApprove = request.status === "submitted" || request.status === "new";
const canReject = request.status !== "rejected" && request.status !== "approved";
```
to:
```ts
const canApprove = request.status !== "approved";
const canReject = request.status !== "approved";
```
No route change needed — the approve route's `status === "approved"` guard already
permits approving a `rejected` (or any non-approved) request and is idempotent
against double-approval.

## Part 2 — Edit core content

### Editable fields (→ `listing_requests` column)
- Title → `draft_title`
- City → `draft_city`
- Type → `listing_type`
- Subcategory → `draft_subcategory`
- Business name → `business_name`
- Description → `draft_description`
- Website → `draft_website`
- Instagram → `draft_instagram`
- Phone → `draft_phone`
- Email → `draft_email`

(All columns already exist — no migration. Price / county / address / amenities /
tags / photos are out of scope per the chosen "core content" scope.)

### New endpoint — `PATCH /api/admin/listing-requests/[id]/draft`
- `assertAdmin`-gated.
- Body: the 10 fields above (all optional strings; `listing_type` validated
  against the known set `stay | experience | event | service | rental |
  restaurant`).
- Updates only those columns on the `listing_requests` row via `adminClient`;
  empty strings stored as `null` for the optional contact/link fields. Title and
  Type are not allowed to be blanked (kept required). Returns `{ success: true }`.

### New client component — `ListingContentEditor.tsx`
- Renders the "Listing Content" section. Default = read-only view (same fields as
  today). An **Edit** button toggles an inline form pre-filled from the draft
  values; **Save** PATCHes the draft endpoint then `router.refresh()`; **Cancel**
  reverts. Type is a `<select>` of the known types; Subcategory is a text input;
  the rest are text inputs / a textarea for Description.
- `page.tsx` replaces the inline read-only "Listing Content" block with
  `<ListingContentEditor>`, passing the current draft values + the request `id`.

## Data flow

Admin opens a request (any status) → optionally clicks **Edit**, changes core
fields, Saves → `PATCH …/draft` updates `listing_requests` → admin clicks
**Approve** (now visible in any non-approved state) → the approve route reads the
updated `draft_*` columns → publishes the listing to Sanity with the edited
content.

## Error handling / edge cases

- Edit endpoint admin-gated; invalid `listing_type` → 400; blank title/type → 400.
- Approve after reject: allowed (route already supports it); status becomes
  `approved`, listing published, submitter notified per the existing approve flow.
- Already approved: Approve/Reject hidden (page) and the route returns 409 as a
  backstop.

## Testing / verification

No test framework; verify via `npx tsc --noEmit` + ESLint, and a preview check:
open a request, edit a field, save, confirm it persists; reject, confirm Approve
is still available; approve and confirm the listing publishes with the edited
content.

## Out of scope

- Editing price / location detail / amenities / tags / photos.
- Changing the approve/reject route logic or the email/host-creation behavior.
- A separate edit page (editing is inline on the detail page).
