import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { AbraxasPartnerKit } from "@/lib/partner/integrationKit/client";
import { buildCanonicalPayload } from "@/lib/decisionReceipts/canonical";
import {
  generateTestSigningKeyPair,
  signReceiptPayload,
} from "@/lib/decisionReceipts/signing";
import { subjectPseudonymId } from "@/lib/decisionReceipts/pseudonym";
import { evaluateDecisionReceiptTrust } from "@/lib/decisionReceipts/trustEvaluation";
import type { DecisionReceiptRecord } from "@/lib/decisionReceipts/types";
import { CANONICAL_SANDBOX_ONLY_INVALIDATION_REASON } from "@/lib/partner/sandboxReceiptTrustContract";

const TEST_KEY = generateTestSigningKeyPair();
const PARTNER_ID = "ref-wc-postrev-5ffe";
const POLICY_ID = "ref-wc-postrev-5ffe-wallet_control-v1";
const BINDING_ID = "35eb28a5-4fb3-45fc-8321-b31ea75950d5";
const CLAIM_ID = "71ba9186-62ee-4744-ba0f-78ea88432f50";
const SUBJECT = "0xaba749c2c8992f3914cec877af2bede04f18078175db33513e4bee8e2bd695a9";

const fromMock = vi.fn();

vi.mock("@/lib/trust/issuerFramework", () => ({
  getIssuerById: vi.fn(async () => ({ issuer_status: "active" })),
  getIssuerSigningKey: vi.fn(async () => ({ status: "active" })),
  isIssuerTrustedForClaim: vi.fn(async () => ({ ok: true, reason: "" })),
}));

vi.mock("@/lib/supabase/admin", () => ({
  requireSupabaseAdmin: () => ({ from: fromMock }),
  getSupabaseAdmin: () => ({ from: fromMock }),
}));

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

function chain(resolved: unknown) {
  const builder = {
    select: vi.fn(() => builder),
    eq: vi.fn(() => builder),
    in: vi.fn(() => builder),
    is: vi.fn(() => builder),
    order: vi.fn(() => builder),
    limit: vi.fn(() => builder),
    maybeSingle: vi.fn(async () => resolved),
    single: vi.fn(async () => resolved),
    update: vi.fn(() => ({
      eq: vi.fn(() => ({
        eq: vi.fn(() => ({
          select: vi.fn(() => ({
            maybeSingle: vi.fn(async () => resolved),
          })),
        })),
        select: vi.fn(() => ({
          maybeSingle: vi.fn(async () => resolved),
        })),
      })),
    })),
  };
  return builder;
}

function sandboxWalletReceiptRecord(): DecisionReceiptRecord {
  const payload = buildCanonicalPayload({
    receipt_id: "dr_CWMq7G-2iLwVSa0u",
    decision_id: "d84bdad0-0e40-49c9-a6f8-807f2fa6cfe6",
    policy_id: POLICY_ID,
    policy_version: 1,
    partner_id: PARTNER_ID,
    subject_pseudonym_id: subjectPseudonymId(SUBJECT),
    wallet_binding_ref: null,
    consent_receipt_id: null,
    decision_result: "approved",
    reason_codes: [],
    evaluated_claim_refs: [{
      claim_id: CLAIM_ID,
      claim_type: "wallet_binding_confirmed",
      issuer_id: "issuer:abraxas",
      status: "active",
      issued_at: "2026-08-06T13:34:03.536Z",
      expires_at: null,
    }],
    issuer_refs: ["issuer:abraxas"],
    decision_context: "sandbox_only",
    evaluated_at: "2026-10-06T13:46:10.085Z",
    expires_at: "2026-10-07T01:46:09.307Z",
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
    decision_result: payload.decision_result,
    reason_codes: [],
    evaluated_claim_refs: payload.evaluated_claim_refs,
    issuer_refs: payload.issuer_refs,
    decision_context: payload.decision_context,
    evaluated_at: payload.evaluated_at,
    expires_at: payload.expires_at,
    revoked_at: null,
    status: "active",
    schema_version: payload.schema_version,
    payload_hash: payloadHash,
    signature,
    signing_key_id: TEST_KEY.signingKeyId,
    anchor_reference: null,
    idempotency_key: payload.decision_id,
    created_at: payload.evaluated_at,
  };
}

function walletBindingsTable(binding: Record<string, unknown>) {
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

function claimRow(overrides: Record<string, unknown> = {}) {
  return {
    id: CLAIM_ID,
    subject_id: SUBJECT,
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
    evidence_reference: null,
    ...overrides,
  };
}

function installRevokedBindingTables(claimStatus: "active" | "revoked" = "active") {
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
    if (table === "credential_claims") {
      return chain({ data: claimRow({ status: claimStatus }) });
    }
    if (table === "wallet_bindings") {
      return walletBindingsTable(binding);
    }
    if (table === "receipt_claim_dependencies") {
      return {
        select: () => ({
          eq: () => ({
            order: () => Promise.resolve({ data: [], error: null }),
          }),
        }),
      };
    }
    if (table === "decision_receipt_evidence_dependencies") {
      return {
        select: () => ({
          eq: () => Promise.resolve({ data: [], error: null }),
        }),
      };
    }
    return chain({ data: null });
  });
}

