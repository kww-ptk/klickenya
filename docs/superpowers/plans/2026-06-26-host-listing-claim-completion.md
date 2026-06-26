# Host Listing Claim Completion Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** After an admin assigns a listing to a host, the logged-in host sees a dashboard prompt to "fully claim" each assigned listing and completes the existing claim/consent form with no OTP; the consent + details are stored in `claim_requests`.

**Architecture:** Reuse the existing `ClaimForm` (adding an `authenticated` mode that skips OTP and prefills identity), add an authenticated `POST /api/claim/complete` endpoint that validates the listing is assigned to the host and writes a `claim_requests` row, and surface a prompt on the dashboard for assigned listings without a completed claim. One small migration attributes host-dashboard completions.

**Tech Stack:** Next.js 15 App Router, Supabase (`@supabase/ssr` cookie client for auth + `adminClient` service-role for writes), Sanity (`sanityPreviewClient`), TailwindCSS. No test framework in repo — verify via `npx tsc --noEmit` + ESLint + preview-based manual check.

**Spec:** `docs/superpowers/specs/2026-06-26-host-listing-claim-completion-design.md`

---

## File Structure

| File | Action | Responsibility |
|---|---|---|
| `supabase/migrations/076_claim_requests_host_completion.sql` | Create | Add `host_user_id` + `source`; idempotently re-declare the prod-only consent columns |
| `apps/web/app/api/claim/complete/route.ts` | Create | Authenticated completion endpoint: ownership check + insert `claim_requests` row |
| `apps/web/components/claim/ClaimForm.tsx` | Modify | Add `mode="authenticated"`: prefill identity, skip OTP, post to `/api/claim/complete` |
| `apps/web/app/dashboard/claim/[id]/page.tsx` | Create | Server page: verify assignment, render `ClaimForm` in authenticated mode |
| `apps/web/app/dashboard/claim/[id]/loading.tsx` | Create | Loading skeleton (project rule: every dashboard route has one) |
| `apps/web/app/dashboard/page.tsx` | Modify | Compute completed-claim set, render the "fully claim" prompt |

**Verification command (from `apps/web` after each task):** `npx tsc --noEmit` → expect no output, exit 0.

---

## Task 1: Migration — attribute host-dashboard completions

**Files:**
- Create: `supabase/migrations/076_claim_requests_host_completion.sql`

- [ ] **Step 1: Create the migration**

```sql
-- 076: Support host-dashboard claim completion (post-login, no OTP).
--
-- Adds attribution columns so a host-completed claim can be told apart from a
-- public claim, and which host completed it. Also idempotently re-declares the
-- consent/accuracy columns: these exist in production (written by the public
-- /api/claim/initiate flow) but were never captured in a migration (schema
-- drift). IF NOT EXISTS makes this a no-op on prod and safe on a fresh DB.

ALTER TABLE claim_requests
  ADD COLUMN IF NOT EXISTS host_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS source text DEFAULT 'public';

-- Consent / accuracy columns (capture prod drift; no-op where they already exist)
ALTER TABLE claim_requests
  ADD COLUMN IF NOT EXISTS everything_correct boolean,
  ADD COLUMN IF NOT EXISTS incorrect_fields   text[],
  ADD COLUMN IF NOT EXISTS additional_notes   text,
  ADD COLUMN IF NOT EXISTS social_media_url   text,
  ADD COLUMN IF NOT EXISTS website_url        text,
  ADD COLUMN IF NOT EXISTS photo_consent      text,
  ADD COLUMN IF NOT EXISTS consent_given      boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS consent_timestamp  timestamptz,
  ADD COLUMN IF NOT EXISTS consent_text       text;

CREATE INDEX IF NOT EXISTS idx_claim_requests_host_user
  ON claim_requests(host_user_id, status);
```

- [ ] **Step 2: Verify the file is well-formed SQL (visual scan)**

Run: `grep -c "ADD COLUMN IF NOT EXISTS" "/Users/patrikgiuliana/Desktop/CLAUDE CODE/klickenya/supabase/migrations/076_claim_requests_host_completion.sql"`
Expected: `11`

- [ ] **Step 3: Commit**

