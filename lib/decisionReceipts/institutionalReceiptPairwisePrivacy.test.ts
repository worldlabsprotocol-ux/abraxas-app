// FILE: lib/decisionReceipts/institutionalReceiptPairwisePrivacy.test.ts
// Institutional receipt pairwise privacy closure — signed canonical + public projection.

import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { createHash } from "crypto";
import {
  claimsSubjectKeyForAbraxasSubject,
  generateAbraxasSubjectId,
} from "@/lib/identity/subject/claimsSubjectKey";
import {
  defaultPairwiseBoundary,
  pairwiseSubjectRef,
} from "@/lib/identity/pairwiseSubject/derive";
import { subjectPseudonymId } from "@/lib/decisionReceipts/pseudonym";
import {
  resolveReceiptSubjectPseudonym,
} from "@/lib/decisionReceipts/receiptSubjectPseudonym";
import { buildCanonicalPayload, hashCanonicalPayload } from "@/lib/decisionReceipts/canonical";
import {
  generateTestSigningKeyPair,
  signReceiptPayload,
  verifyReceiptSignature,
} from "@/lib/decisionReceipts/signing";
import { toPublicView, verifyRecordSignature } from "@/lib/decisionReceipts/views";
import { buildNarrowPartnerResultForReceipt } from "@/lib/partner/narrowPartnerResult/build";
import { hashProviderSubjectRef } from "@/lib/identity/providerIngestion/bindingStore";
import type { DecisionReceiptRecord } from "@/lib/decisionReceipts/types";

const TEST_KEY = generateTestSigningKeyPair();
const PARTNER_A = "partner-a";
const PARTNER_B = "partner-b";
const APP_A = "app-a-0001";
const APP_B = "app-b-0002";

const identitySubjects = new Map<string, Record<string, unknown>>();
let insertedReceipt: DecisionReceiptRecord | null = null;
let verificationDecisions: Record<string, { request_id: string | null; subject_id: string }> = {};
let verificationRequests: Record<string, { launchpad_application_id: string | null }> = {};

function seedIdentitySubject(abraxasSubjectId: string) {
  const claimsKey = claimsSubjectKeyForAbraxasSubject(abraxasSubjectId);
  const row = {
    id: abraxasSubjectId,
    subject_type: "individual",
    claims_subject_key: claimsKey,
    status: "active",
  };
  identitySubjects.set(abraxasSubjectId, row);
  identitySubjects.set(claimsKey, row);
  return { abraxasSubjectId, claimsKey };
}

function makeSelectChain(table: string) {
  const filters: Record<string, string> = {};
  const chain = {
    eq: (col: string, val: string) => {
      filters[col] = val;
      return chain;
    },
    is: () => chain,
    order: () => chain,
    limit: () => chain,
    in: () => chain,
    maybeSingle: async () => {
      if (table === "identity_subjects") {
        const lookup = filters.claims_subject_key ?? filters.id ?? "";
        return { data: identitySubjects.get(lookup) ?? null, error: null };
      }
      if (table === "verification_decisions") {
        const row = verificationDecisions[filters.id ?? ""];
        return row
          ? {
            data: {
              decision: "approved",
              claims_json: {},
              ...row,
            },
            error: null,
          }
          : { data: null, error: null };
      }
      if (table === "verification_requests") {
        return { data: verificationRequests[filters.id ?? ""] ?? null, error: null };
      }
      if (table === "decision_receipts") {
        return { data: insertedReceipt, error: null };
      }
      if (table === "wallet_bindings") {
        return { data: null, error: null };
      }
      return { data: null, error: null };
    },
    single: async () => chain.maybeSingle(),
  };
  return chain;
}

vi.mock("@/lib/supabase/admin", () => ({
  requireSupabaseAdmin: () => ({
    from: (table: string) => ({
      select: () => makeSelectChain(table),
      insert: (row: Record<string, unknown>) => {
        const p = (async () => {
          if (table === "decision_receipts") {
            insertedReceipt = row as unknown as DecisionReceiptRecord;
            return { data: insertedReceipt, error: null };
          }
          return { data: row, error: null };
        })();
        return Object.assign(p, { select: () => ({ single: () => p }) });
      },
    }),
    rpc: async () => ({ data: { ok: true }, error: null }),
  }),
}));

