import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { NextRequest } from "next/server";
import { POST as evaluatePOST } from "@/app/api/v1/partner-flow/evaluate/route";
import { POST as completePOST } from "@/app/api/v1/partner-flow/complete/route";
import { POST as refreshPOST } from "@/app/api/v1/partner-flow/refresh/route";
import { flowTraceIdFromVerificationRequest } from "@/lib/partner/partnerFlowAudit";

const SUI = "0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef";
const RETURN_URL = "https://abraxas-app.vercel.app/demo/partner-access";
const PARTNER_ID = "good-trouble-cannabis";
const POLICY_ID = "good-trouble-retail-v1";
const VR_ID = "00000000-0000-4000-8000-00000000c101";
const VR_ID_FRESH = "00000000-0000-4000-8000-00000000c202";
const SHARED_TRACE = flowTraceIdFromVerificationRequest(VR_ID);

const fromMock = vi.fn();
const evaluatePolicyForSubject = vi.fn();
const findActiveSessionDecision = vi.fn();
const findDecisionByVerificationRequest = vi.fn();
const findReceiptForVerificationRequest = vi.fn();
const findSessionReceiptForSupersede = vi.fn();
const getReceiptByDecisionId = vi.fn();
const getReceiptById = vi.fn();
const issueReceiptForDecision = vi.fn();
const appendAuditEvent = vi.fn<(input: unknown) => Promise<string | null>>(async () => "audit-1");
const recordPartnerFlowReceiptMeteringBestEffort = vi.fn();

vi.mock("@/lib/supabase/admin", () => ({
  requireSupabaseAdmin: vi.fn(() => ({ from: fromMock })),
  getSupabaseAdmin: vi.fn(() => ({ from: fromMock })),
}));

vi.mock("@/lib/partner/verificationDecisionsSchema", () => ({
  isVerificationDecisionIdempotencyKeyAvailable: vi.fn(async () => true),
  isMissingIdempotencyKeyColumnError: vi.fn(() => false),
  markVerificationDecisionIdempotencyKeyAbsent: vi.fn(),
  markVerificationDecisionIdempotencyKeyAvailable: vi.fn(),
  resetVerificationDecisionSchemaProbeForTests: vi.fn(),
}));

vi.mock("@/lib/auth/browserSession", () => ({
  requireBrowserSession: vi.fn(async () => ({
    ok: true,
    session: { suiAddress: SUI },
  })),
}));

vi.mock("@/lib/connect/returnUrlAllowlist", () => ({
  isReturnUrlAllowed: vi.fn(async () => true),
  buildRedirectUrl: vi.fn((_url: string, params: Record<string, string>) =>
    `https://partner.example/enter?${new URLSearchParams(params).toString()}`),
}));

vi.mock("@/lib/partner/returnUrlAllowlist", () => ({
  isAllowedPartnerReturnUrl: vi.fn(async () => true),
  isReturnUrlAllowed: vi.fn(async () => true),
  buildRedirectUrl: vi.fn((_url: string, params: Record<string, string>) =>
    `https://partner.example/enter?${new URLSearchParams(params).toString()}`),
}));

vi.mock("@/lib/verify/resolveFlowParams", () => ({
  resolvePartnerFlowParams: vi.fn(() => ({ policyId: POLICY_ID })),
}));

vi.mock("@/lib/partner/logPartnerUsage", () => ({
  logPartnerUsage: vi.fn(),
}));

vi.mock("@/lib/partner/partnerMetering", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/partner/partnerMetering")>();
  return {
    ...actual,
    recordPartnerFlowReceiptMeteringBestEffort: (...args: unknown[]) =>
      recordPartnerFlowReceiptMeteringBestEffort(...args),
  };
});

vi.mock("@/lib/verification/audit", () => ({
  appendAuditEvent: (input: unknown) => appendAuditEvent(input),
}));

vi.mock("@/lib/policy/evaluateSubjectPolicy", () => ({
  evaluatePolicyForSubject: (...args: unknown[]) => evaluatePolicyForSubject(...args),
}));

vi.mock("@/lib/partner/sessionDecision", () => ({
  findActiveSessionDecision: (...args: unknown[]) => findActiveSessionDecision(...args),
  findDecisionByVerificationRequest: (...args: unknown[]) => findDecisionByVerificationRequest(...args),
  findReceiptForVerificationRequest: (...args: unknown[]) => findReceiptForVerificationRequest(...args),
  findDecisionByIdempotencyKey: vi.fn(async () => null),
  findSessionReceiptForSupersede: (...args: unknown[]) => findSessionReceiptForSupersede(...args),
  supersedeActiveSessionDecisions: vi.fn(async () => undefined),
}));

