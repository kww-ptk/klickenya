# Admin "Create Partner Site" Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A single `/admin/partners` flow (list + create/edit form + orchestration API) that creates a white-label partner end-to-end — Sanity `partner` doc (with uploaded logo), assigns an existing restaurant listing, creates/links the client's host login (setting `host_profiles.partner_id`), and returns the live `klickenya.com/w/<slug>` link.

**Architecture:** New admin pages (server list + client form) post multipart form data to a new admin-only orchestration route that writes to Sanity (partner doc + listing patch + logo asset) and Supabase (host account + partner_id). Reuses the existing admin auth guard, the host-creation flow (extracted into a shared helper), and the live `/w/<slug>` storefront.

**Tech Stack:** Next.js 15 App Router (server components, route handlers, multipart `request.formData()`), `@sanity/client` (write token + asset upload), Supabase `adminClient`, TypeScript.

## Spec
`docs/superpowers/specs/2026-06-11-admin-create-partner-site-design.md`

## Branch
Builds on the storefront (`/w/<slug>` must exist). Branch `feat/admin-partner-onboarding` off `feat/white-label-storefront`.

## Verification note
No test framework. Verify with `pnpm --filter @klickenya/web exec tsc --noEmit` (exit 0), `pnpm build`, and **manual e2e** in `/admin`. Clear `apps/web/.next` if stale `validator.ts` errors appear. Admin pages are gated by middleware (non-admins redirected); admin API routes use `assertAdmin`.

---

## File structure

| File | Action | Responsibility |
|---|---|---|
| `apps/web/lib/sanity/writeClient.ts` | Create | Shared write-enabled Sanity client (`SANITY_WRITE_TOKEN`). |
| `apps/web/lib/admin/createHost.ts` | Create | `createHostAccount({name,email,phone?,partnerId?})` — extracted host-creation (auth user + users + host_profiles + welcome email). |
| `apps/web/app/api/admin/hosts/create/route.ts` | Modify | Refactor to call `createHostAccount` (behavior unchanged). |
| `apps/web/lib/partner/adminQueries.ts` | Create | GROQ: partners list, single partner, unassigned restaurant listings. |
| `apps/web/app/api/admin/partners/route.ts` | Create | `POST` — create-partner orchestration (multipart). |
| `apps/web/app/api/admin/partners/[id]/route.ts` | Create | `PATCH` — edit partner. |
| `apps/web/app/admin/partners/page.tsx` | Create | Partners list (server component). |
| `apps/web/app/admin/partners/_components/PartnerForm.tsx` | Create | Client form (create + edit), submits multipart. |
| `apps/web/app/admin/partners/new/page.tsx` | Create | Create page (fetches listings + hosts, renders PartnerForm). |
| `apps/web/app/admin/partners/[id]/edit/page.tsx` | Create | Edit page (pre-filled PartnerForm). |
| `apps/web/app/admin/layout.tsx` | Modify | Add a "Partners" nav link. |

---

## Task 1: Shared write client + extract host-creation helper

**Files:**
- Create `apps/web/lib/sanity/writeClient.ts`
- Create `apps/web/lib/admin/createHost.ts`
- Modify `apps/web/app/api/admin/hosts/create/route.ts`

- [ ] **Step 1: Shared Sanity write client**

`apps/web/lib/sanity/writeClient.ts`:
```ts
import { createClient } from "@sanity/client";

/** Write-enabled Sanity client (server only — never import into a client component). */
export const sanityWriteClient = createClient({
  projectId: process.env.NEXT_PUBLIC_SANITY_PROJECT_ID!,
  dataset: process.env.NEXT_PUBLIC_SANITY_DATASET ?? "production",
  apiVersion: "2024-01-01",
  useCdn: false,
  token: process.env.SANITY_WRITE_TOKEN,
});
```
(Match the `@sanity/client` import style used in `apps/web/app/api/admin/claims/[id]/approve/route.ts`. If that file imports `createClient` under an alias like `createSanityClient`, mirror whatever import path resolves — but the package is `@sanity/client`.)

- [ ] **Step 2: Extract the host-creation helper**

