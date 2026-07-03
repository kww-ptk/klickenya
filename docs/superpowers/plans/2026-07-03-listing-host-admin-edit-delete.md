# Host & Admin Edit / Delete for Listings & Events — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let hosts edit and archive their own listings/events, and let admins edit, archive, and permanently delete any listing/event — all in-app, reusing the existing form.

**Architecture:** Extract the admin new-listing form into a shared `ListingEditor` client component driven by `mode`/`role`/`initialValues`. Add PATCH/archive/delete API routes that write to Sanity via the existing `sanityWriteClient`, guard by ownership (host) or `assertAdmin` (admin), keep the `events_pending` Supabase mirror in sync for events, and never clobber rich descriptions or Studio-managed arrays.

**Tech Stack:** Next.js 15 App Router, Sanity (`next-sanity`), Supabase (`@supabase/ssr`, service-role admin client), Zod v4, Tailwind. No unit-test framework exists — **verification per task = `cd apps/web && npx tsc --noEmit` and `npx eslint <files>`**, plus manual preview checks at the end (Sanity is unreachable in the build sandbox).

**Reference (read before starting):**
- Spec: `docs/superpowers/specs/2026-07-03-listing-host-admin-edit-delete-design.md`
- Existing create form: `apps/web/app/admin/listings/new/page.tsx`
- Existing create route + Sanity mapping: `apps/web/app/api/admin/listings/route.ts`
- Write client: `apps/web/lib/sanity/writeClient.ts` (`sanityWriteClient`)
- Admin auth: `apps/web/lib/admin/auth.ts` (`assertAdmin`, `AdminAuthError`)
- Dashboard auth: `apps/web/app/dashboard/_lib/auth.ts` (`getAuthUser`, `getHostProfile`, `getIsAdmin`)
- Image uploader: `apps/web/components/shared/ImageUploader.tsx` (`UploadedImage = {assetId,url,alt}`)
- Events create + `events_pending` shape: `apps/web/app/api/dashboard/events/create/route.ts`
  (`events_pending`: `sanity_event_id`, `host_id`, `title`, `city`, `status`, `is_new_host`)
- Read-side query fragment for image URLs: `IMAGE_FIELDS` in `apps/web/lib/sanity/queries.ts`

Work happens on branch `feat/listing-host-admin-edit-delete` (already created off `dev`). Commit after each task.

---

## Task 1: Shared listing field library (schema, types, mappings, data-safety helpers)

Single source of truth for the form ⇆ Sanity conversion, reused by create + edit + all endpoints.

**Files:**
- Create: `apps/web/lib/listings/listingFields.ts`

- [ ] **Step 1: Create the library with the Zod schema, form type, and mapping helpers**

