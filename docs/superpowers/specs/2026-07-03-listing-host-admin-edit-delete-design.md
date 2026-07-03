# Host & Admin Edit / Delete for Listings & Events — Design

Date: 2026-07-03
Status: Approved (design)

## Problem

Hosts have **no way** to edit or delete their live listings or events. The host
dashboard listing/event pages are read-only. Admins can only click "Edit in
Sanity" (Studio) — there is no in-app edit or delete. Content lives in Sanity;
transactions in Supabase.

## Goals

- Hosts can **edit** and **delete** (= archive) their own live listings and events.
- Admins can **edit**, **archive**, and **permanently delete** any listing/event.
- Reuse the existing field surface (no new schema, no field drift).
- Do not destroy rich content (Photo Rows) or orphan Supabase records.

## Non-goals

- Editing Studio-only nested arrays (rooms[], ticketTypes[], performers[],
  schedule[], menu[], highlights[], pricingTable[]) — these remain Studio-managed
  and are **preserved untouched** by app edits.
- Rich portable-text editing (custom blocks) in-app — stays in Studio.

## Architecture

### Shared editor component
Extract the existing admin new-listing form
(`apps/web/app/admin/listings/new/page.tsx`) into a reusable client component
`apps/web/components/listings/ListingEditor.tsx`, driven by props:

- `mode: "create" | "edit"`
- `role: "admin" | "host"`
- `initialValues?: ListingFormValues` (edit)
- `listingId?: string` (edit)
- `onSuccessRedirect: string`

The form already contains every type-specific section (stay renting type,
restaurant, experience, event, service), photos (`ImageUploader`), amenities,
tags, contact, SEO, host assignment. This IS the full-parity surface.

Reused by: admin create (existing behaviour), admin edit (new), host edit (new).

`role` gating:
- **host**: slug locked (read-only), host-assignment hidden, verification hidden,
  status control replaced by publish/unpublish semantics.
- **admin**: full control — editable slug (uniqueness excludes self), host
  assignment, status.

### Endpoints (server-side, `sanityWriteClient`)

| Endpoint | Who | Action |
|---|---|---|
| `PATCH /api/dashboard/listings/[id]` | host (ownership) | edit own listing/event |
| `POST /api/dashboard/listings/[id]/archive` | host | archive (host "delete") |
| `PATCH /api/admin/listings/[id]` | admin | edit any |
| `POST /api/admin/listings/[id]/archive` | admin | archive/unpublish |
| `DELETE /api/admin/listings/[id]` | admin | permanent hard-delete |

- Host ownership: existing 3-path check (`hostId == user.id` OR
  `host._ref == host_profile.sanity_host_id` OR listing in host's `listings[]`).
- Admin: `assertAdmin(req)`.
- Shared Zod schema + field→Sanity mapping factored out of the current
  `POST /api/admin/listings/route.ts` so create and edit stay in lockstep.

### Data-safety rules

1. **Description preservation.** On load, convert the doc's portable-text
   description to plain text ONLY if every block is a plain `block` (no custom
   `_type`). If it contains rich/custom blocks (Photo Row, tip card, etc.), the
   textarea renders read-only with the note "Rich description — edit in Sanity
   Studio", and `description` is **omitted from the PATCH** so it is preserved.
   Plain descriptions remain fully editable; on save they are written back as a
   single portable-text block (same as create).
2. **Photos round-trip.** Existing Sanity photos (`{_type:image, asset:{_ref}, alt}`)
   pre-fill the `ImageUploader` (`{assetId, url, alt}`); mapped back on save. Add /
   remove / reorder supported without loss.
3. **Slug.** Locked for hosts. Editable for admins; uniqueness check excludes the
   current `_id`.
4. **PATCH only sends known scalar fields.** Nested arrays and unknown fields are
   never touched, so Studio-managed content survives edits.

### Delete semantics

- **Host "Delete"** = archive → `status: "archived"`. Off marketplace instantly,
  recoverable, Supabase records intact. Confirm dialog.
- **Admin** = Archive (soft) **and** permanent Delete (typed confirmation).
  Existing "Edit in Sanity" link retained for rich-content edits.

### Events (dual storage)

An event is a Sanity `listing` (type=`event`) AND a Supabase `events_pending`
row. Event edit/archive/delete performs the Sanity write AND syncs the matching
`events_pending` row in the same handler:
- edit → update mirrored fields on the `events_pending` row
- archive → mark the row archived/unpublished
- hard-delete → delete the row

The matching row is located by its stored Sanity listing id (verified during
implementation planning).

### UI entry points

- **Host:** "Edit" + "Delete" (archive) on each card in
  `apps/web/app/dashboard/listings/page.tsx` and
  `apps/web/app/dashboard/events/page.tsx`; new route
  `apps/web/app/dashboard/listings/[id]/edit/page.tsx`.
- **Admin:** "Edit" + "Delete" actions in `apps/web/app/admin/listings/page.tsx`;
  new route `apps/web/app/admin/listings/[id]/edit/page.tsx`.

## Error handling

- 401 (unauthenticated), 403 (not owner / not admin), 404 (listing not found),
  409 (slug collision on admin edit), 400 (Zod validation), 500 (write failure).
- Client surfaces the endpoint error message inline (matching existing form UX).
- Archive/delete confirm dialogs prevent accidental destructive actions.

## Testing / verification

- Type + lint clean.
- Manual (on preview, since Sanity is unreachable in the build sandbox): host
  edits own listing (denied on others'), host archive removes from marketplace,
  admin edit + hard-delete, event edit keeps `events_pending` in sync, editing a
  listing with a rich description leaves its Photo Row intact.

## Open items to confirm during planning

- `events_pending` linkage column to Sanity id and its editable columns.
- `ImageUploader` value shape and whether it accepts pre-existing images.
- Whether host status control should expose draft, or only publish/unpublish.
