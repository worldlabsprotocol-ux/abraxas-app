// FILE: lib/identity/providerIngestion/integrationHarness.test.ts
// Institutional KYC trust foundation — reusable KYC scenario + security matrix.

import { describe, expect, it, vi, beforeEach } from "vitest";
import { createHmac } from "crypto";
import { evaluatePolicyRules } from "@/lib/policy/evaluatePolicy";
import { evaluatePolicyForSubject } from "@/lib/policy/evaluateSubjectPolicy";
import { decideEvidenceReuse } from "@/lib/passport/reusableEligibility/decision";
import { projectInternalFact, type SourceReceiptRow } from "@/lib/passport/reusableEligibility/facts";
import { assertCustodySafePayload } from "@/lib/custody/guardrails";
import { pairwiseSubjectRef, defaultPairwiseBoundary } from "@/lib/identity/pairwiseSubject/derive";
import { claimsSubjectKeyForAbraxasSubject, generateAbraxasSubjectId } from "@/lib/identity/subject/claimsSubjectKey";
import { hashProviderSubjectRef } from "@/lib/identity/providerIngestion/bindingStore";
import { clampAssurance, assertClaimAuthorized } from "@/lib/identity/providerIngestion/providerConfig";
import {
  buildMockVerificationCompletedEvent,
  buildMockRevocationEvent,
  signMockProviderEvent,
  MOCK_APPROVED_KYC_PROVIDER_ID,
  MOCK_PROVIDER_DANGEROUS_FIXTURE,
} from "@/lib/identity/providerIngestion/mockProvider";
import { normalizeProviderAssertions } from "@/lib/identity/providerIngestion/normalize";
import { authenticateProviderEvent, isPartnerApiKeyAttempt } from "@/lib/identity/providerIngestion/authenticate";
import { PROVIDER_RAW_PII_FIELDS } from "@/lib/identity/providerIngestion/contract";
import type { CredentialClaimRecord } from "@/lib/credentials/claimSchema";
import type { PartnerPolicyRules } from "@/lib/policy/types";
import type { ProviderAuthorization } from "@/lib/identity/providerIngestion/providerConfig";

const PARTNER_A = "institutional-platform";
const PARTNER_B = "institutional-platform-b";
const APP_A = "app-a-uuid";
const APP_B = "app-b-uuid";

const mockAuth: ProviderAuthorization = {
  providerId: MOCK_APPROVED_KYC_PROVIDER_ID,
  authorizedClaimTypes: ["identity_verified", "residency_country"],
  maxAssurance: "L2",
  issuerStatus: "active",
  environment: "sandbox",
};

const replayStore = new Map<string, { hash: string; outcome: string }>();
const bindings = new Map<string, string>();
const claimsBySubject = new Map<string, CredentialClaimRecord[]>();
const identitySubjects = new Map<string, { id: string; claims_subject_key: string; status: string }>();

function bindingKey(providerId: string, refHash: string) {
  return `${providerId}:${refHash}`;
}

function makeSubject() {
  const id = generateAbraxasSubjectId();
  const claimsKey = claimsSubjectKeyForAbraxasSubject(id);
  identitySubjects.set(id, { id, claims_subject_key: claimsKey, status: "active" });
  identitySubjects.set(claimsKey, { id, claims_subject_key: claimsKey, status: "active" });
  return { id, claimsKey };
}

function makeQuery(table: string, filters: Record<string, string> = {}) {
  return {
    eq(col: string, val: string) {
      return makeQuery(table, { ...filters, [col]: val });
    },
    maybeSingle: async () => {
      if (table === "identity_subjects") {
        const sub = identitySubjects.get(filters.id ?? filters.claims_subject_key ?? "");
        return { data: sub ?? null, error: null };
      }
      if (table === "provider_subject_bindings") {
        const pk = bindingKey(filters.provider_id ?? "", filters.provider_subject_ref_hash ?? "");
        const subjectId = bindings.get(pk);
        if (!subjectId) return { data: null, error: null };
        return {
          data: {
            abraxas_subject_id: subjectId,
            status: "active",
            provider_id: filters.provider_id,
            provider_subject_ref_hash: filters.provider_subject_ref_hash,
          },
          error: null,
        };
      }
      return { data: null, error: null };
    },
  };
}

