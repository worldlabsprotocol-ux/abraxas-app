// FILE: lib/partner/partnerFlowStaleEvidenceReissue.test.ts

import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  isStaleEvidenceReissueEligible,
  supersedeStalePartnerFlowDecisionIfNeeded,
} from "@/lib/partner/partnerFlowStaleEvidenceReissue";

const SUBJECT = "0x0000000000000000000000000000000000000000000000000000000000000002";
const PARTNER = "ref-wc-postrev-5ffe";
const POLICY = "ref-wc-postrev-5ffe-wallet_control-v1";
const DECISION_ID = "d84bdad0-0e40-49c9-a6f8-807f2fa6cfe6";
const RECEIPT_ID = "dr_CWMq7G-2iLwVSa0u";
const VR_ID = "50581b94-7062-423c-8000-000000000001";

const mockEvaluateDecisionReceiptTrust = vi.fn();
const mockGetReceiptByDecisionId = vi.fn();
const mockRequireSupabaseAdmin = vi.fn();

vi.mock("@/lib/decisionReceipts/trustEvaluation", () => ({
  evaluateDecisionReceiptTrust: (...args: unknown[]) => mockEvaluateDecisionReceiptTrust(...args),
}));

vi.mock("@/lib/decisionReceipts/service", () => ({
  getReceiptByDecisionId: (...args: unknown[]) => mockGetReceiptByDecisionId(...args),
}));

vi.mock("@/lib/supabase/admin", () => ({
  requireSupabaseAdmin: () => mockRequireSupabaseAdmin(),
}));

describe("isStaleEvidenceReissueEligible", () => {
  it("allows reissue for stale dependency evidence", () => {
    expect(isStaleEvidenceReissueEligible({
      currently_valid: false,
      invalidation_reasons: ["source_evidence_revoked"],
    })).toBe(true);
  });

  it("blocks reissue for fail-closed revocation", () => {
    expect(isStaleEvidenceReissueEligible({
      currently_valid: false,
      invalidation_reasons: ["claim_revoked"],
    })).toBe(false);
  });
});

describe("supersedeStalePartnerFlowDecisionIfNeeded", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("supersedes verification-request decisions when trust is stale", async () => {
    const update = vi.fn(() => ({
      eq: vi.fn(() => ({
        eq: vi.fn(async () => ({ error: null })),
      })),
    }));
    const from = vi.fn((table: string) => {
      if (table !== "verification_decisions") throw new Error(table);
      return {
        select: () => ({
          eq: () => ({
            eq: () => ({
              eq: () => ({
                order: () => ({
                  limit: () => ({
                    maybeSingle: async () => ({ data: { id: DECISION_ID }, error: null }),
                  }),
                }),
              }),
            }),
          }),
        }),
        update,
      };
    });
    mockRequireSupabaseAdmin.mockReturnValue({ from });
    mockGetReceiptByDecisionId.mockResolvedValue({
      id: RECEIPT_ID,
      policy_version: 1,
      decision_context: "sandbox_only",
    });
    mockEvaluateDecisionReceiptTrust.mockResolvedValue({
      currently_valid: false,
      invalidation_reasons: ["source_evidence_revoked"],
    });

    const result = await supersedeStalePartnerFlowDecisionIfNeeded({
      suiAddress: SUBJECT,
      partnerId: PARTNER,
      policyId: POLICY,
      verificationRequestId: VR_ID,
    });

    expect(result).toEqual({ superseded: true, replaced_receipt_id: RECEIPT_ID });
    expect(update).toHaveBeenCalledWith({ status: "superseded", idempotency_key: null });
  });

  it("does not supersede when receipt is still currently valid", async () => {
    const from = vi.fn((table: string) => {
      if (table !== "verification_decisions") throw new Error(table);
      return {
        select: () => ({
          eq: () => ({
            eq: () => ({
              eq: () => ({
                order: () => ({
                  limit: () => ({
                    maybeSingle: async () => ({ data: { id: DECISION_ID }, error: null }),
                  }),
                }),
              }),
            }),
          }),
        }),
      };
    });
    mockRequireSupabaseAdmin.mockReturnValue({ from });
    mockGetReceiptByDecisionId.mockResolvedValue({
      id: RECEIPT_ID,
      policy_version: 1,
      decision_context: "sandbox_only",
    });
    mockEvaluateDecisionReceiptTrust.mockResolvedValue({
      currently_valid: true,
      invalidation_reasons: [],
    });

    const result = await supersedeStalePartnerFlowDecisionIfNeeded({
      suiAddress: SUBJECT,
      partnerId: PARTNER,
      policyId: POLICY,
      verificationRequestId: VR_ID,
    });

    expect(result).toEqual({ superseded: false });
  });
});
