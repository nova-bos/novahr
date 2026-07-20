import { headers } from "next/headers";

/**
 * The public base URL of the running app, used to build links in emails
 * (invites, confirmations) and auth redirects. Derived from the incoming
 * request headers so it is always the real live domain, whichever environment
 * we are in. Falls back to NEXT_PUBLIC_APP_URL, then localhost for local dev.
 */
export async function getAppUrl(): Promise<string> {
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host");
  if (host) {
    const proto = h.get("x-forwarded-proto") ?? "https";
    return `${proto}://${host}`;
  }

  const envUrl = process.env.NEXT_PUBLIC_APP_URL;
  if (envUrl && envUrl.trim()) return envUrl.trim().replace(/\/+$/, "");

  return "http://localhost:3000";
}
