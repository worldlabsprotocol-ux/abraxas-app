// FILE: lib/walletControl/walletControlTrust.test.ts
// Wallet control trust primitive — holder evidence → claim → policy → receipt → narrow result.

import { describe, it, expect, vi, beforeEach } from "vitest";
import { privateKeyToAccount } from "viem/accounts";
import type { CredentialClaimRecord } from "@/lib/credentials/claimSchema";
import type { DecisionReceiptRecord } from "@/lib/decisionReceipts/types";
import { evaluatePolicyRules } from "@/lib/policy/evaluatePolicy";
import { buildEvaluatedClaimRefs } from "@/lib/decisionReceipts/claimRefs";
import { buildNarrowPartnerResultForReceipt } from "@/lib/partner/narrowPartnerResult/build";
import { toPublicView, toPartnerView, assertNoPiiInPublicView } from "@/lib/decisionReceipts/views";
import { evaluateDecisionReceiptTrust } from "@/lib/decisionReceipts/trustEvaluation";
import { resolveReceiptValidity } from "@/lib/decisionReceipts/validityResolver";
import { sanitizePartnerDecisionClaims } from "@/lib/walletControl/partnerClaims";
import {
  buildWalletControlClaim,
  sanitizeWalletControlClaimForPartner,
} from "@/lib/walletControl/claim";
import { walletControlEvidenceRef } from "@/lib/walletControl/contract";
import { createEvmChallengePayload, verifyEvmBindingSignature } from "@/lib/walletAuthority/evmSiwe";

const TEST_KEY_A = "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80";
const TEST_KEY_B = "0x59c6995e998f97a5b004846496d536f670592f63ca29da6ec5835959bc565e16";
const accountA = privateKeyToAccount(TEST_KEY_A);
const accountB = privateKeyToAccount(TEST_KEY_B);
const SUBJECT = "0x0000000000000000000000000000000000000000000000000000000000000002";
const BINDING_A = "11111111-1111-1111-1111-111111111111";
const BINDING_B = "22222222-2222-2222-2222-222222222222";
const CLAIM_A = "claim-a-id";
const CLAIM_B = "claim-b-id";
const POLICY_ID = "partner_demo_wallet_control_v1";

function activeClaim(input: {
  id: string;
  bindingId: string;
  address: string;
  issuedAt?: string;
  expiresAt?: string;
  status?: CredentialClaimRecord["status"];
}): CredentialClaimRecord {
  const issuedAt = input.issuedAt ?? new Date().toISOString();
  return {
    id: input.id,
    subject_id: SUBJECT,
    credential_jti: null,
    claim_type: "wallet_binding_confirmed",
    claim_value: {
      wallet_binding_id: input.bindingId,
      wallet_address: input.address,
      chain: "evm",
      chain_id: 1,
      control_method: "siwe_evm",
      verified_at: issuedAt,
    },
    issuer_id: "issuer:abraxas",
    assurance_level: "L3",
    issued_at: issuedAt,
    expires_at: input.expiresAt ?? new Date(Date.now() + 12 * 60 * 60 * 1000).toISOString(),
    status: input.status ?? "active",
    revocation_reference: null,
    evidence_reference: walletControlEvidenceRef(input.bindingId),
    jurisdiction: null,
    policy_scope: "core",
  };
}

const claimA = activeClaim({ id: CLAIM_A, bindingId: BINDING_A, address: accountA.address });
const claimB = activeClaim({ id: CLAIM_B, bindingId: BINDING_B, address: accountB.address });

const walletControlRules = {
  sandbox_only: true,
  account_required: true,
  consent_required: true,
  session_receipt_hours: 12,
  required_claims: [{ claim_type: "wallet_binding_confirmed", min_assurance: "L1" }],
};

const receiptStore = new Map<string, DecisionReceiptRecord>();
const claimStore = new Map<string, CredentialClaimRecord>([
  [CLAIM_A, claimA],
  [CLAIM_B, claimB],
]);
const dependencyStore = new Map<string, Array<{ claim_id: string; claim_type: string; issuer_id: string }>>();

