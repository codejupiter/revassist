export type RateLimitResult = {
  allowed: boolean;
  remaining: number;
  resetAt: number;
};

type RateLimitEntry = {
  count: number;
  resetAt: number;
};

export function createRateLimiter() {
  const store = new Map<string, RateLimitEntry>();

  return {
    check(key: string, limit: number, windowMs: number, now = Date.now()): RateLimitResult {
      const entry = store.get(key);

      if (!entry || now > entry.resetAt) {
        const resetAt = now + windowMs;
        store.set(key, { count: 1, resetAt });
        return { allowed: true, remaining: limit - 1, resetAt };
      }

      if (entry.count >= limit) {
        return { allowed: false, remaining: 0, resetAt: entry.resetAt };
      }

      entry.count += 1;
      return { allowed: true, remaining: limit - entry.count, resetAt: entry.resetAt };
    },
    clear() {
      store.clear();
    }
  };
}

export const analyzeRateLimiter = createRateLimiter();
