# White-Label Foundation — Plan 2: Tenant Resolution + Theming Core

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the reused Klickenya app themeable per partner — resolve the partner from the request host, and inject a per-partner CSS-variable override that re-skins the whole UI — then tokenize the codebase's hardcoded colors so the override actually takes effect, and wire theming into the dashboard.

**Architecture:** Three layers. (1) **Token plumbing** — convert `@theme inline` → `@theme` so Tailwind utilities reference `var(--color-*)`, and run a codemod that replaces ~4,800 hardcoded `bg-[#hex]` arbitrary-values with the equivalent named token utilities. Both are visually inert for the house brand (tokens resolve to the same hex) but make every color overridable at runtime. (2) **Resolution + theming core** — `getPartnerByHost()`/`getPartnerBySlug()` resolvers (React-cached) plus a `partnerThemeCss()` generator and a `<PartnerTheme>` server component that injects a `:root{…}` override + webfont link. (3) **Application** — wire `<PartnerTheme>` into the dashboard layout (already dynamically rendered, so no static-render cost). The marketplace (klickenya.com) is house brand + statically rendered and is intentionally left without per-request resolution.

**Tech Stack:** Next.js 15 App Router, Tailwind CSS v4 (`@theme`), Sanity (GROQ, `next-sanity`), React `cache()`, TypeScript, `tsx` for scripts.

---

## Spec

`docs/superpowers/specs/2026-05-29-white-label-partner-platform-design.md` — esp. **§7 (Theming mechanism, revised 2026-06-10)**, which records the two blockers this plan fixes: `@theme inline` baking literals, and hardcoded hex arbitrary-values.

## Plan sequence

