# Event Dates & Venue-Linking Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: superpowers:subagent-driven-development. Steps use checkbox syntax.

**Goal:** Let hosts edit event dates AND recurring schedules after creation, and link an event to a Klickenya venue listing with a reverse "events here" link on the listing page.

**Design decisions (approved 2026-07-18):** venue link accepts **any** listing type; the `venueListing` reference is **independent** of the free-text `venue`/`venueAddress` (no auto-fill — the reference exists purely for the bidirectional link).

**Branch:** `feat/event-dates-venue` off `dev`. Worktree `/Users/patrikgiuliana/Desktop/CLAUDE CODE/klickenya-ticketing`.

**Env note:** no Supabase/Sanity/browser here. Gates: `npx tsc --noEmit` + `pnpm vitest run` + `pnpm lint` (from apps/web). Sanity writes / rendering are manual preview checks — flag, don't fake.

**Key existing structures:**
- Sanity event fields (`apps/studio/schemas/listing.ts`, event group): `eventDate`, `eventEndDate`, `doorsOpen`, `venue`, `venueAddress`, `isRecurring` (bool), `recurrenceRule` (string), `schedule` (array of `{_key, day, startTime, endTime}`, day ∈ mon..sun).
- Host edit form: `apps/web/components/listings/ListingEditor.tsx` driven by `apps/web/lib/listings/listingFields.ts` (zod schema + form-state type + defaults + doc→form loader + form→Sanity mapping). It handles `eventDate`/`eventEndDate`/`venue`/`venueAddress`/`doorsOpen` but NOT `isRecurring`/`recurrenceRule`/`schedule`.
- Create wizard: `apps/web/app/dashboard/events/new/AddEventForm.tsx` — has the working weekly-schedule editor (`ScheduleRow = {day, startTime, endTime}`, `emptySchedule()`, `updateSchedule`, `addScheduleRow`, `removeScheduleRow`, max 7 rows) to mirror.
- Sanity write from the editor uses `sanityWriteClient` (`.patch(id).set({...}).commit()`); array items need `_key` (use `crypto.randomUUID()`).

---

## Task A: Editable recurrence + schedule in the listing editor

**Files:** modify `apps/web/lib/listings/listingFields.ts`, `apps/web/components/listings/ListingEditor.tsx`

- [ ] **Step 1: Read all three files** — `listingFields.ts` (full), `ListingEditor.tsx` (the event section), and `AddEventForm.tsx` lines ~150–260 and ~480–560 (the recurring toggle + schedule editor markup) to copy its exact UI/behaviour.

- [ ] **Step 2: Extend `listingFields.ts`**
  - Add to the zod schema: `isRecurring: z.boolean().optional()`, `recurrenceRule: z.string().optional()`, `schedule: z.array(z.object({ day: z.string(), startTime: z.string(), endTime: z.string().optional() })).optional()`.
  - Add the same fields to the form-state TS type and the `defaultValues` (`isRecurring: false`, `recurrenceRule: ""`, `schedule: []`).
  - In the doc→form loader: map `doc.isRecurring ?? false`, `doc.recurrenceRule ?? ""`, and `doc.schedule` (array) → strip `_key` into `{day, startTime, endTime}` rows.
  - In the form→Sanity mapping (the object passed to the write), for events set:
    - `isRecurring: data.isRecurring ?? false`
    - `recurrenceRule: data.isRecurring ? (data.recurrenceRule || undefined) : undefined`
    - `schedule: data.isRecurring ? (data.schedule ?? []).filter(s => s.day && s.startTime).map(s => ({ _key: crypto.randomUUID(), day: s.day, startTime: s.startTime, ...(s.endTime ? { endTime: s.endTime } : {}) })) : undefined`
    - Keep `eventDate`/`eventEndDate` as-is (they remain editable for non-recurring events).
  - Match the file's existing import style; add `import { randomUUID } from "crypto"` if the mapping lives in a server context, OR generate keys with a small local helper if this file is shared with client code (check — if `listingFields.ts` is imported by a client component, use a non-crypto key like `` `k${Date.now()}${Math.random().toString(36).slice(2)}` `` since `crypto.randomUUID` is available in browsers too via `globalThis.crypto.randomUUID()`; prefer `globalThis.crypto.randomUUID()` which works both sides). Report which you used.

