# White-Label Foundation — Plan 1: Partner Data Model & Cross-Listing

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Introduce the `partner` concept across Sanity and Supabase, and make the klickenya.com marketplace partner-aware, WITHOUT changing any existing Klickenya behavior (Klickenya = the house brand, identified by the absence of a partner).

**Architecture:** Additive only. A new Sanity `partner` document type holds per-partner config (branding, domains, enabled modules). Listings gain an optional `partner` reference and a `publishToMarketplace` toggle. Supabase `host_profiles` gains a nullable `partner_id`. The public marketplace GROQ queries gain a single shared filter so partner-exclusive listings never leak onto klickenya.com unless cross-listed. No frontend theming or storefront yet — that is Plans 2–4.

**Tech Stack:** Next.js 15 App Router, Sanity (schemas in `apps/studio`), Supabase/Postgres migrations (`supabase/migrations`), TypeScript, GROQ.

---

## Plan sequence (context — do not implement 2–5 here)

This is **Plan 1 of 5**. Each subsequent plan is written only after the prior one is built and verified, so it is grounded in reality:

1. **Plan 1 (this doc):** Partner data model + marketplace cross-listing. ← implement now
2. **Plan 2:** Tenant resolution + theming core (resolve partner by request host; CSS-variable override helper). Shared by dashboard and storefront.
3. **Plan 3:** Dashboard white-labeling + per-partner feature scoping (theme + nav/module gating on the existing dashboard; branded transactional email; auth on partner admin domain).
4. **Plan 4:** Storefront + **template registry** (shared package; per-listing-type layouts — restaurant template built first: reserve-a-table + view-menu via Klickenya APIs). See spec §15.
5. **Plan 5:** Onboard **client #1 — a restaurant / hospitality partner** (partner doc, host account, restaurant listing + linked menu, DNS/auth, deploy).

**Spec:** `docs/superpowers/specs/2026-05-29-white-label-partner-platform-design.md`

---

## Verification note (read before starting)

This repo has **no test framework** (confirmed: no vitest/jest/playwright; scripts are `dev`/`build`/`lint`/`typecheck`). Per CLAUDE.md and superpowers instruction priority, the user's codebase reality overrides the skill's default TDD steps. Verification in this plan uses the tools that actually exist:

- `pnpm typecheck` — `pnpm --filter @klickenya/web tsc --noEmit` (run from repo root)
- `pnpm lint` — `pnpm --filter @klickenya/web lint`
- `pnpm build` — `pnpm --filter @klickenya/web build`
- `pnpm build:studio` — `pnpm --filter @klickenya/studio build` (validates Sanity schema compiles)
- Manual checks in Sanity Studio (`pnpm dev:studio`) for schema/UI behavior.

The SQL migration cannot be run against production from this environment (network-restricted). It is written to be **idempotent** (`IF NOT EXISTS`) and reviewed for correctness; the user applies it through their normal migration process.

**Branch:** work continues on `feat/white-label-partner-platform` (already created off `dev`).

---

## File structure

| File | Action | Responsibility |
|---|---|---|
| `apps/studio/schemas/partner.ts` | Create | The `partner` Sanity document type (identity, domains, theme tokens, content, flags, enabledModules, allowedListingTypes). |
| `apps/studio/schemaTypes/index.ts` | Modify | Register the `partner` schema. |
| `apps/studio/schemas/listing.ts` | Modify | Add `partner` reference + `publishToMarketplace` boolean to the `general` group. |
| `supabase/migrations/073_partner_linkage.sql` | Create | Add nullable `partner_id text` to `host_profiles`. |
| `apps/web/lib/partner/types.ts` | Create | `Partner` TS type, `EnabledModule` + `PartnerListingType` unions. |
| `apps/web/lib/partner/queries.ts` | Create | GROQ: `PARTNER_BY_DOMAIN_QUERY`, `PARTNER_BY_SLUG_QUERY`, shared `PARTNER_PROJECTION`. |
| `apps/web/lib/sanity/queries.ts` | Modify | Add `MARKETPLACE_PARTNER_FILTER` fragment; apply to the public marketplace listing queries; add `partner`/`publishToMarketplace` to `LISTING_CARD_FIELDS`. |

