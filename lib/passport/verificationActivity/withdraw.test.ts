import { beforeEach, describe, expect, it, vi } from "vitest";
import { GOOD_TROUBLE_PARTNER_ID } from "@/lib/goodTrouble/constants";
import { opaqueActivityRef } from "@/lib/passport/verificationActivity/view";
import {
  HOLDER_WITHDRAWAL_REASON_CODE,
  PASSPORT_ACTIVITY_WITHDRAW_CLIENT_KEYS,
  PASSPORT_ACTIVITY_WITHDRAW_NOT_CURRENT,
} from "@/lib/passport/verificationActivity/contract";
import { evaluatePublicReceiptTrust } from "@/lib/decisionReceipts/trustEvaluation";
import { toPublicView } from "@/lib/decisionReceipts/views";
import { validatePartnerFlowPublicReceipt } from "@/lib/partner/verifyPartnerFlowReceipt";
import { outcomeFromValidationErrors } from "@/lib/partner/integrationKit/outcomes";
import { portableReasonFromOutcome } from "@/lib/partner/portableActionContract/preflight";
import {
  generateTestSigningKeyPair,
  signReceiptPayload,
} from "@/lib/decisionReceipts/signing";
import { buildCanonicalPayload } from "@/lib/decisionReceipts/canonical";
import { subjectPseudonymId } from "@/lib/decisionReceipts/pseudonym";
import type { DecisionReceiptRecord } from "@/lib/decisionReceipts/types";

const rpcMock = vi.fn();
const fromMock = vi.fn();
const appendAuditMock = vi.fn();
const getReceiptByIdMock = vi.fn();
const enqueueRevokedMock = vi.fn();

vi.mock("@/lib/supabase/admin", () => ({
  SupabaseAdminConfigurationError: class SupabaseAdminConfigurationError extends Error {
    readonly code = "supabase_admin_not_configured";
  },
  requireSupabaseAdmin: vi.fn(() => ({
    from: fromMock,
    rpc: (...args: unknown[]) => rpcMock(...args),
  })),
  getSupabaseAdmin: vi.fn(() => ({
    from: fromMock,
    rpc: (...args: unknown[]) => rpcMock(...args),
  })),
}));

vi.mock("@/lib/verification/audit", () => ({
  appendAuditEvent: (...args: unknown[]) => appendAuditMock(...args),
}));

vi.mock("@/lib/decisionReceipts/service", () => ({
  getReceiptById: (...args: unknown[]) => getReceiptByIdMock(...args),
}));

vi.mock("@/lib/partner/webhooks/webhookHooks", () => ({
  maybeEnqueuePartnerReceiptRevoked: (...args: unknown[]) => enqueueRevokedMock(...args),
  maybeEnqueuePartnerAccessRevoked: vi.fn(),
  maybeEnqueuePartnerCredentialRevoked: vi.fn(),
}));

import {
  holderRevocationEventPreview,
  holderWithdrawalClientError,
  projectHolderWithdrawalClientView,
  rejectHolderWithdrawalClientAuthority,
  withdrawHolderSharedResult,
} from "@/lib/passport/verificationActivity/withdraw";

const SUBJECT_A = "0x" + "a".repeat(64);
const SUBJECT_B = "0x" + "b".repeat(64);
const DECISION_ID = "00000000-0000-4000-8000-0000000000aa";
const RECEIPT_ID = "dr_holder_withdraw_test";
const TEST_KEY = generateTestSigningKeyPair();

function thenable<T>(value: T) {
  const chain: Record<string, unknown> = {};
  const self = () => chain;
  chain.select = vi.fn(self);
  chain.eq = vi.fn(self);
  chain.gte = vi.fn(self);
  chain.order = vi.fn(self);
  chain.limit = vi.fn(self);
  chain.in = vi.fn(self);
  chain.then = (resolve: (v: T) => unknown, reject?: (e: unknown) => unknown) =>
    Promise.resolve(value).then(resolve, reject);
  return chain;
}

