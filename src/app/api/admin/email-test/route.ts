import { NextResponse } from "next/server";
import { Resend } from "resend";
import { requireRole } from "@/lib/auth/require";
import { checkRateLimit } from "@/lib/security/rate-limit";

export const dynamic = "force-dynamic";

export async function GET() {
  let session;
  try {
    session = await requireRole("hr", "exco");
  } catch {
    return NextResponse.json({ error: "Unauthorised" }, { status: 401 });
  }

  // The test email is always sent to the authenticated caller's own address, so
  // this can never be used to send mail to arbitrary recipients.
  const to = session.email;

  const rate = checkRateLimit(session.tenantId, { name: "email-test", limit: 5, windowMs: 10 * 60 * 1000 });
  if (!rate.allowed) {
    return NextResponse.json({ error: "Too many test emails. Try again in a few minutes." }, { status: 429 });
  }

  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM ?? "NovaHR <noreply@novahr.co.za>";

  if (!apiKey) {
    return NextResponse.json({ configured: false, error: "RESEND_API_KEY is not set in this environment" }, { status: 500 });
  }

  const client = new Resend(apiKey);

  const { data, error } = await client.emails.send({
    from,
    to,
    subject: "NovaHR email test",
    html: "<p>This is a test email from NovaHR. If you received it, email delivery is working correctly.</p>",
  });

  // Never disclose any part of the API key. Report only whether it is configured
  // and the raw Resend result so HR can diagnose delivery failures.
  return NextResponse.json({
    configured: true,
    from,
    sentTo: to,
    data,
    error,
  });
}
