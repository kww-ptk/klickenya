# Fix Plan — Registration, Roles & Host Listing Flows

> Companion to [audit-auth-roles-listings.md](./audit-auth-roles-listings.md).
> Branch: `fix/auth-roles-listings` (off `dev`). Written before implementation.
> Two buckets: **(1) Fixing now** — bounded, low/medium risk. **(2) Deferred** —
> structural features that need a dedicated project; documented, not implemented.

---

## Bucket 1 — Fixing now

### F-1 · A-1 + S-2 — Canonical domain for auth/email links
**Problem:** `emailRedirectTo` hardcoded to `https://www.klickenya.com/auth/callback`;
approval emails use `https://www.klickenya.com/login`. Wrong host → "link expired."
**Fix:**
- Add a shared `SITE_URL` derived from `process.env.NEXT_PUBLIC_SITE_URL`
  (fallback `https://klickenya.com`).
- `register/actions.ts`: `emailRedirectTo: ${SITE_URL}/auth/callback`.
- `claims/[id]/approve/route.ts` & `listing-requests/[id]/approve/route.ts`:
  replace `https://www.klickenya.com/login` and `https://www.klickenya.com/...`
  with `${SITE_URL}/...`.
**Files:** `apps/web/app/(auth)/register/actions.ts`,
`apps/web/app/api/admin/claims/[id]/approve/route.ts`,
`apps/web/app/api/admin/listing-requests/[id]/approve/route.ts`.
**Risk:** Low. **Test:** typecheck; confirm strings build from env.
**Also required (config, not code):** ensure `NEXT_PUBLIC_SITE_URL` and the
Supabase Auth "Redirect URLs" allowlist both include the canonical domain.

### F-2 · B-1 + B-2 — Approved `/list` listings go live & verified
**Problem:** approve creates `status: "draft"`, `isVerified: false`, but emails
"now live." Approved listings never appear on the marketplace.
**Fix (product decision — aligns with the email and with claim-approve):**
- In `listing-requests/[id]/approve/route.ts` set on create:
  `status: "published"`, `isVerified: true`, `verificationStatus: "verified"`.
**Files:** `apps/web/app/api/admin/listing-requests/[id]/approve/route.ts`.
**Risk:** Medium — makes approval immediately public. Reversible by flipping back to
`draft`. Note: programmatic create bypasses Studio's "photo required for published"
validation, so listings with no photo *could* publish; acceptable for now,
flagged below as a follow-up validation.

### F-3 · B-3 — Correct slug-uniqueness check
**Problem:** uniqueness compares candidate slug against `listing_requests.sanity_listing_id`
(never matches). Real Sanity slug collisions aren't caught.
**Fix:** query Sanity for an existing listing with that slug and suffix if found:
`*[_type=="listing" && slug.current==$slug][0]._id`.
**Files:** `apps/web/app/api/admin/listing-requests/[id]/approve/route.ts`.
**Risk:** Low.

### F-4 · R-3 — Email signup honours `?role=host`
**Problem:** `/register?role=host` says "Create your host account" but email signup
always creates a guest; only Google honours it.
**Fix:** pass the role through the form and into `registerAction`; when `role==="host"`
write `role: "host"` (users + user_metadata) and create a `host_profiles` row
instead of `guest_profiles` (mirrors the OAuth callback path).
**Files:** `apps/web/app/(auth)/register/page.tsx` (hidden role input),
`apps/web/app/(auth)/register/actions.ts`.
**Risk:** Medium — self-serve host creation via email, but this only makes email
*consistent with the already-existing Google host path*. Does NOT touch the
listing-approval gate.

### F-5 · H-1 + B-5 — "List your business" entry point in the host dashboard
**Problem:** no way to reach `/list` from the dashboard; empty state only offers
"Claim a listing" → homepage.
**Fix:**
- Add a primary **"List your business →"** button (links to `/list`) in the
  "My Listings" page header (always visible).
- Update the empty state to offer **both** "List your business" (`/list`) and
  "Claim a listing" (`/`), with copy clarifying the difference.
**Files:** `apps/web/app/dashboard/listings/page.tsx`.
**Risk:** Low (additive UI).

### F-6 · S-3 — Refresh stale CLAUDE.md note
**Problem:** CLAUDE.md lists `/list` as "NOT YET BUILT."
**Fix:** mark `/list` as built/live; note the AI-assist step needs `FIRECRAWL_API_KEY`.
**Files:** `CLAUDE.md`.
**Risk:** None.

---

## Bucket 2 — Deferred (documented, NOT implemented)

These are real fixes but are multi-step features or refactors. Attempting them
blind would be risky; each deserves its own branch + review.

### D-1 · H-2 — Host-side listing create/edit/view (CRUD)
Hosts cannot edit listing content because it lives in Sanity. Proper fix = a host
listing editor in the dashboard backed by a host-scoped Sanity write API (auth:
only the listing's `host`/`hostId`). Sizeable. **Plan:** new `/dashboard/listings/[id]/edit`
route + `/api/host/listings/[id]` PATCH that validates ownership before writing to
Sanity. Out of scope for this branch.

### D-2 · H-3 + H-4 + S-1 — Bridge PMS property ↔ marketplace listing
The two-model split is the root confusion. Fix = a "Publish to marketplace" action
on a PMS property that pre-fills a listing from property data (reverse of the
existing import), plus surfacing PMS properties in "My Listings"/stats. Feature-sized.

### D-3 · A-2 — Email-confirmation robustness
Switch email confirmation from a one-time link to a 6-digit OTP code (like the
claim/list flows already use) to dodge scanner pre-clicks. Auth change; needs care.

### D-4 · A-3 — Remove pre-confirmation row writes
Stop writing `users`/`guest_profiles` in `registerAction` before email confirmation;
rely on the `/auth/callback` upsert. Needs verification it doesn't break any flow
that reads those rows pre-confirmation.

### D-5 · A-4 — Stop putting temp passwords in URLs
Replace `?email=&temp=` auto-login with a single-use, short-lived magic token.

### D-6 · R-4 — Consolidate the 3 host-provisioning paths
Extract one `provisionHost()` helper used by OAuth callback, claim approve, and
listing approve so behaviour can't drift.

### D-7 · B-4 — AI-assist step
Either configure `FIRECRAWL_API_KEY` or feature-flag the step off so users don't see
a guaranteed error. (Currently degrades gracefully to "fill manually," so low
urgency.)

### D-8 · S-4 — `listing_requests.admin_notes` column (migration 068)
`/api/admin/listing-requests/[id]/note` 500s until the column exists. Needs a DB
migration — deliberately not run from here.

---

## Verification plan for Bucket 1
- `pnpm --filter @klickenya/web tsc --noEmit` (typecheck) must pass.
- Dev server (already running on :3000) compiles the changed routes/pages without
  errors.
- Manual: dashboard "My Listings" shows the new button; register page carries the
  role through.

## Out of scope / safety notes
- No database migrations run.
- No changes pushed to `main`. Work stays on `fix/auth-roles-listings` → `dev` →
  (your call) `main`.
- `.env.local` / `.vercel` must remain gitignored (they hold secrets).