READ `apps/web/app/api/admin/hosts/create/route.ts` fully. Move its core logic (slugify, create auth user with `Welcome<NNNN>` temp password, upsert `users` row, insert `host_profiles`, generate magic link, send welcome + admin emails) into a new exported function in `apps/web/lib/admin/createHost.ts`:
```ts
export interface CreateHostInput {
  name: string;
  email: string;
  phone?: string | null;
  partnerId?: string | null; // white-label linkage → host_profiles.partner_id
}
export interface CreateHostResult {
  userId: string;
  hostId: string;
  slug: string;
}
export async function createHostAccount(input: CreateHostInput): Promise<CreateHostResult> {
  // ... the EXACT logic moved from the route, with ONE addition:
  // include `partner_id: input.partnerId ?? null` in the host_profiles insert object.
}
```
Keep all behavior identical (same temp-password pattern, same emails, same return values). The ONLY functional change: the `host_profiles` insert also sets `partner_id: input.partnerId ?? null`.

- [ ] **Step 3: Refactor the existing route to call the helper**

Rewrite `apps/web/app/api/admin/hosts/create/route.ts` so its `POST` handler keeps its existing auth guard + request parsing, then calls `createHostAccount({ name, email, phone })` and returns `{ success: true, hostId, slug }` (its existing response shape). No `partnerId` passed here → stays `null` → existing behavior unchanged.

- [ ] **Step 4: Verify** `rm -rf apps/web/.next && pnpm --filter @klickenya/web exec tsc --noEmit && pnpm build` → exit 0 / success. The existing "Create Host" admin feature must be unaffected (same route contract).

- [ ] **Step 5: Commit**
```bash
git add apps/web/lib/sanity/writeClient.ts apps/web/lib/admin/createHost.ts apps/web/app/api/admin/hosts/create/route.ts
git commit -m "refactor(admin): extract createHostAccount helper (+ optional partnerId) + shared sanity write client"
```

---

## Task 2: Admin GROQ queries

**Files:** Create `apps/web/lib/partner/adminQueries.ts`

- [ ] **Step 1: Create the queries**
```ts
import { groq } from "next-sanity";

/** All partners, newest first — for the /admin/partners list. */
export const ADMIN_PARTNERS_QUERY = groq`
  *[_type == "partner"] | order(_createdAt desc) {
    _id,
    name,
    "slug": slug.current,
    domains,
    "logoUrl": logo.asset->url,
    enabledModules,
    "listingCount": count(*[_type == "listing" && partner._ref == ^._id])
  }
`;

/** One partner by _id — for the edit form. */
export const ADMIN_PARTNER_BY_ID_QUERY = groq`
  *[_type == "partner" && _id == $id][0] {
    _id, name, "slug": slug.current, domains,
    "logoUrl": logo.asset->url,
    colorPrimary, colorAccent, colorDark, fontDisplay, fontBody,
    enabledModules, allowedListingTypes,
    "listingId": *[_type == "listing" && partner._ref == ^._id][0]._id
  }
`;

/** Published listings not yet assigned to any partner (candidates for assignment). */
export const UNASSIGNED_LISTINGS_QUERY = groq`
  *[_type == "listing" && status == "published" && !defined(partner)] | order(title asc) {
    _id, title, "slug": slug.current, type, subcategory, city
  }
`;
```

- [ ] **Step 2: Verify** `pnpm --filter @klickenya/web exec tsc --noEmit` → exit 0.
- [ ] **Step 3: Commit** `git add apps/web/lib/partner/adminQueries.ts && git commit -m "feat(admin): partner admin GROQ queries (list, by-id, unassigned listings)"`

---

## Task 3: `POST /api/admin/partners` — create-partner orchestration

**Files:** Create `apps/web/app/api/admin/partners/route.ts`

This is the core. It receives **multipart form data** (so the logo file can be included). Order of operations per spec §4/§7: validate → upload logo → create partner doc → assign listing → host (create/link) LAST.

