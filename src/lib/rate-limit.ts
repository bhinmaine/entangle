/**
 * Simple in-memory rate limiter using a sliding window.
 * Good enough for a single-instance Next.js deployment on Vercel edge.
 * For multi-region deployments, swap this for Redis/Upstash.
 */

interface Window {
  count: number;
  resetAt: number;
}

const store = new Map<string, Window>();

/**
 * Check whether a key is within the rate limit.
 * @param key      Identifier (e.g. IP address)
 * @param limit    Max requests allowed in the window
 * @param windowMs Window duration in milliseconds
 * @returns        { allowed: boolean, remaining: number, resetAt: number }
 */
export function rateLimit(key: string, limit: number, windowMs: number) {
  const now = Date.now();
  const entry = store.get(key);

  if (!entry || now > entry.resetAt) {
    store.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true, remaining: limit - 1, resetAt: now + windowMs };
  }

  if (entry.count >= limit) {
    return { allowed: false, remaining: 0, resetAt: entry.resetAt };
  }

  entry.count++;
  return { allowed: true, remaining: limit - entry.count, resetAt: entry.resetAt };
}

/** Extract the real client IP from a Next.js request. */
export function getClientIp(req: Request): string {
  return (
    req.headers.get('x-forwarded-for')?.split(',')[0].trim() ??
    req.headers.get('x-real-ip') ??
    'unknown'
  );
}
