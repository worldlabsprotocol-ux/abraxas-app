// FILE: lib/operations/institutionalIdentityAdversarial/serviceGraph.integration.test.ts
// Full institutional service call graph — real Abraxas modules, DB boundary mocked only.

import { describe, expect, it, vi, beforeEach } from "vitest";
import { createHmac } from "crypto";
import {
  buildMockVerificationCompletedEvent,
  signMockProviderEvent,
  MOCK_APPROVED_KYC_PROVIDER_ID,
} from "@/lib/identity/providerIngestion/mockProvider";
import { claimsSubjectKeyForAbraxasSubject, generateAbraxasSubjectId } from "@/lib/identity/subject/claimsSubjectKey";
import { hashProviderSubjectRef } from "@/lib/identity/providerIngestion/bindingStore";
import { evaluatePolicyForSubject } from "@/lib/policy/evaluateSubjectPolicy";
import { issueReceiptForDecision } from "@/lib/decisionReceipts/service";
import { buildCanonicalPayload, hashCanonicalPayload } from "@/lib/decisionReceipts/canonical";
import { generateTestSigningKeyPair, signReceiptPayload, verifyReceiptSignature } from "@/lib/decisionReceipts/signing";
import { toPublicView, verifyRecordSignature } from "@/lib/decisionReceipts/views";
import { buildNarrowPartnerResultForReceipt } from "@/lib/partner/narrowPartnerResult/build";
import { AbraxasPartnerKit } from "@/lib/partner/integrationKit";
import { PARTNER_INTEGRATION_TRUSTED_RECEIPT_FIELDS } from "@/lib/partner/integrationKit/contract";
import { PUBLIC_RECEIPT_ALLOWED_FIELDS } from "@/lib/privacy/selectiveDisclosure/contract";
import { NARROW_PARTNER_RESULT_ALLOWED_FIELDS } from "@/lib/partner/narrowPartnerResult/contract";
import { WEBHOOK_PAYLOAD_ALLOWED_KEYS } from "@/lib/partner/webhooks/payloadAllowlist";
import { subjectPseudonymId } from "@/lib/decisionReceipts/pseudonym";
import { pairwiseSubjectRef, defaultPairwiseBoundary } from "@/lib/identity/pairwiseSubject/derive";
import type { CredentialClaimRecord } from "@/lib/credentials/claimSchema";
import type { DecisionReceiptRecord } from "@/lib/decisionReceipts/types";

const PARTNER_A = "institutional-platform";
const PARTNER_B = "institutional-platform-b";
const APP_A = "app-a-00000001";
const POLICY_ID = `${PARTNER_A}-age_21_retail-v1`;

const TEST_SIGNING = generateTestSigningKeyPair();
const callGraph: string[] = [];
const track = (stage: string) => callGraph.push(stage);

const replayStore = new Map<string, string>();
const bindings = new Map<string, string>();
const identitySubjects = new Map<string, Record<string, unknown>>();
const claimsBySubject = new Map<string, CredentialClaimRecord[]>();
let insertedReceipt: DecisionReceiptRecord | null = null;

function bindingKey(providerId: string, refHash: string) {
  return `${providerId}:${refHash}`;
}

function makeQuery(table: string, filters: Record<string, string> = {}) {
  return {
    eq(col: string, val: string) {
      return makeQuery(table, { ...filters, [col]: val });
    },
    maybeSingle: async () => {
      if (table === "identity_subjects") {
        return { data: identitySubjects.get(filters.id ?? filters.claims_subject_key ?? "") ?? null, error: null };
      }
      if (table === "provider_subject_bindings") {
        const pk = bindingKey(filters.provider_id ?? "", filters.provider_subject_ref_hash ?? "");
        const subjectId = bindings.get(pk);
        return subjectId
          ? { data: { abraxas_subject_id: subjectId, status: "active" }, error: null }
          : { data: null, error: null };
      }
      if (table === "verification_decisions") {
        const subjectKey = [...claimsBySubject.keys()][0] ?? "";
        return {
          data: {
            decision: "approved",
            claims_json: { identity_verified: true },
            subject_id: subjectKey,
            request_id: "req_graph_1",
          },
          error: null,
        };
      }
      if (table === "verification_requests") {
        return { data: { launchpad_application_id: APP_A }, error: null };
      }
      return { data: null, error: null };
    },
    single: async () => makeQuery(table, filters).maybeSingle(),
    limit: () => makeQuery(table, filters),
  };
}

