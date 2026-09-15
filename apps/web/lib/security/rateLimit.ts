import type { NextRequest } from "next/server";

/**
 * Fixed-window rate limit, in memory.
 *
 * Per-instance on Vercel, so it is a speed bump rather than a wall — the PIN
 * and handover-code checks also carry database-backed lockouts (migration
 * 093). This exists to stop the cheap version of every attack: a loop from
 * one machine against an anonymous endpoint.
 */
type Entry = { count: number; resetAt: number };
const buckets = new Map<string, Entry>();

export type RateLimitResult = { ok: boolean; remaining: number; retryAfterSeconds: number };

export function rateLimit(
  key: string,
  opts: { limit: number; windowMs: number; now?: number },
): RateLimitResult {
  const now = opts.now ?? Date.now();
  if (buckets.size > 10_000) buckets.clear(); // bounded memory, worst case a free pass
  const entry = buckets.get(key);
  if (!entry || now >= entry.resetAt) {
    buckets.set(key, { count: 1, resetAt: now + opts.windowMs });
    return { ok: true, remaining: opts.limit - 1, retryAfterSeconds: 0 };
  }
  entry.count += 1;
  if (entry.count > opts.limit) {
    return {
      ok: false,
      remaining: 0,
      retryAfterSeconds: Math.max(1, Math.ceil((entry.resetAt - now) / 1000)),
    };
  }
  return { ok: true, remaining: opts.limit - entry.count, retryAfterSeconds: 0 };
}

/** Best-effort caller address behind Vercel's proxy. */
export function clientIp(req: NextRequest): string {
  return (
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip") ||
    "unknown"
  );
}

/** Test hook. */
export function _resetRateLimits(): void {
  buckets.clear();
}