```typescript
// apps/web/lib/listings/listingFields.ts
import { z } from "zod/v4";
import type { UploadedImage } from "@/components/shared/ImageUploader";

/* ── Validation schema (superset used by create + edit) ── */
export const uploadedImageSchema = z.object({
  assetId: z.string(),
  url: z.string(),
  alt: z.string(),
});

export const listingInputSchema = z.object({
  title: z.string().min(2),
  slug: z.string().min(2).regex(/^[a-z0-9-]+$/, "Slug must be lowercase letters, numbers, and hyphens only"),
  type: z.string().min(1),
  subcategory: z.string().optional(),
  city: z.string().min(1),
  county: z.string().optional(),
  address: z.string().optional(),
  status: z.enum(["draft", "published", "archived"]),
  // description is a plain-text string here; converted to portable text on write.
  // `descriptionLocked` = true means the doc has rich blocks; omit description on write.
  description: z.string().optional(),
  descriptionLocked: z.boolean().optional(),
  price: z.number().min(0).optional(),
  priceUnit: z.string().optional(),
  bookingType: z.string().optional(),
  maxGuests: z.number().int().min(1).optional(),
  rentingType: z.string().optional(),
  website: z.string().optional(),
  instagram: z.string().optional(),
  facebook: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email().optional().or(z.literal("")),
  notificationEmail: z.string().email().optional().or(z.literal("")),
  notificationEmail2: z.string().email().optional().or(z.literal("")),
  hostEmail: z.string().email().optional().or(z.literal("")),
  amenities: z.array(z.string()).optional(),
  tags: z.array(z.string()).optional(),
  photos: z.array(uploadedImageSchema).optional(),
  photoConsent: z.enum(["yes_all", "yes_logo_only", "no"]).optional(),
  cuisine: z.array(z.string()).optional(),
  priceRange: z.string().optional(),
  openingHours: z.string().optional(),
  atmosphere: z.string().optional(),
  reservationRequired: z.boolean().optional(),
  duration: z.string().optional(),
  maxGroupSize: z.number().int().min(1).optional(),
  difficulty: z.string().optional(),
  minAge: z.number().int().min(0).optional(),
  languages: z.array(z.string()).optional(),
  meetingPoint: z.string().optional(),
  eventDate: z.string().optional(),
  eventEndDate: z.string().optional(),
  venue: z.string().optional(),
  ageRestriction: z.string().optional(),
  dresscode: z.string().optional(),
  venueAddress: z.string().optional(),
  doorsOpen: z.string().optional(),
  isFree: z.boolean().optional(),
  priceFrom: z.number().min(0).optional(),
  ticketLink: z.string().optional(),
  organizer: z.string().optional(),
  serviceArea: z.string().optional(),
  responseTime: z.string().optional(),
  providerInfo: z.string().optional(),
  seoTitle: z.string().optional(),
  seoDescription: z.string().optional(),
  submissionSource: z.string().optional(),
});

export type ListingInput = z.infer<typeof listingInputSchema>;

/* ── Client-side form state shape (all strings, for controlled inputs) ── */
export interface ListingFormValues {
  title: string; slug: string; type: string; subcategory: string; city: string; county: string; address: string;
  status: "draft" | "published" | "archived"; description: string; descriptionLocked: boolean;
  price: string; priceUnit: string; bookingType: string; maxGuests: string; rentingType: string;
  website: string; instagram: string; facebook: string; phone: string; email: string;
  notificationEmail: string; notificationEmail2: string; hostEmail: string;
  amenities: string[]; tags: string[]; photos: UploadedImage[]; photoConsent: string;
  cuisine: string[]; priceRange: string; openingHours: string; atmosphere: string; reservationRequired: boolean;
  duration: string; maxGroupSize: string; difficulty: string; minAge: string; languages: string[]; meetingPoint: string;
  eventDate: string; eventEndDate: string; venue: string; ageRestriction: string; dresscode: string;
  venueAddress: string; doorsOpen: string; isFree: boolean; priceFrom: string; ticketLink: string; organizer: string;
  serviceArea: string; responseTime: string; providerInfo: string;
  seoTitle: string; seoDescription: string;
}

export const emptyListingForm: ListingFormValues = {
  title: "", slug: "", type: "stay", subcategory: "", city: "", county: "", address: "",
  status: "draft", description: "", descriptionLocked: false,
  price: "", priceUnit: "night", bookingType: "contact_form", maxGuests: "", rentingType: "entire_place",
  website: "", instagram: "", facebook: "", phone: "", email: "",
  notificationEmail: "", notificationEmail2: "", hostEmail: "",
  amenities: [], tags: [], photos: [], photoConsent: "",
  cuisine: [], priceRange: "", openingHours: "", atmosphere: "", reservationRequired: false,
  duration: "", maxGroupSize: "", difficulty: "", minAge: "", languages: [], meetingPoint: "",
  eventDate: "", eventEndDate: "", venue: "", ageRestriction: "", dresscode: "",
  venueAddress: "", doorsOpen: "", isFree: false, priceFrom: "", ticketLink: "", organizer: "",
  serviceArea: "", responseTime: "", providerInfo: "",
  seoTitle: "", seoDescription: "",
};

/* ── Portable-text description helpers (data-safety) ── */
const rnd = () => Math.random().toString(36).slice(2, 10);

/** A description is "plain" (safe to edit as text) only if every block is a
 *  vanilla `block` with normal style and no marks — i.e. no Photo Rows, tip
 *  cards, headings, links, etc. Empty description also counts as plain. */
export function isPlainDescription(desc: unknown): boolean {
  if (!desc) return true;
  if (!Array.isArray(desc)) return false;
  return desc.every((b) => {
    if (!b || typeof b !== "object") return false;
    const block = b as Record<string, unknown>;
    if (block._type !== "block") return false;
    if (block.style && block.style !== "normal") return false;
    if (Array.isArray(block.markDefs) && block.markDefs.length > 0) return false;
    const children = (block.children as Array<Record<string, unknown>>) ?? [];
    return children.every((c) => c._type === "span" && (!Array.isArray(c.marks) || c.marks.length === 0));
  });
}

/** Join plain portable-text blocks into a textarea string (paragraph per block). */
export function descriptionToText(desc: unknown): string {
  if (!Array.isArray(desc)) return "";
  return desc
    .map((b) => {
      const children = ((b as Record<string, unknown>).children as Array<{ text?: string }>) ?? [];
      return children.map((c) => c.text ?? "").join("");
    })
    .join("\n\n")
    .trim();
}

/** Convert textarea text back into portable-text blocks (one block per paragraph). */
export function textToDescription(text: string) {
  const paras = text.split(/\n{2,}/).map((p) => p.trim()).filter(Boolean);
  const source = paras.length ? paras : [text.trim()].filter(Boolean);
  return source.map((p) => ({
    _type: "block" as const,
    _key: rnd(),
    style: "normal",
    markDefs: [],
    children: [{ _type: "span" as const, _key: rnd(), text: p, marks: [] }],
  }));
}

/* ── Photo mapping ── */
export function uploadedToSanityPhotos(photos?: UploadedImage[], fallbackAlt = "") {
  if (!photos?.length) return undefined;
  return photos.map((p) => ({
    _type: "image" as const,
    _key: rnd(),
    asset: { _type: "reference" as const, _ref: p.assetId },
    alt: p.alt || fallbackAlt,
  }));
}

/** Map read-side Sanity photos (asset->{_id,url}) into UploadedImage[] for the uploader. */
export function sanityPhotosToUploaded(
  photos?: Array<{ asset?: { _id?: string; url?: string }; alt?: string }>,
): UploadedImage[] {
  if (!photos?.length) return [];
  return photos
    .filter((p) => p.asset?._id && p.asset?.url)
    .map((p) => ({ assetId: p.asset!._id!, url: p.asset!.url!, alt: p.alt ?? "" }));
}

/* ── Form values → Sanity patch object (scalar fields only) ── */
/** Builds the `set` object for a Sanity patch/create from validated input.
 *  Omits `description` entirely when `descriptionLocked` so rich content is preserved.
 *  Returns only defined scalar fields — never touches nested Studio arrays. */
export function inputToSanityFields(data: ListingInput) {
  const isStay = data.type === "stay";
  const isRestaurant = data.subcategory === "restaurants";
  const isExperience = data.type === "experience" && !isRestaurant;
  const isEvent = data.type === "event";
  const isService = data.type === "service";

  const fields: Record<string, unknown> = {
    title: data.title,
    slug: { _type: "slug", current: data.slug },
    type: data.type,
    subcategory: data.subcategory || undefined,
    city: data.city,
    county: data.county || undefined,
    address: data.address || undefined,
    status: data.status,
    price: data.price ?? undefined,
    priceUnit: data.priceUnit || undefined,
    bookingType: data.bookingType || undefined,
    maxGuests: data.maxGuests ?? undefined,
    rentingType: isStay ? data.rentingType || undefined : undefined,
    website: data.website || undefined,
    instagram: data.instagram || undefined,
    facebook: data.facebook || undefined,
    phone: data.phone || undefined,
    email: data.email || undefined,
    notificationEmail1: data.notificationEmail || undefined,
    notificationEmail2: data.notificationEmail2 || undefined,
    amenities: data.amenities?.length ? data.amenities : undefined,
    tags: data.tags?.length ? data.tags : undefined,
    photos: uploadedToSanityPhotos(data.photos, data.title),
    cuisine: isRestaurant && data.cuisine?.length ? data.cuisine : undefined,
    priceRange: isRestaurant ? data.priceRange || undefined : undefined,
    openingHours: isRestaurant ? data.openingHours || undefined : undefined,
    atmosphere: isRestaurant ? data.atmosphere || undefined : undefined,
    reservationRequired: isRestaurant ? data.reservationRequired ?? undefined : undefined,
    duration: isExperience ? data.duration || undefined : undefined,
    maxGroupSize: isExperience ? data.maxGroupSize ?? undefined : undefined,
    difficulty: isExperience ? data.difficulty || undefined : undefined,
    minAge: isExperience ? data.minAge ?? undefined : undefined,
    languages: isExperience && data.languages?.length ? data.languages : undefined,
    meetingPoint: isExperience ? data.meetingPoint || undefined : undefined,
    eventDate: isEvent ? data.eventDate || undefined : undefined,
    eventEndDate: isEvent ? data.eventEndDate || undefined : undefined,
    venue: isEvent ? data.venue || undefined : undefined,
    ageRestriction: isEvent ? data.ageRestriction || undefined : undefined,
    dresscode: isEvent ? data.dresscode || undefined : undefined,
    venueAddress: isEvent ? data.venueAddress || undefined : undefined,
    doorsOpen: isEvent ? data.doorsOpen || undefined : undefined,
    isFree: isEvent ? data.isFree ?? undefined : undefined,
    priceFrom: isEvent ? data.priceFrom ?? undefined : undefined,
    ticketLink: isEvent ? data.ticketLink || undefined : undefined,
    organizer: isEvent ? data.organizer || undefined : undefined,
    serviceArea: isService ? data.serviceArea || undefined : undefined,
    responseTime: isService ? data.responseTime || undefined : undefined,
    providerInfo: isService ? data.providerInfo || undefined : undefined,
    seoTitle: data.seoTitle || undefined,
    seoDescription: data.seoDescription || undefined,
  };

  if (!data.descriptionLocked) {
    fields.description = data.description ? textToDescription(data.description) : undefined;
  }

  return fields;
}
```

