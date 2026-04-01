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

# Claude Code Rules
- ALWAYS work on the dev branch
- NEVER create claude/* branches
- NEVER commit to main directly
- NEVER push to main unless the user explicitly asks
- After every task, ask: "Ready to save progress to dev?"
- If yes: push to origin dev only
- After production promote run: git push origin dev:main (only when user requests)
