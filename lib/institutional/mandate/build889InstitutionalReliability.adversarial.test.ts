// FILE: lib/institutional/mandate/build889InstitutionalReliability.adversarial.test.ts
// Build 889 — consolidated adversarial proofs on merged 885/886 enforcement.

import { describe, expect, it } from "vitest";
import {
  BASE_TRANSACTION,
  buildControlledMandateIssuerFixture,
  buildControlledSignedMandate,
  sealedExecution,
  trustedPolicyForMandate,
} from "./controlledIssuerFixture";
import { enforceProtectedInstitutionalAction } from "./enforceInstitutionalAction";
import { invokeProtectedEnforcement } from "./testEnforcementInvoke";
import { verifySignedInstitutionalMandate } from "./signVerify";

const NOW = new Date("2026-06-15T12:00:00.000Z");

describe("Build 889 institutional reliability adversarial", () => {
  const fixture = buildControlledMandateIssuerFixture();

  it("rejects valid signature from unauthorized issuer (receipt-only key)", () => {
    const signed = buildControlledSignedMandate({ fixture, signWith: "receipt_only" });
    const verified = verifySignedInstitutionalMandate({
      signed,
      signedIssuerAuthority: fixture.signedIssuerAuthority,
      trustAnchorPublicJwk: fixture.trustAnchorPublicJwk,
      environment: "demo",
      now: NOW,
    });
    expect(verified.ok).toBe(false);
    if (!verified.ok) expect(verified.reason).toBe("issuer_not_authorized_for_mandate_class");
  });

  it("rejects unrelated transaction amounts against sealed execution context", () => {
    const signed = buildControlledSignedMandate({ fixture });
    const sealed = sealedExecution(BASE_TRANSACTION);
    const tampered = {
      ...sealed,
      transaction: { ...BASE_TRANSACTION, amount_usd: 999_999 },
    };
    const result = enforceProtectedInstitutionalAction({
      signedMandate: signed,
      signedIssuerAuthority: fixture.signedIssuerAuthority,
      trustAnchorPublicJwk: fixture.trustAnchorPublicJwk,
      trustedEnforcementPolicy: trustedPolicyForMandate(signed.payload, "mandate_only"),
      trustedExecution: tampered,
      now: NOW,
    });
    expect(result.enforcement_action).toBe("indeterminate");
    expect(result.reasons).toContain("protected_transaction_context_digest_mismatch");
  });

  it("rejects mandate_and_abraxas_receipt when independent receipt is absent", () => {
    const signed = buildControlledSignedMandate({ fixture });
    const result = invokeProtectedEnforcement({
      fixture,
      signed,
      transaction: BASE_TRANSACTION,
      now: NOW,
      mode: "mandate_and_abraxas_receipt",
      receipt: null,
    });
    expect(result.enforcement_action).not.toBe("permit");
  });
});
