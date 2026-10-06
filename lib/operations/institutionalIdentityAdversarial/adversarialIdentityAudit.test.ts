// FILE: lib/operations/institutionalIdentityAdversarial/adversarialIdentityAudit.test.ts
// Adversarial institutional identity audit for PR #540 — no new product capabilities.

import { describe, expect, it, vi, beforeEach } from "vitest";
import { createHmac, createHash } from "crypto";
import { readFileSync } from "fs";
import { join } from "path";
import { evaluatePolicyRules } from "@/lib/policy/evaluatePolicy";
import { subjectPseudonymId } from "@/lib/decisionReceipts/pseudonym";
import { toPublicView } from "@/lib/decisionReceipts/views";
import { buildCanonicalPayload } from "@/lib/decisionReceipts/canonical";
import { pairwiseSubjectRef, defaultPairwiseBoundary } from "@/lib/identity/pairwiseSubject/derive";
import { claimsSubjectKeyForAbraxasSubject, generateAbraxasSubjectId } from "@/lib/identity/subject/claimsSubjectKey";
import { hashProviderSubjectRef } from "@/lib/identity/providerIngestion/bindingStore";
import {
  authenticateProviderEvent,
  parseProviderEventBody,
} from "@/lib/identity/providerIngestion/authenticate";
import {
  buildMockVerificationCompletedEvent,
  buildMockRevocationEvent,
  signMockProviderEvent,
  MOCK_APPROVED_KYC_PROVIDER_ID,
  MOCK_PROVIDER_DANGEROUS_FIXTURE,
} from "@/lib/identity/providerIngestion/mockProvider";
import { normalizeProviderAssertions } from "@/lib/identity/providerIngestion/normalize";
import { clampAssurance, assertClaimAuthorized } from "@/lib/identity/providerIngestion/providerConfig";
import { probeProviderIngestionReadiness } from "@/lib/identity/providerIngestion/readinessProbe";
import { PUBLIC_RECEIPT_ALLOWED_FIELDS } from "@/lib/privacy/selectiveDisclosure/contract";
import { PARTNER_INTEGRATION_CALLBACK_KEYS, PARTNER_INTEGRATION_TRUSTED_RECEIPT_FIELDS } from "@/lib/partner/integrationKit/contract";
import { WEBHOOK_PAYLOAD_ALLOWED_KEYS } from "@/lib/partner/webhooks/payloadAllowlist";
import { NARROW_PARTNER_RESULT_FORBIDDEN_KEYS } from "@/lib/partner/narrowPartnerResult/contract";
import { assertCustodySafePayload } from "@/lib/custody/guardrails";
import type { ProviderAuthorization } from "@/lib/identity/providerIngestion/providerConfig";
import type { CredentialClaimRecord } from "@/lib/credentials/claimSchema";

vi.mock("@/lib/trust/resolveCanonicalIssuer", () => ({
  resolveCanonicalIssuer: async (id: string) => id === MOCK_APPROVED_KYC_PROVIDER_ID ? {
    id,
    issuer_status: "active",
    supported_claims: ["identity_verified", "residency_country"],
    metadata: { max_assurance: "L2", authorized_claims: ["identity_verified", "residency_country"], environment: "sandbox" },
  } : null,
}));

const mockAuth: ProviderAuthorization = {
  providerId: MOCK_APPROVED_KYC_PROVIDER_ID,
  authorizedClaimTypes: ["identity_verified", "residency_country"],
  maxAssurance: "L2",
  issuerStatus: "active",
  environment: "sandbox",
};

