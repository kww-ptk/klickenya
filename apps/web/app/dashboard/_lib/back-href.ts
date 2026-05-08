/**
 * Read a `back` search param and return a safe in-app path or null.
 *
 * Only same-origin paths under /dashboard/ are allowed -- this prevents
 * open-redirect via a crafted ?back=https://evil.example/.
 */
export function safeBackHref(raw: unknown): string | null {
  if (typeof raw !== "string" || raw.length === 0) return null;
  if (!raw.startsWith("/dashboard/")) return null;
  if (raw.includes("..")) return null;
  if (raw.includes("//")) return null;
  return raw;
}