- [ ] **Step 1: Create the route**
```ts
import { NextRequest, NextResponse } from "next/server";
import { assertAdmin, AdminAuthError } from "@/lib/admin/auth";
import { adminClient } from "@/lib/supabase/admin";
import { sanityClient } from "@/lib/sanity/client";
import { sanityWriteClient } from "@/lib/sanity/writeClient";
import { createHostAccount } from "@/lib/admin/createHost";

export async function POST(req: NextRequest) {
  try {
    await assertAdmin(req);
  } catch (e) {
    if (e instanceof AdminAuthError) return NextResponse.json({ error: e.message }, { status: e.status });
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const steps: string[] = [];
  try {
    const form = await req.formData();
    const name = (form.get("name") as string)?.trim();
    const slug = (form.get("slug") as string)?.trim().toLowerCase();
    const colorPrimary = (form.get("colorPrimary") as string) || undefined;
    const colorAccent = (form.get("colorAccent") as string) || undefined;
    const colorDark = (form.get("colorDark") as string) || undefined;
    const fontDisplay = (form.get("fontDisplay") as string) || undefined;
    const fontBody = (form.get("fontBody") as string) || undefined;
    const domain = (form.get("domain") as string)?.trim().toLowerCase() || "";
    const enabledModules = JSON.parse((form.get("enabledModules") as string) || '["restaurant"]') as string[];
    const allowedListingTypes = JSON.parse((form.get("allowedListingTypes") as string) || '["stay","experience"]') as string[];
    const listingId = (form.get("listingId") as string) || "";
    const hostEmail = (form.get("hostEmail") as string)?.trim().toLowerCase() || "";
    const hostName = (form.get("hostName") as string)?.trim() || name;
    const hostPhone = (form.get("hostPhone") as string)?.trim() || null;
    const logo = form.get("logo") as File | null;

    // 1. Validate
    if (!name || !slug) return NextResponse.json({ error: "Name and slug are required" }, { status: 400 });
    if (!/^[a-z0-9-]+$/.test(slug)) return NextResponse.json({ error: "Slug must be lowercase letters, numbers, hyphens" }, { status: 400 });
    if (!enabledModules.length) return NextResponse.json({ error: "Pick at least one module" }, { status: 400 });
    if (!hostEmail) return NextResponse.json({ error: "Client email is required" }, { status: 400 });

    const existing = await sanityClient.fetch<{ _id: string } | null>(
      `*[_type == "partner" && slug.current == $slug][0]{ _id }`, { slug }
    );
    if (existing) return NextResponse.json({ error: `A partner with slug "${slug}" already exists` }, { status: 409 });

    if (listingId) {
      const listing = await sanityClient.fetch<{ _id: string; partner?: unknown } | null>(
        `*[_type == "listing" && _id == $id][0]{ _id, partner }`, { id: listingId }
      );
      if (!listing) return NextResponse.json({ error: "Listing not found" }, { status: 400 });
      if (listing.partner) return NextResponse.json({ error: "That listing is already assigned to a partner" }, { status: 409 });
    }

    // 2. Logo upload (optional)
    let logoField: Record<string, unknown> | undefined;
    if (logo && logo.size > 0) {
      const buffer = Buffer.from(await logo.arrayBuffer());
      const asset = await sanityWriteClient.assets.upload("image", buffer, { filename: logo.name });
      logoField = { _type: "image", asset: { _type: "reference", _ref: asset._id } };
      steps.push("logo-uploaded");
    }

    // 3. Create the partner doc
    const partner = await sanityWriteClient.create({
      _type: "partner",
      name,
      slug: { _type: "slug", current: slug },
      domains: domain ? [domain] : [],
      ...(logoField ? { logo: logoField } : {}),
      poweredByKlickenya: true,
      ...(colorPrimary ? { colorPrimary } : {}),
      ...(colorAccent ? { colorAccent } : {}),
      ...(colorDark ? { colorDark } : {}),
      ...(fontDisplay ? { fontDisplay } : {}),
      ...(fontBody ? { fontBody } : {}),
      enabledModules,
      allowedListingTypes,
    });
    steps.push("partner-created");

    // 4. Assign the listing
    if (listingId) {
      await sanityWriteClient.patch(listingId)
        .set({ partner: { _type: "reference", _ref: partner._id } })
        .commit();
      steps.push("listing-assigned");
    }

    // 5. Host (create new, or link existing) + partner_id  ← LAST (most consequential)
    const { data: existingHost } = await adminClient
      .from("host_profiles").select("id").eq("email", hostEmail).maybeSingle();
    if (existingHost) {
      await adminClient.from("host_profiles").update({ partner_id: slug }).eq("id", existingHost.id);
      steps.push("host-linked");
    } else {
      await createHostAccount({ name: hostName, email: hostEmail, phone: hostPhone, partnerId: slug });
      steps.push("host-created");
    }

    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://klickenya.com";
    return NextResponse.json({
      success: true,
      partnerId: partner._id,
      slug,
      storefrontUrl: `${siteUrl}/w/${slug}`,
      domain: domain || null,
      steps,
    }, { status: 201 });
  } catch (err) {
    console.error("[admin/partners POST] error:", err);
    return NextResponse.json(
      { error: "Partner creation failed partway — completed steps: " + (steps.join(", ") || "none"), steps },
      { status: 500 }
    );
  }
}
```
Notes for the implementer:
- Confirm `assertAdmin` + `AdminAuthError` are exported from `apps/web/lib/admin/auth.ts` (the Explore map says yes). If `AdminAuthError` isn't exported, catch generically and return 403.
- `createHostAccount` sends the welcome email with the temp password — that's the client's login.

