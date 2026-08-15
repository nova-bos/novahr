import { beforeEach, describe, expect, it, vi } from "vitest";

const mockPrisma = vi.hoisted(() => ({
  user: { findUnique: vi.fn() },
  tenantMembership: { findUnique: vi.fn(), create: vi.fn() },
  invite: { findUnique: vi.fn(), updateMany: vi.fn(), create: vi.fn() },
  tenant: { findUniqueOrThrow: vi.fn() },
}));
const mockRate = vi.hoisted(() => ({ allowed: true }));
const mockSession = vi.hoisted(() => ({
  current: { id: "u1", tenantId: "novatech", role: "hr", name: "HR Admin", email: "hr@novatech.co.za" },
}));

vi.mock("@/lib/prisma", () => ({ prisma: mockPrisma }));
vi.mock("@/lib/db-context", () => ({
  runAsTenant: vi.fn((_t: string, fn: (tx: unknown) => unknown) => fn(mockPrisma)),
}));
vi.mock("@/lib/security/rate-limit", () => ({
  checkRateLimit: vi.fn(async () => ({ allowed: mockRate.allowed })),
  clientKey: vi.fn(async () => "client-key"),
}));
vi.mock("@/lib/auth/require", () => ({
  requireRole: vi.fn(async () => mockSession.current),
  requireActiveSubscription: vi.fn(async () => {}),
}));
vi.mock("@/lib/email", () => ({ sendInviteEmail: vi.fn(async () => true) }));
vi.mock("@/lib/app-url", () => ({ getAppUrl: vi.fn(async () => "http://localhost:3000") }));

import { createInviteAction, getInviteByTokenAction, acceptInviteAction } from "./actions";

beforeEach(() => {
  vi.clearAllMocks();
  mockRate.allowed = true;
});

describe("createInviteAction", () => {
  it("blocks when the hourly rate limit is hit", async () => {
    mockRate.allowed = false;
    const res = await createInviteAction({ email: "a@b.co.za", name: "A B", role: "employee" });
    expect(res.error).toMatch(/Invitation limit reached/);
  });

  it("rejects invalid input", async () => {
    const res = await createInviteAction({ email: "not-an-email", name: "A B", role: "employee" });
    expect(res.error).toBeTruthy();
    expect(mockPrisma.user.findUnique).not.toHaveBeenCalled();
  });

  it("refuses when the person already has access to this workspace", async () => {
    mockPrisma.user.findUnique.mockResolvedValue({ id: "u2", tenantId: "other" });
    mockPrisma.tenantMembership.findUnique.mockResolvedValue({ userId: "u2", tenantId: "novatech" });
    const res = await createInviteAction({ email: "dup@b.co.za", name: "Dup User", role: "hr" });
    expect(res.error).toMatch(/already has access/);
  });

  it("grants an existing account a membership instead of a new invite", async () => {
    mockPrisma.user.findUnique.mockResolvedValue({ id: "u2", tenantId: "other" });
    mockPrisma.tenantMembership.findUnique.mockResolvedValue(null);
    mockPrisma.tenantMembership.create.mockResolvedValue({});
    const res = await createInviteAction({ email: "multi@b.co.za", name: "Multi User", role: "manager" });
    expect(res.addedExistingUser).toBe(true);
    expect(mockPrisma.tenantMembership.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ userId: "u2", tenantId: "novatech", role: "manager" }) })
    );
  });
});

describe("getInviteByTokenAction", () => {
  const future = new Date(Date.now() + 86_400_000);
  const past = new Date(Date.now() - 86_400_000);

  it("rate limits repeated lookups", async () => {
    mockRate.allowed = false;
    const res = await getInviteByTokenAction("token");
    expect(res.error).toMatch(/Too many attempts/);
  });

  it("rejects a revoked invite", async () => {
    mockPrisma.invite.findUnique.mockResolvedValue({ status: "revoked", expiresAt: future, tenant: { name: "X" } });
    expect((await getInviteByTokenAction("t")).error).toMatch(/no longer valid/);
  });

  it("rejects an already-used invite", async () => {
    mockPrisma.invite.findUnique.mockResolvedValue({ status: "accepted", expiresAt: future, tenant: { name: "X" } });
    expect((await getInviteByTokenAction("t")).error).toMatch(/already been used/);
  });

  it("rejects an expired invite", async () => {
    mockPrisma.invite.findUnique.mockResolvedValue({ status: "pending", expiresAt: past, tenant: { name: "X" } });
    expect((await getInviteByTokenAction("t")).error).toMatch(/expired/);
  });

  it("returns the public info for a valid pending invite", async () => {
    mockPrisma.invite.findUnique.mockResolvedValue({
      status: "pending",
      expiresAt: future,
      name: "New Hire",
      email: "new@b.co.za",
      role: "employee",
      tenant: { name: "Ironwood" },
    });
    const res = await getInviteByTokenAction("t");
    expect(res.invite).toMatchObject({ email: "new@b.co.za", companyName: "Ironwood" });
  });
});

describe("acceptInviteAction", () => {
  it("rejects a weak password before touching the database", async () => {
    const res = await acceptInviteAction({ token: "0123456789", name: "New Hire", password: "short" });
    expect(res.status).toBe("error");
    expect(mockPrisma.invite.findUnique).not.toHaveBeenCalled();
  });

  it("rejects a non-pending or expired token", async () => {
    mockPrisma.invite.findUnique.mockResolvedValue({ status: "accepted", expiresAt: new Date(Date.now() + 1000) });
    const res = await acceptInviteAction({ token: "0123456789", name: "New Hire", password: "longenough1" });
    expect(res).toEqual({ status: "error", message: "This invitation is no longer valid." });
  });
});
