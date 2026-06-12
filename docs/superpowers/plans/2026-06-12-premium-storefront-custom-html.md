# Premium Storefront — Upgraded Template + Custom-HTML Override — Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make partner storefronts premium two ways: (1) upgrade the default restaurant template into a real landing page, and (2) let an admin paste a bespoke full-HTML landing page per partner that Klickenya serves verbatim with `{{BOOKING}}` (the existing embed widget) and `{{MENU}}` (live menu) tokens swapped in.

**Architecture:** A new optional `landingHtml` field on the `partner` Sanity doc. The storefront resolver branches: `landingHtml` set → render it (no Klickenya chrome, tokens replaced server-side via `dangerouslySetInnerHTML`); else → the upgraded default `RestaurantStorefront`. Reuses `/embed/reservations/<slug>`, `getRestaurant`, the menu data, `<PartnerTheme>`, and the admin form.

**Tech Stack:** Next.js 15 App Router, Sanity (schema + GROQ), React server components, TypeScript, Tailwind tokens.

## Spec
`docs/superpowers/specs/2026-06-12-premium-storefront-custom-html-design.md`

## Branch
`#41` (the white-label work) is **not merged to dev yet**, so branch `feat/storefront-custom-html` off the current `feat/admin-partner-onboarding` (it has `getRestaurant`, the storefront, the admin form, the partner schema). Its PR stacks (targets the admin branch, or dev once #41 merges).

## Verification note
No test framework. Verify with `pnpm --filter @klickenya/web exec tsc --noEmit` (exit 0), `pnpm build`, `pnpm build:studio` (schema), a runnable `tsx` script for the pure token-render fn, and **manual e2e**. Clear `apps/web/.next` if stale validator errors appear.

## v1 constraints (per spec §3.2, chosen mechanism)
- Custom HTML renders via `dangerouslySetInnerHTML` (no Klickenya header/footer). `<head>` title/favicon come from the partner via `generateMetadata`; the root layout's Tailwind reset applies as a sane normalize.
- **Custom HTML is CSS-only** — injected `<script>` tags do NOT execute (React/browser behavior). Landing pages use CSS; interactivity comes from the `{{BOOKING}}` iframe. Document this in the admin form helper.

---

## File structure

| File | Action | Responsibility |
|---|---|---|
| `apps/studio/schemas/partner.ts` | Modify | Add optional `landingHtml` (text) field. |
| `apps/web/lib/partner/types.ts` | Modify | `Partner.landingHtml?: string \| null`. |
| `apps/web/lib/partner/queries.ts` | Modify | Add `landingHtml` to `PARTNER_PROJECTION`. |
| `apps/web/lib/partner/adminQueries.ts` | Modify | Add `landingHtml` to `ADMIN_PARTNER_BY_ID_QUERY`. |
| `apps/web/lib/storefront/renderTokens.ts` | Create | `renderLandingHtml(html, ctx)` — extract body, replace `{{BOOKING}}`/`{{MENU}}`; `renderMenuHtml(sections)`. |
| `apps/web/scripts/verify-render-tokens.ts` | Create | Runnable assertions for the token renderer. |
| `apps/web/components/storefront/CustomLanding.tsx` | Create | Server component: render the token-replaced HTML. |
| `apps/web/components/storefront/RestaurantStorefront.tsx` | Modify | Branch: `landingHtml` → `<CustomLanding>`; else → upgraded default. |
| `apps/web/app/w/[slug]/layout.tsx` + `apps/web/app/storefront/layout.tsx` | Modify | Skip `<StorefrontShell>` when the partner has `landingHtml`. |
| `apps/web/app/api/admin/partners/route.ts` + `[id]/route.ts` | Modify | Accept + persist `landingHtml`. |
| `apps/web/app/admin/partners/_components/PartnerForm.tsx` | Modify | Add the `landingHtml` textarea + send it. |

---

## Task 1: Data model — `landingHtml` on partner

**Files:** `apps/studio/schemas/partner.ts`, `apps/web/lib/partner/types.ts`, `apps/web/lib/partner/queries.ts`, `apps/web/lib/partner/adminQueries.ts`

- [ ] **Step 1: Sanity field** — in `apps/studio/schemas/partner.ts`, add to the `content` group (after `footerText` or similar):
```ts
    defineField({
      name: 'landingHtml',
      title: 'Custom landing page HTML',
      description:
        'Optional. A complete HTML page served verbatim at the partner site. Use {{BOOKING}} for the booking form and {{MENU}} for the live menu. CSS only (no JS). Leave empty to use the default template.',
      type: 'text',
      rows: 20,
      group: 'content',
    }),
```
- [ ] **Step 2: Type** — in `apps/web/lib/partner/types.ts`, add to `Partner`: `landingHtml?: string | null;`
- [ ] **Step 3: Projection** — in `apps/web/lib/partner/queries.ts`, add `landingHtml` to `PARTNER_PROJECTION` (so `getPartnerByHost`/`getPartnerBySlug` return it).
- [ ] **Step 4: Admin edit query** — in `apps/web/lib/partner/adminQueries.ts`, add `landingHtml` to `ADMIN_PARTNER_BY_ID_QUERY`'s projection (for edit pre-fill).
- [ ] **Step 5: Verify** `pnpm --filter @klickenya/web exec tsc --noEmit && pnpm build:studio` → pass.
- [ ] **Step 6: Commit** `git add apps/studio/schemas/partner.ts apps/web/lib/partner/ && git commit -m "feat(storefront): add partner.landingHtml field + projections"`

---

## Task 2: Token renderer

**Files:** Create `apps/web/lib/storefront/renderTokens.ts` + `apps/web/scripts/verify-render-tokens.ts`

- [ ] **Step 1: Create the renderer**
```ts
import type { StorefrontMenu } from "@/lib/storefront/getRestaurant";

interface RenderCtx {
  menuSlug: string | null;       // menu.slug — for the booking iframe
  menuSections: StorefrontMenu["menu_sections"] | null;
  accentHex: string | null;      // partner.colorPrimary (e.g. "#0055FF" or null)
  siteUrl: string;               // NEXT_PUBLIC_SITE_URL
}

/** Booking iframe (the existing /embed widget). Empty when no bookable menu. */
function bookingHtml(ctx: RenderCtx): string {
  if (!ctx.menuSlug) return "";
  const accent = ctx.accentHex ? `?accent=${encodeURIComponent(ctx.accentHex.replace("#", ""))}` : "";
  const src = `${ctx.siteUrl}/embed/reservations/${ctx.menuSlug}${accent}`;
  return `<iframe src="${src}" style="width:100%;max-width:520px;height:680px;border:0" title="Book a table"></iframe>`;
}

/** Live menu as semantic HTML the operator's CSS can target (.kk-menu*). */
export function renderMenuHtml(sections: StorefrontMenu["menu_sections"] | null): string {
  const visible = (sections ?? []).filter((s) => s.is_visible && s.menu_items.length > 0);
  if (visible.length === 0) return `<div class="kk-menu kk-menu--empty">Menu coming soon.</div>`;
  const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  const sectionsHtml = visible
    .slice()
    .sort((a, b) => a.display_order - b.display_order)
    .map((s) => {
      const items = s.menu_items
        .filter((i) => i.is_available)
        .sort((a, b) => a.display_order - b.display_order)
        .map(
          (i) =>
            `<li class="kk-menu-item"><span class="kk-item-name">${esc(i.name)}</span>` +
            (i.description ? `<span class="kk-item-desc">${esc(i.description)}</span>` : "") +
            `<span class="kk-item-price">KES ${i.price_kes}</span></li>`,
        )
        .join("");
      return `<section class="kk-menu-section"><h3 class="kk-section-title">${esc(s.title)}</h3><ul class="kk-menu-list">${items}</ul></section>`;
    })
    .join("");
  return `<div class="kk-menu">${sectionsHtml}</div>`;
}

/** If a full document was pasted, take the <body> inner + hoist <head> <style>/<link>. */
function extractRenderable(html: string): string {
  const bodyMatch = html.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
  if (!bodyMatch) return html; // already a fragment
  const headMatch = html.match(/<head[^>]*>([\s\S]*?)<\/head>/i);
  const headStyles = headMatch
    ? (headMatch[1].match(/<style[\s\S]*?<\/style>|<link[^>]*rel=["']stylesheet["'][^>]*>/gi) ?? []).join("\n")
    : "";
  return `${headStyles}\n${bodyMatch[1]}`;
}

/** Replace {{BOOKING}} / {{MENU}} and normalize a pasted full document to a renderable fragment. */
export function renderLandingHtml(rawHtml: string, ctx: RenderCtx): string {
  let html = extractRenderable(rawHtml);
  html = html.split("{{BOOKING}}").join(bookingHtml(ctx));
  html = html.split("{{MENU}}").join(renderMenuHtml(ctx.menuSections));
  return html;
}
```
- [ ] **Step 2: Verify script** `apps/web/scripts/verify-render-tokens.ts`:
```ts
import { renderLandingHtml, renderMenuHtml } from "../lib/storefront/renderTokens";

const ctx = { menuSlug: "tandoori-menu", menuSections: null, accentHex: "#0055FF", siteUrl: "https://klickenya.com" };

const out = renderLandingHtml("<h1>Hi</h1>{{BOOKING}}{{MENU}}", ctx);
let ok = true;
if (!out.includes("/embed/reservations/tandoori-menu?accent=0055FF")) { ok = false; console.error("FAIL booking:", out); }
if (!out.includes("kk-menu--empty")) { ok = false; console.error("FAIL empty menu:", out); }
// full-document paste → body extracted
const full = renderLandingHtml("<!doctype html><html><head><style>.x{}</style></head><body><main>Hi</main></body></html>", ctx);
if (!full.includes("<main>Hi</main>") || full.includes("<body")) { ok = false; console.error("FAIL extract:", full); }
// no booking when no menu slug
const noMenu = renderLandingHtml("{{BOOKING}}", { ...ctx, menuSlug: null });
if (noMenu.trim() !== "") { ok = false; console.error("FAIL no-menu booking:", noMenu); }
if (!ok) process.exit(1);
console.log("PASS renderTokens");
```
- [ ] **Step 3: Verify** `pnpm --filter @klickenya/web exec tsc --noEmit && npx tsx apps/web/scripts/verify-render-tokens.ts` → tsc 0, `PASS renderTokens`. (Match the `StorefrontMenu` exported type from `getRestaurant.ts`; adjust the `menu_items` field names — `price_kes`, `is_available`, `display_order`, `is_visible` — to the real shape.)
- [ ] **Step 4: Commit** `git add apps/web/lib/storefront/renderTokens.ts apps/web/scripts/verify-render-tokens.ts && git commit -m "feat(storefront): landing-page token renderer ({{BOOKING}}, {{MENU}})"`

---

## Task 3: Serve the custom landing page

**Files:** Create `apps/web/components/storefront/CustomLanding.tsx`; modify `RestaurantStorefront.tsx`, `app/w/[slug]/layout.tsx`, `app/storefront/layout.tsx`

- [ ] **Step 1: CustomLanding component**
```tsx
import { renderLandingHtml } from "@/lib/storefront/renderTokens";
import type { Partner } from "@/lib/partner/types";
import type { StorefrontRestaurant } from "@/lib/storefront/getRestaurant";

export function CustomLanding({
  partner, restaurant,
}: { partner: Partner; restaurant: StorefrontRestaurant | null }) {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://klickenya.com";
  const html = renderLandingHtml(partner.landingHtml ?? "", {
    menuSlug: restaurant?.menu?.slug ?? null,
    menuSections: restaurant?.menu?.menu_sections ?? null,
    accentHex: partner.colorPrimary ?? null,
    siteUrl,
  });
  return <div dangerouslySetInnerHTML={{ __html: html }} />;
}
```
(Confirm `StorefrontRestaurant`'s `menu` shape exposes `slug` + `menu_sections` — it does per getRestaurant.ts.)
- [ ] **Step 2: Branch in `RestaurantStorefront.tsx`** — after `getRestaurant(partner)`, before the default JSX:
```tsx
  if (partner.landingHtml && partner.landingHtml.trim()) {
    return <CustomLanding partner={partner} restaurant={restaurant} />;
  }
```
(Pass `partner` into `RestaurantStorefront` — it already receives `partner`. Import `CustomLanding`.)
- [ ] **Step 3: Skip the shell for custom partners** — in BOTH `app/w/[slug]/layout.tsx` and `app/storefront/layout.tsx`, after resolving `partner`, before wrapping in `<StorefrontShell>`:
```tsx
  if (partner.landingHtml && partner.landingHtml.trim()) {
    return <>{children}</>; // custom page provides its own full chrome
  }
```
(Keep the existing no-partner fallback above this; keep `<StorefrontShell>` for non-custom partners.)
- [ ] **Step 4: Verify** `rm -rf apps/web/.next && pnpm --filter @klickenya/web exec tsc --noEmit && pnpm build` → pass.
- [ ] **Step 5: Commit** `git add apps/web/components/storefront/CustomLanding.tsx apps/web/components/storefront/RestaurantStorefront.tsx apps/web/app/w apps/web/app/storefront && git commit -m "feat(storefront): serve partner.landingHtml (custom page, no shell, tokens replaced)"`

---

## Task 4: Admin form + API persist `landingHtml`

**Files:** `apps/web/app/api/admin/partners/route.ts`, `apps/web/app/api/admin/partners/[id]/route.ts`, `apps/web/app/admin/partners/_components/PartnerForm.tsx`

- [ ] **Step 1: POST route** — in `route.ts`, read `const landingHtml = (form.get("landingHtml") as string) || "";` and include `...(landingHtml ? { landingHtml } : {})` in the `sanityWriteClient.create({...})` partner doc.
- [ ] **Step 2: PATCH route** — in `[id]/route.ts`, add to the `set` builder: `const lh = form.get("landingHtml"); if (typeof lh === "string") set.landingHtml = lh;` (allow clearing → empty string).
- [ ] **Step 3: PartnerForm** — add a collapsible **"Custom landing page HTML (optional)"** `<textarea>` (≥16px, monospace, ~12 rows), state-bound, pre-filled from `partner?.landingHtml` in edit mode. A helper line: "Paste a full HTML page. Use `{{BOOKING}}` and `{{MENU}}` where you want the form/menu. CSS only. Empty = default template." Append to the FormData: `fd.append("landingHtml", landingHtml);`.
- [ ] **Step 4: Verify** `rm -rf apps/web/.next && pnpm --filter @klickenya/web exec tsc --noEmit && pnpm build` → pass.
- [ ] **Step 5: Commit** `git add apps/web/app/api/admin/partners apps/web/app/admin/partners && git commit -m "feat(admin): landingHtml textarea + persist on create/edit"`

---

## Task 5: Upgrade the default restaurant template

**Files:** `apps/web/components/storefront/RestaurantStorefront.tsx` (the default-branch JSX)

Rebuild the default (non-custom) branch into a premium landing page. **Use the soft-skill (or taste-skill) frontend-design skill** for the styling pass — the goal is "expensive-looking", not a Klickenya clone. Auto-fill from `restaurant.listing` (title, photos[], description, cuisine, city, openingHours, address) + `restaurant.menu` + the partner theme (token utilities re-skin via `<PartnerTheme>`).

- [ ] **Step 1: Sections** (server component; the only interactive piece is the existing `<ReservationSheet>`):
  - **Hero** — full-bleed `photos[0]`, restaurant name (font-display), `cuisine · city · openingHours`, a prominent **Book a table** `<ReservationSheet triggerLabel="Book a table">` CTA (gated on `menu.reservations_enabled`).
  - **About** — `listing.description` (render the block/text safely).
  - **Menu** — the prepared sections (reuse `prepareSections`) in a readable two-column/elegant layout.
  - **Gallery** — `photos.slice(1)` in a responsive grid (plain `<img>`, eslint-disabled, per existing pattern).
  - **Location & hours** — `address` + `openingHours`.
  - Footer stays in `StorefrontShell`.
- [ ] **Step 2: Verify** `rm -rf apps/web/.next && pnpm build` → pass. Visual check is the controller's (screenshots) — note deferred.
- [ ] **Step 3: Commit** `git add apps/web/components/storefront/RestaurantStorefront.tsx && git commit -m "feat(storefront): premium default restaurant landing page"`

---

## Task 6: Final verification + review + e2e

- [ ] **Step 1: Full gate** — `rm -rf apps/web/.next && pnpm --filter @klickenya/web exec tsc --noEmit && npx tsx apps/web/scripts/verify-render-tokens.ts && pnpm build && pnpm build:studio`; lint grep for new/changed files (no new errors).
- [ ] **Step 2: Manual e2e**
  1. A test partner with a restaurant listing + published menu (reservations on).
  2. **Default:** leave `landingHtml` empty → `/w/<slug>` shows the upgraded template (hero/about/menu/gallery/location), themed; booking works.
  3. **Custom:** set `landingHtml` to a small page using `{{BOOKING}}` and `{{MENU}}` → `/w/<slug>` shows the bespoke page, the booking iframe loads + books, the menu renders live (edit a menu item in the dashboard → it updates).
  4. Clear `landingHtml` → back to the default template.
- [ ] **Step 3: Code review** — focus: the `landingHtml` branch is consistent across layout + page (no Klickenya chrome on custom pages); token replacement can't be abused (admin-only authoring, fixed token output); `extractRenderable` handles full-doc + fragment; the upgraded template handles missing photos/description/menu gracefully; XSS posture (admin-trusted).
- [ ] **Step 4: Tag** `git commit --allow-empty -m "chore(storefront): premium storefront + custom HTML complete"`

---

## What this delivers
Every partner gets a polished restaurant landing page automatically; any partner can be upgraded to a fully bespoke HTML page (designed in Claude) served at their domain, with live booking + menu dropped in via `{{BOOKING}}`/`{{MENU}}`.

## What it does NOT do (later)
- JS in custom HTML (CSS-only v1); a fully-isolated document via a route handler (if needed later).
- A no-code page builder; per-listing pages; non-restaurant templates; extra tokens beyond booking/menu; draft/preview of custom HTML.
