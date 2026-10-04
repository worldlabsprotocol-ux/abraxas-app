// FILE: lib/partner/walletControlPartnerFlowRevocation.test.ts
// Regression: active SUI wallet-control evidence must survive revoked sibling EVM claim in partner flow.

import { describe, expect, it, vi, beforeEach } from "vitest";
import { evaluatePartnerFlow } from "@/lib/partner/relyingPartyFlow";

const {
  SUBJECT,
  PARTNER_ID,
  POLICY_ID,
  RETURN_URL,
  APP_ID,
  ACTIVE_SUI_CLAIM_ID,
  CREDENTIAL_JTI,
  activeSuiClaim,
  revokedEvmClaim,
} = vi.hoisted(() => {
  const SUBJECT = "0x0000000000000000000000000000000000000000000000000000000000000002";
  const PARTNER_ID = "ref-wc-postrev-5ffe";
  const POLICY_ID = "ref-wc-postrev-5ffe-wallet_control-v1";
  const RETURN_URL = "https://example.com/callback";
  const APP_ID = "8d30e3b1-3409-4bef-8d04-66335f38e96e";
  const ACTIVE_SUI_CLAIM_ID = "71ba9186-62ee-4744-ba0f-78ea88432f50";
  const CREDENTIAL_JTI = "urn:uuid:test-wallet-control";
  const activeSuiClaim = {
  id: ACTIVE_SUI_CLAIM_ID,
  subject_id: SUBJECT,
  credential_jti: null,
  claim_type: "wallet_binding_confirmed",
  claim_value: { wallet_control_confirmed: true },
  issuer_id: "issuer:abraxas",
  assurance_level: "L3",
  issued_at: "2026-08-06T13:34:03.536Z",
  expires_at: null,
  status: "active",
  revocation_reference: null,
  evidence_reference: null,
  jurisdiction: null,
  policy_scope: null,
};

  const revokedEvmClaim = {
    id: "97bf0b05-f5ba-47aa-b744-21949945eb32",
    subject_id: SUBJECT,
    credential_jti: null,
    claim_type: "wallet_binding_confirmed",
    claim_value: {},
    issuer_id: "issuer:abraxas",
    assurance_level: "L3",
    issued_at: "2026-10-04T19:48:17.088Z",
    expires_at: "2026-10-05T07:48:17.088Z",
    status: "revoked",
    revocation_reference: "holder_unlinked",
    evidence_reference: "wb:cc385c24-074a-4d10-b263-23b93c524197",
    jurisdiction: null,
    policy_scope: null,
  };
  return {
    SUBJECT,
    PARTNER_ID,
    POLICY_ID,
    RETURN_URL,
    APP_ID,
    ACTIVE_SUI_CLAIM_ID,
    CREDENTIAL_JTI,
    activeSuiClaim,
    revokedEvmClaim,
  };
});

const fromMock = vi.fn();

vi.mock("@/lib/credentials/claimsService", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/credentials/claimsService")>();
  return {
    ...actual,
    getActiveClaims: vi.fn(async () => [activeSuiClaim]),
  };
});

vi.mock("@/lib/supabase/admin", () => ({
  requireSupabaseAdmin: vi.fn(() => ({ from: fromMock })),
  getSupabaseAdmin: vi.fn(() => ({ from: fromMock })),
}));

vi.mock("@/lib/connect/returnUrlAllowlist", () => ({
  isReturnUrlAllowed: vi.fn(async () => true),
  buildRedirectUrl: vi.fn((_url: string, params: Record<string, string>) =>
    `https://example.com/callback?${new URLSearchParams(params).toString()}`),
}));

vi.mock("@/lib/partner/verificationDecisionsSchema", () => ({
  isVerificationDecisionIdempotencyKeyAvailable: vi.fn(async () => true),
  isMissingIdempotencyKeyColumnError: vi.fn(() => false),
  markVerificationDecisionIdempotencyKeyAbsent: vi.fn(),
  markVerificationDecisionIdempotencyKeyAvailable: vi.fn(),
  resetVerificationDecisionSchemaProbeForTests: vi.fn(),
}));

vi.mock("@/lib/partner/sessionDecision", () => ({
  findActiveSessionDecision: vi.fn(async () => null),
  findDecisionByVerificationRequest: vi.fn(async () => null),
  findDecisionByIdempotencyKey: vi.fn(async () => null),
  findReceiptForVerificationRequest: vi.fn(async () => null),
  findSessionReceiptForSupersede: vi.fn(async () => null),
  supersedeActiveSessionDecisions: vi.fn(async () => undefined),
}));