- [ ] **Step 2: Verify types compile**

Run: `cd apps/web && npx tsc --noEmit`
Expected: exit 0, no errors referencing `listingFields.ts`.

- [ ] **Step 3: Lint**

Run: `cd apps/web && npx eslint lib/listings/listingFields.ts`
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add apps/web/lib/listings/listingFields.ts
git commit -m "feat(listings): shared field schema + form⇆Sanity mapping helpers"
```

---

## Task 2: Extract the shared `ListingEditor` component

Move the admin new-listing form body into a reusable component so create + edit share one form.

**Files:**
- Create: `apps/web/components/listings/ListingEditor.tsx`
- Modify: `apps/web/app/admin/listings/new/page.tsx` (replace body with `<ListingEditor>`)

- [ ] **Step 1: Create `ListingEditor.tsx`** by moving the entire form + constants + helper components (`Field`, `Input`, `Select`, `SectionCard`, `Chips`, `AiHighlight`, all `*_OPTIONS` consts, `makeSlug`, `wordCount`) out of `admin/listings/new/page.tsx` into this component. Change the top of the file to accept props and initialize state from them:

```typescript
"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { SUBCATEGORIES_BY_TYPE, SUBCATEGORY_LABELS } from "@/lib/constants/subcategories";
import { KENYAN_COUNTIES, AMENITIES, TAG_SUGGESTIONS, TAG_SUGGESTIONS_BY_TYPE, DEFAULT_PRICE_UNIT_BY_TYPE } from "@/lib/constants/listing";
import { ImageUploader } from "@/components/shared/ImageUploader";
import { emptyListingForm, type ListingFormValues } from "@/lib/listings/listingFields";

interface ListingEditorProps {
  mode: "create" | "edit";
  role: "admin" | "host";
  initialValues?: ListingFormValues;
  listingId?: string;
  /** where to go on success */
  onSuccessRedirect: string;
  /** heading + submit label overrides */
  heading: string;
  backHref: string;
}

