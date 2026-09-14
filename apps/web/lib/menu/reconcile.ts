/**
 * Reconcile an imported menu against the one already in the database.
 *
 * Why this exists: the importer used to append. Committing twice gave you two
 * "Starters", so it could only ever be used once — an owner whose prices moved
 * had to delete the menu and start again. Deleting is not free:
 *
 *   order_items.menu_item_id   ON DELETE SET NULL   — order history loses its link
 *   item_option_groups         ON DELETE CASCADE    — extras/sizes are destroyed
 *   recipes                    ON DELETE CASCADE    — Klickenya Kitchen stock link
 *
 * So the rule is: a dish that is still on the menu keeps its row, even when it
 * has been renamed. Renames are real — a single Tribal Table import had five of
 * them, and a name-match-only pass would have deleted every one.
 *
 * This module is pure. The database work lives in app/api/menu/import/route.ts.
 */

/* ── Types ──────────────────────────────────────────── */

export interface ExistingItem {
  id: string;
  name: string;
  description: string | null;
  price_kes: number;
  dietary_tags: string[];
  display_order: number;
}

export interface ExistingSection {
  id: string;
  title: string;
  display_order: number;
  items: ExistingItem[];
}

export interface IncomingItem {
  name: string;
  description: string;
  price_kes: number;
  dietary_tags: string[];
}

export interface IncomingSection {
  title: string;
  items: IncomingItem[];
}

export interface ItemPatch {
  name?: string;
  description?: string | null;
  price_kes?: number;
  dietary_tags?: string[];
  display_order?: number;
}

export interface ItemUpdate {
  id: string;
  previousName: string;
  /** Only the fields that actually differ. Never empty. */
  patch: ItemPatch;
  renamed: boolean;
  /** Similarity of the two names, 0–1. Exactly 1 when not a rename. */
  confidence: number;
  /** A rename the owner should confirm before it is written. */
  needsReview: boolean;
}

export interface ItemCreate extends IncomingItem {
  display_order: number;
}

export interface SectionPlan {
  title: string;
  /** null when the section does not exist yet. */
  sectionId: string | null;
  displayOrder: number;
  /** null when the section row itself needs no change. */
  sectionPatch: { display_order: number } | null;
  creates: ItemCreate[];
  updates: ItemUpdate[];
  deletes: Array<{ id: string; name: string }>;
}

export interface DeletedSection {
  id: string;
  title: string;
  itemIds: string[];
  itemCount: number;
}

export interface ReconcilePlan {
  sections: SectionPlan[];
  deletedSections: DeletedSection[];
  counts: {
    sectionsCreated: number;
    sectionsKept: number;
    sectionsDeleted: number;
    itemsCreated: number;
    itemsUpdated: number;
    itemsRenamed: number;
    itemsDeleted: number;
  };
}

/* ── Name folding ───────────────────────────────────── */

/**
 * Fold the differences that are typography rather than identity: case,
 * whitespace, smart quotes, dashes, accents. Two names that fold to the same
 * string are the same dish.
 */
export function normaliseName(raw: string): string {
  return raw
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")            // strip combining accents
    .replace(/[‘’‛]/g, "'")      // ‘ ’ ‛  →  '
    .replace(/[“”‟]/g, '"')      // “ ” ‟  →  "
    .replace(/[‐-―]/g, "-")           // ‐ – — ―  →  -
    .toLowerCase()
    .trim()
    .replace(/\s+/g, " ");
}

/* ── Similarity ─────────────────────────────────────── */

/**
 * Sørensen–Dice coefficient over character bigrams, in [0, 1].
 *
 * Chosen over edit distance because menu renames are overwhelmingly additive —
 * "Chicken Burger" becomes "Peri-Peri Chicken Burger" — and Dice barely
 * punishes a prepended qualifier, where a length-normalised edit distance does.
 */
