# Two-Source Consent Detection Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Detect "consent on file" from both the claim flow (`claim_requests`) and the submission flow (`listing_requests`), so the dashboard doesn't re-ask owners who already gave consent and the admin Consent column reflects both.

**Architecture:** One shared helper `getConsentByListingId(ids)` returns a map of listing id → photo_consent for listings with consent from either table; the dashboard prompt and the admin listings column both call it.

**Tech Stack:** Next.js 15 App Router, Supabase service-role `adminClient`. No test framework — verify via `npx tsc --noEmit` + ESLint + preview.

**Spec:** `docs/superpowers/specs/2026-06-29-consent-detection-two-sources-design.md`

---

## File Structure

| File | Action | Responsibility |
|---|---|---|
| `apps/web/lib/admin/listingConsent.ts` | Create | `getConsentByListingId` — union both consent sources |
| `apps/web/app/dashboard/page.tsx` | Modify | Use the helper for the "Fully claim" prompt |
| `apps/web/app/admin/listings/page.tsx` | Modify | Use the helper for the Consent column |

**Verification (from `apps/web` after each task):** `npx tsc --noEmit` → no output, exit 0.

---

## Task 1: Shared consent helper

**Files:**
- Create: `apps/web/lib/admin/listingConsent.ts`

- [ ] **Step 1: Create the helper**

```ts
import { adminClient } from "@/lib/supabase/admin";

/**
 * Map of listing Sanity _id → recorded photo_consent for every listing in `ids`
 * that has consent on file from EITHER flow:
 *   - claim flow:      claim_requests, status = 'verified' (public /claim or the
 *                      logged-in host-dashboard completion)
 *   - submission flow: listing_requests, consent_given = true, linked by
 *                      sanity_listing_id (set when an admin approves a /list submission)
 * Claim-flow consent takes precedence on the photo_consent value when a listing
 * has both; for claim_requests the most recent verified row wins.
 */
export async function getConsentByListingId(
  ids: string[]
): Promise<Map<string, string | null>> {
  const map = new Map<string, string | null>();
  if (ids.length === 0) return map;

  // Submission-flow consent (listing_requests, linked via sanity_listing_id).
  const { data: subRows } = await adminClient
    .from("listing_requests")
    .select("sanity_listing_id, photo_consent")
    .eq("consent_given", true)
    .in("sanity_listing_id", ids);
  for (const r of (subRows ?? []) as {
    sanity_listing_id: string | null;
    photo_consent: string | null;
  }[]) {
    if (r.sanity_listing_id) map.set(r.sanity_listing_id, r.photo_consent ?? null);
  }

  // Claim-flow consent (claim_requests) — overrides; most recent verified wins.
  const { data: claimRows } = await adminClient
    .from("claim_requests")
    .select("listing_sanity_id, photo_consent, created_at")
    .eq("status", "verified")
    .in("listing_sanity_id", ids)
    .order("created_at", { ascending: false });
  const seen = new Set<string>();
  for (const r of (claimRows ?? []) as {
    listing_sanity_id: string | null;
    photo_consent: string | null;
  }[]) {
    if (r.listing_sanity_id && !seen.has(r.listing_sanity_id)) {
      seen.add(r.listing_sanity_id);
      map.set(r.listing_sanity_id, r.photo_consent ?? null);
    }
  }

  return map;
}
```

- [ ] **Step 2: Typecheck**

Run: `cd "/Users/patrikgiuliana/Desktop/CLAUDE CODE/klickenya/apps/web" && npx tsc --noEmit`
Expected: no output, exit 0.

- [ ] **Step 3: Commit**