export function ListingEditor({ mode, role, initialValues, listingId, onSuccessRedirect, heading, backHref }: ListingEditorProps) {
  const router = useRouter();
  const [form, setForm] = useState<ListingFormValues>(initialValues ?? emptyListingForm);
  // ...move the rest of the existing state + handlers here unchanged...
}
```

Key behavioural changes to make while moving (everything else copied verbatim):

  1. **Type change locked in edit.** In edit mode the `type` selector buttons render disabled and the type-reset `useEffect` (the one keyed on `[form.type]` that clears subcategory/priceUnit) must NOT run on first mount. Guard it:

  ```typescript
  const [typeInitialized, setTypeInitialized] = useState(mode === "create");
  useEffect(() => {
    if (!typeInitialized) { setTypeInitialized(true); return; }
    set("subcategory", "");
    set("priceUnit", DEFAULT_PRICE_UNIT_BY_TYPE[form.type] ?? "night");
    setShowAllTags(false); setAiApplied([]); setAiFieldsApplied(new Set());
  }, [form.type]); // eslint-disable-line react-hooks/exhaustive-deps
  ```
  Also disable each type button with `disabled={mode === "edit"}` and add `disabled:opacity-60 disabled:cursor-not-allowed`.

  2. **Auto-slug only in create.** Guard the auto-slug effect: `if (mode === "create" && !slugManuallyEdited) set("slug", makeSlug(form.title));`. In edit mode render the slug `<Input>` with `disabled={role === "host"}` and, for hosts, a hint "URL can't be changed after publishing."

  3. **Description read-only when locked.** Wrap the description textarea: when `form.descriptionLocked`, render it `disabled` with amber note:
  ```tsx
  {form.descriptionLocked ? (
    <div>
      <textarea value={form.description} disabled rows={7}
        className="w-full border border-border rounded-xl px-3.5 py-2.5 text-[14px] text-text2 bg-[#F7F5F2] resize-none" />
      <p className="mt-1 text-[12px] text-amber">This description has rich content (photos/cards). Edit it in Sanity Studio to preserve it — other fields here save normally.</p>
    </div>
  ) : ( /* existing editable textarea + word count */ )}
  ```

  4. **Host-hidden sections.** Wrap the "Host assignment" `SectionCard` and (in edit) the SEO section is fine to keep; hide host-assignment for hosts: `{role === "admin" && ( <SectionCard title="Host assignment"> ... </SectionCard> )}`.

  5. **Status control.** Replace the create-only `draft|published` select options with all three when editing; hosts see `published|archived` only (label "Live" / "Archived"), admins see `draft|published|archived`:
  ```tsx
  <Select value={form.status} onChange={(v) => set("status", v as ListingFormValues["status"])}>
    {role === "admin" && <option value="draft">Draft</option>}
    <option value="published">{role === "host" ? "Live" : "Published"}</option>
    <option value="archived">Archived</option>
  </Select>
  ```

  6. **Submit routing.** Replace `handleSubmit`'s hardcoded `POST /api/admin/listings` with mode/role-aware routing:
  ```typescript
  const endpoint =
    mode === "create" ? "/api/admin/listings"
    : role === "admin" ? `/api/admin/listings/${listingId}`
    : `/api/dashboard/listings/${listingId}`;
  const method = mode === "create" ? "POST" : "PATCH";
  const res = await fetch(endpoint, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
  // payload = same object the current handleSubmit builds, PLUS:
  //   status: form.status, descriptionLocked: form.descriptionLocked,
  //   description: form.descriptionLocked ? undefined : (form.description || undefined),
  const json = await res.json();
  if (!res.ok) { setError(json.error ?? "Something went wrong."); return; }
  router.push(onSuccessRedirect);
  ```
  Keep the existing per-type conditional payload construction verbatim; just add the three fields above and swap endpoint/method/redirect. Submit button label: `mode === "create" ? "Create listing" : "Save changes"`.

- [ ] **Step 2: Rewrite `admin/listings/new/page.tsx`** to a thin wrapper:

```tsx
import { ListingEditor } from "@/components/listings/ListingEditor";

export default function AdminNewListingPage() {
  return (
    <div className="max-w-2xl space-y-6">
      <ListingEditor
        mode="create"
        role="admin"
        onSuccessRedirect="/admin/listings?created=1"
        heading="New Listing"
        backHref="/admin/listings"
      />
    </div>
  );
}
```
(Move the header markup + `max-w-2xl` wrapper into `ListingEditor` so the wrapper stays this small; the editor renders its own back-link + heading from `backHref`/`heading`.)

- [ ] **Step 3: Verify create still works structurally**

Run: `cd apps/web && npx tsc --noEmit && npx eslint components/listings/ListingEditor.tsx app/admin/listings/new/page.tsx`
Expected: exit 0.

- [ ] **Step 4: Commit**

```bash
git add apps/web/components/listings/ListingEditor.tsx apps/web/app/admin/listings/new/page.tsx
git commit -m "refactor(listings): extract shared ListingEditor from admin new-listing form"
```

---

## Task 3: Refactor create route + add admin edit / archive / delete endpoints

**Files:**
- Modify: `apps/web/app/api/admin/listings/route.ts` (use shared schema + mapping)
- Create: `apps/web/app/api/admin/listings/[id]/route.ts` (PATCH edit, DELETE hard-delete)
- Create: `apps/web/app/api/admin/listings/[id]/archive/route.ts` (POST archive/restore)
- Create: `apps/web/lib/listings/events.ts` (events_pending sync helper)

- [ ] **Step 1: Create the events_pending sync helper**

```typescript
// apps/web/lib/listings/events.ts
import { adminClient } from "@/lib/supabase/admin";

/** Keep the events_pending mirror row in sync with a Sanity event. No-op for non-events. */
export async function syncEventPending(
  sanityId: string,
  type: string,
  action: "update" | "archive" | "delete",
  fields?: { title?: string; city?: string },
) {
  if (type !== "event") return;
  if (action === "delete" || action === "archive") {
    await adminClient.from("events_pending").delete().eq("sanity_event_id", sanityId);
    return;
  }
  if (action === "update" && fields) {
    await adminClient
      .from("events_pending")
      .update({ title: fields.title, city: fields.city })
      .eq("sanity_event_id", sanityId);
  }
}
```
(Archiving removes the mirror row so the event drops out of the host events list; the Sanity doc remains with `status: "archived"` and can be restored, which re-publishes it to the marketplace. The mirror row is only used for the pending-review workflow, so its absence is harmless for an already-live/archived event.)

- [ ] **Step 2: Refactor `api/admin/listings/route.ts`** to import `listingInputSchema` + `inputToSanityFields` from `@/lib/listings/listingFields`, deleting the local `schema`, `toPortableText`, and `sanityImage`. The create handler becomes:

```typescript
const data = listingInputSchema.parse(body);
// slug uniqueness check (unchanged)
const fields = inputToSanityFields(data);
const listing = await sanityWrite.create({ _type: "listing", ...fields, isVerified: false, submissionSource: data.submissionSource || "admin", ...(hostRef && { host: hostRef }) });
```
Keep the host-email resolution + host `.patch().append("listings")` block unchanged. (Note: `inputToSanityFields` already builds `photos` and `description`, so remove the old inline photo/description code.)

- [ ] **Step 3: Create `api/admin/listings/[id]/route.ts`** (PATCH + DELETE):

```typescript
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod/v4";
import { assertAdmin, AdminAuthError } from "@/lib/admin/auth";
import { sanityWriteClient } from "@/lib/sanity/writeClient";
import { listingInputSchema, inputToSanityFields } from "@/lib/listings/listingFields";
import { syncEventPending } from "@/lib/listings/events";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await assertAdmin(req);
    const { id } = await params;
    const data = listingInputSchema.parse(await req.json());

    const existing = await sanityWriteClient.fetch<{ _id: string; type: string } | null>(
      `*[_id == $id && _type == "listing"][0]{ _id, type }`, { id });
    if (!existing) return NextResponse.json({ error: "Listing not found." }, { status: 404 });

    // slug uniqueness excluding self
    const clash = await sanityWriteClient.fetch<string | null>(
      `*[_type == "listing" && slug.current == $slug && _id != $id][0]._id`, { slug: data.slug, id });
    if (clash) return NextResponse.json({ error: "Another listing already uses this slug." }, { status: 409 });

    const fields = inputToSanityFields(data);
    await sanityWriteClient.patch(id).set(fields).commit();
    await syncEventPending(id, data.type, "update", { title: data.title, city: data.city });
    return NextResponse.json({ success: true, id, slug: data.slug });
  } catch (err) {
    if (err instanceof AdminAuthError) return NextResponse.json({ error: err.message }, { status: err.status });
    if (err instanceof z.ZodError) return NextResponse.json({ error: err.issues[0]?.message ?? "Invalid data." }, { status: 400 });
    console.error("Admin edit listing error:", err);
    return NextResponse.json({ error: "Something went wrong." }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await assertAdmin(req);
    const { id } = await params;
    const existing = await sanityWriteClient.fetch<{ _id: string; type: string } | null>(
      `*[_id == $id && _type == "listing"][0]{ _id, type }`, { id });
    if (!existing) return NextResponse.json({ error: "Listing not found." }, { status: 404 });
    await syncEventPending(id, existing.type, "delete");
    await sanityWriteClient.delete(id);
    return NextResponse.json({ success: true });
  } catch (err) {
    if (err instanceof AdminAuthError) return NextResponse.json({ error: err.message }, { status: err.status });
    console.error("Admin delete listing error:", err);
    return NextResponse.json({ error: "Something went wrong." }, { status: 500 });
  }
}
```

- [ ] **Step 4: Create `api/admin/listings/[id]/archive/route.ts`** (POST, toggles status):

```typescript
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod/v4";
import { assertAdmin, AdminAuthError } from "@/lib/admin/auth";
import { sanityWriteClient } from "@/lib/sanity/writeClient";
import { syncEventPending } from "@/lib/listings/events";

