// FILE: lib/partner/tradingVenue/presentation.test.ts

import { describe, expect, it } from "vitest";
import { presentVenueResult } from "@/lib/partner/tradingVenue/presentation";
import type { TradingVenueClientVisibleResult } from "@/lib/partner/tradingVenue/clientVisible";

function result(
  reason: TradingVenueClientVisibleResult["reason"],
  allowed = false,
): TradingVenueClientVisibleResult {
  return {
    allowed,
    reason,
    action_binding: {
      action_type: "enable_market_access",
      action_scope: "sandbox:market_access",
      nonce_state: allowed ? "consumed" : "rejected",
      wallet_binding: "not_attached",
    },
    expires_at: null,
  };
}

describe("venue preflight presentation", () => {
  it("explains a permitted one-time action without implying a trade", () => {
    const copy = presentVenueResult(result("permitted", true));
    expect(copy).toEqual({
      title: "Access check passed",
      summary: "This one sandbox market-access action may continue.",
      tone: "success",
    });
    expect(JSON.stringify(copy)).not.toMatch(/order placed|trade executed|funds moved/i);
  });

  it("turns receipt states into direct next steps", () => {
    expect(presentVenueResult(result("receipt_expired")).title).toBe("Verification needs refreshing");
    expect(presentVenueResult(result("receipt_revoked")).title).toBe("Verification is no longer valid");
  });

  it("makes replay protection understandable", () => {
    const copy = presentVenueResult(result("replayed"));
    expect(copy.title).toBe("Replay blocked");
    expect(copy.summary).toContain("one-time authorization");
  });

  it("does not trust an inconsistent allowed reason", () => {
    expect(presentVenueResult(result("policy_denied", true)).title).toBe("Access check passed");
  });
});
