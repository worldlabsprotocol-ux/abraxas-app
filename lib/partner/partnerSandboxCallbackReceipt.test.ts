import { describe, expect, it } from "vitest";
import { buildPartnerSandboxCallbackView } from "./partnerSandboxCallback";
import { resolvePartnerSandboxCallbackDisplay } from "./partnerSandboxCallbackReceipt";
import type { DecisionReceiptPublicView } from "@/lib/decisionReceipts/types";

const baseReceipt = (over: Partial<DecisionReceiptPublicView> = {}): DecisionReceiptPublicView => ({
  receipt_id: "dr_test",
  schema_version: "1.0.0",
  policy_id: "p-wallet_control-v1",
  policy_version: 1,
  partner_id: "studio-test",
  decision_result: "approved",
  reason_codes: [],
  evaluated_at: new Date().toISOString(),
  expires_at: new Date(Date.now() + 3600_000).toISOString(),
  status: "active",
  signature_valid: true,
  currently_valid: true,
  production_usable: false,
  decision_context: "sandbox_only",
  artifact_type: "eligibility_decision_receipt",
  ...over,
});

describe("resolvePartnerSandboxCallbackDisplay", () => {
  it("does not treat forged status=approved without a real receipt", () => {
    const urlView = buildPartnerSandboxCallbackView(new URLSearchParams({
      status: "approved",
      receipt_id: "dr_forged_fake0001",
    }));
    const display = resolvePartnerSandboxCallbackDisplay({
      urlView,
      fetchStatus: "not_found",
      receipt: null,
    });
    expect(display.receipt_confirmed).toBe(false);
    expect(display.headline).toBe("Result could not be verified");
  });

  it("confirms real receipt with approved decision and valid signature", () => {
    const urlView = buildPartnerSandboxCallbackView(new URLSearchParams({
      status: "approved",
      receipt_id: "dr_dlZExz0CSUFxQoaj",
      partner_id: "studio-test",
      policy_id: "p-wallet_control-v1",
    }));
    const receipt = baseReceipt();
    const display = resolvePartnerSandboxCallbackDisplay({
      urlView,
      fetchStatus: "loaded",
      receipt,
    });
    expect(display.receipt_confirmed).toBe(true);
    expect(display.headline).toBe("Wallet control verified");
    expect(display.trust_level).toBe("verified");
  });

  it("rejects invalid signature even when URL says approved", () => {
    const urlView = buildPartnerSandboxCallbackView(new URLSearchParams({
      status: "approved",
      receipt_id: "dr_test",
    }));
    const display = resolvePartnerSandboxCallbackDisplay({
      urlView,
      fetchStatus: "loaded",
      receipt: baseReceipt({ signature_valid: false }),
    });
    expect(display.receipt_confirmed).toBe(false);
    expect(display.trust_level).toBe("invalid_signature");
  });

  it("flags URL partner/policy mismatch against signed receipt", () => {
    const urlView = buildPartnerSandboxCallbackView(new URLSearchParams({
      status: "approved",
      receipt_id: "dr_test",
      partner_id: "wrong-partner",
    }));
    const display = resolvePartnerSandboxCallbackDisplay({
      urlView,
      fetchStatus: "loaded",
      receipt: baseReceipt(),
    });
    expect(display.url_mismatches.length).toBeGreaterThan(0);
  });
});
