import { describe, it, expect, beforeEach } from "vitest";
import { rateLimit, _resetRateLimits } from "@/lib/security/rateLimit";

describe("rateLimit", () => {
  beforeEach(() => _resetRateLimits());

  it("allows up to the limit inside the window, then refuses", () => {
    const opts = { limit: 3, windowMs: 60_000, now: 1_000 };
    expect(rateLimit("k", opts).ok).toBe(true);
    expect(rateLimit("k", opts).ok).toBe(true);
    expect(rateLimit("k", opts).ok).toBe(true);
    const refused = rateLimit("k", opts);
    expect(refused.ok).toBe(false);
    expect(refused.retryAfterSeconds).toBe(60);
  });

  it("resets when the window has passed", () => {
    rateLimit("k", { limit: 1, windowMs: 1_000, now: 0 });
    expect(rateLimit("k", { limit: 1, windowMs: 1_000, now: 999 }).ok).toBe(false);
    expect(rateLimit("k", { limit: 1, windowMs: 1_000, now: 1_000 }).ok).toBe(true);
  });

  it("keeps keys independent", () => {
    rateLimit("a", { limit: 1, windowMs: 1_000, now: 0 });
    expect(rateLimit("b", { limit: 1, windowMs: 1_000, now: 0 }).ok).toBe(true);
  });

  it("reports remaining calls", () => {
    expect(rateLimit("k", { limit: 2, windowMs: 1_000, now: 0 }).remaining).toBe(1);
    expect(rateLimit("k", { limit: 2, windowMs: 1_000, now: 0 }).remaining).toBe(0);
  });
});
