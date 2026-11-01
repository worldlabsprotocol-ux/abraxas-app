import { beforeEach, describe, expect, it, vi } from "vitest";

const query = vi.hoisted(() => vi.fn());
const transaction = vi.hoisted(() => vi.fn());
const issue = vi.hoisted(() => vi.fn());
const sourceReceipt = vi.hoisted(() => vi.fn());
const sourceValidity = vi.hoisted(() => vi.fn());
const qualification = vi.hoisted(() => vi.fn());
const compatibleFact = vi.hoisted(() => vi.fn());
const derivation = vi.hoisted(() => vi.fn());
const evidenceGraph = vi.hoisted(() => vi.fn());
const finalize = vi.hoisted(() => vi.fn());
const legacy = vi.hoisted(() => vi.fn(() => { throw new Error("legacy_store_used"); }));

vi.mock("@/lib/persistence/env", () => ({ persistenceUsesDirectPostgres: () => true }));
vi.mock("@mysten/sui/utils", () => ({ normalizeSuiAddress: (value: string) => value }));
vi.mock("@/lib/persistence/pgPool", () => ({
  queryAbraxasPg: query,
  withAbraxasPgTransaction: transaction,
}));
vi.mock("@/lib/supabase/admin", () => ({ requireSupabaseAdmin: legacy }));
vi.mock("@/lib/policy/evaluateSubjectPolicy", () => ({
  evaluatePolicyForSubject: async () => ({
    policy: { id: "sandbox-age", partner_id: "partner-a", version: 2, status: "active" },
    evaluation: { decision: "approved", claims: { age_eligible_21: true },
      reason_codes: [], valid_until: null, matched_claim_ids: [] },
    claims: [],
  }),
}));
vi.mock("@/lib/policy/changeControl/issuance", () => ({ assertPolicyVersionIssuable: vi.fn() }));
vi.mock("@/lib/partner/requirePartnerMethodQualification", () => ({ requireQualifiedPartnerMethod: qualification }));
vi.mock("@/lib/decisionReceipts/service", () => ({ issueReceiptForDecision: issue, getReceiptById: sourceReceipt }));
vi.mock("@/lib/decisionReceipts/currentValidity/evaluate", () => ({ evaluateReceiptCurrentValidity: sourceValidity }));
vi.mock("@/lib/passport/reusableEligibility/qualify", () => ({ resolveCompatibleReusableFact: compatibleFact }));
vi.mock("@/lib/passport/reusableEligibility/store", () => ({ recordDerivation: derivation }));
vi.mock("@/lib/decisionReceipts/evidenceDependencies", () => ({ recordReceiptEvidenceDependencies: evidenceGraph }));
vi.mock("@/lib/decisionReceipts/v1_1_0/finalizePending.server", () => ({ finalizePendingV11ReceiptCryptographic: finalize }));
vi.mock("@/lib/decisionReceipts/v1_1_0/authoritativeIssuance.server", () => ({
  resolveAuthoritativeApplicationIdForIssuance: async () => ({
    applicationId: request.launchpad_application_id, applicationScopeRequired: true,
  }),
}));
vi.mock("@/lib/verification/audit", () => ({ appendAuditEvent: vi.fn(async () => "audit-id") }));
vi.mock("@/lib/partner/partnerFlowAudit", () => ({
  auditPartnerFlowStepBestEffort: vi.fn(), flowTraceIdFromVerificationRequest: () => "trace",
}));

import { consentAndDecide } from "./requestsService";

const subjectId = `abx_hs_${"a".repeat(32)}`;
const request = {
  id: "00000000-0000-4000-8000-000000000001", partner_id: "partner-a",
  policy_id: "sandbox-age", policy_version: 2, subject_id: subjectId,
  sui_address: null, launchpad_application_id: "00000000-0000-4000-8000-000000000002",
  status: "pending", expires_at: new Date(Date.now() + 60_000).toISOString(),
  requested_action: "age_check",
};

