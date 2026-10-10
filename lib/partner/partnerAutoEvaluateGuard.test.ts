import { describe, expect, it } from "vitest";
import {
  shouldAutoEvaluateSolanaPartnerFlow,
  shouldBlockPartnerEvaluateRetry,
} from "@/lib/partner/partnerAutoEvaluateGuard";

describe("partnerAutoEvaluateGuard", () => {
  it("allows auto-evaluate only on sign_in with ready holder", () => {
    expect(shouldAutoEvaluateSolanaPartnerFlow({
      solanaNative: true,
      holderReady: true,
      authLoading: false,
      phase: "sign_in",
      invalidLink: false,
      flowParamsReady: true,
      previewPhaseActive: false,
      launchpadPending: false,
    })).toBe(true);
  });

  it("blocks auto-evaluate when phase is terminal", () => {
    expect(shouldBlockPartnerEvaluateRetry("denied")).toBe(true);
    expect(shouldBlockPartnerEvaluateRetry("sign_in")).toBe(false);
  });
});