const body = z.object({ status: z.enum(["archived", "published"]) });

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await assertAdmin(req);
    const { id } = await params;
    const { status } = body.parse(await req.json());
    const existing = await sanityWriteClient.fetch<{ _id: string; type: string } | null>(
      `*[_id == $id && _type == "listing"][0]{ _id, type }`, { id });
    if (!existing) return NextResponse.json({ error: "Listing not found." }, { status: 404 });
    await sanityWriteClient.patch(id).set({ status }).commit();
    if (status === "archived") await syncEventPending(id, existing.type, "archive");
    return NextResponse.json({ success: true, status });
  } catch (err) {
    if (err instanceof AdminAuthError) return NextResponse.json({ error: err.message }, { status: err.status });
    if (err instanceof z.ZodError) return NextResponse.json({ error: "Invalid status." }, { status: 400 });
    console.error("Admin archive listing error:", err);
    return NextResponse.json({ error: "Something went wrong." }, { status: 500 });
  }
}
```

- [ ] **Step 5: Verify**

Run: `cd apps/web && npx tsc --noEmit && npx eslint app/api/admin/listings/route.ts "app/api/admin/listings/[id]/route.ts" "app/api/admin/listings/[id]/archive/route.ts" lib/listings/events.ts`
Expected: exit 0.

- [ ] **Step 6: Commit**

```bash
git add apps/web/app/api/admin/listings apps/web/lib/listings/events.ts
git commit -m "feat(admin): listing edit (PATCH), archive, and hard-delete endpoints"
```

---

## Task 4: Host edit + archive endpoints (ownership-guarded)

**Files:**
- Create: `apps/web/lib/listings/ownership.ts` (host-owns-listing check)
- Create: `apps/web/app/api/dashboard/listings/[id]/route.ts` (PATCH)
- Create: `apps/web/app/api/dashboard/listings/[id]/archive/route.ts` (POST)

- [ ] **Step 1: Ownership helper**

```typescript
// apps/web/lib/listings/ownership.ts
import { sanityWriteClient } from "@/lib/sanity/writeClient";

/** True if the host (Supabase user id + their sanity_host_id) owns the listing. */
export async function hostOwnsListing(
  listingId: string,
  userId: string,
  sanityHostId: string | null,
): Promise<{ ok: boolean; type?: string }> {
  const doc = await sanityWriteClient.fetch<{ _id: string; type: string; hostId?: string; hostRef?: string } | null>(
    `*[_id == $id && _type == "listing"][0]{ _id, type, hostId, "hostRef": host._ref }`,
    { id: listingId },
  );
  if (!doc) return { ok: false };
  let owns = doc.hostId === userId || (!!sanityHostId && doc.hostRef === sanityHostId);
  if (!owns && sanityHostId) {
    const inList = await sanityWriteClient.fetch<boolean>(
      `count(*[_type == "host" && _id == $hid && $lid in listings[]._ref]) > 0`,
      { hid: sanityHostId, lid: listingId },
    );
    owns = inList;
  }
  return { ok: owns, type: doc.type };
}
```

- [ ] **Step 2: Host PATCH route** `api/dashboard/listings/[id]/route.ts`:

```typescript
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod/v4";
import { getAuthUser, getHostProfile, getIsAdmin } from "@/app/dashboard/_lib/auth";
import { sanityWriteClient } from "@/lib/sanity/writeClient";
import { listingInputSchema, inputToSanityFields } from "@/lib/listings/listingFields";
import { hostOwnsListing } from "@/lib/listings/ownership";
import { syncEventPending } from "@/lib/listings/events";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { user } = await getAuthUser();
    if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    const { id } = await params;

    const hostProfile = await getHostProfile(user.id);
    const isAdmin = await getIsAdmin(user.id);
    const { ok, type } = await hostOwnsListing(id, user.id, hostProfile?.sanity_host_id ?? null);
    if (!ok && !isAdmin) return NextResponse.json({ error: "You don't have permission to edit this listing." }, { status: 403 });
    if (!type) return NextResponse.json({ error: "Listing not found." }, { status: 404 });

    const data = listingInputSchema.parse(await req.json());
    // Hosts cannot change slug or type — force the stored values.
    const stored = await sanityWriteClient.fetch<{ slug: string; type: string }>(
      `*[_id == $id][0]{ "slug": slug.current, type }`, { id });
    const safe = { ...data, slug: stored.slug, type: stored.type, status: data.status === "archived" ? "archived" : "published" as const };
    const fields = inputToSanityFields(safe);
    await sanityWriteClient.patch(id).set(fields).commit();
    await syncEventPending(id, stored.type, "update", { title: safe.title, city: safe.city });
    return NextResponse.json({ success: true, id });
  } catch (err) {
    if (err instanceof z.ZodError) return NextResponse.json({ error: err.issues[0]?.message ?? "Invalid data." }, { status: 400 });
    console.error("Host edit listing error:", err);
    return NextResponse.json({ error: "Something went wrong." }, { status: 500 });
  }
}
```

- [ ] **Step 3: Host archive route** `api/dashboard/listings/[id]/archive/route.ts`:

```typescript
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod/v4";
import { getAuthUser, getHostProfile, getIsAdmin } from "@/app/dashboard/_lib/auth";
import { sanityWriteClient } from "@/lib/sanity/writeClient";
import { hostOwnsListing } from "@/lib/listings/ownership";
import { syncEventPending } from "@/lib/listings/events";

