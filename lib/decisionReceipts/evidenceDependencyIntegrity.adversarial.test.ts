// FILE: lib/decisionReceipts/evidenceDependencyIntegrity.adversarial.test.ts

import { describe, expect, it, vi, beforeEach } from "vitest";
import type { DecisionReceiptRecord } from "@/lib/decisionReceipts/types";
import {
  EvidenceDependencyStoreUnavailableError,
  getReceiptEvidenceDependencies,
} from "@/lib/decisionReceipts/evidenceDependencies";
import { resolveReceiptValidity } from "@/lib/decisionReceipts/validityResolver";
import { evaluateReceiptCurrentValidity } from "@/lib/decisionReceipts/currentValidity/evaluate";
import { sourceEvidenceStillValidForReceipt } from "@/lib/passport/reusableEligibility/invalidation";

vi.mock("@/lib/decisionReceipts/evidenceDependencies", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/decisionReceipts/evidenceDependencies")>();
  return {
    ...actual,
    getReceiptEvidenceDependencies: vi.fn(),
    receiptRequiresEvidenceDependencyGraph: vi.fn(),
  };
});

vi.mock("@/lib/passport/reusableEligibility/invalidation", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/passport/reusableEligibility/invalidation")>();
  return {
    ...actual,
    loadSourceReceiptRow: vi.fn(),
    resolveSourceFactForDerivedReceipt: vi.fn(),
  };
});

vi.mock("@/lib/decisionReceipts/dependencies", () => ({
  getReceiptDependencies: vi.fn(async () => []),
}));

vi.mock("@/lib/trust/credentialStatusRegistry", () => ({
  getClaimById: vi.fn(async () => ({
    status: "active",
    expires_at: null,
    assurance_level: null,
    jurisdiction: null,
    issued_at: new Date().toISOString(),
  })),
  resolveClaimStatusAtRead: vi.fn(() => "active" as const),
}));

vi.mock("@/lib/trust/issuerFramework", () => ({
  getIssuerById: vi.fn(async () => ({ issuer_status: "active" })),
  getIssuerSigningKey: vi.fn(async () => ({ status: "active" })),
  isIssuerTrustedForClaim: vi.fn(async () => ({ ok: true as const })),
}));

vi.mock("@/lib/decisionReceipts/receiptSupersession", () => ({
  isReceiptSuperseded: vi.fn(async () => ({ superseded: false })),
}));

vi.mock("@/lib/decisionReceipts/trustEvaluation.server", () => ({
  evaluateDecisionReceiptTrust: vi.fn(async () => ({
    currently_valid: true,
    production_usable: true,
    invalidation_reasons: [] as string[],
  })),
}));

vi.mock("@/lib/policy/getPolicy", () => ({
  getPartnerPolicyAtVersion: vi.fn(async () => ({ status: "active", deprecate_effective_at: null })),
}));

vi.mock("@/lib/supabase/admin", () => ({
  requireSupabaseAdmin: vi.fn(() => ({
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          maybeSingle: vi.fn(async () => ({ data: { status: "active" } })),
        })),
      })),
    })),
  })),
}));

const baseRecord: DecisionReceiptRecord = {
  id: "dr_reuseDerived1",
  verification_decision_id: "00000000-0000-4000-8000-000000000001",
  consent_receipt_id: null,
  partner_id: "partner_a",
  policy_id: "policy_a",
  policy_version: 1,
  subject_pseudonym_id: "subj_a",
  wallet_binding_ref: null,
  decision_result: "approved",
  reason_codes: [],
  evaluated_claim_refs: [{
    claim_id: "00000000-0000-4000-8000-000000000099",
    claim_type: "age21",
    issuer_id: "issuer_a",
    status: "active",
    issued_at: new Date().toISOString(),
    expires_at: null,
  }],
  issuer_refs: [],
  decision_context: "production",
  evaluated_at: new Date().toISOString(),
  expires_at: null,
  revoked_at: null,
  status: "active",
  schema_version: "1.0.0",
  payload_hash: "hash",
  signature: "sig",
  signing_key_id: "key",
  anchor_reference: null,
  idempotency_key: null,
  created_at: new Date().toISOString(),
};

describe("evidence dependency integrity (adversarial)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("fails closed when evidence dependency store is unavailable for reuse-derived receipts", async () => {
    const deps = await import("@/lib/decisionReceipts/evidenceDependencies");
    vi.mocked(deps.receiptRequiresEvidenceDependencyGraph).mockResolvedValue(true);
    vi.mocked(deps.getReceiptEvidenceDependencies).mockRejectedValue(
      new EvidenceDependencyStoreUnavailableError(),
    );

    const validity = await resolveReceiptValidity(baseRecord, undefined, { verifySignature: () => true });
    expect(validity.currently_valid).toBe(false);
    expect(validity.invalidation_reasons).toContain("evidence_dependency_store_unavailable");

    const current = await evaluateReceiptCurrentValidity({ record: baseRecord });
    expect(current.currently_valid).toBe(false);
    expect(current.invalidation_reasons).toContain("evidence_dependency_store_unavailable");
  });

  it("rejects reuse-derived receipts with empty dependency rows", async () => {
    const deps = await import("@/lib/decisionReceipts/evidenceDependencies");
    vi.mocked(deps.receiptRequiresEvidenceDependencyGraph).mockResolvedValue(true);
    vi.mocked(deps.getReceiptEvidenceDependencies).mockResolvedValue([]);

    const validity = await resolveReceiptValidity(baseRecord, undefined, { verifySignature: () => true });
    expect(validity.currently_valid).toBe(false);
    expect(validity.invalidation_reasons).toContain("evidence_dependency_missing");
  });

  it("does not treat missing derivation store as valid reuse", async () => {
    const { requireSupabaseAdmin } = await import("@/lib/supabase/admin");
    vi.mocked(requireSupabaseAdmin).mockReturnValueOnce({
      from: vi.fn(() => ({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            maybeSingle: vi.fn(async () => ({ data: null, error: { message: "unavailable" } })),
          })),
        })),
      })),
    } as never);

    const result = await sourceEvidenceStillValidForReceipt("dr_x", "subj");
    expect(result.valid).toBe(false);
    expect(result.reasons).toContain("evidence_derivation_store_unavailable");
  });

  it("does not treat missing source fact as valid when derivation exists", async () => {
    const inv = await import("@/lib/passport/reusableEligibility/invalidation");
    const { requireSupabaseAdmin } = await import("@/lib/supabase/admin");
    vi.mocked(requireSupabaseAdmin).mockReturnValueOnce({
      from: vi.fn(() => ({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            maybeSingle: vi.fn(async () => ({
              data: {
                fact_id: "fact_1",
                source_receipt_id: "dr_source",
                derived_receipt_id: "dr_x",
                requesting_partner_id: "p",
                requesting_policy_id: "pol",
              },
              error: null,
            })),
          })),
        })),
      })),
    } as never);
    vi.mocked(inv.resolveSourceFactForDerivedReceipt).mockResolvedValue(null);

    const result = await sourceEvidenceStillValidForReceipt("dr_x", "subj");
    expect(result.valid).toBe(false);
    expect(result.reasons).toContain("source_evidence_missing");
  });
});
