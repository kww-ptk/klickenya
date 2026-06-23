# Audit — Registration, Roles & Host Listing Flows

> Status: **Audit only — no fixes applied.** Written 2026-06-23.
> Scope: account registration, login, role assignment (guest → host → admin),
> the host dashboard "My Listings" experience, and the `/list` creation flow.
> Reviewed across three points of view: **Guest**, **Host**, **Admin**.

---

## TL;DR verdict

**Yes — the flow is messy, and there are several genuinely broken paths.** The
biggest structural problem is that Klickenya has **two parallel "listing"
concepts that never meet in the UI**:

1. **Marketplace listing** = a Sanity document (what shows on klickenya.com, what
   "My Listings" reads).
2. **PMS property** = a Supabase row (what Property PMS manages, what the booking
   widget uses).

A host can fully build a **property** in the dashboard, yet **"My Listings" still
shows empty** because that panel only reads Sanity. The only way to get into "My
Listings" is to submit via `/list` *and* have an admin approve it — and even then
there's a bug that can leave the listing invisible on the marketplace (see
**B-1**). On top of that, a host **cannot create, edit, or view listing content
from the dashboard at all** — all listing editing lives in Sanity Studio (admin).

This document lists every issue found, grouped by area, with severity and file
references.

Severity key: 🔴 Broken / blocks a core flow · 🟠 Confusing or inconsistent ·
🟡 Polish / UX gap.

---

## Direct answer: "How does a user become a host? Is it after they create a list?"

It's inconsistent — there are **three different ways**, and they don't agree with
each other:

| Path | How | Result | Notes |
|---|---|---|---|
| **A. Google + `?role=host`** | Visit `/register?role=host` → "Continue with Google" | **Instant host** | Works, but undocumented & not discoverable. Only the Google button honours the role — see **R-3**. |
| **B. Submit a listing via `/list`** | Fill `/list` → admin approves | **Host created on approval** | This is the "become a host by listing" path. Host account is provisioned inside the approve route. |
| **C. Claim an existing listing** | `/claim/[slug]` → admin approves | **Host created on approval** | For businesses already scraped onto Klickenya. |
| Register normally | `/register` (email/password) | **Guest only** | Never becomes a host, even with `?role=host` (see **R-3**). |

So "is it after he creates a list?" — **partly.** Submitting a list (Path B) *does*
make you a host, **but only after an admin approves it**, not at submission time.
Meanwhile Path A makes you a host instantly with no listing at all. There is **no
single, obvious "become a host" action** — that's the core confusion.

---

## 1. Registration & Login

**Files:** `apps/web/app/(auth)/register/page.tsx`,
`apps/web/app/(auth)/register/actions.ts`,
`apps/web/app/(auth)/login/page.tsx`,
`apps/web/app/(auth)/auth/callback/route.ts`

### 🔴 A-1 — Confirmation email redirect is hardcoded to the wrong domain
`registerAction` sets `emailRedirectTo: "https://www.klickenya.com/auth/callback"`
([register/actions.ts:26](../apps/web/app/(auth)/register/actions.ts)) — note the
`www.`. The live site is `klickenya.com` (no www) and the deployment also serves
`klickenya-web.vercel.app`. If `www.klickenya.com` isn't a working host **and** in
Supabase's allowed Redirect URLs, the confirmation link fails and the user is
bounced to `/login?error=link_expired`. **This is the "email already expired"
symptom reported in testing**, and it affects *every* email/password signup.
- It should derive from `NEXT_PUBLIC_SITE_URL` (or the request origin), exactly
  like the OAuth flow already does (`window.location.origin`).

### 🟠 A-2 — Email confirmation links are single-use and scanner-fragile
Supabase confirmation links are one-time. Corporate/Gmail/Outlook link scanners
often "pre-click" them, consuming the token before the human → "expired." Combined
with A-1, email signup is effectively unreliable. (Google OAuth sidesteps both.)