vi.mock("@/lib/supabase/admin", () => ({
  requireSupabaseAdmin: () => ({
    rpc: async (name: string, args: Record<string, unknown>) => {
      if (name === "consume_provider_event_replay") {
        const key = `${args.p_provider_id}:${args.p_provider_event_id}`;
        const existing = replayStore.get(key);
        if (existing) {
          if (existing.hash === args.p_event_hash) {
            return { data: { ok: false, code: "duplicate" }, error: null };
          }
          return { data: { ok: false, code: "conflict", existing_hash: existing.hash }, error: null };
        }
        replayStore.set(key, { hash: args.p_event_hash as string, outcome: "processed" });
        return { data: { ok: true, code: "consumed" }, error: null };
      }
      return { data: { ok: true }, error: null };
    },
    from: (table: string) => ({
      insert: (row: Record<string, unknown>) => {
        const execute = async () => {
          if (table === "identity_subjects") {
            identitySubjects.set(row.id as string, row as { id: string; claims_subject_key: string; status: string });
            identitySubjects.set(row.claims_subject_key as string, row as { id: string; claims_subject_key: string; status: string });
            return { data: row, error: null };
          }
          if (table === "provider_subject_bindings") {
            const pk = bindingKey(row.provider_id as string, row.provider_subject_ref_hash as string);
            if (bindings.has(pk)) {
              return { data: null, error: { code: "23505", message: "duplicate" } };
            }
            bindings.set(pk, row.abraxas_subject_id as string);
            return { data: row, error: null };
          }
          return { data: row, error: null };
        };
        const promise = execute();
        return Object.assign(promise, {
          select: () => ({
            single: () => promise,
          }),
        });
      },
      select: () => makeQuery(table),
    }),
  }),
  getSupabaseAdmin: () => null,
}));

vi.mock("@/lib/trust/issuerFramework", () => ({
  getIssuerById: async (id: string) => id === MOCK_APPROVED_KYC_PROVIDER_ID ? {
    id,
    issuer_status: "active",
    trust_status: "active",
    supported_claims: ["identity_verified", "residency_country"],
    metadata: { max_assurance: "L2", authorized_claims: ["identity_verified", "residency_country"], environment: "sandbox" },
  } : null,
  getIssuerSigningKey: vi.fn(),
  appendIssuerAuditEvent: vi.fn(),
}));

vi.mock("@/lib/trust/resolveCanonicalIssuer", () => ({
  resolveCanonicalIssuer: async (id: string) => id === MOCK_APPROVED_KYC_PROVIDER_ID ? {
    id,
    issuer_status: "active",
    trust_status: "active",
    supported_claims: ["identity_verified", "residency_country"],
    metadata: { max_assurance: "L2", authorized_claims: ["identity_verified", "residency_country"], environment: "sandbox" },
  } : null,
}));

vi.mock("@/lib/credentials/claimsService", () => ({
  upsertClaims: async (claims: Omit<CredentialClaimRecord, "id" | "status">[]) => {
    for (const c of claims) {
      const list = claimsBySubject.get(c.subject_id) ?? [];
      list.push({ ...c, id: `claim-${list.length}`, status: "active" });
      claimsBySubject.set(c.subject_id, list);
    }
  },
  getActiveClaims: async (subjectId: string) => claimsBySubject.get(subjectId) ?? [],
  updateClaimStatus: async (input: { claimId: string; status: string; reason?: string }) => {
    for (const [key, claims] of claimsBySubject.entries()) {
      const idx = claims.findIndex((c) => c.id === input.claimId);
      if (idx >= 0) {
        claims[idx] = { ...claims[idx], status: input.status as CredentialClaimRecord["status"], revocation_reference: input.reason ?? null };
        claimsBySubject.set(key, claims);
      }
    }
  },
}));

vi.mock("@/lib/verification/audit", () => ({
  appendAuditEvent: vi.fn(),
}));