- [ ] **Step 2: Verify** `rm -rf apps/web/.next && pnpm --filter @klickenya/web exec tsc --noEmit && pnpm build` → exit 0 / success.
- [ ] **Step 3: Commit** `git add apps/web/app/api/admin/partners/route.ts && git commit -m "feat(admin): POST /api/admin/partners — create-partner orchestration (logo, doc, listing, host+partner_id)"`

---

## Task 4: `PATCH /api/admin/partners/[id]` — edit

**Files:** Create `apps/web/app/api/admin/partners/[id]/route.ts`

- [ ] **Step 1: Create the route** — admin-gated; accepts multipart (logo optional); patches the partner doc fields (name, colors, fonts, enabledModules, allowedListingTypes, domains). Does NOT touch the host account. If a new listing is chosen, unassign the old one (`patch(oldListingId).unset(["partner"])`) and assign the new one. Mirror Task 3's parsing + the `sanityWriteClient.patch(id).set({...}).commit()` pattern; only set fields that were provided.
```ts
import { NextRequest, NextResponse } from "next/server";
import { assertAdmin, AdminAuthError } from "@/lib/admin/auth";
import { sanityWriteClient } from "@/lib/sanity/writeClient";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try { await assertAdmin(req); } catch (e) {
    const status = e instanceof AdminAuthError ? e.status : 401;
    return NextResponse.json({ error: "Unauthorized" }, { status });
  }
  const { id } = await params;
  try {
    const form = await req.formData();
    const set: Record<string, unknown> = {};
    const str = (k: string) => { const v = (form.get(k) as string)?.trim(); if (v) set[k] = v; };
    str("name"); str("colorPrimary"); str("colorAccent"); str("colorDark"); str("fontDisplay"); str("fontBody");
    const modules = form.get("enabledModules") as string | null;
    if (modules) set.enabledModules = JSON.parse(modules);
    const allowed = form.get("allowedListingTypes") as string | null;
    if (allowed) set.allowedListingTypes = JSON.parse(allowed);
    const domain = (form.get("domain") as string)?.trim().toLowerCase();
    if (domain) set.domains = [domain];

    const logo = form.get("logo") as File | null;
    if (logo && logo.size > 0) {
      const asset = await sanityWriteClient.assets.upload("image", Buffer.from(await logo.arrayBuffer()), { filename: logo.name });
      set.logo = { _type: "image", asset: { _type: "reference", _ref: asset._id } };
    }
    await sanityWriteClient.patch(id).set(set).commit();
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[admin/partners PATCH] error:", err);
    return NextResponse.json({ error: "Update failed" }, { status: 500 });
  }
}
```

- [ ] **Step 2: Verify** `pnpm --filter @klickenya/web exec tsc --noEmit` → exit 0.
- [ ] **Step 3: Commit** `git add apps/web/app/api/admin/partners/[id]/route.ts && git commit -m "feat(admin): PATCH /api/admin/partners/[id] — edit partner branding"`

---

## Task 5: Admin UI — list, form, pages, nav

**Files:**
- Create `apps/web/app/admin/partners/page.tsx`
- Create `apps/web/app/admin/partners/_components/PartnerForm.tsx`
- Create `apps/web/app/admin/partners/new/page.tsx`
- Create `apps/web/app/admin/partners/[id]/edit/page.tsx`
- Modify `apps/web/app/admin/layout.tsx`

READ `apps/web/app/admin/hosts/page.tsx` + `apps/web/app/admin/hosts/CreateHostModal.tsx` first to match the admin page + client-form patterns (Tailwind tokens, button styles, error/success UI, `router.refresh()`).

- [ ] **Step 1: List page** `apps/web/app/admin/partners/page.tsx` — server component: `sanityClient.fetch(ADMIN_PARTNERS_QUERY)`; render a table (name, slug, brand swatch from logoUrl/colors, domains, a clickable `${NEXT_PUBLIC_SITE_URL}/w/<slug>` link, listingCount), an "Edit" link per row, and a "+ Create Partner Site" link to `/admin/partners/new`. Follow the styling of `admin/hosts/page.tsx`.