function sampleRecord(overrides: Partial<DecisionReceiptRecord> = {}): DecisionReceiptRecord {
  const payload = buildCanonicalPayload({
    receipt_id: RECEIPT_ID,
    decision_id: DECISION_ID,
    policy_id: "partner-age_18_retail-v1",
    policy_version: 1,
    partner_id: GOOD_TROUBLE_PARTNER_ID,
    subject_pseudonym_id: subjectPseudonymId(SUBJECT_A),
    wallet_binding_ref: null,
    consent_receipt_id: null,
    decision_result: "approved",
    reason_codes: ["all_claims_met"],
    evaluated_claim_refs: [{
      claim_id: "claim-1",
      claim_type: "identity_verified",
      issuer_id: "issuer:abraxas",
      status: "active",
      issued_at: "2026-01-01T00:00:00.000Z",
      expires_at: null,
    }],
    issuer_refs: ["issuer:abraxas"],
    decision_context: "production",
    evaluated_at: "2026-06-01T12:00:00.000Z",
    expires_at: "2099-01-01T00:00:00.000Z",
  });
  const { payloadHash, signature } = signReceiptPayload(payload, TEST_KEY.privateKeyJwk);
  return {
    id: payload.receipt_id,
    verification_decision_id: payload.decision_id,
    consent_receipt_id: null,
    partner_id: payload.partner_id,
    policy_id: payload.policy_id,
    policy_version: payload.policy_version,
    subject_pseudonym_id: payload.subject_pseudonym_id,
    wallet_binding_ref: null,
    decision_result: "approved",
    reason_codes: payload.reason_codes,
    evaluated_claim_refs: payload.evaluated_claim_refs,
    issuer_refs: payload.issuer_refs,
    decision_context: "production",
    evaluated_at: payload.evaluated_at,
    expires_at: payload.expires_at,
    revoked_at: null,
    status: "active",
    schema_version: payload.schema_version,
    payload_hash: payloadHash,
    signature,
    signing_key_id: TEST_KEY.signingKeyId,
    anchor_reference: null,
    idempotency_key: null,
    created_at: payload.evaluated_at,
    ...overrides,
  };
}

function mockStores(options: {
  subject?: string;
  decision?: string;
  receiptStatus?: string;
  receiptId?: string | null;
  revokedAt?: string | null;
  receiptError?: boolean;
  decisionError?: boolean;
} = {}) {
  const subject = options.subject ?? SUBJECT_A;
  fromMock.mockImplementation((table: string) => {
    if (table === "verification_decisions") {
      if (options.decisionError) return thenable({ data: null, error: { message: "SQLSTATE 42P01" } });
      return thenable({
        data: [{
          id: DECISION_ID,
          partner_id: GOOD_TROUBLE_PARTNER_ID,
          policy_id: "partner-age_18_retail-v1",
          policy_version: 1,
          decision: options.decision ?? "approved",
          decided_at: "2026-09-19T12:00:00.000Z",
          valid_until: "2026-12-01T00:00:00.000Z",
          status: options.receiptStatus === "revoked" ? "revoked" : "active",
          request_id: "req-1",
          subject_id: subject,
        }],
        error: null,
      });
    }
    if (table === "decision_receipts") {
      if (options.receiptError) return thenable({ data: null, error: { message: "SQLSTATE 42P01" } });
      if (options.receiptId === null) return thenable({ data: [], error: null });
      return thenable({
        data: [{
          id: options.receiptId ?? RECEIPT_ID,
          verification_decision_id: DECISION_ID,
          status: options.receiptStatus ?? "active",
          decision_context: "production",
          expires_at: "2026-12-01T00:00:00.000Z",
          revoked_at: options.revokedAt ?? null,
        }],
        error: null,
      });
    }
    return thenable({ data: [], error: null });
  });
}

