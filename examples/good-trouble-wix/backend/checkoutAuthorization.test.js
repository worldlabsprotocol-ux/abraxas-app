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
};

const BROWSE_RECEIPT = {
  artifact_type: "browse_access_receipt",
  valid_for_purchase: false,
  purpose: "browse",
  assurance_level: "L0",
  partner_id: "good-trouble-cannabis",
  policy_id: "good-trouble-browse-v1",
  expires_at: new Date(Date.now() + 3600000).toISOString(),
};

describe("regulated checkout authorization", () => {
  it("rejects URL status=approved alone", () => {
    expect(authorizeRegulatedCheckout({ urlStatus: "approved" }).authorized).toBe(false);
  });

  it("rejects sessionStorage pilot flags", () => {
    expect(authorizeRegulatedCheckout({ sessionStoragePilotFlag: "1" }).authorized).toBe(false);
  });

  it("rejects self-attested browse-only signals", () => {
    expect(authorizeRegulatedCheckout({ selfAttestedBrowseOnly: true }).authorized).toBe(false);
  });

  it("rejects browse receipts at checkout", () => {
    expect(validateSandboxReceipt(BROWSE_RECEIPT).verified).toBe(false);
    expect(authorizeRegulatedCheckout({ receipt: BROWSE_RECEIPT }).authorized).toBe(false);
  });

  it("accepts validated authoritative retail receipt", () => {
    expect(validateSandboxReceipt(RETAIL_RECEIPT).verified).toBe(true);
    expect(authorizeRegulatedCheckout({ receipt: RETAIL_RECEIPT }).authorized).toBe(true);
  });

  it("browse validator accepts L0 browse payload for UI gate only", () => {
    expect(validateBrowseAccessPayload(BROWSE_RECEIPT).verified).toBe(true);
  });
});