- [ ] **Step 2: PartnerForm** `apps/web/app/admin/partners/_components/PartnerForm.tsx` — `"use client"`. Props: `{ mode: "create" | "edit"; partner?: {...}; listings: {_id,title,city,type}[]; }`. Controlled inputs for name, slug (auto-slugify from name in create mode), 3 color inputs (`type="color"`), 2 font text inputs, enabledModules checkboxes, allowedListingTypes checkboxes, a listing `<select>` (from `listings`), client email + name + phone (create mode only), domain (optional), and a logo `<input type="file" accept="image/*">`. On submit build a `FormData` (append each field; `enabledModules`/`allowedListingTypes` as `JSON.stringify`; append the logo File if chosen) and `fetch` to `POST /api/admin/partners` (create) or `PATCH /api/admin/partners/[id]` (edit) with NO `Content-Type` header (let the browser set the multipart boundary). On success show the returned `storefrontUrl` as a clickable link + any domain instructions, then `router.refresh()`. Show `error` on failure. Min 16px inputs (CLAUDE.md iOS rule).

- [ ] **Step 3: New page** `apps/web/app/admin/partners/new/page.tsx` — server component: fetch `UNASSIGNED_LISTINGS_QUERY` via `sanityClient`, then cross-reference Supabase to keep only listings that have a **published menu** (so the storefront works): fetch `adminClient.from("menus").select("listing_slug").eq("is_published", true)`, build a Set of slugs, filter the listings to those whose slug is in the set. Pass the filtered list to `<PartnerForm mode="create" listings={...} />`. (If the menu cross-check returns empty, still pass the listings but the form notes "no restaurant listings with a published menu yet".)

- [ ] **Step 4: Edit page** `apps/web/app/admin/partners/[id]/edit/page.tsx` — server component: `const { id } = await params;` fetch `ADMIN_PARTNER_BY_ID_QUERY` + the unassigned listings (plus the currently-assigned one). Render `<PartnerForm mode="edit" partner={...} listings={...} />`.

- [ ] **Step 5: Nav link** In `apps/web/app/admin/layout.tsx`, add a sidebar nav link to `/admin/partners` labelled "Partners" (match the existing admin nav-item markup/styling).

- [ ] **Step 6: Verify** `rm -rf apps/web/.next && pnpm --filter @klickenya/web exec tsc --noEmit && pnpm build` → exit 0 / success; `/admin/partners`, `/admin/partners/new`, `/admin/partners/[id]/edit` in the route manifest.

- [ ] **Step 7: Commit** `git add apps/web/app/admin/partners apps/web/app/admin/layout.tsx && git commit -m "feat(admin): /admin/partners list + create/edit Partner Site form + nav"`

---

## Task 6: Final verification + review + e2e

- [ ] **Step 1: Full gate** `rm -rf apps/web/.next && pnpm --filter @klickenya/web exec tsc --noEmit && pnpm build && pnpm build:studio`; lint grep for the new files (no new errors).

- [ ] **Step 2: Manual e2e**
  1. `pnpm dev`, log in as **admin**, go to `/admin/partners` → "+ Create Partner Site".
  2. Fill name (e.g. "Tandoori"), slug `tandoori`, brand colors, upload a logo, modules = restaurant, pick a restaurant listing (one with a published menu), client email, optional domain. Submit.
  3. Expect: success with a clickable `…/w/tandoori` link; in Sanity a new `partner` doc with the logo + the listing's `partner` set; in Supabase a new (or linked) `host_profiles` row with `partner_id = "tandoori"`; the client receives the welcome email.
  4. Visit `…/w/tandoori` → the branded storefront renders (proves the whole loop).
  5. Edit the partner (change a color) → storefront re-skins.

- [ ] **Step 3: Code review** over the diff. Focus: the host-creation extraction didn't change the existing route's behavior; the orchestration's step ordering + partial-failure reporting; multipart parsing + logo upload; `partner_id` set correctly; admin auth on both routes; duplicate-slug + already-assigned-listing guards; no secrets/write client leaked to a client component.

- [ ] **Step 4: Tag complete** `git commit --allow-empty -m "chore(admin): Create Partner Site complete"`

---

## What this delivers
From `klickenya.com/admin/partners`, an operator fills one form and gets a live branded restaurant storefront at `/w/<slug>` (or their custom domain) — partner doc, logo, listing assignment, and client login all created in one action. Plan 1's `host_profiles.partner_id` gets its first consumer.

## What it does NOT do (later)
- Author the restaurant listing or menu (existing flows); the dropdown only offers listings that already have a published menu.
- Programmatic Vercel domain provisioning (manual instructions; needs a Vercel token).
- Partner deletion/offboarding; non-restaurant templates; dashboard branding.
