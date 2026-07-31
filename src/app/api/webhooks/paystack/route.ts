import crypto from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

async function findTenant(
  tenantId: string | undefined,
  subscriptionCode: string | undefined,
) {
  if (tenantId) {
    return prisma.tenant.findUnique({ where: { id: tenantId } });
  }
  if (subscriptionCode) {
    return prisma.tenant.findFirst({ where: { paystackSubscriptionCode: subscriptionCode } });
  }
  return null;
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  const body = await request.text();
  const sig = request.headers.get("x-paystack-signature");

  const hash = crypto
    .createHmac("sha512", process.env.PAYSTACK_SECRET_KEY!)
    .update(body)
    .digest("hex");

  // Constant-time comparison to avoid leaking signature bytes via timing.
  // timingSafeEqual throws on unequal-length buffers, so guard both first.
  if (!sig || sig.length !== hash.length) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }
  const hashBuffer = Buffer.from(hash);
  const sigBuffer = Buffer.from(sig);
  if (
    hashBuffer.length !== sigBuffer.length ||
    !crypto.timingSafeEqual(hashBuffer, sigBuffer)
  ) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  let event: { event: string; data: Record<string, unknown> };
  try {
    event = JSON.parse(body) as typeof event;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  try {
    const { event: eventType, data } = event;

    switch (eventType) {
      case "charge.success": {
        const meta = data.metadata as Record<string, unknown> | undefined;
        const type = meta?.type as string | undefined;
        const plan = data.plan as Record<string, string> | undefined;

        const tenantId = meta?.tenantId as string | undefined;
        const subscriptionCode =
          (data.subscription_code as string | undefined) ??
          ((data.subscription as Record<string, string> | undefined)?.subscription_code);
        const customerCode = (data.customer as Record<string, string> | undefined)?.customer_code;

        // Charge-authorization renewals (and inits) carry no plan, only our
        // metadata. Reconcile them here so a charge the cron/callback missed
        // still marks the tenant active and lands in the ledger.
        if (type === "subscription_renewal" || type === "subscription_init") {
          const tenant = await findTenant(tenantId, subscriptionCode);
          if (!tenant) break;

          const reference = data.reference as string | undefined;
          const amountKobo = data.amount != null ? Number(data.amount) : 0;
          const period =
            (meta?.period as string | undefined) ?? new Date().toISOString().slice(0, 7);

          await prisma.tenant.update({
            where: { id: tenant.id },
            data: { subscriptionStatus: "active" },
          });

          // Idempotent on the charge reference: period advancement is left to
          // the cron/callback so we never double-advance currentPeriodEnd.
          if (reference) {
            await prisma.billingCharge.upsert({
              where: { reference },
              create: {
                tenantId: tenant.id,
                reference,
                period,
                amountKobo,
                status: "success",
                chargeType: type,
              },
              update: { status: "success" },
            });
          }
          break;
        }

        // Legacy subscription-plan charges: data.plan is present.
        if (!plan?.plan_code) break;

        const tenant = await findTenant(tenantId, subscriptionCode);
        if (!tenant) break;

        await prisma.tenant.update({
          where: { id: tenant.id },
          data: {
            plan: "subscribed",
            subscriptionStatus: "active",
            ...(customerCode ? { paystackCustomerCode: customerCode } : {}),
            ...(subscriptionCode ? { paystackSubscriptionCode: subscriptionCode } : {}),
          },
        });
        break;
      }

      case "subscription.create": {
        const subData = data as Record<string, unknown>;
        const subscriptionCode = subData.subscription_code as string | undefined;
        const customerCode = (subData.customer as Record<string, string> | undefined)?.customer_code;
        const nextPaymentDate = subData.next_payment_date as string | undefined;
        const tenantId = (subData.metadata as Record<string, string> | undefined)?.tenantId;

        const tenant = await findTenant(tenantId, subscriptionCode);
        if (!tenant) break;

        await prisma.tenant.update({
          where: { id: tenant.id },
          data: {
            plan: "subscribed",
            subscriptionStatus: "active",
            ...(customerCode ? { paystackCustomerCode: customerCode } : {}),
            ...(subscriptionCode ? { paystackSubscriptionCode: subscriptionCode } : {}),
            ...(nextPaymentDate ? { currentPeriodEnd: new Date(nextPaymentDate) } : {}),
          },
        });
        break;
      }

      case "subscription.disable": {
        const subscriptionCode = (data as Record<string, string>).subscription_code;
        const tenant = await findTenant(undefined, subscriptionCode);
        if (!tenant) break;

        await prisma.tenant.update({
          where: { id: tenant.id },
          data: { subscriptionStatus: "canceled" },
        });
        break;
      }

      case "invoice.payment_failed": {
        const subscriptionCode =
          (data.subscription as Record<string, string> | undefined)?.subscription_code ??
          (data as Record<string, string>).subscription_code;
        const tenant = await findTenant(undefined, subscriptionCode);
        if (!tenant) break;

        await prisma.tenant.update({
          where: { id: tenant.id },
          data: { subscriptionStatus: "past_due" },
        });
        break;
      }

      default:
        break;
    }
  } catch (err) {
    console.error("[paystack-webhook] Handler error:", err);
    return NextResponse.json({ error: "Handler error" }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
