import type { MenuSection } from "@/components/listings/detail/restaurant/MenuDisplay";

/**
 * Menu cache for the POS terminal.
 *
 * The full menu (sections → items → option_groups → options) is ~50–200 KB and
 * never changes during a shift unless the owner deliberately edits it. We mirror
 * the server-fetched menu to localStorage and serve from cache on subsequent
 * loads, gated by a version stamp.
 *
 * Version derivation lives server-side: the layout passes both `sections` and
 * `version` in. Client compares `version` against the cached one — if equal,
 * the cache hit is reused without bothering the network. If different, we
 * overwrite the cache with the freshly-served sections.
 *
 * Key format: pos:menu:v1:{menu_id}
 */

const VERSION = "v1";

export interface MenuCachePayload {
  v:           string;
  menu_id:     string;
  version:     string;       // server-supplied content version
  cached_at:   number;
  sections:    MenuSection[];
}

function key(menuId: string): string {
  return `pos:menu:${VERSION}:${menuId}`;
}

function safeRead(k: string): string | null {
  try {
    return typeof window !== "undefined" ? window.localStorage.getItem(k) : null;
  } catch {
    return null;
  }
}

function safeWrite(k: string, v: string): void {
  try {
    if (typeof window !== "undefined") window.localStorage.setItem(k, v);
  } catch {
    /* quota — drop */
  }
}

export function readMenuCache(menuId: string): MenuCachePayload | null {
  const raw = safeRead(key(menuId));
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as MenuCachePayload;
    if (!parsed || parsed.v !== VERSION || parsed.menu_id !== menuId) return null;
    if (!Array.isArray(parsed.sections)) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function writeMenuCache(args: {
  menuId:   string;
  version:  string;
  sections: MenuSection[];
}): void {
  const payload: MenuCachePayload = {
    v:         VERSION,
    menu_id:   args.menuId,
    version:   args.version,
    cached_at: Date.now(),
    sections:  args.sections,
  };
  safeWrite(key(args.menuId), JSON.stringify(payload));
}

/**
 * Compute a deterministic version stamp from the loaded sections.
 * For Stage 1 we use the largest `display_order`+id sums and price tally —
 * not cryptographically meaningful, just a fingerprint that flips when items
 * change. Cheap to compute on every server fetch.
 */
export function computeMenuVersion(sections: MenuSection[]): string {
  let h = 0;
  for (const s of sections) {
    h = (h * 31 + s.id.length + (s.menu_items?.length ?? 0)) | 0;
    for (const i of s.menu_items ?? []) {
      h = (h * 31 + i.id.length + Math.round((i.price_kes ?? 0) * 100) + (i.is_available ? 1 : 0)) | 0;
      for (const g of i.item_option_groups ?? []) {
        h = (h * 31 + g.id.length + (g.item_options?.length ?? 0)) | 0;
        for (const o of g.item_options ?? []) {
          h = (h * 31 + o.id.length + Math.round((o.price_modifier ?? 0) * 100) + (o.is_available ? 1 : 0)) | 0;
        }
      }
    }
  }
  return Math.abs(h).toString(36);
}