```bash
cd "/Users/patrikgiuliana/Desktop/CLAUDE CODE/klickenya"
git add supabase/migrations/076_claim_requests_host_completion.sql
git commit -m "feat(claim): migration for host-dashboard claim completion

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

> NOTE: This migration must be applied to prod (Supabase SQL editor / CLI). The feature degrades without `host_user_id`/`source` (the dashboard query in Task 5 filters on `host_user_id`).

---

## Task 2: Authenticated completion endpoint

**Files:**
- Create: `apps/web/app/api/claim/complete/route.ts`

- [ ] **Step 1: Create the route**

```ts
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { adminClient } from "@/lib/supabase/admin";
import { sanityPreviewClient } from "@/lib/sanity/client";

// Confirms a listing is assigned to this host (forward field, host ref, or the
// host doc's listings[] array) — mirrors the dashboard/assign linkage.
const OWNS_QUERY = `count(*[_type == "listing" && _id == $id && (
  hostId == $uid
  || host._ref == $shid
  || _id in *[_type == "host" && _id == $shid][0].listings[]._ref
)]) > 0`;

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const body = await req.json();
    const {
      listingSanityId,
      listingSlug,
      listingTitle,
      listingType,
      listingCity,
      everythingCorrect,
      incorrectFields,
      additionalNotes,
      socialMediaUrl,
      websiteUrl,
      photoConsent,
      consentGiven,
      consentText,
    } = body;

    if (!listingSanityId || !listingSlug || !listingTitle || !listingType) {
      return NextResponse.json(
        { error: "Missing listing details" },
        { status: 400 }
      );
    }
    if (consentGiven !== true) {
      return NextResponse.json({ error: "Consent is required" }, { status: 400 });
    }

    // Host profile — authoritative claimant fields + sanity_host_id.
    const { data: host } = await adminClient
      .from("host_profiles")
      .select("user_id, display_name, email, phone, sanity_host_id")
      .eq("user_id", user.id)
      .single();
    if (!host) {
      return NextResponse.json(
        { error: "Host profile not found" },
        { status: 403 }
      );
    }

    // Ownership check — the listing must be assigned to this host.
    const owns = await sanityPreviewClient
      .fetch<boolean>(OWNS_QUERY, {
        id: listingSanityId,
        uid: user.id,
        shid: host.sanity_host_id ?? "",
      })
      .catch(() => false);
    if (!owns) {
      return NextResponse.json(
        { error: "This listing is not assigned to you" },
        { status: 403 }
      );
    }

    const nowIso = new Date().toISOString();
    const { error: insErr } = await adminClient.from("claim_requests").insert({
      listing_slug: listingSlug,
      listing_sanity_id: listingSanityId,
      listing_title: listingTitle,
      listing_type: listingType,
      listing_city: listingCity ?? null,
      claimant_name: host.display_name ?? "Host",
      claimant_email: host.email ?? user.email ?? "",
      claimant_phone: host.phone ?? "",
      otp_code: "", // not used — authenticated completion
      otp_expires_at: nowIso, // satisfies NOT NULL; irrelevant for verified rows
      status: "verified",
      verified_at: nowIso,
      source: "host_dashboard",
      host_user_id: user.id,
      everything_correct:
        typeof everythingCorrect === "boolean" ? everythingCorrect : null,
      incorrect_fields:
        Array.isArray(incorrectFields) && incorrectFields.length
          ? incorrectFields
          : null,
      additional_notes: additionalNotes || null,
      social_media_url: socialMediaUrl || null,
      website_url: websiteUrl || null,
      photo_consent: photoConsent ?? null,
      consent_given: true,
      consent_timestamp: nowIso,
      consent_text: consentText || "",
    });

    if (insErr) {
      console.error("Claim complete insert error:", insErr);
      return NextResponse.json(
        { error: "Could not save. Please try again." },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Claim complete error:", err);
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
  }
}
```

- [ ] **Step 2: Typecheck**

Run: `cd "/Users/patrikgiuliana/Desktop/CLAUDE CODE/klickenya/apps/web" && npx tsc --noEmit`
Expected: no output, exit 0.

- [ ] **Step 3: Commit**

```bash
cd "/Users/patrikgiuliana/Desktop/CLAUDE CODE/klickenya"
git add apps/web/app/api/claim/complete/route.ts
git commit -m "feat(claim): authenticated claim-complete endpoint

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 3: ClaimForm — authenticated mode (skip OTP)