vi.mock("@/lib/decisionReceipts/service", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/decisionReceipts/service")>();
  return {
    ...actual,
    getReceiptByDecisionId: (...args: unknown[]) => getReceiptByDecisionId(...args),
    getReceiptById: (...args: unknown[]) => getReceiptById(...args),
    issueReceiptForDecision: (...args: unknown[]) => issueReceiptForDecision(...args),
  };
});

vi.mock("@/lib/credentials/claimsService", () => ({
  getActiveClaims: vi.fn(async () => []),
}));

vi.mock("@/lib/decisionReceipts/trustEvaluation", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/decisionReceipts/trustEvaluation")>();
  return {
    ...actual,
    evaluateDecisionReceiptTrust: vi.fn(async () => ({
      currently_valid: true,
      validity: "active",
      signature_valid: true,
      production_usable: true,
      invalidation_reasons: [],
    })),
  };
});

function postJson(url: string, body: Record<string, unknown>) {
  return new NextRequest(url, {
    method: "POST",
    body: JSON.stringify(body),
    headers: { "content-type": "application/json" },
  });
}

function auditActions(): string[] {
  return appendAuditEvent.mock.calls
    .map(call => (call[0] as { action?: string } | undefined)?.action)
    .filter((action): action is string => typeof action === "string");
}

const POLICY_RULES = {
  minimum_age: 21,
  required_claims: [{ claim_type: "identity_verified", min_assurance: "L2" }],
};

function approvedPolicy() {
  return {
    policy: {
      id: POLICY_ID,
      version: 1,
      partner_id: PARTNER_ID,
      rules_json: POLICY_RULES,
    },
    evaluation: {
      decision: "approved",
      reason_codes: [],
      claims: { identity_verified: true },
    },
    claims: [],
  };
}

function activeReceipt(id = "dr_active") {
  return {
    id,
    status: "active",
    partner_id: PARTNER_ID,
    policy_id: POLICY_ID,
    decision_result: "approved",
    expires_at: "2099-01-01T00:00:00.000Z",
    decision_context: "production",
    signature: "sig",
    payload_hash: "hash",
    signing_key_id: "kid",
    evaluated_claim_refs: [],
    reason_codes: [],
    issuer_refs: [],
    subject_pseudonym_id: "pseudo",
    schema_version: "1.0.0",
    verification_decision_id: "vd_active",
    policy_version: 1,
    evaluated_at: "2026-01-01T00:00:00.000Z",
    consent_receipt_id: null,
    wallet_binding_ref: null,
    anchor_reference: null,
    revoked_at: null,
    idempotency_key: null,
    created_at: "2026-01-01T00:00:00.000Z",
  };
}

function installCredentialTables(
  claimRows: Array<{ claim_type: string; status: string }>,
  options: { allowDecisionInsert?: boolean } = {},
) {
  fromMock.mockImplementation((table: string) => {
    if (table === "identity_verifications") {
      return {
        select: vi.fn().mockReturnThis(),
        or: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockResolvedValue({
          data: { status: "approved", credential_jti: "cred-jti-1" },
          error: null,
        }),
      };
    }
    if (table === "abraxas_credentials") {
      return {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockResolvedValue({
          data: {
            jti: "cred-jti-1",
            credential_jwt: "jwt.test",
            expiration_date: "2099-01-01T00:00:00.000Z",
            revoked_at: null,
          },
          error: null,
        }),
      };
    }
    if (table === "credential_claims") {
      return {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        in: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue({ data: claimRows, error: null }),
      };
    }
    if (table === "partner_policies") {
      return {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockResolvedValue({
          data: {
            id: POLICY_ID,
            version: 1,
            partner_id: PARTNER_ID,
            status: "active",
            rules_json: POLICY_RULES,
          },
          error: null,
        }),
      };
    }
    if (table === "verification_decisions" && options.allowDecisionInsert) {
      return {
        insert: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: { id: "vd_fresh" },
              error: null,
            }),
          }),
        }),
      };
    }
    return {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
    };
  });
}

