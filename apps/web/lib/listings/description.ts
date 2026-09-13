// apps/web/lib/listings/description.ts
/**
 * Portable-text description editing for the listing editor.
 *
 * A listing description is portable text: prose blocks interleaved with custom
 * cards (Quick Facts, Tip Card, Photo Row…). Everything seeded or written in
 * Studio has that shape. The editor used to detect "not plain prose" and
 * disable the whole textarea with "edit it in Sanity Studio" — a dead end for
 * hosts, who have no Studio account.
 *
 * Instead we split the description into rows: every prose block a host can
 * safely round-trip becomes its own editable box, and anything that would lose
 * data on a text round-trip (cards, links, bold) is carried through untouched.
 * The browser sends back an ordered list of keep/edit/add parts; the server
 * re-reads the stored description and rebuilds it, so a bad payload can never
 * invent or overwrite a block the editor did not offer as editable.
 */

const rnd = () => Math.random().toString(36).slice(2, 10);

type Block = Record<string, unknown>;
type Span = { _type?: string; text?: string; marks?: unknown };

/* ── Row model (what the editor renders) ── */

export interface DescriptionTextRow {
  kind: "text";
  key: string;
  style: string;
  listItem?: string;
  text: string;
}

export interface DescriptionFixedRow {
  kind: "fixed";
  key: string;
  label: string;
  detail: string;
}

export type DescriptionRow = DescriptionTextRow | DescriptionFixedRow;

/** One instruction in the ordered rebuild the browser sends back on save. */
export type DescriptionPart = {
  op: "keep" | "edit" | "add";
  key?: string;
  text?: string;
};

/* ── Block inspection ── */

