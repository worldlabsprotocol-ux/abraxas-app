// FILE: lib/solanaMobile/mobileProofBoundary.test.ts

import { describe, expect, it } from "vitest";
import {
  BROWSE_POLICY_ID,
  GOOD_TROUBLE_PARTNER_ID,
  PURCHASE_POLICY_ID,
} from "./mobileProofContract";
import {
  authorizeRegulatedPurchase,
  validateBrowseAccessProof,
  validateEligibilityDecisionProof,
} from "./mobileProofValidator";

const FUTURE = "2099-01-01T00:00:00.000Z";
const PAST = "2000-01-01T00:00:00.000Z";

const VALID_BROWSE = {
  artifact_type: "browse_access_receipt",
  purpose: "browse",
  valid_for_purchase: false,
  assurance_level: "L0",
  age_band: "over_21",
  partner_id: GOOD_TROUBLE_PARTNER_ID,
  policy_id: BROWSE_POLICY_ID,
  receipt_id: "br_demo_1",
  issued_at: "2026-09-09T00:00:00.000Z",
  expires_at: FUTURE,
};

const VALID_PURCHASE = {
  artifact_type: "eligibility_decision_receipt",
  purpose: "purchase",
  valid_for_purchase: true,
  assurance_level: "L2",
  partner_id: GOOD_TROUBLE_PARTNER_ID,
  policy_id: PURCHASE_POLICY_ID,
  decision_result: "approved",
  over_21: true,
  receipt_id: "dr_demo_1",
  issued_at: "2026-09-09T00:00:00.000Z",
  expires_at: FUTURE,
};

describe("mobile browse proof validation", () => {
  it("accepts valid L0 browse proof", () => {
    expect(validateBrowseAccessProof(VALID_BROWSE).ok).toBe(true);
  });

  it("rejects expired browse proof", () => {
    const result = validateBrowseAccessProof({ ...VALID_BROWSE, expires_at: PAST });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe("receipt_expired");
  });

  it("rejects partner/policy/purpose mismatch", () => {
    expect(validateBrowseAccessProof({ ...VALID_BROWSE, policy_id: "wrong" }).ok).toBe(false);
    expect(validateBrowseAccessProof({ ...VALID_BROWSE, partner_id: "wrong" }).ok).toBe(false);
    expect(validateBrowseAccessProof({ ...VALID_BROWSE, purpose: "purchase" }).ok).toBe(false);
  });

  it("rejects proofs containing DOB", () => {
    const result = validateBrowseAccessProof({ ...VALID_BROWSE, date_of_birth: "1990-01-01" });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe("forbidden_pii");
  });
});

describe("mobile purchase proof validation", () => {
  it("accepts valid L2 purchase proof", () => {
    expect(validateEligibilityDecisionProof(VALID_PURCHASE).ok).toBe(true);
  });

  it("rejects L0 assurance on purchase proof", () => {
    const result = validateEligibilityDecisionProof({ ...VALID_PURCHASE, assurance_level: "L0" });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe("insufficient_assurance");
  });
});

describe("regulated purchase authorization (fail-closed)", () => {
  it("rejects L0 browse proof for purchase", () => {
    const result = authorizeRegulatedPurchase({
      proof: VALID_BROWSE,
      walletVerified: true,
      flowConsumed: true,
    });
    expect(result.authorized).toBe(false);
    if (!result.authorized) expect(result.code).toBe("browse_receipt_not_valid_for_purchase");
  });

  it("rejects URL-only approval", () => {
    expect(authorizeRegulatedPurchase({ urlStatus: "approved" }).authorized).toBe(false);
  });

  it("rejects browse session flag at checkout", () => {
    expect(authorizeRegulatedPurchase({ sessionBrowseFlag: "1" }).authorized).toBe(false);
  });

  it("rejects replay", () => {
    expect(
      authorizeRegulatedPurchase({
        proof: VALID_PURCHASE,
        walletVerified: true,
        flowConsumed: true,
        replaySeen: true,
      }).authorized,
    ).toBe(false);
  });

  it("rejects unverified wallet", () => {
    expect(
      authorizeRegulatedPurchase({
        proof: VALID_PURCHASE,
        walletVerified: false,
        flowConsumed: true,
      }).authorized,
    ).toBe(false);
  });

  it("authorizes consumed L2+ partner-bound purchase proof", () => {
    expect(
      authorizeRegulatedPurchase({
        proof: VALID_PURCHASE,
        walletVerified: true,
        flowConsumed: true,
      }).authorized,
    ).toBe(true);
  });
});
