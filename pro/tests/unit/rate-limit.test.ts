import { describe, expect, it } from "vitest";
import { createRateLimiter } from "@/lib/server/rate-limit";

describe("rate limiter", () => {
  it("allows requests until the limit is reached", () => {
    const limiter = createRateLimiter();
    expect(limiter.check("tenant:user", 2, 1000, 100).allowed).toBe(true);
    expect(limiter.check("tenant:user", 2, 1000, 200).allowed).toBe(true);
    expect(limiter.check("tenant:user", 2, 1000, 300).allowed).toBe(false);
  });

  it("resets after the window expires", () => {
    const limiter = createRateLimiter();
    expect(limiter.check("tenant:user", 1, 1000, 100).allowed).toBe(true);
    expect(limiter.check("tenant:user", 1, 1000, 200).allowed).toBe(false);
    expect(limiter.check("tenant:user", 1, 1000, 1200).allowed).toBe(true);
  });
});