function isBlock(value: unknown): value is Block {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

/** A prose block whose text survives a plain-text round trip: no links, no
 *  bold/italic marks. Style and list level are preserved separately. */
export function isEditableTextBlock(value: unknown): boolean {
  if (!isBlock(value) || value._type !== "block") return false;
  if (Array.isArray(value.markDefs) && value.markDefs.length > 0) return false;
  const children = Array.isArray(value.children) ? (value.children as Span[]) : [];
  return children.every(
    (c) => c._type === "span" && (!Array.isArray(c.marks) || c.marks.length === 0),
  );
}

/** Join a block's spans into one string. */
function blockText(value: unknown): string {
  if (!isBlock(value)) return "";
  const children = Array.isArray(value.children) ? (value.children as Span[]) : [];
  return children.map((c) => c.text ?? "").join("");
}

/** Stable address for a block. Legacy blocks written without a `_key` fall back
 *  to their position, which the server resolves against the same stored array. */
function addressOf(block: unknown, index: number): string {
  const key = isBlock(block) ? block._key : undefined;
  return typeof key === "string" && key ? key : `#${index}`;
}

/** "quickFactsBlock" → "Quick facts", "photoRowBlock" → "Photo row". */
function labelForType(type: string): string {
  const words = type
    .replace(/Block$/, "")
    .replace(/([A-Z])/g, " $1")
    .trim()
    .toLowerCase();
  return words.charAt(0).toUpperCase() + words.slice(1);
}

function detailForCustomBlock(block: Block): string {
  for (const field of ["title", "label", "text", "heading"]) {
    const v = block[field];
    if (typeof v === "string" && v.trim()) return v.trim().slice(0, 70);
  }
  for (const field of ["items", "photos", "rows", "stats", "columns"]) {
    const v = block[field];
    if (Array.isArray(v)) return `${v.length} item${v.length === 1 ? "" : "s"}`;
  }
  return "";
}

function labelForFixedTextBlock(block: Block): string {
  if (typeof block.listItem === "string" && block.listItem) return "Formatted list item";
  const style = typeof block.style === "string" ? block.style : "normal";
  if (style !== "normal") return "Formatted heading";
  return "Formatted paragraph";
}

/* ── Read side: Sanity description → editor rows ── */

/** True when the whole description is unstyled, unmarked, non-list prose — the
 *  case the single plain textarea handles losslessly. Empty counts as simple so
 *  new listings start with the textarea. */
export function isSimpleDescription(desc: unknown): boolean {
  if (!desc) return true;
  if (!Array.isArray(desc)) return false;
  return desc.every((b) => {
    if (!isEditableTextBlock(b)) return false;
    const block = b as Block;
    if (block.style && block.style !== "normal") return false;
    if (block.listItem) return false;
    return true;
  });
}

export function descriptionToRows(desc: unknown): DescriptionRow[] {
  if (!Array.isArray(desc)) return [];
  return desc.map((b, i) => {
    const key = addressOf(b, i);
    if (isEditableTextBlock(b)) {
      const block = b as Block;
      return {
        kind: "text",
        key,
        style: typeof block.style === "string" && block.style ? block.style : "normal",
        ...(typeof block.listItem === "string" && block.listItem ? { listItem: block.listItem } : {}),
        text: blockText(block),
      } satisfies DescriptionTextRow;
    }
    if (isBlock(b) && b._type === "block") {
      return { kind: "fixed", key, label: labelForFixedTextBlock(b), detail: blockText(b).slice(0, 120) };
    }
    const type = isBlock(b) && typeof b._type === "string" ? b._type : "content";
    return { kind: "fixed", key, label: labelForType(type), detail: isBlock(b) ? detailForCustomBlock(b) : "" };
  });
}

const STYLE_LABELS: Record<string, string> = {
  normal: "Paragraph",
  h1: "Heading",
  h2: "Heading",
  h3: "Subheading",
  h4: "Subheading",
  blockquote: "Quote",
};

export function textRowLabel(row: DescriptionTextRow): string {
  if (row.listItem === "bullet") return "Bullet";
  if (row.listItem === "number") return "Numbered";
  return STYLE_LABELS[row.style] ?? "Paragraph";
}

export function rowsWordCount(rows: DescriptionRow[]): number {
  return rows
    .filter((r): r is DescriptionTextRow => r.kind === "text")
    .reduce((n, r) => n + wordCount(r.text), 0);
}

export function wordCount(text: string): number {
  return text.split(/\s+/).filter(Boolean).length;
}

/* ── Write side: parts + stored description → new description ── */

/** Rows the editor invented locally carry this prefix instead of a Sanity `_key`. */
export const NEW_ROW_PREFIX = "new:";

export function newRowKey(): string {
  return `${NEW_ROW_PREFIX}${rnd()}`;
}

/** Turn the editor's rows back into the ordered rebuild the server applies.
 *  `originalText` maps a block key to the text it was loaded with, so an
 *  untouched block is sent as "keep" and a save rewrites only what changed. */
export function rowsToParts(rows: DescriptionRow[], originalText: Map<string, string>): DescriptionPart[] {
  return rows.map((row) => {
    if (row.kind === "fixed") return { op: "keep", key: row.key };
    if (row.key.startsWith(NEW_ROW_PREFIX)) return { op: "add", text: row.text };
    return originalText.get(row.key) === row.text
      ? { op: "keep", key: row.key }
      : { op: "edit", key: row.key, text: row.text };
  });
}

/** The map `rowsToParts` expects, built from the rows as first loaded. */
export function originalRowText(rows: DescriptionRow[]): Map<string, string> {
  return new Map(rows.flatMap((r) => (r.kind === "text" ? [[r.key, r.text] as const] : [])));
}

function paragraphsOf(text: string): string[] {
  return text.split(/\n{2,}/).map((p) => p.trim()).filter(Boolean);
}

function makeSpan(text: string) {
  return { _type: "span" as const, _key: rnd(), text, marks: [] };
}

/** Rebuild a description from the editor's ordered parts against what Sanity
 *  currently stores. Unknown keys, repeated keys and edits aimed at blocks the
 *  editor never offered as editable are all ignored rather than trusted. */
export function applyDescriptionParts(stored: unknown, parts: DescriptionPart[]): unknown[] {
  const blocks = Array.isArray(stored) ? stored : [];
  const indexByAddress = new Map<string, number>();
  blocks.forEach((b, i) => {
    const address = addressOf(b, i);
    if (!indexByAddress.has(address)) indexByAddress.set(address, i);
  });

  const used = new Set<number>();
  const out: unknown[] = [];

  for (const part of parts) {
    if (part.op === "add") {
      for (const p of paragraphsOf(part.text ?? "")) {
        out.push({ _type: "block", _key: rnd(), style: "normal", markDefs: [], children: [makeSpan(p)] });
      }
      continue;
    }

    const index = part.key != null ? indexByAddress.get(part.key) : undefined;
    if (index === undefined || used.has(index)) continue;
    used.add(index);
    const block = blocks[index];

    if (part.op === "keep" || !isEditableTextBlock(block)) {
      out.push(isBlock(block) && !block._key ? { ...block, _key: rnd() } : block);
      continue;
    }

    const paragraphs = paragraphsOf(part.text ?? "");
    if (!paragraphs.length) continue; // cleared to blank → the host removed it
    const source = block as Block;
    paragraphs.forEach((p, i) => {
      out.push({ ...source, _key: i === 0 && source._key ? source._key : rnd(), children: [makeSpan(p)] });
    });
  }

  return out;
}

/* ── Plain-textarea round trip (simple descriptions only) ── */

/** Join plain portable-text blocks into a textarea string (paragraph per block). */
export function descriptionToText(desc: unknown): string {
  if (!Array.isArray(desc)) return "";
  return desc.map(blockText).join("\n\n").trim();
}

/** Convert textarea text back into portable-text blocks (one block per paragraph). */
export function textToDescription(text: string) {
  const paras = paragraphsOf(text);
  const source = paras.length ? paras : [text.trim()].filter(Boolean);
  return source.map((p) => ({
    _type: "block" as const,
    _key: rnd(),
    style: "normal",
    markDefs: [],
    children: [makeSpan(p)],
  }));
}