describe("sovereign consent and receipt transaction", () => {
  beforeEach(() => {
    query.mockReset(); transaction.mockReset(); issue.mockReset(); legacy.mockClear();
    qualification.mockReset(); compatibleFact.mockReset(); sourceReceipt.mockReset();
    sourceValidity.mockReset(); derivation.mockReset(); evidenceGraph.mockReset(); finalize.mockReset();
    query.mockImplementation(async (sql: string) => ({ rows: sql.includes("partner_launchpad_applications")
      ? [{ partner_id: request.partner_id, policy_id: request.policy_id,
        policy_version: 2, status: "active" }]
      : [request] }));
    transaction.mockImplementation(async (fn: (client: { query: typeof query }) => Promise<unknown>) => fn({
      query: vi.fn(async (sql: string) => ({ rows: sql.includes("for update") ? [request]
        : sql.includes("consent_receipts") ? [{ id: "consent-id" }]
        : sql.includes("verification_decisions") ? [{ id: "decision-id" }] : [] })),
    }));
    issue.mockResolvedValue({ id: "dr_signed" });
    derivation.mockResolvedValue(undefined);
    evidenceGraph.mockResolvedValue({ ok: true });
    finalize.mockResolvedValue({ id: "dr_signed", status: "active" });
  });

  it("binds the signed receipt to the pinned request and transaction", async () => {
    const result = await consentAndDecide({ requestId: request.id, subjectId });
    expect(result).toMatchObject({ decision_id: "decision-id", receipt_id: "dr_signed" });
    expect(issue).toHaveBeenCalledWith(expect.objectContaining({
      decisionId: "decision-id", consentReceiptId: "consent-id",
      partnerId: request.partner_id, policyVersion: 2,
      applicationId: request.launchpad_application_id,
    }), expect.objectContaining({ query: expect.any(Function) }));
    expect(legacy.mock.calls.length).toBe(0);
  });

  it("rejects a changed tenant binding before consent or receipt issuance", async () => {
    transaction.mockImplementation(async (fn: (client: { query: typeof query }) => Promise<unknown>) => fn({
      query: vi.fn(async () => ({ rows: [{ ...request, partner_id: "partner-b" }] })),
    }));
    await expect(consentAndDecide({ requestId: request.id, subjectId }))
      .rejects.toThrow("request_binding_changed");
    expect(issue.mock.calls.length).toBe(0);
  });

  it("requires a persisted signed receipt before transaction completion", async () => {
    issue.mockResolvedValue(null);
    await expect(consentAndDecide({ requestId: request.id, subjectId }))
      .rejects.toThrow("receipt_persistence_unavailable");
    expect(legacy.mock.calls.length).toBe(0);
  });

  const fact = {
    fact_id: "fact_source", source_receipt_id: "dr_source",
    source_decision_id: "00000000-0000-4000-8000-000000000003",
    subject_pseudonym_id: "internal_pseudonym", source_policy_id: "sandbox-age",
    decision_context: "sandbox_only", expires_at: new Date(Date.now() + 60_000).toISOString(),
    issued_at: new Date().toISOString(), status: "active", pack_id: "age_21",
  };

  function qualifyReuse() {
    qualification.mockResolvedValue({ ok: true, record: { methodId: "reuse_existing_proof", policyVersion: 2 } });
    compatibleFact.mockResolvedValue({ ok: true, fact });
    sourceReceipt.mockResolvedValue({ id: fact.source_receipt_id,
      verification_decision_id: fact.source_decision_id, partner_id: "source-partner",
      policy_id: fact.source_policy_id, decision_context: "sandbox_only" });
    sourceValidity.mockResolvedValue({ currently_valid: true });
    query.mockImplementation(async (sql: string) => ({ rows: sql.includes("partner_launchpad_applications")
      ? [{ partner_id: request.partner_id, policy_id: request.policy_id,
        policy_version: 2, status: "active" }] : [request] }));
  }

  it("finalizes reused evidence inside the same consent transaction", async () => {
    qualifyReuse();
    const client = { query: vi.fn(async (sql: string) => ({ rows:
      sql.includes("for update") ? [request]
        : sql.includes("for share of r, d, c") ? [{
          status: "active", revoked_at: null, expires_at: fact.expires_at,
          decision_status: "active", consent_revoked_at: null,
          verification_decision_id: fact.source_decision_id,
          policy_id: fact.source_policy_id, decision_context: fact.decision_context,
        }] : sql.includes("consent_receipts") ? [{ id: "consent-id" }]
          : sql.includes("verification_decisions") ? [{ id: "decision-id" }] : [] })) };
    transaction.mockImplementation(async (fn: (client: typeof client) => Promise<unknown>) => fn(client));
    const result = await consentAndDecide({ requestId: request.id, subjectId, request: {} as never });
    expect(result).toMatchObject({ receipt_id: "dr_signed" });
    expect(issue).toHaveBeenCalledWith(expect.objectContaining({ pendingEvidenceFinalization: true }), client);
    expect(derivation).toHaveBeenCalledWith(expect.objectContaining({ fact }), client);
    expect(evidenceGraph).toHaveBeenCalledWith(expect.objectContaining({ receiptId: "dr_signed" }), client);
    expect(finalize).toHaveBeenCalledWith(expect.objectContaining({ receiptId: "dr_signed", transaction: client }));
    expect(legacy).not.toHaveBeenCalled();
  });

  it("rejects a withdrawn source before consent is persisted", async () => {
    qualifyReuse();
    sourceValidity.mockResolvedValue({ currently_valid: false });
    await expect(consentAndDecide({ requestId: request.id, subjectId, request: {} as never }))
      .rejects.toThrow("reusable_source_not_current");
    expect(transaction).not.toHaveBeenCalled();
    expect(issue).not.toHaveBeenCalled();
  });
});
