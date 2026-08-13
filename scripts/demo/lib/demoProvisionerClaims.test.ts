// FILE: scripts/demo/lib/demoProvisionerClaims.test.ts

import { describe, expect, it } from "vitest";
import {
  manualApprovedClaims,
  walletBindingClaim,
  CLAIM_ISSUERS,
} from "@/lib/credentials/claimSchema";
import { SANDBOX_ISSUER_ID, sandboxClaimMetadata } from "@/lib/credentials/sandboxClaims";
import {
  buildManualProvisionerClaims,
  buildSandboxScreeningClaim,
} from "./demoProvisionerClaims";
import {
  DEMO_SYNTHETIC_DOCUMENT_TYPE,
  DEMO_SYNTHETIC_JURISDICTION,
  sandboxEvidenceReference,
} from "./demoProvisionerConfig";
import { deriveSubjectIdFromProvisionId } from "./demoProvisionerSubject";

describe("demoProvisionerClaims parity", () => {
  const provisionId = "22222222-2222-4222-8222-222222222222";
  const subjectId = deriveSubjectIdFromProvisionId(provisionId);
  const jti = `urn:uuid:${provisionId}`;
  const expiresAt = new Date("2027-01-01T00:00:00.000Z");
  const issuedAt = new Date("2026-01-01T00:00:00.000Z");

  it("matches manualApprovedClaims + wallet binding semantics", () => {
    const expectedManual = manualApprovedClaims({
      subjectId,
      jti,
      jurisdiction: DEMO_SYNTHETIC_JURISDICTION,
      documentType: DEMO_SYNTHETIC_DOCUMENT_TYPE,
      reviewId: provisionId,
      expiresAt,
    });
    const expectedWallet = walletBindingClaim({
      subjectId,
      walletAddress: subjectId,
      bindingMethod: "zklogin",
    });

    const built = buildManualProvisionerClaims({
      subjectId,
      jti,
      provisionId,
      expiresAt,
      issuedAt,
    });

    expect(built).toHaveLength(expectedManual.length + 1);

    for (const claim of expectedManual) {
      const actual = built.find((row) => row.claim_type === claim.claim_type);
      expect(actual).toBeDefined();
      expect(actual?.issuer_id).toBe(claim.issuer_id);
      expect(actual?.assurance_level).toBe(claim.assurance_level);
      expect(actual?.policy_scope).toBe(claim.policy_scope);
      expect(actual?.evidence_reference).toBe(claim.evidence_reference);
      expect(actual?.claim_value).toEqual(claim.claim_value);
      expect(actual?.expires_at).toBe(claim.expires_at);
      expect(actual?.issued_at).toBe(issuedAt.toISOString());
      expect(actual?.revocation_reference).toBeNull();
      expect(actual?.credential_jti).toBe(jti);
      expect(actual?.jurisdiction).toBe(claim.jurisdiction);
    }

    const wallet = built.find((claim) => claim.claim_type === "wallet_binding_confirmed");
    expect(wallet?.issuer_id).toBe(expectedWallet.issuer_id);
    expect(wallet?.assurance_level).toBe(expectedWallet.assurance_level);
    expect(wallet?.policy_scope).toBe(expectedWallet.policy_scope);
    expect(wallet?.claim_value).toEqual(expectedWallet.claim_value);
    expect(wallet?.expires_at).toBeNull();
    expect(wallet?.credential_jti).toBeNull();
    expect(wallet?.evidence_reference).toBeNull();
  });

  it("documents intentional manual screening pending claim (not policy-satisfying)", () => {
    const built = buildManualProvisionerClaims({
      subjectId,
      jti,
      provisionId,
      expiresAt,
      issuedAt,
    });
    const pending = built.find((claim) => claim.claim_type === "screening_outcome");
    expect(pending?.claim_value.outcome).toBe("pending_partner_screen");
    expect(pending?.issuer_id).toBe(CLAIM_ISSUERS.manual);
    expect(pending?.policy_scope).toBe("compliance");
  });

  it("builds sandbox screening clear claim matching applySandboxScreeningClear semantics", () => {
    const createdAt = new Date("2026-06-01T12:00:00.000Z");
    const claim = buildSandboxScreeningClaim({ subjectId, provisionId, createdAt });

    expect(claim.claim_type).toBe("screening_outcome");
    expect(claim.issuer_id).toBe(SANDBOX_ISSUER_ID);
    expect(claim.policy_scope).toBe("sandbox");
    expect(claim.assurance_level).toBe("L1");
    expect(claim.credential_jti).toBeNull();
    expect(claim.evidence_reference).toBe(sandboxEvidenceReference(provisionId));
    expect(claim.claim_value.outcome).toBe("clear");
    expect(claim.claim_value).toMatchObject({
      ...sandboxClaimMetadata(),
      note: "Demo screening only — not a real sanctions or AML clearance.",
      synthetic_demo_holder: true,
    });
    expect(claim.expires_at).toBe(new Date("2026-06-02T12:00:00.000Z").toISOString());

    // Intentional difference from library default reference `sandbox:demo:{timestamp}`.
    expect(claim.evidence_reference).not.toMatch(/^sandbox:demo:/);
  });

  it("documents intentional JWT synthetic marker not present on DB claims", () => {
    const built = buildManualProvisionerClaims({
      subjectId,
      jti,
      provisionId,
      expiresAt,
      issuedAt,
    });
    for (const claim of built) {
      expect(claim.claim_value.synthetic_demo_holder).not.toBe(true);
    }
  });
});
