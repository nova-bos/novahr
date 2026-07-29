import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyTransaction } from "@/lib/paystack";

export async function GET(request: NextRequest): Promise<NextResponse> {
  const reference =
    request.nextUrl.searchParams.get("reference") ??
    request.nextUrl.searchParams.get("trxref");

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://novahr-five.vercel.app";

  if (!reference) {
    return NextResponse.redirect(`${appUrl}/billing?error=missing_reference`);
  }

  try {
    const data = await verifyTransaction(reference);

    if (data.status !== "success") {
      return NextResponse.redirect(`${appUrl}/billing?error=payment_failed`);
    }

    const tenantId = (data.metadata as Record<string, string> | undefined)?.tenantId;
    if (!tenantId) {
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
    const reusable = authorization?.reusable as boolean | undefined;
    const customerEmail = (data.customer as Record<string, unknown>)?.email as string | undefined;
    const metadata = data.metadata as Record<string, unknown> | undefined;
    const memberCount = metadata?.memberCount as number | undefined;
    const amountKobo = data.amount as number | undefined;
    const isSubscriptionInit = metadata?.type === "subscription_init";

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
        ...(isSubscriptionInit && authCode && reusable && {
          paystackAuthCode: authCode,
          paystackBillingEmail: customerEmail ?? undefined,
          billingMemberCount: memberCount ?? undefined,
          billingAmountKobo: amountKobo ?? undefined,
          currentPeriodEnd: nextPeriodEnd,
        }),
      },
    });

    return NextResponse.redirect(`${appUrl}/billing?success=1`);
  } catch (err) {
    console.error("[paystack-callback] Error:", err);
    return NextResponse.redirect(`${appUrl}/billing?error=verification_failed`);
  }
}