const body = z.object({ status: z.enum(["archived", "published"]) });

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { user } = await getAuthUser();
    if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    const { id } = await params;
    const hostProfile = await getHostProfile(user.id);
    const isAdmin = await getIsAdmin(user.id);
    const { ok, type } = await hostOwnsListing(id, user.id, hostProfile?.sanity_host_id ?? null);
    if (!ok && !isAdmin) return NextResponse.json({ error: "You don't have permission." }, { status: 403 });
    if (!type) return NextResponse.json({ error: "Listing not found." }, { status: 404 });
    const { status } = body.parse(await req.json());
    await sanityWriteClient.patch(id).set({ status }).commit();
    if (status === "archived") await syncEventPending(id, type, "archive");
    return NextResponse.json({ success: true, status });
  } catch (err) {
    if (err instanceof z.ZodError) return NextResponse.json({ error: "Invalid status." }, { status: 400 });
    console.error("Host archive listing error:", err);
    return NextResponse.json({ error: "Something went wrong." }, { status: 500 });
  }
}
```

- [ ] **Step 4: Verify**

Run: `cd apps/web && npx tsc --noEmit && npx eslint lib/listings/ownership.ts "app/api/dashboard/listings/[id]/route.ts" "app/api/dashboard/listings/[id]/archive/route.ts"`
Expected: exit 0.

- [ ] **Step 5: Commit**

```bash
git add apps/web/lib/listings/ownership.ts apps/web/app/api/dashboard/listings
git commit -m "feat(dashboard): host listing edit (PATCH) + archive endpoints with ownership guard"
```

---

## Task 5: Shared "map a Sanity doc → ListingFormValues" loader + edit route pages

**Files:**
- Modify: `apps/web/lib/listings/listingFields.ts` (add `sanityDocToForm`)
- Create: `apps/web/app/admin/listings/[id]/edit/page.tsx`
- Create: `apps/web/app/dashboard/listings/[id]/edit/page.tsx`

- [ ] **Step 1: Add `sanityDocToForm` to `listingFields.ts`** (below the existing exports):

```typescript
import { emptyListingForm } from "./listingFields"; // (already in same file — reference directly, no import)

/** Build editor form values from a fetched Sanity listing doc.
 *  `doc.photos` must be projected with asset->{_id,url}. */
export function sanityDocToForm(doc: Record<string, any>): ListingFormValues {
  const plain = isPlainDescription(doc.description);
  return {
    ...emptyListingForm,
    title: doc.title ?? "",
    slug: doc.slug?.current ?? doc.slug ?? "",
    type: doc.type ?? "stay",
    subcategory: doc.subcategory ?? "",
    city: doc.city ?? "",
    county: doc.county ?? "",
    address: doc.address ?? "",
    status: (doc.status ?? "draft") as ListingFormValues["status"],
    description: plain ? descriptionToText(doc.description) : descriptionToText(doc.description),
    descriptionLocked: !plain,
    price: doc.price != null ? String(doc.price) : "",
    priceUnit: doc.priceUnit ?? "night",
    bookingType: doc.bookingType ?? "contact_form",
    maxGuests: doc.maxGuests != null ? String(doc.maxGuests) : "",
    rentingType: doc.rentingType ?? "entire_place",
    website: doc.website ?? "", instagram: doc.instagram ?? "", facebook: doc.facebook ?? "",
    phone: doc.phone ?? "", email: doc.email ?? "",
    notificationEmail: doc.notificationEmail1 ?? "", notificationEmail2: doc.notificationEmail2 ?? "",
    amenities: doc.amenities ?? [], tags: doc.tags ?? [],
    photos: sanityPhotosToUploaded(doc.photos),
    cuisine: doc.cuisine ?? [], priceRange: doc.priceRange ?? "", openingHours: doc.openingHours ?? "",
    atmosphere: doc.atmosphere ?? "", reservationRequired: !!doc.reservationRequired,
    duration: doc.duration ?? "", maxGroupSize: doc.maxGroupSize != null ? String(doc.maxGroupSize) : "",
    difficulty: doc.difficulty ?? "", minAge: doc.minAge != null ? String(doc.minAge) : "",
    languages: doc.languages ?? [], meetingPoint: doc.meetingPoint ?? "",
    eventDate: doc.eventDate ? String(doc.eventDate).slice(0, 16) : "",
    eventEndDate: doc.eventEndDate ? String(doc.eventEndDate).slice(0, 16) : "",
    venue: doc.venue ?? "", ageRestriction: doc.ageRestriction ?? "", dresscode: doc.dresscode ?? "",
    venueAddress: doc.venueAddress ?? "", doorsOpen: doc.doorsOpen ?? "", isFree: !!doc.isFree,
    priceFrom: doc.priceFrom != null ? String(doc.priceFrom) : "", ticketLink: doc.ticketLink ?? "",
    organizer: doc.organizer ?? "",
    serviceArea: doc.serviceArea ?? "", responseTime: doc.responseTime ?? "", providerInfo: doc.providerInfo ?? "",
    seoTitle: doc.seoTitle ?? "", seoDescription: doc.seoDescription ?? "",
  };
}
```
(Remove the stray `import ... from "./listingFields"` line shown above — `emptyListingForm` is already declared in this file; reference it directly.)

- [ ] **Step 2: Add an edit-fetch projection to `apps/web/lib/sanity/queries.ts`.** Append:

```typescript
export const LISTING_EDIT_QUERY = groq`
  *[_id == $id && _type == "listing"][0]{
    _id, title, slug, type, subcategory, status, city, county, address,
    price, priceUnit, bookingType, maxGuests, rentingType, description,
    website, instagram, facebook, phone, email, notificationEmail1, notificationEmail2,
    amenities, tags,
    photos[]{ asset->{ _id, url }, alt },
    cuisine, priceRange, openingHours, atmosphere, reservationRequired,
    duration, maxGroupSize, difficulty, minAge, languages, meetingPoint,
    eventDate, eventEndDate, venue, ageRestriction, dresscode, venueAddress, doorsOpen,
    isFree, priceFrom, ticketLink, organizer,
    serviceArea, responseTime, providerInfo, seoTitle, seoDescription,
    hostId, "hostRef": host._ref
  }
`;
```

- [ ] **Step 3: Admin edit page** `app/admin/listings/[id]/edit/page.tsx`:

```tsx
import { notFound } from "next/navigation";
import { sanityWriteClient } from "@/lib/sanity/writeClient";
import { LISTING_EDIT_QUERY } from "@/lib/sanity/queries";
import { sanityDocToForm } from "@/lib/listings/listingFields";
import { ListingEditor } from "@/components/listings/ListingEditor";