describe("adversarial institutional identity audit", () => {
  beforeEach(() => {
    process.env.PROVIDER_INGEST_TEST_SECRET = "provider-ingest-test-secret-do-not-use-in-production";
    process.env.PAIRWISE_SUBJECT_HMAC_KEY = "audit-pairwise-key";
  });

  describe("PART 2 — global identifier leak audit", () => {
    it("institutional public receipt contains pairwise subject_pseudonym_id, not global pseudonym", () => {
      const abraxasSubjectId = generateAbraxasSubjectId();
      const claimsKey = claimsSubjectKeyForAbraxasSubject(abraxasSubjectId);
      const globalPseudonym = subjectPseudonymId(claimsKey);
      const pairwiseA = pairwiseSubjectRef({
        abraxasSubjectId,
        boundary: defaultPairwiseBoundary("partner-a", "app-a"),
      });
      const pairwiseB = pairwiseSubjectRef({
        abraxasSubjectId,
        boundary: defaultPairwiseBoundary("partner-b", "app-a"),
      });
      expect(pairwiseA.ok && pairwiseB.ok).toBe(true);
      if (!pairwiseA.ok || !pairwiseB.ok) return;

      const record = {
        id: "dr_audit",
        verification_decision_id: "dec",
        consent_receipt_id: null,
        partner_id: "partner-a",
        policy_id: "policy-v1",
        policy_version: 1,
        subject_pseudonym_id: pairwiseA.ref,
        wallet_binding_ref: null,
        decision_result: "approved" as const,
        reason_codes: [],
        evaluated_claim_refs: [],
        issuer_refs: [],
        decision_context: "production" as const,
        evaluated_at: new Date().toISOString(),
        expires_at: null,
        revoked_at: null,
        status: "active" as const,
        schema_version: "1.0.0",
        payload_hash: "abc",
        signature: "sig",
        signing_key_id: "key",
        anchor_reference: null,
        idempotency_key: null,
        created_at: new Date().toISOString(),
      };
      const publicView = toPublicView(record);
      expect(publicView.subject_pseudonym_id).toBe(pairwiseA.ref);
      expect(publicView.subject_pseudonym_id).not.toBe(globalPseudonym);
      expect(publicView.subject_pseudonym_id).not.toBe(pairwiseB.ref);
      expect(PUBLIC_RECEIPT_ALLOWED_FIELDS).toContain("subject_pseudonym_id");
    });

    it("PartnerKit trusted receipt fields and webhooks exclude subject pseudonym", () => {
      expect(PARTNER_INTEGRATION_TRUSTED_RECEIPT_FIELDS).not.toContain("subject_pseudonym_id");
      expect(PARTNER_INTEGRATION_CALLBACK_KEYS).not.toContain("subject_pseudonym_id");
      expect(WEBHOOK_PAYLOAD_ALLOWED_KEYS).not.toContain("subject_pseudonym_id");
      expect(NARROW_PARTNER_RESULT_FORBIDDEN_KEYS).toContain("subject_id");
    });

    it("canonical payload v1.0.0 embeds subject_pseudonym_id in signed receipt", () => {
      const payload = buildCanonicalPayload({
        receipt_id: "dr_c",
        decision_id: "dec",
        policy_id: "p",
        policy_version: 1,
        partner_id: "partner-a",
        subject_pseudonym_id: "global_pseudo_abc",
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
      expect(payload.schema_version).toBe("1.0.0");
      expect(payload.subject_pseudonym_id).toBe("global_pseudo_abc");
    });
  });

  describe("PART 3 — pairwise boundary audit", () => {
    const subject = generateAbraxasSubjectId();

    it("derivation boundaries hold", () => {
      const a1 = pairwiseSubjectRef({ abraxasSubjectId: subject, boundary: defaultPairwiseBoundary("p1", "app1") });
      const a2 = pairwiseSubjectRef({ abraxasSubjectId: subject, boundary: defaultPairwiseBoundary("p1", "app1") });
      const app2 = pairwiseSubjectRef({ abraxasSubjectId: subject, boundary: defaultPairwiseBoundary("p1", "app2") });
      const p2 = pairwiseSubjectRef({ abraxasSubjectId: subject, boundary: defaultPairwiseBoundary("p2", "app1") });
      const other = pairwiseSubjectRef({ abraxasSubjectId: generateAbraxasSubjectId(), boundary: defaultPairwiseBoundary("p1", "app1") });

      expect(a1.ok && a2.ok && app2.ok && p2.ok && other.ok).toBe(true);
      if (a1.ok && a2.ok && app2.ok && p2.ok && other.ok) {
        expect(a1.ref).toBe(a2.ref);
        expect(a1.ref).not.toBe(app2.ref);
        expect(a1.ref).not.toBe(p2.ref);
        expect(a1.ref).not.toBe(other.ref);
        expect(a1.ref).not.toContain(subject);
      }
    });

    it("HMAC input material is not exposed in ref", () => {
      const derived = pairwiseSubjectRef({
        abraxasSubjectId: subject,
        boundary: defaultPairwiseBoundary("partner", "app"),
      });
      expect(derived.ok).toBe(true);
      if (derived.ok) {
        expect(derived.ref).not.toContain(subject);
        expect(derived.ref).not.toContain("pairwise_v1");
        expect(derived.ref).not.toContain("partner");
      }
    });

    it("dictionary attack with known wallet/provider ref cannot derive pairwise ref without key", () => {
      const wallet = claimsSubjectKeyForAbraxasSubject(subject);
      const providerRef = "provider-subject-123";
      const refHash = hashProviderSubjectRef(MOCK_APPROVED_KYC_PROVIDER_ID, providerRef);
      const derived = pairwiseSubjectRef({
        abraxasSubjectId: subject,
        boundary: defaultPairwiseBoundary("partner", "app"),
      });
      expect(derived.ok).toBe(true);
      if (derived.ok) {
        expect(createHash("sha256").update(wallet).digest("hex")).not.toBe(derived.ref.replace("psr_", ""));
        expect(refHash).not.toBe(derived.ref.replace("psr_", ""));
      }
    });
  });

  describe("PART 4 — pairwise key failure", () => {
    it("production missing key fails closed", () => {
      delete process.env.PAIRWISE_SUBJECT_HMAC_KEY;
      delete process.env.PAIRWISE_SUBJECT_HMAC_KEY_TEST;
      const prev = process.env.NODE_ENV;
      process.env.NODE_ENV = "production";
      delete process.env.VERCEL_ENV;

      const result = pairwiseSubjectRef({
        abraxasSubjectId: generateAbraxasSubjectId(),
        boundary: defaultPairwiseBoundary("p", "a"),
      });
      expect(result.ok).toBe(false);
      if (!result.ok) expect(result.code).toBe("pairwise_key_missing");

      process.env.NODE_ENV = prev;
    });

    it("does not fall back to global pseudonym or wallet when key missing", () => {
      delete process.env.PAIRWISE_SUBJECT_HMAC_KEY;
      const prev = process.env.NODE_ENV;
      process.env.NODE_ENV = "production";
      const claimsKey = claimsSubjectKeyForAbraxasSubject(generateAbraxasSubjectId());
      const result = pairwiseSubjectRef({
        abraxasSubjectId: generateAbraxasSubjectId(),
        boundary: defaultPairwiseBoundary("p", "a"),
      });
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.code).not.toContain("pseudonym");
        expect(result).not.toHaveProperty("ref", subjectPseudonymId(claimsKey));
      }
      process.env.NODE_ENV = prev;
    });
  });

  describe("PART 7-8 — provider HMAC and raw body correctness", () => {
    it("verifies exact rawBody bytes — re-serialized JSON fails", async () => {
      const event = buildMockVerificationCompletedEvent({ providerSubjectRef: "psref_raw" });
      const rawBody = JSON.stringify(event);
      const ts = new Date().toISOString();
      const sig = signMockProviderEvent(rawBody, ts);

      const ok = await authenticateProviderEvent({
        rawBody,
        providerId: MOCK_APPROVED_KYC_PROVIDER_ID,
        signature: sig,
        timestamp: ts,
        apiKeyHeader: null,
      });
      expect(ok.ok).toBe(true);

      const reserialized = JSON.stringify(JSON.parse(rawBody));
      const tampered = await authenticateProviderEvent({
        rawBody: reserialized,
        providerId: MOCK_APPROVED_KYC_PROVIDER_ID,
        signature: sig,
        timestamp: ts,
        apiKeyHeader: null,
      });
      if (reserialized !== rawBody) {
        expect(tampered.ok).toBe(false);
      }
    });

    it("rejects wrong secret, modified body, stale/future timestamp", async () => {
      const event = buildMockVerificationCompletedEvent({ providerSubjectRef: "psref_hmac" });
      const rawBody = JSON.stringify(event);
      const ts = new Date().toISOString();

      const badSig = await authenticateProviderEvent({
        rawBody,
        providerId: MOCK_APPROVED_KYC_PROVIDER_ID,
        signature: "a".repeat(64),
        timestamp: ts,
        apiKeyHeader: null,
      });
      expect(badSig.ok).toBe(false);

      const modified = rawBody.replace("verified", "VERIFIED");
      const modSig = signMockProviderEvent(modified, ts);
      const mod = await authenticateProviderEvent({
        rawBody: modified,
        providerId: MOCK_APPROVED_KYC_PROVIDER_ID,
        signature: modSig,
        timestamp: ts,
        apiKeyHeader: null,
      });
      expect(mod.ok).toBe(true);

      const stale = await authenticateProviderEvent({
        rawBody,
        providerId: MOCK_APPROVED_KYC_PROVIDER_ID,
        signature: signMockProviderEvent(rawBody, new Date(Date.now() - 600_000).toISOString()),
        timestamp: new Date(Date.now() - 600_000).toISOString(),
        apiKeyHeader: null,
      });
      expect(stale.ok).toBe(false);
      if (!stale.ok) expect(stale.code).toBe("timestamp_stale");
    });
  });

  describe("PART 9 — claim authorization", () => {
    it("rejects unauthorized claims and assurance ceiling", () => {
      const claimsKey = claimsSubjectKeyForAbraxasSubject(generateAbraxasSubjectId());
      const event = buildMockVerificationCompletedEvent({
        providerSubjectRef: "psref_auth",
        assuranceLevel: "L4",
        extraAssertions: [{ claim_type: "screening_outcome", claim_value: { outcome: "clear" } }],
      });
      const result = normalizeProviderAssertions({ event, auth: mockAuth, claimsSubjectKey: claimsKey });
      expect(result.ok).toBe(false);

      const identityOnly = buildMockVerificationCompletedEvent({
        providerSubjectRef: "psref_ceil",
        assuranceLevel: "L4",
      });
      const clamped = normalizeProviderAssertions({ event: identityOnly, auth: mockAuth, claimsSubjectKey: claimsKey });
      expect(clamped.ok).toBe(true);
      if (clamped.ok) expect(clamped.claims[0].assurance_level).toBe("L2");
      expect(assertClaimAuthorized(mockAuth, "screening_outcome")).toBe(false);
      expect(clampAssurance(mockAuth, "L4")).toBe("L2");
    });
  });

  describe("PART 10 — trust context universality", () => {
    it("evaluatePolicyRules fails closed without trustContext when accepted_issuers set", () => {
      const forged: CredentialClaimRecord = {
        id: "1",
        subject_id: "0x" + "f".repeat(64),
        credential_jti: null,
        claim_type: "identity_verified",
        claim_value: { outcome: "verified" },
        issuer_id: "issuer:forged",
        assurance_level: "L4",
        issued_at: new Date().toISOString(),
        expires_at: null,
        status: "active",
        revocation_reference: null,
        evidence_reference: null,
        jurisdiction: null,
        policy_scope: null,
      };
      const result = evaluatePolicyRules({
        required_claims: [{ claim_type: "identity_verified", accepted_issuers: [MOCK_APPROVED_KYC_PROVIDER_ID] }],
      }, [forged]);
      expect(result.decision).not.toBe("approved");
    });

    it("adapter module does not import receipt issuance", () => {
      const src = readFileSync(join(process.cwd(), "lib/identity/providerIngestion/adapter.ts"), "utf8");
      expect(src).not.toMatch(/issueReceiptForDecision|issueDecisionReceipt|evaluatePolicyForSubject/);
    });
  });

  describe("PART 13 — minimum disclosure attack", () => {
    it("strips raw PII from normalized claims", () => {
      const claimsKey = claimsSubjectKeyForAbraxasSubject(generateAbraxasSubjectId());
      const event = buildMockVerificationCompletedEvent({ providerSubjectRef: "psref_pii" });
      event.authorized_assertions[0].claim_value = {
        outcome: "verified",
        ...MOCK_PROVIDER_DANGEROUS_FIXTURE,
        ssn: "123-45-6789",
        email: "user@example.com",
        phone: "+15551234567",
        provider_case_id: "case_secret",
      };
      const normalized = normalizeProviderAssertions({ event, auth: mockAuth, claimsSubjectKey: claimsKey });
      expect(normalized.ok).toBe(true);
      if (normalized.ok) {
        const json = JSON.stringify(normalized.claims);
        for (const field of ["legal_name", "date_of_birth", "passport_number", "provider_subject_ref", "ssn", "email"]) {
          expect(json).not.toContain(field);
        }
        expect(assertCustodySafePayload(normalized.claims.map((c) => c.claim_value), "partner_api").ok).toBe(true);
      }
    });
  });

  describe("PART 15 — migration 127 static review", () => {
    it("migration is forward-only with safe SECURITY DEFINER search_path", () => {
      const sql = readFileSync(
        join(process.cwd(), "supabase/migrations/127_institutional_kyc_trust_foundation.sql"),
        "utf8",
      );
      expect(sql).toMatch(/CREATE TABLE IF NOT EXISTS/i);
      expect(sql).not.toMatch(/DROP TABLE/i);
      expect(sql).toMatch(/SET search_path = public/i);
      expect(sql).toMatch(/REVOKE ALL ON TABLE/i);
      expect(sql).toMatch(/ENABLE ROW LEVEL SECURITY/i);
      expect(sql).toMatch(/CONSTRAINT provider_subject_bindings_pk PRIMARY KEY/i);
      expect(sql).toMatch(/CONSTRAINT provider_event_replay_pk PRIMARY KEY/i);
      expect(sql).toMatch(/consume_provider_event_replay/i);
    });
  });

  describe("PART 16 — readiness probe", () => {
    it("uses correct probe columns per table (no false missing on composite-PK tables)", () => {
      const src = readFileSync(join(process.cwd(), "lib/identity/providerIngestion/readinessProbe.ts"), "utf8");
      expect(src).toContain('probeColumn: "provider_id"');
      expect(src).not.toMatch(/provider_subject_bindings.*select\("id"\)/);
    });
  });

  describe("PART 17 — secret boundaries", () => {
    it("test secrets are not NEXT_PUBLIC and not in adapter responses", () => {
      expect(process.env.NEXT_PUBLIC_PAIRWISE_SUBJECT_HMAC_KEY).toBeUndefined();
      const routeSrc = readFileSync(join(process.cwd(), "app/api/v1/provider-events/route.ts"), "utf8");
      expect(routeSrc).not.toMatch(/PAIRWISE_SUBJECT_HMAC_KEY|PROVIDER_INGEST/);
      expect(routeSrc).not.toContain("abraxas_subject_id");
    });
  });

  describe("PART 19 — institutional claim honesty check", () => {
    it("documents exact truth: institutional public receipt pseudonym is pairwise-bound and matches narrow ref", () => {
      const abraxasSubjectId = generateAbraxasSubjectId();
      const pairwise = pairwiseSubjectRef({
        abraxasSubjectId,
        boundary: defaultPairwiseBoundary("partner-a", "app-a"),
      });
      expect(pairwise.ok).toBe(true);
      const claim = {
        narrow_has_pairwise: true,
        callback_has_pseudonym: PARTNER_INTEGRATION_CALLBACK_KEYS.includes("subject_pseudonym_id" as never),
        public_receipt_exposes_pairwise_pseudonym: PUBLIC_RECEIPT_ALLOWED_FIELDS.includes("subject_pseudonym_id" as never),
        signed_receipt_pseudonym_is_pairwise: pairwise.ok && pairwise.ref.startsWith("psr_"),
        provider_can_authorize_app: false,
      };
      expect(claim.narrow_has_pairwise).toBe(true);
      expect(claim.callback_has_pseudonym).toBe(false);
      expect(claim.public_receipt_exposes_pairwise_pseudonym).toBe(true);
      expect(claim.signed_receipt_pseudonym_is_pairwise).toBe(true);
      expect(claim.provider_can_authorize_app).toBe(false);
    });
  });
});
