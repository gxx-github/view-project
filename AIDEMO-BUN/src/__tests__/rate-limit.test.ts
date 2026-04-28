import { describe, it, expect } from "vitest";
import { rateLimit } from "@/lib/rate-limit";

describe("rateLimit", () => {
  it("should allow requests under limit", () => {
    const result = rateLimit(`test-${Date.now()}`);
    expect(result.allowed).toBe(true);
    expect(result.remaining).toBeGreaterThan(0);
  });

  it("should block requests over limit", () => {
    const key = `test-block-${Date.now()}`;
    // Exhaust the limit (20 requests per minute)
    for (let i = 0; i < 20; i++) {
      rateLimit(key);
    }
    const result = rateLimit(key);
    expect(result.allowed).toBe(false);
    expect(result.remaining).toBe(0);
  });

  it("should track different keys independently", () => {
    const key1 = `test-independent-1-${Date.now()}`;
    const key2 = `test-independent-2-${Date.now()}`;
    for (let i = 0; i < 20; i++) {
      rateLimit(key1);
    }
    expect(rateLimit(key1).allowed).toBe(false);
    expect(rateLimit(key2).allowed).toBe(true);
  });
});
