import { Redis } from "@upstash/redis";

export type RateLimitResult = {
  allowed: boolean;
  remaining: number;
  resetAt: number;
  store: "memory" | "redis";
};

type RateLimitEntry = {
  count: number;
  resetAt: number;
};

type RateLimitCounter = {
  count: number;
  resetAt: number;
};

export type RateLimitStore = {
  mode: RateLimitResult["store"];
  increment(key: string, windowMs: number, now?: number): Promise<RateLimitCounter> | RateLimitCounter;
  clear?(): Promise<void> | void;
};

type RedisRateLimitClient = Pick<Redis, "incr" | "pexpire" | "pttl">;

export class MemoryRateLimitStore implements RateLimitStore {
  mode = "memory" as const;
  private store = new Map<string, RateLimitEntry>();

  increment(key: string, windowMs: number, now = Date.now()): RateLimitCounter {
    const entry = this.store.get(key);

    if (!entry || now > entry.resetAt) {
      const resetAt = now + windowMs;
      this.store.set(key, { count: 1, resetAt });
      return { count: 1, resetAt };
    }

    entry.count += 1;
    return { count: entry.count, resetAt: entry.resetAt };
  }

  clear() {
    this.store.clear();
  }
}

export class RedisRateLimitStore implements RateLimitStore {
  mode = "redis" as const;

  constructor(
    private redis: RedisRateLimitClient,
    private prefix = process.env.REVASSIST_RATE_LIMIT_PREFIX ?? "revassist:rate"
  ) {}

  async increment(key: string, windowMs: number, now = Date.now()): Promise<RateLimitCounter> {
    const redisKey = `${this.prefix}:${key}`;
    const count = await this.redis.incr(redisKey);

    if (count === 1) {
      await this.redis.pexpire(redisKey, windowMs);
    }

    let ttl = await this.redis.pttl(redisKey);
    if (ttl <= 0) {
      await this.redis.pexpire(redisKey, windowMs);
      ttl = windowMs;
    }

    return {
      count,
      resetAt: now + ttl
    };
  }
}

let redis: Redis | null = null;

export function hasRedisRateLimitEnv() {
  return Boolean(process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN);
}

function getRedisClient() {
  if (!hasRedisRateLimitEnv()) {
    throw new Error("UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN are required for Redis rate limiting.");
  }

  if (!redis) {
    redis = Redis.fromEnv();
  }

  return redis;
}

export function createDefaultRateLimitStore(): RateLimitStore {
  if (hasRedisRateLimitEnv()) {
    return new RedisRateLimitStore(getRedisClient());
  }

  if (process.env.REVASSIST_REQUIRE_DURABLE_RATE_LIMIT === "true") {
    throw new Error("Durable rate limiting requires Upstash Redis environment variables.");
  }

  return new MemoryRateLimitStore();
}

export function createRateLimiter(store: RateLimitStore = createDefaultRateLimitStore()) {
  return {
    store: store.mode,
    async check(key: string, limit: number, windowMs: number, now = Date.now()): Promise<RateLimitResult> {
      const entry = await store.increment(key, windowMs, now);

      if (entry.count > limit) {
        return { allowed: false, remaining: 0, resetAt: entry.resetAt, store: store.mode };
      }

      return {
        allowed: true,
        remaining: Math.max(0, limit - entry.count),
        resetAt: entry.resetAt,
        store: store.mode
      };
    },
    async clear() {
      await store.clear?.();
    }
  };
}

export const analyzeRateLimiter = createRateLimiter();
