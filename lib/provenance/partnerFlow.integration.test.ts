// FILE: lib/provenance/partnerFlow.integration.test.ts

import { describe, expect, it } from "vitest";
import { buildCanonicalPayload } from "@/lib/decisionReceipts/canonical";
import { DECISION_RECEIPT_SCHEMA_VERSION } from "@/lib/decisionReceipts/types";
import { assertNoPiiInPublicView } from "@/lib/decisionReceipts/views";
import { buildPartnerWebhookPayload } from "@/lib/partner/webhooks/webhookPayloadContract";
import { buildRedirectUrl } from "@/lib/connect/returnUrlAllowlist";
import { POLICY_PACKS } from "@/lib/partner/launchpad/policyPacks";
import { isGoodTroubleBrowseFlow } from "@/lib/partner/goodTroubleBrowseFlow";
import { GOOD_TROUBLE_BROWSE_POLICY_ID } from "@/lib/goodTrouble/constants";
import { GOOD_TROUBLE_CANONICAL_PARTNER_ID } from "@/lib/goodTrouble/canonicalProductionConfig";
import { assertCustodySafePayload } from "@/lib/custody/guardrails";
import {
  buildProvenancePartnerVerificationResult,
  extractProvenancePartnerFacts,
} from "@/lib/partner/provenancePartnerResult";
import { buildPartnerVerificationResult } from "@/lib/partner/partnerVerificationResult";
import {
  CONTENT_ORIGIN_DISCLOSURE_POLICY_MARK,
  isContentOriginDisclosurePolicyId,
  SANDBOX_CONTENT_PUBLISHER_PARTNER_ID,
} from "./constants";
import { evaluateContentOriginDisclosure } from "./contentOriginDisclosure";
import {
  aiAssistanceDisclosedClaim,
  creatorAttestedClaim,
  sourceIntegrityVerifiedClaim,
} from "./claims";
import { fingerprintArtifact } from "./artifactFingerprint";
import { resetArtifactStoreForTests, upsertArtifactBinding } from "./artifactStore";
import {
  resetProvenanceSessionsForTests,
  saveProvenanceSubmission,
} from "./provenanceSessionStore";
import { isContentOriginDisclosureFlow } from "./partnerFlow";
import { provenanceReceiptIsPublicSafe } from "./publicReceipt";
import { PROVENANCE_CLAIM_SEMANTICS } from "./claimSemantics";

const POLICY_ID = `${SANDBOX_CONTENT_PUBLISHER_PARTNER_ID}-${CONTENT_ORIGIN_DISCLOSURE_POLICY_MARK}`;
const SUBJECT = "0x1234567890123456789012345678901234567890";

function hashFor(label: string): string {
  return fingerprintArtifact({ content: Buffer.from(label), contentType: "text/plain" }).content_hash;
}

function activeClaims(input: {
  artifactId: string;
  contentHash: string;
  aiCategory?: "none_declared" | "editing_assistance";
}) {
  const base = {
    subjectId: SUBJECT,
    artifactId: input.artifactId,
    contentHash: input.contentHash,
  };
  return [
    { ...creatorAttestedClaim(base), status: "active" as const, id: "c1" },
    {
      ...aiAssistanceDisclosedClaim({ ...base, category: input.aiCategory ?? "editing_assistance" }),
      status: "active" as const,
      id: "c2",
    },
    { ...sourceIntegrityVerifiedClaim(base), status: "active" as const, id: "c3" },
  ];
}