export function similarity(a: string, b: string): number {
  const x = normaliseName(a);
  const y = normaliseName(b);
  if (!x || !y) return 0;
  if (x === y) return 1;
  if (x.length === 1 || y.length === 1) return 0;

  const bigrams = (s: string) => {
    const m = new Map<string, number>();
    for (let i = 0; i < s.length - 1; i++) {
      const g = s.slice(i, i + 2);
      m.set(g, (m.get(g) ?? 0) + 1);
    }
    return m;
  };

  const ga = bigrams(x);
  const gb = bigrams(y);
  let shared = 0;
  for (const [g, countA] of ga) shared += Math.min(countA, gb.get(g) ?? 0);

  const total = x.length - 1 + (y.length - 1);
  return total === 0 ? 0 : (2 * shared) / total;
}

/**
 * Below this, two names are different dishes rather than a rename.
 *
 * Calibrated on real data: the loosest true rename we have seen is
 * "Garlic King Prawns" → "Coastal Garlic Butter Prawns"; the closest true
 * non-pair is "Lobster & Chips" vs "Swahili Paneer Curry". The gap between
 * them is wide, and this sits in it. Getting this wrong in the lenient
 * direction silently rewrites one dish into another, so prefer a missed
 * rename (a delete plus an insert, which the owner can see) over a false one.
 */
export const RENAME_THRESHOLD = 0.4;

/**
 * A rename at or above this is obvious enough to apply quietly; below it the
 * owner is asked to confirm. Drinks lists are the reason: two different wines
 * sharing "- Argentina (Bottle)" score highly on boilerplate alone, and no
 * threshold can tell a rename from a substitution. Confirmation can.
 */
export const RENAME_OBVIOUS = 0.75;

/**
 * When the runner-up scores within this of the winner, the pairing is a coin
 * flip. Guessing would silently rewrite one dish into another, so we decline
 * and let the owner see a removal and an addition instead.
 */
export const AMBIGUITY_MARGIN = 0.08;

/* ── Field diffing ──────────────────────────────────── */

const cleanDescription = (d: string | null | undefined): string | null => {
  const t = (d ?? "").trim();
  return t === "" ? null : t;
};

const sameTags = (a: string[], b: string[]): boolean => {
  if (a.length !== b.length) return false;
  const sa = [...a].sort();
  const sb = [...b].sort();
  return sa.every((t, i) => t === sb[i]);
};

function diffItem(before: ExistingItem, after: IncomingItem, displayOrder: number): ItemPatch {
  const patch: ItemPatch = {};
  if (before.name !== after.name) patch.name = after.name;

  const desc = cleanDescription(after.description);
  if (cleanDescription(before.description) !== desc) patch.description = desc;

  if (Number(before.price_kes) !== after.price_kes) patch.price_kes = after.price_kes;
  if (!sameTags(before.dietary_tags ?? [], after.dietary_tags)) patch.dietary_tags = after.dietary_tags;
  if (before.display_order !== displayOrder) patch.display_order = displayOrder;

  return patch;
}

/* ── Item matching within one section ───────────────── */

interface Pairing {
  existing: ExistingItem;
  incoming: IncomingItem;
  incomingIndex: number;
  renamed: boolean;
  score: number;
}

function matchItems(existing: ExistingItem[], incoming: IncomingItem[]) {
  const pairs: Pairing[] = [];
  const takenExisting = new Set<string>();
  const takenIncoming = new Set<number>();

  // Pass 1 — exact (folded) name. Always wins, so a verbatim match can never
  // be stolen by a fuzzy one.
  const byName = new Map<string, ExistingItem>();
  for (const it of existing) {
    const key = normaliseName(it.name);
    if (!byName.has(key)) byName.set(key, it);   // first wins on duplicates
  }
  incoming.forEach((inc, i) => {
    const hit = byName.get(normaliseName(inc.name));
    if (hit && !takenExisting.has(hit.id)) {
      pairs.push({ existing: hit, incoming: inc, incomingIndex: i, renamed: false, score: 1 });
      takenExisting.add(hit.id);
      takenIncoming.add(i);
    }
  });

  // Pass 2 — renames, best score first so the strongest pairing claims its
  // partner before a weaker one can.
  const leftExisting = existing.filter((e) => !takenExisting.has(e.id));
  const candidates: Array<{ score: number; e: ExistingItem; i: number }> = [];
  leftExisting.forEach((e) => {
    incoming.forEach((inc, i) => {
      if (takenIncoming.has(i)) return;
      const score = similarity(e.name, inc.name);
      if (score >= RENAME_THRESHOLD) candidates.push({ score, e, i });
    });
  });
  candidates.sort((a, b) => b.score - a.score);

  for (const c of candidates) {
    if (takenExisting.has(c.e.id) || takenIncoming.has(c.i)) continue;

    // Decline a coin flip: if another still-available row on either side is
    // nearly as good a fit, there is no principled way to choose.
    const rival = candidates.find(
      (o) =>
        o !== c &&
        !takenExisting.has(o.e.id) &&
        !takenIncoming.has(o.i) &&
        (o.e.id === c.e.id) !== (o.i === c.i) &&   // shares exactly one side
        c.score - o.score < AMBIGUITY_MARGIN
    );
    if (rival) continue;

    pairs.push({
      existing: c.e,
      incoming: incoming[c.i],
      incomingIndex: c.i,
      renamed: true,
      score: c.score,
    });
    takenExisting.add(c.e.id);
    takenIncoming.add(c.i);
  }

  return {
    pairs,
    unmatchedExisting: existing.filter((e) => !takenExisting.has(e.id)),
    unmatchedIncoming: incoming
      .map((inc, i) => ({ inc, i }))
      .filter(({ i }) => !takenIncoming.has(i)),
  };
}

