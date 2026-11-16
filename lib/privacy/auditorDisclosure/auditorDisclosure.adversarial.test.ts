// FILE: lib/privacy/auditorDisclosure/auditorDisclosure.adversarial.test.ts

import { describe, expect, it } from "vitest";
import {
  SELECTIVE_DISCLOSURE_SURFACES,
  SHARED_SURFACE_FIELDS,
  applyDisclosureProfile,
  detectDisclosureLeaks,
  GENERIC_MINIMAL_PROFILE,
} from "@/lib/privacy/selectiveDisclosure";
import {
  buildControlledAuditorMandateIssuerFixture,
  buildControlledSignedAuditorMandate,
  controlledAuditorReceiptRecord,
  CONTROLLED_AUDITOR_ID,
  CONTROLLED_RECEIPT_ID,
  CONTROLLED_TENANT_ID,
} from "./controlledFixture";
import { verifySignedAuditorDisclosureMandate } from "./signVerify";
import { evaluateAuditorDisclosureAccess } from "./enforceAccess";
import { signAuditorDisclosureMandatePayload } from "./signVerify";
import { auditAuditorDisclosurePayload } from "./auditPrivacy";

const NOW = new Date("2026-06-15T12:00:00.000Z");
const EXPIRED_NOW = new Date("2027-01-15T12:00:00.000Z");

function permitArgs(overrides: Partial<Parameters<typeof evaluateAuditorDisclosureAccess>[0]> = {}) {
  const fixture = buildControlledAuditorMandateIssuerFixture();
  const signed = overrides.signedMandate ?? buildControlledSignedAuditorMandate({ fixture });
  return {
    environment: "demo" as const,
    now: NOW,
    presenter_auditor_id: CONTROLLED_AUDITOR_ID,
    tenant_id: CONTROLLED_TENANT_ID,
    receipt: controlledAuditorReceiptRecord(),
    custody: {
      custody_status: "encrypted_custody" as const,
      evidence_classification: "identity_verification" as const,
      evidence_commitment: { digest: "abc123", entry_count: 2 },
    },
    request_context: {
      audience_hash: "audience_hash_demo_968",
      purpose: "regulatory_examination" as const,
    },
    principal_allowed_purposes: ["regulatory_examination"],
    ...overrides,
    signedMandate: signed,
    signedIssuerAuthority: overrides.signedIssuerAuthority ?? fixture.signedIssuerAuthority,
    trustAnchorPublicJwk: overrides.trustAnchorPublicJwk ?? fixture.trustAnchorPublicJwk,
  };
}

