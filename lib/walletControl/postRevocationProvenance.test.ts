// FILE: lib/walletControl/postRevocationProvenance.test.ts

import { describe, expect, it, vi, beforeEach } from "vitest";
import type { CredentialClaimRecord } from "@/lib/credentials/claimSchema";
import {
  evaluatePostRevocationProvenanceAtRevocation,
  isRepairMintedContaminatedWalletControlClaim,
  WALLET_CONTROL_PROOF_PREDATES_REVOCATION,
  WALLET_CONTROL_PROVENANCE_INSUFFICIENT,
} from "@/lib/walletControl/postRevocationProvenance";
import {
  classifyExplicitWalletControlProof,
  isQualifyingExplicitWalletControlProof,
} from "@/lib/walletControl/explicitWalletControlProof";
import { evaluateWalletControlClaimLiveEligibility } from "@/lib/walletControl/claimBindingLineage";
import { walletControlEvidenceRef } from "@/lib/walletControl/contract";

const SUBJECT = "0xaba749c2c8992f3914cec877af2bede04f18078175db33513e4bee8e2bd695a9";
const BINDING_ID = "35eb28a5-4fb3-45fc-8321-b31ea75950d5";
const HOLDER_REVOKED_AT = "2026-10-06T15:09:04.347Z";

const FEB4F920_CLAIM: CredentialClaimRecord = {
  id: "feb4f920-e577-4092-aec7-6eecde741067",
  subject_id: SUBJECT,
  credential_jti: null,
  claim_type: "wallet_binding_confirmed",
  claim_value: {
    chain: "sui",
    verified_at: "2026-10-06T17:57:27.377892+00:00",
    binding_method: "zklogin",
    control_method: "zklogin",
    wallet_address: SUBJECT,
    wallet_binding_id: BINDING_ID,
  },
  issuer_id: "issuer:abraxas",
  assurance_level: "L2",
  issued_at: "2026-10-06T17:57:27.377892+00",
  expires_at: "2026-10-07T05:57:27.377892+00",
  status: "active",
  evidence_reference: walletControlEvidenceRef(BINDING_ID),
  revocation_reference: null,
  jurisdiction: null,
  policy_scope: "core",
};

const fromMock = vi.fn();

vi.mock("@/lib/supabase/admin", () => ({
  requireSupabaseAdmin: () => ({ from: fromMock }),
}));