```bash
cd "/Users/patrikgiuliana/Desktop/CLAUDE CODE/klickenya"
git add apps/web/lib/admin/listingConsent.ts
git commit -m "feat(consent): shared two-source consent detection helper

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 2: Dashboard prompt uses the helper

**Files:**
- Modify: `apps/web/app/dashboard/page.tsx`

- [ ] **Step 1: Add the import**

Replace:
```tsx
import { getMenusForOwner } from "@/lib/cache/menu";
```
with:
```tsx
import { getMenusForOwner } from "@/lib/cache/menu";
import { getConsentByListingId } from "@/lib/admin/listingConsent";
```

- [ ] **Step 2: Replace the claim-only detection block**

Replace this block:
```tsx
  // Assigned listings still missing a completed claim/consent form.
  // A listing counts as claimed if ANY verified claim_requests row exists for it
  // (host-dashboard completion OR an earlier public /claim). Matching by the
  // host's own listing ids covers both without string-interpolating an email.
  const claimedListingIds = new Set<string>();
  if (listings.length > 0) {
    const { data: completedClaims } = await adminClient
      .from("claim_requests")
      .select("listing_sanity_id")
      .eq("status", "verified")
      .in(
        "listing_sanity_id",
        listings.map((l) => l._id)
      );
    for (const r of completedClaims ?? []) {
      if (r.listing_sanity_id) claimedListingIds.add(r.listing_sanity_id);
    }
  }
  const listingsNeedingClaim = listings.filter(
    (l) => !claimedListingIds.has(l._id)
  );
```
with:
```tsx
  // A listing has consent on file if either flow captured it: the claim flow
  // (claim_requests) or the submission flow (listing_requests). When consent is
  // already on file we do NOT prompt the owner to "fully claim" it again.
  const consentMap = await getConsentByListingId(listings.map((l) => l._id));
  const claimedListingIds = new Set(consentMap.keys());
  const listingsNeedingClaim = listings.filter(
    (l) => !claimedListingIds.has(l._id)
  );
```

- [ ] **Step 3: Typecheck**

Run: `cd "/Users/patrikgiuliana/Desktop/CLAUDE CODE/klickenya/apps/web" && npx tsc --noEmit`
Expected: no output, exit 0.

- [ ] **Step 4: Commit**

```bash
cd "/Users/patrikgiuliana/Desktop/CLAUDE CODE/klickenya"
git add apps/web/app/dashboard/page.tsx
git commit -m "fix(consent): dashboard prompt recognizes submission consent

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 3: Admin Consent column uses the helper

**Files:**
- Modify: `apps/web/app/admin/listings/page.tsx`

- [ ] **Step 1: Add the import**

Replace:
```tsx
import { adminClient } from "@/lib/supabase/admin";
```
with:
```tsx
import { adminClient } from "@/lib/supabase/admin";
import { getConsentByListingId } from "@/lib/admin/listingConsent";
```

- [ ] **Step 2: Drop the inline claim_requests query from the parallel fetch**

Replace:
```tsx
  const [listings, { data: contactRequests }, { data: menuData }, { data: consentRows }] = await Promise.all([
    sanityClient.fetch<Listing[]>(
      `*[_type == "listing"] | order(_createdAt desc) {
        _id, title, slug, type, subcategory, city, status, price, priceUnit, _createdAt
      }`
    ),
    adminClient.from("contact_requests").select("listing_id"),
    adminClient.from("menus").select("listing_slug, reservations_enabled"),
    adminClient
      .from("claim_requests")
      .select("listing_sanity_id, photo_consent, created_at")
      .eq("status", "verified")
      .order("created_at", { ascending: false }),
  ]);
```
with:
```tsx
  const [listings, { data: contactRequests }, { data: menuData }] = await Promise.all([
    sanityClient.fetch<Listing[]>(
      `*[_type == "listing"] | order(_createdAt desc) {
        _id, title, slug, type, subcategory, city, status, price, priceUnit, _createdAt
      }`
    ),
    adminClient.from("contact_requests").select("listing_id"),
    adminClient.from("menus").select("listing_slug, reservations_enabled"),
  ]);
```

- [ ] **Step 3: Replace the inline consent-map build with the helper**