vi.mock("@/lib/decisionReceipts/service", async importOriginal => {
  const actual = await importOriginal<typeof import("@/lib/decisionReceipts/service")>();
  return {
    ...actual,
    getReceiptById: async (receiptId: string) => receiptStore.get(receiptId) ?? null,
  };
});

vi.mock("@/lib/supabase/admin", () => ({
  requireSupabaseAdmin: () => ({
    from: (table: string) => {
      if (table === "verification_decisions") {
        return {
          select: () => ({
            eq: (_col: string, id: string) => ({
              maybeSingle: async () => ({
                data: {
                  decision: "approved",
                  claims_json: sanitizePartnerDecisionClaims({
                    wallet_binding_confirmed: sanitizeWalletControlClaimForPartner(claimA),
                  }, POLICY_ID),
                  subject_id: SUBJECT,
                  request_id: "req-1",
                },
              }),
            }),
          }),
        };
      }
      if (table === "credential_claims") {
        return {
          select: () => ({
            eq: (_col: string, id: string) => ({
              maybeSingle: async () => {
                const claim = claimStore.get(id);
                return { data: claim ? { evidence_reference: claim.evidence_reference } : null };
              },
            }),
          }),
        };
      }
      if (table === "receipt_claim_dependencies") {
        return {
          select: () => ({
            eq: (_col: string, receiptId: string) => ({
              order: () => ({
                async then(resolve: (value: { data: unknown[] }) => void) {
                  resolve({ data: dependencyStore.get(receiptId) ?? [] });
                },
              }),
            }),
          }),
          upsert: async () => ({ error: null }),
        };
      }
      if (table === "decision_receipt_evidence_dependencies") {
        return {
          select: () => ({
            eq: () => ({
              order: async () => ({ data: [] }),
            }),
          }),
        };
      }
      if (table === "partners") {
        return {
          select: () => ({
            eq: () => ({
              maybeSingle: async () => ({ data: { status: "active" } }),
            }),
          }),
        };
      }
      if (table === "identity_subjects") {
        return {
          select: () => ({
            eq: () => ({
              maybeSingle: async () => ({ data: null }),
            }),
          }),
        };
      }
      throw new Error(`Unexpected table ${table}`);
    },
  }),
  getSupabaseAdmin: () => null,
}));

vi.mock("@/lib/trust/credentialStatusRegistry", () => ({
  getClaimById: async (claimId: string) => {
    const claim = claimStore.get(claimId);
    if (!claim) return null;
    return {
      id: claim.id,
      status: claim.status,
      expires_at: claim.expires_at,
      assurance_level: claim.assurance_level,
      jurisdiction: claim.jurisdiction,
      issued_at: claim.issued_at,
      claim_type: claim.claim_type,
      issuer_id: claim.issuer_id,
    };
  },
  resolveClaimStatusAtRead: ({ status, expires_at }: { status: string; expires_at: string | null }) => {
    if (status === "revoked") return "revoked";
    if (status === "expired") return "expired";
    if (expires_at && new Date(expires_at) < new Date()) return "expired";
    return status === "active" ? "active" : status;
  },
}));

vi.mock("@/lib/trust/issuerFramework", () => ({
  getIssuerById: async () => ({ issuer_status: "active" }),
  getIssuerSigningKey: async () => ({ status: "active" }),
  isIssuerTrustedForClaim: async () => ({ ok: true, reason: "trusted" }),
}));

vi.mock("@/lib/policy/getPolicy", () => ({
  getPartnerPolicyAtVersion: async () => ({
    status: "active",
    rules_json: walletControlRules,
  }),
}));

vi.mock("@/lib/partner/launchpad/resolveLaunchpadApplication", () => ({
  getLaunchpadApplicationForPartner: async () => ({ status: "active" }),
}));

vi.mock("@/lib/decisionReceipts/receiptSupersession", () => ({
  isReceiptSuperseded: async () => ({ superseded: false }),
}));

vi.mock("@/lib/decisionReceipts/verificationKeyLifecycle", () => ({
  verifyRecordSignatureWithRegistry: () => true,
  resolveIssuanceSigningKey: () => ({ ok: true, privateKeyJwk: {}, key_id: "test-key" }),
}));

