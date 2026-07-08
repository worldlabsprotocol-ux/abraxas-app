// FILE: lib/cielo/verifiedGuestPolicy.test.ts
import { describe, it, expect } from "vitest";
import { evaluateCieloVerifiedGuest, CIELO_VERIFIED_GUEST_POLICY_ID } from "./verifiedGuestPolicy";

describe("cielo-verified-guest-v1 policy", () => {
  it("approves fixture without identity credential", async () => {
    const result = await evaluateCieloVerifiedGuest("0xdeadbeef", { fixture: "approved" });
    expect(result.policy_id).toBe(CIELO_VERIFIED_GUEST_POLICY_ID);
    expect(result.decision).toBe("approved");
    expect(result.display_decision).toBe("APPROVED");
    expect(result.identity_credential_active).toBe(false);
  });

  it("returns manual_review when profile incomplete", async () => {
    const result = await evaluateCieloVerifiedGuest("0xdeadbeef", { fixture: "manual_review" });
    expect(result.decision).toBe("manual_review");
    expect(result.display_decision).toBe("MANUAL REVIEW");
  });

  it("returns not_eligible when account missing", async () => {
    const result = await evaluateCieloVerifiedGuest("0xdeadbeef", { fixture: "not_eligible" });
    expect(result.decision).toBe("not_eligible");
    expect(result.display_decision).toBe("NOT ELIGIBLE");
  });

  it("does not require identity for approved fixture", async () => {
    const result = await evaluateCieloVerifiedGuest("0xdeadbeef", { fixture: "approved" });
    expect(result.reason_codes).not.toContain("missing:identity_verified");
    expect(result.missing_steps).toHaveLength(0);
  });
});
