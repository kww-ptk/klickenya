# Host Listing Claim Completion (post-login, no OTP)

**Date:** 2026-06-26
**Status:** Approved design (simplified scope)

## Goal

After an admin assigns a listing to a host, the host logs into their dashboard,
sees the assigned listing, and is prompted: **"Fully claim your listing — fill out
the form."** They complete the existing claim/consent form (confirm details +
photo-use consent), with **no email/OTP** (their login already proves identity).
The consent + details are stored against the listing so every claimed listing has
this info on file.

## Scope

In scope:
- A dashboard prompt for each assigned listing that hasn't completed the claim form.
- A logged-in claim/consent form (reuses the existing multi-step form, minus OTP).
- An authenticated endpoint that stores the completion in `claim_requests`.

Explicitly out of scope (uses what already exists):
- Host account creation + access email — handled by the existing admin create-host
  flow. This feature assumes the host account already exists when a listing is assigned.
- No new consent table — reuse `claim_requests`.
- No OTP, no rate limiting (identity = authenticated session).
- `isVerified` is unchanged — the assign flow already sets it. "Fully claimed" here
  means **consent on file**, tracked by a completed `claim_requests` row.

## What already exists (reused)

- **Assign flow** ([assign/route.ts](apps/web/app/api/admin/hosts/[id]/assign/route.ts))
  links a Sanity listing to a host and sets verification.
- **Claim form UI** ([ClaimForm.tsx](apps/web/components/claim/ClaimForm.tsx)) — 4 steps
  (details → accuracy → otp → success). The "accuracy" step holds the corrections,
  online-presence, **photo-use consent radio** (`yes_all` / `yes_logo_only` / `no`),
  and consent checkbox + `CONSENT_TEXT`.
- **`claim_requests`** stores: `listing_sanity_id`, `listing_slug`, `claimant_*`,
  `everything_correct`, `incorrect_fields`, `additional_notes`, `social_media_url`,
  `website_url`, `photo_consent`, `consent_given`, `consent_timestamp`, `consent_text`,
  `status`.
- **Dashboard** ([dashboard/page.tsx](apps/web/app/dashboard/page.tsx)) already fetches
  the host's assigned listings via `hostId == user_id || host._ref == sanity_host_id`.

## Architecture

Mirror existing patterns: server-validated REST route + a focused page that renders
the reused form component.

### 1. Migration — attribute host-completed claims
`claim_requests` gains two nullable columns so we can tell a host-dashboard
completion apart from a public claim and know which host completed it:
- `host_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL`
- `source text DEFAULT 'public'` (values: `'public'`, `'host_dashboard'`)

(The consent columns already exist — they are written by the public claim flow.)

Next migration number is **076** (075 is the most recent on disk; note 073 has a
known collision, so do not reuse < 076).

### 2. Authenticated completion endpoint — `POST /api/claim/complete`
- Requires an authenticated user (host); 401 otherwise.
- Body: `listingSanityId`, `listingSlug`, `listingTitle`, `listingType`, `listingCity`,
  plus the accuracy/consent fields (`everythingCorrect`, `incorrectFields`,
  `additionalNotes`, `socialMediaUrl`, `websiteUrl`, `photoConsent`, `consentGiven`,
  `consentText`). The server stamps `consent_timestamp` (`now()`); `consentGiven` must
  be `true` (400 otherwise).
- **Ownership check:** verify the listing is actually assigned to this user — query
  Sanity for the listing and confirm `hostId == user.id` OR `host._ref == hostProfile.sanity_host_id`
  OR the listing is in the host doc's `listings[]`. Reject with 403 if not.
- Insert a `claim_requests` row: `status = 'verified'`, `source = 'host_dashboard'`,
  `host_user_id = user.id`, `claimant_name/email/phone` from the host profile, plus the
  consent fields. No OTP, no GHL.
- Returns `{ success: true }`.

### 3. Logged-in claim form
Add an optional `mode` to `ClaimForm` (default `"public"`, new `"authenticated"`):
- `authenticated` mode prefills name/email/phone from the host profile (read-only)
  and **skips the OTP step** — the "accuracy" step's submit posts to
  `/api/claim/complete` and goes straight to the success step.
- `public` mode is unchanged (initiate → OTP → verify), so the existing public
  `/claim/[slug]` flow is untouched.
- Keeping one component avoids duplicating ~600 lines; the only branch points are the
  identity prefill, the submit endpoint, and whether the OTP step exists.

### 4. Dashboard prompt + claim page
- **Prompt:** On `/dashboard`, fetch the set of `listing_sanity_id`s that already have a
  completed claim for this host (one `claim_requests` query: `host_user_id = user.id`
  AND `status = 'verified'`, plus a fallback match on `claimant_email`). For each
  assigned listing NOT in that set, render a banner/button: *"Fully claim your listing —
  complete a short form"* linking to the claim page.
- **Claim page:** `/dashboard/claim/[id]` (server component) — loads the listing by
  Sanity `_id`, re-checks it's assigned to the logged-in host (else redirect to
  `/dashboard`), and renders `ClaimForm` in `authenticated` mode. On success, the form
  shows the success step; the dashboard prompt disappears on next load.

## Data flow

Admin assigns listing → host logs in → dashboard lists assigned listings and the
"completed" set → incomplete listings show the prompt → host opens `/dashboard/claim/[id]`
→ submits accuracy + consent → `POST /api/claim/complete` validates ownership and writes
the `claim_requests` row → prompt gone, consent on file.

## Error handling

- Unauthenticated → 401; listing not assigned to this host → 403; missing/false
  consent → 400.
- Ownership re-checked both on the page (redirect) and in the endpoint (authoritative).
- Duplicate completion: allowed but harmless (the prompt simply keys off "≥1 completed
  row exists"); the latest row is the record of consent.

## Testing / verification

No test framework in repo; verify via `npx tsc --noEmit` + ESLint, and preview-based
manual check: assign a listing to a test host, log in as that host, confirm the prompt
appears, complete the form, confirm a `claim_requests` row is written and the prompt
disappears. The public `/claim/[slug]` flow must remain unchanged.

## Out of scope / future

- Auto-creating the host + single combined email at assign time (your earlier larger
  idea) — separate feature.
- Surfacing consent status in the admin panel.
- Editing/withdrawing consent after submission.