function makeReceipt(claimRefId: string): DecisionReceiptRecord {
  const receipt: DecisionReceiptRecord = {
    id: `dr_${claimRefId}`,
    verification_decision_id: `decision-${claimRefId}`,
    consent_receipt_id: "consent-1",
    partner_id: "partner_a",
    policy_id: POLICY_ID,
    policy_version: 1,
    subject_pseudonym_id: "pseudo-subject",
    wallet_binding_ref: BINDING_A,
    decision_result: "approved",
    reason_codes: [],
    evaluated_claim_refs: [{
      claim_id: claimRefId,
      claim_type: "wallet_binding_confirmed",
      issuer_id: "issuer:abraxas",
      status: "active",
      issued_at: claimA.issued_at,
      expires_at: claimA.expires_at,
    }],
    issuer_refs: ["issuer:abraxas"],
    decision_context: "sandbox_only",
    evaluated_at: new Date().toISOString(),
    expires_at: new Date(Date.now() + 12 * 60 * 60 * 1000).toISOString(),
    revoked_at: null,
    status: "active",
    schema_version: "1.0.0",
    payload_hash: "hash",
    signature: "sig",
    signing_key_id: "test-key",
    anchor_reference: null,
    idempotency_key: `decision-${claimRefId}`,
    created_at: new Date().toISOString(),
  };
  dependencyStore.set(receipt.id, receipt.evaluated_claim_refs.map(ref => ({
    claim_id: ref.claim_id,
    claim_type: ref.claim_type,
    issuer_id: ref.issuer_id,
  })));
  receiptStore.set(receipt.id, receipt);
  return receipt;
}

describe("wallet control claim cardinality", () => {
  it("allows Wallet A and Wallet B claims simultaneously", () => {
    expect(claimStore.get(CLAIM_A)?.status).toBe("active");
    expect(claimStore.get(CLAIM_B)?.status).toBe("active");
    expect(claimA.evidence_reference).not.toBe(claimB.evidence_reference);
  });
});

describe("wallet control policy evaluation", () => {
  it("approves when any active wallet-control claim satisfies policy", () => {
    const evaluation = evaluatePolicyRules(walletControlRules, [claimA, claimB]);
    expect(evaluation.decision).toBe("approved");
    expect(evaluation.matched_claim_ids?.wallet_binding_confirmed).toBeTruthy();
    expect(evaluation.claims.wallet_binding_confirmed).toMatchObject({
      wallet_control_confirmed: true,
    });
    expect(JSON.stringify(evaluation.claims)).not.toContain(accountA.address.toLowerCase());
    expect(JSON.stringify(evaluation.claims)).not.toContain(accountB.address.toLowerCase());
  });

  it("denies when all wallet-control claims are revoked", () => {
    const revokedA = { ...claimA, status: "revoked" as const };
    const revokedB = { ...claimB, status: "revoked" as const };
    const evaluation = evaluatePolicyRules(walletControlRules, [revokedA, revokedB]);
    expect(evaluation.decision).not.toBe("approved");
  });
});

describe("wallet control receipt wiring", () => {
  it("records the specific wallet claim used in evaluated claim refs", () => {
    const evaluation = evaluatePolicyRules(walletControlRules, [claimA, claimB]);
    const refs = buildEvaluatedClaimRefs(
      [claimA, claimB],
      ["wallet_binding_confirmed"],
      evaluation.matched_claim_ids,
    );
    expect(refs).toHaveLength(1);
    expect(refs[0]?.claim_id).toBe(evaluation.matched_claim_ids?.wallet_binding_confirmed);
  });
});

