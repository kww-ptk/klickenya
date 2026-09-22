# Construction Progress Timeline Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Show a construction progress timeline — eight weighted build stages with status, dates, notes and site photos — on the property detail page of every new-development / off-plan listing, with the completion percentage computed from the stages rather than typed by hand.

**Architecture:** Milestones are a Sanity array field on the `property` document, admin-edited in Studio. All stage knowledge and arithmetic live in one pure module, `lib/real-estate/progress.ts`, which imports nothing from Sanity — that is the seam that lets progress move to a developer-facing Supabase editor later. The detail page renders a server component with no client JavaScript. Card projections get a light `stage`+`status` slice so a listing's percentage cannot differ between its card and its page.

**Tech Stack:** Next.js 15 App Router (React Server Components) · Sanity v3 schemas + GROQ · TypeScript · Tailwind · Vitest · lucide-react · next/image

**Spec:** `docs/superpowers/specs/2026-09-21-construction-progress-timeline-design.md`

---

## Things the engineer needs to know before starting

**Run everything from `apps/web`** unless a step says otherwise. The repo is a pnpm monorepo; `apps/web` is the Next.js app and `apps/studio` is the Sanity Studio.

**Vitest cannot import anything that reaches `lib/sanity/client.ts`.** That module calls `createClient({ projectId: process.env.NEXT_PUBLIC_SANITY_PROJECT_ID! })` at import time and throws without env vars. This was verified by probe, and it is why `progress.ts` takes a `photoUrl` function as a parameter instead of importing `urlForImage` itself. Do not "simplify" that parameter away — it will make the test suite unrunnable. It is also why Task 4 has no unit test: `mappers.ts` imports `urlForImage`, so a test importing it at runtime cannot load. Existing tests only use `import type` from `mappers`.

**Test file location matters.** `vitest.config.ts` has `include: ["lib/**/__tests__/**/*.test.ts"]`. A test outside `lib/**/__tests__/` will not run.

**Sanity schema registration lives in `apps/studio/schemaTypes/index.ts`**, which imports from `../schemas/`. The spec says `apps/studio/schemas/index.ts`; that file does not exist. Use the path in this plan.

**Never push to `main`.** Work stays on `feat/construction-timeline`, which already exists and already holds the spec commit.

**Uncommitted files in the working tree.** Four files from earlier real-estate UI work (`PropertySearchBox.tsx`, `PropertyBrowser.tsx`, `MobileBottomNav.tsx`, `PropertyDetail.tsx`) are modified but uncommitted. Task 6 modifies `PropertyDetail.tsx`. Use targeted `git add <path>` in every commit — never `git add -A` — or you will sweep unrelated work into a commit.

---

## File structure

| File | Responsibility |
|---|---|
| `apps/web/lib/real-estate/progress.ts` | **Create.** Stage table with weights, status vocabulary, `computePercentage`, `mapConstructionProgress`. Pure — no React, no Sanity, no I/O. |
| `apps/web/lib/real-estate/__tests__/progress.test.ts` | **Create.** Unit tests for the above. |
| `apps/studio/schemas/constructionMilestone.ts` | **Create.** The Sanity object type for one milestone. |
| `apps/studio/schemaTypes/index.ts` | **Modify.** Register the new type. |
| `apps/studio/schemas/property.ts` | **Modify.** Add the `constructionMilestones` array field; amend the `completionPercentage` description. |
| `apps/web/lib/sanity/queries.ts` | **Modify.** Add milestones to the card projection (light) and the detail projection (full). |
| `apps/web/lib/real-estate/mappers.ts` | **Modify.** Compute `completionPercentage` from the milestone slice, falling back to the manual field. |
| `apps/web/components/real-estate/ConstructionTimeline.tsx` | **Create.** The vertical-rail server component. |
| `apps/web/app/real-estate/[slug]/PropertyDetail.tsx` | **Modify.** Reshape the Development details block and render the timeline. |

---

### Task 1: Stage table and percentage arithmetic

**Files:**
- Create: `apps/web/lib/real-estate/progress.ts`
- Test: `apps/web/lib/real-estate/__tests__/progress.test.ts`

- [ ] **Step 1: Write the failing test**