describe("wallet control revocation fail-closed", () => {
  beforeEach(() => {
    process.env.ABRAXAS_PUBLIC_KEY = JSON.stringify(TEST_KEY.publicKeyJwk);
    fromMock.mockReset();
  });

  afterEach(() => {
    delete process.env.ABRAXAS_PUBLIC_KEY;
  });

  it("denies sandbox trust evaluation when binding revoked but claim active", async () => {
    installRevokedBindingTables("active");
    const record = sandboxWalletReceiptRecord();
    const trust = await evaluateDecisionReceiptTrust(record, {
      partnerId: PARTNER_ID,
      policyId: POLICY_ID,
      allowSandbox: true,
    });
    expect(trust.signature_valid).toBe(true);
    expect(trust.currently_valid).toBe(false);
    expect(trust.invalidation_reasons).toContain("source_evidence_revoked");
  });

  it("preserves historical signature while failing current authorization", async () => {
    installRevokedBindingTables("active");
    const record = sandboxWalletReceiptRecord();
    expect(record.signature).toBeTruthy();
    const trust = await evaluateDecisionReceiptTrust(record, {
      partnerId: PARTNER_ID,
      policyId: POLICY_ID,
      allowSandbox: true,
    });
    expect(trust.signature_valid).toBe(true);
    expect(trust.currently_valid).toBe(false);
  });

  it("still permits healthy sandbox receipt when binding active", async () => {
    const binding = {
      id: BINDING_ID,
      subject_id: SUBJECT,
      binding_status: "active",
      revoked_at: null,
      verified_at: "2026-08-06T13:34:03.434Z",
      binding_method: "signed_challenge",
    };
    fromMock.mockImplementation((table: string) => {
      if (table === "audit_events") return auditEventsChain();
      if (table === "credential_claims") {
        return chain({
          data: claimRow({
            claim_value: {
              wallet_binding_id: BINDING_ID,
              chain: "sui",
              binding_method: "signed_challenge",
              challenge_id: "60a39a6a50f7567afff83f96a29a9605",
              proof_signature: "sig",
            },
            evidence_reference: `wb:${BINDING_ID}`,
          }),
        });
      }
      if (table === "wallet_bindings") {
        return walletBindingsTable(binding);
      }
      if (table === "receipt_claim_dependencies") {
        return {
          select: () => ({
            eq: () => ({
              order: () => Promise.resolve({ data: [], error: null }),
            }),
          }),
        };
      }
      if (table === "decision_receipt_evidence_dependencies") {
        return {
          select: () => ({
            eq: () => Promise.resolve({ data: [], error: null }),
          }),
        };
      }
      return chain({ data: null });
    });

    const record = sandboxWalletReceiptRecord();
    const trust = await evaluateDecisionReceiptTrust(record, {
      partnerId: PARTNER_ID,
      policyId: POLICY_ID,
      allowSandbox: true,
    });
    expect(trust.currently_valid).toBe(true);
    expect(trust.invalidation_reasons).toContain(CANONICAL_SANDBOX_ONLY_INVALIDATION_REASON);
  });

  it("denies receipt depending on repair-minted post-revocation claim", async () => {
    const binding = {
      id: BINDING_ID,
      subject_id: SUBJECT,
      binding_status: "active",
      revoked_at: null,
      verified_at: "2026-10-06T17:57:27.377892+00",
      binding_method: "zklogin",
    };
    fromMock.mockImplementation((table: string) => {
      if (table === "audit_events") {
        return auditEventsChain("2026-10-06T15:09:04.347Z");
      }
      if (table === "credential_claims") {
        return chain({
          data: {
            id: CLAIM_ID,
            subject_id: SUBJECT,
            claim_type: "wallet_binding_confirmed",
            claim_value: {
              chain: "sui",
              binding_method: "zklogin",
              control_method: "zklogin",
              wallet_binding_id: BINDING_ID,
            },
            issuer_id: "issuer:abraxas",
            assurance_level: "L2",
            issued_at: "2026-10-06T17:57:27.377892+00",
            expires_at: "2026-10-07T05:57:27.377892+00",
            status: "active",
            evidence_reference: `wb:${BINDING_ID}`,
          },
        });
      }
      if (table === "wallet_bindings") {
        return walletBindingsTable(binding);
      }
      if (table === "receipt_claim_dependencies") {
        return {
          select: () => ({
            eq: () => ({
              order: () => Promise.resolve({ data: [], error: null }),
            }),
          }),
        };
      }
      if (table === "decision_receipt_evidence_dependencies") {
        return {
          select: () => ({
            eq: () => Promise.resolve({ data: [], error: null }),
          }),
        };
      }
      return chain({ data: null });
    });

    const record = sandboxWalletReceiptRecord();
    const trust = await evaluateDecisionReceiptTrust(record, {
      partnerId: PARTNER_ID,
      policyId: POLICY_ID,
      allowSandbox: true,
    });
    expect(trust.signature_valid).toBe(true);
    expect(trust.currently_valid).toBe(false);
    expect(trust.invalidation_reasons).toContain("wallet_control_provenance_insufficient");
  });

  it("PartnerKit denies fetched receipt when public validity includes revoked evidence", async () => {
    const kit = new AbraxasPartnerKit({
      partnerId: PARTNER_ID,
      policyId: POLICY_ID,
      policyVersion: 1,
      environment: "sandbox",
      bindingId: "primary:8d30e3b1-3409-4bef-8d04-66335f38e96e",
      policyPackId: "wallet_control",
      resultFamily: "wallet_control_confirmed",
      fetchFn: async () => new Response(JSON.stringify({
        receipt_id: "dr_CWMq7G-2iLwVSa0u",
        schema_version: "1.0.0",
        partner_id: PARTNER_ID,
        policy_id: POLICY_ID,
        policy_version: 1,
        decision_result: "approved",
        signature_valid: true,
        expires_at: "2026-10-07T01:46:09.307Z",
        status: "active",
        production_usable: false,
        decision_context: "sandbox_only",
        currently_valid: false,
        lifecycle_status: "invalidated",
        partner_safe_reason: "evidence_refresh_required",
        invalidation_reasons: ["source_evidence_revoked"],
        evaluated_claim_refs: [{
          claim_id: CLAIM_ID,
          claim_type: "wallet_binding_confirmed",
          issuer_id: "issuer:abraxas",
          status: "active",
          issued_at: "2026-08-06T13:34:03.536Z",
          expires_at: null,
        }],
      }), { status: 200 }),
    });

    const result = await kit.verifyForAction({ receiptId: "dr_CWMq7G-2iLwVSa0u" });
    expect(result.action).toBe("deny");
    expect(result.outcome).not.toBe("permitted");
  });
});