vi.mock("@/lib/decisionReceipts/verificationKeyLifecycle", () => ({
  resolveIssuanceSigningKey: () => ({
    ok: true,
    key_id: "test-key",
    privateKeyJwk: TEST_KEY.privateKeyJwk,
    publicKeyJwk: TEST_KEY.publicKeyJwk,
  }),
  verifyRecordSignatureWithRegistry: () => true,
}));

vi.mock("@/lib/decisionReceipts/dependencies", () => ({
  recordReceiptClaimDependencies: async () => {},
  getReceiptDependencies: async () => [],
}));

vi.mock("@/lib/decisionReceipts/evidenceDependencies", () => ({
  getReceiptEvidenceDependencies: async () => [],
}));

vi.mock("@/lib/verification/audit", () => ({
  appendAuditEvent: async () => {},
}));

describe("institutional receipt pairwise privacy", () => {
  beforeEach(() => {
    identitySubjects.clear();
    verificationDecisions = {};
    verificationRequests = {};
    insertedReceipt = null;
    process.env.PAIRWISE_SUBJECT_HMAC_KEY = "institutional-pairwise-test-key";
  });

  afterEach(() => {
    delete process.env.PAIRWISE_SUBJECT_HMAC_KEY;
  });

  it("uses pairwise pseudonym for institutional subjects in signed canonical payload v1.0.0", async () => {
    const { abraxasSubjectId, claimsKey } = seedIdentitySubject(generateAbraxasSubjectId());
    const decisionId = "00000000-0000-4000-8000-000000000001";
    verificationDecisions[decisionId] = { request_id: "req_1", subject_id: claimsKey };
    verificationRequests.req_1 = { launchpad_application_id: APP_A };

    const resolved = await resolveReceiptSubjectPseudonym({
      claimsSubjectKey: claimsKey,
      partnerId: PARTNER_A,
      applicationId: APP_A,
    });
    expect(resolved.ok).toBe(true);
    if (!resolved.ok) return;
    expect(resolved.institutional).toBe(true);
    expect(resolved.pseudonym).toMatch(/^psr_/);
    expect(resolved.pseudonym).not.toBe(subjectPseudonymId(claimsKey));

    const { issueDecisionReceipt } = await import("@/lib/decisionReceipts/service");
    const receipt = await issueDecisionReceipt({
      verificationDecisionId: decisionId,
      partnerId: PARTNER_A,
      policyId: `${PARTNER_A}-age_21_retail-v1`,
      policyVersion: 1,
      subjectId: claimsKey,
      applicationId: APP_A,
      decisionResult: "approved",
      reasonCodes: [],
      evaluatedClaimRefs: [],
    });
    expect(receipt.subject_pseudonym_id).toBe(resolved.pseudonym);
    expect(receipt.schema_version).toBe("1.0.0");
    expect(JSON.stringify(receipt)).not.toContain(abraxasSubjectId);
  });

  it("keeps legacy global pseudonym for non-institutional wallet subjects", async () => {
    const walletSubject = "0x" + "a".repeat(64);
    const resolved = await resolveReceiptSubjectPseudonym({
      claimsSubjectKey: walletSubject,
      partnerId: PARTNER_A,
      applicationId: APP_A,
    });
    expect(resolved.ok).toBe(true);
    if (!resolved.ok) return;
    expect(resolved.institutional).toBe(false);
    expect(resolved.pseudonym).toBe(subjectPseudonymId(walletSubject));
    expect(resolved.pseudonym).not.toMatch(/^psr_/);
  });

  it("cross-partner: same institutional subject yields different signed public pseudonyms", async () => {
    const { claimsKey } = seedIdentitySubject(generateAbraxasSubjectId());
    const pairwiseA = pairwiseSubjectRef({
      abraxasSubjectId: identitySubjects.get(claimsKey)!.id as string,
      boundary: defaultPairwiseBoundary(PARTNER_A, APP_A),
    });
    const pairwiseB = pairwiseSubjectRef({
      abraxasSubjectId: identitySubjects.get(claimsKey)!.id as string,
      boundary: defaultPairwiseBoundary(PARTNER_B, APP_A),
    });
    expect(pairwiseA.ok && pairwiseB.ok).toBe(true);
    if (!pairwiseA.ok || !pairwiseB.ok) return;
    expect(pairwiseA.ref).not.toBe(pairwiseB.ref);

    const makeReceipt = (partnerId: string, pseudonym: string): DecisionReceiptRecord => {
      const payload = buildCanonicalPayload({
        receipt_id: `dr_${partnerId}`,
        decision_id: `dec_${partnerId}`,
        policy_id: "policy-v1",
        policy_version: 1,
        partner_id: partnerId,
        subject_pseudonym_id: pseudonym,
        wallet_binding_ref: null,
        consent_receipt_id: null,
        decision_result: "approved",
        reason_codes: [],
        evaluated_claim_refs: [],
        issuer_refs: [],
        decision_context: "production",
        evaluated_at: new Date().toISOString(),
        expires_at: null,
      });
      const { payloadHash, signature } = signReceiptPayload(payload, TEST_KEY.privateKeyJwk);
      return {
        id: payload.receipt_id,
        verification_decision_id: payload.decision_id,
        consent_receipt_id: null,
        partner_id: partnerId,
        policy_id: payload.policy_id,
        policy_version: 1,
        subject_pseudonym_id: pseudonym,
        wallet_binding_ref: null,
        decision_result: "approved",
        reason_codes: [],
        evaluated_claim_refs: [],
        issuer_refs: [],
        decision_context: "production",
        evaluated_at: payload.evaluated_at,
        expires_at: null,
        revoked_at: null,
        status: "active",
        schema_version: "1.0.0",
        payload_hash: payloadHash,
        signature,
        signing_key_id: TEST_KEY.signingKeyId,
        anchor_reference: null,
        idempotency_key: null,
        created_at: payload.evaluated_at,
      };
    };

    const publicA = toPublicView(makeReceipt(PARTNER_A, pairwiseA.ref));
    const publicB = toPublicView(makeReceipt(PARTNER_B, pairwiseB.ref));
    expect(publicA.subject_pseudonym_id).not.toBe(publicB.subject_pseudonym_id);
    expect(publicA.subject_pseudonym_id).toBe(pairwiseA.ref);
    expect(publicB.subject_pseudonym_id).toBe(pairwiseB.ref);
  });

  it("cross-application: same partner yields different pseudonyms per application", async () => {
    const abraxasSubjectId = generateAbraxasSubjectId();
    const appA = pairwiseSubjectRef({
      abraxasSubjectId,
      boundary: defaultPairwiseBoundary(PARTNER_A, APP_A),
    });
    const appB = pairwiseSubjectRef({
      abraxasSubjectId,
      boundary: defaultPairwiseBoundary(PARTNER_A, APP_B),
    });
    expect(appA.ok && appB.ok).toBe(true);
    if (!appA.ok || !appB.ok) return;
    expect(appA.ref).not.toBe(appB.ref);
  });

  it("same-app stability: identical inputs produce identical pairwise pseudonym", async () => {
    const abraxasSubjectId = generateAbraxasSubjectId();
    const first = pairwiseSubjectRef({
      abraxasSubjectId,
      boundary: defaultPairwiseBoundary(PARTNER_A, APP_A),
    });
    const second = pairwiseSubjectRef({
      abraxasSubjectId,
      boundary: defaultPairwiseBoundary(PARTNER_A, APP_A),
    });
    expect(first.ok && second.ok).toBe(true);
    if (!first.ok || !second.ok) return;
    expect(first.ref).toBe(second.ref);
  });

  it("narrow pairwise_subject_ref equals signed receipt subject_pseudonym_id for institutional receipts", async () => {
    const { claimsKey } = seedIdentitySubject(generateAbraxasSubjectId());
    const decisionId = "00000000-0000-4000-8000-000000000002";
    verificationDecisions[decisionId] = { request_id: "req_2", subject_id: claimsKey };
    verificationRequests.req_2 = { launchpad_application_id: APP_A };

    const { issueDecisionReceipt } = await import("@/lib/decisionReceipts/service");
    const receipt = await issueDecisionReceipt({
      verificationDecisionId: decisionId,
      partnerId: PARTNER_A,
      policyId: `${PARTNER_A}-age_21_retail-v1`,
      policyVersion: 1,
      subjectId: claimsKey,
      applicationId: APP_A,
      decisionResult: "approved",
      reasonCodes: [],
      evaluatedClaimRefs: [],
    });
    insertedReceipt = receipt;

    const narrow = await buildNarrowPartnerResultForReceipt(receipt.id);
    expect(narrow?.pairwise_subject_ref).toBe(receipt.subject_pseudonym_id);
    expect(receipt.subject_pseudonym_id).toMatch(/^psr_/);
  });

  it("public receipt faithfully exposes signed pairwise value without post-sign replacement", async () => {
    const { claimsKey } = seedIdentitySubject(generateAbraxasSubjectId());
    const decisionId = "00000000-0000-4000-8000-000000000003";
    verificationDecisions[decisionId] = { request_id: "req_3", subject_id: claimsKey };
    verificationRequests.req_3 = { launchpad_application_id: APP_A };

    const { issueDecisionReceipt } = await import("@/lib/decisionReceipts/service");
    const receipt = await issueDecisionReceipt({
      verificationDecisionId: decisionId,
      partnerId: PARTNER_A,
      policyId: `${PARTNER_A}-age_21_retail-v1`,
      policyVersion: 1,
      subjectId: claimsKey,
      applicationId: APP_A,
      decisionResult: "approved",
      reasonCodes: [],
      evaluatedClaimRefs: [],
    });

    const publicView = toPublicView(receipt);
    expect(publicView.subject_pseudonym_id).toBe(receipt.subject_pseudonym_id);
    expect(verifyRecordSignature(receipt)).toBe(true);
  });

  it("tampering pairwise pseudonym invalidates signature", () => {
    const pseudonym = "psr_" + "b".repeat(32);
    const payload = buildCanonicalPayload({
      receipt_id: "dr_tamper",
      decision_id: "dec_tamper",
      policy_id: "policy-v1",
      policy_version: 1,
      partner_id: PARTNER_A,
      subject_pseudonym_id: pseudonym,
      wallet_binding_ref: null,
      consent_receipt_id: null,
      decision_result: "approved",
      reason_codes: [],
      evaluated_claim_refs: [],
      issuer_refs: [],
      decision_context: "production",
      evaluated_at: new Date().toISOString(),
      expires_at: null,
    });
    const { signature } = signReceiptPayload(payload, TEST_KEY.privateKeyJwk);
    const tampered = { ...payload, subject_pseudonym_id: "psr_" + "c".repeat(32) };
    expect(verifyReceiptSignature(tampered, signature, TEST_KEY.publicKeyJwk)).toBe(false);
    expect(hashCanonicalPayload(payload)).not.toBe(hashCanonicalPayload(tampered));
  });

  it("cross-partner pseudonym substitution invalidates signature", () => {
    const abraxasSubjectId = generateAbraxasSubjectId();
    const a = pairwiseSubjectRef({
      abraxasSubjectId,
      boundary: defaultPairwiseBoundary(PARTNER_A, APP_A),
    });
    const b = pairwiseSubjectRef({
      abraxasSubjectId,
      boundary: defaultPairwiseBoundary(PARTNER_B, APP_A),
    });
    expect(a.ok && b.ok).toBe(true);
    if (!a.ok || !b.ok) return;

    const payload = buildCanonicalPayload({
      receipt_id: "dr_sub",
      decision_id: "dec_sub",
      policy_id: "policy-v1",
      policy_version: 1,
      partner_id: PARTNER_A,
      subject_pseudonym_id: a.ref,
      wallet_binding_ref: null,
      consent_receipt_id: null,
      decision_result: "approved",
      reason_codes: [],
      evaluated_claim_refs: [],
      issuer_refs: [],
      decision_context: "production",
      evaluated_at: new Date().toISOString(),
      expires_at: null,
    });
    const { signature } = signReceiptPayload(payload, TEST_KEY.privateKeyJwk);
    const substituted = { ...payload, subject_pseudonym_id: b.ref };
    expect(verifyReceiptSignature(substituted, signature, TEST_KEY.publicKeyJwk)).toBe(false);
  });

  it("historical global-pseudonym receipt still verifies", () => {
    const walletSubject = "0x" + "d".repeat(64);
    const globalPseudo = subjectPseudonymId(walletSubject);
    const payload = buildCanonicalPayload({
      receipt_id: "dr_legacy",
      decision_id: "dec_legacy",
      policy_id: "abraxas-booking-v1",
      policy_version: 1,
      partner_id: "abraxas",
      subject_pseudonym_id: globalPseudo,
      wallet_binding_ref: null,
      consent_receipt_id: null,
      decision_result: "approved",
      reason_codes: [],
      evaluated_claim_refs: [],
      issuer_refs: [],
      decision_context: "production",
      evaluated_at: "2026-01-01T00:00:00.000Z",
      expires_at: null,
    });
    const { signature } = signReceiptPayload(payload, TEST_KEY.privateKeyJwk);
    expect(verifyReceiptSignature(payload, signature, TEST_KEY.publicKeyJwk)).toBe(true);
    expect(payload.schema_version).toBe("1.0.0");
  });

  it("fails closed when pairwise key missing for institutional subject in production", async () => {
    delete process.env.PAIRWISE_SUBJECT_HMAC_KEY;
    delete process.env.PAIRWISE_SUBJECT_HMAC_KEY_TEST;
    const prevNode = process.env.NODE_ENV;
    process.env.NODE_ENV = "production";
    delete process.env.VERCEL_ENV;

    const { claimsKey } = seedIdentitySubject(generateAbraxasSubjectId());
    const result = await resolveReceiptSubjectPseudonym({
      claimsSubjectKey: claimsKey,
      partnerId: PARTNER_A,
      applicationId: APP_A,
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe("pairwise_key_missing");

    const decisionId = "00000000-0000-4000-8000-000000000004";
    verificationDecisions[decisionId] = { request_id: null, subject_id: claimsKey };
    const { issueDecisionReceipt } = await import("@/lib/decisionReceipts/service");
    await expect(issueDecisionReceipt({
      verificationDecisionId: decisionId,
      partnerId: PARTNER_A,
      policyId: "policy-v1",
      policyVersion: 1,
      subjectId: claimsKey,
      applicationId: APP_A,
      decisionResult: "approved",
      reasonCodes: [],
      evaluatedClaimRefs: [],
    })).rejects.toThrow("pairwise_key_missing");

    process.env.NODE_ENV = prevNode;
  });

  it("global identifier scan: institutional public receipt exposes only pairwise subject ref", async () => {
    const { abraxasSubjectId, claimsKey } = seedIdentitySubject(generateAbraxasSubjectId());
    const providerRef = "provider-subject-secret";
    const providerHash = hashProviderSubjectRef("mock-provider", providerRef);
    const decisionId = "00000000-0000-4000-8000-000000000005";
    verificationDecisions[decisionId] = { request_id: "req_5", subject_id: claimsKey };
    verificationRequests.req_5 = { launchpad_application_id: APP_A };

    const { issueDecisionReceipt } = await import("@/lib/decisionReceipts/service");
    const receipt = await issueDecisionReceipt({
      verificationDecisionId: decisionId,
      partnerId: PARTNER_A,
      policyId: `${PARTNER_A}-age_21_retail-v1`,
      policyVersion: 1,
      subjectId: claimsKey,
      applicationId: APP_A,
      decisionResult: "approved",
      reasonCodes: [],
      evaluatedClaimRefs: [],
    });
    const publicJson = JSON.stringify(toPublicView(receipt));
    const forbidden = [
      abraxasSubjectId,
      claimsKey,
      providerRef,
      providerHash,
      subjectPseudonymId(claimsKey),
    ];
    for (const value of forbidden) {
      expect(publicJson).not.toContain(value);
    }
    expect(receipt.subject_pseudonym_id).toMatch(/^psr_/);
  });

  it("reuse internal fact key remains global pseudonym, not pairwise receipt pseudonym", async () => {
    const { projectInternalFact } = await import("@/lib/passport/reusableEligibility/facts");
    const { claimsKey } = seedIdentitySubject(generateAbraxasSubjectId());
    const pairwise = await resolveReceiptSubjectPseudonym({
      claimsSubjectKey: claimsKey,
      partnerId: PARTNER_A,
      applicationId: APP_A,
    });
    expect(pairwise.ok).toBe(true);
    if (!pairwise.ok) return;

    const fact = projectInternalFact({
      subjectId: claimsKey,
      receipt: {
        id: "dr_reuse",
        verification_decision_id: "dec_reuse",
        partner_id: PARTNER_A,
        policy_id: `${PARTNER_A}-age_21_retail-v1`,
        policy_version: 1,
        subject_pseudonym_id: pairwise.pseudonym,
        decision_result: "approved",
        decision_context: "production",
        evaluated_at: new Date().toISOString(),
        expires_at: null,
        revoked_at: null,
        status: "active",
      },
    });
    expect(fact).toBeTruthy();
    expect(fact!.subject_pseudonym_id).toBe(subjectPseudonymId(claimsKey));
    expect(fact!.subject_pseudonym_id).not.toBe(pairwise.pseudonym);
  });
});
