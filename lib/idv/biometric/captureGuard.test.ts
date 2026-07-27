import { describe, expect, it, vi } from "vitest";
import { checkCaptureRateLimit, getCaptureRateLimitPerHour } from "./captureGuard";

describe("captureGuard", () => {
  it("defaults rate limit to 5 per hour", () => {
    delete process.env.ABRAXAS_CAPTURE_RATE_LIMIT_PER_HOUR;
    expect(getCaptureRateLimitPerHour()).toBe(5);
  });

  it("blocks when attempts exceed limit", async () => {
    const supabase = {
      from: () => ({
        select: () => ({
          eq: () => ({
            gte: () => Promise.resolve({ count: 5, error: null }),
          }),
        }),
      }),
    } as unknown as Parameters<typeof checkCaptureRateLimit>[0];

    const result = await checkCaptureRateLimit(supabase, "0xabc");
    expect(result.allowed).toBe(false);
    expect(result.retryAfterSec).toBe(3600);
  });

  it("allows when under limit", async () => {
    const supabase = {
      from: () => ({
        select: () => ({
          eq: () => ({
            gte: () => Promise.resolve({ count: 2, error: null }),
          }),
        }),
      }),
    } as unknown as Parameters<typeof checkCaptureRateLimit>[0];

    const result = await checkCaptureRateLimit(supabase, "0xabc");
    expect(result.allowed).toBe(true);
  });

  it("allows on missing assessments table (pre-migration)", async () => {
    const supabase = {
      from: () => ({
        select: () => ({
          eq: () => ({
            gte: () => Promise.resolve({ count: null, error: { message: "relation does not exist" } }),
          }),
        }),
      }),
    } as unknown as Parameters<typeof checkCaptureRateLimit>[0];

    const spy = vi.spyOn(console, "log").mockImplementation(() => {});
    const result = await checkCaptureRateLimit(supabase, "0xabc");
    expect(result.allowed).toBe(true);
    spy.mockRestore();
  });
});
