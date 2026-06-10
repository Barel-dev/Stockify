import { Redis } from "@upstash/redis";

let redis: Redis | null = null;

function getRedis(): Redis | null {
  if (redis) return redis;

  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;

  if (!url || !token) return null;

  redis = new Redis({ url, token });
  return redis;
}

/**
 * Cached fetch wrapper. Checks Redis first, falls back to fetcher.
 * TTL in seconds (default 60s).
 * If Redis is not configured, falls through to fetcher directly.
 */
export async function cachedFetch<T>(
  key: string,
  fetcher: () => Promise<T>,
  ttl = 60
): Promise<T> {
  const r = getRedis();

  if (r) {
    try {
      const cached = await r.get<T>(key);
      if (cached !== null && cached !== undefined) {
        return cached;
      }
    } catch {
      // Redis unavailable, fall through
    }
  }

  const data = await fetcher();

  if (r && data !== null && data !== undefined) {
    try {
      await r.set(key, JSON.stringify(data), { ex: ttl });
    } catch {
      // Redis unavailable, ignore
    }
  }

  return data;
}

/**
 * Best-effort fixed-window rate limiter backed by Redis.
 * Returns true if the request is allowed, false if the limit is exceeded.
 * If Redis is not configured, always allows (no limiting in local/dev).
 */
export async function rateLimit(key: string, limit: number, windowSec: number): Promise<boolean> {
  const r = getRedis();
  if (!r) return true;

  try {
    // Set the TTL before counting (NX = only if the key doesn't exist yet) so a
    // crash between the two calls can never leave a counter that never expires.
    await r.set(key, 0, { nx: true, ex: windowSec });
    const count = await r.incr(key);
    return count <= limit;
  } catch {
    // Redis unavailable — fail open rather than blocking users.
    return true;
  }
}

/**
 * Client IP for rate-limit keying. On Vercel, x-forwarded-for is set by the
 * platform and cannot be spoofed by clients. If this app is ever self-hosted
 * behind a different proxy, re-validate that assumption.
 */
export function getClientIp(req: Request): string {
  return req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "anon";
}

/**
 * Per-IP fixed-window rate limit for a named route. Best-effort: allows
 * everything when Upstash Redis isn't configured (local/dev).
 */
export async function rateLimitRequest(
  req: Request,
  name: string,
  limit = 60,
  windowSec = 60
): Promise<boolean> {
  return rateLimit(`rl:${name}:${getClientIp(req)}`, limit, windowSec);
}