---

## Task 1: Create the `partner` Sanity document type

**Files:**
- Create: `apps/studio/schemas/partner.ts`
- Modify: `apps/studio/schemaTypes/index.ts`

- [ ] **Step 1: Create the partner schema file**

Create `apps/studio/schemas/partner.ts` with this exact content:

```ts
import { defineType, defineField } from 'sanity'

export default defineType({
  name: 'partner',
  title: 'Partner (White-Label)',
  type: 'document',
  groups: [
    { name: 'identity', title: 'Identity', default: true },
    { name: 'theme', title: 'Theme' },
    { name: 'modules', title: 'Modules' },
    { name: 'content', title: 'Content' },
  ],
  fields: [
    defineField({
      name: 'name',
      title: 'Partner name',
      type: 'string',
      validation: (rule) => rule.required(),
      group: 'identity',
    }),
    defineField({
      name: 'slug',
      title: 'Slug',
      type: 'slug',
      options: { source: 'name', maxLength: 96 },
      validation: (rule) => rule.required(),
      group: 'identity',
    }),
    defineField({
      name: 'domains',
      title: 'Domains',
      description:
        'All hostnames that resolve to this partner (storefront + admin). No protocol, no trailing slash. e.g. "sunsetrentals.com", "admin.sunsetrentals.com".',
      type: 'array',
      of: [{ type: 'string' }],
      validation: (rule) => rule.required().min(1),
      group: 'identity',
    }),
    defineField({
      name: 'logo',
      title: 'Logo',
      type: 'image',
      group: 'identity',
    }),
    defineField({
      name: 'favicon',
      title: 'Favicon',
      type: 'image',
      group: 'identity',
    }),
    defineField({
      name: 'poweredByKlickenya',
      title: 'Show "Powered by Klickenya" badge',
      type: 'boolean',
      initialValue: true,
      group: 'identity',
    }),

    // Theme tokens — map onto CSS variables in apps/web/app/globals.css
    defineField({
      name: 'colorPrimary',
      title: 'Primary color (maps to --color-amber)',
      type: 'string',
      description: 'Hex, e.g. #E8A020',
      group: 'theme',
    }),
    defineField({
      name: 'colorAccent',
      title: 'Accent color (maps to --color-purple)',
      type: 'string',
      description: 'Hex, e.g. #6B2D8B',
      group: 'theme',
    }),
    defineField({
      name: 'colorDark',
      title: 'Dark / text color (maps to --color-dark / --color-text)',
      type: 'string',
      description: 'Hex, e.g. #16130C',
      group: 'theme',
    }),
    defineField({
      name: 'fontDisplay',
      title: 'Display font family (maps to --font-display)',
      type: 'string',
      description: 'CSS font-family name, e.g. "Bricolage Grotesque"',
      group: 'theme',
    }),
    defineField({
      name: 'fontBody',
      title: 'Body font family (maps to --font-body)',
      type: 'string',
      description: 'CSS font-family name, e.g. "Geist"',
      group: 'theme',
    }),
    defineField({
      name: 'fontUrl',
      title: 'Font stylesheet URL',
      type: 'url',
      description:
        'Optional <link> stylesheet that loads the fonts above (e.g. a Google Fonts URL). Loaded at runtime — not next/font.',
      group: 'theme',
    }),

    // Feature scoping (spec section 4a)
    defineField({
      name: 'enabledModules',
      title: 'Enabled modules',
      type: 'array',
      of: [{ type: 'string' }],
      options: {
        list: [
          { title: 'Stays (property PMS)', value: 'stays' },
          { title: 'Tours / Experiences', value: 'tours' },
          { title: 'Events', value: 'events' },
          { title: 'Restaurant (menu/POS/kitchen/stock)', value: 'restaurant' },
        ],
      },
      validation: (rule) => rule.required().min(1),
      group: 'modules',
    }),
    defineField({
      name: 'allowedListingTypes',
      title: 'Allowed listing types',
      type: 'array',
      of: [{ type: 'string' }],
      options: {
        list: [
          { title: 'Stay', value: 'stay' },
          { title: 'Experience', value: 'experience' },
          { title: 'Event', value: 'event' },
          { title: 'Rental', value: 'rental' },
          { title: 'Service', value: 'service' },
        ],
      },
      validation: (rule) => rule.required().min(1),
      group: 'modules',
    }),

    // Content
    defineField({
      name: 'contactEmail',
      title: 'Contact email',
      type: 'string',
      group: 'content',
    }),
    defineField({
      name: 'contactPhone',
      title: 'Contact phone',
      type: 'string',
      group: 'content',
    }),
    defineField({
      name: 'footerText',
      title: 'Footer text',
      type: 'text',
      group: 'content',
    }),
    defineField({
      name: 'defaultCity',
      title: 'Default city / region',
      type: 'string',
      group: 'content',
    }),
  ],
  preview: {
    select: { title: 'name', subtitle: 'slug.current', media: 'logo' },
  },
})
```