Create `apps/web/lib/real-estate/__tests__/progress.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { CONSTRUCTION_STAGES, computePercentage } from "../progress";

describe("CONSTRUCTION_STAGES", () => {
  it("weights sum to exactly 100", () => {
    const total = CONSTRUCTION_STAGES.reduce((sum, s) => sum + s.weight, 0);
    expect(total).toBe(100);
  });

  it("has eight stages with unique values", () => {
    expect(CONSTRUCTION_STAGES).toHaveLength(8);
    const values = CONSTRUCTION_STAGES.map((s) => s.value);
    expect(new Set(values).size).toBe(8);
  });
});

describe("computePercentage", () => {
  const all = (status: string) =>
    CONSTRUCTION_STAGES.map((s) => ({ stage: s.value, status }));

  it("returns null when there are no entries", () => {
    expect(computePercentage([])).toBeNull();
    expect(computePercentage(null)).toBeNull();
    expect(computePercentage(undefined)).toBeNull();
  });

  it("returns null when no entry names a known stage", () => {
    expect(
      computePercentage([{ stage: "landscaping", status: "done" }])
    ).toBeNull();
  });

  it("returns 0 when every stage is upcoming", () => {
    expect(computePercentage(all("upcoming"))).toBe(0);
  });

  it("returns 100 when every stage is done", () => {
    expect(computePercentage(all("done"))).toBe(100);
  });

  it("sums the weights of done stages", () => {
    // groundbreaking 5 + foundation 15 + superstructure 20 = 40
    expect(
      computePercentage([
        { stage: "groundbreaking", status: "done" },
        { stage: "foundation", status: "done" },
        { stage: "superstructure", status: "done" },
        { stage: "roofing", status: "upcoming" },
      ])
    ).toBe(40);
  });

  it("gives an in-progress stage half its weight", () => {
    // groundbreaking 5 done + foundation 15 half = 5 + 7.5 = 12.5, rounded 13
    expect(
      computePercentage([
        { stage: "groundbreaking", status: "done" },
        { stage: "foundation", status: "in-progress" },
      ])
    ).toBe(13);
  });

  it("ignores unknown stages instead of throwing", () => {
    expect(
      computePercentage([
        { stage: "foundation", status: "done" },
        { stage: "feng-shui", status: "done" },
      ])
    ).toBe(15);
  });

  it("does not double-count a repeated stage", () => {
    expect(
      computePercentage([
        { stage: "foundation", status: "done" },
        { stage: "foundation", status: "done" },
      ])
    ).toBe(15);
  });

  it("treats a missing or unrecognised status as upcoming", () => {
    expect(computePercentage([{ stage: "foundation" }])).toBe(0);
    expect(
      computePercentage([{ stage: "foundation", status: "halfway" }])
    ).toBe(0);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run from `apps/web`:

```bash
npx vitest run lib/real-estate/__tests__/progress.test.ts
```

Expected: FAIL — `Failed to resolve import "../progress"`.

- [ ] **Step 3: Write the implementation**

Create `apps/web/lib/real-estate/progress.ts`:

```ts
/**
 * Construction progress for new developments.
 *
 * Everything this module knows — the stage vocabulary, what each stage is
 * worth, how a percentage falls out of them — lives here and nowhere else. It
 * imports nothing from Sanity on purpose: milestones are admin-edited in Studio
 * today, but the intention is a developer-facing editor later, and when that
 * happens only the caller changes. That is also why the photo URL builder
 * arrives as a parameter rather than an import — `lib/sanity/client.ts` throws
 * at import time without env vars, which would make this module untestable.
 */

export interface ConstructionStage {
  value: string;
  label: string;
  /** Share of the whole build this stage represents. The set sums to 100. */
  weight: number;
}

/**
 * Weights are not equal: a foundation is a fifth of the work and a handover is
 * a formality. Equal weights read as dishonest late in a build, where a project
 * needing only finishes would show as three-quarters done.
 */
export const CONSTRUCTION_STAGES: readonly ConstructionStage[] = [
  { value: "groundbreaking", label: "Groundbreaking", weight: 5 },
  { value: "foundation", label: "Foundation", weight: 15 },
  { value: "superstructure", label: "Superstructure", weight: 20 },
  { value: "roofing", label: "Roofing", weight: 15 },
  { value: "walling-plaster", label: "Walling and plaster", weight: 15 },
  { value: "services", label: "Windows, doors and services", weight: 12 },
  { value: "finishes", label: "Finishes", weight: 13 },
  { value: "handover", label: "Handover", weight: 5 },
];

export type MilestoneStatus = "done" | "in-progress" | "upcoming";

/** An in-progress stage earns half. Nothing else is defensible without
 *  per-stage percentages, which is more bookkeeping than an admin will keep up. */
const STATUS_CREDIT: Record<MilestoneStatus, number> = {
  done: 1,
  "in-progress": 0.5,
  upcoming: 0,
};

const STAGE_BY_VALUE = new Map(CONSTRUCTION_STAGES.map((s) => [s.value, s]));

function toStatus(value: unknown): MilestoneStatus {
  return value === "done" || value === "in-progress" ? value : "upcoming";
}

export function clampPercent(n: number): number {
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(100, Math.round(n)));
}

/**
 * Known stages only, one entry each, last occurrence wins. Generic so that the
 * caller keeps whatever fields it passed in — mapConstructionProgress needs the
 * dates and photos back out of this map, and a cast there would be fragile.
 */
function indexEntries<T extends { stage?: string | null }>(
  entries: readonly T[]
): Map<string, T> {
  const byStage = new Map<string, T>();
  for (const entry of entries) {
    const stage = entry?.stage;
    if (typeof stage === "string" && STAGE_BY_VALUE.has(stage)) {
      byStage.set(stage, entry);
    }
  }
  return byStage;
}

/**
 * Null, not zero, when there is nothing to score. Zero is a real answer meaning
 * "nothing has started"; null means "this listing does not use milestones", and
 * callers need to tell them apart to fall back to the manual percentage.
 */
export function computePercentage(
  entries: readonly { stage?: string | null; status?: string | null }[] | null | undefined
): number | null {
  if (!Array.isArray(entries) || entries.length === 0) return null;

  const byStage = indexEntries(entries);
  if (byStage.size === 0) return null;

  let earned = 0;
  for (const [stage, entry] of byStage) {
    const weight = STAGE_BY_VALUE.get(stage)!.weight;
    earned += weight * STATUS_CREDIT[toStatus(entry.status)];
  }
  return clampPercent(earned);
}
```

- [ ] **Step 4: Run the test to verify it passes**

```bash
npx vitest run lib/real-estate/__tests__/progress.test.ts
```

Expected: PASS, 11 tests.

- [ ] **Step 5: Commit**

```bash
git add apps/web/lib/real-estate/progress.ts apps/web/lib/real-estate/__tests__/progress.test.ts
git commit -m "feat(real-estate): weighted construction stage table and percentage

