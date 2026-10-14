import { describe, expect, it, vi } from "vitest";
import { checkCaptureRateLimit, getCaptureRateLimitPerHour } from "./captureGuard";

const HS = "abx_hs_aabbccddeeff00112233445566778899";
const SUI = "0x00000000000000000000000000000000000000000000000000000000000000aa";

function mockSupabaseCount(count: number | null, error: { message: string } | null) {
  return {
    from: () => ({
      select: () => ({
        eq: () => ({
          gte: () => Promise.resolve({ count, error }),
        }),
      }),
    }),
  } as unknown as Parameters<typeof checkCaptureRateLimit>[0];
}

describe("captureGuard", () => {
  it("defaults rate limit to 5 per hour", () => {
    delete process.env.ABRAXAS_CAPTURE_RATE_LIMIT_PER_HOUR;
    expect(getCaptureRateLimitPerHour()).toBe(5);
  });

  it("blocks when attempts exceed limit", async () => {
    const result = await checkCaptureRateLimit(mockSupabaseCount(5, null), SUI);
    expect(result.allowed).toBe(false);
    expect(result.unavailable).toBeFalsy();
    expect(result.retryAfterSec).toBe(3600);
  });

  it("allows when under limit", async () => {
    const result = await checkCaptureRateLimit(mockSupabaseCount(2, null), SUI);
    expect(result.allowed).toBe(true);
    expect(result.unavailable).toBeFalsy();
  });

  it("fail-closed when storage is unavailable", async () => {
    const spy = vi.spyOn(console, "log").mockImplementation(() => {});
    const result = await checkCaptureRateLimit(
      mockSupabaseCount(null, { message: "relation does not exist" }),
      SUI,
    );
    expect(result.allowed).toBe(false);
    expect(result.unavailable).toBe(true);
    expect(result.unavailableReason).toBe("storage_unavailable");
    expect(result.retryAfterSec).toBe(120);
    const logged = spy.mock.calls.map(c => JSON.stringify(c[0])).join("");
    expect(logged).not.toContain("relation does not exist");
    spy.mockRestore();
  });

  it("fail-closed on missing holder_subject_id column (schema drift)", async () => {
    const result = await checkCaptureRateLimit(
      mockSupabaseCount(null, { message: 'column "holder_subject_id" does not exist' }),
      HS,
    );
    expect(result.allowed).toBe(false);
    expect(result.unavailable).toBe(true);
  });

  it("scopes rate limit queries to chain-neutral holder_subject_id", async () => {
    const eqCalls: string[] = [];
    const supabase = {
      from: () => ({
        select: () => ({
          eq: (col: string) => {
            eqCalls.push(col);
            return {
              gte: () => Promise.resolve({ count: 0, error: null }),
            };
          },
        }),
      }),
    } as unknown as Parameters<typeof checkCaptureRateLimit>[0];

    await checkCaptureRateLimit(supabase, HS);
    expect(eqCalls).toContain("holder_subject_id");
  });
});
