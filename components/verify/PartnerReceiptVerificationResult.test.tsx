// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import type { PartnerFlowPublicReceipt } from "@/lib/partner/verifyPartnerFlowReceipt";
import { PartnerReceiptVerificationResult } from "@/components/verify/PartnerReceiptVerificationResult";

function sampleReceipt(overrides: Partial<PartnerFlowPublicReceipt> = {}): PartnerFlowPublicReceipt {
  return {
    receipt_id: "dr_partner_test",
    partner_id: "good-trouble",
    policy_id: "partner-age_21_retail-v1",
    decision_result: "approved",
    signature_valid: true,
    status: "active",
    production_usable: true,
    decision_context: "production",
    expires_at: "2099-01-01T00:00:00.000Z",
    currently_valid: true,
    lifecycle_status: "active",
    ...overrides,
  };
}

describe("PartnerReceiptVerificationResult", () => {
  it("shows action permitted for valid receipt", () => {
    render(
      <PartnerReceiptVerificationResult
        receipt={sampleReceipt()}
        validation={{ ok: true, errors: [] }}
        partnerId="good-trouble"
        policyId="partner-age_21_retail-v1"
      />,
    );

    expect(screen.getByText(/Receipt verified — action permitted/)).toBeTruthy();
    expect(screen.getByText("21+ verified")).toBeTruthy();
  });

  it("shows safe denial without internal diagnostics", () => {
    render(
      <PartnerReceiptVerificationResult
        receipt={sampleReceipt({
          currently_valid: false,
          partner_safe_reason: "receipt_expired",
          status: "expired",
        })}
        validation={{ ok: false, errors: ["expired"] }}
        partnerId="good-trouble"
        policyId="partner-age_21_retail-v1"
      />,
    );

    expect(screen.getByText("Receipt expired")).toBeTruthy();
    expect(screen.queryByText("expired")).toBeNull();
  });
});