Eight build stages carrying unequal weights, summing to 100, with a
percentage computed from which stages are reached. An in-progress stage
earns half its weight. Returns null rather than zero for a listing with
no milestones, so callers can tell 'nothing started' from 'not using
milestones' and fall back to the hand-typed number.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 2: Normalising milestones into render-ready progress

**Files:**
- Modify: `apps/web/lib/real-estate/progress.ts`
- Test: `apps/web/lib/real-estate/__tests__/progress.test.ts`

- [ ] **Step 1: Write the failing test**

Append to `apps/web/lib/real-estate/__tests__/progress.test.ts`. Also extend the import at the top of the file to:

```ts
import {
  CONSTRUCTION_STAGES,
  computePercentage,
  mapConstructionProgress,
} from "../progress";
```

Then append:

```ts
describe("mapConstructionProgress", () => {
  const photoUrl = (photo: unknown) =>
    `https://cdn.test/${(photo as { ref?: string })?.ref ?? "x"}.jpg`;

  it("returns null with no milestones and no fallback", () => {
    expect(mapConstructionProgress([], { photoUrl })).toBeNull();
    expect(mapConstructionProgress(null, { photoUrl })).toBeNull();
  });

  it("falls back to the manual percentage when there are no milestones", () => {
    const result = mapConstructionProgress([], {
      photoUrl,
      fallbackPercentage: 62,
    });
    expect(result).toEqual({ milestones: [], percentage: 62, source: "manual" });
  });

  it("clamps an out-of-range manual percentage", () => {
    expect(
      mapConstructionProgress([], { photoUrl, fallbackPercentage: 140 })
        ?.percentage
    ).toBe(100);
    expect(
      mapConstructionProgress([], { photoUrl, fallbackPercentage: -20 })
        ?.percentage
    ).toBe(0);
  });

  it("ignores the manual percentage once milestones exist", () => {
    const result = mapConstructionProgress(
      [{ stage: "foundation", status: "done" }],
      { photoUrl, fallbackPercentage: 99 }
    );
    expect(result?.source).toBe("computed");
    expect(result?.percentage).toBe(15);
  });

  it("returns all eight stages in canonical order whatever the input order", () => {
    const result = mapConstructionProgress(
      [
        { stage: "roofing", status: "done" },
        { stage: "foundation", status: "done" },
      ],
      { photoUrl }
    );
    expect(result?.milestones.map((m) => m.stage)).toEqual(
      CONSTRUCTION_STAGES.map((s) => s.value)
    );
  });

  it("fills unlisted stages as upcoming with no dates", () => {
    const result = mapConstructionProgress(
      [{ stage: "foundation", status: "done", completedDate: "2026-03-04" }],
      { photoUrl }
    );
    const handover = result?.milestones.find((m) => m.stage === "handover");
    expect(handover).toMatchObject({
      status: "upcoming",
      label: "Handover",
      photos: [],
    });
    expect(handover?.completedDate).toBeUndefined();
    expect(handover?.targetDate).toBeUndefined();
  });

  it("keeps completedDate only on done stages and targetDate only on the rest", () => {
    const result = mapConstructionProgress(
      [
        {
          stage: "foundation",
          status: "done",
          completedDate: "2026-03-04",
          targetDate: "2026-02-01",
        },
        {
          stage: "handover",
          status: "upcoming",
          completedDate: "2027-01-01",
          targetDate: "2026-12-01",
        },
      ],
      { photoUrl }
    );
    const foundation = result?.milestones.find((m) => m.stage === "foundation");
    const handover = result?.milestones.find((m) => m.stage === "handover");
    expect(foundation?.completedDate).toBe("2026-03-04");
    expect(foundation?.targetDate).toBeUndefined();
    expect(handover?.targetDate).toBe("2026-12-01");
    expect(handover?.completedDate).toBeUndefined();
  });

  it("builds photo urls through the injected resolver and drops assetless entries", () => {
    const result = mapConstructionProgress(
      [
        {
          stage: "roofing",
          status: "done",
          photos: [
            { asset: { _id: "a" }, ref: "one", alt: "New roof trusses" },
            { alt: "no asset, dropped" },
            { asset: { _id: "b" }, ref: "two" },
          ],
        },
      ],
      { photoUrl }
    );
    const roofing = result?.milestones.find((m) => m.stage === "roofing");
    expect(roofing?.photos).toEqual([
      { url: "https://cdn.test/one.jpg", alt: "New roof trusses" },
      { url: "https://cdn.test/two.jpg", alt: "Roofing progress photo" },
    ]);
  });

  it("drops an empty note rather than rendering a blank line", () => {
    const result = mapConstructionProgress(
      [{ stage: "finishes", status: "in-progress", note: "   " }],
      { photoUrl }
    );
    expect(
      result?.milestones.find((m) => m.stage === "finishes")?.note
    ).toBeUndefined();
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

```bash
npx vitest run lib/real-estate/__tests__/progress.test.ts
```

Expected: FAIL — `mapConstructionProgress is not a function` (or a TypeScript resolution error on the import).

- [ ] **Step 3: Write the implementation**

Append to `apps/web/lib/real-estate/progress.ts`:

```ts
export interface ConstructionPhoto {
  url: string;
  alt: string;
}

export interface ConstructionMilestone {
  stage: string;
  label: string;
  status: MilestoneStatus;
  /** Set only when status is "done". */
  completedDate?: string;
  /** Set only when status is not "done". */
  targetDate?: string;
  note?: string;
  photos: ConstructionPhoto[];
}

export interface ConstructionProgress {
  /** Always all eight stages, canonical order, whatever the admin entered. */
  milestones: ConstructionMilestone[];
  percentage: number;
  source: "computed" | "manual";
}

/** The shape a milestone arrives in, whether from GROQ or anywhere later. */
interface RawMilestone {
  stage?: string | null;
  status?: string | null;
  completedDate?: string | null;
  targetDate?: string | null;
  note?: string | null;
  photos?: unknown;
}

export interface MapProgressOptions {
  /** Turns one raw image object into a URL. Injected so this module stays free
   *  of the Sanity client, which throws at import time without env vars. */
  photoUrl: (photo: unknown) => string;
  /** The hand-typed completionPercentage, used only when there are no milestones. */
  fallbackPercentage?: number | null;
}

function mapPhotos(
  raw: unknown,
  label: string,
  photoUrl: (photo: unknown) => string
): ConstructionPhoto[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((photo) => Boolean((photo as { asset?: unknown })?.asset))
    .map((photo) => ({
      url: photoUrl(photo),
      alt:
        (photo as { alt?: string })?.alt?.trim() || `${label} progress photo`,
    }));
}

/**
 * Null when there is nothing worth rendering. Otherwise either a computed
 * timeline, or — for every listing published before milestones existed — the
 * hand-typed percentage with an empty milestone list.
 */
export function mapConstructionProgress(
  raw: unknown,
  options: MapProgressOptions
): ConstructionProgress | null {
  const entries: RawMilestone[] = Array.isArray(raw) ? (raw as RawMilestone[]) : [];
  const computed = computePercentage(entries);

  if (computed == null) {
    const fallback = options.fallbackPercentage;
    if (typeof fallback !== "number" || !Number.isFinite(fallback)) return null;
    return { milestones: [], percentage: clampPercent(fallback), source: "manual" };
  }

  const byStage = indexEntries(entries);

  const milestones = CONSTRUCTION_STAGES.map<ConstructionMilestone>((stage) => {
    const entry = byStage.get(stage.value);
    const status = toStatus(entry?.status);
    return {
      stage: stage.value,
      label: stage.label,
      status,
      completedDate:
        status === "done" ? entry?.completedDate || undefined : undefined,
      targetDate:
        status === "done" ? undefined : entry?.targetDate || undefined,
      note: entry?.note?.trim() || undefined,
      photos: mapPhotos(entry?.photos, stage.label, options.photoUrl),
    };
  });

  return { milestones, percentage: computed, source: "computed" };
}
```

- [ ] **Step 4: Run the test to verify it passes**

```bash
npx vitest run lib/real-estate/__tests__/progress.test.ts
```

Expected: PASS, 20 tests.

- [ ] **Step 5: Typecheck**

```bash
npx tsc --noEmit
```

Expected: no output.

- [ ] **Step 6: Commit**

```bash
git add apps/web/lib/real-estate/progress.ts apps/web/lib/real-estate/__tests__/progress.test.ts
git commit -m "feat(real-estate): normalise milestones into render-ready progress

Always emits all eight stages in canonical order, so a timeline never
looks half-built because an admin only filled in three. Dates are kept
on the side of the status that makes sense for them. The photo URL
builder is injected rather than imported, which keeps this module free
of the Sanity client and therefore testable.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 3: Sanity schema

**Files:**
- Create: `apps/studio/schemas/constructionMilestone.ts`
- Modify: `apps/studio/schemaTypes/index.ts`
- Modify: `apps/studio/schemas/property.ts`

There is no test here — Sanity schemas are declarative config with no test harness in this repo. Verification is Studio starting cleanly and the field appearing.

- [ ] **Step 1: Create the milestone object type**

Create `apps/studio/schemas/constructionMilestone.ts`:

```ts
import { defineType, defineField } from 'sanity'

/**
 * One stage of a build, for the construction timeline on a new-development
 * listing. The stage list is fixed and mirrors CONSTRUCTION_STAGES in
 * apps/web/lib/real-estate/progress.ts — the web app computes the completion
 * percentage from these values, so a value added here that is missing there
 * scores nothing and silently drags the percentage down. Change both together.
 */
const STAGES = [
  { title: 'Groundbreaking', value: 'groundbreaking' },
  { title: 'Foundation', value: 'foundation' },
  { title: 'Superstructure', value: 'superstructure' },
  { title: 'Roofing', value: 'roofing' },
  { title: 'Walling and plaster', value: 'walling-plaster' },
  { title: 'Windows, doors and services', value: 'services' },
  { title: 'Finishes', value: 'finishes' },
  { title: 'Handover', value: 'handover' },
]

export default defineType({
  name: 'constructionMilestone',
  title: 'Construction milestone',
  type: 'object',
  fields: [
    defineField({
      name: 'stage',
      title: 'Stage',
      type: 'string',
      options: { list: STAGES },
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'status',
      title: 'Status',
      type: 'string',
      options: {
        list: [
          { title: 'Done', value: 'done' },
          { title: 'In progress', value: 'in-progress' },
          { title: 'Upcoming', value: 'upcoming' },
        ],
        layout: 'radio',
      },
      initialValue: 'upcoming',
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'completedDate',
      title: 'Completed on',
      description: 'Shown to buyers as month and year only.',
      type: 'date',
      hidden: ({ parent }: { parent?: { status?: string } }) =>
        parent?.status !== 'done',
    }),
    defineField({
      name: 'targetDate',
      title: 'Target date',
      description:
        'Estimated, and labelled as such on the page. Shown to buyers as month and year only.',
      type: 'date',
      hidden: ({ parent }: { parent?: { status?: string } }) =>
        parent?.status === 'done',
    }),
    defineField({
      name: 'note',
      title: 'Note',
      description:
        'One sentence of context, e.g. "Units 1-4 roofed, 5-8 to follow". Optional.',
      type: 'string',
      validation: (rule) => rule.max(160),
    }),
    defineField({
      name: 'photos',
      title: 'Site photos',
      type: 'array',
      of: [
        {
          type: 'image',
          options: { hotspot: true },
          fields: [
            {
              name: 'alt',
              title: 'Alt Text',
              type: 'string',
              validation: (rule: any) => rule.required(),
            },
          ],
        },
      ],
    }),
  ],
  preview: {
    select: {
      stage: 'stage',
      status: 'status',
      completedDate: 'completedDate',
      targetDate: 'targetDate',
      media: 'photos.0',
    },
    prepare({ stage, status, completedDate, targetDate, media }: any) {
      const label = STAGES.find((s) => s.value === stage)?.title ?? 'Stage'
      const date = status === 'done' ? completedDate : targetDate
      return {
        title: label,
        subtitle: [status, date].filter(Boolean).join(' · '),
        media,
      }
    },
  },
})
```

- [ ] **Step 2: Register the type**

In `apps/studio/schemaTypes/index.ts`, add the import after the `homePage` import:

```ts
import constructionMilestone from '../schemas/constructionMilestone'
```

and add `constructionMilestone,` to the `schemaTypes` array, immediately after `homePage,`.

- [ ] **Step 3: Add the field to `property`**

In `apps/studio/schemas/property.ts`, find the `unitsAvailable` field (it ends with `group: 'details',\n    }),`) and insert this new field directly after it:

```ts
    defineField({
      name: 'constructionMilestones',
      title: 'Construction milestones',
      description:
        'Build stages shown as a timeline on the listing page. Adding any milestone here makes the completion percentage computed from these stages — the Completion % field above is then ignored.',
      type: 'array',
      of: [{ type: 'constructionMilestone' }],
      hidden: ({document}: {document: {isNewDevelopment?: boolean}}) => !document?.isNewDevelopment,
      validation: (rule) =>
        rule.custom((milestones: any) => {
          if (!Array.isArray(milestones)) return true
          const seen = new Set<string>()
          for (const m of milestones) {
            if (!m?.stage) continue
            if (seen.has(m.stage)) return `Stage "${m.stage}" appears more than once`
            seen.add(m.stage)
          }
          return true
        }),
      group: 'details',
    }),
