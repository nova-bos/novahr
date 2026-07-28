"use server";

import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth/require";
import { getSubscriptionManageLink } from "@/lib/paystack";

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