vi.mock("@/lib/supabase/admin", () => ({
  requireSupabaseAdmin: () => ({
    rpc: async (name: string, args: Record<string, unknown>) => {
      track(`supabase.rpc:${name}`);
      if (name === "consume_provider_event_replay") {
        const key = `${args.p_provider_id}:${args.p_provider_event_id}`;
        if (replayStore.has(key)) {
          return { data: replayStore.get(key) === args.p_event_hash
            ? { ok: false, code: "duplicate" }
            : { ok: false, code: "conflict" }, error: null };
        }
        replayStore.set(key, args.p_event_hash as string);
        return { data: { ok: true, code: "consumed" }, error: null };
      }
      if (name === "replace_credential_claim_atomic") {
        return { data: { ok: true }, error: null };
      }
      return { data: { ok: true }, error: null };
    },
    from: (table: string) => ({
      insert: (row: Record<string, unknown>) => {
        const exec = async () => {
          track(`supabase.insert:${table}`);
          if (table === "identity_subjects") {
            identitySubjects.set(row.id as string, row);
            identitySubjects.set(row.claims_subject_key as string, row);
            return { data: row, error: null };
          }
          if (table === "provider_subject_bindings") {
            const pk = bindingKey(row.provider_id as string, row.provider_subject_ref_hash as string);
            if (bindings.has(pk)) return { data: null, error: { code: "23505" } };
            bindings.set(pk, row.abraxas_subject_id as string);
            return { data: row, error: null };
          }
          if (table === "decision_receipts") {
            insertedReceipt = {
              ...(row as unknown as DecisionReceiptRecord),
              id: (row.id as string) ?? "dr_graph",
              schema_version: "1.0.0",
              created_at: new Date().toISOString(),
            };
            return { data: insertedReceipt, error: null };
          }
          return { data: row, error: null };
        };
        const p = exec();
        return Object.assign(p, { select: () => ({ single: () => p }) });
      },
      select: (cols?: string) => {
        if (table === "decision_receipts") {
          return {
            eq: () => ({
              maybeSingle: async () => ({ data: insertedReceipt, error: null }),
              single: async () => ({ data: insertedReceipt, error: null }),
            }),
          };
        }
        if (table === "wallet_bindings") {
          return {
            eq: () => ({
              is: () => ({
                order: () => ({
                  limit: () => ({
                    maybeSingle: async () => ({ data: null, error: null }),
                  }),
                }),
              }),
            }),
          };
        }
        return makeQuery(table);
      },
      update: () => ({ eq: () => ({ eq: () => ({ select: () => ({ single: async () => ({ data: {}, error: null }) }) }) }) }),
    }),
  }),
  getSupabaseAdmin: () => null,
}));

vi.mock("@/lib/trust/resolveCanonicalIssuer", () => ({
  resolveCanonicalIssuer: async (id: string) => id === MOCK_APPROVED_KYC_PROVIDER_ID ? {
    id,
    issuer_status: "active",
    supported_claims: ["identity_verified"],
    metadata: { max_assurance: "L2", authorized_claims: ["identity_verified"], environment: "sandbox" },
  } : null,
}));

vi.mock("@/lib/credentials/claimsService", async (importOriginal) => {
  const orig = await importOriginal<typeof import("@/lib/credentials/claimsService")>();
  return {
    ...orig,
    upsertClaims: async (claims: Omit<CredentialClaimRecord, "id" | "status">[]) => {
      track("credentials.upsertClaims");
      for (const c of claims) {
        const list = claimsBySubject.get(c.subject_id) ?? [];
        list.push({ ...c, id: `claim-${list.length}`, status: "active" });
        claimsBySubject.set(c.subject_id, list);
      }
    },
    getActiveClaims: async (subjectId: string) => {
      track("credentials.getActiveClaims");
      return claimsBySubject.get(subjectId) ?? [];
    },
    updateClaimStatus: async (input: { claimId: string; status: string }) => {
      track("credentials.updateClaimStatus");
      for (const [k, claims] of claimsBySubject) {
        const idx = claims.findIndex((c) => c.id === input.claimId);
        if (idx >= 0) {
          claims[idx] = { ...claims[idx], status: input.status as CredentialClaimRecord["status"] };
          claimsBySubject.set(k, claims);
        }
      }
    },
  };
});