- [ ] **Step 2: Register the schema**

In `apps/studio/schemaTypes/index.ts`, add the import after the `agent` import (line 10):

```ts
import agent from '../schemas/agent'
import partner from '../schemas/partner'
```

And add `partner` to the `schemaTypes` array, right after `agent` (line 43):

```ts
  agent,
  partner,
  homePage,
```

- [ ] **Step 3: Verify the Studio schema compiles**

Run: `pnpm --filter @klickenya/studio build`
Expected: build succeeds with no schema validation errors.

- [ ] **Step 4: Manual check in Studio**

Run: `pnpm dev:studio`, open the Studio, confirm "Partner (White-Label)" appears in the document list and a new partner doc shows the Identity / Theme / Modules / Content tabs. Then stop the dev server.

- [ ] **Step 5: Commit**

```bash
git add apps/studio/schemas/partner.ts apps/studio/schemaTypes/index.ts
git commit -m "feat(white-label): add partner Sanity document type"
```

---

## Task 2: Add `partner` reference + `publishToMarketplace` to listings

**Files:**
- Modify: `apps/studio/schemas/listing.ts` (insert after the `status` field, which ends at line 217)

- [ ] **Step 1: Add the two fields**

In `apps/studio/schemas/listing.ts`, immediately AFTER the `status` `defineField({...})` block (the one ending `group: 'general',\n    }),` at line 217) and BEFORE the `city` field (line 218), insert:

```ts
    defineField({
      name: 'partner',
      title: 'Partner (white-label owner)',
      description:
        'Leave empty for Klickenya house listings. Set to a partner to make this listing belong to that partner’s branded site.',
      type: 'reference',
      to: [{ type: 'partner' }],
      group: 'general',
    }),
    defineField({
      name: 'publishToMarketplace',
      title: 'Also publish on klickenya.com marketplace',
      description:
        'Only relevant for partner listings. When ON, this partner listing also appears on the Klickenya marketplace. House listings (no partner) always appear on the marketplace.',
      type: 'boolean',
      initialValue: false,
      hidden: ({ document }: HiddenCtx) => !document?.partner,
      group: 'general',
    }),
```

Note: `HiddenCtx` is the type already used by other `hidden` callbacks in `listing.ts` (e.g. `hidden: ({ document }: HiddenCtx) => document?.type !== 'stay'`). It is in scope at the insertion point — reuse it, do not redefine it.

- [ ] **Step 2: Verify the Studio schema compiles**

Run: `pnpm --filter @klickenya/studio build`
Expected: build succeeds.

- [ ] **Step 3: Manual check in Studio**

Run: `pnpm dev:studio`, open any listing, confirm the General tab now shows a "Partner" reference field, and that "Also publish on klickenya.com marketplace" appears only after a partner is selected. Stop the dev server.

- [ ] **Step 4: Commit**

```bash
git add apps/studio/schemas/listing.ts
git commit -m "feat(white-label): add partner reference + publishToMarketplace to listing"
```

---

## Task 3: Supabase migration — `partner_id` on `host_profiles`

**Files:**
- Create: `supabase/migrations/073_partner_linkage.sql`

- [ ] **Step 1: Write the migration**

Create `supabase/migrations/073_partner_linkage.sql` with exactly:

