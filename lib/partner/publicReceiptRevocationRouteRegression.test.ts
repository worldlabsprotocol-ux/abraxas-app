import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { NextRequest } from "next/server";
import { GET as publicReceiptGET } from "@/app/api/receipts/[receiptId]/public/route";
import { POST as adminRevocationPOST } from "@/app/api/admin/revocation/route";
import {
  generateTestSigningKeyPair,
  signReceiptPayload,
} from "@/lib/decisionReceipts/signing";
import { buildCanonicalPayload } from "@/lib/decisionReceipts/canonical";
import { subjectPseudonymId } from "@/lib/decisionReceipts/pseudonym";
import type { DecisionReceiptRecord } from "@/lib/decisionReceipts/types";
import { validatePartnerFlowPublicReceipt } from "@/lib/partner/verifyPartnerFlowReceipt";
import { resetPartnerFlowRateLimitStoreForTests } from "@/lib/partner/partnerFlowRateLimit";
import { resetPartnerFlowUpstashStoreForTests } from "@/lib/partner/partnerFlowUpstashStore";

const TEST_KEY = generateTestSigningKeyPair();
const RECEIPT_ID = "dr_route_revoke_contract";
const CLAIM_ID = "00000000-0000-4000-8000-00000000c101";
const PARTNER_ID = "partner-a";
const POLICY_ID = "partner-policy-v1";
const NOW = new Date("2026-01-01T00:00:00.000Z");

const rpcMock = vi.fn();
const fromMock = vi.fn();
let decisionReceiptsInMock: ReturnType<typeof vi.fn>;

let receiptRecord: DecisionReceiptRecord;
const claimStatuses = new Map<string, string>();

