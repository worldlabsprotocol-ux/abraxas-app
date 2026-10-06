import { describe, expect, it, vi, beforeEach } from "vitest";
import {
  evaluateWalletControlClaimLiveEligibility,
  parseBindingIdFromWalletControlClaim,
  walletControlClaimDerivedFromBinding,
  WALLET_CONTROL_CO_ISSUED_TOLERANCE_MS,
} from "./claimBindingLineage";
import type { CredentialClaimRecord } from "@/lib/credentials/claimSchema";
import { walletControlEvidenceRef } from "./contract";

const SUBJECT = "0x0000000000000000000000000000000000000000000000000000000000000002";
const BINDING_ID = "35eb28a5-4fb3-45fc-8321-b31ea75950d5";

function walletClaim(
  overrides: Partial<CredentialClaimRecord> = {},
): CredentialClaimRecord {
  return {
    id: "71ba9186-62ee-4744-ba0f-78ea88432f50",
    subject_id: SUBJECT,
    credential_jti: null,
    claim_type: "wallet_binding_confirmed",
    claim_value: {
      chain: "sui",
      binding_method: "signed_challenge",
      challenge_id: "60a39a6a50f7567afff83f96a29a9605",
    },
    issuer_id: "issuer:abraxas",
    assurance_level: "L3",
    issued_at: "2026-08-06T13:34:03.536Z",
    expires_at: null,
    status: "active",
    revocation_reference: null,
    evidence_reference: null,
    jurisdiction: null,
    policy_scope: "core",
    ...overrides,
  };
}

const fromMock = vi.fn();

vi.mock("@/lib/supabase/admin", () => ({
  requireSupabaseAdmin: () => ({ from: fromMock }),
}));

function chain(resolved: unknown) {
  const builder = {
    select: vi.fn(() => builder),
    eq: vi.fn(() => builder),
    order: vi.fn(() => builder),
    limit: vi.fn(async () => ({ data: [] })),
    maybeSingle: vi.fn(async () => resolved),
  };
  return builder;
}

function auditEventsChain(revokedAt: string | null = null) {
  return {
    select: () => ({
      eq: () => ({
        eq: () => ({
          eq: () => ({
            order: () => ({
              limit: async () => ({
                data: revokedAt
                  ? [{
                    object_id: BINDING_ID,
                    created_at: revokedAt,
                    metadata: { reason: "holder_unlinked" },
                  }]
                  : [],
              }),
            }),
          }),
        }),
      }),
    }),
  };
}

describe("claimBindingLineage", () => {
  beforeEach(() => {
    fromMock.mockReset();
  });

  it("parses canonical evidence_reference binding id", () => {
    const claim = walletClaim({ evidence_reference: walletControlEvidenceRef(BINDING_ID) });
    expect(parseBindingIdFromWalletControlClaim(claim)).toBe(BINDING_ID);
  });

  it("derives legacy claim from co-issued binding timestamps", () => {
    const claim = walletClaim();
    const binding = {
      id: BINDING_ID,
      subject_id: SUBJECT,
      binding_status: "revoked",
      revoked_at: "2026-10-06T15:09:03.772Z",
      verified_at: "2026-08-06T13:34:03.434Z",
      binding_method: "signed_challenge",
    };
    expect(walletControlClaimDerivedFromBinding(claim, BINDING_ID, binding)).toBe(true);
    expect(
      Math.abs(
        new Date(claim.issued_at).getTime() - new Date(binding.verified_at).getTime(),
      ),
    ).toBeLessThanOrEqual(WALLET_CONTROL_CO_ISSUED_TOLERANCE_MS);
  });

  it("does not derive sibling EVM binding from legacy Sui claim", () => {
    const claim = walletClaim();
    const evmBinding = {
      id: "cc385c24-074a-4d10-b263-23b93c524197",
      subject_id: SUBJECT,
      binding_status: "revoked",
      revoked_at: "2026-10-04T19:51:40.690Z",
      verified_at: "2026-10-04T19:48:17.088Z",
      binding_method: "siwe",
    };
    expect(walletControlClaimDerivedFromBinding(claim, evmBinding.id, evmBinding)).toBe(false);
  });

  it("fails closed when binding is revoked but claim remains active", async () => {
    const binding = {
      id: BINDING_ID,
      subject_id: SUBJECT,
      binding_status: "revoked",
      revoked_at: "2026-10-06T15:09:03.772Z",
      verified_at: "2026-08-06T13:34:03.434Z",
      binding_method: "signed_challenge",
    };
    fromMock.mockImplementation((table: string) => {
      if (table === "audit_events") return auditEventsChain();
      if (table === "wallet_bindings") {
        return {
          select: () => ({
            eq: (col: string) => {
              if (col === "id") {
                return { maybeSingle: async () => ({ data: binding }) };
              }
              return Promise.resolve({ data: [binding], error: null });
            },
          }),
        };
      }
      return chain({ data: null });
    });

    const result = await evaluateWalletControlClaimLiveEligibility(walletClaim());
    expect(result.eligible).toBe(false);
    expect(result.reason).toBe("source_evidence_revoked");
  });

  it("permits active binding with canonical evidence_reference when never holder-revoked", async () => {
    fromMock.mockImplementation((table: string) => {
      if (table === "audit_events") return auditEventsChain();
      if (table === "wallet_bindings") {
        return chain({
          data: {
            id: BINDING_ID,
            subject_id: SUBJECT,
            binding_status: "active",
            revoked_at: null,
            verified_at: "2026-08-06T13:34:03.434Z",
            binding_method: "signed_challenge",
          },
        });
      }
      return chain({ data: null });
    });

    const result = await evaluateWalletControlClaimLiveEligibility(
      walletClaim({ evidence_reference: walletControlEvidenceRef(BINDING_ID) }),
    );
    expect(result.eligible).toBe(true);
    expect(result.reason).toBeNull();
  });

  it("rejects pre-revocation signed proof when holder later unlinked", async () => {
    fromMock.mockImplementation((table: string) => {
      if (table === "audit_events") {
        return auditEventsChain("2026-10-06T15:09:03.772Z");
      }
      if (table === "wallet_bindings") {
        return chain({
          data: {
            id: BINDING_ID,
            subject_id: SUBJECT,
            binding_status: "active",
            revoked_at: null,
            verified_at: "2026-08-06T13:34:03.434Z",
            binding_method: "signed_challenge",
          },
        });
      }
      return chain({ data: null });
    });

    const result = await evaluateWalletControlClaimLiveEligibility(
      walletClaim({ evidence_reference: walletControlEvidenceRef(BINDING_ID) }),
    );
    expect(result.eligible).toBe(false);
    expect(result.reason).toBe("wallet_control_proof_predates_revocation");
  });
});
