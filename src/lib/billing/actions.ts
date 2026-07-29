"use server";

import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth/require";
import { initializeTransaction } from "@/lib/paystack";
import { calculateMonthlyAmount } from "@/lib/billing/calculator";
import { requireRole } from "@/lib/auth/require";

const APP_URL = () =>
  (process.env.NEXT_PUBLIC_APP_URL ?? "https://hr.novabos.co.za").replace(/\/+$/, "");

export async function createSubscription(): Promise<{ url: string } | { error: string }> {
  try {
    const user = await requireUser();

    const tenant = await prisma.tenant.findUnique({
      where: { id: user.tenantId },
      select: { id: true, plan: true, subscriptionStatus: true },
    });

    if (!tenant) return { error: "Tenant not found." };
    if (
      tenant.plan === "subscribed" &&
      tenant.subscriptionStatus === "active"
    ) {
      return { error: "You already have an active subscription." };
    }
    if (tenant.plan === "enterprise") {
      return { error: "Enterprise accounts are managed directly. Contact sales@novabos.co.za." };
    }

    // Count active members to calculate first month's charge
    const memberCount = await prisma.employee.count({
      where: {
        tenantId: user.tenantId,
        status: { not: "terminated" },
      },
    });

    const amountRands = calculateMonthlyAmount(memberCount);
    const amountKobo = amountRands * 100;

    const result = await initializeTransaction({
      email: user.email,
      amount: amountKobo,
      currency: "ZAR",
      callback_url: `${APP_URL()}/api/billing/paystack/callback`,
      metadata: {
        tenantId: tenant.id,
        memberCount,
        type: "subscription_init",
      },
    });

    return { url: result.authorization_url };
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    console.error("[billing] createSubscription error:", err);
    return { error: `Something went wrong: ${msg}` };
  }
}

export async function cancelSubscription(): Promise<{ ok: true } | { error: string }> {
  try {
    const user = await requireRole("hr");

    const tenant = await prisma.tenant.findUnique({
      where: { id: user.tenantId },
      select: { plan: true, subscriptionStatus: true },
    });

    if (!tenant || (tenant.plan !== "subscribed" && tenant.plan !== "enterprise")) {
      return { error: "No active subscription to cancel." };
    }
    if (tenant.subscriptionStatus === "canceled") {
      return { error: "Subscription is already cancelled." };
    }

    await prisma.tenant.update({
      where: { id: user.tenantId },
      data: {
        subscriptionStatus: "canceled",
        paystackAuthCode: null,
        paystackBillingEmail: null,
      },
    });

    return { ok: true };
  } catch (err) {
    console.error("[billing] cancelSubscription error:", err);
    return { error: "Something went wrong. Please try again." };
  }
}