export const dynamic = "force-dynamic";

export default async function AdminEditListingPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const doc = await sanityWriteClient.fetch(LISTING_EDIT_QUERY, { id });
  if (!doc) notFound();
  const initialValues = sanityDocToForm(doc);
  return (
    <div className="max-w-2xl space-y-6">
      <ListingEditor
        mode="edit" role="admin" listingId={id} initialValues={initialValues}
        onSuccessRedirect="/admin/listings?updated=1"
        heading={`Edit — ${doc.title}`} backHref="/admin/listings"
      />
    </div>
  );
}
```

- [ ] **Step 4: Host edit page** `app/dashboard/listings/[id]/edit/page.tsx`:

```tsx
import { notFound, redirect } from "next/navigation";
import { sanityWriteClient } from "@/lib/sanity/writeClient";
import { LISTING_EDIT_QUERY } from "@/lib/sanity/queries";
import { sanityDocToForm } from "@/lib/listings/listingFields";
import { hostOwnsListing } from "@/lib/listings/ownership";
import { ListingEditor } from "@/components/listings/ListingEditor";
import { getAuthUser, getHostProfile, getIsAdmin } from "@/app/dashboard/_lib/auth";

export const dynamic = "force-dynamic";

export default async function HostEditListingPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { user } = await getAuthUser();
  if (!user) redirect("/login");
  const hostProfile = await getHostProfile(user.id);
  const isAdmin = await getIsAdmin(user.id);
  const { ok } = await hostOwnsListing(id, user.id, hostProfile?.sanity_host_id ?? null);
  if (!ok && !isAdmin) redirect("/dashboard/listings");
  const doc = await sanityWriteClient.fetch(LISTING_EDIT_QUERY, { id });
  if (!doc) notFound();
  const initialValues = sanityDocToForm(doc);
  return (
    <div className="max-w-2xl mx-auto px-5 py-8 space-y-6">
      <ListingEditor
        mode="edit" role="host" listingId={id} initialValues={initialValues}
        onSuccessRedirect="/dashboard/listings?updated=1"
        heading="Edit listing" backHref="/dashboard/listings"
      />
    </div>
  );
}
```

- [ ] **Step 5: Verify**

Run: `cd apps/web && npx tsc --noEmit && npx eslint lib/listings/listingFields.ts lib/sanity/queries.ts "app/admin/listings/[id]/edit/page.tsx" "app/dashboard/listings/[id]/edit/page.tsx"`
Expected: exit 0.

- [ ] **Step 6: Commit**

```bash
git add apps/web/lib/listings/listingFields.ts apps/web/lib/sanity/queries.ts "apps/web/app/admin/listings/[id]/edit" "apps/web/app/dashboard/listings/[id]/edit"
git commit -m "feat(listings): edit route pages for admin and host (Sanity doc → editor)"
```

---

## Task 6: Reusable client action buttons (edit link + destructive actions)

**Files:**
- Create: `apps/web/components/listings/ListingRowActions.tsx`

- [ ] **Step 1: Create the action component** (used by both host and admin lists; `variant` picks the action set):

```tsx
"use client";
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

interface Props {
  id: string;
  editHref: string;
  variant: "host" | "admin";
  status?: string;
}