### 🟠 A-3 — Orphan rows created before email is confirmed
`registerAction` writes a `users` row **and** a `guest_profiles` row via the
service-role client *immediately on signup*, before the email is confirmed
([register/actions.ts:35-58](../apps/web/app/(auth)/register/actions.ts)). If the
user never confirms (e.g. because of A-1), these rows are orphaned. The
`/auth/callback` upsert then re-creates them anyway, so the early write is both
redundant and a source of stale data.

### 🟠 A-4 — Temp password passed in the URL
The claim/listing approval emails send an **auto-login link** containing the temp
password as a query param: `/login?email=...&temp=welcomeNNN`
([login/page.tsx:19-47](../apps/web/app/(auth)/login/page.tsx), and the approve
routes). Passwords in URLs land in browser history, server logs, and referrer
headers. Functional, but a security smell.

### 🟡 A-5 — Error messages collapse all failures into "link expired"
`/auth/callback` maps any non-expiry error to `auth_error` and anything mentioning
"expired" to `link_expired`
([auth/callback/route.ts:12-23](../apps/web/app/(auth)/auth/callback/route.ts)).
Real causes (redirect-URL mismatch, PKCE failure) all surface to the user as
"your link expired," which misdirects debugging.

### 🟡 A-6 — Registration page has two different UIs depending on a flag
When `NEXT_PUBLIC_GUEST_REGISTRATION !== "true"`, the page renders a **Google-only**
variant; when true, it shows the email/password form **plus** Google
([register/page.tsx:35-80](../apps/web/app/(auth)/register/page.tsx)). Two distinct
experiences from one env flag is easy to misconfigure and confusing to support.

---

## 2. Roles

**Files:** `auth/callback/route.ts`, `register/page.tsx`, `middleware.ts`,
`api/admin/claims/[id]/approve/route.ts`,
`api/admin/listing-requests/[id]/approve/route.ts`

### 🔴 R-3 — `?role=host` only works via Google, silently ignored on email signup
`/register?role=host` changes the heading to "Create your host account"
([register/page.tsx:48](../apps/web/app/(auth)/register/page.tsx)), but the
email/password `registerAction` **always** writes `role: "guest"`
([register/actions.ts:25,45](../apps/web/app/(auth)/register/actions.ts)). Only the
**Google** button stores the `oauth_role_intent` cookie that the callback reads to
promote to host ([auth/callback/route.ts:80-107](../apps/web/app/(auth)/auth/callback/route.ts)).
So a user who lands on "Create your host account" and signs up **with email** gets
a **guest** account — a silent broken promise.

### 🟠 R-4 — Three host-provisioning code paths that don't agree
Host accounts are created in **three** places with **subtly different** logic:
- OAuth callback (`role=host` intent) → promotes, creates `host_profiles` (no slug,
  no Sanity host doc).
- Claim approve → creates host + Sanity host, sets listing `isVerified: true`,
  `planTier: "basic"`.
- Listing-request approve → creates host + Sanity host, sets listing
  `isVerified: false`, `status: "draft"`.

Same concept, three implementations → drift and inconsistent results (see B-1/B-2).

### 🟡 R-5 — First admin can only be made outside the app
No UI path creates an admin. It requires editing Supabase directly or running
`pnpm --filter @klickenya/web create:admin`
([apps/web/scripts/create-admin.ts](../apps/web/scripts/create-admin.ts)). Expected
for security, but undocumented in-product.

---

## 3. Host dashboard — "My Listings" (the reported pain)

**Files:** `apps/web/app/dashboard/listings/page.tsx`,
`apps/web/app/dashboard/layout.tsx`,
`apps/web/app/dashboard/property/new/page.tsx`

