import { beforeEach, describe, expect, it, vi } from "vitest";
import type { InternalReusableFact } from "./contract";

vi.mock("@/lib/supabase/admin", () => ({
  requireSupabaseAdmin: vi.fn(() => ({
    from: vi.fn(() => ({
      update: vi.fn(() => ({
        eq: vi.fn(() => ({
          eq: vi.fn(async () => ({ error: null })),
        })),
      })),
    })),
  })),
}));

vi.mock("@/lib/persistence/boundary/sovereignStagingPg", () => ({
  getSovereignStagingPgPool: vi.fn(() => ({})),
}));

vi.mock("./issue", () => ({
  persistReuseDerivation: vi.fn(async () => undefined),
}));

vi.mock("@/lib/persistence/boundary/verticalSlice/evidenceIntegrityWrite.server", () => ({
  mirrorReuseEvidenceIntegrityOnSovereignPg: vi.fn(async () => ({
    mirrored: false,
    reason: "source_unavailable",
  })),
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

  it("revokes receipt when sovereign mirror cannot resolve source", async () => {
    const { finalizeReuseEvidenceForIssuance } = await import("./reuseEvidenceIssuance.server");
    const { requireSupabaseAdmin } = await import("@/lib/supabase/admin");
    const update = vi.fn(() => ({
      eq: vi.fn(() => ({
        eq: vi.fn(async () => ({ error: null })),
      })),
    }));
    vi.mocked(requireSupabaseAdmin).mockReturnValue({
      from: vi.fn(() => ({ update })),
    } as never);

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
    ).rejects.toThrow(/evidence_source_unavailable/);

    expect(update).toHaveBeenCalled();
  });
});