```sql
-- 073_partner_linkage.sql
-- White-label foundation (Plan 1).
-- Links a host to a white-label partner. NULL = Klickenya house brand
-- (all existing hosts), so this is behaviourally inert for current data.
--
-- partner_id stores the Sanity `partner` document slug (stable, human-readable)
-- rather than the Sanity _id, so it survives content re-imports and is easy to
-- set during onboarding. A host belongs to at most one partner.
--
-- Idempotent via IF NOT EXISTS — safe to re-run.

ALTER TABLE host_profiles
  ADD COLUMN IF NOT EXISTS partner_id text;

-- Fast lookup of all hosts for a given partner (onboarding/admin).
CREATE INDEX IF NOT EXISTS idx_host_profiles_partner_id
  ON host_profiles (partner_id);
```

- [ ] **Step 2: Schema-projection audit (CLAUDE.md rule — mandatory)**

The CLAUDE.md rule requires updating every `.select()` that should expose a newly added column. Find all reads of `host_profiles`:

Run: `grep -rn '\.from("host_profiles")' apps/web --include='*.ts' --include='*.tsx'`

For Plan 1, `partner_id` is **not yet consumed** by any read path (theming/scoping arrive in Plans 2–3). So no `.select()` needs widening yet. Record the grep output in the commit body so Plans 2–3 know the call sites. Do NOT add `partner_id` to any select in this plan — adding an unused projection only widens drift surface (per spec section 5).

- [ ] **Step 3: Verify SQL is well-formed and idempotent**

Visually confirm: both statements use `IF NOT EXISTS`; column is `text` and nullable (no `NOT NULL`, no default); no data backfill. This guarantees existing rows are untouched (house brand = NULL).

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/073_partner_linkage.sql
git commit -m "feat(white-label): migration 073 — partner_id on host_profiles

Nullable, NULL = house brand. No read path consumes it yet (Plans 2-3).
host_profiles read sites for future projection updates:
$(grep -rn '\.from(\"host_profiles\")' apps/web --include='*.ts' --include='*.tsx')"
```

(If the command-substitution in the commit body is awkward in your shell, paste the grep output manually into the commit message.)

---

## Task 4: Partner TypeScript types + GROQ queries

**Files:**
- Create: `apps/web/lib/partner/types.ts`
- Create: `apps/web/lib/partner/queries.ts`

- [ ] **Step 1: Create the Partner type**

Create `apps/web/lib/partner/types.ts`:

```ts
export type EnabledModule = 'stays' | 'tours' | 'events' | 'restaurant'

export type PartnerListingType =
  | 'stay'
  | 'experience'
  | 'event'
  | 'rental'
  | 'service'

export interface PartnerImage {
  url: string | null
  alt?: string | null
}

export interface Partner {
  _id: string
  name: string
  slug: string
  domains: string[]
  logo: PartnerImage | null
  favicon: PartnerImage | null
  poweredByKlickenya: boolean
  // Theme tokens (all optional — fall back to Klickenya defaults)
  colorPrimary?: string | null
  colorAccent?: string | null
  colorDark?: string | null
  fontDisplay?: string | null
  fontBody?: string | null
  fontUrl?: string | null
  // Feature scoping
  enabledModules: EnabledModule[]
  allowedListingTypes: PartnerListingType[]
  // Content
  contactEmail?: string | null
  contactPhone?: string | null
  footerText?: string | null
  defaultCity?: string | null
}
```

- [ ] **Step 2: Create the GROQ queries**

Create `apps/web/lib/partner/queries.ts`:

```ts
import { groq } from 'next-sanity'

export const PARTNER_PROJECTION = `
  _id,
  name,
  "slug": slug.current,
  domains,
  "logo": { "url": logo.asset->url, "alt": logo.alt },
  "favicon": { "url": favicon.asset->url, "alt": favicon.alt },
  poweredByKlickenya,
  colorPrimary,
  colorAccent,
  colorDark,
  fontDisplay,
  fontBody,
  fontUrl,
  enabledModules,
  allowedListingTypes,
  contactEmail,
  contactPhone,
  footerText,
  defaultCity
`

