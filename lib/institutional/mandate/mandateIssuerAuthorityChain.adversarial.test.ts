// FILE: lib/institutional/mandate/mandateIssuerAuthorityChain.adversarial.test.ts
// Build 886 Track B — issuer capability via cryptographic issuer authority chain only.

import { describe, expect, it } from "vitest";
import { signIssuerAuthorityPayload } from "@/lib/persistence/boundary/issuerAuthority/signVerify";
import { verifySignedIssuerAuthorityStatement } from "@/lib/persistence/boundary/issuerAuthority/signVerify";
import {
  buildControlledMandateIssuerFixture,
  buildControlledSignedMandate,
} from "./controlledIssuerFixture";
import { verifySignedInstitutionalMandate } from "./signVerify";

const NOW = new Date("2026-06-15T12:00:00.000Z");

describe("mandate issuer authority chain", () => {
  it("rejects mandate when issuer authority statement signature is invalid", () => {
    const fixture = buildControlledMandateIssuerFixture();
    const signed = buildControlledSignedMandate({ fixture });
    const badStatement = {
      ...fixture.signedIssuerAuthority,
      signature: `${fixture.signedIssuerAuthority.signature.slice(0, -4)}BBBB`,
    };
    const result = verifySignedInstitutionalMandate({
      signed,
      signedIssuerAuthority: badStatement,
      trustAnchorPublicJwk: fixture.trustAnchorPublicJwk,
      environment: "demo",
      now: NOW,
    });
    expect(result.ok).toBe(false);
  });

  it("rejects mandate when anchor-trust statement fails standalone verification", () => {
    const fixture = buildControlledMandateIssuerFixture();
    const verified = verifySignedIssuerAuthorityStatement({
      statement: fixture.signedIssuerAuthority,
      trustAnchorPublicJwk: fixture.trustAnchorPublicJwk,
    });
    expect(verified.ok).toBe(true);

    const wrongAnchor = { ...fixture.trustAnchorPublicJwk, x: "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA" };
    const fail = verifySignedIssuerAuthorityStatement({
      statement: fixture.signedIssuerAuthority,
      trustAnchorPublicJwk: wrongAnchor,
    });
    expect(fail.ok).toBe(false);
  });

  it("rejects expired mandate issuer key in current_authorization mode", () => {
    const fixture = buildControlledMandateIssuerFixture();
    const signed = buildControlledSignedMandate({ fixture });
    const payload = {
      ...fixture.signedIssuerAuthority.payload,
      keys: fixture.signedIssuerAuthority.payload.keys.map((k) =>
        k.key_id === fixture.mandateIssuerKey.signingKeyId
          ? { ...k, expires_at: "2020-01-01T00:00:00.000Z" }
          : k,
      ),
    };
    const resigned = signIssuerAuthorityPayload(payload, fixture.anchorKey.privateKeyJwk);
    const result = verifySignedInstitutionalMandate({
      signed,
      signedIssuerAuthority: resigned,
      trustAnchorPublicJwk: fixture.trustAnchorPublicJwk,
      environment: "demo",
      now: NOW,
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toBe("issuer_expired");
  });
});
