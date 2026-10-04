// FILE: lib/partner/twoAppEvaluation/callbackContinuation.test.ts

import { describe, expect, it } from "vitest";
import {
  buildTwoAppEvalCallbackContinuationView,
  twoAppEvalJourneyHref,
} from "./callbackContinuation";

describe("two-app evaluation callback continuation", () => {
  it("never marks callback as trusted and always requires server verification", () => {
    const view = buildTwoAppEvalCallbackContinuationView(
      new URLSearchParams({
        receipt_id: "dr_test_001",
        status: "approved",
        partner_id: "studio-eval-abc",
        policy_id: "studio-eval-abc-identity_liveness-v1",
      }),
    );
    expect(view.callback_trusted).toBe(false);
    expect(view.server_verification_required).toBe(true);
    expect(view.holder_outcome).toBe("approved");
    expect(view.hints.receipt_id).toBe("dr_test_001");
  });

  it("detects forbidden callback keys without treating them as authorization", () => {
    const view = buildTwoAppEvalCallbackContinuationView(
      new URLSearchParams({
        receipt_id: "dr_test_002",
        email: "holder@example.com",
      }),
    );
    expect(view.forbidden_detected).toBe(true);
    expect(view.callback_trusted).toBe(false);
  });

  it("maps denied holder outcomes safely", () => {
    const view = buildTwoAppEvalCallbackContinuationView(
      new URLSearchParams({ status: "denied" }),
    );
    expect(view.holder_outcome).toBe("denied");
    expect(view.hints.receipt_id).toBeNull();
  });

  it("builds evaluation journey href", () => {
    expect(twoAppEvalJourneyHref("eval_123")).toBe("/evaluation/two-app?id=eval_123");
    expect(twoAppEvalJourneyHref(null)).toBe("/evaluation/two-app");
  });
});