// Resolve a partner by an incoming request hostname. $host must be the bare
// hostname (no protocol/port), e.g. "sunsetrentals.com".
export const PARTNER_BY_DOMAIN_QUERY = groq`
  *[_type == "partner" && $host in domains][0] {
    ${PARTNER_PROJECTION}
  }
`

export const PARTNER_BY_SLUG_QUERY = groq`
  *[_type == "partner" && slug.current == $slug][0] {
    ${PARTNER_PROJECTION}
  }
`
```

- [ ] **Step 3: Verify types + queries compile**

Run: `pnpm typecheck`
Expected: PASS (no errors). If `groq` import path differs, match the import used in `apps/web/lib/sanity/queries.ts` (`import { groq } from 'next-sanity'`).

- [ ] **Step 4: Commit**

```bash
git add apps/web/lib/partner/types.ts apps/web/lib/partner/queries.ts
git commit -m "feat(white-label): partner TS types + GROQ queries"
```

---

## Task 5: Make the marketplace partner-aware (cross-listing filter)

The public klickenya.com marketplace must show: **house listings (no partner) OR partner listings flagged `publishToMarketplace == true`**. Partner-exclusive listings must NOT leak. Admin/dashboard listing queries (which live in admin pages and use `adminClient`, NOT this file) must remain unfiltered — verify this.

**Files:**
- Modify: `apps/web/lib/sanity/queries.ts`

- [ ] **Step 1: Add the shared filter fragment + expose new card fields**

In `apps/web/lib/sanity/queries.ts`, add the fragment just below the `IMAGE_FIELDS` constant (after line 10):

```ts
// White-label: klickenya.com marketplace shows house listings (no partner)
// OR partner listings explicitly cross-listed. Interpolate inside the [ ... ]
// filter of every PUBLIC marketplace listing query.
const MARKETPLACE_PARTNER_FILTER = `(!defined(partner) || publishToMarketplace == true)`
```

Then add two fields to the END of `LISTING_CARD_FIELDS` (after the `"hostRef": ...` line, before the closing backtick at line 33). Add a trailing comma to the current last line:

```ts
  "hostRef": host->{ _id, name, "slug": slug.current, photo{ ${IMAGE_FIELDS} }, verified },
  "partnerSlug": partner->slug.current,
  publishToMarketplace