Adds an opt-in `mode="authenticated"` that prefills identity, removes the OTP step, and posts to `/api/claim/complete`. The default `"public"` path is unchanged.

**Files:**
- Modify: `apps/web/components/claim/ClaimForm.tsx`

- [ ] **Step 1: Extend the props interface**

Replace:
```tsx
interface ClaimFormProps {
  listingSlug: string;
  listingSanityId: string;
  listingTitle: string;
  listingType: string;
  listingSubcategory?: string | null;
  listingCity?: string;
}
```
with:
```tsx
interface ClaimFormProps {
  listingSlug: string;
  listingSanityId: string;
  listingTitle: string;
  listingType: string;
  listingSubcategory?: string | null;
  listingCity?: string;
  /** "public" (default): initiate → OTP → verify. "authenticated": logged-in host,
   *  prefilled identity, no OTP — posts to /api/claim/complete. */
  mode?: "public" | "authenticated";
  prefillName?: string;
  prefillEmail?: string;
  prefillPhone?: string;
}
```

- [ ] **Step 2: Destructure the new props + prefill identity state**

Replace:
```tsx
export function ClaimForm({
  listingSlug,
  listingSanityId,
  listingTitle,
  listingType,
  listingSubcategory,
  listingCity,
}: ClaimFormProps) {
```
with:
```tsx
export function ClaimForm({
  listingSlug,
  listingSanityId,
  listingTitle,
  listingType,
  listingSubcategory,
  listingCity,
  mode = "public",
  prefillName = "",
  prefillEmail = "",
  prefillPhone = "",
}: ClaimFormProps) {
  const authenticated = mode === "authenticated";
```

Then replace the identity state initializers:
```tsx
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
```
with:
```tsx
  const [name, setName] = useState(prefillName);
  const [email, setEmail] = useState(prefillEmail);
  const [phone, setPhone] = useState(prefillPhone);
```

- [ ] **Step 3: Compute visible steps (drop OTP when authenticated)**

Replace:
```tsx
  /* ── Progress indicator ── */
  const stepIndex = STEPS.findIndex((s) => s.key === step);
```
with:
```tsx
  /* ── Progress indicator ── */
  const visibleSteps = authenticated
    ? STEPS.filter((s) => s.key !== "otp")
    : STEPS;
  const stepIndex = visibleSteps.findIndex((s) => s.key === step);
```

Then inside `ProgressDots`, replace both `STEPS.map((s, i) =>` and the `i < STEPS.length - 1` reference so the component maps `visibleSteps`:
```tsx
  function ProgressDots() {
    return (
      <div className="flex items-center justify-center gap-0 mb-8">
        {visibleSteps.map((s, i) => (
          <div key={s.key} className="flex items-center">
            <div className="flex flex-col items-center">
              <div
                className={cn(
                  "w-3 h-3 rounded-full transition-all duration-200",
                  i < stepIndex
                    ? "bg-amber"
                    : i === stepIndex
                      ? "border-2 border-amber bg-transparent"
                      : "bg-border"
                )}
              />
              <span
                className={cn(
                  "text-[10px] mt-1.5 whitespace-nowrap",
                  i <= stepIndex ? "text-dark font-semibold" : "text-text3"
                )}
              >
                {s.label}
              </span>
            </div>
            {i < visibleSteps.length - 1 && (
              <div
                className={cn(
                  "w-12 h-px mx-1 -mt-4",
                  i < stepIndex ? "bg-amber" : "bg-border"
                )}
              />
            )}
          </div>
        ))}
      </div>
    );
  }
```

- [ ] **Step 4: Add the authenticated submit handler**

Immediately after the closing brace of `handleSubmitClaim` (the function that posts to `/api/claim/initiate`), add:
```tsx
  /* ── Complete claim (authenticated — Step 2 → API, no OTP) ── */
  async function handleCompleteClaim() {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/claim/complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          listingSlug,
          listingSanityId,
          listingTitle,
          listingType,
          listingCity,
          everythingCorrect,
          incorrectFields: incorrectFields.length > 0 ? incorrectFields : undefined,
          additionalNotes:
            additionalNotes || extraNotes
              ? [additionalNotes, extraNotes].filter(Boolean).join("\n\n")
              : undefined,
          socialMediaUrl: socialMediaUrl || undefined,
          websiteUrl: websiteUrl || undefined,
          photoConsent: photoConsent ?? undefined,
          consentGiven: true,
          consentText: CONSENT_TEXT,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Something went wrong");
      setStep("success");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setIsLoading(false);
    }
  }
```

