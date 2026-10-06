// FILE: lib/partner/walletControlRecovery.test.ts
// Security matrix: wallet-control recovery must not authorize without signed proof.

import { describe, expect, it, vi, beforeEach } from "vitest";
import { ensureZkLoginWalletBinding } from "@/lib/credentials/ensureZkLoginWalletBinding";
import { isStaleEvidenceReissueEligible } from "@/lib/partner/partnerFlowStaleEvidenceReissue";
import { resolveHolderAuthorizationState } from "@/lib/partner/partnerFlowCurrentAuthorization";

const mockRequireSupabaseAdmin = vi.fn();
const mockAppendAuditEvent = vi.fn();

vi.mock("@/lib/supabase/admin", () => ({
  requireSupabaseAdmin: () => mockRequireSupabaseAdmin(),
}));

vi.mock("@/lib/verification/audit", () => ({
  appendAuditEvent: (...args: unknown[]) => mockAppendAuditEvent(...args),
}));

describe("wallet control recovery security matrix", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAppendAuditEvent.mockResolvedValue("audit-1");
  });

  it("clicking Verify wallet path does not authorize by itself (repair blocked on revoked binding)", async () => {
    const SUBJECT = "0x" + "b".repeat(64);
    mockRequireSupabaseAdmin.mockReturnValue({
      from: vi.fn((table: string) => {
        if (table === "wallet_bindings") {
          return {
            select: () => ({
              eq: () => ({
                eq: () => ({
                  eq: () => ({
                    maybeSingle: async () => ({
                      data: {
                        id: "binding-revoked",
                        binding_method: "signed_challenge",
                        binding_status: "revoked",
                        revoked_at: "2026-10-06T00:00:00.000Z",
                      },
                      error: null,
                    }),
                  }),
                }),
              }),
            }),
          };
        }
        if (table === "credential_claims") {
          return {
            select: () => ({
              eq: () => ({
                eq: () => ({
                  eq: () => ({
                    eq: () => ({
                      maybeSingle: async () => ({ data: null, error: null }),
                    }),
                    is: async () => ({ data: [], error: null }),
                  }),
                }),
              }),
            }),
          };
        }
        throw new Error(table);
      }),
      rpc: vi.fn(),
    });

    const result = await ensureZkLoginWalletBinding(SUBJECT);
    expect(result.status).toBe("failed");
    expect(result.reason_code).toBe("holder_revocation_requires_explicit_proof");
    expect(mockRequireSupabaseAdmin().rpc).not.toHaveBeenCalled();
  });

  it("stale receipt replay remains verification_required until fresh evidence reissue", () => {
    expect(resolveHolderAuthorizationState({
      currently_valid: false,
      invalidation_reasons: ["source_evidence_revoked"],
    })).toBe("verification_required");
    expect(isStaleEvidenceReissueEligible({
      currently_valid: false,
      invalidation_reasons: ["source_evidence_revoked"],
    })).toBe(true);
  });

  it("revoked claim replay remains denied fail-closed", () => {
    expect(resolveHolderAuthorizationState({
      currently_valid: false,
      invalidation_reasons: ["claim_revoked"],
    })).toBe("denied");
    expect(isStaleEvidenceReissueEligible({
      currently_valid: false,
      invalidation_reasons: ["claim_revoked"],
    })).toBe(false);
  });
});