This is **Plan 2 of 5**. Plan 1 (partner data model + marketplace cross-listing) is built and verified (PR #39). This plan consumes Plan 1's `apps/web/lib/partner/{types.ts,queries.ts}` (`Partner` type, `PARTNER_BY_DOMAIN_QUERY`, `PARTNER_BY_SLUG_QUERY`). Plan 3 (dashboard nav/module scoping + wordmark/logo swap + partner-aware emails + admin-domain auth), Plan 4 (storefront + template registry), Plan 5 (onboard client #1) follow.

## Branch

Plan 1 lives on `feat/white-label-partner-platform` (PR #39 → `dev`, open). Two options, pick at execution time:
- If PR #39 is **merged** to `dev`: branch `feat/white-label-2-theming` off `dev`.
- If **not merged**: branch `feat/white-label-2-theming` off `feat/white-label-partner-platform` so Plan 1's partner types/queries are present.

## Verification note (read before starting)

This repo has **no test framework** (confirmed in Plan 1: scripts are `dev`/`build`/`lint`/`typecheck`/`build:studio`). Per CLAUDE.md and the superpowers instruction priority, the codebase reality overrides the skill's default TDD steps. Verification uses the tools that exist:

- `pnpm typecheck` is mis-defined in `package.json` (`pnpm --filter @klickenya/web tsc` → "no tsc script"). Use **`pnpm --filter @klickenya/web exec tsc --noEmit`** instead (exit 0 = pass). (A separate background task is fixing the script.)
- `pnpm lint` — note the repo has ~242 **pre-existing** lint errors in `apps/web/scripts/*`. A task passes lint if it introduces **no new** errors in the files it touched (grep the lint output for your files).
- `pnpm build` and `pnpm build:studio` — must succeed.
- Pure functions are verified by a runnable `tsx` script (e.g. Task 3).
- **Visual regression (Tasks 1 & 4) requires human eyes** — the codemod's safety gate is "klickenya.com + the dashboard render pixel-identical for the house brand." The implementer must run `pnpm dev`, list exact pages to eyeball, and report; the controller/user confirms.

Before each `tsc`/`build`, the stale `.next/dev` cache can emit spurious `validator.ts` errors — clear with `rm -rf apps/web/.next` first if they appear (they are not real errors).

---

## File structure

| File | Action | Responsibility |
|---|---|---|
| `apps/web/app/globals.css` | Modify | `@theme inline` → `@theme` (utilities reference `var(--color-*)`). |
| `apps/web/lib/partner/resolve.ts` | Create | `getPartnerByHost()` + `getPartnerBySlug()` — React-cached partner resolution. |
| `apps/web/lib/partner/theme.ts` | Create | `partnerThemeCss(partner)` — pure CSS-override generator. |
| `apps/web/components/partner/PartnerTheme.tsx` | Create | Server component: injects `<style>` override + optional webfont `<link>`. |
| `apps/web/scripts/verify-partner-theme.ts` | Create | Runnable assertion of `partnerThemeCss` (stands in for a unit test). |
| `apps/web/scripts/codemod-hex-to-token.mjs` | Create (transient) | One-shot codemod: `-[#hex]` arbitrary-values → named token utilities. May be deleted after the commit. |
| `apps/web/app/dashboard/**`, `apps/web/components/**` | Modify (codemod) | Hardcoded brand hexes → token utilities. |
| `apps/web/app/dashboard/layout.tsx` | Modify | Wire `<PartnerTheme partner={await getPartnerByHost()} />`. |

---

## Task 1: Convert `@theme inline` → `@theme`

Makes Tailwind utilities reference `var(--color-*)` instead of inlining literals. Visually inert for the house brand (same values), but a prerequisite for any runtime theming.

**Files:** Modify `apps/web/app/globals.css`

- [ ] **Step 1: Change the directive**

In `apps/web/app/globals.css`, change the design-tokens block opener from:
```css
@theme inline {
```
to:
```css
@theme {
```
(Only that one line — leave every token declaration unchanged.)

- [ ] **Step 2: Rebuild and prove utilities now use `var()`**

Run:
```bash
rm -rf apps/web/.next && pnpm build
```
Expected: build succeeds. Then:
```bash
css=$(find apps/web/.next -name '*.css' 2>/dev/null | xargs wc -c | sort -n | tail -2 | head -1 | awk '{print $2}')
grep -oE '\.(text|bg)-amber\{[^}]*\}' "$css" | head
grep -oc 'var(--color-amber)' "$css"
```
Expected: `.bg-amber{background-color:var(--color-amber)}` and `.text-amber{color:var(--color-amber)}` (NOT a literal `#e8a020`), and the `var(--color-amber)` count is now **> 0** (it was 0 before).

- [ ] **Step 3: House-brand visual regression (manual)**

Run `pnpm dev`. Eyeball that these render identically to production: `/` (home), a category page (e.g. `/stay`), one listing detail, `/dashboard` (log in as a host first). Colors/fonts must be unchanged. Stop the dev server. Report any visual diff as DONE_WITH_CONCERNS.

- [ ] **Step 4: Commit**
```bash
git add apps/web/app/globals.css
git commit -m "feat(white-label): @theme (drop inline) so utilities reference CSS vars

Prerequisite for per-tenant theming — utilities now resolve var(--color-*)
instead of baking literals. House brand renders identically (same values)."
```

---

## Task 2: Partner resolver (`getPartnerByHost`, `getPartnerBySlug`)

**Files:** Create `apps/web/lib/partner/resolve.ts`

- [ ] **Step 1: Create the resolver**

```ts
import { cache } from "react";
import { headers } from "next/headers";
import { sanityClient } from "@/lib/sanity/client";
import { PARTNER_BY_DOMAIN_QUERY, PARTNER_BY_SLUG_QUERY } from "@/lib/partner/queries";
import type { Partner } from "@/lib/partner/types";

/** Bare, lowercased hostname for the incoming request (port stripped). */
async function getRequestHost(): Promise<string | null> {
  const h = await headers();
  const host = h.get("host");
  if (!host) return null;
  return host.split(":")[0].toLowerCase();
}

/**
 * Resolve the partner for the incoming request host.
 * `null` = Klickenya house brand (no partner doc lists this host).
 * React-cached: one Sanity lookup per request regardless of how many callers.
 */
export const getPartnerByHost = cache(async (): Promise<Partner | null> => {
  const host = await getRequestHost();
  if (!host) return null;
  return (
    (await sanityClient.fetch<Partner | null>(PARTNER_BY_DOMAIN_QUERY, { host })) ?? null
  );
});

/**
 * Resolve a partner by its slug — used by the storefront app (Plan 4), which
 * knows its own partner slug from config rather than the host. `null` if none.
 */
export const getPartnerBySlug = cache(async (slug: string): Promise<Partner | null> => {
  if (!slug) return null;
  return (
    (await sanityClient.fetch<Partner | null>(PARTNER_BY_SLUG_QUERY, { slug })) ?? null
  );
});
```

Notes for the implementer:
- In Next 15 `headers()` is **async** — the `await` is required.
- Confirm the import alias `@/lib/...` resolves (it's used throughout `apps/web`). If `sanityClient` is not a named export of `@/lib/sanity/client`, match the actual export (Plan 1's `apps/web/lib/partner/queries.ts` and the dashboard layout both import `{ sanityClient } from "@/lib/sanity/client"`, so it is).

- [ ] **Step 2: Verify typecheck**

```bash
pnpm --filter @klickenya/web exec tsc --noEmit
```
Expected: exit 0. (The resolver can't be run standalone — it needs a request context — so it's verified by typecheck here and end-to-end in Task 5.)

- [ ] **Step 3: Commit**
```bash
git add apps/web/lib/partner/resolve.ts
git commit -m "feat(white-label): partner resolvers (by host, by slug) — React-cached"
```

---

## Task 3: Theme generator + `<PartnerTheme>` component + verify script

**Files:**
- Create `apps/web/lib/partner/theme.ts`
- Create `apps/web/components/partner/PartnerTheme.tsx`
- Create `apps/web/scripts/verify-partner-theme.ts`

- [ ] **Step 1: Create the generator**

`apps/web/lib/partner/theme.ts`:
```ts
import type { Partner } from "@/lib/partner/types";

/** Strip characters that could break out of a <style> block. */
function clean(value: string): string {
  return value.replace(/[<>{}]/g, "").trim();
}

/**
 * Build a `:root{…}` CSS override from a partner's theme tokens.
 * Only properties the partner actually set are emitted — unset ones fall back
 * to the Klickenya defaults in globals.css. Returns "" when there is nothing
 * to override (house brand, or a partner with no theme fields).
 *
 * Token mapping (v1, per spec §7):
 *   colorPrimary -> --color-amber
 *   colorAccent  -> --color-purple
 *   colorDark    -> --color-dark + --color-text
 *   fontDisplay  -> --font-display
 *   fontBody     -> --font-body
 * Secondary shades (--color-amber2/purple2/dims) stay Klickenya in v1.
 */
export function partnerThemeCss(partner: Partner | null): string {
  if (!partner) return "";
  const decls: string[] = [];
  if (partner.colorPrimary) decls.push(`--color-amber:${clean(partner.colorPrimary)};`);
  if (partner.colorAccent) decls.push(`--color-purple:${clean(partner.colorAccent)};`);
  if (partner.colorDark) {
    const dark = clean(partner.colorDark);
    decls.push(`--color-dark:${dark};`);
    decls.push(`--color-text:${dark};`);
  }
  if (partner.fontDisplay) decls.push(`--font-display:"${clean(partner.fontDisplay)}", sans-serif;`);
  if (partner.fontBody) decls.push(`--font-body:"${clean(partner.fontBody)}", sans-serif;`);
  if (decls.length === 0) return "";
  return `:root{${decls.join("")}}`;
}
```

- [ ] **Step 2: Create the component**

`apps/web/components/partner/PartnerTheme.tsx`:
```tsx
import { partnerThemeCss } from "@/lib/partner/theme";
import type { Partner } from "@/lib/partner/types";

/**
 * Injects a partner's brand theme: a <style> overriding the CSS custom
 * properties at :root (re-skins every var-based utility), plus an optional
 * webfont <link>. Must be rendered AFTER globals.css in source order so its
 * :root declarations win the cascade — rendering it inside a layout body
 * (which comes after the <head> stylesheet) satisfies this.
 *
 * Renders nothing for the house brand (partner == null) or a partner with no
 * theme overrides.
 */
export function PartnerTheme({ partner }: { partner: Partner | null }) {
  if (!partner) return null;
  const css = partnerThemeCss(partner);
  if (!css && !partner.fontUrl) return null;
  return (
    <>
      {partner.fontUrl ? <link rel="stylesheet" href={partner.fontUrl} /> : null}
      {css ? <style dangerouslySetInnerHTML={{ __html: css }} /> : null}
    </>
  );
}
```

- [ ] **Step 3: Create the verify script (stands in for a unit test)**

`apps/web/scripts/verify-partner-theme.ts`:
```ts
import { partnerThemeCss } from "../lib/partner/theme";
import type { Partner } from "../lib/partner/types";

const full: Partner = {
  _id: "x", name: "Test", slug: "test", domains: ["test.com"],
  logo: null, favicon: null, poweredByKlickenya: true,
  colorPrimary: "#0055FF", colorAccent: "#FF0066", colorDark: "#111111",
  fontDisplay: "Poppins", fontBody: "Inter", fontUrl: null,
  enabledModules: ["restaurant"], allowedListingTypes: ["stay"],
};

const expected =
  `:root{--color-amber:#0055FF;--color-purple:#FF0066;--color-dark:#111111;` +
  `--color-text:#111111;--font-display:"Poppins", sans-serif;--font-body:"Inter", sans-serif;}`;

let ok = true;
const got = partnerThemeCss(full);
if (got !== expected) { ok = false; console.error("FAIL full\n got:  " + got + "\n want: " + expected); }
if (partnerThemeCss(null) !== "") { ok = false; console.error("FAIL: null partner should yield ''"); }

// Partial partner: only primary set -> only --color-amber emitted
const partial = { ...full, colorAccent: null, colorDark: null, fontDisplay: null, fontBody: null };
if (partnerThemeCss(partial) !== ":root{--color-amber:#0055FF;}") {
  ok = false; console.error("FAIL partial: " + partnerThemeCss(partial));
}
// Breakout attempt is sanitized
const evil = { ...partial, colorPrimary: "red;}</style><script>x" };
if (partnerThemeCss(evil).includes("<") || partnerThemeCss(evil).includes("}</")) {
  ok = false; console.error("FAIL sanitize: " + partnerThemeCss(evil));
}

if (!ok) process.exit(1);
console.log("PASS partnerThemeCss");
```

- [ ] **Step 4: Verify**

```bash
pnpm --filter @klickenya/web exec tsc --noEmit
npx tsx apps/web/scripts/verify-partner-theme.ts
```
Expected: tsc exit 0; script prints `PASS partnerThemeCss`. If the `tsx` import paths fail, match the relative-import style of an existing `apps/web/scripts/*.ts` file.

- [ ] **Step 5: Commit**
```bash
git add apps/web/lib/partner/theme.ts apps/web/components/partner/PartnerTheme.tsx apps/web/scripts/verify-partner-theme.ts
git commit -m "feat(white-label): partner theme CSS generator + <PartnerTheme> + verify script"
```

---

## Task 4: Codemod — hardcoded hex arbitrary-values → token utilities

Replaces ~4,800 `-[#hex]` arbitrary-values across `apps/web/app` + `apps/web/components` with the named token utilities, so partner overrides actually re-skin them. **Visually inert for the house brand** (each token resolves to the same hex) — that is the verification gate.

**Files:** Create `apps/web/scripts/codemod-hex-to-token.mjs`; it modifies many files under `apps/web/app` + `apps/web/components`.

- [ ] **Step 1: Snapshot the before-state**

```bash
grep -rhoE '\-\[#[0-9A-Fa-f]{6}\]' apps/web/app apps/web/components | sort | uniq -c | sort -rn > /tmp/hex_before.txt
cat /tmp/hex_before.txt
```
Keep this list — Step 4 confirms the brand hexes are gone.

- [ ] **Step 2: Write the codemod**

`apps/web/scripts/codemod-hex-to-token.mjs`:
```js
// One-shot codemod: replace Tailwind arbitrary-value brand hexes with the
// equivalent named token utility, so they reference var(--color-*) and become
// themeable. ONLY exact brand-token hexes are mapped; every other hex (semantic
// reds/greens/indigos, custom darks) is left untouched. 8-digit (alpha) hexes
// are left untouched. Idempotent.
import { readFileSync, writeFileSync } from "node:fs";
import { execSync } from "node:child_process";

// hex (lowercased, no #) -> token name (matches globals.css --color-<token>)
const MAP = {
  "16130c": "dark",
  "fafaf8": "canvas",
  "f4f1ec": "surface",
  "ede9e2": "surface2",
  "e2ddd5": "border",
  "5e5848": "text2",
  "9c9485": "text3",
  "e8a020": "amber",
  "f5c842": "amber2",
  "6b2d8b": "purple",
  "8b4dab": "purple2",
  "4a1f63": "purple-dark",
  "0d7377": "teal",
  "16a34a": "green",
  "ffffff": "white",
};

const files = execSync(
  "grep -rlE '\\-\\[#[0-9A-Fa-f]{6}\\]' apps/web/app apps/web/components",
  { encoding: "utf8" }
).split("\n").filter(Boolean);

let totalFiles = 0, totalRepl = 0;
for (const file of files) {
  let src = readFileSync(file, "utf8");
  let count = 0;
  // Match `-[#rrggbb]` (the leading dash keeps us inside class utilities like
  // bg-/text-/border-/from-/to-/ring-/fill-/stroke-/divide-/outline- etc.).
  src = src.replace(/-\[#([0-9A-Fa-f]{6})\]/g, (whole, hex) => {
    const token = MAP[hex.toLowerCase()];
    if (!token) return whole; // non-brand hex: leave untouched
    count++;
    return `-${token}`;
  });
  if (count > 0) {
    writeFileSync(file, src);
    totalFiles++; totalRepl += count;
  }
}
console.log(`codemod: ${totalRepl} replacements across ${totalFiles} files`);
```

- [ ] **Step 3: Run the codemod**

```bash
node apps/web/scripts/codemod-hex-to-token.mjs
```
Expected: prints a non-zero replacement count (thousands). Review a sample diff:
```bash
git diff --stat | tail -20
git diff apps/web/app/dashboard/layout.tsx | head -40
```
Spot-check that e.g. `bg-[#16130C]` → `bg-dark`, `from-[#E8A020] to-[#6B2D8B]` → `from-amber to-purple`, `bg-[#6B2D8B]/15` → `bg-purple/15` (opacity suffix preserved).

- [ ] **Step 4: Confirm brand hexes are gone; non-brand hexes remain**

```bash
grep -rhoE '\-\[#[0-9A-Fa-f]{6}\]' apps/web/app apps/web/components | sort | uniq -c | sort -rn
```
Expected: NONE of the 15 mapped brand hexes (`#16130C`, `#E8A020`, `#6B2D8B`, `#9C9485`, `#E2DDD5`, `#F4F1EC`, `#EDE9E2`, `#5E5848`, `#F5C842`, `#8B4DAB`, `#4A1F63`, `#0D7377`, `#16A34A`, `#FAFAF8`, `#FFFFFF`) appear in `-[#…]` form anymore. Non-brand hexes (e.g. `#4F46E5`, `#DC2626`, `#22C55E`, `#D4911C`, `#2A2520`) may remain — that is correct (semantic/custom colors are intentionally not themeable).

- [ ] **Step 5: Typecheck + build**

```bash
rm -rf apps/web/.next && pnpm --filter @klickenya/web exec tsc --noEmit && pnpm build
```
Expected: tsc exit 0; build succeeds. (Class-string edits don't change types, so tsc is a sanity check; the build proves Tailwind generated every token utility used.)

- [ ] **Step 6: House-brand visual regression (manual — THE safety gate)**

Run `pnpm dev`. Compare against production/`dev` (house brand) — these must look **identical**:
- `/` home, a category page (`/stay`), one listing detail, search results
- `/dashboard` (log in as host): sidebar (dark), avatar gradient, plan badge, nav
- one deep dashboard screen with lots of converted hexes, e.g. `/dashboard/property` and a property settings page

Any visible color/spacing diff means a hex was mismapped — report DONE_WITH_CONCERNS with the page + element. Stop the dev server.

- [ ] **Step 7: Commit (and optionally remove the codemod script)**

```bash
# optional: the codemod is one-shot; keep it for the record OR remove it
git add -A
git commit -m "refactor(white-label): tokenize hardcoded brand hexes -> var-based utilities (codemod)

~4.8k bg-[#hex] arbitrary-values across app/ + components/ replaced with named
token utilities (bg-dark, text-amber, from-purple, …). Visually identical for
the house brand; makes the whole UI re-skinnable by a partner :root override.
Non-brand/semantic hexes intentionally left as-is."
```

---

## Task 5: Wire `<PartnerTheme>` into the dashboard layout

**Files:** Modify `apps/web/app/dashboard/layout.tsx`

- [ ] **Step 1: Import the resolver + component**

At the top of `apps/web/app/dashboard/layout.tsx`, add to the imports:
```ts
import { getPartnerByHost } from "@/lib/partner/resolve";
import { PartnerTheme } from "@/components/partner/PartnerTheme";
```

- [ ] **Step 2: Resolve the partner in the layout**

Inside `DashboardLayout`, after the existing `const { user } = await getAuthUser();` / auth block, add:
```ts
  const partner = await getPartnerByHost();
```
(The dashboard layout is already dynamically rendered — it reads auth cookies — so adding `headers()`-based resolution adds no static-rendering cost.)

- [ ] **Step 3: Render `<PartnerTheme>` at the top of the returned tree**

In the returned JSX, make `<PartnerTheme>` the first child of the outer `<div className="flex min-h-screen">` so the `<style>` override is present for the whole dashboard subtree:
```tsx
  return (
    <div className="flex min-h-screen">
      <PartnerTheme partner={partner} />
      {/* Sidebar — hidden on mobile, visible on desktop */}
      <aside ...>
```
(Leave the rest of the layout unchanged — Task 4 already tokenized its classes, so the sidebar/avatar/etc. now respond to the override.)

- [ ] **Step 4: Build**

```bash
rm -rf apps/web/.next && pnpm build
```
Expected: build succeeds.

- [ ] **Step 5: End-to-end manual verification (the proof this all works)**

1. In Sanity Studio, create a test **Partner** doc (or edit one): set `domains` to include your dev host — for local `pnpm dev` that is **`localhost`** (the resolver strips the port); for a Vercel preview, the preview hostname. Set `colorPrimary`, `colorAccent`, `colorDark` to obviously-different colors (e.g. `#0055FF`, `#00AA55`, `#222244`). Publish.
2. `pnpm dev`, log in as a host, open `/dashboard`. Expected: the sidebar, avatar gradient, accents re-skin to the test partner's colors within ~60s (Sanity `revalidate`). The marketplace (`/`) stays Klickenya-branded (no per-request resolution there).
3. Remove `localhost` from the test partner's `domains` (or unpublish). Reload `/dashboard` → back to Klickenya colors (house brand).

Report the observed before/after. Stop the dev server.

- [ ] **Step 6: Commit**
```bash
git add apps/web/app/dashboard/layout.tsx
git commit -m "feat(white-label): theme the dashboard per partner via <PartnerTheme> (host-resolved)"
```

---

## Task 6: Final verification + review

- [ ] **Step 1: Full gate**
```bash
rm -rf apps/web/.next
pnpm --filter @klickenya/web exec tsc --noEmit            # exit 0
npx tsx apps/web/scripts/verify-partner-theme.ts          # PASS
pnpm build                                                # succeeds
pnpm build:studio                                         # succeeds
pnpm lint 2>&1 | grep -E 'partner/|globals.css|dashboard/layout' || echo "no new lint in touched files"
```

- [ ] **Step 2: Confirm the house-brand invariant once more**

Re-state in the PR: the `@theme` change and the codemod are value-preserving (tokens resolve to the original hexes), so klickenya.com and an un-themed dashboard render identically; only a matching partner domain re-skins.

- [ ] **Step 3: Dispatch a code review** over the whole Plan-2 diff (base = the branch point). Focus: (a) any brand hex the codemod mismapped or missed; (b) any *non*-brand hex wrongly mapped; (c) the `<style>` cascade actually wins (override present after globals.css); (d) the resolver's `headers()`/`cache()` usage; (e) `partnerThemeCss` sanitization.

- [ ] **Step 4: Tag complete**
```bash
git commit --allow-empty -m "chore(white-label): Plan 2 (tenant resolution + theming core) complete"
```

---

## What Plan 2 delivers

- Every Tailwind color utility (named tokens + ex-hardcoded hexes) references `var(--color-*)` and is re-skinnable at runtime.
- `getPartnerByHost()` / `getPartnerBySlug()` resolve a partner (cached), and `<PartnerTheme>` injects a `:root` override + webfont.
- The **dashboard themes per partner** by request host; klickenya.com is unchanged.

## What Plan 2 does NOT do (later plans)

- Dashboard **nav/module gating** + **wordmark/logo swap** + partner-aware **transactional emails** + **auth on the partner admin domain** (Plan 3).
- The **storefront** app + template registry (Plan 4); it will reuse `getPartnerBySlug` + `<PartnerTheme>` + the now-tokenized shared components.
- Secondary-shade theming (`--color-amber2`, dims) and per-partner overrides of neutral tokens — deferred unless a partner needs them.