describe("wallet control graph exfiltration", () => {
  it("does not expose wallet addresses on public receipt, partner view, or narrow result", async () => {
    const receipt = makeReceipt(CLAIM_A);
    const publicView = toPublicView(receipt);
    assertNoPiiInPublicView(publicView);
    expect(JSON.stringify(publicView)).not.toContain(accountA.address);
    expect(JSON.stringify(publicView)).not.toContain(accountB.address);

    const partnerView = toPartnerView(receipt, true);
    expect(JSON.stringify(partnerView)).not.toContain(accountA.address);
    expect(JSON.stringify(partnerView)).not.toContain(accountB.address);
    expect(partnerView.wallet_binding_ref).toBeNull();

    const narrow = await buildNarrowPartnerResultForReceipt(receipt.id);
    expect(narrow?.result_family).toBe("wallet_control_confirmed");
    expect(JSON.stringify(narrow)).not.toContain(accountA.address);
    expect(JSON.stringify(narrow)).not.toContain(accountB.address);
    expect(JSON.stringify(narrow)).not.toContain(BINDING_B);
  });

  it("sanitizes partner decision status claims", () => {
    const raw = {
      wallet_binding_confirmed: {
        claim_type: "wallet_binding_confirmed",
        value: { wallet_address: accountA.address },
        wallet_address: accountA.address,
      },
    };
    const sanitized = sanitizePartnerDecisionClaims(raw, POLICY_ID);
    expect(JSON.stringify(sanitized)).not.toContain(accountA.address);
    expect(sanitized.wallet_binding_confirmed).toMatchObject({ wallet_control_confirmed: true });
  });
});

describe("wallet control revocation independence", () => {
  it("invalidates Wallet A receipt while Wallet B evidence remains valid", async () => {
    const receiptA = makeReceipt(CLAIM_A);
    const trustBefore = await evaluateDecisionReceiptTrust(receiptA, {
      partnerId: "partner_a",
      policyId: POLICY_ID,
      allowSandbox: true,
    });
    expect(trustBefore.currently_valid).toBe(true);

    claimStore.set(CLAIM_A, { ...claimA, status: "revoked" });
    const validityAfter = await resolveReceiptValidity(receiptA, {
      partnerId: "partner_a",
      policyId: POLICY_ID,
    });
    expect(validityAfter.signature_valid).toBe(true);
    expect(validityAfter.currently_valid).toBe(false);

    const evaluationB = evaluatePolicyRules(walletControlRules, [claimStore.get(CLAIM_B)!]);
    expect(evaluationB.decision).toBe("approved");
  });
});

describe("wallet control signature security", () => {
  it("rejects replay of the same signature on second bind attempt", async () => {
    const challenge = createEvmChallengePayload({
      domain: "abraxas-app.vercel.app",
      address: accountA.address,
      chainId: 1,
    });
    const signature = await accountA.signMessage({ message: challenge.message });
    const first = await verifyEvmBindingSignature({
      message: challenge.message,
      signature,
      expectedAddress: accountA.address,
      expectedDomain: challenge.domain,
      expectedChainId: 1,
      expectedNonce: challenge.challengeId,
    });
    expect(first).toBe(true);

    const replay = await verifyEvmBindingSignature({
      message: challenge.message,
      signature,
      expectedAddress: accountA.address,
      expectedDomain: challenge.domain,
      expectedChainId: 1,
      expectedNonce: "different-nonce",
    });
    expect(replay).toBe(false);
  });

  it("rejects valid signature from wrong wallet for challenge address", async () => {
    const challenge = createEvmChallengePayload({
      domain: "abraxas-app.vercel.app",
      address: accountA.address,
      chainId: 1,
    });
    const signature = await accountB.signMessage({ message: challenge.message });
    const valid = await verifyEvmBindingSignature({
      message: challenge.message,
      signature,
      expectedAddress: accountA.address,
      expectedDomain: challenge.domain,
      expectedChainId: 1,
      expectedNonce: challenge.challengeId,
    });
    expect(valid).toBe(false);
  });
});

describe("wallet control claim builder", () => {
  it("stores scoped evidence_reference and freshness expiry", () => {
    const claim = buildWalletControlClaim({
      subjectId: SUBJECT,
      walletBindingId: BINDING_A,
      walletAddress: accountA.address,
      chain: "evm",
      chainId: 1,
      controlMethod: "siwe_evm",
    });
    expect(claim.evidence_reference).toBe(walletControlEvidenceRef(BINDING_A));
    expect(claim.expires_at).toBeTruthy();
    expect(new Date(claim.expires_at!).getTime()).toBeGreaterThan(Date.now());
  });
});
