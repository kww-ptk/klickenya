# Construction Progress Timeline — Design Spec

Date: 2026-09-21 · Branch: `feat/construction-timeline` · Migration: **none** (Sanity only)

## What we're building

A construction progress timeline on the property detail page, for listings flagged
`isNewDevelopment` (new development / off-plan). It shows the eight standard build stages
down a vertical rail, each with its status, date, a short note and site photos, plus an
overall completion percentage computed from which stages have been reached.

Today that page has a "Development details" block: three cards showing Developer,
Completion % and Units available, with a thin bar under the percentage. The number is typed
by hand and stands alone — a buyer has no way to tell whether "62%" means the roof is on.
This replaces the Completion card with something a buyer can check against photographs.

## Decisions made (with the user)

1. **Sanity now, shaped to move later.** Milestones are a field on the `property` document,
   edited by admin in Studio, exactly like every other property field. Developers do not
   self-serve today. All stage knowledge and arithmetic live behind one pure function so
   that a later move to Supabase changes the input to that function and nothing else.
2. **Fixed stage vocabulary, 8 stages.** Building-focused sequence. Serviced-plot and land
   developments are explicitly not covered — a second track was considered and dropped.
3. **Percentage is computed from stages, weighted.** Not all stages are the same share of a
   build. One source of truth, so the bar cannot contradict the timeline.
4. **Each stage shows all four:** status, completion date, target date, short note — plus
   photos.
5. **Vertical rail layout**, chosen over a horizontal stepper and a photo-led card feed. It
   is the only one of the three that shows every stage's full content at once, degrades
   cleanly when a stage has no photo yet, is identical on mobile and desktop, and needs no
   client JavaScript.
6. **All eight stages always render**, in canonical order, whether or not the admin filled
   them in. A timeline showing only the three stages someone bothered to enter looks
   half-built; showing all eight gives the buyer the whole roadmap and makes gaps read as
   "not there yet" rather than "not recorded".

## Stages and weights

| # | value | label | weight |
|---|-------|-------|--------|
| 1 | `groundbreaking`   | Groundbreaking              | 5  |
| 2 | `foundation`       | Foundation                  | 15 |
| 3 | `superstructure`   | Superstructure              | 20 |
| 4 | `roofing`          | Roofing                     | 15 |
| 5 | `walling-plaster`  | Walling and plaster         | 15 |
| 6 | `services`         | Windows, doors and services | 12 |
| 7 | `finishes`         | Finishes                    | 13 |
| 8 | `handover`         | Handover                    | 5  |

Weights sum to 100. A test asserts this, so the table cannot be edited into an inconsistent
state without failing CI.

## Sanity — `apps/studio/schemas/constructionMilestone.ts`

A named object type, not an inline anonymous object. Naming it is what lets the shape be
referenced, validated and later mirrored elsewhere.

```ts
defineType({
  name: 'constructionMilestone',
  title: 'Construction milestone',
  type: 'object',
  fields: [
    stage:         string, required, options.list = the 8 values above
    status:        string, required, options.list = done | in-progress | upcoming,
                   initialValue 'upcoming'
    completedDate: date,   shown when status === 'done'
    targetDate:    date,   shown when status !== 'done'
    note:          string, max 160 chars
    photos:        array of image (hotspot: true) with a required `alt` field,
                   mirroring the property `photos` field exactly
  ],
  preview: title = stage label, subtitle = status + date
})
```

Registered in `apps/studio/schemaTypes/index.ts`, which is where the schema array actually
lives — it imports from `../schemas/`. There is no `apps/studio/schemas/index.ts`.

### On `property`

One new field, in the `details` group, placed directly after `unitsAvailable`:

```ts
defineField({
  name: 'constructionMilestones',
  title: 'Construction milestones',
  type: 'array',
  of: [{ type: 'constructionMilestone' }],
  hidden: ({ document }) => !document?.isNewDevelopment,
  validation: rule => rule.custom(list => {
    // a stage may appear at most once
  }),
})
```

