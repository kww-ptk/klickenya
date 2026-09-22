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
 * Task 2 feeds it a hand-typed Sanity number field, which can be null, absent,
 * or garbage a host mistyped, as well as arithmetic that could in principle
 * drift outside 0..100. Clamp and round rather than propagate NaN or an
 * out-of-range value into the UI.
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

/**
 * Null, not zero, when there is nothing to score. Zero is a real answer meaning
 * "nothing has started"; null means "this listing does not use milestones", and
 * callers need to tell them apart to fall back to the manual percentage.
 */
export function computePercentage(
  entries:
    | readonly ({ stage?: string | null; status?: string | null } | null | undefined)[]
    | null
    | undefined
): number | null {
  if (!Array.isArray(entries) || entries.length === 0) return null;

  const byStage = indexEntries(entries);
  if (byStage.size === 0) return null;

  let earned = 0;
  for (const stage of CONSTRUCTION_STAGES) {
    const entry = byStage.get(stage.value);
    if (!entry) continue;
    earned += stage.weight * STATUS_CREDIT[toStatus(entry.status)];
  }
  return clampPercent(earned);
}