```

- [ ] **Step 4: Amend the `completionPercentage` description**

In the same file, the `completionPercentage` field currently reads:

```ts
      description: 'Completion % for new developments',
```

Replace that line with:

```ts
      description:
        'Completion % for new developments. Ignored once Construction milestones below are filled in — the timeline computes the percentage from the stages instead.',
```

- [ ] **Step 5: Verify Studio compiles**

Run from the repo root:

```bash
pnpm --filter @klickenya/studio build
```

Expected: build succeeds. If it reports an unknown type `constructionMilestone`, Step 2 was missed.

- [ ] **Step 6: Commit**

```bash
git add apps/studio/schemas/constructionMilestone.ts apps/studio/schemaTypes/index.ts apps/studio/schemas/property.ts
git commit -m "feat(studio): construction milestone type and property field

A fixed eight-stage vocabulary matching CONSTRUCTION_STAGES in the web
app, each stage carrying a status, the date that matches that status, a
note and site photos. Validation blocks a stage appearing twice, which
would otherwise be ambiguous to score. The field hides unless the
listing is flagged as a new development, as the other development fields
already do.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 4: GROQ projections and the card percentage

**Files:**
- Modify: `apps/web/lib/sanity/queries.ts`
- Modify: `apps/web/lib/real-estate/mappers.ts`

