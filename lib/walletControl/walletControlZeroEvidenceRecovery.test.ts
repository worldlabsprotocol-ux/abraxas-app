// FILE: lib/walletControl/walletControlZeroEvidenceRecovery.test.ts
// Matrix A–R: wallet-control zero-evidence recovery vs fail-closed revocation.

import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  checkPartnerFlowRevocationGate,
  findRevokedPolicyClaims,
} from "@/lib/partner/partnerFlowRevocationRuntime";
import {
  isRecoverableWalletControlInvalidationReason,
  isRecoverableWalletControlPolicyDenial,
  isRecoverableWalletControlRevocationReference,
  isRecoverableWalletControlRevokedClaim,
  resolveWalletControlZeroEvidenceOutcome,
  walletControlVerificationRequiredOutcome,
} from "@/lib/walletControl/recoverableWalletControlRevocation";
import {
  isPartnerFlowAuthorizationSuccess,
  isPartnerFlowVerificationRequired,
  resolveHolderAuthorizationState,
} from "@/lib/partner/partnerFlowCurrentAuthorization";
import { HOLDER_INTENT_WALLET_REVOCATION_REASON } from "@/lib/walletControl/holderIntentRevocationHistory";
import {
  WALLET_CONTROL_PROOF_PREDATES_REVOCATION,
  WALLET_CONTROL_PROVENANCE_INSUFFICIENT,
} from "@/lib/walletControl/postRevocationProvenance";
const SUBJECT = "0x0000000000000000000000000000000000000000000000000000000000000002";
const PARTNER = "ref-wc-postrev-5ffe";
const POLICY = "ref-wc-postrev-5ffe-wallet_control-v1";

const fromMock = vi.fn();
const getPartnerPolicy = vi.fn();
const getActiveClaims = vi.fn();

vi.mock("@/lib/supabase/admin", () => ({
  requireSupabaseAdmin: vi.fn(() => ({ from: fromMock })),
}));

vi.mock("@/lib/credentials/claimsService", () => ({
  getActiveClaims: (...args: unknown[]) => getActiveClaims(...args),
}));

vi.mock("@/lib/policy/getPolicy", () => ({
  getPartnerPolicy: (...args: unknown[]) => getPartnerPolicy(...args),
}));

vi.mock("@/lib/privacy/privacySubjectAccess", () => ({
  subjectHasPrivacyAccessRevoked: vi.fn(async () => false),
}));

vi.mock("@/lib/partner/sessionDecision", () => ({
  findActiveSessionDecision: vi.fn(async () => null),
  findDecisionByVerificationRequest: vi.fn(async () => null),
  findReceiptForVerificationRequest: vi.fn(async () => null),
  findSessionReceiptForSupersede: vi.fn(async () => null),
}));

vi.mock("@/lib/decisionReceipts/service", () => ({
  getReceiptByDecisionId: vi.fn(async () => null),
  getReceiptById: vi.fn(async () => null),
}));

function walletControlPolicy() {
  return {
    id: POLICY,
    partner_id: PARTNER,
    version: 1,
    rules_json: {
      required_claims: [{ claim_type: "wallet_binding_confirmed", min_assurance: "L1" }],
    },
  };
}

function installRevokedClaimRow(row: {
  claim_type: string;
  status: string;
  revocation_reference?: string | null;
}) {
  fromMock.mockImplementation((table: string) => {
    if (table === "credential_claims") {
      return {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        in: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue({ data: [row], error: null }),
      };
    }
    return {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
    };
  });
}

describe("recoverable wallet-control classification", () => {
  it("A: holder_unlinked revoked historical claim is recoverable at pre-gate", () => {
    expect(isRecoverableWalletControlRevocationReference(HOLDER_INTENT_WALLET_REVOCATION_REASON)).toBe(true);
    expect(isRecoverableWalletControlRevokedClaim({
      claim_type: "wallet_binding_confirmed",
      status: "revoked",
      revocation_reference: HOLDER_INTENT_WALLET_REVOCATION_REASON,
    })).toBe(true);
  });

  it("B: missing wallet evidence maps to recoverable policy denial", () => {
    expect(isRecoverableWalletControlPolicyDenial(["missing:wallet_binding_confirmed"])).toBe(true);
  });

  it("C: expired evidence maps to recoverable invalidation", () => {
    expect(isRecoverableWalletControlInvalidationReason("receipt_expired")).toBe(true);
    expect(isRecoverableWalletControlInvalidationReason("claim_expired:abc")).toBe(true);
  });

  it("D: provenance-insufficient evidence maps to recoverable invalidation", () => {
    expect(isRecoverableWalletControlInvalidationReason(WALLET_CONTROL_PROVENANCE_INSUFFICIENT)).toBe(true);
    expect(isRecoverableWalletControlRevocationReference(WALLET_CONTROL_PROVENANCE_INSUFFICIENT)).toBe(true);
  });

  it("E: receipt_revoked remains fail-closed", () => {
    expect(resolveHolderAuthorizationState({
      currently_valid: false,
      invalidation_reasons: ["receipt_revoked"],
    })).toBe("denied");
    expect(isRecoverableWalletControlInvalidationReason("receipt_revoked")).toBe(false);
  });

  it("F: access_revoked remains fail-closed", () => {
    expect(resolveHolderAuthorizationState({
      currently_valid: false,
      invalidation_reasons: ["access_revoked"],
    })).toBe("denied");
  });

  it("G: non-holder security claim revocation remains fail-closed", () => {
    expect(isRecoverableWalletControlRevokedClaim({
      claim_type: "wallet_binding_confirmed",
      status: "revoked",
      revocation_reference: "privacy_deletion_approved",
    })).toBe(false);
    expect(isRecoverableWalletControlRevokedClaim({
      claim_type: "wallet_binding_confirmed",
      status: "revoked",
      revocation_reference: null,
    })).toBe(false);
  });

  it("H: suspended/under_review remain fail-closed", () => {
    expect(isRecoverableWalletControlRevokedClaim({
      claim_type: "wallet_binding_confirmed",
      status: "suspended",
      revocation_reference: HOLDER_INTENT_WALLET_REVOCATION_REASON,
    })).toBe(false);
    expect(isRecoverableWalletControlRevokedClaim({
      claim_type: "wallet_binding_confirmed",
      status: "under_review",
      revocation_reference: HOLDER_INTENT_WALLET_REVOCATION_REASON,
    })).toBe(false);
  });
});

