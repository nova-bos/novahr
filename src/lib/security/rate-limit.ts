import "server-only";
import { headers } from "next/headers";
import { prisma } from "@/lib/prisma";

// Fixed-window rate limiter backed by a shared Postgres table (RateLimit), so
// limits hold across serverless instances rather than per warm instance. Each
// call upserts the counter row keyed by "<name>:<key>", resets the window when
// it has elapsed, increments, and reports whether the caller is within limit.
//
// The counter is advisory, not a financial invariant, so a plain read-modify
// -write is acceptable: worst case two concurrent requests race and one extra
// request slips through, which does not defeat the limiter's purpose (stopping
// rapid retries). If the database is unreachable we FAIL OPEN and allow the
// request rather than locking legitimate users out.

export interface RateLimitOptions {
  // Unique name for the protected action, e.g. "invite-accept".
  name: string;
  // Requests allowed within the window.
  limit: number;
  // Window length in milliseconds.
  windowMs: number;
}

export interface RateLimitResult {
  allowed: boolean;
  retryAfterSeconds: number;
}

export async function checkRateLimit(
  key: string,
  options: RateLimitOptions
): Promise<RateLimitResult> {
  const now = Date.now();
  const fullKey = `${options.name}:${key}`;

  try {
    const existing = await prisma.rateLimit.findUnique({ where: { key: fullKey } });

    // No row yet, or the previous window has elapsed: start a fresh window.
    if (!existing || now - existing.windowStart.getTime() >= options.windowMs) {
      await prisma.rateLimit.upsert({
        where: { key: fullKey },
        create: { key: fullKey, count: 1, windowStart: new Date(now) },
        update: { count: 1, windowStart: new Date(now) },
      });
      return { allowed: true, retryAfterSeconds: 0 };
    }

    // Within the current window and already at or over the limit: block.
    if (existing.count >= options.limit) {
      const retryAfterSeconds = Math.max(
        1,
        Math.ceil((existing.windowStart.getTime() + options.windowMs - now) / 1000)
      );
      return { allowed: false, retryAfterSeconds };
    }

    // Within the window and under the limit: increment and allow.
    await prisma.rateLimit.update({
      where: { key: fullKey },
      data: { count: { increment: 1 } },
    });
    return { allowed: true, retryAfterSeconds: 0 };
  } catch (error) {
    // Fail open: never lock users out because the rate-limit store is down.
    console.error("[rate-limit] store error, allowing request:", error);
    return { allowed: true, retryAfterSeconds: 0 };
  }
}

// Best-effort client identifier for unauthenticated actions. Vercel sets
// x-forwarded-for; the first hop is the client address.
export async function clientKey(): Promise<string> {
  const h = await headers();
  const forwarded = h.get("x-forwarded-for");
  return forwarded?.split(",")[0]?.trim() || h.get("x-real-ip") || "unknown";
}