No unit test. `mappers.ts` imports `urlForImage`, which reaches `lib/sanity/client.ts` and throws at import time without env vars, so a Vitest file importing it at runtime cannot load — this was verified by probe. The arithmetic it calls is already covered by Task 1. Behaviour is confirmed in the browser in Task 7.

**Why this task exists at all:** `completionPercentage` is read by `NewDevelopments.tsx` and the real-estate hub off `PropertyCardData`, not just by the detail page. If the detail page computes and the cards keep reading the manual field, a card will say one number while the page says another. This is the projection-drift failure CLAUDE.md documents.

- [ ] **Step 1: Add the light slice to the card projection**

In `apps/web/lib/sanity/queries.ts`, find the `PROPERTY_CARD_FIELDS` block — it contains the lines `completionPercentage,` / `developerName,` / `unitsAvailable,` followed by `"photoCount": count(photos),`.

Insert after `unitsAvailable,`:

```
  "milestoneStages": constructionMilestones[]{ stage, status },
```

Deliberately light — cards need no dates, notes or photos, and this projection is fetched for every property in a grid.

- [ ] **Step 2: Add the full slice to the detail projection**

In the same file, find `PROPERTY_BY_SLUG_QUERY`. It contains the same three lines followed by `seoTitle,`.

Insert after `unitsAvailable,`:

```
    constructionMilestones[]{
      stage,
      status,
      completedDate,
      targetDate,
      note,
      photos[]{ ${IMAGE_FIELDS} }
    },
```

`IMAGE_FIELDS` is already defined at the top of the file and is already interpolated the same way elsewhere in this query (`photos[]{ ${IMAGE_FIELDS} }`).

- [ ] **Step 3: Compute the card percentage**

In `apps/web/lib/real-estate/mappers.ts`, add to the imports at the top:

```ts
import { computePercentage } from "./progress";
```

Then in `mapPropertyToCard`, replace this line:

```ts
    completionPercentage: p.completionPercentage ?? undefined,
```

with:

```ts
    // Computed when the listing has milestones, so a card can never disagree
    // with its own detail page. computePercentage returns null — not 0 — for a
    // listing without milestones, which is what lets this fall through to the
    // hand-typed number instead of showing every old listing as 0%.
    completionPercentage:
      computePercentage(p.milestoneStages) ?? p.completionPercentage ?? undefined,
```

- [ ] **Step 4: Typecheck**

```bash
npx tsc --noEmit
```

Expected: no output.

- [ ] **Step 5: Run the full real-estate suite**

```bash
npx vitest run lib/real-estate
```

Expected: PASS — 94 pre-existing tests plus the 20 from Tasks 1 and 2.

- [ ] **Step 6: Commit**

```bash
git add apps/web/lib/sanity/queries.ts apps/web/lib/real-estate/mappers.ts
git commit -m "feat(real-estate): compute card completion from milestones

Both property projections now carry milestones — a light stage+status
slice for cards, the full shape for the detail page. Without the card
slice a grid card would keep rendering the hand-typed percentage while
its own detail page rendered a computed one, which is the projection
drift CLAUDE.md warns about.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 5: The timeline component

**Files:**
- Create: `apps/web/components/real-estate/ConstructionTimeline.tsx`

No unit test. The repo has no component test harness — `vitest.config.ts` restricts `include` to `lib/**/__tests__/**` and runs in the `node` environment with no React testing library installed. Adding one is out of scope for this feature. Verification is visual, in Task 7.

- [ ] **Step 1: Write the component**

Create `apps/web/components/real-estate/ConstructionTimeline.tsx`:

```tsx
import Image from "next/image";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";
import type {
  ConstructionMilestone,
  ConstructionProgress,
} from "@/lib/real-estate/progress";

/**
 * Construction progress for a new development, as a vertical rail.
 *
 * Every stage renders, including ones the admin has not filled in. A timeline
 * showing only the three stages someone bothered to enter looks half-built;
 * showing all eight gives the buyer the whole roadmap and makes the gaps read
 * as "not there yet" rather than "not recorded".
 *
 * Server component on purpose — no state, no effects. The page is statically
 * rendered with revalidate = 3600, so every stage stays in the HTML for
 * indexing and nothing waits on hydration.
 */

interface ConstructionTimelineProps {
  progress: ConstructionProgress;
}

/** Month and year only. Day precision on a construction estimate is a fiction. */
function formatMilestoneDate(value: string): string | null {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleDateString("en-KE", { month: "long", year: "numeric" });
}

function dateLine(milestone: ConstructionMilestone): string | null {
  if (milestone.status === "done" && milestone.completedDate) {
    const formatted = formatMilestoneDate(milestone.completedDate);
    return formatted ? `Completed ${formatted}` : null;
  }
  if (milestone.status !== "done" && milestone.targetDate) {
    const formatted = formatMilestoneDate(milestone.targetDate);
    return formatted ? `Target ${formatted}` : null;
  }
  return null;
}

function StageMarker({ status }: { status: ConstructionMilestone["status"] }) {
  if (status === "done") {
    return (
      <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-purple2 text-white">
        <Check className="size-3.5" strokeWidth={3} />
      </span>
    );
  }
  if (status === "in-progress") {
    return (
      <span className="flex size-6 shrink-0 items-center justify-center rounded-full border-[3px] border-purple2 bg-white" />
    );
  }
  return (
    <span className="flex size-6 shrink-0 items-center justify-center rounded-full border-2 border-border bg-white" />
  );
}