```

- [ ] **Step 2: Apply the filter to each public marketplace query**

Edit each of the following query constants in `apps/web/lib/sanity/queries.ts` to append ` && ${MARKETPLACE_PARTNER_FILTER}` to their filter expression. Exact edits:

`LISTINGS_QUERY` (line 61):
```ts
  *[_type == "listing" && status == "published" && ${MARKETPLACE_PARTNER_FILTER}] | order(_createdAt desc) {
```

`LISTINGS_BY_TYPE_QUERY` (line 67):
```ts
  *[_type == "listing" && status == "published" && type == $type && ${MARKETPLACE_PARTNER_FILTER}] | order(_createdAt desc) {
```

`LISTINGS_FILTERED_QUERY` (line 73) — add to the opening filter line:
```ts
  *[_type == "listing" && status == "published" && type == $type && ${MARKETPLACE_PARTNER_FILTER}
```

`SUBCATEGORY_COUNTS_QUERY` (line 88):
```ts
  *[_type == "listing" && status == "published" && type == $type && ${MARKETPLACE_PARTNER_FILTER}] {
```

`LISTINGS_BY_TYPE_CITY_QUERY` (line 94):
```ts
  *[_type == "listing" && status == "published" && type == $type && lower(city) == lower($city) && ${MARKETPLACE_PARTNER_FILTER}] | order(_createdAt desc) {
```

`LISTING_BY_SLUG_QUERY` (line 100) — the detail page. A partner-exclusive listing must 404 on klickenya.com:
```ts
  *[_type == "listing" && slug.current == $slug && ${MARKETPLACE_PARTNER_FILTER}][0] {
```

`LISTING_SLUGS_QUERY` (line 185) — sitemap/static params must not include partner-exclusive slugs:
```ts
  *[_type == "listing" && status == "published" && ${MARKETPLACE_PARTNER_FILTER}] {
```

`SIMILAR_LISTINGS_QUERY` (line 212):
```ts
  *[_type == "listing" && status == "published" && type == $type && lower(city) == lower($city) && slug.current != $slug && ${MARKETPLACE_PARTNER_FILTER}] | order(_createdAt desc) [0...3] {
```

In `HOST_BY_SLUG_QUERY`, the nested `"events"` subquery (line 207) — append the filter inside its `[...]`:
```ts
    "events": *[_type == "listing" && type == "event" && status == "published" && host._ref == ^._id && ${MARKETPLACE_PARTNER_FILTER}]{ ${LISTING_CARD_FIELDS}, eventDate, eventEndDate, venue, isFree, priceFrom, isRecurring, recurrenceRule, schedule[]{ _key, day, startTime, endTime }, "coverPhotoUrl": photos[0].asset->url }
```

- [ ] **Step 3: Audit other listing-query call sites are intentionally excluded**

Run: `grep -rn '_type == "listing"' apps/web --include='*.ts' --include='*.tsx'`

Confirm the only files that should gain the filter are `apps/web/lib/sanity/queries.ts` (public marketplace) and `apps/web/lib/sanity/getCityCounts.ts` (public homepage city counts). For `getCityCounts.ts`, apply the SAME filter so partner-exclusive listings don't inflate marketplace city counts:

Open `apps/web/lib/sanity/getCityCounts.ts`, find its `*[_type == "listing" && status == "published" ...]` filter, and append `&& (!defined(partner) || publishToMarketplace == true)` to it.

Confirm `apps/web/app/admin/**`, `apps/web/lib/dashboard/auth.ts`, and `apps/web/app/sitemap.ts` (if it imports `LISTING_SLUGS_QUERY`, it inherits the filter automatically — good; if it has its own inline query, leave admin ones unfiltered) behave as intended: **admin views stay unfiltered** (admins must see partner listings).

- [ ] **Step 4: Verify typecheck + build**

Run: `pnpm typecheck`
Expected: PASS.

Run: `pnpm build`
Expected: build succeeds (GROQ template strings are validated at query time, so a successful build plus the manual check below is the confidence bar).

- [ ] **Step 5: Manual regression check (house brand unaffected)**

Run: `pnpm dev`. Because no listing has a `partner` yet, `!defined(partner)` is true for ALL current listings, so every existing listing must still appear. Verify:
- Homepage and a category page (e.g. `/stay` or the search page) still list existing listings.
- A known listing detail page still loads (does not 404).

This confirms the filter is behaviourally inert until partners exist. Stop the dev server.

- [ ] **Step 6: Commit**

```bash
git add apps/web/lib/sanity/queries.ts apps/web/lib/sanity/getCityCounts.ts
git commit -m "feat(white-label): marketplace cross-listing filter (house OR publishToMarketplace)"
```

---

## Task 6: Final verification of Plan 1

- [ ] **Step 1: Full typecheck + lint + build**

Run, from repo root:
```bash
pnpm typecheck && pnpm lint && pnpm build && pnpm build:studio
```
Expected: all four succeed.

- [ ] **Step 2: Confirm no behavioral change to existing data**

Re-state the invariant in the final commit/PR description: every existing listing has no `partner`, so `MARKETPLACE_PARTNER_FILTER` evaluates true for all of them — klickenya.com is unchanged. `host_profiles.partner_id` is NULL for all existing hosts.

- [ ] **Step 3: Tag the plan complete**

```bash
git commit --allow-empty -m "chore(white-label): Plan 1 (partner data model) complete"
```

---

## What Plan 1 delivers

- A `partner` document type editors can create in Studio.
- Listings can be assigned to a partner and optionally cross-listed.
- `host_profiles.partner_id` exists for linking hosts to partners.
- klickenya.com is partner-aware: partner-exclusive listings are hidden, cross-listed ones appear, house listings are unchanged.
- Typed `Partner` model + resolution queries ready for Plan 2 (tenant resolution + theming).

## What Plan 1 does NOT do (intentionally — later plans)

- No request-host → partner resolution at runtime (Plan 2).
- No theming / CSS-variable injection (Plan 2).
- No dashboard changes or feature gating (Plan 3).
- No storefront app (Plan 4).
- No live partner onboarding (Plan 5).
