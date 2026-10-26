import { beforeEach, describe, expect, it, vi } from "vitest";
import { generateTestSigningKeyPair, signReceiptPayload } from "@/lib/decisionReceipts/signing";
import { buildCanonicalPayload } from "@/lib/decisionReceipts/canonical";
import { subjectPseudonymId } from "@/lib/decisionReceipts/pseudonym";
import type { DecisionReceiptRecord } from "@/lib/decisionReceipts/types";
import { evaluateReceiptCurrentValidity } from "./evaluate";
import { operationalMatchesUnifiedContract } from "./operationalUnifiedParity";
import { resetReceiptSupersessionsForTests } from "@/lib/decisionReceipts/receiptSupersession";

const TEST_KEY = generateTestSigningKeyPair();

vi.mock("@/lib/supabase/admin", () => ({
  requireSupabaseAdmin: vi.fn(() => ({
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          maybeSingle: vi.fn(async () => ({ data: { status: "active" } })),
        })),
      })),
    })),
  })),
}));

vi.mock("@/lib/policy/getPolicy", () => ({
  getPartnerPolicyAtVersion: vi.fn(async () => ({
    id: "policy-1",
    partner_id: "partner-a",
    version: 1,
    status: "active",
    deprecate_effective_at: null,
  })),
}));

vi.mock("@/lib/decisionReceipts/receiptSupersession", async (importOriginal) => {
  const mod = await importOriginal<typeof import("@/lib/decisionReceipts/receiptSupersession")>();
  return { ...mod, isReceiptSuperseded: vi.fn(async () => ({ superseded: false })) };
});

vi.mock("@/lib/decisionReceipts/evidenceDependencies", async (importOriginal) => {
  const mod = await importOriginal<typeof import("@/lib/decisionReceipts/evidenceDependencies")>();
  return {
    ...mod,
    getReceiptEvidenceDependencies: vi.fn(async () => []),
    receiptRequiresEvidenceDependencyGraph: vi.fn(async () => false),
  };
});

vi.mock("@/lib/passport/reusableEligibility/invalidation", () => ({
  loadSourceReceiptRow: vi.fn(async () => null),
}));

vi.mock("@/lib/trust/credentialStatusRegistry", () => ({
  getClaimById: vi.fn(async (id: string) => ({
    id,
    status: "active",
    expires_at: null,
  })),
  resolveClaimStatusAtRead: vi.fn(({ status }: { status: string }) => status),
}));

vi.mock("@/lib/trust/issuerFramework", () => ({
  getIssuerById: vi.fn(async () => ({ issuer_status: "active" })),
  getIssuerSigningKey: vi.fn(async () => ({ status: "active" })),
  isIssuerTrustedForClaim: vi.fn(async () => ({ ok: true, reason: "trusted" })),
}));

function sampleRecord(overrides: Partial<DecisionReceiptRecord> = {}): DecisionReceiptRecord {
  const payload = buildCanonicalPayload({
    receipt_id: "dr_parity_835",
    decision_id: "00000000-0000-4000-8000-000000008835",
    policy_id: "partner-a-age-v1",
    policy_version: 1,
    partner_id: "partner-a",
    subject_pseudonym_id: subjectPseudonymId("0x835"),
    wallet_binding_ref: null,
    consent_receipt_id: null,
    decision_result: "approved",
    reason_codes: ["ok"],
    evaluated_claim_refs: [],
    issuer_refs: [],
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
    evaluated_claim_refs: [],
    issuer_refs: [],
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

describe("operational vs unified contract semantics (#835)", () => {
  beforeEach(() => {
    resetReceiptSupersessionsForTests();
    process.env.ABRAXAS_RECEIPT_VERIFICATION_REGISTRY = JSON.stringify([
      {
        key_id: TEST_KEY.signingKeyId,
        environment: "production",
        status: "active",
        public_jwk: TEST_KEY.publicKeyJwk,
        schema_versions: ["1.0.0"],
      },
    ]);
  });

  it("operational currently_valid matches deriveCurrentValidityDecision for active receipt", async () => {
    const record = sampleRecord();
    const result = await evaluateReceiptCurrentValidity({ record });
    expect(operationalMatchesUnifiedContract(result, record)).toBe(true);
  });

  it("operational currently_valid matches unified contract when revoked", async () => {
    const record = sampleRecord({ status: "revoked", revoked_at: "2026-06-02T00:00:00.000Z" });
    const result = await evaluateReceiptCurrentValidity({ record });
    expect(result.currently_valid).toBe(false);
    expect(operationalMatchesUnifiedContract(result, record)).toBe(true);
  });
});