- [ ] **Step 5: Hide the "we'll email a code" hint when authenticated**

Replace:
```tsx
          <p className="text-xs text-text3">
            We&apos;ll send a 6-digit code to your email to verify your identity.
          </p>
```
with:
```tsx
          {!authenticated && (
            <p className="text-xs text-text3">
              We&apos;ll send a 6-digit code to your email to verify your identity.
            </p>
          )}
```

- [ ] **Step 6: Branch the accuracy-step submit button**

Replace:
```tsx
          <button
            onClick={handleSubmitClaim}
            disabled={isLoading}
            className="flex-1 bg-amber text-dark font-bold text-sm rounded-full py-3 hover:bg-[#d4911c] transition-all disabled:opacity-60 flex items-center justify-center gap-2"
          >
            {isLoading && <Loader2 className="size-4 animate-spin" />}
            Send verification code →
          </button>
```
with:
```tsx
          <button
            onClick={authenticated ? handleCompleteClaim : handleSubmitClaim}
            disabled={isLoading}
            className="flex-1 bg-amber text-dark font-bold text-sm rounded-full py-3 hover:bg-[#d4911c] transition-all disabled:opacity-60 flex items-center justify-center gap-2"
          >
            {isLoading && <Loader2 className="size-4 animate-spin" />}
            {authenticated ? "Save & complete claim →" : "Send verification code →"}
          </button>
```

- [ ] **Step 7: Adjust the success-step subtitle for authenticated completion**

Replace:
```tsx
        <p className="text-sm text-text2">
          Our team will review your listing within 24 hours. Once approved, your Verified badge will appear. Check your email for your confirmation.
        </p>
```
with:
```tsx
        <p className="text-sm text-text2">
          {authenticated
            ? "Your details and consent are saved. Thanks — your listing is fully claimed."
            : "Our team will review your listing within 24 hours. Once approved, your Verified badge will appear. Check your email for your confirmation."}
        </p>
```

- [ ] **Step 8: Typecheck**

Run: `cd "/Users/patrikgiuliana/Desktop/CLAUDE CODE/klickenya/apps/web" && npx tsc --noEmit`
Expected: no output, exit 0.

- [ ] **Step 9: Commit**

```bash
cd "/Users/patrikgiuliana/Desktop/CLAUDE CODE/klickenya"
git add apps/web/components/claim/ClaimForm.tsx
git commit -m "feat(claim): authenticated mode for ClaimForm (skip OTP)

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 4: Logged-in claim page + loading skeleton

**Files:**
- Create: `apps/web/app/dashboard/claim/[id]/page.tsx`
- Create: `apps/web/app/dashboard/claim/[id]/loading.tsx`

- [ ] **Step 1: Create the page**

```tsx
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { getAuthUser, getHostProfile } from "../../_lib/auth";
import { adminClient } from "@/lib/supabase/admin";
import { sanityPreviewClient } from "@/lib/sanity/client";
import { ClaimForm } from "@/components/claim/ClaimForm";

export const revalidate = 0;

type PageProps = { params: Promise<{ id: string }> };