Replace:
```tsx
  // Build consent map keyed by listing Sanity id. A listing can have several
  // verified claims (public + host-dashboard); rows are ordered newest-first, so
  // the first one seen per listing is the most recent.
  const consentMap = new Map<string, string | null>();
  for (const r of (consentRows ?? []) as {
    listing_sanity_id: string | null;
    photo_consent: string | null;
  }[]) {
    if (r.listing_sanity_id && !consentMap.has(r.listing_sanity_id)) {
      consentMap.set(r.listing_sanity_id, r.photo_consent ?? null);
    }
  }
```
with:
```tsx
  // Consent on file from either flow (claim_requests or listing_requests),
  // keyed by listing Sanity id → recorded photo_consent.
  const consentMap = await getConsentByListingId(listings.map((l) => l._id));
```

- [ ] **Step 4: Typecheck + lint**

Run: `cd "/Users/patrikgiuliana/Desktop/CLAUDE CODE/klickenya/apps/web" && npx tsc --noEmit`
Expected: no output, exit 0. (The Consent column already calls `consentMap.has(listing._id)` and `photoConsentLabel(consentMap.get(listing._id))`, which are unchanged.)

Run: `cd "/Users/patrikgiuliana/Desktop/CLAUDE CODE/klickenya/apps/web" && npx eslint app/admin/listings/page.tsx app/dashboard/page.tsx lib/admin/listingConsent.ts`
Expected: no NEW errors on the changed lines (pre-existing warnings on dashboard/listings — e.g. `<img>`, prefer-const on unrelated vars — are not introduced here).

- [ ] **Step 5: Commit**

```bash
cd "/Users/patrikgiuliana/Desktop/CLAUDE CODE/klickenya"
git add apps/web/app/admin/listings/page.tsx
git commit -m "feat(consent): admin Consent column uses two-source detection

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 4: Final verification

**Files:** none (verification only)

- [ ] **Step 1: Full typecheck**

Run: `cd "/Users/patrikgiuliana/Desktop/CLAUDE CODE/klickenya/apps/web" && npx tsc --noEmit`
Expected: no output, exit 0.

- [ ] **Step 2: Lint touched paths**

Run: `cd "/Users/patrikgiuliana/Desktop/CLAUDE CODE/klickenya/apps/web" && npx eslint lib/admin/listingConsent.ts app/dashboard/page.tsx app/admin/listings/page.tsx`
Expected: no errors on `listingConsent.ts`; no NEW errors on the two pages.

- [ ] **Step 3: Manual verification via preview**

1. **Submission-consent listing:** take a listing created via `/list` → admin-approve (its `listing_requests` row has `consent_given = true` and `sanity_listing_id` set). Log in as that owner → the dashboard does **not** show the "Fully claim your listing" prompt for it. In `/admin/listings`, that listing's **Consent** column shows ✓ (+ its photo-consent label).
2. **No-consent listing:** a listing with no `claim_requests` verified row and no consent-bearing `listing_requests` → dashboard still prompts; admin column shows "—".
3. **Claim-flow listing:** a listing completed via the host-dashboard claim form still counts (unchanged behavior).

- [ ] **Step 4: Capture proof**

preview_screenshot the dashboard for an owner with a submission-consent listing (no prompt) and the admin Consent column showing ✓ for it.

---

## Self-Review Notes

- **Spec coverage:** shared helper unioning both sources (Task 1) ✓; dashboard stops re-asking owners with submission consent (Task 2) ✓; admin column reflects both sources (Task 3) ✓; no migration (reads existing columns) ✓.
- **Type consistency:** `getConsentByListingId(ids: string[]): Promise<Map<string, string | null>>` (Task 1) is consumed in Task 2 (`new Set(consentMap.keys())`) and Task 3 (`consentMap.has(_id)` / `consentMap.get(_id)` feeding the existing `photoConsentLabel`); both rely only on the documented return shape.
- **No placeholders:** every step has complete code.
- **Deviation from TDD:** no test framework; verification is typecheck + lint + preview (Task 4).