function ConstructionTimeline({ progress }: ConstructionTimelineProps) {
  const { milestones, percentage } = progress;
  if (milestones.length === 0) return null;

  return (
    <div className="rounded-[20px] border border-border bg-surface p-5 sm:p-6">
      <div className="mb-2 flex items-baseline justify-between gap-4">
        <h3 className="text-[15px] font-bold text-text">Construction progress</h3>
        <p className="text-[20px] font-bold leading-none text-purple2">
          {percentage}%
        </p>
      </div>

      <div
        className="mb-6 h-2 overflow-hidden rounded-full bg-border"
        role="progressbar"
        aria-valuenow={percentage}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label="Construction completion"
      >
        <div
          className="h-full rounded-full bg-purple2"
          style={{ width: `${percentage}%` }}
        />
      </div>

      <ol className="flex flex-col">
        {milestones.map((milestone, i) => {
          const isLast = i === milestones.length - 1;
          const date = dateLine(milestone);
          const isUpcoming = milestone.status === "upcoming";

          return (
            <li key={milestone.stage} className="flex gap-3.5">
              {/* Marker column, with the connector running to the next stage. */}
              <div className="flex flex-col items-center">
                <StageMarker status={milestone.status} />
                {!isLast && (
                  <div
                    className={cn(
                      "w-0.5 flex-1",
                      milestone.status === "done" ? "bg-purple2/35" : "bg-border"
                    )}
                  />
                )}
              </div>

              <div className={cn("min-w-0 flex-1", isLast ? "pb-0" : "pb-6")}>
                <div className="flex flex-wrap items-center gap-2">
                  <span
                    className={cn(
                      "text-[15px] font-semibold",
                      isUpcoming ? "text-text3" : "text-text"
                    )}
                  >
                    {milestone.label}
                  </span>
                  {milestone.status === "in-progress" && (
                    <span className="rounded-full bg-purple2/10 px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wide text-purple2">
                      In progress
                    </span>
                  )}
                </div>

                {date && (
                  <p className="mt-0.5 text-[13.5px] text-text3">{date}</p>
                )}

                {milestone.note && (
                  <p className="mt-1.5 text-[14px] leading-relaxed text-text2">
                    {milestone.note}
                  </p>
                )}

                {milestone.photos.length > 0 && (
                  <div className="-mx-1 mt-3 flex gap-2 overflow-x-auto px-1 pb-1 scrollbar-none">
                    {milestone.photos.map((photo) => (
                      <div
                        key={photo.url}
                        className="relative aspect-[3/2] w-[148px] shrink-0 overflow-hidden rounded-[14px] bg-surface2"
                      >
                        <Image
                          src={photo.url}
                          alt={photo.alt}
                          fill
                          className="object-cover"
                          sizes="148px"
                        />
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
}

export { ConstructionTimeline };
export type { ConstructionTimelineProps };
```

- [ ] **Step 2: Typecheck**

```bash
npx tsc --noEmit
```

Expected: no output.

- [ ] **Step 3: Lint**

```bash
npx eslint components/real-estate/ConstructionTimeline.tsx
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add apps/web/components/real-estate/ConstructionTimeline.tsx
git commit -m "feat(real-estate): construction timeline component

A vertical rail carrying all eight stages, each with its status marker,
date, note and a scrollable photo strip. Server component with no client
JavaScript, so every stage stays in the static HTML for indexing. Stages
with nothing recorded collapse to a muted label rather than vanishing.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 6: Wire it into the property page

**Files:**
- Modify: `apps/web/app/real-estate/[slug]/PropertyDetail.tsx`

Remember this file already has uncommitted changes from earlier work. Stage it by exact path.

- [ ] **Step 1: Add the imports**

In `apps/web/app/real-estate/[slug]/PropertyDetail.tsx`, add after the `SavePropertyButton` import (around line 28):

```ts
import { ConstructionTimeline } from "@/components/real-estate/ConstructionTimeline";
```

and after the `toCurrency` import (around line 57):

```ts
import { mapConstructionProgress } from "@/lib/real-estate/progress";
```

- [ ] **Step 2: Build the progress object**

Find the block that builds `photos` (around line 85):

```ts
  const photos: GalleryPhoto[] = (property.photos ?? [])
    .filter((p: any) => p?.asset)
    .map((p: any) => ({
      url: urlForImage(p).width(1600).url(),
      alt: p.alt || property.title,
    }));
```

Insert directly after it:

```ts
  // Computed from milestones when the listing has them, otherwise the
  // hand-typed percentage, otherwise null and the section below shows nothing.
  const progress = property.isNewDevelopment
    ? mapConstructionProgress(property.constructionMilestones, {
        photoUrl: (photo) => urlForImage(photo as never).width(320).height(220).url(),
        fallbackPercentage: property.completionPercentage,
      })
    : null;
```

- [ ] **Step 3: Replace the Development details block**

Find the whole existing block, which begins:

```tsx
            {property.isNewDevelopment &&
              (property.developerName ||
```

and ends with the `<hr className="mb-7 border-border" />` and closing `)}` before the `{property.lat != null && property.lng != null && (` line.

Replace that entire block with:

```tsx
            {property.isNewDevelopment &&
              (property.developerName ||
                property.unitsAvailable != null ||
                progress) && (
                <>
                  <section className="mb-7">
                    <h2 className="font-display mb-5 text-[22px] font-bold tracking-[-0.02em] text-dark">
                      Development details
                    </h2>
                    {/* The Completion card only appears when there is no
                        timeline. With one, the timeline owns the percentage —
                        two numbers in one section can disagree. */}
                    <dl
                      className={cn(
                        "grid grid-cols-1 gap-4",
                        progress?.source === "computed"
                          ? "sm:grid-cols-2"
                          : "sm:grid-cols-3"
                      )}
                    >
                      {property.developerName && (
                        <div className="rounded-[18px] border border-border bg-surface p-4">
                          <dt className="text-[12px] font-bold uppercase tracking-wide text-text3">
                            Developer
                          </dt>
                          <dd className="mt-1 text-[15px] font-semibold text-text">
                            {property.developerName}
                          </dd>
                        </div>
                      )}
                      {progress?.source === "manual" && (
                        <div className="rounded-[18px] border border-border bg-surface p-4">
                          <dt className="text-[12px] font-bold uppercase tracking-wide text-text3">
                            Completion
                          </dt>
                          <dd className="mt-1 text-[15px] font-semibold text-text">
                            {progress.percentage}%
                          </dd>
                          <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-border">
                            <div
                              className="h-full rounded-full bg-purple2"
                              style={{ width: `${progress.percentage}%` }}
                            />
                          </div>
                        </div>
                      )}
                      {property.unitsAvailable != null && (
                        <div className="rounded-[18px] border border-border bg-surface p-4">
                          <dt className="text-[12px] font-bold uppercase tracking-wide text-text3">
                            Units available
                          </dt>
                          <dd className="mt-1 text-[15px] font-semibold text-text">
                            {property.unitsAvailable}
                          </dd>
                        </div>
                      )}
                    </dl>

                    {progress?.source === "computed" && (
                      <div className="mt-5">
                        <ConstructionTimeline progress={progress} />
                      </div>
                    )}
                  </section>
                  <hr className="mb-7 border-border" />
                </>
              )}
```

`cn` is already imported in this file (line 16).

- [ ] **Step 4: Typecheck**

```bash
npx tsc --noEmit
```

Expected: no output.

- [ ] **Step 5: Run the full test suite**

```bash
npx vitest run
```

Expected: all suites pass.

- [ ] **Step 6: Commit**

```bash
git add "apps/web/app/real-estate/[slug]/PropertyDetail.tsx"
git commit -m "feat(real-estate): render the construction timeline on property pages

The Development details block now shows the timeline when a listing has
milestones, and drops its Completion card in that case so the page
carries one percentage rather than two that can disagree. A listing
without milestones renders exactly as it did before.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 7: End-to-end verification

**Files:** none modified. This task proves the feature works against real rendering.

The dev server cannot be started with the `preview_start` tool in this environment — its shell fails to resolve the working directory. Start it with a backgrounded Bash command instead, as was done earlier in this session.

- [ ] **Step 1: Start the dev server**

From `apps/web`, backgrounded:

```bash
npx next dev -p 3010
```

Wait for `Ready in`. Confirm with:

```bash
curl -s -o /dev/null -w "%{http_code}" http://localhost:3010/real-estate
```

Expected: `200`.

- [ ] **Step 2: Confirm nothing regressed for existing listings**

No property in the dataset has milestones yet, so every new development must look exactly as it did before this branch.

Open `http://localhost:3010/real-estate/new-developments`, then open a new-development property — `Sunset Dream Compound` is one, reachable from `/real-estate/for-sale`.

Expected: the Development details section shows three cards including Completion with its bar, and no timeline. Its percentage matches the one on its card in the grid.

- [ ] **Step 3: Add milestones to one property in Studio**

This environment cannot reach `api.sanity.io`, so the user runs Studio locally:

```bash
pnpm --filter @klickenya/studio dev
```

In Studio, open a property with `New development / off-plan` enabled, fill in four or five milestones with a mix of done / in progress / upcoming, at least one note, at least one dated stage, and photos on at least one stage. Publish.

If you cannot reach Studio, ask the user to do this step and to confirm when the document is published — the remaining steps cannot be verified without real data.

- [ ] **Step 4: Verify the timeline renders**

Reload that property's page. Expected:

- All eight stages appear in canonical order, not just the ones filled in.
- Done stages show a filled purple check marker and "Completed <Month Year>".
- The in-progress stage shows a ring marker and an "In progress" pill.
- Upcoming stages are muted, and show "Target <Month Year>" only where a target date was set.
- The percentage above the bar equals the sum of the weights you entered — check it by hand against the stage table in `progress.ts`.
- The Completion card is gone from the cards row; Developer and Units available remain, now two across.

- [ ] **Step 5: Verify the card agrees with the page**

Go back to `/real-estate/new-developments` and find that property's card.

Expected: the card's percentage is the same computed number as the detail page, not the old hand-typed one. If they differ, the card projection in Task 4 Step 1 is wrong or missing.

- [ ] **Step 6: Verify mobile**

Set the viewport to 375×812 and reload the property page.

Expected: the rail is legible with no horizontal page scroll; the photo strip scrolls sideways on its own; no text is clipped.

- [ ] **Step 7: Check the console**

Read the browser console for errors. Expected: none. In particular, no `next/image` hostname errors — Sanity's CDN is already configured for the existing gallery, so this should be clean, and an error here means the URL builder in Task 6 Step 2 produced something malformed.

- [ ] **Step 8: Stop the dev server and confirm the branch is clean**

```bash
git status --short
```

Expected: the four unrelated files from earlier work may still show as modified. No file touched by this plan should be uncommitted.

---

## Definition of done

- `npx tsc --noEmit` clean.
- `npx vitest run` passes, including 20 new tests in `progress.test.ts`.
- `pnpm --filter @klickenya/studio build` succeeds.
- A property with milestones renders the timeline, and its percentage matches on card and page.
- A new-development property without milestones renders exactly as it did before this branch.
- A property that is not a new development renders no timeline and no Development details section.
