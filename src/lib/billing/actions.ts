"use server";

import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth/require";
import { stripe } from "@/lib/stripe";
import { getAppUrl } from "@/lib/app-url";

type PriceId = "starter" | "growth" | "scale";

function getPriceId(tierId: PriceId): string {
  const map: Record<PriceId, string | undefined> = {
    starter: process.env.STRIPE_PRICE_ID_STARTER,
    growth: process.env.STRIPE_PRICE_ID_GROWTH,
    scale: process.env.STRIPE_PRICE_ID_SCALE,
  };
  const id = map[tierId];
  if (!id) throw new Error(`Stripe price ID for "${tierId}" is not configured`);
  return id;
}

/**
 * Creates a Stripe Checkout Session for a subscription.
 * Redirects the user to Stripe Checkout to complete payment.
 */
export async function createCheckoutSession(
  tierId: PriceId
): Promise<{ url: string } | { error: string }> {
  try {
    const user = await requireUser();

    const tenant = await prisma.tenant.findUnique({
      where: { id: user.tenantId },
      select: { id: true, name: true, stripeCustomerId: true },
    });

    if (!tenant) return { error: "Tenant not found" };

    const appUrl = await getAppUrl();
    let stripeCustomerId = tenant.stripeCustomerId;

    // Create a Stripe customer if this tenant does not have one yet.
    if (!stripeCustomerId) {
      const customer = await stripe.customers.create({
        name: tenant.name,
        email: user.email,
        metadata: { tenantId: tenant.id },
      });
      stripeCustomerId = customer.id;

      await prisma.tenant.update({
        where: { id: tenant.id },
        data: { stripeCustomerId },
      });
    }

    const priceId = getPriceId(tierId);

    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      customer: stripeCustomerId,
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${appUrl}/billing?success=1`,
      cancel_url: `${appUrl}/billing`,
      metadata: { tenantId: tenant.id },
      subscription_data: { metadata: { tenantId: tenant.id } },
    });

    if (!session.url) return { error: "Failed to create checkout session" };

    return { url: session.url };
  } catch (err) {
    console.error("[billing] createCheckoutSession error:", err);
    return { error: "Something went wrong. Please try again." };
  }
}

/**
 * Creates a Stripe Billing Portal session so the user can manage their
 * subscription, update payment methods, or cancel.
 */
export async function createPortalSession(): Promise<
  { url: string } | { error: string }
> {
  try {
    const user = await requireUser();

    const tenant = await prisma.tenant.findUnique({
      where: { id: user.tenantId },
      select: { stripeCustomerId: true },
    });

    if (!tenant) return { error: "Tenant not found" };

    if (!tenant.stripeCustomerId) {
      return { error: "No billing account found. Please subscribe first." };
    }

    const appUrl = await getAppUrl();

    const session = await stripe.billingPortal.sessions.create({
      customer: tenant.stripeCustomerId,
      return_url: `${appUrl}/billing`,
    });

    return { url: session.url };
  } catch (err) {
    console.error("[billing] createPortalSession error:", err);
    return { error: "Something went wrong. Please try again." };
  }
}