- [ ] **Step 3: Render the fields in `ListingEditor.tsx`** (event branch only)
  - Add an "This is a recurring event" toggle bound to `isRecurring` (mirror AddEventForm's toggle styling).
  - When `isRecurring` is true: show a `recurrenceRule` text input ("e.g. Every Friday") and the weekly schedule editor — a list of rows each with a Day `<select>` (monday..sunday), Start time + End time inputs, a remove button, and an "+ Add day" button (max 7). Mirror AddEventForm's `updateSchedule`/`addScheduleRow`/`removeScheduleRow` logic.
  - When `isRecurring` is false, the existing `eventDate`/`eventEndDate` inputs remain the date source (leave them; optionally hide them when recurring is on — mirror AddEventForm which uses startDate when not recurring).
  - Keep all non-event and other event fields untouched. Inputs must be `text-[16px]`+ (iOS zoom rule).

- [ ] **Step 4: Verify** — `cd apps/web && npx tsc --noEmit` clean; `pnpm vitest run` unchanged; `npx eslint lib/listings/listingFields.ts components/listings/ListingEditor.tsx` clean.

- [ ] **Step 5: Commit**
```bash
cd "/Users/patrikgiuliana/Desktop/CLAUDE CODE/klickenya-ticketing"
git add apps/web/lib/listings/listingFields.ts apps/web/components/listings/ListingEditor.tsx
git commit -m "feat(events): edit recurring toggle, rule, and weekly schedule in the listing editor"
```

---

## Task B1: Venue reference — schema, search API, picker, form wiring

**Files:** modify `apps/studio/schemas/listing.ts`; create `apps/web/app/api/listings/venue-search/route.ts`, `apps/web/components/events/VenueListingPicker.tsx`; modify `apps/web/lib/listings/listingFields.ts` + `ListingEditor.tsx` and `apps/web/app/dashboard/events/new/AddEventForm.tsx` (+ its server action/create route).

- [ ] **Step 1: Add the Sanity field** — in `apps/studio/schemas/listing.ts` event group, add:
```ts
defineField({
  name: 'venueListing',
  title: 'Venue (Klickenya listing)',
  type: 'reference',
  to: [{ type: 'listing' }],
  description: 'Optional — link this event to a venue listing on Klickenya. Independent of the venue name/address above.',
  hidden: ({ document }: HiddenCtx) => !isEvent({ document }),
  group: 'event',
}),
```
Place it near `venue`/`venueAddress`. Confirm `defineField`/`HiddenCtx`/`isEvent` are already in scope (they are — used by sibling fields).

- [ ] **Step 2: Venue search API** — `apps/web/app/api/listings/venue-search/route.ts`:
```typescript
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod/v4";
import { sanityClient } from "@/lib/sanity/client";

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get("q")?.trim() ?? "";
  if (q.length < 2) return NextResponse.json({ results: [] });
  const parsed = z.string().max(80).safeParse(q);
  if (!parsed.success) return NextResponse.json({ results: [] });
  const results = await sanityClient.fetch<{ _id: string; title: string; type: string; city: string | null }[]>(
    `*[_type == "listing" && status == "published" && title match $m][0...10]{ _id, title, type, city }`,
    { m: `${parsed.data}*` },
  );
  return NextResponse.json({ results: results ?? [] });
}
```
(Confirm `status == "published"` and `title match` are valid against existing queries in `apps/web/lib/sanity/queries.ts`; adjust field names if the repo differs.)

- [ ] **Step 3: VenueListingPicker component** — `apps/web/components/events/VenueListingPicker.tsx`, a `"use client"` combobox: props `{ value: { _id: string; title: string } | null; onChange: (v: { _id: string; title: string } | null) => void }`. Debounced fetch to `/api/listings/venue-search?q=`, dropdown of results (title + type·city), selecting sets value (shows a chip with an "×" to clear). `text-[16px]` input.

- [ ] **Step 4: Wire into the editor** (`listingFields.ts` + `ListingEditor.tsx`)
  - `listingFields.ts`: add `venueListingId: z.string().optional()` to the zod schema + form type + default `""`. In the doc→form loader, map `doc.venueListing?._ref ?? ""` (fetch the ref — ensure the loader's GROQ selects `venueListing` or `"venueListingId": venueListing._ref`). In form→Sanity mapping, for events set `venueListing: data.venueListingId ? { _type: "reference", _ref: data.venueListingId } : undefined` (use `unset` semantics if cleared — set to `null`/undefined removes it via patch; confirm the write path handles clearing, else patch `.unset(["venueListing"])` when empty).
  - `ListingEditor.tsx`: render `<VenueListingPicker>` in the event branch, storing the selected `_id` into `venueListingId` (and a display title in local state). Preload the current title if `venueListingId` is set (a small fetch or pass from the loader — simplest: the loader also returns `venueListingTitle`).

- [ ] **Step 5: Wire into the create wizard** (`AddEventForm.tsx` + its create route)
  - Add a `<VenueListingPicker>` to Step 2 (Date & venue), storing the selected `_id` in state; include `venueListingId` in the submitted FormData.
  - In the create route/server action that builds the Sanity event doc, set `venueListing: venueListingId ? { _type: "reference", _ref: venueListingId } : undefined`. (Find the create handler — likely `apps/web/app/api/dashboard/events/create/route.ts` — and add it alongside the other event fields.)

- [ ] **Step 6: Verify** — tsc clean; vitest unchanged; lint clean on all touched files.

- [ ] **Step 7: Commit**
```bash
git add apps/studio/schemas/listing.ts apps/web/app/api/listings/venue-search/ apps/web/components/events/VenueListingPicker.tsx apps/web/lib/listings/listingFields.ts apps/web/components/listings/ListingEditor.tsx "apps/web/app/dashboard/events/new/AddEventForm.tsx" apps/web/app/api/dashboard/events/create/route.ts
git commit -m "feat(events): link an event to a Klickenya venue listing (schema, search, picker, forms)"
```

---

## Task B2: Bidirectional rendering (event → venue, venue → events)

**Files:** modify `apps/web/components/listings/detail/EventDetail.tsx`; the listing detail router `apps/web/app/(listings)/[type]/[city]/[slug]/page.tsx` + a new `apps/web/components/listings/EventsHere.tsx`.

- [ ] **Step 1: Event → venue link (EventDetail)**
  - The detail page already fetches the event via GROQ. Extend that projection (in the router or EventDetail's data source) to include: `"venueListingRef": venueListing->{ title, type, city, "slug": slug.current }`.
  - In `EventDetail.tsx`, if `venueListingRef` exists, render the venue as a link. Build the URL with the repo's type→plural map (stay→stays, restaurant→restaurants, experience→experiences, rental→rentals, service→services, event→events) + `citySlug = city.toLowerCase().replace(/\s+/g,"-")` → `/${plural}/${citySlug}/${slug}`. Confirm the exact plural mapping against `revalidateListing` / VALID_TYPES already in the repo and reuse it if exported.

- [ ] **Step 2: Venue → "Events happening here"**
  - Create `apps/web/components/listings/EventsHere.tsx` (server component or presentational): props `events: { title: string; url: string; dateStr: string | null; isRecurring: boolean; recurrenceRule: string | null }[]`. Renders a titled section with a list of event links (hidden entirely if empty).
  - In the listing detail router `page.tsx`, after resolving the current `listing._id`, fetch events referencing it:
    ```groq
    *[_type == "listing" && type == "event" && venueListing._ref == $id
      && (isRecurring == true || !defined(eventDate) || eventDate >= now())]
      | order(eventDate asc)[0...12]{ title, eventDate, isRecurring, recurrenceRule, city, "slug": slug.current }
    ```
    Map each to `{ title, dateStr (formatted Nairobi or null), isRecurring, recurrenceRule, url: /events/${citySlug}/${slug} }` and render `<EventsHere events={...} />` on the detail page (for all listing types — a venue can be any type). Place it in a sensible spot (e.g. below the main content, near related listings).

- [ ] **Step 3: Verify** — tsc clean; vitest unchanged; lint clean on touched files. Note the live visual check (event shows venue link; venue shows events-here) as a manual preview step.

- [ ] **Step 4: Commit**
```bash
git add apps/web/components/listings/detail/EventDetail.tsx apps/web/components/listings/EventsHere.tsx "apps/web/app/(listings)/[type]/[city]/[slug]/page.tsx"
git commit -m "feat(events): bidirectional venue link — event shows venue, listing shows events happening here"
```

---

## Deployment / manual checks
- No DB migration (all Sanity). Sanity Studio schema gains `venueListing` — redeploy Studio if it's a separate deploy; the web app reads it via GROQ regardless.
- Preview checks: (1) edit a recurring event's schedule → saves + shows on the public page; (2) link an event to a venue → event page links to the venue, and the venue's page shows the event under "Events happening here."

## Self-review
- Recurrence edit (Task A) covers the reported "can't edit recurring dates." ✓
- Venue link independent of free-text venue (decision) — no auto-fill logic. ✓
- Any listing type linkable (decision) — search API + reverse query are type-agnostic (reverse filters events by `venueListing._ref`, current listing can be any type). ✓
- `_key` generation for `schedule` mirrors the tier-edit approach. ✓
