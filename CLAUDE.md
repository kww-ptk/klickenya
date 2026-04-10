# Blog Publishing (Sanity CMS)

## How to publish blog posts to Sanity
The seed scripts in `apps/web/scripts/seed-blog-*.ts` push blog content to Sanity CMS.
They require the **write token** (not the read-only API token).

## Terminal command (run on user's local machine)
```bash
cd ~/Desktop/"CLAUDE CODE"/klickenya/apps/web
SANITY_API_TOKEN=skCbj0aGyKfa66eCmPPkvfR8v3PqEbDkgEVIiAC1t52iwcSjv6ZttWbSwQYXN6VucKNdXENCqW7XdX822 npx tsx scripts/SCRIPT_NAME.ts
```

## Available blog seed scripts
- `seed-blog-kivukoni-guide.ts`
- `seed-blog-money-watamu.ts`
- `seed-blog-kitesurf-watamu.ts`
- `seed-blog-watamu-guide.ts`
- `seed-blog-diani-guide.ts`
- `seed-blog-kilifi-guide.ts`
- `seed-blog-posts.ts` (Kenya itinerary + coast comparison)
- `seed-blog-posts-batch2.ts` (national parks + transport + nightlife)

## Important notes
- The scripts read `process.env.SANITY_API_TOKEN` (set it to the WRITE token)
- Read-only token (`skUEnry7...`) will NOT work, causes "Insufficient permissions"
- Write token (`skCbj0aG...`) must be used
- This environment cannot reach `api.sanity.io` (network blocked), so user must run locally
- After editing a seed script, commit + push to dev, user pulls locally, then runs the command above
- GitHub Action (`seed-blog.yml`) auto-runs changed seed scripts on push to main — user no longer needs to run locally if the action secret is configured

---

# Dashboard Performance Notes
- Dashboard uses React `cache()` in `apps/web/app/dashboard/_lib/auth.ts` to deduplicate auth/profile fetches across layout and child pages
- Sanity fetches in /dashboard use `revalidate: 60` (global setting in `lib/sanity/client.ts`). If a host creates an event or listing and doesn't see it appear immediately, wait 60 seconds for the cache to refresh. This is NOT a bug.
- All dashboard pages have `loading.tsx` skeletons for instant visual feedback
- API calls are parallelized with `Promise.all()` / `Promise.allSettled()` — do not convert back to sequential

---

# Database connections

- All server-side Supabase access goes through `@supabase/ssr` / `@supabase/supabase-js` → PostgREST (HTTP). Supabase handles connection pooling internally. No raw Postgres connection strings are used.
- Browser clients use `NEXT_PUBLIC_SUPABASE_URL` via the JS SDK only.
- If a raw Postgres client (Drizzle, Prisma, `pg`) is ever added: use the Supavisor pooled URL (port 6543, `?pgbouncer=true&connection_limit=1`) for runtime, and the direct URL (port 5432) for migrations only. Never import either into a client component.

---

# Performance

## Performance notes

- Server-side auth helpers in `apps/web/app/dashboard/_lib/auth.ts` (`getAuthUser`, `getUserProfile`, `getHostProfile`) are wrapped in React `cache()` for per-request deduplication. Do not unwrap them.
- Do NOT wrap `createClient()` from `lib/supabase/server.ts` in `cache()`. It owns mutable cookie state via setAll, and sharing one instance across callers risks cross-request auth confusion. The minor perf gain is not worth the multi-tenant risk.
- For owner-scoped reference data caching (menus, sections, items, option groups, restaurant tables, settings), use `unstable_cache` with per-owner tags and `revalidateTag` invalidation. Planned but not yet implemented as of today.

## Error monitoring

- Sentry is installed via `@sentry/nextjs`. Client init lives in `apps/web/instrumentation-client.ts` (Next.js 16 convention — do not rename). Server init in `instrumentation.ts`. Configs in `sentry.server.config.ts` and `sentry.edge.config.ts`.
- Sentry is gated by `enabled: process.env.NODE_ENV === "production"` so dev never burns the free tier quota.
- Source maps are not yet uploaded. To enable readable stack traces, add `SENTRY_AUTH_TOKEN` to Vercel env vars (Production + Preview).
- The kitchen orders page is tagged with `route: kitchen_orders` for a future Sentry alert.

---

# Branching

- `main` is the production branch. Vercel auto-deploys `main` to
  production at klickenya.com. NEVER push directly to main.
- `dev` is the staging branch. Vercel deploys dev to a stable preview
  URL used for integration testing.
- Workflow for every change, no exceptions:
  1. Create a short-lived feature branch from dev: `feat/xxx`,
     `fix/xxx`, or `claude/xxx`
  2. Work on the feature branch. Push to it freely.
  3. Merge the feature branch into dev when the feature is done.
  4. Verify on the dev preview URL (not on www.klickenya.com).
  5. When dev is tested and stable, merge dev into main. This is
     the production promotion — do it deliberately, not reflexively.
  6. After the promotion to main succeeds, delete the feature
     branch both locally and remotely.

- Hotfixes follow the same path. No exceptions. Even a one-line doc
  edit goes through feat → dev → main.
- If main and dev diverge unexpectedly, stop and investigate before
  pushing anything.
