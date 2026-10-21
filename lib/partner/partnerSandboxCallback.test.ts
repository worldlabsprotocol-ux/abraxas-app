import { describe, expect, it } from "vitest";
import {
  buildPartnerSandboxCallbackView,
  isKnownInternalPartnerReturnPath,
  PARTNER_SANDBOX_CALLBACK_PATH,
} from "./partnerSandboxCallback";

describe("partnerSandboxCallback", () => {
  it("recognizes the sandbox callback route", () => {
    expect(isKnownInternalPartnerReturnPath(PARTNER_SANDBOX_CALLBACK_PATH)).toBe(true);
    expect(isKnownInternalPartnerReturnPath("/partner/missing")).toBe(false);
  });

  it("builds approved wallet-control holder copy from partner-flow redirect params", () => {
    const view = buildPartnerSandboxCallbackView(new URLSearchParams({
      status: "approved",
      receipt_id: "dr_test_approved",
      partner_id: "studio-test",
      policy_id: "studio-test-wallet_control-v1",
      decision_id: "vd_test",
    }));
    expect(view.holder_outcome).toBe("approved");
    expect(view.headline).toBe("Wallet control verified");
    expect(view.parse_errors).toEqual([]);
  });

  it("rejects callbacks missing receipt_id", () => {
    const view = buildPartnerSandboxCallbackView(new URLSearchParams({ status: "approved" }));
    expect(view.holder_outcome).toBe("invalid_callback");
    expect(view.parse_errors).toContain("receipt_id_missing");
  });

  it("flags forbidden callback keys", () => {
    const view = buildPartnerSandboxCallbackView(new URLSearchParams({
      receipt_id: "dr_x",
      email: "a@example.com",
    }));
    expect(view.forbidden_detected).toBe(true);
  });
});
