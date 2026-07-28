import { NextRequest, NextResponse } from "next/server";
import type Stripe from "stripe";
import { stripe } from "@/lib/stripe";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

function priceIdToPlan(
  priceId: string
): "starter" | "growth" | "scale" | null {
  if (priceId === process.env.STRIPE_PRICE_ID_STARTER) return "starter";
  if (priceId === process.env.STRIPE_PRICE_ID_GROWTH) return "growth";
  if (priceId === process.env.STRIPE_PRICE_ID_SCALE) return "scale";
  return null;
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  const body = await request.text();
  const sig = request.headers.get("stripe-signature");

  if (!sig) {
    return NextResponse.json({ error: "Missing stripe-signature" }, { status: 400 });
  }

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(
      body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch (err) {
    console.error("[stripe-webhook] Signature verification failed:", err);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        // Save the customer ID and subscription ID so the webhook for
        // customer.subscription.updated can find the tenant later.
        const session = event.data.object as Stripe.Checkout.Session;
        const tenantId = session.metadata?.tenantId;
        if (!tenantId) break;

        const updateData: Record<string, string | null> = {};
        if (session.customer && typeof session.customer === "string") {
          updateData.stripeCustomerId = session.customer;
        }
        if (session.subscription && typeof session.subscription === "string") {
          updateData.stripeSubscriptionId = session.subscription;
        }

        if (Object.keys(updateData).length > 0) {
          await prisma.tenant.update({
            where: { id: tenantId },
            data: updateData,
          });
        }
        break;
      }

      case "customer.subscription.created":
      case "customer.subscription.updated": {
        const sub = event.data.object as Stripe.Subscription;
        const tenantId = sub.metadata?.tenantId;

        // Look up by subscription ID first, then by tenantId in metadata.
        const tenant = tenantId
          ? await prisma.tenant.findUnique({ where: { id: tenantId } })
          : await prisma.tenant.findFirst({
              where: { stripeSubscriptionId: sub.id },
            });

        if (!tenant) break;

        const priceId = sub.items.data[0]?.price?.id;
        const plan = priceId ? priceIdToPlan(priceId) : null;

        // The dahlia API uses billing_schedules for period boundaries.
        // Fall back to billing_cycle_anchor when no schedule is present.
        const periodEndTs =
          sub.billing_schedules?.[0]?.bill_until?.computed_timestamp ??
          sub.billing_cycle_anchor;

        await prisma.tenant.update({
          where: { id: tenant.id },
          data: {
            stripeSubscriptionId: sub.id,
            subscriptionStatus: sub.status,
            currentPeriodEnd: periodEndTs ? new Date(periodEndTs * 1000) : null,
            ...(plan ? { plan } : {}),
          },
        });
        break;
      }

      case "customer.subscription.deleted": {
        const sub = event.data.object as Stripe.Subscription;

        const tenant = await prisma.tenant.findFirst({
          where: { stripeSubscriptionId: sub.id },
        });

        if (!tenant) break;

        await prisma.tenant.update({
          where: { id: tenant.id },
          data: { subscriptionStatus: "canceled" },
        });
        break;
      }

      case "invoice.payment_failed": {
        const invoice = event.data.object as Stripe.Invoice;
        const customerId =
          typeof invoice.customer === "string"
            ? invoice.customer
            : invoice.customer?.id;

        if (!customerId) break;

        const tenant = await prisma.tenant.findFirst({
          where: { stripeCustomerId: customerId },
        });

        if (!tenant) break;

        await prisma.tenant.update({
          where: { id: tenant.id },
          data: { subscriptionStatus: "past_due" },
        });
        break;
      }

      default:
        // Unhandled event types are silently ignored.
        break;
    }
  } catch (err) {
    console.error("[stripe-webhook] Handler error:", err);
    return NextResponse.json({ error: "Handler error" }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
