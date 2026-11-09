import { describe, expect, it } from "vitest";
import { generateTestSigningKeyPair } from "@/lib/decisionReceipts/signing";
import { DECISION_RECEIPT_SCHEMA_VERSION } from "@/lib/decisionReceipts/types";
import { publicReceiptJwkFingerprint } from "@/lib/decisionReceipts/verificationKeyLifecycle/fingerprint";
import { resolveReceiptKeyRuntimeEnvironment } from "@/lib/decisionReceipts/verificationKeyLifecycle/environment";
import { publishSignedIssuerAuthorityFromRegistry } from "@/lib/persistence/boundary/issuerAuthority/buildFromRegistry";
import { resolveIssuerKeyFromSignedStatement } from "@/lib/persistence/boundary/issuerAuthority/resolveIssuerKey";

const RECEIPT_KEY = generateTestSigningKeyPair();
const ANCHOR_KEY = generateTestSigningKeyPair();

function registryEnv(environment: "demo" | "production"): Record<string, string> {
  const pub = RECEIPT_KEY.publicKeyJwk;
  return {
    ABRAXAS_SIGNING_KEY: JSON.stringify(RECEIPT_KEY.privateKeyJwk),
    ABRAXAS_SIGNING_KEY_ID: RECEIPT_KEY.signingKeyId,
    ABRAXAS_RECEIPT_VERIFICATION_REGISTRY: JSON.stringify([
      {
        key_id: RECEIPT_KEY.signingKeyId,
        environment,
        status: "active",
        public_jwk: pub,
        fingerprint: publicReceiptJwkFingerprint(pub as { kty: "OKP"; crv: "Ed25519"; x: string }),
        issued_at: "2020-01-01T00:00:00.000Z",
        not_before: "2020-01-01T00:00:00.000Z",
        expires_at: null,
        schema_versions: [DECISION_RECEIPT_SCHEMA_VERSION],
        reason_class: "active",
        allow_historical_verification: false,
        historical_verify_until: null,
      },
    ]),
    ...(environment === "production"
      ? { VERCEL_ENV: "production" }
      : { ABRAXAS_RUNTIME_ENV: "demo", VERCEL_ENV: "production" }),
  };
}

function publish(env: Record<string, string>) {
  const signed = publishSignedIssuerAuthorityFromRegistry({
    registryVersion: 854,
    anchorKeyId: "anchor-production-check",
    anchorPrivateJwk: ANCHOR_KEY.privateKeyJwk,
    env,
  });
  if ("ok" in signed && signed.ok === false) throw new Error(signed.reason);
  return signed as Exclude<typeof signed, { ok: false; reason: string }>;
}

function resolve(statement: ReturnType<typeof publish>, environment: "demo" | "production") {
  return resolveIssuerKeyFromSignedStatement({
    statement,
    trustAnchorPublicJwk: ANCHOR_KEY.publicKeyJwk,
    keyId: RECEIPT_KEY.signingKeyId,
    schemaVersion: DECISION_RECEIPT_SCHEMA_VERSION,
    environment,
    mode: "current_authorization",
  });
}

describe("production issuer authority environment", () => {
  it("verifies a production statement under production authority", () => {
    const env = registryEnv("production");
    expect(resolveReceiptKeyRuntimeEnvironment(env)).toBe("production");
    const statement = publish(env);
    expect(statement.payload.environment).toBe("production");
    expect(resolve(statement, "production").ok).toBe(true);
  });

  it("rejects a production statement when checked as demo", () => {
    const statement = publish(registryEnv("production"));
    const result = resolve(statement, "demo");
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toBe("wrong_environment");
  });

  it("rejects a demo statement when checked as production", () => {
    const env = registryEnv("demo");
    expect(resolveReceiptKeyRuntimeEnvironment(env)).toBe("demo");
    const statement = publish(env);
    expect(statement.payload.environment).toBe("demo");
    const result = resolve(statement, "production");
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toBe("wrong_environment");
  });
});
