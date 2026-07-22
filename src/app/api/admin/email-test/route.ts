import { NextResponse } from "next/server";
import { Resend } from "resend";
import { requireRole } from "@/lib/auth/require";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    await requireRole("hr", "exco");
  } catch {
    return NextResponse.json({ error: "Unauthorised" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const to = searchParams.get("to");
  if (!to) {
    return NextResponse.json({ error: "Pass ?to=email@address.com" }, { status: 400 });
  }

  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM ?? "NovaHR <noreply@novahr.co.za>";

  if (!apiKey) {
    return NextResponse.json({ error: "RESEND_API_KEY is not set in this environment" }, { status: 500 });
  }

  const client = new Resend(apiKey);

  const { data, error } = await client.emails.send({
    from,
    to,
    subject: "NovaHR email test",
    html: "<p>This is a test email from NovaHR. If you received it, email delivery is working correctly.</p>",
  });

  return NextResponse.json({
    config: { from, keyPrefix: apiKey.slice(0, 8) + "..." },
    data,
    error,
  });
}