`completionPercentage` keeps its field but gains a description saying it is ignored when
milestones are present.

## The portable seam — `apps/web/lib/real-estate/progress.ts`

New pure module. No React, no Sanity imports at all, no I/O.

The photo URL builder arrives as a parameter rather than an import. This is not
fastidiousness: `lib/sanity/image.ts` imports `lib/sanity/client.ts`, which calls
`createClient({ projectId: process.env.NEXT_PUBLIC_SANITY_PROJECT_ID! })` at import time and
throws without env vars. A Vitest file importing this module would fail to load — verified
by probe against the real config. Injecting the builder is also what makes the Supabase-later
story concrete: that caller passes a different one.

```ts
export interface ConstructionStage { value: string; label: string; weight: number }
export const CONSTRUCTION_STAGES: readonly ConstructionStage[]

export type MilestoneStatus = 'done' | 'in-progress' | 'upcoming'

export interface ConstructionMilestone {
  stage: string
  label: string
  status: MilestoneStatus
  completedDate?: string
  targetDate?: string
  note?: string
  photos: { url: string; alt: string }[]
}

export interface ConstructionProgress {
  milestones: ConstructionMilestone[]   // always all 8, canonical order
  percentage: number                    // 0-100, integer
  source: 'computed' | 'manual'
}

export function computePercentage(
  entries: { stage: string; status: MilestoneStatus }[] | null | undefined
): number | null

export function mapConstructionProgress(
  raw: unknown,
  options: {
    /** Turns one raw image object into a URL. */
    photoUrl: (photo: unknown) => string
    /** The hand-typed completionPercentage, used only when there are no milestones. */
    fallbackPercentage?: number | null
  }
): ConstructionProgress | null
```

`computePercentage` scores each stage: `done` earns its full weight, `in-progress` earns
half, `upcoming` earns nothing. The total is rounded to an integer and clamped to 0–100.
Unknown stage values score nothing and are dropped. Input order is irrelevant — output is
always canonical order.

It returns `null`, not `0`, when there is nothing to score — no entries at all, or only
unrecognised stages. Zero is a real answer meaning "nothing has started"; null means "this
listing does not use milestones". Callers must be able to tell those apart in order to fall
back to the manual number, so the distinction is load-bearing rather than stylistic.

`mapConstructionProgress` returns `null` when there is nothing to show. When `raw` holds
milestones it builds all eight (filling unlisted stages as `upcoming` with no dates) and
sets `source: 'computed'`. When `raw` is empty but `options.fallbackPercentage` is a number,
it returns an empty milestone list with that percentage clamped, and `source: 'manual'`,
which is what every already-published listing hits.

**This function is the whole "developer later" hedge.** Moving progress to Supabase changes
what feeds it. Nothing downstream changes.

## Percentage consumers — the projection drift risk

`completionPercentage` is not read only by the detail page. `NewDevelopments.tsx` and the
real-estate hub read it off `PropertyCardData`. If the detail page computes and the cards
keep reading the manual field, a card will say 40% while the detail page says 62%.

This is exactly the failure mode CLAUDE.md documents under "When you add a column to an
existing table". Two projections must change:

- `PROPERTY_CARD_FIELDS` in `lib/sanity/queries.ts` — add
  `"milestoneStages": constructionMilestones[]{ stage, status }`. Deliberately light: cards
  need no dates, notes or photos.
- `PROPERTY_BY_SLUG_QUERY` in `lib/sanity/queries.ts` — add the full
  `constructionMilestones[]{ stage, status, completedDate, targetDate, note, photos[]{ ${IMAGE_FIELDS} } }`.