describe("Build 968 auditor disclosure surface", () => {
  it("registers auditor_review on SELECTIVE_DISCLOSURE_SURFACES", () => {
    expect(SELECTIVE_DISCLOSURE_SURFACES).toContain("auditor_review");
    expect(SHARED_SURFACE_FIELDS.auditor_review.length).toBeGreaterThan(
      SHARED_SURFACE_FIELDS.public_receipt.length,
    );
  });

  it("permits valid signed auditor mandate with purpose-bound disclosure", () => {
    const result = evaluateAuditorDisclosureAccess(permitArgs());
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.disclosure.disclosure_surface).toBe("auditor_review");
      expect(result.disclosure.verification_decision_id).toBe("vdec_auditor_demo_968");
      expect(result.disclosure.legal_name).toBeUndefined();
      expect(result.disclosure.storage_path).toBeUndefined();
      const scan = auditAuditorDisclosurePayload(result.disclosure);
      expect(scan.forbidden_field_count).toBe(0);
      expect(detectDisclosureLeaks(result.disclosure)).toEqual([]);
    }
  });

  it("denies when auditor role is asserted without valid mandate signature", () => {
    const fixture = buildControlledAuditorMandateIssuerFixture();
    const verified = verifySignedAuditorDisclosureMandate({
      signed: buildControlledSignedAuditorMandate({
        fixture,
        signWith: "receipt_only",
      }),
      signedIssuerAuthority: fixture.signedIssuerAuthority,
      trustAnchorPublicJwk: fixture.trustAnchorPublicJwk,
      environment: "demo",
      now: NOW,
    });
    expect(verified.ok).toBe(false);
    if (!verified.ok) {
      expect(verified.reason).toBe("issuer_not_authorized_for_auditor_mandate_class");
    }
  });

  it("denies tampered mandate payload hash", () => {
    const signed = buildControlledSignedAuditorMandate({ fixture: buildControlledAuditorMandateIssuerFixture() });
    const tampered = {
      ...signed,
      payload: { ...signed.payload, purpose: "soc2_type2" },
    };
    const verified = verifySignedAuditorDisclosureMandate({
      signed: tampered,
      signedIssuerAuthority: buildControlledAuditorMandateIssuerFixture().signedIssuerAuthority,
      trustAnchorPublicJwk: buildControlledAuditorMandateIssuerFixture().trustAnchorPublicJwk,
      environment: "demo",
      now: NOW,
    });
    expect(verified.ok).toBe(false);
    if (!verified.ok) expect(verified.reason).toBe("auditor_mandate_payload_hash_mismatch");
  });

  it("denies expired auditor mandate", () => {
    const result = evaluateAuditorDisclosureAccess(permitArgs({ now: EXPIRED_NOW }));
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toBe("auditor_mandate_expired");
  });

  it("denies revoked auditor mandate", () => {
    const fixture = buildControlledAuditorMandateIssuerFixture();
    const signed = buildControlledSignedAuditorMandate({
      fixture,
      overrides: { revoked_at: "2026-06-10T00:00:00.000Z" },
    });
    const result = evaluateAuditorDisclosureAccess({
      ...permitArgs(),
      signedMandate: signed,
      signedIssuerAuthority: fixture.signedIssuerAuthority,
      trustAnchorPublicJwk: fixture.trustAnchorPublicJwk,
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toBe("auditor_mandate_revoked");
  });

  it("denies cross-tenant access", () => {
    const result = evaluateAuditorDisclosureAccess(permitArgs({ tenant_id: "tenant_other_org" }));
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toBe("auditor_mandate_tenant_mismatch");
  });

  it("denies wrong presenter auditor id (identity correlation guard)", () => {
    const result = evaluateAuditorDisclosureAccess(permitArgs({ presenter_auditor_id: "auditor_unauthorized" }));
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toBe("auditor_mandate_actor_mismatch");
  });

  it("denies wrong resource ref (replay / wrong-purpose binding)", () => {
    const fixture = buildControlledAuditorMandateIssuerFixture();
    const signed = buildControlledSignedAuditorMandate({
      fixture,
      overrides: { resource_ref: "dr_other_receipt" },
    });
    const result = evaluateAuditorDisclosureAccess({
      ...permitArgs(),
      signedMandate: signed,
      signedIssuerAuthority: fixture.signedIssuerAuthority,
      trustAnchorPublicJwk: fixture.trustAnchorPublicJwk,
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toBe("auditor_mandate_resource_mismatch");
  });

  it("denies when simulated PII would leak through serializer", () => {
    const record = {
      ...controlledAuditorReceiptRecord(),
      partner_safe_reason: "holder email leak@example.com on file",
    };
    const result = evaluateAuditorDisclosureAccess(permitArgs({ receipt: record }));
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(["auditor_disclosure_leak_detected", "auditor_forbidden_field_scan_failed"]).toContain(result.reason);
    }
  });

  it("leaves public_receipt partner surface unchanged when auditor tier is added", () => {
    const receipt = {
      ...controlledAuditorReceiptRecord(),
      evidence_commitment: { digest: "abc", entry_count: 1 },
      auditor_purpose: "regulatory_examination",
      disclosure_mandate_id: "mandate_x",
    };
    const partner = applyDisclosureProfile(receipt, GENERIC_MINIMAL_PROFILE, "public_receipt");
    const auditor = applyDisclosureProfile(receipt, GENERIC_MINIMAL_PROFILE, "auditor_review");
    expect(partner.ok).toBe(true);
    expect(auditor.ok).toBe(true);
    if (partner.ok && auditor.ok) {
      expect(auditor.payload.evidence_commitment).toEqual({ digest: "abc", entry_count: 1 });
      expect(partner.payload.evidence_commitment).toBeUndefined();
      expect(auditor.payload.auditor_purpose).toBe("regulatory_examination");
      expect(partner.payload.auditor_purpose).toBeUndefined();
    }
  });

  it("replays mandate_id across receipts are rejected by resource binding", () => {
    const fixture = buildControlledAuditorMandateIssuerFixture();
    const signed = buildControlledSignedAuditorMandate({ fixture });
    const wrongReceipt = { ...controlledAuditorReceiptRecord(), id: "dr_replay_target" };
    const result = evaluateAuditorDisclosureAccess({
      ...permitArgs(),
      signedMandate: signed,
      signedIssuerAuthority: fixture.signedIssuerAuthority,
      trustAnchorPublicJwk: fixture.trustAnchorPublicJwk,
      receipt: wrongReceipt,
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toBe("auditor_mandate_resource_mismatch");
    expect(signed.payload.mandate_id).toBe("auditor_mandate_controlled_968_001");
    expect(signed.payload.resource_ref).toBe(CONTROLLED_RECEIPT_ID);
  });

  it("rejects invalid signature bytes", () => {
    const signed = buildControlledSignedAuditorMandate({ fixture: buildControlledAuditorMandateIssuerFixture() });
    const badSig = { ...signed, signature: signed.signature.slice(0, -4) + "AAAA" };
    const verified = verifySignedAuditorDisclosureMandate({
      signed: badSig,
      signedIssuerAuthority: buildControlledAuditorMandateIssuerFixture().signedIssuerAuthority,
      trustAnchorPublicJwk: buildControlledAuditorMandateIssuerFixture().trustAnchorPublicJwk,
      environment: "demo",
      now: NOW,
    });
    expect(verified.ok).toBe(false);
  });

  it("denies unsupported resource_kind on mandate", () => {
    const fixture = buildControlledAuditorMandateIssuerFixture();
    const signed = buildControlledSignedAuditorMandate({
      fixture,
      overrides: { resource_kind: "verification_decision" },
    });
    const result = evaluateAuditorDisclosureAccess({
      ...permitArgs(),
      signedMandate: signed,
      signedIssuerAuthority: fixture.signedIssuerAuthority,
      trustAnchorPublicJwk: fixture.trustAnchorPublicJwk,
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toBe("auditor_disclosure_resource_kind_unsupported");
  });

  it("denies revoked authoritative receipt status", () => {
    const receipt = { ...controlledAuditorReceiptRecord(), status: "revoked" as const, revoked_at: "2026-06-01T00:00:00.000Z" };
    const result = evaluateAuditorDisclosureAccess(permitArgs({ receipt }));
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toBe("authoritative_receipt_status_revoked");
  });

  it("denies when requested purpose is not authorized by mandate", () => {
    const result = evaluateAuditorDisclosureAccess(
      permitArgs({
        request_context: { audience_hash: "audience_hash_demo_968", purpose: "soc2_type2" },
        principal_allowed_purposes: ["regulatory_examination", "soc2_type2"],
      }),
    );
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toBe("disclosure_purpose_not_authorized_by_mandate");
  });

  it("denies when request audience does not match signed mandate", () => {
    const result = evaluateAuditorDisclosureAccess(
      permitArgs({
        request_context: { audience_hash: "wrong_audience", purpose: "regulatory_examination" },
      }),
    );
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toBe("auditor_mandate_audience_mismatch");
  });

  it("denies stale mandate after server revocation registry entry", () => {
    const previous = process.env.ABRAXAS_AUDITOR_DISCLOSURE_REVOKED_MANDATES;
    process.env.ABRAXAS_AUDITOR_DISCLOSURE_REVOKED_MANDATES = "auditor_mandate_controlled_968_001";
    const result = evaluateAuditorDisclosureAccess(permitArgs());
    if (previous === undefined) delete process.env.ABRAXAS_AUDITOR_DISCLOSURE_REVOKED_MANDATES;
    else process.env.ABRAXAS_AUDITOR_DISCLOSURE_REVOKED_MANDATES = previous;
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toBe("auditor_mandate_revoked_in_registry");
  });

  it("re-signing with unknown key fails closed", () => {
    const fixture = buildControlledAuditorMandateIssuerFixture();
    const payload = buildControlledSignedAuditorMandate({ fixture }).payload;
    const unknownSigned = signAuditorDisclosureMandatePayload({
      payload: { ...payload, issuer_key_id: "unknown-key" },
      mandateIssuerPrivateJwk: fixture.auditorMandateIssuerKey.privateKeyJwk,
      signingKeyId: "unknown-key",
    });
    const verified = verifySignedAuditorDisclosureMandate({
      signed: unknownSigned,
      signedIssuerAuthority: fixture.signedIssuerAuthority,
      trustAnchorPublicJwk: fixture.trustAnchorPublicJwk,
      environment: "demo",
      now: NOW,
    });
    expect(verified.ok).toBe(false);
  });
});