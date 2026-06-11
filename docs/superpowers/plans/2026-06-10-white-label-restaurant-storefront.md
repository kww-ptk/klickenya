# White-Label — Restaurant Storefront Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship a public, per-partner branded restaurant website (menu + reserve-a-table) served by `apps/web` itself, host-routed: when a request arrives on a partner's domain, render their branded storefront; klickenya.com keeps serving the marketplace.

**Architecture:** No new app. A real `/storefront` route segment in `apps/web` holds a branded layout (`<PartnerTheme>` + partner header/footer) and a restaurant page. Middleware rewrites any non-"house" host into `/storefront/*` (browser URL unchanged). The page resolves the partner by host (Plan 2's `getPartnerByHost`), finds the partner's restaurant listing (Sanity, `partner._ref`), resolves its Supabase menu (`menus.listing_slug`), and renders the existing menu components + the existing `<ReservationSheet>` (which already POSTs to `/api/menu/reservations`). Heavy reuse; little net-new code.

**Tech Stack:** Next.js 15 App Router (middleware rewrites, route segments), Sanity/GROQ, Supabase (`adminClient`), Tailwind v4 tokens (themed via Plan 2), TypeScript.

**Re-prioritization (2026-06-10):** This replaces the original "Plan 3 (dashboard white-labeling)" as the next plan — shipping the public website is the priority. Clients manage from the un-branded `klickenya.com/dashboard` for now; dashboard branding + nav gating + admin-domain auth become a later plan. White-label integrity holds: guests only see the branded storefront (the reservation flow emails the host, not the guest).

## Spec
`docs/superpowers/specs/2026-05-29-white-label-partner-platform-design.md` §15 (storefront templating; restaurant template = reserve-a-table + view-menu). NOTE: §3/§8 originally specified a *separate* storefront app; per the 2026-06-10 decision the storefront is built **inside `apps/web`** (host-routed) to reuse Plan 2's themeable components — record this as a spec deviation.

## Branch
Builds on Plan 2 (`feat/white-label-2-theming`, PR #40, open). Branch `feat/white-label-storefront` off `feat/white-label-2-theming` (stacked) so Plan 2's resolver/theme/tokenized components are present. PR targets `feat/white-label-2-theming` (auto-retargets to dev as the stack merges).

## Verification note
No test framework (per Plans 1–2). Verify with: `pnpm --filter @klickenya/web exec tsc --noEmit` (exit 0), `pnpm build`, and **manual e2e** using a test partner host. For local e2e, modern browsers resolve `*.localhost` to 127.0.0.1 automatically, so a test partner whose `domains` include `tandoori.localhost` can be visited at `http://tandoori.localhost:3000`. Clear `apps/web/.next` before a build if stale `validator.ts` errors appear.

---

## File structure

| File | Action | Responsibility |
|---|---|---|
| `apps/web/middleware.ts` | Modify | Rewrite non-house hosts → `/storefront/*`; block direct `/storefront` on house hosts; skip auth on partner hosts. |
| `apps/web/lib/storefront/houseHost.ts` | Create | `isHouseHost(host)` — single source of truth for which hosts are Klickenya (vs partner storefronts). |
| `apps/web/lib/storefront/getRestaurant.ts` | Create | Resolve partner → restaurant listing (Sanity) → menu + reservation settings/windows/areas (Supabase). Returns everything the page needs. |
| `apps/web/lib/partner/queries.ts` | Modify | Add `PARTNER_RESTAURANT_LISTING_QUERY` (partner's restaurant listing with display fields). |
| `apps/web/app/storefront/layout.tsx` | Create | Branded shell: `<PartnerTheme>` + partner header/footer + "Powered by Klickenya"; `notFound()` if host has no partner. |
| `apps/web/app/storefront/page.tsx` | Create | The restaurant storefront: hero + menu (reuse `MenuWithFilters`) + `<ReservationSheet>`. |
| `apps/web/app/api/menu/reservations/route.ts` | Modify | Accept `source: "storefront"` (one enum entry). |
| `apps/web/components/reservations/ReservationSheet.tsx` | Modify | Add `"storefront"` to the `source` prop union. |

---

## Task 1: `isHouseHost` helper

**Files:** Create `apps/web/lib/storefront/houseHost.ts`

- [ ] **Step 1: Create the helper**
```ts
/**
 * True when `host` is a Klickenya house host (marketplace), false when it is a
 * partner storefront domain. `host` should be the bare hostname (may include a
 * port). Used by middleware to decide whether to serve the marketplace or
 * rewrite to the /storefront route tree.
 */
export function isHouseHost(host: string | null | undefined): boolean {
  if (!host) return true; // no host → safest default is the marketplace
  const h = host.split(":")[0].toLowerCase(); // strip port
  if (h === "localhost" || h === "127.0.0.1") return true;
  if (h.endsWith(".vercel.app")) return true; // preview deployments
  const siteHost = (process.env.NEXT_PUBLIC_SITE_URL || "https://klickenya.com")
    .replace(/^https?:\/\//, "")
    .split("/")[0]
    .split(":")[0]
    .toLowerCase();
  if (h === siteHost || h === `www.${siteHost}`) return true;
  if (h === "klickenya.com" || h === "www.klickenya.com") return true;
  return false; // anything else is a partner storefront host
}
```
Note: a `*.localhost` subdomain (e.g. `tandoori.localhost`) is NOT equal to `localhost`, so it correctly returns `false` → enables local storefront testing.

- [ ] **Step 2: Verify** `pnpm --filter @klickenya/web exec tsc --noEmit` → exit 0.
- [ ] **Step 3: Commit** `git add apps/web/lib/storefront/houseHost.ts && git commit -m "feat(storefront): isHouseHost helper (marketplace vs partner host)"`

---

## Task 2: Middleware host-routing

**Files:** Modify `apps/web/middleware.ts`

The current middleware runs Supabase auth on all matched routes and returns `supabaseResponse`. Add host routing at the TOP, before the auth logic. Read the current file first.

- [ ] **Step 1: Add the host-routing block**

Add this import at the top:
```ts
import { isHouseHost } from "@/lib/storefront/houseHost";
```
Then, as the FIRST statements inside `middleware(request)` (before the `createServerClient` call):
```ts
  const host = request.headers.get("host");
  const pathname = request.nextUrl.pathname;

  // ── Partner storefront host: serve the /storefront route tree, no auth ──
  if (!isHouseHost(host)) {
    // Let API routes, Next internals, and already-rewritten paths pass through
    // unchanged — only PAGE routes get rewritten into the /storefront segment.
    // (Critical: the storefront's reservation POST hits /api/menu/reservations
    // on the partner host; rewriting it to /storefront/api/... would 404.)
    if (
      pathname.startsWith("/storefront") ||
      pathname.startsWith("/api") ||
      pathname.startsWith("/_next")
    ) {
      return NextResponse.next();
    }
    const url = request.nextUrl.clone();
    url.pathname = `/storefront${pathname === "/" ? "" : pathname}`;
    return NextResponse.rewrite(url);
  }

  // ── House host: never expose the internal /storefront segment ──
  if (pathname.startsWith("/storefront")) {
    const url = request.nextUrl.clone();
    url.pathname = "/";
    return NextResponse.redirect(url);
  }
```
Leave the existing Supabase-auth logic below this block unchanged (it now only runs for house hosts). Remove the now-duplicate `const pathname = request.nextUrl.pathname;` further down if the existing code re-declares it (it does — dedupe to avoid a redeclaration error; keep the one added above).

- [ ] **Step 2: Verify build** `rm -rf apps/web/.next && pnpm build` → succeeds. `pnpm --filter @klickenya/web exec tsc --noEmit` → exit 0.

- [ ] **Step 3: Manual smoke (controller/user)** — deferred to Task 6 e2e (needs the storefront pages from Tasks 3–5 to exist). Note it.

- [ ] **Step 4: Commit** `git add apps/web/middleware.ts && git commit -m "feat(storefront): host-route partner domains to /storefront (rewrite), guard house hosts"`

---

## Task 3: Partner restaurant query + data resolver

**Files:**
- Modify `apps/web/lib/partner/queries.ts`
- Create `apps/web/lib/storefront/getRestaurant.ts`

- [ ] **Step 1: Add the partner-restaurant GROQ**

In `apps/web/lib/partner/queries.ts`, add (model the fields on the existing restaurant listing fields in `apps/studio/schemas/listing.ts`):
```ts
import { groq } from "next-sanity";

// The partner's primary restaurant listing (published). A "restaurant" is a
// listing with a linked Supabase menu; for v1 we take the first published
// listing belonging to the partner that has a slug, and resolve its menu in
// Supabase. Display fields only — booking data comes from the menu (Supabase).
export const PARTNER_RESTAURANT_LISTING_QUERY = groq`
  *[_type == "listing" && status == "published" && partner._ref == $partnerId][0] {
    _id,
    title,
    "slug": slug.current,
    type,
    city,
    county,
    address,
    description,
    openingHours,
    cuisine,
    priceRange,
    atmosphere,
    "photos": photos[]{ "url": asset->url, alt }
  }
`;
```
(If `apps/web/lib/partner/queries.ts` already imports `groq`, don't duplicate the import.)

- [ ] **Step 2: Create the resolver**

`apps/web/lib/storefront/getRestaurant.ts` — resolves the partner's restaurant + menu. Replicates the public menu `select` used by `apps/web/app/m/[slug]/page.tsx` (read that file's `getMenu` for the exact nested select; reproduce the same select here). Skeleton:
```ts
import { cache } from "react";
import { sanityClient } from "@/lib/sanity/client";
import { adminClient } from "@/lib/supabase/admin";
import { PARTNER_RESTAURANT_LISTING_QUERY } from "@/lib/partner/queries";
import type { Partner } from "@/lib/partner/types";

export interface StorefrontRestaurant {
  listing: {
    _id: string; title: string; slug: string; type: string;
    city: string | null; county: string | null; address: string | null;
    description: unknown; openingHours: string | null;
    cuisine: string[] | null; priceRange: string | null; atmosphere: string | null;
    photos: { url: string | null; alt?: string | null }[] | null;
  };
  menu: {
    id: string; name: string; slug: string;
    reservations_enabled: boolean;
    reservations_lead_time_hours: number;
    reservations_max_party_size: number;
    reservations_max_advance_days: number;
    default_reservation_duration: number;
    menu_sections: unknown[]; // shape matches /m/[slug] getMenu
  } | null;
  timeWindows: { open_time: string; close_time: string; is_active?: boolean }[];
  areas: { id: string; name: string; capacity_total: number; is_active: boolean }[];
  restaurantPhone: string | null;
}

/**
 * Resolve a partner's restaurant storefront data: the Sanity restaurant listing
 * + its linked Supabase menu (sections/items) + reservation settings, time
 * windows, areas, and the host phone. Returns null when the partner has no
 * published listing or the listing has no linked published menu.
 *
 * Reuse: the menu `.select(...)` below MUST match the nested select in
 * apps/web/app/m/[slug]/page.tsx getMenu() (sections → items → option groups),
 * plus the parallel restaurant_areas / reservation_time_windows / host phone
 * fetches. Read that file and reproduce its select + parallel fetches here.
 */
export const getRestaurant = cache(
  async (partner: Partner): Promise<StorefrontRestaurant | null> => {
    const listing = await sanityClient.fetch(PARTNER_RESTAURANT_LISTING_QUERY, {
      partnerId: partner._id,
    });
    if (!listing?.slug) return null;

    const { data: menu } = await adminClient
      .from("menus")
      .select(/* the SAME nested select as /m/[slug] getMenu() */ "id, name, slug, listing_slug, business_id, reservations_enabled, default_reservation_duration, reservations_lead_time_hours, reservations_max_party_size, reservations_max_advance_days, table_ordering, menu_sections(id,title,display_order,is_visible,station,menu_items(id,name,description,price_kes,dietary_tags,is_available,display_order,photo_url,item_option_groups(id,name,group_type,is_required,min_select,max_select,display_order,item_options(id,name,price_modifier,is_available,display_order))))")
      .eq("listing_slug", listing.slug)
      .eq("is_published", true)
      .maybeSingle();

    if (!menu) return { listing, menu: null, timeWindows: [], areas: [], restaurantPhone: null };

    const [areasRes, windowsRes, phoneRes] = await Promise.allSettled([
      adminClient.from("restaurant_areas").select("id,name,capacity_total,is_active").eq("menu_id", menu.id).eq("is_active", true),
      adminClient.from("reservation_time_windows").select("open_time,close_time,is_active").eq("menu_id", menu.id).eq("is_active", true),
      adminClient.from("host_profiles").select("phone").eq("user_id", menu.business_id).maybeSingle(),
    ]);

    return {
      listing,
      menu,
      areas: areasRes.status === "fulfilled" ? (areasRes.value.data ?? []) : [],
      timeWindows: windowsRes.status === "fulfilled" ? (windowsRes.value.data ?? []) : [],
      restaurantPhone: phoneRes.status === "fulfilled" ? (phoneRes.value.data?.phone ?? null) : null,
    };
  }
);
```
The implementer MUST open `apps/web/app/m/[slug]/page.tsx` and confirm the exact column names + nested select, and match the `restaurant_areas`/`reservation_time_windows` column names used there (the Explore map lists them: areas have `id,name,capacity_total,color_hex,display_order,is_active`; windows have `open_time,close_time,is_active`). Adjust the select/types to match reality; do not invent columns.

- [ ] **Step 3: Verify** `pnpm --filter @klickenya/web exec tsc --noEmit` → exit 0.
- [ ] **Step 4: Commit** `git add apps/web/lib/partner/queries.ts apps/web/lib/storefront/getRestaurant.ts && git commit -m "feat(storefront): partner restaurant query + getRestaurant resolver (listing + menu + booking settings)"`

---

## Task 4: Storefront branded layout

**Files:** Create `apps/web/app/storefront/layout.tsx`

- [ ] **Step 1: Create the layout**
```tsx
import { notFound } from "next/navigation";
import { getPartnerByHost } from "@/lib/partner/resolve";
import { PartnerTheme } from "@/components/partner/PartnerTheme";

export default async function StorefrontLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const partner = await getPartnerByHost();
  if (!partner) notFound(); // a storefront host with no partner doc

  return (
    <div className="min-h-screen flex flex-col bg-canvas text-text">
      <PartnerTheme partner={partner} />
      <header className="border-b border-border bg-white/80 backdrop-blur">
        <div className="max-w-5xl mx-auto px-4 h-16 flex items-center">
          {partner.logo?.url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={partner.logo.url} alt={partner.name} className="h-9 w-auto" />
          ) : (
            <span className="font-display text-xl font-bold text-dark">{partner.name}</span>
          )}
        </div>
      </header>

      <main className="flex-1">{children}</main>

      <footer className="border-t border-border bg-surface mt-12">
        <div className="max-w-5xl mx-auto px-4 py-8 text-sm text-text2 flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>{partner.footerText || `© ${partner.name}`}</span>
          {partner.poweredByKlickenya ? (
            <a href="https://klickenya.com" className="text-text3 hover:text-amber">
              Powered by Klickenya
            </a>
          ) : null}
        </div>
      </footer>
    </div>
  );
}
```
(Uses the now-themeable token utilities `bg-canvas`/`text-dark`/`text-amber` from Plan 2 — they re-skin to the partner's brand via `<PartnerTheme>`. A partner logo image at runtime requires plain `<img>`, not `next/image` — note the eslint-disable.)

- [ ] **Step 2: Verify build** `rm -rf apps/web/.next && pnpm build` → succeeds.
- [ ] **Step 3: Commit** `git add apps/web/app/storefront/layout.tsx && git commit -m "feat(storefront): branded storefront layout (PartnerTheme + header/footer)"`

---

## Task 5: Storefront restaurant page + reservation source

**Files:**
- Create `apps/web/app/storefront/page.tsx`
- Modify `apps/web/app/api/menu/reservations/route.ts` (allow `source: "storefront"`)
- Modify `apps/web/components/reservations/ReservationSheet.tsx` (add `"storefront"` to the `source` union)

- [ ] **Step 1: Allow `"storefront"` as a reservation source**

In `apps/web/app/api/menu/reservations/route.ts`, find the source validation:
```ts
if (source !== "qr_menu" && source !== "listing" && source !== "direct" && source !== "phone") {
```
Add `storefront`:
```ts
if (source !== "qr_menu" && source !== "listing" && source !== "direct" && source !== "phone" && source !== "storefront") {
```
In `apps/web/components/reservations/ReservationSheet.tsx`, change the `source` prop type from `"qr_menu" | "listing"` to `"qr_menu" | "listing" | "storefront"`.

- [ ] **Step 2: Create the restaurant page**
```tsx
import { notFound } from "next/navigation";
import { getPartnerByHost } from "@/lib/partner/resolve";
import { getRestaurant } from "@/lib/storefront/getRestaurant";
import { MenuWithFilters } from "@/components/menu/MenuWithFilters";
import { ReservationSheet } from "@/components/reservations/ReservationSheet";

export default async function StorefrontHome() {
  const partner = await getPartnerByHost();
  if (!partner) notFound();
  const data = await getRestaurant(partner);
  if (!data) notFound();

  const { listing, menu, timeWindows, areas, restaurantPhone } = data;
  const hero = listing.photos?.[0]?.url ?? null;

  return (
    <div>
      {/* Hero */}
      <section className="relative">
        {hero ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={hero} alt={listing.title} className="w-full h-[42vh] object-cover" />
        ) : (
          <div className="w-full h-[28vh] bg-dark" />
        )}
        <div className="max-w-5xl mx-auto px-4 -mt-12 relative">
          <div className="bg-white rounded-xl shadow-md border border-border p-6">
            <h1 className="font-display text-3xl font-bold text-dark">{listing.title}</h1>
            <p className="mt-1 text-text2">
              {[listing.cuisine?.join(" · "), listing.city, listing.openingHours].filter(Boolean).join("  •  ")}
            </p>
            {menu?.reservations_enabled ? (
              <div className="mt-4">
                <ReservationSheet
                  menuId={menu.id}
                  menuName={menu.name}
                  source="storefront"
                  timeWindows={timeWindows}
                  areas={areas}
                  maxPartySize={menu.reservations_max_party_size}
                  maxAdvanceDays={menu.reservations_max_advance_days}
                  leadTimeHours={menu.reservations_lead_time_hours}
                  restaurantPhone={restaurantPhone}
                  triggerLabel="Book a table"
                />
              </div>
            ) : null}
          </div>
        </div>
      </section>

      {/* Menu */}
      {menu?.menu_sections?.length ? (
        <section className="max-w-5xl mx-auto px-4 py-10">
          <h2 className="font-display text-2xl font-bold text-dark mb-6">Menu</h2>
          <MenuWithFilters sections={menu.menu_sections as never} />
        </section>
      ) : null}
    </div>
  );
}
```
The implementer MUST confirm `MenuWithFilters`'s exact prop name/shape (`apps/web/components/menu/MenuWithFilters.tsx` — per the map, `sections: MenuSection[]`) and `ReservationSheet`'s exact prop names/types (`apps/web/components/reservations/ReservationSheet.tsx` lines 21–37) and adjust the call to match precisely (types over the `as never` cast where possible).

- [ ] **Step 3: Add page metadata (SEO + favicon)**

In the same file, export `generateMetadata` so the browser tab shows the partner/restaurant, not Klickenya:
```tsx
import type { Metadata } from "next";
export async function generateMetadata(): Promise<Metadata> {
  const partner = await getPartnerByHost();
  if (!partner) return {};
  return {
    title: partner.name,
    description: partner.footerText ?? `${partner.name} — book a table & view the menu`,
    icons: partner.favicon?.url ? { icon: partner.favicon.url } : undefined,
  };
}
```

- [ ] **Step 4: Verify** `rm -rf apps/web/.next && pnpm --filter @klickenya/web exec tsc --noEmit && pnpm build` → tsc exit 0, build succeeds.
- [ ] **Step 5: Commit** `git add apps/web/app/storefront/page.tsx apps/web/app/api/menu/reservations/route.ts apps/web/components/reservations/ReservationSheet.tsx && git commit -m "feat(storefront): restaurant storefront page (hero + menu + book a table)"`

---

## Task 6: Final verification + code review + e2e

- [ ] **Step 1: Full gate** — `rm -rf apps/web/.next && pnpm --filter @klickenya/web exec tsc --noEmit && pnpm build && pnpm build:studio`; lint grep for new files (no new errors in `storefront/`, `houseHost`, `getRestaurant`, `storefront/page`, `storefront/layout`).

- [ ] **Step 2: Manual e2e (the real proof)**
  1. In Sanity Studio, ensure a Partner doc exists with `enabledModules` incl. `restaurant`, theme colors set, and `domains` including `tandoori.localhost`. Set a published restaurant listing's `Partner` field to it; ensure that listing's slug matches a published Supabase `menus.listing_slug` with `reservations_enabled = true`.
  2. `pnpm dev`. Visit `http://tandoori.localhost:3000/` → expect the **branded** restaurant storefront (partner colors/logo, hero, menu, "Book a table"). Open the reservation form, submit a booking → expect success + a `reservations` row (status pending) + host notification email.
  3. Visit `http://localhost:3000/` → expect the **Klickenya marketplace** unchanged. Visit `http://localhost:3000/storefront` → expect redirect to `/`.
  4. Confirm `klickenya.com/dashboard` auth still works (house-host path unaffected).

- [ ] **Step 3: Code review** over the diff (base = branch point). Focus: middleware rewrite correctness (no marketplace regression, no auth bypass on house hosts, no infinite rewrite loop), the `getRestaurant` select matching real columns, `ReservationSheet` prop wiring, and that a storefront host with no partner 404s cleanly.

- [ ] **Step 4: Tag complete** `git commit --allow-empty -m "chore(storefront): restaurant storefront complete"`

---

## What this delivers
A partner points their domain at the Klickenya deployment → they get a branded one-page restaurant website (hero + full menu + working table reservations) with zero new app/infra. Onboarding a restaurant client = create the Partner doc (brand + domain), link their listing, point DNS.

## What it does NOT do (later)
- Multi-page storefront (about/contact/gallery), multiple listings per partner, non-restaurant templates (stay/tour) — the page handles one restaurant listing for v1.
- Bespoke visual design — v1 reuses Klickenya's menu components inside a branded shell; a custom storefront design pass (frontend-design skill) is a follow-up.
- Dashboard branding / admin-domain auth / partner-aware host email (deferred Plan).
- Preview-deployment storefront testing (the `*.vercel.app` host is treated as house; test locally via `*.localhost` or on the real partner domain).
