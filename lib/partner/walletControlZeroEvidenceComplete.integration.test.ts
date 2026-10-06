// FILE: lib/partner/walletControlZeroEvidenceComplete.integration.test.ts
// Integration: holder_unlinked + zero evidence → complete returns verification_required.

import { beforeEach, describe, expect, it, vi } from "vitest";
import { completePartnerFlowAfterApproval } from "@/lib/partner/relyingPartyFlow";

const SUBJECT = "0x0000000000000000000000000000000000000000000000000000000000000002";
const PARTNER = "ref-wc-postrev-5ffe";
const POLICY = "ref-wc-postrev-5ffe-wallet_control-v1";
const RETURN_URL = "https://example.com/callback";
const VR_ID = "50581b94-7062-423c-8000-000000000001";

const fromMock = vi.fn();
const evaluatePolicyForSubject = vi.fn();

vi.mock("@/lib/supabase/admin", () => ({
  requireSupabaseAdmin: vi.fn(() => ({ from: fromMock })),
  getSupabaseAdmin: vi.fn(() => ({ from: fromMock })),
}));

vi.mock("@/lib/connect/returnUrlAllowlist", () => ({
  isReturnUrlAllowed: vi.fn(async () => true),
  buildRedirectUrl: vi.fn(),
}));

vi.mock("@/lib/policy/evaluateSubjectPolicy", () => ({
  evaluatePolicyForSubject: (...args: unknown[]) => evaluatePolicyForSubject(...args),
}));

vi.mock("@/lib/credentials/claimsService", () => ({
  getActiveClaims: vi.fn(async () => []),
  getActiveClaimsForPolicyEvaluation: vi.fn(async () => []),
}));

vi.mock("@/lib/privacy/privacySubjectAccess", () => ({
  subjectHasPrivacyAccessRevoked: vi.fn(async () => false),
}));

vi.mock("@/lib/partner/sessionDecision", () => ({
  findActiveSessionDecision: vi.fn(async () => null),
  findDecisionByVerificationRequest: vi.fn(async () => null),
  findReceiptForVerificationRequest: vi.fn(async () => null),
  findDecisionByIdempotencyKey: vi.fn(async () => null),
  findSessionReceiptForSupersede: vi.fn(async () => null),
  supersedeActiveSessionDecisions: vi.fn(async () => undefined),
}));

vi.mock("@/lib/decisionReceipts/service", () => ({
  getReceiptByDecisionId: vi.fn(async () => null),
  getReceiptById: vi.fn(async () => null),
  issueReceiptForDecision: vi.fn(async () => null),
}));

vi.mock("@/lib/partner/verificationDecisionsSchema", () => ({
  isVerificationDecisionIdempotencyKeyAvailable: vi.fn(async () => true),
  isMissingIdempotencyKeyColumnError: vi.fn(() => false),
  markVerificationDecisionIdempotencyKeyAbsent: vi.fn(),
  markVerificationDecisionIdempotencyKeyAvailable: vi.fn(),
}));

vi.mock("@/lib/policy/changeControl/lifecycle", () => ({
  resolveIssuablePolicyForPartner: vi.fn(async () => ({
    id: POLICY,
    partner_id: PARTNER,
    version: 1,
    rules_json: {
      required_claims: [{ claim_type: "wallet_binding_confirmed", min_assurance: "L1" }],
    },
  })),
}));

vi.mock("@/lib/verification/requestsService", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/verification/requestsService")>();
  return {
    ...actual,
    getPolicy: vi.fn(async () => ({
      id: POLICY,
      partner_id: PARTNER,
      version: 1,
      rules_json: {
        required_claims: [{ claim_type: "wallet_binding_confirmed", min_assurance: "L1" }],
      },
    })),
  };
});

function installCredentialTables() {
  fromMock.mockImplementation((table: string) => {
    if (table === "identity_verifications") {
      return chain({ data: { status: "approved", credential_jti: "cred-jti" }, error: null });
    }
    if (table === "abraxas_credentials") {
      return chain({
        data: {
          jti: "cred-jti",
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
          id: POLICY,
          partner_id: PARTNER,
          version: 1,
          rules_json: {
            required_claims: [{ claim_type: "wallet_binding_confirmed", min_assurance: "L1" }],
          },
        },
        error: null,
      });
    }
    if (table === "credential_claims") {
      return {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        in: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue({
          data: [{
            claim_type: "wallet_binding_confirmed",
            status: "revoked",
            revocation_reference: "holder_unlinked",
          }],
          error: null,
        }),
      };
    }
    return chain({ data: null, error: null });
  });
}

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

describe("wallet_control complete zero-evidence integration", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    installCredentialTables();
    evaluatePolicyForSubject.mockResolvedValue({
      policy: {
        id: POLICY,
        partner_id: PARTNER,
        version: 1,
        rules_json: {
          required_claims: [{ claim_type: "wallet_binding_confirmed", min_assurance: "L1" }],
        },
      },
      evaluation: {
        decision: "denied",
        claims: {},
        reason_codes: ["missing:wallet_binding_confirmed"],
        valid_until: null,
      },
      claims: [],
    });
  });

  it("returns verification_required for holder_unlinked + zero active evidence", async () => {
    const result = await completePartnerFlowAfterApproval({
      suiAddress: SUBJECT,
      partnerId: PARTNER,
      policyId: POLICY,
      returnUrl: RETURN_URL,
      verificationRequestId: VR_ID,
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.next).toBe("verification_required");
    expect(result.holder_authorization_state).toBe("verification_required");
    expect(result.currently_valid).toBe(false);
    expect(result.redirect_url).toBeUndefined();
    expect(result.invalidation_reasons).not.toContain("claim_revoked");
  });
});
