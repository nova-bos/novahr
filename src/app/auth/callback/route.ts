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

  // Password recovery codes produce a session with AMR method "otp".
  // Redirect to the reset form instead of logging the user in.
  const amr = exchangeData?.session?.amr as Array<{ method: string }> | undefined;
  if (Array.isArray(amr) && amr.some((a) => a.method === "otp")) {
    return NextResponse.redirect(`${origin}/reset-password`);
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
