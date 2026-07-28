import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyTransaction } from "@/lib/paystack";

function planCodeToTier(code: string): "starter" | "growth" | "scale" | null {
  if (code === process.env.PAYSTACK_PLAN_CODE_STARTER) return "starter";
  if (code === process.env.PAYSTACK_PLAN_CODE_GROWTH) return "growth";
  if (code === process.env.PAYSTACK_PLAN_CODE_SCALE) return "scale";
  return null;
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  const reference =
    request.nextUrl.searchParams.get("reference") ??
    request.nextUrl.searchParams.get("trxref");

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://novabos.co.za";

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
    const planCode = (data.plan as Record<string, string> | undefined)?.plan_code;
    const tier = planCode ? planCodeToTier(planCode) : null;

    await prisma.tenant.update({
      where: { id: tenantId },
      data: {
        subscriptionStatus: "active",
        ...(customerCode ? { paystackCustomerCode: customerCode } : {}),
        ...(subscriptionCode ? { paystackSubscriptionCode: subscriptionCode } : {}),
        ...(tier ? { plan: tier } : {}),
      },
    });

    return NextResponse.redirect(`${appUrl}/billing?success=1`);
  } catch (err) {
    console.error("[paystack-callback] Error:", err);
    return NextResponse.redirect(`${appUrl}/billing?error=verification_failed`);
  }
}