describe("wallet-control pre-gate", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getActiveClaims.mockResolvedValue([]);
    getPartnerPolicy.mockResolvedValue(walletControlPolicy());
  });

  it("A: holder_unlinked + zero active evidence → pre-gate passes (not denied)", async () => {
    installRevokedClaimRow({
      claim_type: "wallet_binding_confirmed",
      status: "revoked",
      revocation_reference: HOLDER_INTENT_WALLET_REVOCATION_REASON,
    });

    const row = await findRevokedPolicyClaims({
      subjectId: SUBJECT,
      partnerId: PARTNER,
      policyId: POLICY,
    });
    expect(row).toBeNull();

    const denied = await checkPartnerFlowRevocationGate({
      subjectId: SUBJECT,
      partnerId: PARTNER,
      policyId: POLICY,
      operation: "complete",
    });
    expect(denied).toBeNull();
  });

  it("G: security revocation reference → pre-gate denies", async () => {
    installRevokedClaimRow({
      claim_type: "wallet_binding_confirmed",
      status: "revoked",
      revocation_reference: "privacy_deletion_approved",
    });

    const denied = await checkPartnerFlowRevocationGate({
      subjectId: SUBJECT,
      partnerId: PARTNER,
      policyId: POLICY,
      operation: "complete",
    });
    expect(denied?.next).toBe("denied");
    expect(denied?.invalidation_reasons).toContain("claim_revoked");
  });

  it("H: suspended claim → pre-gate denies", async () => {
    installRevokedClaimRow({
      claim_type: "wallet_binding_confirmed",
      status: "suspended",
      revocation_reference: HOLDER_INTENT_WALLET_REVOCATION_REASON,
    });

    const denied = await checkPartnerFlowRevocationGate({
      subjectId: SUBJECT,
      partnerId: PARTNER,
      policyId: POLICY,
      operation: "complete",
    });
    expect(denied?.next).toBe("denied");
    expect(denied?.invalidation_reasons).toContain("access_revoked");
  });
});

describe("wallet-control zero-evidence server contract", () => {
  it("I: verification_required is not authorization success", () => {
    const outcome = walletControlVerificationRequiredOutcome({
      invalidation_reasons: ["missing:wallet_binding_confirmed"],
    });
    expect(outcome.next).toBe("verification_required");
    expect(outcome.holder_authorization_state).toBe("verification_required");
    expect(outcome.currently_valid).toBe(false);
    expect(isPartnerFlowAuthorizationSuccess(outcome)).toBe(false);
    expect(isPartnerFlowVerificationRequired(outcome)).toBe(true);
  });

  it("maps recoverable policy denial to verification_required", () => {
    const mapped = resolveWalletControlZeroEvidenceOutcome({
      policyId: POLICY,
      reasonCodes: ["missing:wallet_binding_confirmed"],
      policyVersion: 1,
    });
    expect(mapped?.next).toBe("verification_required");
    expect(mapped?.holder_authorization_state).toBe("verification_required");
    expect(mapped?.currently_valid).toBe(false);
  });

  it("does not map non-recoverable policy denial", () => {
    expect(resolveWalletControlZeroEvidenceOutcome({
      policyId: POLICY,
      reasonCodes: ["claim_revoked"],
    })).toBeNull();
  });

  it("does not map non-wallet-control policies", () => {
    expect(resolveWalletControlZeroEvidenceOutcome({
      policyId: "good-trouble-retail-v1",
      reasonCodes: ["missing:identity_verified"],
    })).toBeNull();
  });
});

