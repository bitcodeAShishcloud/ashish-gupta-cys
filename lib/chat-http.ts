import type { NextRequest } from "next/server";

/*
 * Request data helpers for the chat route. Mirrors the old static project's
 * api/_lib/http.js shape: body parsing and IP extraction stay in plain data
 * helpers so the route itself stays declarative.
 */

export async function readJsonBody(req: NextRequest): Promise<Record<string, unknown>> {
  try {
    const data = await req.json();
    return typeof data === "object" && data !== null ? (data as Record<string, unknown>) : {};
  } catch {
    return {};
  }
}

export function clientIp(req: NextRequest): string {
  // Vercel's edge sets x-real-ip to the true client IP, which the caller
  // cannot spoof. Prefer it; only fall back to the first x-forwarded-for
  // entry when behind a proxy platform that rewrites these headers.
  const real = req.headers.get("x-real-ip");
  if (real?.trim()) return real.trim().slice(0, 64);
  const fwd = req.headers.get("x-forwarded-for");
  if (fwd) {
    const first = fwd.split(",")[0].trim();
    if (first) return first.slice(0, 64);
  }
  return "unknown";
}

// Per-key in-memory sliding 1-minute window (single instance is enough here).
const buckets = new Map<string, { count: number; resetAt: number }>();

export function rateLimit(key: string, limit: number): boolean {
  const now = Date.now();
  let b = buckets.get(key);
  if (!b || now >= b.resetAt) {
    b = { count: 0, resetAt: now + 60_000 };
    buckets.set(key, b);
  }
  if (buckets.size > 10_000) {
    // Sweep only expired entries — clearing active buckets would reset
    // live limits (and an attacker could flood distinct keys to do exactly that)
    for (const [k, b] of buckets) if (now >= b.resetAt) buckets.delete(k);
  }
  b.count += 1;
  return b.count <= limit;
}
