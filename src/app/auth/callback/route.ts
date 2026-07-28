import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/dashboard";

  if (!code) {
    return NextResponse.redirect(`${origin}/login?error=missing_code`);
  }

  const supabase = await createClient();
  const { data: exchangeData, error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    return NextResponse.redirect(`${origin}/login?error=auth_failed`);
  }

  // Password recovery codes produce a session whose JWT AMR claim contains
  // method "otp". Decode the access token to detect this and redirect to
  // the reset form instead of logging the user in normally.
  const accessToken = exchangeData?.session?.access_token;
  if (accessToken) {
    try {
      const payload = JSON.parse(
        Buffer.from(accessToken.split(".")[1], "base64").toString("utf-8")
      );
      const isRecovery =
        Array.isArray(payload.amr) &&
        payload.amr.some((a: { method: string }) => a.method === "otp");
      if (isRecovery) {
        return NextResponse.redirect(`${origin}/reset-password`);
      }
    } catch {
      // malformed JWT — fall through to normal login
    }
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.redirect(`${origin}/login?error=no_user`);
  }

  const existing = await prisma.user.findUnique({
    where: { id: user.id },
    select: { id: true },
  });

  if (!existing) {
    return NextResponse.redirect(`${origin}/signup/complete`);
  }

  return NextResponse.redirect(`${origin}${next}`);
}
