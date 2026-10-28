// FILE: lib/institutional/mandate/signedInstitutionalMandate.adversarial.test.ts

import { describe, expect, it } from "vitest";
import { buildEvidenceCommitment } from "@abraxas/independent-verifier";
import {
  BASE_TRANSACTION,
  buildControlledMandateIssuerFixture,
  buildControlledSignedMandate,
} from "./controlledIssuerFixture";
import { verifySignedInstitutionalMandate } from "./signVerify";
import { signInstitutionalMandatePayload } from "./signVerify";
import { invokeProtectedEnforcement } from "./testEnforcementInvoke";

const NOW = new Date("2026-06-15T12:00:00.000Z");
const RECEIPT_MODE = "mandate_and_abraxas_receipt" as const;

describe("Build 885 signed institutional mandate adversarial", () => {
  const fixture = buildControlledMandateIssuerFixture();

  it("permits valid authorized mandate with matching transaction", () => {
    const signed = buildControlledSignedMandate({ fixture });
    const result = invokeProtectedEnforcement({
      fixture,
      signed,
      transaction: BASE_TRANSACTION,
      now: NOW,
      mode: RECEIPT_MODE,
      receipt: "auto_binding",
    });
    expect(result.enforcement_action).toBe("permit");
  });

  it("rejects valid signature from unauthorized receipt-only issuer key", () => {
    const signed = buildControlledSignedMandate({ fixture, signWith: "receipt_only" });
    const verified = verifySignedInstitutionalMandate({
      signed,
      signedIssuerAuthority: fixture.signedIssuerAuthority,
      trustAnchorPublicJwk: fixture.trustAnchorPublicJwk,
      environment: "demo",
      now: NOW,
    });
    expect(verified.ok).toBe(false);
    if (!verified.ok) {
      expect(verified.reason).toBe("issuer_not_authorized_for_mandate_class");
      expect(verified.trust_boundary).toBe("mandate_issuer_authority");
    }
  });

  it("rejects invalid issuer signature", () => {
    const signed = buildControlledSignedMandate({ fixture });
    const tampered = { ...signed, signature: signed.signature.slice(0, -4) + "AAAA" };
    const verified = verifySignedInstitutionalMandate({
      signed: tampered,
      signedIssuerAuthority: fixture.signedIssuerAuthority,
      trustAnchorPublicJwk: fixture.trustAnchorPublicJwk,
      environment: "demo",
      now: NOW,
    });
    expect(verified.ok).toBe(false);
  });

  it("rejects unknown signing key not in issuer authority statement", () => {
    const signed = buildControlledSignedMandate({ fixture, signWith: "unknown" });
    const verified = verifySignedInstitutionalMandate({
      signed,
      signedIssuerAuthority: fixture.signedIssuerAuthority,
      trustAnchorPublicJwk: fixture.trustAnchorPublicJwk,
      environment: "demo",
      now: NOW,
    });
    expect(verified.ok).toBe(false);
    if (!verified.ok) expect(verified.reason).toBe("unknown_key");
  });

  it("rejects unauthorized actor and wallet mismatch", () => {
    const signed = buildControlledSignedMandate({ fixture });
    const wrongActor = invokeProtectedEnforcement({
      fixture,
      signed,
      transaction: { ...BASE_TRANSACTION, actor_wallet: "WrongWallet99999999999999999999999999999999" },
      now: NOW,
      mode: RECEIPT_MODE,
      receipt: "auto_binding",
    });
    expect(wrongActor.enforcement_action).toBe("deny");
    expect(wrongActor.reasons).toContain("actor_not_authorized");
  });

  it("rejects wrong action type, amount, destination, tenant, and policy version", () => {
    const signed = buildControlledSignedMandate({ fixture });

    expect(
      invokeProtectedEnforcement({
        fixture,
        signed,
        transaction: { ...BASE_TRANSACTION, amount_usd: 999_999 },
        now: NOW,
        mode: RECEIPT_MODE,
        receipt: "auto_binding",
      }).reasons,
    ).toContain("amount_exceeds_mandate");

    expect(
      invokeProtectedEnforcement({
        fixture,
        signed,
        transaction: { ...BASE_TRANSACTION, destination_fingerprint: "other_dest" },
        now: NOW,
        mode: RECEIPT_MODE,
        receipt: "auto_binding",
      }).enforcement_action,
    ).toBe("deny");

    expect(
      invokeProtectedEnforcement({
        fixture,
        signed,
        transaction: { ...BASE_TRANSACTION, tenant_id: "other_tenant" },
        now: NOW,
        mode: RECEIPT_MODE,
        receipt: "auto_binding",
      }).enforcement_action,
    ).toBe("deny");

    expect(
      invokeProtectedEnforcement({
        fixture,
        signed,
        transaction: { ...BASE_TRANSACTION, policy_version: 99 },
        now: NOW,
        mode: RECEIPT_MODE,
        receipt: "auto_binding",
      }).reasons,
    ).toContain("policy_version_mismatch");
  });

  it("rejects expired, not-yet-effective, and revoked mandates", () => {
    const expired = buildControlledSignedMandate({
      fixture,
      overrides: { not_after: "2026-06-01T00:00:00.000Z" },
    });
    expect(
      verifySignedInstitutionalMandate({
        signed: expired,
        signedIssuerAuthority: fixture.signedIssuerAuthority,
        trustAnchorPublicJwk: fixture.trustAnchorPublicJwk,
        environment: "demo",
        now: NOW,
      }).ok,
    ).toBe(false);

    const future = buildControlledSignedMandate({
      fixture,
      overrides: { not_before: "2026-12-01T00:00:00.000Z" },
    });
    expect(
      verifySignedInstitutionalMandate({
        signed: future,
        signedIssuerAuthority: fixture.signedIssuerAuthority,
        trustAnchorPublicJwk: fixture.trustAnchorPublicJwk,
        environment: "demo",
        now: NOW,
      }).ok,
    ).toBe(false);

    const revoked = buildControlledSignedMandate({
      fixture,
      overrides: { revoked_at: "2026-06-01T00:00:00.000Z" },
    });
    expect(
      verifySignedInstitutionalMandate({
        signed: revoked,
        signedIssuerAuthority: fixture.signedIssuerAuthority,
        trustAnchorPublicJwk: fixture.trustAnchorPublicJwk,
        environment: "demo",
        now: NOW,
      }).ok,
    ).toBe(false);
  });

  it("rejects stale issuer key and receipt tampering / unverified receipt", () => {
    const signed = buildControlledSignedMandate({ fixture });
    const stalePayload = {
      ...fixture.signedIssuerAuthority.payload,
      keys: fixture.signedIssuerAuthority.payload.keys.map((k) =>
        k.key_id === fixture.mandateIssuerKey.signingKeyId ? { ...k, status: "revoked" as const } : k,
      ),
    };
    const staleStatement = {
      ...fixture.signedIssuerAuthority,
      payload: stalePayload,
    };
    expect(
      verifySignedInstitutionalMandate({
        signed,
        signedIssuerAuthority: staleStatement,
        trustAnchorPublicJwk: fixture.trustAnchorPublicJwk,
        environment: "demo",
        now: NOW,
      }).ok,
    ).toBe(false);

    const unverified = invokeProtectedEnforcement({
      fixture,
      signed,
      transaction: BASE_TRANSACTION,
      now: NOW,
      mode: RECEIPT_MODE,
      receipt: {
        cryptographically_verified: false,
        outcome: "permit",
        policy_id: signed.payload.policy_id,
        policy_version: signed.payload.policy_version,
      },
    });
    expect(unverified.enforcement_action).toBe("indeterminate");
    expect(unverified.reasons).toContain("receipt_not_independently_verified");
  });

  it("rejects receipt policy mismatch and mandate evidence binding failure", () => {
    const signed = buildControlledSignedMandate({ fixture });
    const manifest = [{ dependency_type: "reusable_fact" as const, fact_id: "other_mandate", source_credential_id: null }];
    const commitment = buildEvidenceCommitment(manifest);
    const mismatch = invokeProtectedEnforcement({
      fixture,
      signed,
      transaction: BASE_TRANSACTION,
      now: NOW,
      mode: RECEIPT_MODE,
      receipt: {
        cryptographically_verified: true,
        outcome: "permit",
        policy_id: "wrong_policy",
        policy_version: 1,
        evidence_commitment: commitment,
        evidence_manifest: manifest,
      },
    });
    expect(mismatch.enforcement_action).toBe("indeterminate");
    expect(mismatch.reasons).toContain("receipt_policy_mismatch");

    const badBinding = invokeProtectedEnforcement({
      fixture,
      signed,
      transaction: BASE_TRANSACTION,
      now: NOW,
      mode: RECEIPT_MODE,
      receipt: {
        cryptographically_verified: true,
        outcome: "permit",
        policy_id: signed.payload.policy_id,
        policy_version: signed.payload.policy_version,
        evidence_commitment: commitment,
        evidence_manifest: manifest,
      },
    });
    expect(badBinding.reasons).toContain("receipt_not_bound_to_mandate");
  });

  it("fail-closed when independent receipt required but missing", () => {
    const signed = buildControlledSignedMandate({ fixture });
    const result = invokeProtectedEnforcement({
      fixture,
      signed,
      transaction: BASE_TRANSACTION,
      now: NOW,
      mode: RECEIPT_MODE,
      receipt: null,
    });
    expect(result.enforcement_action).toBe("indeterminate");
    expect(result.reasons).toContain("independent_receipt_required");
  });

  it("rejects payload tampering after signing", () => {
    const signed = buildControlledSignedMandate({ fixture });
    const reSigned = signInstitutionalMandatePayload({
      payload: { ...signed.payload, max_amount_usd: 1 },
      mandateIssuerPrivateJwk: fixture.mandateIssuerKey.privateKeyJwk,
      signingKeyId: fixture.mandateIssuerKey.signingKeyId,
    });
    const swapped = { ...signed, payload: reSigned.payload };
    const verified = verifySignedInstitutionalMandate({
      signed: swapped,
      signedIssuerAuthority: fixture.signedIssuerAuthority,
      trustAnchorPublicJwk: fixture.trustAnchorPublicJwk,
      environment: "demo",
      now: NOW,
    });
    expect(verified.ok).toBe(false);
    if (!verified.ok) expect(verified.reason).toBe("mandate_payload_hash_mismatch");
  });
});