export default async function DashboardClaimPage({ params }: PageProps) {
  const { id } = await params;
  const { user } = await getAuthUser();
  if (!user) redirect("/login");

  const host = await getHostProfile(user.id);
  if (!host) redirect("/dashboard");

  const listing = await sanityPreviewClient
    .fetch<{
      _id: string;
      title: string;
      type: string;
      subcategory: string | null;
      city: string | null;
      slug: string;
      hostId: string | null;
      hostRef: string | null;
    } | null>(
      `*[_type == "listing" && _id == $id][0]{
        _id, title, type, subcategory, city, "slug": slug.current,
        hostId, "hostRef": host._ref
      }`,
      { id }
    )
    .catch(() => null);

  if (!listing) notFound();

  const owns =
    listing.hostId === user.id ||
    (!!host.sanity_host_id && listing.hostRef === host.sanity_host_id);
  if (!owns) redirect("/dashboard");

  // Contact fields for prefill (the endpoint re-derives these authoritatively).
  const { data: contact } = await adminClient
    .from("host_profiles")
    .select("display_name, email, phone")
    .eq("user_id", user.id)
    .single();

  return (
    <div className="max-w-xl">
      <Link
        href="/dashboard"
        className="inline-flex items-center gap-1.5 text-[13px] text-text3 hover:text-dark transition-colors mb-5"
      >
        <span aria-hidden>←</span> Back to dashboard
      </Link>

      <h1 className="font-display text-[24px] font-bold text-dark mb-1">
        Fully claim {listing.title}
      </h1>
      <p className="text-[14px] text-text2 mb-6">
        Confirm your details and consent. This keeps your listing accurate and
        lets us feature your photos.
      </p>

      <div className="bg-white rounded-2xl border border-border p-6 shadow-sm">
        <ClaimForm
          mode="authenticated"
          listingSlug={listing.slug}
          listingSanityId={listing._id}
          listingTitle={listing.title}
          listingType={listing.type}
          listingSubcategory={listing.subcategory}
          listingCity={listing.city ?? undefined}
          prefillName={contact?.display_name ?? host.display_name ?? ""}
          prefillEmail={contact?.email ?? user.email ?? ""}
          prefillPhone={contact?.phone ?? ""}
        />
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Create the loading skeleton**

```tsx
export default function Loading() {
  return (
    <div className="max-w-xl animate-pulse">
      <div className="h-4 w-32 bg-border/60 rounded mb-5" />
      <div className="h-7 w-2/3 bg-border/60 rounded mb-2" />
      <div className="h-4 w-full bg-border/40 rounded mb-6" />
      <div className="bg-white rounded-2xl border border-border p-6 shadow-sm space-y-4">
        <div className="h-10 bg-border/40 rounded-xl" />
        <div className="h-10 bg-border/40 rounded-xl" />
        <div className="h-10 bg-border/40 rounded-xl" />
        <div className="h-24 bg-border/30 rounded-xl" />
        <div className="h-11 bg-border/50 rounded-full" />
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Typecheck**

Run: `cd "/Users/patrikgiuliana/Desktop/CLAUDE CODE/klickenya/apps/web" && npx tsc --noEmit`
Expected: no output, exit 0.

- [ ] **Step 4: Commit**

```bash
cd "/Users/patrikgiuliana/Desktop/CLAUDE CODE/klickenya"
git add "apps/web/app/dashboard/claim/[id]/page.tsx" "apps/web/app/dashboard/claim/[id]/loading.tsx"
git commit -m "feat(claim): logged-in claim page + loading skeleton

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 5: Dashboard prompt for unclaimed listings

**Files:**
- Modify: `apps/web/app/dashboard/page.tsx`

- [ ] **Step 1: Compute the completed-claim set**

Find this block (around lines 218–219):
```tsx
  const firstName = (hostProfile?.display_name ?? profile?.full_name ?? "Host").split(/\s+/)[0];
```
Insert immediately BEFORE it:
```tsx
  // Assigned listings still missing a completed claim/consent form.
  const claimedListingIds = new Set<string>();
  if (listings.length > 0) {
    const { data: completedClaims } = await adminClient
      .from("claim_requests")
      .select("listing_sanity_id")
      .eq("host_user_id", user.id)
      .eq("status", "verified");
    for (const r of completedClaims ?? []) {
      if (r.listing_sanity_id) claimedListingIds.add(r.listing_sanity_id);
    }
  }
  const listingsNeedingClaim = listings.filter(
    (l) => !claimedListingIds.has(l._id)
  );

```

- [ ] **Step 2: Render the prompt banner**

Find the end of the menu-banner block — the closing of `{unpublishedMenuSlug && ( ... )}` (the `</div>\n      )}` that closes that banner, around line 300). Immediately AFTER that closing `)}`, insert:
```tsx
      {/* Fully-claim prompt — assigned listings without a completed consent form */}
      {listingsNeedingClaim.length > 0 && (
        <div
          className="mb-5 rounded-xl lg:rounded-2xl border border-purple/20 bg-purple/[0.06] p-4 shadow-sm"
          style={{ borderLeft: "4px solid #7C3AED" }}
        >
          <p className="text-[13px] font-bold text-dark mb-1">
            Fully claim your {listingsNeedingClaim.length === 1 ? "listing" : "listings"}
          </p>
          <p className="text-[12.5px] text-text2 mb-3">
            Confirm your details and consent so we can keep things accurate and feature your photos.
          </p>
          <div className="space-y-2">
            {listingsNeedingClaim.map((l) => (
              <div
                key={l._id}
                className="flex items-center justify-between gap-3 bg-white rounded-xl border border-border px-3 py-2"
              >
                <span className="text-[13px] font-medium text-dark truncate">{l.title}</span>
                <Link
                  href={`/dashboard/claim/${l._id}`}
                  className="shrink-0 bg-purple text-white font-bold text-[12px] px-4 h-[34px] flex items-center rounded-full hover:bg-[#6D28D9] transition-colors whitespace-nowrap"
                >
                  Complete form →
                </Link>
              </div>
            ))}
          </div>
        </div>
      )}
```

- [ ] **Step 3: Typecheck**

Run: `cd "/Users/patrikgiuliana/Desktop/CLAUDE CODE/klickenya/apps/web" && npx tsc --noEmit`
Expected: no output, exit 0.

- [ ] **Step 4: Commit**

```bash
cd "/Users/patrikgiuliana/Desktop/CLAUDE CODE/klickenya"
git add apps/web/app/dashboard/page.tsx
git commit -m "feat(claim): dashboard prompt to fully claim assigned listings

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 6: Final verification

**Files:** none (verification only)

- [ ] **Step 1: Full typecheck**

Run: `cd "/Users/patrikgiuliana/Desktop/CLAUDE CODE/klickenya/apps/web" && npx tsc --noEmit`
Expected: no output, exit 0.

- [ ] **Step 2: Lint touched paths**

Run: `cd "/Users/patrikgiuliana/Desktop/CLAUDE CODE/klickenya/apps/web" && npx eslint app/api/claim/complete components/claim/ClaimForm.tsx "app/dashboard/claim/[id]" app/dashboard/page.tsx`
Expected: no errors (pre-existing warnings on `app/dashboard/page.tsx`, e.g. `<img>` usage, are acceptable; do not introduce NEW errors in the touched lines).

- [ ] **Step 3: Manual verification via preview**

Start the dev server (preview_start) and verify, signed in as a host with an assigned-but-unclaimed listing:
1. **Prompt appears:** `/dashboard` shows the "Fully claim your listing" banner listing the assigned listing(s).
2. **No OTP:** click "Complete form →" → `/dashboard/claim/[id]` → the form has 3 progress dots (Your details · Your listing · Done), identity is prefilled, and there is no "Verify email" step.
3. **Submit:** complete the accuracy + photo consent + consent checkbox → "Save & complete claim" → success step renders.
4. **Persisted + prompt clears:** return to `/dashboard` → the banner no longer lists that listing. (Optionally confirm a `claim_requests` row with `source = 'host_dashboard'`, `status = 'verified'`, `host_user_id` set.)
5. **Ownership guard:** visiting `/dashboard/claim/[id]` for a listing not assigned to this host redirects to `/dashboard`.
6. **Public flow intact:** open a public `/claim/[slug]` for an unclaimed listing → still shows the 4-step flow with the OTP step.

- [ ] **Step 4: Capture proof**

preview_screenshot the dashboard prompt and the authenticated claim form; preview_network to confirm `POST /api/claim/complete` returns 200.

---

## Self-Review Notes

- **Spec coverage:** dashboard prompt (Task 5) ✓; logged-in no-OTP form (Task 3) ✓; authenticated endpoint with ownership check + `claim_requests` write (Task 2) ✓; attribution columns + drift capture (Task 1) ✓; claim page + loading (Task 4) ✓; public flow untouched (Task 3 keeps `mode="public"` default) ✓; `isVerified` unchanged (no task touches it) ✓.
- **Type consistency:** `ClaimForm` new props (`mode`, `prefillName/Email/Phone`) defined in Task 3 and consumed in Task 4; `/api/claim/complete` body shape posted by `handleCompleteClaim` (Task 3) matches the destructure in Task 2; `listingsNeedingClaim`/`claimedListingIds` defined and used within Task 5; `source`/`host_user_id` columns (Task 1) written in Task 2 and queried in Task 5.
- **No placeholders:** every step has complete code.
- **Deviation from TDD:** repo has no test framework; verification is typecheck + lint + preview (Task 6), consistent with the codebase.
