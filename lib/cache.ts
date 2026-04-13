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
