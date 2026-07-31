import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("next/headers", () => ({
  headers: vi.fn(async () => new Map([["x-forwarded-for", "203.0.113.7, 10.0.0.1"]])),
}));

// In-memory stand-in for the RateLimit table. Mimics the subset of Prisma
// operations the limiter uses: findUnique, upsert, update (increment).
interface Row {
  key: string;
  count: number;
  windowStart: Date;
  updatedAt: Date;
}

const store = new Map<string, Row>();
const throwNext = { value: false };

const mockPrisma = vi.hoisted(() => ({ rateLimit: {} as Record<string, unknown> }));

vi.mock("@/lib/prisma", () => ({ prisma: mockPrisma }));

mockPrisma.rateLimit = {
  findUnique: vi.fn(async ({ where }: { where: { key: string } }) => {
    if (throwNext.value) throw new Error("db down");
    return store.get(where.key) ?? null;
  }),
  upsert: vi.fn(
    async ({
      where,
      create,
      update,
    }: {
      where: { key: string };
      create: Row;
      update: Partial<Row>;
    }) => {
      if (throwNext.value) throw new Error("db down");
      const existing = store.get(where.key);
      if (existing) {
        Object.assign(existing, update, { updatedAt: new Date() });
      } else {
        store.set(where.key, { ...create, updatedAt: new Date() });
      }
      return store.get(where.key)!;
    }
  ),
  update: vi.fn(
    async ({
      where,
      data,
    }: {
      where: { key: string };
      data: { count?: { increment: number } };
    }) => {
      if (throwNext.value) throw new Error("db down");
      const row = store.get(where.key)!;
      if (data.count?.increment) row.count += data.count.increment;
      row.updatedAt = new Date();
      return row;
    }
  ),
};

import { checkRateLimit } from "./rate-limit";

beforeEach(() => {
  store.clear();
  throwNext.value = false;
  vi.clearAllMocks();
});

describe("checkRateLimit", () => {
  it("allows requests up to the limit then blocks with a retry hint", async () => {
    const opts = { name: "test-a", limit: 3, windowMs: 60_000 };
    expect((await checkRateLimit("k1", opts)).allowed).toBe(true);
    expect((await checkRateLimit("k1", opts)).allowed).toBe(true);
    expect((await checkRateLimit("k1", opts)).allowed).toBe(true);
    const blocked = await checkRateLimit("k1", opts);
    expect(blocked.allowed).toBe(false);
    expect(blocked.retryAfterSeconds).toBeGreaterThan(0);
  });

  it("tracks keys independently", async () => {
    const opts = { name: "test-b", limit: 1, windowMs: 60_000 };
    expect((await checkRateLimit("tenant-a", opts)).allowed).toBe(true);
    expect((await checkRateLimit("tenant-b", opts)).allowed).toBe(true);
    expect((await checkRateLimit("tenant-a", opts)).allowed).toBe(false);
  });

  it("namespaces by action name so different actions do not share a window", async () => {
    expect((await checkRateLimit("k", { name: "login", limit: 1, windowMs: 60_000 })).allowed).toBe(true);
    expect((await checkRateLimit("k", { name: "signup", limit: 1, windowMs: 60_000 })).allowed).toBe(true);
  });

  it("frees the window after it elapses", async () => {
    vi.useFakeTimers();
    try {
      const opts = { name: "test-c", limit: 1, windowMs: 1_000 };
      expect((await checkRateLimit("k", opts)).allowed).toBe(true);
      expect((await checkRateLimit("k", opts)).allowed).toBe(false);
      vi.advanceTimersByTime(1_100);
      expect((await checkRateLimit("k", opts)).allowed).toBe(true);
    } finally {
      vi.useRealTimers();
    }
  });

  it("fails open (allows) when the store throws", async () => {
    throwNext.value = true;
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const r = await checkRateLimit("k", { name: "test-d", limit: 1, windowMs: 60_000 });
    expect(r.allowed).toBe(true);
    expect(errorSpy).toHaveBeenCalled();
    errorSpy.mockRestore();
  });
});
