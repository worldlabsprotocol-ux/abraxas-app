import { describe, expect, it } from "vitest";
import {
  BUILD_546_PARTNER_ID,
  BUILD_546_POLICY_ID,
  build546SampleRecord,
} from "@/lib/institutionalCertification/build546/fixtures";
import { composeHolderPolicyScopedPresentation } from "./holderPolicyPresentation";
import {
  auditSignedReceiptCorrelationSurface,
  validatePresentationReceiptStrictBinding,
} from "./presentationReceiptBinding";

describe("presentation-receipt strict binding", () => {
  it("accepts composed presentation aligned with signed receipt", () => {
    const signed = build546SampleRecord();
    const presentation = composeHolderPolicyScopedPresentation({
      signedRecord: signed,
      audiencePartnerId: BUILD_546_PARTNER_ID,
    });
    const result = validatePresentationReceiptStrictBinding({
      presentation,
      relyingParty: { partnerId: BUILD_546_PARTNER_ID, policyId: BUILD_546_POLICY_ID },
    });
    expect(result.ok).toBe(true);
  });

  it("documents correlation surface on synthetic receipt without obvious PII field names", () => {
    const signed = build546SampleRecord();
    const audit = auditSignedReceiptCorrelationSurface(signed);
    expect(audit.no_obvious_pii_field_names).toBe(true);
    expect(audit.present_fields).toContain("receipt_id");
    expect(audit.correlation_risks.length).toBeGreaterThan(0);
  });
});