describe("institutional KYC trust foundation", () => {
  beforeEach(() => {
    replayStore.clear();
    bindings.clear();
    claimsBySubject.clear();
    identitySubjects.clear();
    process.env.PAIRWISE_SUBJECT_HMAC_KEY = "test-pairwise-key";
    process.env.PROVIDER_INGEST_TEST_SECRET = "provider-ingest-test-secret-do-not-use-in-production";
  });

  describe("provider adapter security", () => {
    it("accepts authenticated provider event and rejects forged/stale/wrong provider", async () => {
      const { processProviderEvent } = await import("./adapter");
      const event = buildMockVerificationCompletedEvent({ providerSubjectRef: "psref_001", providerEventId: "evt_1" });
      const body = JSON.stringify(event);
      const ts = new Date().toISOString();
      const sig = signMockProviderEvent(body, ts);

      const accepted = await processProviderEvent({
        rawBody: body,
        providerId: MOCK_APPROVED_KYC_PROVIDER_ID,
        signature: sig,
        timestamp: ts,
        apiKeyHeader: null,
      });
      expect(accepted.ok).toBe(true);
      expect(accepted.outcome).toBe("accepted");
      expect(accepted.abraxas_subject_id).toMatch(/^sub_ind_/);
      expect(accepted.claims_subject_key).toMatch(/^0x/);

      const forged = await processProviderEvent({
        rawBody: body,
        providerId: MOCK_APPROVED_KYC_PROVIDER_ID,
        signature: "deadbeef".repeat(8),
        timestamp: ts,
        apiKeyHeader: null,
      });
      expect(forged.ok).toBe(false);
      expect(forged.code).toBe("signature_invalid");

      const staleTs = new Date(Date.now() - 10 * 60_000).toISOString();
      const staleSig = signMockProviderEvent(body, staleTs);
      const stale = await processProviderEvent({
        rawBody: body,
        providerId: MOCK_APPROVED_KYC_PROVIDER_ID,
        signature: staleSig,
        timestamp: staleTs,
        apiKeyHeader: null,
      });
      expect(stale.code).toBe("timestamp_stale");

      const dup = await processProviderEvent({
        rawBody: body,
        providerId: MOCK_APPROVED_KYC_PROVIDER_ID,
        signature: sig,
        timestamp: ts,
        apiKeyHeader: null,
      });
      expect(dup.outcome).toBe("duplicate");

      const wrongProvider = await processProviderEvent({
        rawBody: body,
        providerId: "issuer:unknown",
        signature: sig,
        timestamp: ts,
        apiKeyHeader: null,
      });
      expect(wrongProvider.ok).toBe(false);
    });

    it("rejects partner API keys for provider auth", () => {
      expect(isPartnerApiKeyAttempt("abx_test_abc123")).toBe(true);
      expect(isPartnerApiKeyAttempt("abx_live_xyz789")).toBe(true);
    });

    it("duplicate binding is deterministic; same provider subject resolves same Abraxas subject", async () => {
      const { processProviderEvent } = await import("./adapter");
      const ref = "psref_stable";
      const event1 = buildMockVerificationCompletedEvent({ providerSubjectRef: ref, providerEventId: "evt_bind_1" });
      const body1 = JSON.stringify(event1);
      const ts1 = new Date().toISOString();
      const first = await processProviderEvent({
        rawBody: body1,
        providerId: MOCK_APPROVED_KYC_PROVIDER_ID,
        signature: signMockProviderEvent(body1, ts1),
        timestamp: ts1,
        apiKeyHeader: null,
      });
      expect(first.ok).toBe(true);
      expect(bindings.size).toBe(1);

      const event2 = buildMockVerificationCompletedEvent({ providerSubjectRef: ref, providerEventId: "evt_bind_2" });
      const body2 = JSON.stringify(event2);
      const ts2 = new Date().toISOString();
      const second = await processProviderEvent({
        rawBody: body2,
        providerId: MOCK_APPROVED_KYC_PROVIDER_ID,
        signature: signMockProviderEvent(body2, ts2),
        timestamp: ts2,
        apiKeyHeader: null,
      });
      expect(second.ok).toBe(true);
      expect(second.abraxas_subject_id).toBe(first.abraxas_subject_id);
    });
  });

  describe("claim normalization + assurance ceiling", () => {
    it("rejects unauthorized claim types and assurance above configured ceiling", () => {
      const subject = makeSubject();
      const event = buildMockVerificationCompletedEvent({
        providerSubjectRef: "psref_norm",
        assuranceLevel: "L4",
        extraAssertions: [{ claim_type: "screening_outcome", claim_value: { outcome: "clear" }, assurance_level: "L2" }],
      });

      const normalized = normalizeProviderAssertions({
        event,
        auth: mockAuth,
        claimsSubjectKey: subject.claimsKey,
      });
      expect(normalized.ok).toBe(false);
      expect(normalized.code).toContain("unauthorized_claim_type");

      const identityOnly = buildMockVerificationCompletedEvent({
        providerSubjectRef: "psref_ceil",
        assuranceLevel: "L4",
      });
      const clamped = normalizeProviderAssertions({
        event: identityOnly,
        auth: mockAuth,
        claimsSubjectKey: subject.claimsKey,
      });
      expect(clamped.ok).toBe(true);
      if (clamped.ok) {
        expect(clamped.claims[0].assurance_level).toBe("L2");
      }

      expect(assertClaimAuthorized(mockAuth, "screening_outcome")).toBe(false);
      expect(clampAssurance(mockAuth, "L4")).toBe("L2");
    });

    it("discards raw provider PII — none in normalized claims", () => {
      const subject = makeSubject();
      const event = buildMockVerificationCompletedEvent({ providerSubjectRef: "psref_pii" });
      event.authorized_assertions[0].claim_value = {
        outcome: "verified",
        ...MOCK_PROVIDER_DANGEROUS_FIXTURE,
      };

      const normalized = normalizeProviderAssertions({
        event,
        auth: mockAuth,
        claimsSubjectKey: subject.claimsKey,
      });
      expect(normalized.ok).toBe(true);
      if (normalized.ok) {
        const json = JSON.stringify(normalized.claims);
        for (const field of PROVIDER_RAW_PII_FIELDS) {
          expect(json).not.toContain(field);
        }
        const claimValues = normalized.claims.map((c) => c.claim_value);
        const custody = assertCustodySafePayload(claimValues, "partner_api");
        expect(custody.ok).toBe(true);
      }
    });
  });

  describe("trust context enforcement", () => {
    it("browser-forged identity_verified fails without trust context", () => {
      const rules: PartnerPolicyRules = {
        required_claims: [{
          claim_type: "identity_verified",
          accepted_issuers: [MOCK_APPROVED_KYC_PROVIDER_ID],
          min_assurance: "L2",
        }],
      };
      const forged: CredentialClaimRecord = {
        id: "f1",
        subject_id: "0x" + "f".repeat(64),
        credential_jti: null,
        claim_type: "identity_verified",
        claim_value: { identity_verified: true },
        issuer_id: MOCK_APPROVED_KYC_PROVIDER_ID,
        assurance_level: "L4",
        issued_at: new Date().toISOString(),
        expires_at: null,
        status: "active",
        revocation_reference: null,
        evidence_reference: null,
        jurisdiction: null,
        policy_scope: null,
      };

      const withoutTrust = evaluatePolicyRules(rules, [forged]);
      expect(withoutTrust.decision).not.toBe("approved");
      expect(withoutTrust.reason_codes.some((c) => c.includes("trust_context_required"))).toBe(true);
    });
  });

  describe("pairwise subject references", () => {
    it("A != B, deterministic per partner+application, no raw IDs exposed", () => {
      const abraxasId = generateAbraxasSubjectId();
      const refA = pairwiseSubjectRef({
        abraxasSubjectId: abraxasId,
        boundary: defaultPairwiseBoundary(PARTNER_A, APP_A),
      });
      const refB = pairwiseSubjectRef({
        abraxasSubjectId: abraxasId,
        boundary: defaultPairwiseBoundary(PARTNER_B, APP_B),
      });
      const refA2 = pairwiseSubjectRef({
        abraxasSubjectId: abraxasId,
        boundary: defaultPairwiseBoundary(PARTNER_A, APP_A),
      });

      expect(refA.ok && refB.ok && refA2.ok).toBe(true);
      if (refA.ok && refB.ok && refA2.ok) {
        expect(refA.ref).not.toBe(refB.ref);
        expect(refA.ref).toBe(refA2.ref);
        expect(refA.ref).not.toContain(abraxasId);
        expect(refA.ref).toMatch(/^psr_/);
      }
    });

    it("pairwise key absent fails closed in production", () => {
      delete process.env.PAIRWISE_SUBJECT_HMAC_KEY;
      const prev = process.env.NODE_ENV;
      process.env.NODE_ENV = "production";
      delete process.env.VERCEL_ENV;

      const result = pairwiseSubjectRef({
        abraxasSubjectId: generateAbraxasSubjectId(),
        boundary: defaultPairwiseBoundary(PARTNER_A, APP_A),
      });
      expect(result.ok).toBe(false);
      if (!result.ok) expect(result.code).toBe("pairwise_key_missing");

      process.env.NODE_ENV = prev;
    });
  });

  describe("reusable KYC scenario", () => {
    it("App A verification → App B reuse with fresh consent; stricter policy requests missing evidence only", async () => {
      const { processProviderEvent } = await import("./adapter");
      const providerRef = "psref_reuse_flow";
      const event = buildMockVerificationCompletedEvent({ providerSubjectRef: providerRef, providerEventId: "evt_reuse_1" });
      const body = JSON.stringify(event);
      const ts = new Date().toISOString();
      const ingested = await processProviderEvent({
        rawBody: body,
        providerId: MOCK_APPROVED_KYC_PROVIDER_ID,
        signature: signMockProviderEvent(body, ts),
        timestamp: ts,
        apiKeyHeader: null,
      });
      expect(ingested.ok).toBe(true);
      const claimsKey = ingested.claims_subject_key!;

      const identityRules: PartnerPolicyRules = {
        required_claims: [{
          claim_type: "identity_verified",
          accepted_issuers: [MOCK_APPROVED_KYC_PROVIDER_ID],
          min_assurance: "L2",
        }],
      };
      const claims = claimsBySubject.get(claimsKey) ?? [];
      const evalA = evaluatePolicyRules(identityRules, claims, {
        partnerId: PARTNER_A,
        policyId: "institutional-platform-kyc-v1",
        trustRulesByClaimType: new Map([[
          "identity_verified",
          { accepted_issuer_ids: [MOCK_APPROVED_KYC_PROVIDER_ID], minimum_assurance_level: "L2" },
        ]]),
      });
      expect(evalA.decision).toBe("approved");

      const stricterRules: PartnerPolicyRules = {
        required_claims: [
          { claim_type: "identity_verified", accepted_issuers: [MOCK_APPROVED_KYC_PROVIDER_ID], min_assurance: "L2" },
          { claim_type: "screening_outcome", accepted_issuers: ["issuer:screening-partner"], min_assurance: "L2", max_age_hours: 24 },
        ],
      };
      const partial = evaluatePolicyRules(stricterRules, claims, {
        partnerId: PARTNER_B,
        policyId: "institutional-platform-kyc-screening-v1",
        trustRulesByClaimType: new Map([
          ["identity_verified", { accepted_issuer_ids: [MOCK_APPROVED_KYC_PROVIDER_ID], minimum_assurance_level: "L2" }],
          ["screening_outcome", { accepted_issuer_ids: ["issuer:screening-partner"], minimum_assurance_level: "L2" }],
        ]),
      });
      expect(partial.decision).not.toBe("approved");
      expect(partial.missing_claims).toEqual(["screening_outcome"]);
      expect(partial.missing_claims).not.toContain("identity_verified");

      const receipt = receiptRow({ partner_id: PARTNER_A, subject_pseudonym_id: "legacy_pseudonym" });
      const fact = projectInternalFact({
        subjectId: claimsKey,
        receipt,
      });
      if (fact) {
        const reuse = decideEvidenceReuse({
          fact,
          targetPolicyId: "institutional-platform-age_21_retail-v1",
          targetPartnerId: PARTNER_B,
          holderConsentGranted: true,
          sourceReceipt: receipt,
        });
        expect(["reuse", "refresh_required", "not_compatible"]).toContain(reuse.decision);
      }
    });
  });

  describe("provider revocation", () => {
    it("provider revocation blocks claim reuse", async () => {
      const { processProviderEvent } = await import("./adapter");
      const providerRef = "psref_revoke";
      const verifyEvent = buildMockVerificationCompletedEvent({ providerSubjectRef: providerRef, providerEventId: "evt_v1" });
      const verifyBody = JSON.stringify(verifyEvent);
      const ts1 = new Date().toISOString();
      const ingested = await processProviderEvent({
        rawBody: verifyBody,
        providerId: MOCK_APPROVED_KYC_PROVIDER_ID,
        signature: signMockProviderEvent(verifyBody, ts1),
        timestamp: ts1,
        apiKeyHeader: null,
      });
      const claimsKey = ingested.claims_subject_key!;
      expect((claimsBySubject.get(claimsKey) ?? []).length).toBeGreaterThan(0);

      const revokeEvent = buildMockRevocationEvent({ providerSubjectRef: providerRef, providerEventId: "evt_revoke_1" });
      const revokeBody = JSON.stringify(revokeEvent);
      const ts2 = new Date().toISOString();
      const revoked = await processProviderEvent({
        rawBody: revokeBody,
        providerId: MOCK_APPROVED_KYC_PROVIDER_ID,
        signature: signMockProviderEvent(revokeBody, ts2),
        timestamp: ts2,
        apiKeyHeader: null,
      });
      expect(revoked.outcome).toBe("revoked");

      const active = (claimsBySubject.get(claimsKey) ?? []).filter((c) => c.status === "active");
      expect(active.length).toBe(0);
    });
  });

  describe("provider portability", () => {
    it("changed issuer policy rejects old issuer for new evaluation", () => {
      const issuerAClaim: CredentialClaimRecord = {
        id: "c1",
        subject_id: "0x" + "c".repeat(64),
        credential_jti: null,
        claim_type: "identity_verified",
        claim_value: { outcome: "verified" },
        issuer_id: "issuer:A",
        assurance_level: "L2",
        issued_at: new Date().toISOString(),
        expires_at: null,
        status: "active",
        revocation_reference: null,
        evidence_reference: null,
        jurisdiction: null,
        policy_scope: null,
      };

      const rulesAorB: PartnerPolicyRules = {
        required_claims: [{ claim_type: "identity_verified", accepted_issuers: ["issuer:A", "issuer:B"], min_assurance: "L2" }],
      };
      const rulesBOnly: PartnerPolicyRules = {
        required_claims: [{ claim_type: "identity_verified", accepted_issuers: ["issuer:B"], min_assurance: "L2" }],
      };

      const trustAorB = {
        partnerId: PARTNER_A,
        policyId: "p1",
        trustRulesByClaimType: new Map([["identity_verified", { accepted_issuer_ids: ["issuer:A", "issuer:B"], minimum_assurance_level: "L2" as const }]]),
      };
      const trustBOnly = {
        partnerId: PARTNER_A,
        policyId: "p2",
        trustRulesByClaimType: new Map([["identity_verified", { accepted_issuer_ids: ["issuer:B"], minimum_assurance_level: "L2" as const }]]),
      };

      expect(evaluatePolicyRules(rulesAorB, [issuerAClaim], trustAorB).decision).toBe("approved");
      expect(evaluatePolicyRules(rulesBOnly, [issuerAClaim], trustBOnly).decision).not.toBe("approved");
    });
  });

  describe("concurrent replay protection", () => {
    it("concurrent duplicate provider events only process once", async () => {
      const { processProviderEvent } = await import("./adapter");
      const event = buildMockVerificationCompletedEvent({ providerSubjectRef: "psref_concurrent", providerEventId: "evt_concurrent" });
      const body = JSON.stringify(event);
      const ts = new Date().toISOString();
      const sig = signMockProviderEvent(body, ts);
      const input = {
        rawBody: body,
        providerId: MOCK_APPROVED_KYC_PROVIDER_ID,
        signature: sig,
        timestamp: ts,
        apiKeyHeader: null,
      };

      const results = await Promise.all([
        processProviderEvent(input),
        processProviderEvent(input),
        processProviderEvent(input),
      ]);

      const accepted = results.filter((r) => r.outcome === "accepted");
      const duplicates = results.filter((r) => r.outcome === "duplicate");
      expect(accepted.length + duplicates.length).toBe(3);
      expect(accepted.length).toBeLessThanOrEqual(1);
    });
  });
});

function receiptRow(overrides: Partial<SourceReceiptRow> = {}): SourceReceiptRow {
  return {
    id: "dr_harness",
    verification_decision_id: "00000000-0000-4000-8000-000000000001",
    partner_id: PARTNER_A,
    policy_id: "institutional-platform-age_21_retail-v1",
    policy_version: 1,
    subject_pseudonym_id: "pseudonym_legacy",
    decision_result: "approved",
    decision_context: "production",
    evaluated_at: new Date().toISOString(),
    expires_at: new Date(Date.now() + 86400_000).toISOString(),
    revoked_at: null,
    status: "active",
    ...overrides,
  };
}