vi.mock("@/lib/policy/getPolicy", () => ({
  getPartnerPolicy: vi.fn(async () => ({
    id: POLICY_ID,
    partner_id: PARTNER_A,
    version: 1,
    name: "Institutional KYC",
    rules_json: {
      required_claims: [{
        claim_type: "identity_verified",
        accepted_issuers: [MOCK_APPROVED_KYC_PROVIDER_ID],
        min_assurance: "L2",
      }],
    },
    status: "active",
  })),
  getPartnerPolicyAtVersion: vi.fn(async (policyId: string, version: number) => ({
    id: policyId,
    partner_id: PARTNER_A,
    version,
    name: "Institutional KYC",
    rules_json: {
      required_claims: [{
        claim_type: "identity_verified",
        accepted_issuers: [MOCK_APPROVED_KYC_PROVIDER_ID],
        min_assurance: "L2",
      }],
    },
    status: "active",
  })),
}));

vi.mock("@/lib/trust/loadPolicyTrustContext", () => ({
  loadPolicyTrustContext: vi.fn(async () => {
    track("trust.loadPolicyTrustContext");
    return {
      partnerId: PARTNER_A,
      policyId: POLICY_ID,
      jurisdiction: "US",
      trustRulesByClaimType: new Map([[
        "identity_verified",
        { accepted_issuer_ids: [MOCK_APPROVED_KYC_PROVIDER_ID], minimum_assurance_level: "L2" },
      ]]),
    };
  }),
}));

vi.mock("@/lib/decisionReceipts/verificationKeyLifecycle", () => ({
  resolveIssuanceSigningKey: () => ({
    ok: true,
    key_id: TEST_SIGNING.signingKeyId,
    privateKeyJwk: TEST_SIGNING.privateKeyJwk,
    publicKeyJwk: TEST_SIGNING.publicKeyJwk,
  }),
  verifyRecordSignatureWithRegistry: () => true,
}));

vi.mock("@/lib/decisionReceipts/dependencies", () => ({
  recordReceiptClaimDependencies: vi.fn(async () => { track("receipts.recordReceiptClaimDependencies"); }),
  getReceiptDependencies: vi.fn(async () => []),
}));

vi.mock("@/lib/decisionReceipts/trustEvaluation", () => ({
  evaluatePublicReceiptTrust: vi.fn(async () => ({
    currently_valid: true,
    validity: "valid",
    invalidation_reasons: [],
  })),
  evaluateDecisionReceiptTrust: vi.fn(async () => ({
    currently_valid: true,
    validity: "valid",
    invalidation_reasons: [],
  })),
}));

vi.mock("@/lib/decisionReceipts/publicReceiptLiveTrust", () => ({
  buildPublicReceiptWithLiveTrust: vi.fn(async (record: DecisionReceiptRecord) => ({
    ...toPublicView(record),
    currently_valid: true,
    signature_valid: true,
    production_usable: false,
    decision_context: record.decision_context,
    artifact_type: "eligibility_decision_receipt",
    invalidation_reasons: record.decision_context === "sandbox_only" ? ["production_not_usable:false"] : [],
  })),
  applyLiveClaimStatusesToRefs: vi.fn((refs) => refs),
  attachLiveTrustToPublicView: vi.fn((view) => view),
}));

vi.mock("@/lib/verification/audit", () => ({
  appendAuditEvent: vi.fn(async () => { track("audit.appendAuditEvent"); }),
}));

vi.mock("@/lib/decisionReceipts/service", async (importOriginal) => {
  const orig = await importOriginal<typeof import("@/lib/decisionReceipts/service")>();
  return {
    ...orig,
    getReceiptById: vi.fn(async (id: string) => insertedReceipt?.id === id ? insertedReceipt : null),
    getReceiptByDecisionId: vi.fn(async () => null),
  };
});

