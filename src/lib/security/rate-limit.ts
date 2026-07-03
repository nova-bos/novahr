import "server-only";
import { headers } from "next/headers";

// Sliding-window rate limiter held in module memory. On serverless each warm
// instance keeps its own window, so the limit is per instance rather than
// global; that still stops the practical attack (rapid retries from one
// client hitting the same warm function). Move to a shared store (Upstash or
// a Postgres table) if limits must be exact across instances.

interface Window {
  timestamps: number[];
}

const windows = new Map<string, Window>();
const MAX_KEYS = 10_000;

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

export function checkRateLimit(key: string, options: RateLimitOptions): RateLimitResult {
  const now = Date.now();
  const fullKey = `${options.name}:${key}`;

  // Opportunistic cleanup so the map cannot grow without bound.
  if (windows.size > MAX_KEYS) {
    for (const [k, w] of windows) {
      if (w.timestamps.length === 0 || now - w.timestamps[w.timestamps.length - 1] > options.windowMs) {
        windows.delete(k);
      }
    }
  }

  const window = windows.get(fullKey) ?? { timestamps: [] };
  window.timestamps = window.timestamps.filter((t) => now - t < options.windowMs);

  if (window.timestamps.length >= options.limit) {
    const oldest = window.timestamps[0];
    const retryAfterSeconds = Math.max(1, Math.ceil((oldest + options.windowMs - now) / 1000));
    windows.set(fullKey, window);
    return { allowed: false, retryAfterSeconds };
  }

  window.timestamps.push(now);
  windows.set(fullKey, window);
  return { allowed: true, retryAfterSeconds: 0 };
}

// Best-effort client identifier for unauthenticated actions. Vercel sets
// x-forwarded-for; the first hop is the client address.
export async function clientKey(): Promise<string> {
  const h = await headers();
  const forwarded = h.get("x-forwarded-for");
  return forwarded?.split(",")[0]?.trim() || h.get("x-real-ip") || "unknown";
}
