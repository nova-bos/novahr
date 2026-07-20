import { randomBytes } from "crypto";

/** A URL-safe slug from a company name, capped in length. */
function slugify(name: string): string {
  return name
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^\p{Letter}\p{Number}]+/gu, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-")
    .slice(0, 40)
    .replace(/-+$/g, "");
}

/**
 * A human-readable, unique tenant id: the company name as a slug plus a short
 * random suffix, for example "nimbus-digital-8x3k9d2a4f1b". The random suffix
 * keeps it unique (two companies can share a name) and not guessable. Falls
 * back to "company" when the name has no usable characters.
 */
export function generateTenantId(name: string): string {
  const base = slugify(name) || "company";
  const suffix = randomBytes(6).toString("hex"); // 12 hex chars, 48 bits
  return `${base}-${suffix}`;
}