describe("institutional identity service graph", () => {
  beforeEach(() => {
    callGraph.length = 0;
    replayStore.clear();
    bindings.clear();
    identitySubjects.clear();
    claimsBySubject.clear();
    insertedReceipt = null;
    process.env.PROVIDER_INGEST_TEST_SECRET = "provider-ingest-test-secret-do-not-use-in-production";
    process.env.PAIRWISE_SUBJECT_HMAC_KEY = "test-pairwise-key";
  });

  it("executes canonical service graph from provider event through PartnerKit verification", async () => {
    const { processProviderEvent } = await import("@/lib/identity/providerIngestion/adapter");
    track("START");

    const providerRef = "psref_service_graph";
    const event = buildMockVerificationCompletedEvent({
      providerSubjectRef: providerRef,
      providerEventId: "evt_graph_1",
    });
    const rawBody = JSON.stringify(event);
    const ts = new Date().toISOString();

    track("provider.processProviderEvent");
    const ingested = await processProviderEvent({
      rawBody,
      providerId: MOCK_APPROVED_KYC_PROVIDER_ID,
      signature: signMockProviderEvent(rawBody, ts),
      timestamp: ts,
      apiKeyHeader: null,
    });
    expect(ingested.ok).toBe(true);
    expect(ingested.claims_subject_key).toBeTruthy();

    const claimsKey = ingested.claims_subject_key!;
    const abraxasSubjectId = ingested.abraxas_subject_id!;

    track("policy.evaluatePolicyForSubject");
    const { evaluation } = await evaluatePolicyForSubject({
      suiAddress: claimsKey,
      policyId: POLICY_ID,
      partnerId: PARTNER_A,
    });
    expect(evaluation.decision).toBe("approved");

    const decisionId = "00000000-0000-4000-8000-00000000graph";
    track("receipt.issueReceiptForDecision");
    const receipt = await issueReceiptForDecision({
      decisionId,
      partnerId: PARTNER_A,
      policyId: POLICY_ID,
      policyVersion: 1,
      subjectId: claimsKey,
      applicationId: APP_A,
      decisionResult: "approved",
      reasonCodes: evaluation.reason_codes,
      claimsJson: evaluation.claims,
      evaluatedClaimRefs: [{
        claim_id: "claim-0",
        claim_type: "identity_verified",
        issuer_id: MOCK_APPROVED_KYC_PROVIDER_ID,
        status: "active",
        issued_at: new Date().toISOString(),
        expires_at: null,
      }],
      expiresAt: evaluation.valid_until,
      decisionContext: "sandbox_only",
    });
    expect(receipt).toBeTruthy();
    insertedReceipt = receipt;

    track("receipt.buildCanonicalPayload");
    const canonical = buildCanonicalPayload({
      receipt_id: receipt!.id,
      decision_id: decisionId,
      policy_id: POLICY_ID,
      policy_version: 1,
      partner_id: PARTNER_A,
      subject_pseudonym_id: receipt!.subject_pseudonym_id,
      wallet_binding_ref: null,
      consent_receipt_id: null,
      decision_result: "approved",
      reason_codes: [],
      evaluated_claim_refs: receipt!.evaluated_claim_refs,
      issuer_refs: receipt!.issuer_refs,
      decision_context: "production",
      evaluated_at: receipt!.evaluated_at,
      expires_at: receipt!.expires_at,
    });
    expect(canonical.schema_version).toBe("1.0.0");

    track("receipt.signReceiptPayload");
    const { payloadHash, signature } = signReceiptPayload(canonical, TEST_SIGNING.privateKeyJwk);
    expect(verifyReceiptSignature(canonical, signature, TEST_SIGNING.publicKeyJwk)).toBe(true);
    expect(hashCanonicalPayload(canonical)).toBe(payloadHash);

    track("receipt.toPublicView");
    const publicView = toPublicView(receipt!);
    expect(publicView.schema_version).toBe("1.0.0");
    expect(verifyRecordSignature(receipt!)).toBe(true);

    track("narrow.buildNarrowPartnerResultForReceipt");
    const narrow = await buildNarrowPartnerResultForReceipt(receipt!.id);
    expect(narrow?.pairwise_subject_ref).toMatch(/^psr_/);

    track("partnerKit.verifyCallbackWithNarrowResult");
    const partnerPublicView = {
      ...publicView,
      currently_valid: true,
      production_usable: false,
      artifact_type: "eligibility_decision_receipt",
      invalidation_reasons: ["production_not_usable:false"],
    };

    const kit = new AbraxasPartnerKit({
      partnerId: PARTNER_A,
      policyId: POLICY_ID,
      policyPackId: "age_21_retail",
      policyVersion: 1,
      environment: "sandbox",
      applicationId: APP_A,
      fetchFn: async (url) => {
        if (String(url).includes("/narrow-result")) {
          return new Response(JSON.stringify(narrow ?? {
            schema_version: "1.0.0",
            receipt_id: receipt!.id,
            partner_id: PARTNER_A,
            policy_id: POLICY_ID,
            decision: "approved",
            result_family: "age_eligible_21",
            identity_verified: true,
            pairwise_subject_ref: pairwiseSubjectRef({
              abraxasSubjectId,
              boundary: defaultPairwiseBoundary(PARTNER_A, APP_A),
            }).ok
              ? (pairwiseSubjectRef({ abraxasSubjectId, boundary: defaultPairwiseBoundary(PARTNER_A, APP_A) }) as { ok: true; ref: string }).ref
              : undefined,
          }), { status: 200 });
        }
        return new Response(JSON.stringify(partnerPublicView), { status: 200 });
      },
    });
    const verified = await kit.verifyCallbackWithNarrowResult({
      search: new URLSearchParams({ receipt_id: receipt!.id, request_id: "vr_graph123456789" }),
      expectedRequestId: "vr_graph123456789",
    });
    expect(verified.ok).toBe(true);

    track("END");

    const globalPseudonym = subjectPseudonymId(claimsKey);
    const pairwiseA = pairwiseSubjectRef({
      abraxasSubjectId,
      boundary: defaultPairwiseBoundary(PARTNER_A, APP_A),
    });
    const pairwiseB = pairwiseSubjectRef({
      abraxasSubjectId,
      boundary: defaultPairwiseBoundary(PARTNER_B, APP_A),
    });
    expect(pairwiseA.ok && pairwiseB.ok).toBe(true);
    if (pairwiseA.ok && pairwiseB.ok) {
      expect(pairwiseA.ref).not.toBe(pairwiseB.ref);
      expect(publicView.subject_pseudonym_id).toBe(pairwiseA.ref);
      expect(publicView.subject_pseudonym_id).not.toBe(globalPseudonym);
      expect(publicView.subject_pseudonym_id).not.toBe(pairwiseB.ref);
      expect(narrow?.pairwise_subject_ref).toBe(pairwiseA.ref);
      expect(receipt!.subject_pseudonym_id).toBe(pairwiseA.ref);
    }

    const requiredStages = [
      "provider.processProviderEvent",
      "supabase.rpc:consume_provider_event_replay",
      "supabase.insert:identity_subjects",
      "supabase.insert:provider_subject_bindings",
      "credentials.upsertClaims",
      "policy.evaluatePolicyForSubject",
      "credentials.getActiveClaims",
      "trust.loadPolicyTrustContext",
      "receipt.issueReceiptForDecision",
      "supabase.insert:decision_receipts",
      "receipts.recordReceiptClaimDependencies",
      "receipt.buildCanonicalPayload",
      "receipt.signReceiptPayload",
      "receipt.toPublicView",
      "narrow.buildNarrowPartnerResultForReceipt",
      "partnerKit.verifyCallbackWithNarrowResult",
    ];
    for (const stage of requiredStages) {
      expect(callGraph, `missing stage: ${stage}`).toContain(stage);
    }
    expect(callGraph[0]).toBe("START");
    expect(callGraph[callGraph.length - 1]).toBe("END");

    expect(JSON.stringify(publicView)).not.toContain(abraxasSubjectId);
    expect(JSON.stringify(publicView)).not.toContain(providerRef);
    expect(JSON.stringify(narrow)).not.toContain(abraxasSubjectId);
    expect(JSON.stringify(narrow)).not.toContain(providerRef);
    expect(JSON.stringify(verified)).not.toContain(abraxasSubjectId);

    expect(PARTNER_INTEGRATION_TRUSTED_RECEIPT_FIELDS).not.toContain("subject_pseudonym_id");
    expect(WEBHOOK_PAYLOAD_ALLOWED_KEYS).not.toContain("subject_pseudonym_id");
    expect(NARROW_PARTNER_RESULT_ALLOWED_FIELDS).toContain("pairwise_subject_ref");
    expect(PUBLIC_RECEIPT_ALLOWED_FIELDS).toContain("subject_pseudonym_id");
  });
});
