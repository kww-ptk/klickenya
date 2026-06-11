# Admin "Create Partner Site" — Design

**Date:** 2026-06-11
**Status:** Approved design, pending implementation plan
**Author:** Patrik Giuliana (with Claude)

## 1. Purpose

Turn the manual white-label onboarding checklist (Sanity Studio + `/admin` + Vercel) into a **single admin action**. From `klickenya.com/admin`, an operator creates a partner, brands it, links the client's restaurant listing, creates the client's host login, and gets a live `klickenya.com/w/<slug>` storefront — without touching Sanity Studio.

This consumes work already shipped: the `partner` Sanity doc (Plan 1), `host_profiles.partner_id` (Plan 1, still unused until now), the live `/w/<slug>` + custom-domain storefront, and the existing admin host-creation flow.

## 2. Surface — `/admin/partners`

A new admin section (admin-only, via the existing admin auth/layout):

| Route | What it is |
|---|---|
| `/admin/partners` | List: name, slug, brand swatch, domains, live `/w/<slug>` link, linked listing + host. |
| `/admin/partners/new` | Create form (one screen). |
| `/admin/partners/[id]/edit` | Edit form (same shared form component, pre-filled). |

## 3. The form (create + edit share one component)

- **Identity:** name; slug (auto-derived from name, editable); enabled modules (checkboxes, `restaurant` default).
- **Branding:** primary / accent / dark colors (color inputs), display + body font names, **logo upload**.
- **Client:** the client's email → creates a host login; OR pick an existing host. Plus **pick the restaurant listing** from a dropdown of published listings not yet assigned to any partner.
- **Domain (optional):** a custom domain field (stored on the partner; manual Vercel/DNS setup — see §6).

## 4. Orchestration — `POST /api/admin/partners`

Admin-only server route. On create it performs, in order, reporting which steps succeeded:

1. **Validate** — required fields; slug unique (no existing `partner` with that slug); chosen listing exists, is published, and is unassigned.
2. **Logo** — if a file was uploaded, upload it to Sanity as an image asset (`sanityWriteClient.assets.upload`), keep the asset ref.
3. **Create the `partner` doc** in Sanity (write token): identity, slug, theme tokens, logo ref, `enabledModules`, `domains` (the custom domain if given), `poweredByKlickenya: true`.
4. **Assign the listing** — patch the chosen Sanity `listing` to set `partner` = the new partner ref.
5. **Host login** — create a new host account via the existing host-creation flow (Supabase auth user + `host_profiles` + `welcomeNNN` temp password + welcome email), OR link the chosen existing host. Set `host_profiles.partner_id = <partner slug>` (the Plan 1 column).
6. **Return** the live `klickenya.com/w/<slug>` link + (if a custom domain was given) the Vercel/DNS instructions.

Edit (`PATCH`) updates the partner doc + listing/host links; it does not re-create the host.

## 5. Reuses (little net-new infra)

- `partner` Sanity schema + `getPartnerBySlug` + the `/w/<slug>` storefront — all already live.
- The existing **admin host-creation** path (`/api/admin/hosts/create`) — reuse its account-creation logic rather than reinventing temp passwords / welcome emails.
- `SANITY_WRITE_TOKEN` — already used for blog seeding and claim-approval Sanity writes.
- `host_profiles.partner_id` — added in Plan 1 specifically for this linkage; this is its first consumer.

## 6. Confirmed v1 decisions

1. **Assigns an existing listing** — the wizard does NOT author the restaurant listing or its menu. Those use the existing listing/menu builders; the client builds the menu in their dashboard. The form's listing dropdown lists published listings with no partner yet.
2. **Custom domain is manual** — the domain is saved to `partner.domains[]` and the success screen shows "add this domain in Vercel + point DNS here" steps. Programmatic Vercel-API domain provisioning is a later add-on (needs `VERCEL_API_TOKEN` + project id). `/w/<slug>` works immediately regardless.
3. **Logo upload** — uploaded to Sanity from the form via the asset API.
4. **Create + edit + list** — all three in v1, create/edit sharing one form.

## 7. Error handling

The orchestration touches Sanity (partner doc, listing patch, logo) and Supabase (host account, `partner_id`). It is not a single transaction, so:
- Steps run in the §4 order; if a step fails, the route returns a structured result naming which steps **did** complete, so the operator can fix and retry rather than guessing.
- Creating a partner with a duplicate slug is rejected up front (step 1) before any writes.
- Listing assignment is the cheapest to reverse; host creation is the most consequential — so host creation runs LAST, after the partner doc + listing are in place.

## 8. Out of scope (v1)

- Authoring the restaurant listing or its menu (existing flows).
- Programmatic Vercel custom-domain provisioning (manual instructions in v1).
- Dashboard white-labeling / nav-gating / admin-domain auth / partner-aware host emails (the deferred dashboard-branding plan).
- Non-restaurant partner templates (stay/tours) — restaurant only for now.
- Partner deletion / offboarding flow (add later if needed).
