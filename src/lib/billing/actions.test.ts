import { beforeEach, describe, expect, it, vi } from "vitest";

const mockPrisma = vi.hoisted(() => ({
  tenant: { findUnique: vi.fn(), update: vi.fn() },
  employee: { count: vi.fn() },
}));
const mockPaystack = vi.hoisted(() => ({ initializeTransaction: vi.fn() }));
const mockSession = vi.hoisted(() => ({
  current: { id: "u1", tenantId: "novatech", role: "hr", name: "HR", email: "hr@novatech.co.za" },
}));

vi.mock("@/lib/prisma", () => ({ prisma: mockPrisma }));
vi.mock("@/lib/paystack", () => mockPaystack);
vi.mock("@/lib/auth/require", () => ({
  requireUser: vi.fn(async () => mockSession.current),
  requireRole: vi.fn(async () => mockSession.current),
}));

import { createSubscription, reactivateSubscription, cancelSubscription } from "./actions";

beforeEach(() => vi.clearAllMocks());

describe("createSubscription", () => {
  it("refuses when a subscription is already active", async () => {
    mockPrisma.tenant.findUnique.mockResolvedValue({ id: "novatech", plan: "subscribed", subscriptionStatus: "active" });
    const res = await createSubscription();
    expect(res).toEqual({ error: "You already have an active subscription." });
    expect(mockPaystack.initializeTransaction).not.toHaveBeenCalled();
  });

  it("directs enterprise tenants to sales", async () => {
    mockPrisma.tenant.findUnique.mockResolvedValue({ id: "novatech", plan: "enterprise", subscriptionStatus: "active" });
    const res = await createSubscription();
    expect(res).toMatchObject({ error: expect.stringContaining("Enterprise") });
  });

  it("initialises a Paystack transaction for a trial tenant", async () => {
    mockPrisma.tenant.findUnique.mockResolvedValue({ id: "novatech", plan: "trial", subscriptionStatus: "trialing" });
    mockPrisma.employee.count.mockResolvedValue(10);
    mockPaystack.initializeTransaction.mockResolvedValue({ authorization_url: "https://pay.test/abc" });
    const res = await createSubscription();
    expect(res).toEqual({ url: "https://pay.test/abc" });
    // 10 members: (349 + 10*30) * 100 kobo
    expect(mockPaystack.initializeTransaction).toHaveBeenCalledWith(
      expect.objectContaining({ amount: 64900, currency: "ZAR", email: "hr@novatech.co.za" })
    );
  });
});

describe("reactivateSubscription", () => {
  it("rejects when the subscription is not cancelled", async () => {
    mockPrisma.tenant.findUnique.mockResolvedValue({ plan: "subscribed", subscriptionStatus: "active" });
    expect(await reactivateSubscription()).toEqual({ error: "Subscription is not in a cancelled state." });
  });

  it("flips a cancelled subscription back to active", async () => {
    mockPrisma.tenant.findUnique.mockResolvedValue({ plan: "subscribed", subscriptionStatus: "canceled" });
    const res = await reactivateSubscription();
    expect(res).toEqual({ ok: true });
    expect(mockPrisma.tenant.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: { subscriptionStatus: "active" } })
    );
  });
});

describe("cancelSubscription", () => {
  it("rejects when there is no subscription", async () => {
    mockPrisma.tenant.findUnique.mockResolvedValue({ plan: "trial", subscriptionStatus: "trialing" });
    expect(await cancelSubscription()).toEqual({ error: "No active subscription to cancel." });
  });

  it("rejects when already cancelled", async () => {
    mockPrisma.tenant.findUnique.mockResolvedValue({ plan: "subscribed", subscriptionStatus: "canceled" });
    expect(await cancelSubscription()).toEqual({ error: "Subscription is already cancelled." });
  });

  it("cancels an active subscription", async () => {
    mockPrisma.tenant.findUnique.mockResolvedValue({ plan: "subscribed", subscriptionStatus: "active" });
    const res = await cancelSubscription();
    expect(res).toEqual({ ok: true });
    expect(mockPrisma.tenant.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: { subscriptionStatus: "canceled" } })
    );
  });
});
