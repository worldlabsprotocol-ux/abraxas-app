import { describe, expect, it } from "vitest";
import { WEBHOOK_RETRY_DELAYS_MS, WEBHOOK_MAX_ATTEMPTS } from "@/lib/partner/webhooks/types";

describe("webhook retry policy", () => {
  it("uses bounded exponential backoff delays", () => {
    expect(WEBHOOK_RETRY_DELAYS_MS).toEqual([
      60_000,
      5 * 60_000,
      15 * 60_000,
      60 * 60_000,
      4 * 60 * 60_000,
    ]);
    expect(WEBHOOK_MAX_ATTEMPTS).toBe(6);
  });
});
