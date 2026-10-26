import { beforeEach, describe, expect, it, vi } from "vitest";
import type { InternalReusableFact } from "./contract";
import type { DecisionReceiptRecord } from "@/lib/decisionReceipts/types";

const pendingReceipt: DecisionReceiptRecord = {
  id: "dr_derived",
  verification_decision_id: "00000000-0000-4000-8000-000000000099",
  consent_receipt_id: null,
  partner_id: "partner",
  policy_id: "pol",
  policy_version: 1,
  subject_pseudonym_id: "psr",
  wallet_binding_ref: null,
  decision_result: "approved",
  reason_codes: [],
  evaluated_claim_refs: [],
  issuer_refs: [],
  decision_context: "sandbox_only",
  evaluated_at: "2026-01-01T00:00:00.000Z",
  expires_at: null,
  revoked_at: null,
  status: "pending_finalization",
  issuance_finalized_at: null,
  schema_version: "1.0.0",
  payload_hash: "hash",
  signature: "sig",
  signing_key_id: "key",
  anchor_reference: null,
  idempotency_key: null,
  created_at: "2026-01-01T00:00:00.000Z",
};

vi.mock("@/lib/decisionReceipts/service", () => ({
  getReceiptById: vi.fn(async () => pendingReceipt),
}));

vi.mock("@/lib/persistence/boundary/sovereignStagingPg", () => ({
  getSovereignStagingPgPool: vi.fn(() => null),
}));

vi.mock("./issue", () => ({
  persistReuseDerivation: vi.fn(async () => undefined),
}));

vi.mock("@/lib/persistence/boundary/verticalSlice/evidenceIntegrityWrite.server", () => ({
  mirrorReuseEvidenceIntegrityOnSovereignPg: vi.fn(async () => ({ mirrored: false, reason: "sovereign_pg_unconfigured" })),
}));

const activateDecisionReceiptIssuance = vi.fn(async () => ({
  ...pendingReceipt,
  status: "active" as const,
  issuance_finalized_at: "2026-01-01T00:00:01.000Z",
}));

const markDecisionReceiptIssuanceFailed = vi.fn(async () => undefined);

vi.mock("@/lib/decisionReceipts/issuanceLifecycle.server", () => ({
  activateDecisionReceiptIssuance: (...args: unknown[]) => activateDecisionReceiptIssuance(...args),
  markDecisionReceiptIssuanceFailed: (...args: unknown[]) => markDecisionReceiptIssuanceFailed(...args),
}));

const FACT: InternalReusableFact = {
  fact_id: "fact_test",
  subject_pseudonym_id: "psr_test",
  pack_id: "pack",
  policy_version: 1,
  minimum_assurance: "L2",
  method_category: "reuse_existing_proof",
  result_category: "approved",
  disclosure_boundary: "partner_bound",
  decision_context: "sandbox_only",
  source_policy_id: "pol",
  source_verification_method: "reuse_existing_proof",
  verified_at: "2026-01-01T00:00:00.000Z",
  source_receipt_id: "dr_src",
  source_decision_id: "00000000-0000-4000-8000-000000000001",
  issued_at: "2026-01-01T00:00:00.000Z",
  expires_at: "2099-01-01T00:00:00.000Z",
  status: "active",
};

describe("finalizeReuseEvidenceForIssuance", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("activates pending receipt after dependencies commit", async () => {
    const { finalizeReuseEvidenceForIssuance } = await import("./reuseEvidenceIssuance.server");
    await finalizeReuseEvidenceForIssuance({
      fact: FACT,
      derivedReceiptId: "dr_derived",
      derivedDecisionId: "dec",
      requestingPartnerId: "partner",
      requestingPolicyId: "pol",
      requestingPolicyVersion: 1,
      verifyRequestId: "req",
      derivedClaimRefs: [],
    });
    expect(activateDecisionReceiptIssuance).toHaveBeenCalledWith("dr_derived");
    expect(markDecisionReceiptIssuanceFailed).not.toHaveBeenCalled();
  });

  it("marks failed when dependency persist throws", async () => {
    const { persistReuseDerivation } = await import("./issue");
    vi.mocked(persistReuseDerivation).mockRejectedValueOnce(new Error("deps_failed"));
    const { finalizeReuseEvidenceForIssuance } = await import("./reuseEvidenceIssuance.server");
    await expect(
      finalizeReuseEvidenceForIssuance({
        fact: FACT,
        derivedReceiptId: "dr_derived",
        derivedDecisionId: "dec",
        requestingPartnerId: "partner",
        requestingPolicyId: "pol",
        requestingPolicyVersion: 1,
        verifyRequestId: "req",
        derivedClaimRefs: [],
      }),
    ).rejects.toThrow(/deps_failed/);
    expect(activateDecisionReceiptIssuance).not.toHaveBeenCalled();
    expect(markDecisionReceiptIssuanceFailed).toHaveBeenCalledWith("dr_derived");
  });
});
