// FILE: lib/partner/narrowPartnerResult/narrowPartnerResultTrust.test.ts

import { beforeEach, describe, expect, it, vi } from "vitest";
import { buildNarrowPartnerResultForReceipt } from "./build";

const getReceiptById = vi.fn();
const evaluateDecisionReceiptTrust = vi.fn();

vi.mock("@/lib/decisionReceipts/service", () => ({
  getReceiptById: (...args: unknown[]) => getReceiptById(...args),
}));

vi.mock("@/lib/decisionReceipts/trustEvaluation", () => ({
  evaluateDecisionReceiptTrust: (...args: unknown[]) => evaluateDecisionReceiptTrust(...args),
}));

vi.mock("@/lib/supabase/admin", () => ({
  requireSupabaseAdmin: () => ({
    from: () => ({
      select: () => ({
        eq: () => ({
          maybeSingle: async () => ({
            data: {
              decision: "approved",
              claims_json: {
                identity_verified: true,
                product_eligibility: true,
                product_eligibility_required: true,
              },
              subject_id: "sub_1",
            },
          }),
        }),
      }),
    }),
  }),
}));

function baseReceipt(overrides: Record<string, unknown> = {}) {
  return {
    id: "dr_trust",
    verification_decision_id: "dec_1",
    partner_id: "partner-a",
    policy_id: "partner-a-age_21_retail-v1",
    policy_version: 1,
    decision_result: "approved",
    schema_version: "1.0.0",
    payload_hash: "abc",
    signature: "sig",
    signing_key_id: "key",
    subject_pseudonym_id: "pseudo_1",
    ...overrides,
  };
}

function trustResult(overrides: Record<string, unknown> = {}) {
  return {
    currently_valid: true,
    signature_valid: true,
    production_usable: false,
    invalidation_reasons: [] as string[],
    validity: "active",
    ...overrides,
  };
}

describe("narrow partner result trust gating", () => {
  beforeEach(() => {
    getReceiptById.mockReset();
    evaluateDecisionReceiptTrust.mockReset();
  });

  it("strips eligibility facts when receipt is revoked", async () => {
    getReceiptById.mockResolvedValue(baseReceipt({ status: "revoked" }));
    evaluateDecisionReceiptTrust.mockResolvedValue(trustResult({
      currently_valid: false,
      invalidation_reasons: ["receipt_revoked"],
      validity: "revoked",
    }));

    const result = await buildNarrowPartnerResultForReceipt("dr_trust");
    expect(result?.currently_valid).toBe(false);
    expect(result?.invalidation_reasons).toContain("receipt_revoked");
    expect(result?.identity_verified).toBeUndefined();
    expect(result?.over_21).toBeUndefined();
  });

  it("strips eligibility facts when receipt is expired", async () => {
    getReceiptById.mockResolvedValue(baseReceipt());
    evaluateDecisionReceiptTrust.mockResolvedValue(trustResult({
      currently_valid: false,
      invalidation_reasons: ["receipt_expired"],
      validity: "expired",
    }));

    const result = await buildNarrowPartnerResultForReceipt("dr_trust");
    expect(result?.currently_valid).toBe(false);
    expect(result?.identity_verified).toBeUndefined();
  });

  it("strips eligibility facts when receipt is superseded", async () => {
    getReceiptById.mockResolvedValue(baseReceipt());
    evaluateDecisionReceiptTrust.mockResolvedValue(trustResult({
      currently_valid: false,
      invalidation_reasons: ["receipt_superseded"],
      validity: "superseded",
    }));

    const result = await buildNarrowPartnerResultForReceipt("dr_trust");
    expect(result?.currently_valid).toBe(false);
    expect(result?.identity_verified).toBeUndefined();
  });

  it("marks sandbox receipts as non-production_usable", async () => {
    getReceiptById.mockResolvedValue(baseReceipt({
      policy_id: "partner-a-age_21_retail-v1",
      decision_context: "sandbox",
    }));
    evaluateDecisionReceiptTrust.mockResolvedValue(trustResult({
      production_usable: false,
    }));

    const result = await buildNarrowPartnerResultForReceipt("dr_trust");
    expect(result?.trust_environment).toBe("sandbox");
    expect(result?.production_usable).toBe(false);
    expect(result?.over_21).toBe(true);
  });

  it("includes eligibility facts for valid current approved receipt", async () => {
    getReceiptById.mockResolvedValue(baseReceipt());
    evaluateDecisionReceiptTrust.mockResolvedValue(trustResult({
      production_usable: true,
    }));

    const result = await buildNarrowPartnerResultForReceipt("dr_trust");
    expect(result?.currently_valid).toBe(true);
    expect(result?.over_21).toBe(true);
    expect(result?.trust_environment).toBe("production");
  });

  it("strips facts when signature is invalid", async () => {
    getReceiptById.mockResolvedValue(baseReceipt());
    evaluateDecisionReceiptTrust.mockResolvedValue(trustResult({
      currently_valid: false,
      signature_valid: false,
      invalidation_reasons: ["signature_invalid"],
    }));

    const result = await buildNarrowPartnerResultForReceipt("dr_trust");
    expect(result?.currently_valid).toBe(false);
    expect(result?.identity_verified).toBeUndefined();
  });
});