function auditChain(revokedAt: string | null) {
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

function installBinding(binding: Record<string, unknown>, revokedAt: string | null) {
  fromMock.mockImplementation((table: string) => {
    if (table === "audit_events") return auditChain(revokedAt);
    if (table === "wallet_bindings") {
      return {
        select: () => ({
          eq: () => ({
            maybeSingle: async () => ({ data: binding }),
          }),
        }),
      };
    }
    return {
      select: () => ({
        eq: () => ({ maybeSingle: async () => ({ data: null }) }),
      }),
    };
  });
}

describe("explicit wallet control proof classification", () => {
  it("treats signed wallet proof as explicit", () => {
    const result = classifyExplicitWalletControlProof({
      claim_value: {
        binding_method: "signed_challenge",
        challenge_id: "60a39a6a50f7567afff83f96a29a9605",
        proof_signature: "sig",
      },
    });
    expect(result.proofClass).toBe("explicit");
  });

  it("treats zklogin repair claim as account binding only", () => {
    expect(classifyExplicitWalletControlProof(FEB4F920_CLAIM).proofClass).toBe("account_binding");
  });

  it("treats siwe_evm with binding proof_signature as explicit", () => {
    expect(isQualifyingExplicitWalletControlProof(
      { claim_value: { control_method: "siwe_evm" } },
      {
        id: BINDING_ID,
        subject_id: SUBJECT,
        binding_status: "active",
        revoked_at: null,
        verified_at: "2026-10-06T19:00:00.000Z",
        binding_method: "siwe",
        proof_signature: "0xabc",
      },
    )).toBe(true);
  });
});

describe("post-revocation provenance rules", () => {
  it("allows healthy evidence when binding was never holder-revoked", async () => {
    installBinding({
      id: BINDING_ID,
      subject_id: SUBJECT,
      binding_status: "active",
      revoked_at: null,
      verified_at: "2026-08-06T13:34:03.434Z",
      binding_method: "signed_challenge",
    }, null);

    const claim: CredentialClaimRecord = {
      ...FEB4F920_CLAIM,
      id: "healthy-claim",
      issued_at: "2026-08-06T13:34:03.536Z",
      claim_value: {
        binding_method: "signed_challenge",
        challenge_id: "60a39a6a50f7567afff83f96a29a9605",
        proof_signature: "sig",
      },
      assurance_level: "L3",
    };

    const result = await evaluateWalletControlClaimLiveEligibility(claim);
    expect(result.eligible).toBe(true);
  });

  it("marks holder_unlinked predating proof ineligible", () => {
    const result = evaluatePostRevocationProvenanceAtRevocation({
      claim: {
        issued_at: "2026-08-06T13:34:03.536Z",
        claim_value: {
          binding_method: "signed_challenge",
          challenge_id: "60a39a6a50f7567afff83f96a29a9605",
          proof_signature: "sig",
        },
      },
      binding: null,
      holderRevokedAt: HOLDER_REVOKED_AT,
    });
    expect(result.eligible).toBe(false);
    expect(result.reason).toBe(WALLET_CONTROL_PROOF_PREDATES_REVOCATION);
  });

  it("marks repair-minted claim after holder_unlinked ineligible", () => {
    const result = evaluatePostRevocationProvenanceAtRevocation({
      claim: FEB4F920_CLAIM,
      binding: {
        id: BINDING_ID,
        subject_id: SUBJECT,
        binding_status: "active",
        revoked_at: null,
        verified_at: "2026-10-06T17:57:27.377892+00",
        binding_method: "zklogin",
      },
      holderRevokedAt: HOLDER_REVOKED_AT,
    });
    expect(result.eligible).toBe(false);
    expect(result.reason).toBe(WALLET_CONTROL_PROVENANCE_INSUFFICIENT);
  });

  it("allows explicit qualifying proof after holder_unlinked", () => {
    const result = evaluatePostRevocationProvenanceAtRevocation({
      claim: {
        issued_at: "2026-10-06T19:00:00.000Z",
        claim_value: { control_method: "siwe_evm" },
      },
      binding: {
        id: BINDING_ID,
        subject_id: SUBJECT,
        binding_status: "active",
        revoked_at: null,
        verified_at: "2026-10-06T19:00:00.000Z",
        binding_method: "siwe",
        proof_signature: "0xabc",
      },
      holderRevokedAt: HOLDER_REVOKED_AT,
    });
    expect(result.eligible).toBe(true);
  });

  it("fail-closes ambiguous provenance after holder_unlinked", () => {
    const result = evaluatePostRevocationProvenanceAtRevocation({
      claim: {
        issued_at: "2026-10-06T19:00:00.000Z",
        claim_value: { binding_method: "siwe" },
      },
      binding: {
        id: BINDING_ID,
        subject_id: SUBJECT,
        binding_status: "active",
        revoked_at: null,
        verified_at: "2026-10-06T19:00:00.000Z",
        binding_method: "siwe",
      },
      holderRevokedAt: HOLDER_REVOKED_AT,
    });
    expect(result.eligible).toBe(false);
    expect(result.reason).toBe(WALLET_CONTROL_PROVENANCE_INSUFFICIENT);
  });

  it("detects feb4f920 semantic fixture as contaminated", () => {
    expect(isRepairMintedContaminatedWalletControlClaim({
      claim: FEB4F920_CLAIM,
      binding: {
        id: BINDING_ID,
        subject_id: SUBJECT,
        binding_status: "active",
        revoked_at: null,
        verified_at: "2026-10-06T17:57:27.377892+00",
        binding_method: "zklogin",
      },
      holderRevokedAt: HOLDER_REVOKED_AT,
    })).toBe(true);
  });

  it("still ineligible when mutable revoked_at was cleared by repair", async () => {
    installBinding({
      id: BINDING_ID,
      subject_id: SUBJECT,
      binding_status: "active",
      revoked_at: null,
      verified_at: "2026-10-06T17:57:27.377892+00",
      binding_method: "zklogin",
    }, HOLDER_REVOKED_AT);

    const result = await evaluateWalletControlClaimLiveEligibility(FEB4F920_CLAIM);
    expect(result.eligible).toBe(false);
    expect(result.reason).toBe(WALLET_CONTROL_PROVENANCE_INSUFFICIENT);
  });
});
