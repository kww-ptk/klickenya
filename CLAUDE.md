# Klickenya — CLAUDE.md
# Last updated: May 23, 2026 (added station routing, bar staff role, schema-projection rule)
# Read this at the start of every session before writing any code.

## What Klickenya is
Kenya-first marketplace and business tools platform.
Two layers: klickenya.com (marketplace) + app.klickenya.com (business tools).
Stack: Next.js 15 App Router · Sanity (content) · Supabase (auth + dynamic data)
       Resend (email) · GHL (CRM webhooks) · Anthropic API (AI features).
Monorepo: apps/web · apps/studio · packages/shared · packages/database.

## Current state (as of audit May 8, 2026)
Migration count: 067 (last: 067_floor_map_position_constraints.sql)
Missing on disk: 046, 047, 050 (squashed or never committed — don't reuse these numbers)
LIVE and working end-to-end:
  - Marketplace: 5 listing types, 30+ subcategories, all detail pages
  - Auth: /login /register /forgot-password /reset-password /account /auth/callback
          Google OAuth · guest/host/admin roles · role-based redirects
  - Claim flow: /claim/[slug] 4-step (details → accuracy → OTP → success)
  - Host dashboard: /dashboard — 40+ routes including property PMS, menu, events, enquiries
  - Admin panel: /admin — 25+ routes covering all entity types
  - Property PMS: calendar, rooms, bookings, fees, enquiry convert/decline/hold
  - QR Menu builder: full menu editor, items, photos, QR code generation
  - POS terminal: /dashboard/listings/[id]/pos — table ordering, floor map (migration 067)
  - Table reservations: /dashboard/listings/[id]/reservations (migrations 049–053)
  - Klickenya Kitchen: stock, recipes, purchase orders, auto-deduction, reports (migrations 060–066)
  - Events system: /dashboard/events — add event form, attendees, admin review
  - Guest profile: /profile — bookings/enquiries/events/saved tabs
  - Real estate: /real-estate/list (3-step form, agent/owner/developer)
  - Admin listing-requests: /admin/listing-requests (manual review of new listing submissions)
  - /list public listing submission: 6-step form → listing_requests → admin approve publishes
  - AI draft reply: /api/admin/ai/draft-reply (uses ANTHROPIC_API_KEY — already live)
  - GHL pipeline: 7 stages, webhooks on claim/approve/reject/RE enquiry/contact

NOT YET BUILT:
  - /list AI-assist step — route is LIVE, but the "Analyse with AI" website-scrape
    needs FIRECRAWL_API_KEY (not set); it degrades gracefully to manual entry
  - iCal sync engine — ical_feeds table in migration 031, no sync route or cron
  - Stay listing dashboard hub — restaurant hub exists, stay is TODO V2
  - Reviews & ratings system
  - M-Pesa / Paystack payment integration
  - WhatsApp OTP (email only currently)
  - Google Places API integration (GOOGLE_PLACES_API_KEY not in env)

## Key URLs — correct versions
  /real-estate/list            (NOT /real-estate/list-property — that doesn't exist)
  /admin/listing-requests      (NOT /admin/property-requests — that doesn't exist)
  /admin/property-listings     (PMS property list for admin)
  /admin/real-estate           (RE submission review for admin)
  /profile                     (guest profile — NOT /dashboard/guest)

## Architecture rules — never break these
  Content in Sanity, transactions in Supabase. Never mix.
  isVerified=true ONLY via /api/admin/claims/[id]/approve. Never set directly.
  notificationEmail1 set on BOTH claim/verify AND claim/approve — this is intentional.
  Every feature needs nav entry + loading.tsx skeleton.
  Dashboard rule: max 5 nav items. Keep it tight.
  All inputs min 16px font-size (iOS Safari zoom prevention).
  Mobile-first. Test on iPhone Safari before declaring done.

## Database — Supabase
  Next migration number: 073 (don't use 046, 047, or 050 — gaps on disk)
  RLS enabled on all tables. Check policies before querying from client.
  create_booking_with_payment() RPC handles bookings — don't INSERT directly.
  guest_user_id present on bookings (040) and contact_requests (042).
  property_fees + booking_fees tables active (migration 037).
  ical_feeds table present (031) but sync engine not built — dormant schema.
  All server-side Supabase access goes through @supabase/ssr / @supabase/supabase-js → PostgREST (HTTP).
  Browser clients use NEXT_PUBLIC_SUPABASE_URL via the JS SDK only.
  If a raw Postgres client (Drizzle, Prisma, pg) is ever added: use the Supavisor pooled URL
    (port 6543, ?pgbouncer=true&connection_limit=1) for runtime, and the direct URL (port 5432)
    for migrations only. Never import either into a client component.

## When you add a column to an existing table — READ THIS
  This rule has cost us three production bugs. Don't make it four.
  Postgres errors on a missing column in a SELECT, but PostgREST returns 400
  and our adminClient code reads `data` which silently becomes null. UI then
  degrades to an empty state — "no features enabled", "no active orders",
  features look disabled even though data is fine. Hours of debugging chasing
  data corruption when the real problem is a stale SELECT projection.
  After every `ALTER TABLE ADD COLUMN`, grep every `.from("TABLE")` call:
    grep -rn '\.from("orders")' apps/web --include='*.ts' --include='*.tsx'
  Update each .select() that should expose the new column. Drift hotspots:
    - SSR page fetch              apps/web/app/.../page.tsx
    - Polling / list API endpoint apps/web/app/api/.../route.ts
    - Cached helpers              apps/web/lib/cache/menu.ts
    - Types consumed by SSR       apps/web/components/.../*.tsx (interfaces)
  Real failures from missed projections:
    - menus.ordering_enabled missing on prod (028 drift, healed by 072)
      → silent "no add-ons enabled" on Napul'è listing dashboard
    - order_items.station/station_status missing from /api/menu/orders GET
      after 070 → kitchen cards vanished 8s after click (fixed PR #20)
    - menus.order_view_mode + station added (070) but Type union on
      MenuSection wasn't updated → three other SELECTs that cast to MenuData
      had to be widened too. Use grep, not hope.
  Consider extracting the projection into a shared constant if a table is
  read from 4+ places — order_items is now at that threshold. Worth doing
  next time someone adds a column there.

## Sanity schema — listing.ts groups
  general · media · rooms · restaurant · experience · event · service · seo · verification · notifications
  seoTitle, seoDescription fields exist in seo group — no AI population yet.
  claimedBy, ownerName, isVerified, verificationStatus in verification group.
  notificationEmail1, hostId in notifications group.

## Auth & roles
  Roles: guest (default) · host · admin
  guest → /profile after login
  host → /dashboard after login
  admin → /admin after login
  Host account created automatically on claim approve (3 paths: new user / existing guest / existing host)
  Temp password format: welcomeNNN (sent in approval email)
  password_changed column on host_profiles — banner shown until changed

## GHL integration (apps/web/lib/integrations/ghl.ts)
  Stages: SCRAPED · CONTACTED · OPENED · CLAIMED · ACTIVE · PAYING · LOST
  WIRED: CONTACTED (claim/initiate) · CLAIMED (claim/verify) · ACTIVE (approve) · LOST (reject)
  NOT WIRED: SCRAPED, OPENED, PAYING — defined but never triggered. Wire or remove.
  No-op silently if GHL_API_KEY is missing.

## Performance
  Server-side auth helpers in apps/web/app/dashboard/_lib/auth.ts (getAuthUser, getUserProfile,
    getHostProfile) are wrapped in React cache() for per-request deduplication. Do not unwrap them.
  Do NOT wrap createClient() from lib/supabase/server.ts in cache(). It owns mutable cookie state
    via setAll, and sharing one instance across callers risks cross-request auth confusion.
  Sanity fetches in /dashboard use revalidate: 60 (global setting in lib/sanity/client.ts).
    If a host creates an event or listing and doesn't see it appear immediately, wait 60 seconds. NOT a bug.
  All dashboard pages have loading.tsx skeletons for instant visual feedback.
  API calls are parallelized with Promise.all() / Promise.allSettled() — do not convert back to sequential.
  For owner-scoped reference data caching (menus, sections, items, option groups, restaurant tables,
    settings), use unstable_cache with per-owner tags and revalidateTag invalidation. Planned but
    not yet implemented.

## Error monitoring
  Sentry installed via @sentry/nextjs. Client init in apps/web/instrumentation-client.ts
    (Next.js 16 convention — do not rename). Server init in instrumentation.ts.
  Sentry gated by enabled: process.env.NODE_ENV === "production" — dev never burns quota.
  Source maps not yet uploaded. To enable: add SENTRY_AUTH_TOKEN to Vercel env vars.
  Kitchen orders page tagged with route: kitchen_orders for a future Sentry alert.

## Blog publishing (Sanity CMS)
  Seed scripts in apps/web/scripts/seed-blog-*.ts push blog content to Sanity.
  Require the WRITE token (skCbj0aG...), not the read-only token.
  This environment cannot reach api.sanity.io (network blocked) — user must run locally:
    cd ~/Desktop/"CLAUDE CODE"/klickenya/apps/web
    SANITY_API_TOKEN=<write-token> npx tsx scripts/SCRIPT_NAME.ts
  GitHub Action (seed-blog.yml) auto-runs changed seed scripts on push to main.
  Available scripts: seed-blog-kivukoni-guide.ts · seed-blog-money-watamu.ts ·
    seed-blog-kitesurf-watamu.ts · seed-blog-watamu-guide.ts · seed-blog-diani-guide.ts ·
    seed-blog-kilifi-guide.ts · seed-blog-posts.ts · seed-blog-posts-batch2.ts

## Branching
  main = production (Vercel auto-deploys to klickenya.com). NEVER push directly to main.
  dev = staging (stable preview URL for integration testing).
  Workflow for every change, no exceptions:
    1. Create feature branch from dev: feat/xxx, fix/xxx, or claude/xxx
    2. Work on the feature branch. Push to it freely.
    3. Merge feature branch into dev when done.
    4. Verify on the dev preview URL (not www.klickenya.com).
    5. When dev is tested and stable, merge dev into main (production promotion).
    6. After promotion succeeds, delete the feature branch locally and remotely.
  Hotfixes follow the same path. No exceptions. Even a one-line edit goes feat → dev → main.
  If main and dev diverge unexpectedly, stop and investigate before pushing anything.

## Env vars (all required unless marked optional)
  NEXT_PUBLIC_SUPABASE_URL          SUPABASE_SERVICE_ROLE_KEY
  NEXT_PUBLIC_SUPABASE_ANON_KEY     SANITY_WRITE_TOKEN
  NEXT_PUBLIC_SANITY_PROJECT_ID     SANITY_API_TOKEN
  NEXT_PUBLIC_SANITY_DATASET        SANITY_WEBHOOK_SECRET
  RESEND_API_KEY                    RESEND_WEBHOOK_SECRET
  GHL_API_KEY                       GHL_LOCATION_ID
  GHL_PIPELINE_ID                   GHL_STAGE_*_ID (7 IDs)
  ANTHROPIC_API_KEY                 CRON_SECRET
  JWT_SECRET                        POS_JWT_SECRET
  ADMIN_EMAIL                       NEXT_PUBLIC_SITE_URL
  TURNSTILE_SECRET_KEY              NEXT_PUBLIC_GUEST_REGISTRATION
  NEXT_PUBLIC_SENTRY_DSN            SENTRY_AUTH_TOKEN
  # NOT YET in env — add before building these features:
  GOOGLE_PLACES_API_KEY             # needed for AI listing import (Google reviews)
  FIRECRAWL_API_KEY                 # needed for AI listing import (website scrape)

## Known broken / incomplete
  /api/admin/listing-requests/[id]/note — will 500: notes column missing from listing_requests table
    Fix: ALTER TABLE listing_requests ADD COLUMN admin_notes text; (migration 068)
  listing_requests table — needs AI columns before /list flow can be built
  /real-estate/list-property — this URL does not exist, correct URL is /real-estate/list
  Stay listing hub at /dashboard/listings/[id] — TODO V2: only restaurant tab set active
  GHL SCRAPED/OPENED/PAYING stages — defined in ghl.ts but no call sites

## What to build next (priority order)
  1. Fix listing_requests notes column (migration 068, 5 mins)
  2. iCal sync engine — ical_feeds table ready, needs route + cron (high value)
  3. /list AI-assisted listing creation — use listing_requests table + add AI columns
  4. Stay listing dashboard hub — mirrors the restaurant hub at /dashboard/listings/[id]
  5. Wire GHL PAYING stage on subscription creation