### 🔴 H-1 — Host cannot create a listing from the dashboard
There is **no "Create listing" / "List your business" button anywhere in the host
dashboard.** The "My Listings" empty state only offers **"Claim a listing"**, which
links to the homepage `/` — not to `/list`
([dashboard/listings/page.tsx:80-85](../apps/web/app/dashboard/listings/page.tsx)).
To create a new listing the host must *know* to type `klickenya.com/list` manually
(it's only linked from the public footer / become-a-host / how-it-works pages).

### 🔴 H-2 — Host cannot edit or view listing content at all
"My Listings" renders read-only cards. The only action button is **"Open
dashboard," and it only appears for restaurant listings**
([dashboard/listings/page.tsx:141-148](../apps/web/app/dashboard/listings/page.tsx)).
For a **stay/experience/event** listing there is **no way for the host to open,
edit, or manage the listing's content** — because listing content lives in Sanity,
which hosts can't access. This is exactly the reported issue: *"My Listings can't be
opened if you didn't create the list on /list."* In reality, even after it's
created, there's no host-side CRUD for listings. **The host has create/update/view
on a listing essentially nowhere.**

### 🔴 H-3 — PMS property and "My Listings" are disconnected
A host can build a full **property** (name, rooms, pricing) in **Property PMS**, but
it **does not appear in "My Listings"** — because "My Listings" reads Sanity
listings and the property is a Supabase row. The two are only linked by a manually
typed **"Listing slug"** in property settings. Result: a host who set up a property
sees an empty "My Listings" and a dashboard stat of **"Listings: 0"**
([dashboard/layout.tsx](../apps/web/app/dashboard/layout.tsx)), which reads as "I
have nothing" even though they just built a property.

### 🟠 H-4 — No "publish my property to the marketplace" path
Data only flows **listing → property** (the setup wizard can *import* rooms from an
existing Sanity listing —
[property/new/page.tsx:140-176](../apps/web/app/dashboard/property/new/page.tsx)).
There is **no reverse** path: a property the host already built cannot be promoted
to a marketplace listing — they must **re-enter everything** in `/list`. Pure
duplication.

### 🟡 H-5 — "Claim a listing" CTA is misleading for new businesses
The empty state pushes "Claim a listing," but claiming is for businesses **already
on Klickenya**. A brand-new business (e.g. one not yet scraped) has nothing to
claim, so the CTA dead-ends.

---

## 4. The `/list` creation flow

**Files:** `apps/web/app/list/page.tsx`,
`apps/web/components/list/ListingForm.tsx`,
`apps/web/app/api/list/submit/route.ts`,
`apps/web/app/api/list/verify-otp/route.ts`,
`apps/web/app/api/admin/listing-requests/[id]/approve/route.ts`

### 🔴 B-1 — Approved listings are created as `draft` but the email says "live"
On admin approval, the Sanity listing is created with **`status: "draft"`**
([listing-requests/[id]/approve/route.ts:116](../apps/web/app/api/admin/listing-requests/[id]/approve/route.ts)),
yet the approval email tells the owner *"Your listing is now live on Klickenya and
can be found by travellers across Kenya"*
([same file:338](../apps/web/app/api/admin/listing-requests/[id]/approve/route.ts)).
The marketplace renders **published** listings only, so the listing is **not
actually visible** until someone manually flips `status` to `published` in Sanity
Studio. This is a real broken expectation — "approved" ≠ "live."

### 🟠 B-2 — Verified flag is inconsistent between the two approval paths
Claim approve sets `isVerified: true`; listing-request approve sets
`isVerified: false`
([listing-requests/[id]/approve/route.ts:117](../apps/web/app/api/admin/listing-requests/[id]/approve/route.ts)).
So a listing created via `/list` never gets the green "Verified" badge even after an
admin approved it, while a claimed one does. Same admin action, different trust
signal.

### 🟠 B-3 — Slug uniqueness check is incorrect
The "unique slug" guard compares the candidate **slug** against the
`sanity_listing_id` column of `listing_requests`
([approve/route.ts:65-72](../apps/web/app/api/admin/listing-requests/[id]/approve/route.ts)) —
a slug will never equal a Sanity document id, so the check effectively never fires.
Real slug collisions in Sanity aren't caught, risking duplicate/clashing slugs.

### 🟠 B-4 — AI-assist step is exposed but always fails
Step 2 ("Let AI draft your listing") calls `/api/list/ai-analyse`, which needs
`FIRECRAWL_API_KEY` — not configured in production. Every user gets **"AI analysis
unavailable. Please fill in the form manually."** Either wire the key or hide the
step until it's ready.

### 🟡 B-5 — `/list` is not reachable from the dashboard
Confirmed in H-1. A logged-in host — the exact person who should list — has no link
to it from their dashboard.

### 🟡 B-6 — Submission ≠ host yet; no in-product status visibility
After OTP verify, the request sits at `status: "submitted"`
([verify-otp/route.ts](../apps/web/app/api/list/verify-otp/route.ts)) until an admin
approves. The submitter has **no way to see "pending review"** anywhere in the
app (they aren't a host yet, and it's not in any dashboard). It just goes quiet
until the approval email.

---

## 5. Cross-cutting / structural

### 🔴 S-1 — Two "listing" mental models with no bridge
The Sanity listing vs Supabase property split (see TL;DR) is the root cause of
H-2, H-3, and H-4. Until there's a clear, UI-level bridge (or merge) between
"marketplace listing" and "PMS property," hosts will keep hitting empty "My
Listings," duplicate data entry, and "where did my thing go?" confusion.

### 🟠 S-2 — `www` vs non-`www` domain inconsistency throughout
Emails hardcode `https://www.klickenya.com/...` (register redirect + both approval
emails) while the product, env (`NEXT_PUBLIC_SITE_URL`), and links elsewhere use
`https://klickenya.com`. Pick one canonical host and use it everywhere; the
mismatch is the likely root of A-1.

### 🟡 S-3 — Stale project docs
`CLAUDE.md` lists `/list` as "NOT YET BUILT," but it's fully built and in use. Doc
drift makes it hard to trust the rest of the notes.

### 🟡 S-4 — Known-broken endpoint
`/api/admin/listing-requests/[id]/note` 500s — the `notes`/`admin_notes` column is
missing from `listing_requests` (already noted in CLAUDE.md as migration 068
pending).

---

## POV summaries

### Guest POV
- Can register (if email confirmation works — see A-1). Google works reliably.
- Lands on `/profile`. Clean enough.
- To do anything host-like, must discover `/list` or the `?role=host` Google trick
  on their own. No guided "become a host" path.

### Host POV (most broken)
- Becomes a host via an **inconsistent** set of paths (R-3, R-4).
- Dashboard says **"Listings: 0"** and "My Listings" is empty even after building a
  property (H-3).
- **Cannot create a listing from the dashboard** (H-1) and **cannot edit/view**
  listing content anywhere (H-2).
- If they go to `/list`, the AI step fails (B-4), and after approval the listing may
  not actually appear (B-1) and won't be verified (B-2).
- Property they built can't be promoted to a listing without re-typing (H-4).

### Admin POV
- Can only be created out-of-band (R-5).
- Approval routes work but produce **draft, unverified** listings while emailing
  "you're live" (B-1, B-2).
- A management endpoint is broken (S-4).

---

## Suggested priority (when fixes are greenlit)

1. **A-1 / S-2** — fix the email redirect domain (unblocks all email signups).
2. **B-1** — approve should publish (or the email shouldn't claim "live").
3. **H-1 / H-2 / H-3** — give hosts a real listing CRUD surface + connect PMS
   property ↔ listing (the single biggest UX win).
4. **R-3** — make `?role=host` honour email signup, or remove the host heading.
5. **B-2 / B-3 / B-4** — verified-flag consistency, slug check, hide/fix AI step.
6. **A-3, A-4, A-5, R-4** — cleanup and consolidation.

*(No code changed. This file is the audit deliverable only.)*