export function ListingRowActions({ id, editHref, variant, status }: Props) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const isArchived = status === "archived";
  const base = variant === "admin" ? `/api/admin/listings/${id}` : `/api/dashboard/listings/${id}`;

  async function call(url: string, body: object, confirmMsg?: string) {
    if (confirmMsg && !window.confirm(confirmMsg)) return;
    setBusy(true); setErr("");
    try {
      const res = await fetch(url, { method: url.endsWith("/archive") ? "POST" : "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const json = await res.json();
      if (!res.ok) { setErr(json.error ?? "Failed"); return; }
      router.refresh();
    } catch { setErr("Network error"); } finally { setBusy(false); }
  }

  return (
    <div className="flex items-center gap-2">
      <Link href={editHref} className="text-[13px] font-semibold text-dark hover:text-amber transition-colors">Edit</Link>
      {isArchived ? (
        <button disabled={busy} onClick={() => call(`${base}/archive`, { status: "published" })}
          className="text-[13px] font-semibold text-emerald-600 hover:underline">Restore</button>
      ) : (
        <button disabled={busy} onClick={() => call(`${base}/archive`, { status: "archived" }, "Archive this listing? It will be removed from the marketplace but can be restored.")}
          className="text-[13px] font-semibold text-amber hover:underline">{variant === "host" ? "Delete" : "Archive"}</button>
      )}
      {variant === "admin" && (
        <button disabled={busy} onClick={() => call(base, {}, "PERMANENTLY delete this listing? This cannot be undone.")}
          className="text-[13px] font-semibold text-red-600 hover:underline">Delete</button>
      )}
      {err && <span className="text-[12px] text-red-600">{err}</span>}
    </div>
  );
}
```
(Note: the `call` helper picks POST for `/archive` URLs and DELETE otherwise — the only DELETE caller is the admin permanent-delete button hitting `base`.)

- [ ] **Step 2: Verify**

Run: `cd apps/web && npx tsc --noEmit && npx eslint components/listings/ListingRowActions.tsx`
Expected: exit 0.

- [ ] **Step 3: Commit**

```bash
git add apps/web/components/listings/ListingRowActions.tsx
git commit -m "feat(listings): reusable edit/archive/restore/delete row actions"
```

---

## Task 7: Wire actions into the admin listings table

**Files:**
- Modify: `apps/web/app/admin/listings/page.tsx` (Actions column)

- [ ] **Step 1:** Import the component at the top: `import { ListingRowActions } from "@/components/listings/ListingRowActions";`. Ensure the SSR query for the table selects `_id` and `status` (it already renders status). In the Actions cell (currently "Command center" / "Edit in Sanity" / "View on site"), add above the existing links:

```tsx
<ListingRowActions id={l._id} editHref={`/admin/listings/${l._id}/edit`} variant="admin" status={l.status} />
```
Keep "Edit in Sanity" and "View on site" links (rich-content edits + preview).

- [ ] **Step 2: Verify**

Run: `cd apps/web && npx tsc --noEmit && npx eslint app/admin/listings/page.tsx`
Expected: exit 0.

- [ ] **Step 3: Commit**

```bash
git add apps/web/app/admin/listings/page.tsx
git commit -m "feat(admin): edit/archive/delete actions in listings table"
```

---

## Task 8: Wire actions into host listings + events pages

**Files:**
- Modify: `apps/web/app/dashboard/listings/page.tsx`
- Modify: `apps/web/app/dashboard/events/page.tsx`

- [ ] **Step 1: Host listings.** Import `ListingRowActions`. Confirm the host listings GROQ selects `_id` and `status` (add `status` to the projection if missing — grep `.from`/projection in the file; if `status` isn't selected the archived badge/logic won't work). On each listing card, add:

```tsx
<ListingRowActions id={listing._id} editHref={`/dashboard/listings/${listing._id}/edit`} variant="host" status={listing.status} />
```
Add an "Archived" badge when `listing.status === "archived"` next to the existing verified/pending badges.

- [ ] **Step 2: Host events.** In `dashboard/events/page.tsx`, for events sourced from Sanity (which have a Sanity `_id`), render the same actions pointing at the listing edit route (events are listings):

```tsx
{ev.sanityId && (
  <ListingRowActions id={ev.sanityId} editHref={`/dashboard/listings/${ev.sanityId}/edit`} variant="host" status={ev.status} />
)}
```
Map the merged event object so it exposes `sanityId` (the Sanity `_id`) and `status`. For `events_pending`-only rows still awaiting first-time approval, use `sanity_event_id` as the id. Ensure the Sanity events query in this page selects `_id` and `status`.

- [ ] **Step 3: Verify**

Run: `cd apps/web && npx tsc --noEmit && npx eslint app/dashboard/listings/page.tsx app/dashboard/events/page.tsx`
Expected: exit 0.

- [ ] **Step 4: Commit**

```bash
git add apps/web/app/dashboard/listings/page.tsx apps/web/app/dashboard/events/page.tsx
git commit -m "feat(dashboard): host edit/delete actions on listings and events"
```

---

## Task 9: Full type + lint sweep and manual verification

- [ ] **Step 1: Whole-app type check**

Run: `cd apps/web && npx tsc --noEmit`
Expected: exit 0.

- [ ] **Step 2: Lint the whole feature surface**

Run: `cd apps/web && npx eslint components/listings lib/listings "app/api/admin/listings" "app/api/dashboard/listings" "app/admin/listings" "app/dashboard/listings" app/dashboard/events`
Expected: 0 errors (pre-existing warnings elsewhere are acceptable; no NEW warnings in these files).

- [ ] **Step 3: Manual verification checklist** (run on the dev preview after merge to `dev`; Sanity is unreachable in the build sandbox so this cannot be done locally). Confirm each:
  - Host: Edit own listing → change title/price/photos → saves and reflects on the live page.
  - Host: cannot open `/dashboard/listings/<someone-elses-id>/edit` (redirects away).
  - Host: "Delete" archives → listing leaves the marketplace, shows "Archived" badge, "Restore" brings it back.
  - Host: edit an event → change date → `events_pending` mirror stays consistent; event still appears in host events list.
  - Host: editing a listing that has a Photo Row description shows the read-only note and the Photo Row survives the save (regression guard for the earlier description fix).
  - Admin: Edit any listing; Archive; permanent Delete (with typed confirm) removes it.
  - Admin: slug edit rejected on duplicate (409 surfaced inline).

- [ ] **Step 4: Final commit (if any doc/tidy changes)**

```bash
git add -A
git commit -m "chore(listings): edit/delete feature type+lint sweep" || echo "nothing to commit"
```

---

## Self-review notes (author)

- **Spec coverage:** shared editor (T2), host edit/archive (T4), admin edit/archive/delete (T3), edit routes (T5), UI entry points (T6–T8), description safety (T1 `isPlainDescription` + editor read-only + PATCH omission), photo round-trip (T1 mappers), slug lock/uniqueness (T3/T4 + editor), events dual-storage sync (T1 helper used in T3/T4), archive-not-hard-delete for hosts (T4 + actions). All spec sections map to a task.
- **Type consistency:** `ListingFormValues`, `inputToSanityFields`, `sanityDocToForm`, `hostOwnsListing`, `syncEventPending` names are used identically across tasks.
- **No test framework** in repo → verification is tsc + eslint + manual preview, stated up front.
- **Assumption to verify in T8:** host listings/events GROQ projections may need `status`/`_id` added — flagged inline as a step, not assumed done.
