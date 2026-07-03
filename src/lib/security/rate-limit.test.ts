import { describe, expect, it, vi } from "vitest";

vi.mock("next/headers", () => ({
  headers: vi.fn(async () => new Map([["x-forwarded-for", "203.0.113.7, 10.0.0.1"]])),
}));

import { checkRateLimit } from "./rate-limit";

describe("checkRateLimit", () => {
  it("allows requests up to the limit then blocks with a retry hint", () => {
    const opts = { name: "test-a", limit: 3, windowMs: 60_000 };
    expect(checkRateLimit("k1", opts).allowed).toBe(true);
    expect(checkRateLimit("k1", opts).allowed).toBe(true);
    expect(checkRateLimit("k1", opts).allowed).toBe(true);
    const blocked = checkRateLimit("k1", opts);
    expect(blocked.allowed).toBe(false);
    expect(blocked.retryAfterSeconds).toBeGreaterThan(0);
  });

  it("tracks keys independently", () => {
    const opts = { name: "test-b", limit: 1, windowMs: 60_000 };
    expect(checkRateLimit("tenant-a", opts).allowed).toBe(true);
    expect(checkRateLimit("tenant-b", opts).allowed).toBe(true);
    expect(checkRateLimit("tenant-a", opts).allowed).toBe(false);
  });

  it("frees the window after it elapses", () => {
    vi.useFakeTimers();
    try {
      const opts = { name: "test-c", limit: 1, windowMs: 1_000 };
      expect(checkRateLimit("k", opts).allowed).toBe(true);
      expect(checkRateLimit("k", opts).allowed).toBe(false);
      vi.advanceTimersByTime(1_100);
      expect(checkRateLimit("k", opts).allowed).toBe(true);
    } finally {
      vi.useRealTimers();
    }
  });
});