/* ── The planner ────────────────────────────────────── */

/**
 * Work out the smallest set of writes that turns `existing` into `incoming`.
 * Pure: reads nothing, writes nothing, and the same inputs always give the
 * same plan.
 */
export function planReconcile(
  existing: ExistingSection[],
  incoming: IncomingSection[]
): ReconcilePlan {
  const bySectionTitle = new Map<string, ExistingSection>();
  for (const s of existing) {
    const key = normaliseName(s.title);
    if (!bySectionTitle.has(key)) bySectionTitle.set(key, s);
  }

  const usedSections = new Set<string>();
  const sections: SectionPlan[] = [];
  const counts = {
    sectionsCreated: 0,
    sectionsKept: 0,
    sectionsDeleted: 0,
    itemsCreated: 0,
    itemsUpdated: 0,
    itemsRenamed: 0,
    itemsDeleted: 0,
  };

  incoming.forEach((inc, order) => {
    const match = bySectionTitle.get(normaliseName(inc.title));

    if (!match) {
      counts.sectionsCreated++;
      counts.itemsCreated += inc.items.length;
      sections.push({
        title: inc.title,
        sectionId: null,
        displayOrder: order,
        sectionPatch: null,
        creates: inc.items.map((it, i) => ({ ...it, display_order: i })),
        updates: [],
        deletes: [],
      });
      return;
    }

    usedSections.add(match.id);
    counts.sectionsKept++;

    const { pairs, unmatchedExisting, unmatchedIncoming } = matchItems(match.items, inc.items);

    const updates: ItemUpdate[] = [];
    for (const p of pairs) {
      const patch = diffItem(p.existing, p.incoming, p.incomingIndex);
      if (Object.keys(patch).length === 0) continue;
      updates.push({
        id: p.existing.id,
        previousName: p.existing.name,
        patch,
        renamed: p.renamed,
        confidence: p.score,
        needsReview: p.renamed && p.score < RENAME_OBVIOUS,
      });
      counts.itemsUpdated++;
      if (p.renamed) counts.itemsRenamed++;
    }

    const creates = unmatchedIncoming.map(({ inc: it, i }) => ({ ...it, display_order: i }));
    const deletes = unmatchedExisting.map((e) => ({ id: e.id, name: e.name }));
    counts.itemsCreated += creates.length;
    counts.itemsDeleted += deletes.length;

    sections.push({
      title: inc.title,
      sectionId: match.id,
      displayOrder: order,
      sectionPatch: match.display_order === order ? null : { display_order: order },
      creates,
      updates,
      deletes,
    });
  });

  const deletedSections: DeletedSection[] = existing
    .filter((s) => !usedSections.has(s.id))
    .map((s) => ({
      id: s.id,
      title: s.title,
      itemIds: s.items.map((i) => i.id),
      itemCount: s.items.length,
    }));

  counts.sectionsDeleted = deletedSections.length;
  counts.itemsDeleted += deletedSections.reduce((n, s) => n + s.itemCount, 0);

  return { sections, deletedSections, counts };
}