describe("partner-flow revocation runtime routes", () => {
  const envBackup = { ...process.env };

  beforeEach(() => {
    vi.clearAllMocks();
    process.env = {
      ...envBackup,
      PARTNER_FLOW_RATE_LIMIT_ENABLED: "false",
    };
    appendAuditEvent.mockResolvedValue("audit-1");
    evaluatePolicyForSubject.mockResolvedValue(approvedPolicy());
    findActiveSessionDecision.mockResolvedValue(null);
    findDecisionByVerificationRequest.mockResolvedValue(null);
    findReceiptForVerificationRequest.mockResolvedValue(null);
    findSessionReceiptForSupersede.mockResolvedValue(null);
    issueReceiptForDecision.mockResolvedValue({ id: "dr_new" });
    getReceiptByDecisionId.mockResolvedValue(null);
    getReceiptById.mockResolvedValue(null);
    installCredentialTables([]);
  });

  afterEach(() => {
    process.env = envBackup;
  });

  it("revoked claim denies evaluate with stable reason and no receipt issuance side effects", async () => {
    installCredentialTables([{ claim_type: "identity_verified", status: "revoked" }]);

    const res = await evaluatePOST(postJson("http://localhost/api/v1/partner-flow/evaluate", {
      partner_id: PARTNER_ID,
      policy_id: POLICY_ID,
      return_url: RETURN_URL,
    }));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.next).toBe("denied");
    expect(body.invalidation_reasons).toContain("claim_revoked");
    expect(body.reason_codes).toContain("claim_revoked");
    expect(body.partner_result).toBeUndefined();
    expect(body.replay_status).toBeUndefined();
    expect(auditActions()).toEqual(["partner_flow.evaluate"]);
    expect(auditActions()).not.toContain("partner_flow.receipt_issued");
    expect(recordPartnerFlowReceiptMeteringBestEffort).not.toHaveBeenCalled();
    expect(issueReceiptForDecision).not.toHaveBeenCalled();
  });

  it("revoked claim denies complete and refresh with zero metering", async () => {
    installCredentialTables([{ claim_type: "identity_verified", status: "revoked" }]);

    const completeRes = await completePOST(postJson("http://localhost/api/v1/partner-flow/complete", {
      partner_id: PARTNER_ID,
      policy_id: POLICY_ID,
      return_url: RETURN_URL,
      verification_request_id: VR_ID,
      flow_trace_id: SHARED_TRACE,
    }));
    const completeBody = await completeRes.json();
    expect(completeRes.status).toBe(200);
    expect(completeBody.next).toBe("denied");
    expect(completeBody.invalidation_reasons).toContain("claim_revoked");

    const refreshRes = await refreshPOST(postJson("http://localhost/api/v1/partner-flow/refresh", {
      partner_id: PARTNER_ID,
      policy_id: POLICY_ID,
      return_url: RETURN_URL,
    }));
    const refreshBody = await refreshRes.json();
    expect(refreshRes.status).toBe(200);
    expect(refreshBody.next).toBe("denied");
    expect(refreshBody.invalidation_reasons).toContain("claim_revoked");
    expect(recordPartnerFlowReceiptMeteringBestEffort).not.toHaveBeenCalled();
    expect(issueReceiptForDecision).not.toHaveBeenCalled();
  });

  it("receipt-only revoke blocks refresh without automatic access restoration", async () => {
    installCredentialTables([]);
    findActiveSessionDecision.mockResolvedValue({
      decision_id: "vd_revoked",
      receipt_id: "dr_revoked_only",
      receipt_expires_at: "2099-01-01T00:00:00.000Z",
    });
    findSessionReceiptForSupersede.mockResolvedValue("dr_revoked_only");
    const revokedReceipt = { ...activeReceipt("dr_revoked_only"), status: "revoked" };
    getReceiptByDecisionId.mockResolvedValue(revokedReceipt);
    getReceiptById.mockResolvedValue(revokedReceipt);

    const refreshRes = await refreshPOST(postJson("http://localhost/api/v1/partner-flow/refresh", {
      partner_id: PARTNER_ID,
      policy_id: POLICY_ID,
      return_url: RETURN_URL,
    }));
    const refreshBody = await refreshRes.json();

    expect(refreshRes.status).toBe(200);
    expect(refreshBody.next).toBe("denied");
    expect(refreshBody.invalidation_reasons).toContain("receipt_revoked");
    expect(refreshBody.partner_result).toBeUndefined();
    expect(issueReceiptForDecision).not.toHaveBeenCalled();
    expect(recordPartnerFlowReceiptMeteringBestEffort).not.toHaveBeenCalled();
  });

  it("receipt-only revoke blocks complete with old verification_request_id", async () => {
    installCredentialTables([]);
    const revokedReceipt = { ...activeReceipt("dr_old"), status: "revoked", verification_decision_id: "vd_old" };
    findDecisionByVerificationRequest.mockResolvedValue(null);
    findReceiptForVerificationRequest.mockResolvedValue({
      decision_id: "vd_old",
      receipt_id: "dr_old",
      receipt: revokedReceipt,
    });

    const completeRes = await completePOST(postJson("http://localhost/api/v1/partner-flow/complete", {
      partner_id: PARTNER_ID,
      policy_id: POLICY_ID,
      return_url: RETURN_URL,
      verification_request_id: VR_ID,
      flow_trace_id: SHARED_TRACE,
    }));
    const completeBody = await completeRes.json();

    expect(completeRes.status).toBe(200);
    expect(completeBody.next).toBe("denied");
    expect(completeBody.invalidation_reasons).toContain("receipt_revoked");
    expect(completeBody.reason_codes).toContain("receipt_revoked");
    expect(completeBody.partner_result).toBeUndefined();
    expect(completeBody.replay_status).toBeUndefined();
    expect(auditActions()).toEqual(["partner_flow.complete"]);
    expect(auditActions()).not.toContain("partner_flow.receipt_issued");
    expect(auditActions()).not.toContain("partner_flow.idempotent_replay");
    expect(recordPartnerFlowReceiptMeteringBestEffort).not.toHaveBeenCalled();
    expect(issueReceiptForDecision).not.toHaveBeenCalled();
  });

  it("fresh verification request issues new receipt on complete", async () => {
    installCredentialTables([], { allowDecisionInsert: true });
    findReceiptForVerificationRequest.mockResolvedValue(null);
    findDecisionByVerificationRequest.mockResolvedValue(null);
    issueReceiptForDecision.mockResolvedValue({ id: "dr_fresh" });
    getReceiptByDecisionId.mockImplementation(async (decisionId: string) => ({
      ...activeReceipt("dr_fresh"),
      id: "dr_fresh",
      verification_decision_id: decisionId,
    }));

    const freshTrace = flowTraceIdFromVerificationRequest(VR_ID_FRESH);
    const completeRes = await completePOST(postJson("http://localhost/api/v1/partner-flow/complete", {
      partner_id: PARTNER_ID,
      policy_id: POLICY_ID,
      return_url: RETURN_URL,
      verification_request_id: VR_ID_FRESH,
      flow_trace_id: freshTrace,
    }));
    const completeBody = await completeRes.json();

    expect(completeRes.status).toBe(200);
    expect(completeBody.next).toBe("enter");
    expect(completeBody.decision_id).toBe("vd_fresh");
    expect(completeBody.partner_result?.receipt_id).toBe("dr_fresh");
    expect(completeBody.replay_status).toBe("issued");
    expect(auditActions()).toContain("partner_flow.receipt_issued");
    expect(issueReceiptForDecision).toHaveBeenCalledTimes(1);
    expect(recordPartnerFlowReceiptMeteringBestEffort).toHaveBeenCalled();
  });

  it("natural expiry refresh still supersedes active expired receipt", async () => {
    installCredentialTables([], { allowDecisionInsert: true });
    const expiredReceipt = {
      ...activeReceipt("dr_expired"),
      expires_at: "2020-01-01T00:00:00.000Z",
      status: "active",
    };
    findActiveSessionDecision.mockResolvedValue(null);
    findSessionReceiptForSupersede.mockResolvedValue("dr_expired");
    getReceiptById.mockResolvedValue(expiredReceipt);
    issueReceiptForDecision.mockResolvedValue({ id: "dr_refreshed" });
    getReceiptByDecisionId.mockImplementation(async (decisionId: string) => ({
      ...activeReceipt("dr_refreshed"),
      id: "dr_refreshed",
      verification_decision_id: decisionId,
    }));

    const refreshRes = await refreshPOST(postJson("http://localhost/api/v1/partner-flow/refresh", {
      partner_id: PARTNER_ID,
      policy_id: POLICY_ID,
      return_url: RETURN_URL,
    }));
    const refreshBody = await refreshRes.json();

    expect(refreshRes.status).toBe(200);
    expect(refreshBody.next).toBe("enter");
    expect(refreshBody.partner_result?.receipt_id).toBe("dr_refreshed");
    expect(refreshBody.replay_status).toBe("issued");
    expect(issueReceiptForDecision).toHaveBeenCalledTimes(1);
  });

  it("non-revoked control flow still evaluates to enter with receipt issuance audit", async () => {
    installCredentialTables([]);
    findActiveSessionDecision.mockResolvedValue({
      decision_id: "vd_active",
      receipt_id: "dr_active",
      receipt_expires_at: "2099-01-01T00:00:00.000Z",
    });
    getReceiptByDecisionId.mockResolvedValue(activeReceipt());

    const res = await evaluatePOST(postJson("http://localhost/api/v1/partner-flow/evaluate", {
      partner_id: PARTNER_ID,
      policy_id: POLICY_ID,
      return_url: RETURN_URL,
    }));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.next).toBe("enter");
    expect(body.partner_result?.receipt_id).toBe("dr_active");
    expect(body.replay_status).toBe("idempotent_replay");
    expect(auditActions()).toContain("partner_flow.idempotent_replay");
    expect(auditActions()).not.toContain("partner_flow.receipt_issued");
    expect(issueReceiptForDecision).not.toHaveBeenCalled();
  });
});