vi.mock("@/lib/decisionReceipts/service", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/decisionReceipts/service")>();
  return {
    ...actual,
    issueReceiptForDecision: vi.fn(async () => ({
      id: "dr_wallet_control_test",
      subject_pseudonym_id: "pseudo-wc",
      policy_version: 1,
      expires_at: "2099-01-01T00:00:00.000Z",
    })),
    getReceiptByDecisionId: vi.fn(async () => ({
      id: "dr_wallet_control_test",
      status: "active",
      partner_id: PARTNER_ID,
      policy_id: POLICY_ID,
      policy_version: 1,
      decision_result: "approved",
      expires_at: "2099-01-01T00:00:00.000Z",
      decision_context: "sandbox_only",
      signature: "sig",
      payload_hash: "hash",
      signing_key_id: "kid",
      evaluated_claim_refs: [{ claim_id: ACTIVE_SUI_CLAIM_ID, claim_type: "wallet_binding_confirmed" }],
      reason_codes: [],
      issuer_refs: ["issuer:abraxas"],
      subject_pseudonym_id: "pseudo-wc",
      schema_version: "1.0.0",
      verification_decision_id: "vd_wallet_control_test",
      evaluated_at: "2026-10-04T00:00:00.000Z",
      consent_receipt_id: null,
      wallet_binding_ref: null,
      anchor_reference: null,
      revoked_at: null,
      idempotency_key: null,
      created_at: "2026-10-04T00:00:00.000Z",
    })),
  };
});

vi.mock("@/lib/decisionReceipts/trustEvaluation", () => ({
  evaluateDecisionReceiptTrust: vi.fn(async () => ({
    currently_valid: true,
    validity: "active",
    signature_valid: true,
    production_usable: false,
    invalidation_reasons: [],
  })),
}));

vi.mock("@/lib/privacy/privacySubjectAccess", () => ({
  subjectHasPrivacyAccessRevoked: vi.fn(async () => false),
}));

vi.mock("@/lib/policy/changeControl/lifecycle", () => ({
  resolveIssuablePolicyForPartner: vi.fn(async () => ({
    id: POLICY_ID,
    partner_id: PARTNER_ID,
    version: 1,
    rules_json: {
      sandbox_only: true,
      required_claims: [{ claim_type: "wallet_binding_confirmed", min_assurance: "L1" }],
    },
  })),
}));

function chain(resolved: unknown) {
  const builder = {
    select: vi.fn(() => builder),
    eq: vi.fn(() => builder),
    or: vi.fn(() => builder),
    in: vi.fn(() => builder),
    order: vi.fn(() => builder),
    limit: vi.fn(async () => resolved),
    maybeSingle: vi.fn(async () => resolved),
    insert: vi.fn(() => builder),
    single: vi.fn(async () => resolved),
  };
  return builder;
}

function installTables() {
  fromMock.mockImplementation((table: string) => {
    if (table === "identity_verifications") {
      return chain({ data: { status: "approved", credential_jti: CREDENTIAL_JTI }, error: null });
    }
    if (table === "passport_documents") {
      return chain({ count: 0, error: null });
    }
    if (table === "identity_review_sessions") {
      return chain({ count: 0, error: null });
    }
    if (table === "abraxas_credentials") {
      return chain({
        data: {
          jti: CREDENTIAL_JTI,
          credential_jwt: "jwt",
          expiration_date: "2099-01-01T00:00:00.000Z",
          revoked_at: null,
        },
        error: null,
      });
    }
    if (table === "partner_policies") {
      return chain({
        data: {
          id: POLICY_ID,
          partner_id: PARTNER_ID,
          version: 1,
          rules_json: {
            sandbox_only: true,
            required_claims: [{ claim_type: "wallet_binding_confirmed", min_assurance: "L1" }],
          },
        },
        error: null,
      });
    }
    if (table === "credential_claims") {
      return {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockImplementation((_col: string, value: unknown) => {
          const statusChain = {
            eq: vi.fn().mockReturnThis(),
            in: vi.fn().mockReturnThis(),
            order: vi.fn().mockReturnThis(),
            limit: vi.fn().mockImplementation(async () => {
              if (value === "active") {
                return { data: [activeSuiClaim], error: null };
              }
              if (value === "revoked") {
                return { data: [revokedEvmClaim], error: null };
              }
              return { data: [activeSuiClaim, revokedEvmClaim], error: null };
            }),
          };
          return statusChain;
        }),
        in: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue({ data: [revokedEvmClaim], error: null }),
      };
    }
    if (table === "verification_decisions") {
      return {
        insert: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({ data: { id: "vd_wallet_control_test" }, error: null }),
          }),
        }),
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
      };
    }
    if (table === "partner_issuer_trust_rules") {
      return chain({ data: [], error: null });
    }
    return chain({ data: null, error: null });
  });
}

describe("wallet_control partner flow with revoked sibling wallet", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    installTables();
  });

  it("approves evaluatePartnerFlow when active SUI claim remains after EVM revoke", async () => {
    const result = await evaluatePartnerFlow({
      suiAddress: SUBJECT,
      partnerId: PARTNER_ID,
      policyId: POLICY_ID,
      returnUrl: RETURN_URL,
      launchpadApplicationId: APP_ID,
      appOrigin: "https://abraxasworld.xyz",
    });

    expect(result.reason_codes ?? []).not.toContain("claim_revoked");
    expect(result.next, JSON.stringify(result)).toBe("enter");
    expect(result.partner_result?.receipt_id).toBe("dr_wallet_control_test");
  });
});
