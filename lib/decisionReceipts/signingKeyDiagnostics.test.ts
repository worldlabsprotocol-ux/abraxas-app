// FILE: lib/decisionReceipts/signingKeyDiagnostics.test.ts

import { describe, expect, it, beforeEach, afterEach } from "vitest";
import nacl from "tweetnacl";
import {
  evaluateReceiptSigningHealth,
  signingHealthResponseHasNoSecrets,
} from "@/lib/decisionReceipts/signingKeyDiagnostics";
import { generateTestSigningKeyPair } from "@/lib/decisionReceipts/signing";

function base64UrlEncode(bytes: Uint8Array): string {
  return Buffer.from(bytes).toString("base64url");
}

function envFromKeyPair(keyPair: ReturnType<typeof generateTestSigningKeyPair>) {
  return {
    ABRAXAS_SIGNING_KEY: JSON.stringify(keyPair.privateKeyJwk),
    ABRAXAS_PUBLIC_KEY: JSON.stringify(keyPair.publicKeyJwk),
  };
}

describe("signingKeyDiagnostics", () => {
  afterEach(() => {
    delete process.env.ABRAXAS_SIGNING_KEY;
    delete process.env.ABRAXAS_PUBLIC_KEY;
  });

  it("reports aligned pair as healthy", () => {
    const keyPair = generateTestSigningKeyPair();
    const report = evaluateReceiptSigningHealth(envFromKeyPair(keyPair));
    expect(report).toEqual({
      ok: true,
      signing_key_configured: true,
      signing_key_parse_ok: true,
      public_key_configured: true,
      public_key_parse_ok: true,
      seed_matches_embedded_x: true,
      seed_matches_public_env: true,
      receipt_env_roundtrip_ok: true,
    });
    expect(signingHealthResponseHasNoSecrets(report)).toBe(true);
  });

  it("detects mismatched private seed against public env", () => {
    const aligned = generateTestSigningKeyPair();
    const mismatched = generateTestSigningKeyPair();
    const report = evaluateReceiptSigningHealth({
      ABRAXAS_SIGNING_KEY: JSON.stringify({
        ...aligned.privateKeyJwk,
        d: mismatched.privateKeyJwk.d,
      }),
      ABRAXAS_PUBLIC_KEY: JSON.stringify(aligned.publicKeyJwk),
    });

    expect(report.signing_key_parse_ok).toBe(true);
    expect(report.public_key_parse_ok).toBe(true);
    expect(report.seed_matches_embedded_x).toBe(false);
    expect(report.seed_matches_public_env).toBe(false);
    expect(report.receipt_env_roundtrip_ok).toBe(false);
    expect(report.ok).toBe(false);
  });

  it("detects embedded x that does not match private seed", () => {
    const aligned = generateTestSigningKeyPair();
    const other = generateTestSigningKeyPair();
    const report = evaluateReceiptSigningHealth({
      ABRAXAS_SIGNING_KEY: JSON.stringify({
        ...aligned.privateKeyJwk,
        x: other.publicKeyJwk.x,
      }),
      ABRAXAS_PUBLIC_KEY: JSON.stringify(aligned.publicKeyJwk),
    });

    expect(report.seed_matches_embedded_x).toBe(false);
    expect(report.seed_matches_public_env).toBe(true);
    expect(report.receipt_env_roundtrip_ok).toBe(true);
    expect(report.ok).toBe(false);
  });

  it("fails closed when keys are missing or malformed", () => {
    expect(evaluateReceiptSigningHealth({})).toMatchObject({
      ok: false,
      signing_key_configured: false,
      public_key_configured: false,
    });

    const report = evaluateReceiptSigningHealth({
      ABRAXAS_SIGNING_KEY: "{not-json",
      ABRAXAS_PUBLIC_KEY: JSON.stringify({ kty: "RSA" }),
    });
    expect(report.signing_key_parse_ok).toBe(false);
    expect(report.public_key_parse_ok).toBe(false);
    expect(report.ok).toBe(false);
  });

  it("does not expose secret material in health report fields", () => {
    const keyPair = generateTestSigningKeyPair();
    const report = evaluateReceiptSigningHealth(envFromKeyPair(keyPair));
    const serialized = JSON.stringify(report);

    expect(signingHealthResponseHasNoSecrets(report)).toBe(true);
    expect(serialized).not.toContain('"d"');
    expect(serialized).not.toContain('"x"');
    expect(serialized).not.toContain(keyPair.privateKeyJwk.d);
    expect(serialized).not.toContain(keyPair.publicKeyJwk.x);
    expect(serialized).not.toMatch(/[0-9a-f]{64}/i);
  });

  it("rejects non-boolean or forbidden keys in response guard", () => {
    expect(signingHealthResponseHasNoSecrets({ ok: true, thumbprint: "abc" })).toBe(false);
    expect(signingHealthResponseHasNoSecrets({ ok: "true" })).toBe(false);
  });

  it("derives public x from seed consistently", () => {
    const seed = nacl.randomBytes(32);
    const keyPair = nacl.sign.keyPair.fromSeed(seed);
    const privateJwk: JsonWebKey = {
      kty: "OKP",
      crv: "Ed25519",
      x: base64UrlEncode(keyPair.publicKey),
      d: base64UrlEncode(seed),
    };
    const report = evaluateReceiptSigningHealth({
      ABRAXAS_SIGNING_KEY: JSON.stringify(privateJwk),
      ABRAXAS_PUBLIC_KEY: JSON.stringify({
        kty: "OKP",
        crv: "Ed25519",
        x: base64UrlEncode(keyPair.publicKey),
      }),
    });
    expect(report.ok).toBe(true);
  });
});
