import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyTransaction } from "@/lib/paystack";
import { sendSubscriptionActivatedEmail } from "@/lib/email";

export async function GET(request: NextRequest): Promise<NextResponse> {
  const reference =
    request.nextUrl.searchParams.get("reference") ??
    request.nextUrl.searchParams.get("trxref");

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://hr.novabos.co.za";

  if (!reference) {
    return NextResponse.redirect(`${appUrl}/billing?error=missing_reference`);
  }

  try {
    const data = await verifyTransaction(reference);

    if (data.status !== "success") {
      return NextResponse.redirect(`${appUrl}/billing?error=payment_failed`);
    }

    // Paystack sometimes returns metadata as a JSON string rather than a parsed object.
    const rawMeta = data.metadata;
    let meta: Record<string, unknown> | undefined;
    if (typeof rawMeta === "string") {
      try { meta = JSON.parse(rawMeta); } catch { meta = undefined; }
    } else {
      meta = rawMeta as Record<string, unknown> | undefined;
    }

    const tenantId = meta?.tenantId as string | undefined;
    if (!tenantId) {
      console.error("[paystack-callback] missing tenantId in metadata:", JSON.stringify(data.metadata));
      return NextResponse.redirect(`${appUrl}/billing?error=missing_tenant`);
    }

    // Extract subscription code. Paystack may nest it differently across response versions.
    const subscriptionCode =
      (data.subscription_code as string | undefined) ??
      ((data.subscription as Record<string, string> | undefined)?.subscription_code);

    const customerCode = (data.customer as Record<string, string> | undefined)?.customer_code;

    // Extract auth code for recurring charge-authorization billing
    const authorization = data.authorization as Record<string, unknown> | undefined;
    const authCode = authorization?.authorization_code as string | undefined;
    const customerEmail = (data.customer as Record<string, unknown>)?.email as string | undefined;
    const memberCount = meta?.memberCount !== undefined ? Number(meta.memberCount) : undefined;
    const amountKobo = data.amount !== undefined ? Number(data.amount) : undefined;
    const isSubscriptionInit = meta?.type === "subscription_init";

    // Calculate next period end: today + 1 calendar month
    const nextPeriodEnd = new Date();
    nextPeriodEnd.setMonth(nextPeriodEnd.getMonth() + 1);

    await prisma.tenant.update({
      where: { id: tenantId },
      data: {
        plan: "subscribed",
        subscriptionStatus: "active",
        ...(customerCode ? { paystackCustomerCode: customerCode } : {}),
        ...(subscriptionCode ? { paystackSubscriptionCode: subscriptionCode } : {}),
        ...(isSubscriptionInit && authCode && {
          paystackAuthCode: authCode,
          paystackBillingEmail: customerEmail ?? undefined,
          billingMemberCount: memberCount ?? undefined,
          billingAmountKobo: amountKobo ?? undefined,
          currentPeriodEnd: nextPeriodEnd,
        }),
      },
    });

    // Record the initial charge in the ledger. Idempotent on the Paystack
    // reference: a replayed callback finds the existing row and does not resend
    // the activation email.
    let ledgerWasCreated = false;
    if (isSubscriptionInit) {
      const period = new Date().toISOString().slice(0, 7);
      const existingCharge = await prisma.billingCharge.findUnique({
        where: { reference },
        select: { id: true },
      });
      ledgerWasCreated = !existingCharge;
      await prisma.billingCharge.upsert({
        where: { reference },
        create: {
          tenantId,
          reference,
          period,
          amountKobo: amountKobo ?? 0,
          status: "success",
          chargeType: "subscription_init",
        },
        update: {
          status: "success",
          ...(amountKobo != null ? { amountKobo } : {}),
        },
      });
    }

    // Email the HR admin who subscribed. Guarded on the ledger being a fresh
    // create so a replayed callback never sends a duplicate activation email.
    if (isSubscriptionInit && customerEmail && ledgerWasCreated) {
      void (async () => {
        try {
          const tenant = await prisma.tenant.findUnique({
            where: { id: tenantId },
            select: { name: true },
          });
          const hrUser = await prisma.user.findFirst({
            where: { tenantId, email: customerEmail },
            select: { name: true },
          });
          const nextPeriodLabel = new Date().toLocaleString("en-ZA", { month: "long", year: "numeric" });
          await sendSubscriptionActivatedEmail({
            recipientEmail: customerEmail,
            recipientName: hrUser?.name ?? customerEmail,
            companyName: tenant?.name ?? "your organisation",
            period: nextPeriodLabel,
            amountRands: amountKobo != null ? amountKobo / 100 : 0,
            appUrl,
          });
        } catch (err) {
          console.error("[billing-callback] activation email failed", err);
        }
      })();
    }

    return NextResponse.redirect(`${appUrl}/billing?success=1`);
  } catch (err) {
    console.error("[paystack-callback] Error:", err);
    return NextResponse.redirect(`${appUrl}/billing?error=verification_failed`);
  }
}
