import { describe, expect, it } from "vitest";
import { createRateLimiter, MemoryRateLimitStore, RedisRateLimitStore } from "@/lib/server/rate-limit";

class FakeRedisClient {
  counts = new Map<string, number>();
  expirations = new Map<string, number>();

  async incr(key: string) {
    const next = (this.counts.get(key) ?? 0) + 1;
    this.counts.set(key, next);
    return next;
  }

  async pexpire(key: string, ttl: number) {
    this.expirations.set(key, ttl);
    return 1 as const;
  }

  async pttl(key: string) {
    return this.expirations.get(key) ?? -1;
  }
}

describe("rate limiter", () => {
  it("allows requests until the limit is reached", async () => {
    const limiter = createRateLimiter(new MemoryRateLimitStore());
    await expect(limiter.check("tenant:user", 2, 1000, 100)).resolves.toMatchObject({
      allowed: true,
      remaining: 1,
      store: "memory"
    });
    await expect(limiter.check("tenant:user", 2, 1000, 200)).resolves.toMatchObject({
      allowed: true,
      remaining: 0
    });
    await expect(limiter.check("tenant:user", 2, 1000, 300)).resolves.toMatchObject({
      allowed: false,
      remaining: 0
    });
  });

  it("resets after the memory window expires", async () => {
    const limiter = createRateLimiter(new MemoryRateLimitStore());
    await expect(limiter.check("tenant:user", 1, 1000, 100)).resolves.toMatchObject({ allowed: true });
    await expect(limiter.check("tenant:user", 1, 1000, 200)).resolves.toMatchObject({ allowed: false });
    await expect(limiter.check("tenant:user", 1, 1000, 1200)).resolves.toMatchObject({ allowed: true });
  });

  it("uses Redis TTLs for durable windows", async () => {
    const redis = new FakeRedisClient();
    const limiter = createRateLimiter(new RedisRateLimitStore(redis, "test:rate"));

    await expect(limiter.check("dealer:user", 2, 60_000, 1_000)).resolves.toMatchObject({
      allowed: true,
      remaining: 1,
      resetAt: 61_000,
      store: "redis"
    });
    await expect(limiter.check("dealer:user", 2, 60_000, 2_000)).resolves.toMatchObject({
      allowed: true,
      remaining: 0,
      store: "redis"
    });
    await expect(limiter.check("dealer:user", 2, 60_000, 3_000)).resolves.toMatchObject({
      allowed: false,
      remaining: 0,
      store: "redis"
    });
    expect(redis.counts.get("test:rate:dealer:user")).toBe(3);
    expect(redis.expirations.get("test:rate:dealer:user")).toBe(60_000);
  });
});