`mapPropertyToCard` in `lib/real-estate/mappers.ts` then sets
`completionPercentage: computePercentage(p.milestoneStages) ?? p.completionPercentage ?? undefined`.
This is why `computePercentage` must return `null` rather than `0` for an empty input — with
`0` the `??` would never fall through, and every existing listing's hand-typed percentage
would silently become 0% on its card. `PropertyCardData` keeps its existing field name and
shape, so no card component changes.

## Component — `apps/web/components/real-estate/ConstructionTimeline.tsx`

Server component. No `"use client"`, no state, no effects.

Props: `{ progress: ConstructionProgress }`.

Structure, following Option A as approved:

- **Header** — `h2` "Construction progress" with the percentage to its right at display
  weight, then a full-width bar. Bar uses `bg-purple2` on `bg-border`, matching the bar
  already in the Development details card.
- **Rail** — one row per stage. Left column is a status icon over a 2px connector line
  (`Check` in a filled circle for done, a ring for in progress, a hollow dot for upcoming;
  `lucide-react`, already a dependency). Last row has no connector.
- **Row content** — stage label; an "In progress" pill on the active stage; the date line
  ("Completed March 2026" / "Target December 2026" / nothing); the note; then the photo
  strip.
- **Photos** — `next/image` at `width(320).height(220)`, matching how `PropertyCard` and
  `PropertyGallery` already build Sanity URLs. Laid out as a horizontally scrollable strip
  (`overflow-x-auto scrollbar-none`), which is the pattern the category nav already uses.
  Alt text comes from the image's required `alt` field.
- **Empty stages** collapse to just the label in `text-text3`.

Dates render as month and year only (`March 2026`), via `toLocaleDateString("en-KE", {
month: "long", year: "numeric" })`. Day precision on a construction estimate is false
precision.

No past-due highlighting. The page is statically rendered with `revalidate = 3600`, so any
"this date has passed" wording would be comparing against build time rather than now.

## Placement — `app/real-estate/[slug]/PropertyDetail.tsx`

The existing `isNewDevelopment` block changes:

The block becomes two mutually exclusive shapes, decided by `progress.source`:

- **`source === 'computed'`** — a listing with milestones. Developer and Units available
  stay as cards and the grid drops from `sm:grid-cols-3` to `sm:grid-cols-2`; the Completion
  card is not rendered, because the timeline below now owns the percentage and two numbers
  in one section can disagree. `<ConstructionTimeline>` renders under the cards.
- **`source === 'manual'` or `null`** — every listing published so far. The section renders
  exactly as it does today, all three cards including Completion, and no timeline. Nothing
  already published regresses.

The section renders at all only when `isNewDevelopment` is true and at least one of
developer / units / progress is present, as it does today.

## Tests — `apps/web/lib/real-estate/__tests__/progress.test.ts`

Vitest, alongside the six existing real-estate suites.

- `CONSTRUCTION_STAGES` weights sum to exactly 100
- stage values are unique
- all stages upcoming → 0
- all stages done → 100
- a known mid-build set → its expected weighted total
- an in-progress stage earns exactly half its weight
- unknown stage values are ignored rather than throwing
- input in scrambled order produces canonically ordered output
- duplicate stages do not double-count
- no milestones plus a manual percentage → `source: 'manual'`, percentage passed through
- no milestones and no manual percentage → `null`
- a manual percentage above 100 or below 0 is clamped

## Out of scope

Named explicitly so they are not quietly assumed:

- No JSON-LD / structured-data changes.
- No filter or sort by completion in `PropertyBrowser`.
- No "notify me at handover" email or subscription.
- No serviced-plot or land stage track.
- No developer-facing dashboard editor. That is the follow-on this design is shaped for.
- No Supabase migration. Migration counter stays at **093**.

## Verification

- `npx tsc --noEmit` clean.
- `npx vitest run lib/real-estate` — existing 94 tests still pass, plus the new suite.
- Dev server: a property with milestones renders the rail correctly at 375px and at desktop
  width; a new-development property with no milestones still shows the old Completion card;
  a non-new-development property shows no timeline at all.
