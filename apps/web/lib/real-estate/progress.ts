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
  readonly value: string;
  readonly label: string;
  /** Share of the whole build this stage represents. The set sums to 100. */
  readonly weight: number;
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

/**
 * A percentage arrives here from places that don't guarantee a clean number:
 * mapConstructionProgress feeds it the hand-typed completionPercentage off the
 * Sanity document, which can be null, absent, or garbage a host mistyped, as
 * well as arithmetic that could in principle drift outside 0..100. Clamp and
 * round rather than propagate NaN or an out-of-range value into the UI.
 */
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
  entries: readonly (T | null | undefined)[]
): Map<string, T> {
  const byStage = new Map<string, T>();
  for (const entry of entries) {
    if (!entry) continue;
    const stage = entry.stage;
    if (typeof stage === "string" && STAGE_BY_VALUE.has(stage)) {
      byStage.set(stage, entry);
    }
  }
  return byStage;
}

/** The least an entry must carry to be scored. RawMilestone satisfies it. */
interface StageEntry {
  stage?: string | null;
  status?: string | null;
}

/**
 * Null, not zero, when there is nothing to score. Zero is a real answer meaning
 * "nothing has started"; null means "this listing does not use milestones", and
 * callers need to tell them apart to fall back to the manual percentage.
 */
export function computePercentage(
  entries: readonly (StageEntry | null | undefined)[] | null | undefined
): number | null {
  if (!Array.isArray(entries) || entries.length === 0) return null;

  // Array.isArray is typed `(arg: any) => arg is any[]`, so narrowing through
  // it collapses the element type and silently switches off checking for the
  // rest of this function. Re-annotating puts it back.
  const list: readonly (StageEntry | null | undefined)[] = entries;

  const byStage = indexEntries(list);
  if (byStage.size === 0) return null;

  let earned = 0;
  for (const stage of CONSTRUCTION_STAGES) {
    const entry = byStage.get(stage.value);
    if (!entry) continue;
    earned += stage.weight * STATUS_CREDIT[toStatus(entry.status)];
  }
  return clampPercent(earned);
}

/** `alt` is required, not optional: Studio requires it on every photo, and
 *  mapPhotos falls back to a generated string when one is blank, so the
 *  renderer never has to decide whether to show alt text. */
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

/** What one raw image looks like before its URL is resolved. */
interface RawPhoto {
  asset?: unknown;
  alt?: string;
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
  return (raw as RawPhoto[])
    .filter((photo) => Boolean(photo?.asset))
    .map((photo) => ({
      url: photoUrl(photo),
      alt: photo?.alt?.trim() || `${label} progress photo`,
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
  // Nullable elements: GROQ can return an array with holes, and the helpers
  // above already tolerate them. Saying so in the type keeps it honest.
  const entries: (RawMilestone | null | undefined)[] = Array.isArray(raw)
    ? (raw as (RawMilestone | null | undefined)[])
    : [];
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
