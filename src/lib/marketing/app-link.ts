/**
 * Builds a link to the NovaHR app. The marketing landing pages live at the
 * root (novabos.co.za) while the app lives at hr.novabos.co.za. When
 * NEXT_PUBLIC_APP_URL is set, auth CTAs point at the app subdomain so sign-in
 * happens there; when it is unset (local dev), they fall back to relative
 * same-origin paths. Future product tiles reuse this with their own base.
 */
const base = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/+$/, "") ?? "";

export function appLink(path: string): string {
  const p = path.startsWith("/") ? path : `/${path}`;
  return `${base}${p}`;
}
