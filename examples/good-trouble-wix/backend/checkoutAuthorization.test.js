// FILE: examples/good-trouble-wix/backend/checkoutAuthorization.test.js

import { describe, expect, it } from "vitest";
import { authorizeRegulatedCheckout } from "./checkoutAuthorization.js";
import { validateSandboxReceipt } from "./abraxasReceiptValidator.js";
import { validateBrowseAccessPayload } from "./browseReceiptValidator.js";

const RETAIL_RECEIPT = {
  signature_valid: true,
  decision_result: "approved",
  status: "active",
  partner_id: "good-trouble-cannabis",
  policy_id: "good-trouble-retail-v1",
  schema_version: "1.0.0",
  artifact_type: "eligibility_decision_receipt",
  production_usable: false,
  decision_context: "sandbox_only",
  invalidation_reasons: ["production_not_usable:false"],
  expires_at: new Date(Date.now() + 3600000).toISOString(),
  evaluated_claim_refs: [],
  assurance_level: "L2",
};

const BROWSE_RECEIPT = {
  artifact_type: "browse_access_receipt",
  valid_for_purchase: false,
  purpose: "browse",
  assurance_level: "L0",
  age_band: "over_21",
  partner_id: "good-trouble-cannabis",
  policy_id: "good-trouble-browse-v1",
  expires_at: new Date(Date.now() + 3600000).toISOString(),
};

describe("regulated checkout authorization", () => {
  it("rejects URL status=approved alone", () => {
    expect(authorizeRegulatedCheckout({ urlStatus: "approved" }).authorized).toBe(false);
  });

  it("rejects sessionStorage pilot flags", () => {
    expect(authorizeRegulatedCheckout({ sessionStoragePurchaseFlag: "1" }).authorized).toBe(false);
  });

  it("rejects browse session flag at checkout", () => {
    expect(authorizeRegulatedCheckout({ sessionStorageBrowseFlag: "1" }).authorized).toBe(false);
  });

  it("rejects self-attested browse-only signals", () => {
    expect(authorizeRegulatedCheckout({ selfAttestedBrowseOnly: true }).authorized).toBe(false);
  });

  it("rejects browse receipts at checkout", () => {
    expect(validateSandboxReceipt(BROWSE_RECEIPT).verified).toBe(false);
    expect(authorizeRegulatedCheckout({ receipt: BROWSE_RECEIPT, flowConsumed: true }).authorized).toBe(false);
  });

  it("rejects purchase receipt when flow not consumed", () => {
    expect(authorizeRegulatedCheckout({ receipt: RETAIL_RECEIPT, flowConsumed: false }).authorized).toBe(false);
  });

  it("accepts validated authoritative retail receipt when flow consumed", () => {
    expect(validateSandboxReceipt(RETAIL_RECEIPT).verified).toBe(true);
    expect(authorizeRegulatedCheckout({
      receipt: RETAIL_RECEIPT,
      flowConsumed: true,
      flowPurpose: "purchase",
      flowPolicyId: "good-trouble-retail-v1",
    }).authorized).toBe(true);
  });

  it("browse validator accepts L0 browse payload for UI gate only", () => {
    expect(validateBrowseAccessPayload(BROWSE_RECEIPT).verified).toBe(true);
  });
});
