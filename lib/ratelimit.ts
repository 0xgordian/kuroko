/**
 * Shared rate limiting utility.
 *
 * Uses Upstash Redis when UPSTASH_REDIS_REST_URL + UPSTASH_REDIS_REST_TOKEN
 * are configured — persistent across all serverless instances.
 *
 * Falls back to in-memory Maps when Redis is not configured (local dev,
 * or production without Redis set up). In-memory limits reset on cold start.
 */

// ─── Upstash Redis path ───────────────────────────────────────────────────────

let redisRatelimit: ((key: string, limit: number, windowSecs: number) => Promise<boolean>) | null = null;

if (
  process.env.UPSTASH_REDIS_REST_URL &&
  process.env.UPSTASH_REDIS_REST_TOKEN
) {
  // Lazy-load to avoid import errors when packages aren't installed
  const initRedis = async () => {
    try {
      const { Redis } = await import('@upstash/redis');
      const { Ratelimit } = await import('@upstash/ratelimit');

      const redis = new Redis({
        url: process.env.UPSTASH_REDIS_REST_URL!,
        token: process.env.UPSTASH_REDIS_REST_TOKEN!,
      });

      // Cache ratelimit instances by key (limit:window)
      const limiters = new Map<string, InstanceType<typeof Ratelimit>>();

      redisRatelimit = async (key: string, limit: number, windowSecs: number) => {
        const cacheKey = `${limit}:${windowSecs}`;
        if (!limiters.has(cacheKey)) {
          limiters.set(cacheKey, new Ratelimit({
            redis,
            limiter: Ratelimit.slidingWindow(limit, `${windowSecs} s`),
            prefix: 'kuroko:rl',
          }));
        }
        const limiter = limiters.get(cacheKey)!;
        const { success } = await limiter.limit(key);
        return success;
      };
    } catch (err) {
      console.warn('[ratelimit] Failed to initialize Upstash Redis, falling back to in-memory:', err);
      redisRatelimit = null;
    }
  };

  void initRedis();
}

// ─── In-memory fallback ───────────────────────────────────────────────────────

type InMemoryEntry = { count: number; resetTime: number };
const inMemoryMaps = new Map<string, Map<string, InMemoryEntry>>();

function inMemoryCheck(
  namespace: string,
  ip: string,
  limit: number,
  windowMs: number,
): boolean {
  if (!inMemoryMaps.has(namespace)) {
    inMemoryMaps.set(namespace, new Map());
  }
  const map = inMemoryMaps.get(namespace)!;
  const now = Date.now();

  // Evict expired entries when map gets large
  if (map.size > 200) {
    for (const [key, val] of map.entries()) {
      if (now > val.resetTime) map.delete(key);
    }
  }

  const entry = map.get(ip);
  if (!entry || now > entry.resetTime) {
    map.set(ip, { count: 1, resetTime: now + windowMs });
    return true;
  }
  if (entry.count >= limit) return false;
  entry.count++;
  return true;
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Check rate limit for an IP address.
 * Returns true if the request is allowed, false if rate limited.
 *
 * @param namespace - unique identifier for this rate limit (e.g. 'aomi', 'markets')
 * @param ip - client IP address
 * @param limit - max requests per window
 * @param windowSecs - window size in seconds
 */
export async function checkRateLimit(
  namespace: string,
  ip: string,
  limit: number,
  windowSecs: number,
): Promise<boolean> {
  if (redisRatelimit) {
    try {
      return await redisRatelimit(`${namespace}:${ip}`, limit, windowSecs);
    } catch {
      // Redis error — fall through to in-memory
    }
  }
  return inMemoryCheck(namespace, ip, limit, windowSecs * 1000);
}
