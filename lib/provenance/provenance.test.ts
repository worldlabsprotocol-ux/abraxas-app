// FILE: lib/provenance/provenance.test.ts

import { describe, expect, it } from "vitest";
import { DECISION_RECEIPT_SCHEMA_VERSION } from "@/lib/decisionReceipts/types";
import { buildCanonicalPayload, hashCanonicalPayload } from "@/lib/decisionReceipts/canonical";
import { POLICY_PACKS } from "@/lib/partner/launchpad/policyPacks";
import { SELECTIVE_DISCLOSURE_PROFILES } from "@/lib/privacy/selectiveDisclosure/profiles";
import {
  assertClaimDoesNotOverstate,
  creatorAttestedClaim,
  aiAssistanceDisclosedClaim,
  evaluateProvenancePolicy,
  fingerprintArtifact,
  provenanceReceiptIsPublicSafe,
  runReferenceProvenanceFlow,
  PROVENANCE_CLAIM_SEMANTICS,
} from "@/lib/provenance";

describe("content provenance foundation", () => {
  it("creator attestation does not become verified authorship", () => {
    const claim = creatorAttestedClaim({
      subjectId: "subj_1",
      artifactId: "art_1",
      contentHash: "a".repeat(64),
    });
    expect(claim.claim_type).toBe("creator_attested");
    expect(claim.assurance_level).toBe("L0");
    expect(claim.claim_value.assertion_class).toBe("attestation");
    expect(claim.claim_value).not.toHaveProperty("human_verified");

    const overstated = assertClaimDoesNotOverstate("creator_attested", "human_created_verified");
    expect(overstated.ok).toBe(false);
  });

  it("AI disclosure does not become AI detection", () => {
    const claim = aiAssistanceDisclosedClaim({
      subjectId: "subj_1",
      artifactId: "art_1",
      contentHash: "b".repeat(64),
      category: "editing_assistance",
    });
    expect(claim.claim_value.detection).toBe(false);
    expect(claim.claim_value.assertion_class).toBe("disclosure");

    const overstated = assertClaimDoesNotOverstate("ai_assistance_disclosed", "ai_generated_true");
    expect(overstated.ok).toBe(false);
  });

  it("identity verification claim type is separate from creator attestation", () => {
    expect(PROVENANCE_CLAIM_SEMANTICS.creator_attested.does_not_establish).toContain("identity_verified");
  });

  it("authorship attestation does not imply rights verification", () => {
    expect(PROVENANCE_CLAIM_SEMANTICS.creator_attested.does_not_establish).toContain("rights_holder_verified");
  });

  it("artifact fingerprints are deterministic", () => {
    const bytes = Buffer.from("reference-photo-bytes");
    const a = fingerprintArtifact({ content: bytes, contentType: "image/jpeg" });
    const b = fingerprintArtifact({ content: bytes, contentType: "image/jpeg" });
    expect(a.content_hash).toBe(b.content_hash);
    expect(a.content_hash).toMatch(/^[a-f0-9]{64}$/);
  });

  it("altered artifact does not inherit source integrity", () => {
    const flow = runReferenceProvenanceFlow({
      subjectId: "creator_1",
      artifactId: "photo_1",
      photoBytes: Buffer.from("original-photo"),
      aiCategory: "none_declared",
    });
    expect(flow.marketplaceEval.approved).toBe(true);
    expect(flow.tamperedEval.approved).toBe(false);
    expect(flow.tamperedEval.reason_codes).toContain("source_integrity_mismatch");
  });

  it("narrow partner result path does not expose raw evidence in claim builders", () => {
    const claim = aiAssistanceDisclosedClaim({
      subjectId: "subj_1",
      artifactId: "art_1",
      contentHash: "c".repeat(64),
      category: "none_declared",
    });
    const serialized = JSON.stringify(claim);
    expect(serialized).not.toContain("BEGIN PRIVATE KEY");
    expect(serialized).not.toContain("image/jpeg;base64");
    expect(serialized).not.toMatch(/[A-Za-z0-9+/]{200,}/);
  });

  it("public receipt view remains compatible and hash-only", () => {
    const payload = buildCanonicalPayload({
      receipt_id: "dr_test",
      decision_id: "dec_test",
      policy_id: "partner-content_ai_disclosure-v1",
      policy_version: 1,
      partner_id: "reference-photo-publisher",
      subject_pseudonym_id: "pseudo_1",
      wallet_binding_ref: null,
      consent_receipt_id: "consent_1",
      decision_result: "approved",
      reason_codes: [],
      evaluated_claim_refs: [{
        claim_id: "claim_1",
        claim_type: "ai_assistance_disclosed",
        issuer_id: "issuer:abraxas",
        status: "active",
        issued_at: new Date().toISOString(),
        expires_at: null,
      }],
      issuer_refs: ["issuer:abraxas"],
      decision_context: "sandbox_only",
      evaluated_at: new Date().toISOString(),
      expires_at: null,
    });

    expect(payload.schema_version).toBe(DECISION_RECEIPT_SCHEMA_VERSION);
    expect(hashCanonicalPayload(payload)).toMatch(/^[a-f0-9]{64}$/);

    const publicView = {
      ...payload,
      status: "active" as const,
      payload_hash: hashCanonicalPayload(payload),
      signature: "sig",
      signing_key_id: "key_1",
      signature_valid: true,
      production_usable: false,
      anchor_reference: null,
      artifact_type: "eligibility_decision_receipt" as const,
    };

    expect(provenanceReceiptIsPublicSafe(publicView)).toBe(true);
    expect(JSON.stringify(publicView)).not.toContain("legal name");
  });

  it("provenance policy packs exist with selective disclosure profiles", () => {
    expect(POLICY_PACKS.content_ai_disclosure.disclosed_result).toBe("ai_assistance_disclosed");
    expect(POLICY_PACKS.content_source_integrity.disclosed_result).toBe("source_integrity_verified");
    expect(SELECTIVE_DISCLOSURE_PROFILES.content_ai_disclosure.withheld).toContain("raw image or manuscript");
  });

  it("reference flow demonstrates reuse across relying parties", () => {
    const flow = runReferenceProvenanceFlow({
      subjectId: "creator_1",
      artifactId: "photo_1",
      photoBytes: Buffer.from("same-photo"),
      aiCategory: "editing_assistance",
    });

    expect(flow.publisherEval.approved).toBe(true);
    expect(flow.publisherEval.disclosed_result).toBe("ai_assistance_disclosed");
    expect(flow.publisherPreview?.not_shared).toContain("raw source file");
    expect(flow.marketplaceEval.approved).toBe(true);
  });

  it("evaluation fails closed without required claim", () => {
    const result = evaluateProvenancePolicy({
      policyPackId: "content_ai_disclosure",
      claims: [],
    });
    expect(result.approved).toBe(false);
    expect(result.reason_codes).toContain("missing_required_provenance_claim");
  });

  it("claims cannot exceed evidence — semantic guard on disclosed results", () => {
    for (const semantics of Object.values(PROVENANCE_CLAIM_SEMANTICS)) {
      for (const forbidden of semantics.does_not_establish) {
        const check = assertClaimDoesNotOverstate(semantics.claim_type, forbidden);
        expect(check.ok).toBe(false);
      }
    }
  });
});

describe("Good Trouble regression guard", () => {
  it("age eligibility packs remain unchanged", () => {
    expect(POLICY_PACKS.age_21_retail.disclosed_result).toBe("age_eligible_21");
    expect(POLICY_PACKS.age_21_retail.required_claims).toContain("identity_verified");
  });

  it("provenance packs do not alter Good Trouble policy ids", () => {
    expect(POLICY_PACKS.content_ai_disclosure.id).toBe("content_ai_disclosure");
    expect(POLICY_PACKS.content_ai_disclosure.rules.minimum_age).toBeUndefined();
  });
});
