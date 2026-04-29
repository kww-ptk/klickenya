/**
 * Draft cart persistence.
 *
 * The waiter-built order draft is held in PosOrderEntry React state. We mirror
 * it to localStorage on every change so a tab reload, browser crash, or
 * accidental navigation doesn't lose work in progress.
 *
 * Key format: pos:draft:v1:{session_id}
 *   - Versioned so a future schema change can bump v1 → v2 without crashing
 *     on stale data.
 *   - Scoped to session_id so each open table has its own independent draft.
 *
 * Cleared on:
 *   - Successful "Send to kitchen" POST
 *   - Manual "Clear" tap
 *   - Session closes (no UI for this yet — Stage 2 territory)
 */

const VERSION = "v1";

export interface PersistedDraftLine {
  cart_id:           string;
  menu_item_id:      string;
  item_name:         string;
  base_price:        number;
  quantity:          number;
  notes:             string;
  selected_options:  Array<{ option_id: string; group: string; choice: string; price_add: number }>;
  unit_price:        number;
}

export interface PersistedDraft {
  v:        string;             // schema version
  saved_at: number;             // unix ms
  lines:    PersistedDraftLine[];
}

function key(sessionId: string): string {
  return `pos:draft:${VERSION}:${sessionId}`;
}

/** Best-effort localStorage helpers — never throw on quota / disabled storage. */
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
    /* quota exceeded / private mode — silently drop */
  }
}

function safeRemove(k: string): void {
  try {
    if (typeof window !== "undefined") window.localStorage.removeItem(k);
  } catch {
    /* ignore */
  }
}

export function loadDraft(sessionId: string): PersistedDraftLine[] | null {
  const raw = safeRead(key(sessionId));
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as PersistedDraft;
    if (!parsed || parsed.v !== VERSION || !Array.isArray(parsed.lines)) return null;
    if (parsed.lines.length === 0) return null;
    return parsed.lines;
  } catch {
    return null;
  }
}

export function saveDraft(sessionId: string, lines: PersistedDraftLine[]): void {
  if (!lines.length) {
    clearDraft(sessionId);
    return;
  }
  const payload: PersistedDraft = {
    v:        VERSION,
    saved_at: Date.now(),
    lines,
  };
  safeWrite(key(sessionId), JSON.stringify(payload));
}

export function clearDraft(sessionId: string): void {
  safeRemove(key(sessionId));
}
