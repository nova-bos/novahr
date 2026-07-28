"use server";

import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth/require";
import { initializeTransaction, getSubscriptionManageLink } from "@/lib/paystack";
import { getAppUrl } from "@/lib/app-url";

type TierId = "starter" | "growth" | "scale";

function getPlanCode(tierId: TierId): string {
  const map: Record<TierId, string | undefined> = {
    starter: process.env.PAYSTACK_PLAN_CODE_STARTER,
    growth: process.env.PAYSTACK_PLAN_CODE_GROWTH,
    scale: process.env.PAYSTACK_PLAN_CODE_SCALE,
  };
  const code = map[tierId];
  if (!code) throw new Error(`Paystack plan code for "${tierId}" is not configured`);
  return code;
}

// Returns the tier's monthly price in kobo (R1 = 100 kobo)
function getPlanAmountKobo(tierId: TierId): number {
  const prices: Record<TierId, number> = {
    starter: 49900,
    growth: 99900,
    scale: 249900,
  };
  return prices[tierId];
}

export async function createCheckoutSession(
  tierId: TierId,
): Promise<{ url: string } | { error: string }> {
  try {
    const user = await requireUser();
    const appUrl = await getAppUrl();

    const data = await initializeTransaction({
      email: user.email,
      amount: getPlanAmountKobo(tierId),
      plan: getPlanCode(tierId),
      callback_url: `${appUrl}/api/billing/paystack/callback`,
      metadata: { tenantId: user.tenantId },
    });

    return { url: data.authorization_url };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[billing] createCheckoutSession error:", msg);
    return { error: `Something went wrong: ${msg}` };
  }
}

export async function createPortalSession(): Promise<{ url: string } | { error: string }> {
  try {
    const user = await requireUser();
    const tenant = await prisma.tenant.findUnique({
      where: { id: user.tenantId },
      select: { paystackSubscriptionCode: true },
    });
    if (!tenant?.paystackSubscriptionCode) {
      return { error: "No active subscription found." };
    }
    const link = await getSubscriptionManageLink(tenant.paystackSubscriptionCode);
    return { url: link };
  } catch (err) {
    console.error("[billing] createPortalSession error:", err);
    return { error: "Something went wrong. Please try again." };
  }
}