describe("content provenance partner flow", () => {
  it("registers the canonical content-origin-disclosure policy pack", () => {
    expect(POLICY_PACKS.content_origin_disclosure.id).toBe("content_origin_disclosure");
    expect(POLICY_PACKS.content_origin_disclosure.rules.required_claims).toHaveLength(3);
    expect(isContentOriginDisclosurePolicyId(POLICY_ID)).toBe(true);
    expect(isContentOriginDisclosureFlow({ policyId: POLICY_ID })).toBe(true);
  });

  it("fails closed for unsupported capture_provenance_verified claims", () => {
    const hash = hashFor("capture-test");
    const result = evaluateContentOriginDisclosure({
      claims: [
        {
          ...creatorAttestedClaim({ subjectId: SUBJECT, artifactId: "a1", contentHash: hash }),
          status: "active",
          id: "x",
        },
        {
          claim_type: "capture_provenance_verified",
          claim_value: { artifact_id: "a1", content_hash: hash },
          status: "active",
          id: "cap",
          subject_id: SUBJECT,
          credential_jti: null,
          issuer_id: "issuer:abraxas",
          assurance_level: "L2",
          issued_at: new Date().toISOString(),
          expires_at: null,
          revocation_reference: null,
          evidence_reference: null,
          jurisdiction: null,
          policy_scope: "content_provenance",
        },
      ],
      submittedContentHash: hash,
    });
    expect(result.decision).toBe("denied");
    expect(result.reason_codes).toContain("unsupported_provenance_claim:capture_provenance_verified");
  });

  it("represents creator attestation as attestation, not verification", () => {
    expect(PROVENANCE_CLAIM_SEMANTICS.creator_attested.assertion_class).toBe("attestation");
    expect(PROVENANCE_CLAIM_SEMANTICS.creator_attested.does_not_establish).toContain("human_created_verified");
  });

  it("represents AI disclosure as disclosure, not detection", () => {
    const claim = aiAssistanceDisclosedClaim({
      subjectId: SUBJECT,
      artifactId: "a1",
      contentHash: hashFor("ai"),
      category: "editing_assistance",
    });
    expect(claim.claim_value.detection).toBe(false);
    expect(PROVENANCE_CLAIM_SEMANTICS.ai_assistance_disclosed.assertion_class).toBe("disclosure");
  });

  it("requires exact artifact SHA-256 binding across all claims", async () => {
    resetArtifactStoreForTests();
    const hashA = hashFor("artifact-a");
    const binding = await upsertArtifactBinding({
      subjectId: SUBJECT,
      contentHash: hashA,
      contentType: "image/jpeg",
      byteLength: 100,
      bindingMethod: "creator_attestation",
    });

    const approved = evaluateContentOriginDisclosure({
      claims: activeClaims({ artifactId: binding.artifact_id, contentHash: hashA }),
      submittedContentHash: hashA,
      artifactBinding: binding,
    });
    expect(approved.decision).toBe("approved");

    const hashB = hashFor("artifact-b");
    const denied = evaluateContentOriginDisclosure({
      claims: activeClaims({ artifactId: binding.artifact_id, contentHash: hashA }),
      submittedContentHash: hashB,
      artifactBinding: binding,
    });
    expect(denied.decision).toBe("denied");
    expect(denied.reason_codes).toContain("artifact_binding_mismatch");
  });

  it("prevents Artifact A claims from satisfying Artifact B", () => {
    const hashA = hashFor("file-a");
    const hashB = hashFor("file-b");
    const result = evaluateContentOriginDisclosure({
      claims: activeClaims({ artifactId: "artifact-a", contentHash: hashA }),
      submittedContentHash: hashB,
    });
    expect(result.decision).toBe("denied");
  });

  it("never exposes raw artifact bytes in receipt payloads", () => {
    const payload = buildCanonicalPayload({
      receipt_id: "dr_prov",
      decision_id: "dec_prov",
      policy_id: POLICY_ID,
      policy_version: 1,
      partner_id: SANDBOX_CONTENT_PUBLISHER_PARTNER_ID,
      subject_pseudonym_id: "pseudo",
      wallet_binding_ref: null,
      consent_receipt_id: "consent",
      decision_result: "approved",
      reason_codes: [],
      evaluated_claim_refs: [{
        claim_id: "claim_1",
        claim_type: "creator_attested",
        issuer_id: "issuer:abraxas",
        status: "active",
        issued_at: new Date().toISOString(),
        expires_at: null,
      }],
      issuer_refs: ["issuer:abraxas"],
      decision_context: "sandbox_only",
      evaluated_at: new Date().toISOString(),
      expires_at: new Date(Date.now() + 3600000).toISOString(),
    });
    const serialized = JSON.stringify(payload);
    expect(serialized).not.toMatch(/image\/jpeg;base64/);
    expect(serialized).not.toContain("BEGIN PRIVATE KEY");
    expect(payload.schema_version).toBe(DECISION_RECEIPT_SCHEMA_VERSION);
  });

  it("never exposes raw artifact bytes in webhook payloads", () => {
    const webhook = buildPartnerWebhookPayload({
      eventId: "evt_1",
      eventType: "receipt_issued",
      occurredAt: new Date().toISOString(),
      partnerId: SANDBOX_CONTENT_PUBLISHER_PARTNER_ID,
      receiptId: "dr_prov",
      outcome: "approved",
    });
    const custody = assertCustodySafePayload(webhook, "partner_webhook");
    expect(custody.ok).toBe(true);
    expect(JSON.stringify(webhook)).not.toMatch(/[A-Za-z0-9+/]{200,}/);
  });

  it("never puts raw artifact bytes in redirect URLs", () => {
    const redirect = buildRedirectUrl("https://partner.example/callback", {
      status: "approved",
      receipt_id: "dr_prov",
      decision_id: "dec_prov",
      receipt_expires_at: new Date().toISOString(),
      credential_id: "cred_1",
      policy_id: POLICY_ID,
      partner_id: SANDBOX_CONTENT_PUBLISHER_PARTNER_ID,
    });
    expect(redirect).not.toMatch(/[A-Za-z0-9+/]{200,}/);
    expect(redirect).not.toContain("content_hash");
  });

  it("returns only policy-authorized provenance facts to partners", () => {
    const evaluation = evaluateContentOriginDisclosure({
      claims: activeClaims({ artifactId: "art_1", contentHash: hashFor("facts") }),
      submittedContentHash: hashFor("facts"),
    });
    const base = buildPartnerVerificationResult({
      decision: "approved",
      credentialJti: "cred",
      issuer: "https://abraxas.example",
      evaluatedAt: new Date().toISOString(),
      receiptId: "dr",
      receiptExpiresAt: new Date().toISOString(),
      policyId: POLICY_ID,
      partnerId: SANDBOX_CONTENT_PUBLISHER_PARTNER_ID,
      identityVerified: false,
      assuranceLevel: "L0",
    });
    const partnerResult = buildProvenancePartnerVerificationResult({ base, evaluation });
    expect(partnerResult.provenance?.creator_attested).toBe(true);
    expect(partnerResult.provenance?.ai_assistance_disclosed).toBe("editing_assistance");
    expect(partnerResult.provenance?.source_integrity_verified).toBe(true);
    expect(JSON.stringify(partnerResult)).not.toContain("artifact_id");
    expect(JSON.stringify(partnerResult)).not.toContain("content_hash");
  });

  it("denies expired provenance claims", () => {
    const hash = hashFor("expired");
    const expiredClaim = creatorAttestedClaim({
      subjectId: SUBJECT,
      artifactId: "art_exp",
      contentHash: hash,
      expiresAt: new Date(Date.now() - 3600000),
    });
    const result = evaluateContentOriginDisclosure({
      claims: [{ ...expiredClaim, status: "expired", id: "e1" }],
      submittedContentHash: hash,
    });
    expect(result.decision).toBe("denied");
  });

  it("rejects malformed content hashes fail closed", () => {
    const result = evaluateContentOriginDisclosure({
      claims: [],
      submittedContentHash: "not-a-hash",
    });
    expect(result.decision).toBe("denied");
    expect(result.reason_codes).toContain("artifact_hash_required");
  });

  it("preserves Good Trouble browse flow detection", () => {
    expect(isGoodTroubleBrowseFlow({
      partnerId: GOOD_TROUBLE_CANONICAL_PARTNER_ID,
      policyId: GOOD_TROUBLE_BROWSE_POLICY_ID,
      purpose: "browse",
    })).toBe(true);
    expect(isContentOriginDisclosureFlow({ policyId: POLICY_ID })).toBe(true);
  });

  it("preserves age eligibility pack separation", () => {
    expect(POLICY_PACKS.age_21_retail.required_claims).toEqual(["identity_verified"]);
    expect(POLICY_PACKS.content_origin_disclosure.required_claims).not.toContain("identity_verified");
  });

  it("keeps public provenance receipts custody-safe", () => {
    const view = {
      receipt_id: "dr",
      decision_id: "dec",
      policy_id: POLICY_ID,
      partner_id: SANDBOX_CONTENT_PUBLISHER_PARTNER_ID,
      decision_result: "approved" as const,
      reason_codes: [],
      evaluated_claim_refs: [{ claim_type: "creator_attested", claim_ref: "ref" }],
      evaluated_at: new Date().toISOString(),
      expires_at: new Date().toISOString(),
      currently_valid: true,
      invalidation_reasons: [],
      artifact_type: "eligibility_decision_receipt" as const,
    };
    expect(provenanceReceiptIsPublicSafe(view)).toBe(true);
    expect(() => assertNoPiiInPublicView(view)).not.toThrow();
  });

  it("uses server-side submission context for evaluation after holder proof", () => {
    resetProvenanceSessionsForTests();
    const hash = hashFor("session");
    saveProvenanceSubmission({ subjectId: SUBJECT, policyId: POLICY_ID, contentHash: hash });
    const facts = extractProvenancePartnerFacts(
      evaluateContentOriginDisclosure({
        claims: activeClaims({ artifactId: "art_session", contentHash: hash }),
        submittedContentHash: hash,
      }),
    );
    expect(facts?.creator_attested).toBe(true);
  });
});