function buildSampleRecord(overrides: Partial<DecisionReceiptRecord> = {}): DecisionReceiptRecord {
  const payload = buildCanonicalPayload({
    receipt_id: RECEIPT_ID,
    decision_id: "00000000-0000-4000-8000-000000009901",
    policy_id: POLICY_ID,
    policy_version: 1,
    partner_id: PARTNER_ID,
    subject_pseudonym_id: subjectPseudonymId("0xabc"),
    wallet_binding_ref: null,
    consent_receipt_id: null,
    decision_result: "approved",
    reason_codes: ["all_claims_met"],
    evaluated_claim_refs: [{
      claim_id: CLAIM_ID,
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

function mapReceiptRow(record: DecisionReceiptRecord) {
  return {
    id: record.id,
    verification_decision_id: record.verification_decision_id,
    consent_receipt_id: record.consent_receipt_id,
    partner_id: record.partner_id,
    policy_id: record.policy_id,
    policy_version: record.policy_version,
    subject_pseudonym_id: record.subject_pseudonym_id,
    wallet_binding_ref: record.wallet_binding_ref,
    decision_result: record.decision_result,
    reason_codes: record.reason_codes,
    evaluated_claim_refs: record.evaluated_claim_refs,
    issuer_refs: record.issuer_refs,
    decision_context: record.decision_context,
    evaluated_at: record.evaluated_at,
    expires_at: record.expires_at,
    revoked_at: record.revoked_at,
    status: record.status,
    schema_version: record.schema_version,
    payload_hash: record.payload_hash,
    signature: record.signature,
    signing_key_id: record.signing_key_id,
    anchor_reference: record.anchor_reference,
    idempotency_key: record.idempotency_key,
    created_at: record.created_at,
  };
}

function installSupabaseMocks() {
  decisionReceiptsInMock = vi.fn().mockImplementation(async (_col: string, ids: string[]) => ({
    data: ids.map(id => ({
      id,
      partner_id: receiptRecord.partner_id,
      policy_id: receiptRecord.policy_id,
      verification_decision_id: receiptRecord.verification_decision_id,
    })),
    error: null,
  }));

  fromMock.mockImplementation((table: string) => {
    if (table === "decision_receipts") {
      const selectChain = {
        eq: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockImplementation(async () => ({
          data: mapReceiptRow(receiptRecord),
          error: null,
        })),
        in: decisionReceiptsInMock,
        order: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue({ data: [], error: null }),
      };
      return {
        select: vi.fn().mockReturnValue(selectChain),
      };
    }
    if (table === "credential_claims") {
      return {
        select: vi.fn().mockReturnThis(),
        in: vi.fn().mockImplementation(async (_col: string, ids: string[]) => ({
          data: ids.map(id => ({
            id,
            status: claimStatuses.get(id) ?? "active",
            expires_at: null,
          })),
          error: null,
        })),
      };
    }
    return {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
    };
  });
}

async function fetchPublicReceipt(receiptId: string) {
  const req = new NextRequest(`http://localhost/api/receipts/${receiptId}/public`);
  const res = await publicReceiptGET(req, { params: Promise.resolve({ receiptId }) });
  const body = await res.json();
  return { res, body };
}

vi.mock("@/lib/supabase/admin", () => ({
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
  appendAuditEvent: vi.fn().mockResolvedValue("audit-1"),
}));

vi.mock("@/lib/adminAuth", () => ({
  checkAdminAccess: vi.fn(async () => true),
  resolveAdminAccess: vi.fn(async () => ({ method: "pin" as const })),
}));

describe("GET /api/receipts/{id}/public — revocation regression", () => {
  const envBackup = { ...process.env };

  beforeEach(() => {
    vi.clearAllMocks();
    process.env = {
      ...envBackup,
      ABRAXAS_PUBLIC_KEY: JSON.stringify(TEST_KEY.publicKeyJwk),
      PARTNER_FLOW_RATE_LIMIT_ENABLED: "false",
    };
    resetPartnerFlowRateLimitStoreForTests();
    resetPartnerFlowUpstashStoreForTests();
    receiptRecord = buildSampleRecord();
    claimStatuses.clear();
    claimStatuses.set(CLAIM_ID, "active");
    installSupabaseMocks();
    rpcMock.mockReset();
  });

  afterEach(() => {
    process.env = envBackup;
  });

  it("issues valid receipt, partner accepts from public response only", async () => {
    const { res, body } = await fetchPublicReceipt(RECEIPT_ID);
    const partnerValidation = validatePartnerFlowPublicReceipt(body, {
      partnerId: PARTNER_ID,
      policyId: POLICY_ID,
      now: NOW,
    });

    expect(res.status).toBe(200);
    expect(res.headers.get("Cache-Control")).toBe("no-store, must-revalidate");
    expect(body.signature_valid).toBe(true);
    expect(body.currently_valid).toBe(true);
    expect(body.invalidation_reasons).toEqual([]);
    expect(partnerValidation.ok).toBe(true);
    expect(JSON.stringify(body)).not.toContain("reviewer");
    expect(JSON.stringify(body)).not.toContain("subject_id");
  });

  it("after linked claim revoke, public response is invalid and partner rejects synchronously", async () => {
    rpcMock.mockResolvedValueOnce({
      data: {
        ok: true,
        claim_id: CLAIM_ID,
        from_status: "active",
        to_status: "revoked",
        already_revoked: false,
        affected_receipt_ids: [RECEIPT_ID],
      },
      error: null,
    });

    const revokeReq = new NextRequest("http://localhost/api/admin/revocation", {
      method: "POST",
      headers: { "content-type": "application/json", "x-admin-pin": "test-pin" },
      body: JSON.stringify({
        target_type: "credential_claim",
        claim_id: CLAIM_ID,
        reason_code: "operator_security_review",
        idempotency_key: "route:claim-revoke",
      }),
    });
    const revokeRes = await adminRevocationPOST(revokeReq);
    expect(revokeRes.status).toBe(200);

    await vi.waitFor(() => {
      expect(decisionReceiptsInMock).toHaveBeenCalledWith("id", [RECEIPT_ID]);
    });

    claimStatuses.set(CLAIM_ID, "revoked");

    const { res, body } = await fetchPublicReceipt(RECEIPT_ID);
    const partnerValidation = validatePartnerFlowPublicReceipt(body, {
      partnerId: PARTNER_ID,
      policyId: POLICY_ID,
      now: NOW,
    });

    expect(res.status).toBe(200);
    expect(body.signature_valid).toBe(true);
    expect(body.currently_valid).toBe(false);
    expect(body.invalidation_reasons).toContain("claim_revoked");
    expect(body.validity).toBe("access_revoked");
    expect(partnerValidation.ok).toBe(false);
    expect(partnerValidation.errors).toContain("claim_revoked");
  });

  it("receipt-only revoke still invalidates public response", async () => {
    rpcMock.mockResolvedValueOnce({
      data: {
        ok: true,
        receipt_id: RECEIPT_ID,
        decision_id: receiptRecord.verification_decision_id,
        revoked_at: "2026-06-02T00:00:00.000Z",
        reason_code: "operator_security_review",
        already_revoked: false,
        claim_ids: [CLAIM_ID],
      },
      error: null,
    });

    const revokeReq = new NextRequest("http://localhost/api/admin/revocation", {
      method: "POST",
      headers: { "content-type": "application/json", "x-admin-pin": "test-pin" },
      body: JSON.stringify({
        target_type: "receipt",
        receipt_id: RECEIPT_ID,
        reason_code: "operator_security_review",
        idempotency_key: "route:receipt-revoke",
      }),
    });
    const revokeRes = await adminRevocationPOST(revokeReq);
    expect(revokeRes.status).toBe(200);

    receiptRecord = buildSampleRecord({
      status: "revoked",
      revoked_at: "2026-06-02T00:00:00.000Z",
    });

    const { res, body } = await fetchPublicReceipt(RECEIPT_ID);
    const partnerValidation = validatePartnerFlowPublicReceipt(body, {
      partnerId: PARTNER_ID,
      policyId: POLICY_ID,
      now: NOW,
    });

    expect(res.status).toBe(200);
    expect(body.currently_valid).toBe(false);
    expect(body.invalidation_reasons).toContain("receipt_revoked");
    expect(partnerValidation.ok).toBe(false);
  });

  it("concurrent duplicate receipt revokes are idempotent via atomic rpc", async () => {
    rpcMock.mockResolvedValue({
      data: {
        ok: true,
        receipt_id: RECEIPT_ID,
        decision_id: receiptRecord.verification_decision_id,
        revoked_at: "2026-06-02T00:00:00.000Z",
        reason_code: "operator_security_review",
        already_revoked: false,
        claim_ids: [CLAIM_ID],
      },
      error: null,
    });

    const body = JSON.stringify({
      target_type: "receipt",
      receipt_id: RECEIPT_ID,
      reason_code: "operator_security_review",
      idempotency_key: "route:concurrent-revoke",
    });

    const results = await Promise.all(
      Array.from({ length: 3 }, () =>
        adminRevocationPOST(new NextRequest("http://localhost/api/admin/revocation", {
          method: "POST",
          headers: { "content-type": "application/json", "x-admin-pin": "test-pin" },
          body,
        })),
      ),
    );

    for (const res of results) {
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.ok).toBe(true);
    }
    expect(rpcMock).toHaveBeenCalledTimes(3);
    expect(rpcMock).toHaveBeenCalledWith("revoke_decision_receipt_atomic", expect.objectContaining({
      p_idempotency_key: "route:concurrent-revoke",
    }));
  });
});
