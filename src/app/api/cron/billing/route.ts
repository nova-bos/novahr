import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { chargeAuthorization } from "@/lib/paystack";
import { calculateMonthlyAmount, ENTERPRISE_THRESHOLD } from "@/lib/billing/calculator";
import { sendPaymentFailedEmail } from "@/lib/email";

export const runtime = "nodejs";
export const maxDuration = 300;

function addOneMonth(date: Date): Date {
  const next = new Date(date);
  next.setMonth(next.getMonth() + 1);
  return next;
}

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorised" }, { status: 401 });
  }

  const now = new Date();

  // Find all subscribed tenants due for renewal (exclude canceled — they keep their
  // auth code for self-serve reactivation, not for automatic renewal)
  const dueTenants = await prisma.tenant.findMany({
    where: {
      plan: "subscribed",
      subscriptionStatus: { not: "canceled" },
      paystackAuthCode: { not: null },
      paystackBillingEmail: { not: null },
      currentPeriodEnd: { lte: now },
    },
    select: {
      id: true,
      name: true,
      paystackAuthCode: true,
      paystackBillingEmail: true,
      currentPeriodEnd: true,
      billingAmountKobo: true,
    },
  });

  const results: Array<{ tenantId: string; status: string; amount?: number; error?: string }> = [];

  for (const tenant of dueTenants) {
    try {
      // Count active members (snapshot)
      const memberCount = await prisma.employee.count({
        where: {
          tenantId: tenant.id,
          status: { not: "terminated" },
        },
      });

      // Upgrade to enterprise tier if threshold reached
      if (memberCount >= ENTERPRISE_THRESHOLD) {
        await prisma.tenant.update({
          where: { id: tenant.id },
          data: { plan: "enterprise" },
        });
        results.push({ tenantId: tenant.id, status: "upgraded_to_enterprise" });
        continue;
      }

      const amountRands = calculateMonthlyAmount(memberCount);
      const amountKobo = amountRands * 100;
      // Deterministic reference: Paystack dedups on it, and a same-month re-run
      // upserts the same ledger row rather than double-charging.
      const period = now.toISOString().slice(0, 7);
      const reference = `novahr_renewal_${tenant.id}_${period}`;

      const charge = await chargeAuthorization({
        authorizationCode: tenant.paystackAuthCode!,
        email: tenant.paystackBillingEmail!,
        amountKobo,
        reference,
        metadata: {
          tenantId: tenant.id,
          memberCount,
          period,
          type: "subscription_renewal",
        },
      });

      // chargeAuthorization returns the transaction reference, not a numeric
      // charge id; the deterministic reference is our idempotency key.
      const paystackChargeId: string | null = charge.reference ?? null;

      if (charge.status === "success") {
        const nextPeriodEnd = addOneMonth(tenant.currentPeriodEnd ?? now);
        await prisma.$transaction([
          prisma.tenant.update({
            where: { id: tenant.id },
            data: {
              subscriptionStatus: "active",
              currentPeriodEnd: nextPeriodEnd,
              billingMemberCount: memberCount,
              billingAmountKobo: amountKobo,
            },
          }),
          prisma.billingCharge.upsert({
            where: { reference },
            create: {
              tenantId: tenant.id,
              reference,
              period,
              amountKobo,
              status: "success",
              chargeType: "subscription_renewal",
              paystackChargeId,
            },
            update: {
              status: "success",
              amountKobo,
              paystackChargeId,
            },
          }),
        ]);
        results.push({ tenantId: tenant.id, status: "charged", amount: amountRands });
      } else {
        await prisma.tenant.update({
          where: { id: tenant.id },
          data: { subscriptionStatus: "past_due" },
        });
        await prisma.billingCharge.upsert({
          where: { reference },
          create: {
            tenantId: tenant.id,
            reference,
            period,
            amountKobo,
            status: "failed",
            chargeType: "subscription_renewal",
            paystackChargeId,
          },
          update: { status: "failed", amountKobo, paystackChargeId },
        });
        if (tenant.paystackBillingEmail) {
          void sendPaymentFailedEmail({
            recipientEmail: tenant.paystackBillingEmail,
            companyName: tenant.name,
            amountRands: amountRands,
          });
        }
        results.push({ tenantId: tenant.id, status: "failed", error: charge.status });
      }
    } catch (err) {
      console.error(`[billing-cron] tenant ${tenant.id} error:`, err);
      await prisma.tenant.update({
        where: { id: tenant.id },
        data: { subscriptionStatus: "past_due" },
      });
      if (tenant.paystackBillingEmail) {
        const lastAmountRands = tenant.billingAmountKobo != null
          ? tenant.billingAmountKobo / 100
          : 0;
        void sendPaymentFailedEmail({
          recipientEmail: tenant.paystackBillingEmail,
          companyName: tenant.name,
          amountRands: lastAmountRands,
        });
      }
      results.push({
        tenantId: tenant.id,
        status: "error",
        error: err instanceof Error ? err.message : "unknown",
      });
    }
  }

  // Downgrade canceled subscriptions whose access period has expired
  const expiredCanceled = await prisma.tenant.findMany({
    where: {
      plan: { in: ["subscribed", "enterprise"] },
      subscriptionStatus: "canceled",
      currentPeriodEnd: { lte: now },
    },
    select: { id: true },
  });

  for (const tenant of expiredCanceled) {
    await prisma.tenant.update({
      where: { id: tenant.id },
      data: {
        subscriptionStatus: "expired",
        currentPeriodEnd: null,
        billingMemberCount: null,
        billingAmountKobo: null,
      },
    });
    results.push({ tenantId: tenant.id, status: "expired_after_cancel" });
  }

  console.log(`[billing-cron] Processed ${dueTenants.length} renewals, ${expiredCanceled.length} downgrades:`, results);
  return NextResponse.json({ processed: dueTenants.length + expiredCanceled.length, results });
}

// Vercel Cron invokes via GET; POST is kept for manual triggering.
export async function POST(req: NextRequest) {
  return GET(req);
}