describe("holder receipt withdrawal", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.ABRAXAS_PUBLIC_KEY = JSON.stringify(TEST_KEY.publicKeyJwk);
    rpcMock.mockReset();
    appendAuditMock.mockResolvedValue("audit-1");
    getReceiptByIdMock.mockResolvedValue(sampleRecord());
    enqueueRevokedMock.mockReturnValue(undefined);
  });

  it("rejects browser-supplied authority fields and raw receipt ids", () => {
    expect(rejectHolderWithdrawalClientAuthority({
      activity_ref: opaqueActivityRef(SUBJECT_A, DECISION_ID),
      receipt_id: RECEIPT_ID,
      subject: SUBJECT_B,
    }).ok).toBe(false);
    expect(rejectHolderWithdrawalClientAuthority({
      activity_ref: opaqueActivityRef(SUBJECT_A, DECISION_ID),
      disclosure_profile: "all",
    }).ok).toBe(false);
    expect(rejectHolderWithdrawalClientAuthority({
      activity_ref: opaqueActivityRef(SUBJECT_A, DECISION_ID),
    }).ok).toBe(true);
  });

  it("serializes only safe client fields and opaque next-step copy", () => {
    const view = projectHolderWithdrawalClientView(false);
    expect(Object.keys(view).sort()).toEqual([...PASSPORT_ACTIVITY_WITHDRAW_CLIENT_KEYS].sort());
    expect(JSON.stringify(view)).not.toContain(RECEIPT_ID);
    expect(JSON.stringify(view)).not.toContain(DECISION_ID);
    expect(view.next_step.toLowerCase()).toMatch(/not reverse/);
  });

  it("withdraws an active result the session holder owns", async () => {
    mockStores();
    rpcMock.mockResolvedValue({
      data: {
        ok: true,
        receipt_id: RECEIPT_ID,
        decision_id: DECISION_ID,
        revoked_at: "2026-09-20T12:00:00.000Z",
        reason_code: HOLDER_WITHDRAWAL_REASON_CODE,
        already_revoked: false,
        claim_ids: ["claim-1"],
      },
      error: null,
    });

    const result = await withdrawHolderSharedResult({
      subjectId: SUBJECT_A,
      activityRef: opaqueActivityRef(SUBJECT_A, DECISION_ID),
      clientBody: { activity_ref: opaqueActivityRef(SUBJECT_A, DECISION_ID) },
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.view.state).toBe("revoked");
    expect(result.view.already_withdrawn).toBe(false);
    expect(rpcMock).toHaveBeenCalledWith("revoke_decision_receipt_atomic", expect.objectContaining({
      p_reason_code: HOLDER_WITHDRAWAL_REASON_CODE,
    }));
    expect(appendAuditMock).toHaveBeenCalledWith(expect.objectContaining({
      actor_type: "subject",
      action: "passport_activity.withdrawn",
      object_id: opaqueActivityRef(SUBJECT_A, DECISION_ID),
      metadata: expect.objectContaining({ reason_code: HOLDER_WITHDRAWAL_REASON_CODE }),
    }));
    const audit = appendAuditMock.mock.calls[0]?.[0] as { metadata: Record<string, unknown>; object_id: string };
    expect(JSON.stringify(audit)).not.toContain(RECEIPT_ID);
    expect(JSON.stringify(audit.metadata)).not.toMatch(/0x[a-f]/);
  });

  it("replays an already-revoked result idempotently", async () => {
    mockStores({ receiptStatus: "revoked", revokedAt: "2026-09-18T00:00:00.000Z" });
    const result = await withdrawHolderSharedResult({
      subjectId: SUBJECT_A,
      activityRef: opaqueActivityRef(SUBJECT_A, DECISION_ID),
      clientBody: { activity_ref: opaqueActivityRef(SUBJECT_A, DECISION_ID) },
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.view.already_withdrawn).toBe(true);
    expect(rpcMock).not.toHaveBeenCalledWith("revoke_decision_receipt_atomic", expect.anything());
    expect(rpcMock).toHaveBeenCalledWith("revoke_derived_receipts_for_source", expect.objectContaining({
      p_source_receipt_id: RECEIPT_ID,
    }));
  });

  it("does not withdraw another holder's result", async () => {
    mockStores({ subject: SUBJECT_A });
    const result = await withdrawHolderSharedResult({
      subjectId: SUBJECT_B,
      activityRef: opaqueActivityRef(SUBJECT_A, DECISION_ID),
      clientBody: { activity_ref: opaqueActivityRef(SUBJECT_A, DECISION_ID) },
    });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error).toBe("not_found");
    expect(rpcMock).not.toHaveBeenCalled();
  });

  it("rejects expired and denied results", async () => {
    mockStores({ receiptStatus: "expired" });
    const expired = await withdrawHolderSharedResult({
      subjectId: SUBJECT_A,
      activityRef: opaqueActivityRef(SUBJECT_A, DECISION_ID),
      clientBody: { activity_ref: opaqueActivityRef(SUBJECT_A, DECISION_ID) },
    });
    expect(expired.ok).toBe(false);
    if (!expired.ok) expect(expired.error).toBe("result_not_current");

    mockStores({ decision: "denied", receiptStatus: "active" });
    const denied = await withdrawHolderSharedResult({
      subjectId: SUBJECT_A,
      activityRef: opaqueActivityRef(SUBJECT_A, DECISION_ID),
      clientBody: { activity_ref: opaqueActivityRef(SUBJECT_A, DECISION_ID) },
    });
    expect(denied.ok).toBe(false);
    if (!denied.ok) {
      expect(denied.error).toBe("result_not_current");
      expect(holderWithdrawalClientError(denied.error).error).toBe(PASSPORT_ACTIVITY_WITHDRAW_NOT_CURRENT);
    }
    expect(rpcMock).not.toHaveBeenCalled();
  });

  it("fails closed when lifecycle storage is unavailable", async () => {
    mockStores({ receiptError: true });
    const result = await withdrawHolderSharedResult({
      subjectId: SUBJECT_A,
      activityRef: opaqueActivityRef(SUBJECT_A, DECISION_ID),
      clientBody: { activity_ref: opaqueActivityRef(SUBJECT_A, DECISION_ID) },
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toBe("unavailable");
    expect(JSON.stringify(holderWithdrawalClientError("unavailable"))).not.toMatch(/SQLSTATE/);
  });

  it("invalidates public receipt, partner kit, and action preflight after revocation", () => {
    const record = sampleRecord({ status: "revoked", revoked_at: "2026-09-20T12:00:00.000Z" });
    const publicView = toPublicView(record);
    const trust = evaluatePublicReceiptTrust(publicView, {
      partnerId: GOOD_TROUBLE_PARTNER_ID,
      policyId: "partner-age_18_retail-v1",
      now: new Date("2026-09-20T13:00:00.000Z"),
    });
    const partnerValidation = validatePartnerFlowPublicReceipt(publicView, {
      partnerId: GOOD_TROUBLE_PARTNER_ID,
      policyId: "partner-age_18_retail-v1",
      now: new Date("2026-09-20T13:00:00.000Z"),
    });
    const kitOutcome = outcomeFromValidationErrors(partnerValidation.ok ? [] : partnerValidation.errors);
    expect(trust.currently_valid).toBe(false);
    expect(trust.invalidation_reasons).toContain("receipt_revoked");
    expect(kitOutcome).toBe("revoked");
    expect(portableReasonFromOutcome(kitOutcome)).toBe("receipt_revoked");
  });

  it("projects a selective-disclosure revocation event without sending it", () => {
    const payload = holderRevocationEventPreview({
      eventId: "evt_preview",
      occurredAt: "2026-09-20T12:00:00.000Z",
      partnerId: GOOD_TROUBLE_PARTNER_ID,
      policyId: "partner-age_18_retail-v1",
      policyVersion: 1,
      receiptId: RECEIPT_ID,
      decisionId: DECISION_ID,
    });
    expect(payload).not.toBeNull();
    expect(payload?.event_type).toBe("receipt.revoked");
    expect(payload?.reason_code).toBe(HOLDER_WITHDRAWAL_REASON_CODE);
    expect(JSON.stringify(payload)).not.toMatch(/email|wallet_address|legal_name/i);
    expect(enqueueRevokedMock).not.toHaveBeenCalled();
  });
});
