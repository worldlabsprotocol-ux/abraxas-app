// FILE: lib/institutionalVerification/build586.trustBootstrap.test.ts

import { describe, expect, it } from "vitest";
import {
  BUILD_546_PRIMARY_KEY,
  BUILD_546_UNKNOWN_KEY,
  build546TrustRegistryEnv,
} from "@/lib/institutionalCertification/build546/fixtures";
import { DECISION_RECEIPT_SCHEMA_VERSION } from "@/lib/decisionReceipts/types";
import {
  digestReceiptVerificationKeyDocument,
  fetchVerifiedReceiptKeyDocument,
  resolveInstitutionalTrustEnv,
  validateInstitutionReceiptVerificationRegistryJson,
} from "@/lib/institutionalVerification";

describe("Build #586 trust bootstrap security", () => {
  it("rejects network fetch without digest pin", async () => {
    const result = await fetchVerifiedReceiptKeyDocument({
      originUrl: "https://example.com",
      pinnedDigest: "",
      fetchFn: async () =>
        new Response(JSON.stringify({ document: "abraxas_receipt_verification_keys", keys: [] }), { status: 200 }),
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe("pin_required");
  });

  it("rejects resolveInstitutionalTrustEnv network bootstrap without pin", async () => {
    const result = await resolveInstitutionalTrustEnv({
      trust_origin_url: "https://example.com",
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe("pin_required");
  });

  it("rejects self-consistent forged registry with wrong pin", async () => {
    const env = build546TrustRegistryEnv();
    const registry = env.ABRAXAS_RECEIPT_VERIFICATION_REGISTRY;
    const validated = validateInstitutionReceiptVerificationRegistryJson(registry);
    expect(validated.ok).toBe(true);
    if (!validated.ok) return;

    const forgedKey = {
      key_id: BUILD_546_UNKNOWN_KEY.signingKeyId,
      algorithm: "Ed25519",
      environment: "demo",
      status: "active",
      public_jwk: { kty: "OKP", crv: "Ed25519", x: BUILD_546_UNKNOWN_KEY.publicKeyJwk.x },
      fingerprint: "deadbeef",
      issued_at: "2024-01-01T00:00:00.000Z",
      not_before: "2024-01-01T00:00:00.000Z",
      expires_at: "2099-01-01T00:00:00.000Z",
      schema_versions: [DECISION_RECEIPT_SCHEMA_VERSION],
      issuer_label: "Attacker",
      reason_class: "active",
    };
    const bad = validateInstitutionReceiptVerificationRegistryJson(JSON.stringify([forgedKey]));
    expect(bad.ok).toBe(false);

    const fetchResult = await fetchVerifiedReceiptKeyDocument({
      originUrl: "https://attacker.example",
      pinnedDigest: "0000000000000000000000000000000000000000000000000000000000000000",
      fetchFn: async () =>
        new Response(
          JSON.stringify({
            document: "abraxas_receipt_verification_keys",
            algorithm: "Ed25519",
            environment: "demo",
            schema_versions: [DECISION_RECEIPT_SCHEMA_VERSION],
            notice: "forged",
            keys: [
              {
                ...forgedKey,
                fingerprint: undefined,
              },
            ],
          }),
          { status: 200 },
        ),
    });
    expect(fetchResult.ok).toBe(false);
  });

  it("accepts offline pinned registry and supports rotation via new pin", () => {
    const env = build546TrustRegistryEnv();
    const first = validateInstitutionReceiptVerificationRegistryJson(env.ABRAXAS_RECEIPT_VERIFICATION_REGISTRY);
    expect(first.ok).toBe(true);
    if (!first.ok) return;

    const rotated = JSON.parse(env.ABRAXAS_RECEIPT_VERIFICATION_REGISTRY) as Record<string, unknown>[];
    const row = { ...rotated[0] };
    row.status = "retiring";
    rotated[0] = row;
    rotated.push({
      ...row,
      key_id: "build586-rotated",
      status: "active",
      public_jwk: BUILD_546_PRIMARY_KEY.publicKeyJwk,
    });
    const second = validateInstitutionReceiptVerificationRegistryJson(JSON.stringify(rotated));
    expect(second.ok).toBe(true);
    if (second.ok) {
      expect(second.digest).not.toBe(first.digest);
    }
  });

  it("rejects private key material in registry JSON", () => {
    const leak = validateInstitutionReceiptVerificationRegistryJson(
      JSON.stringify([{ key_id: "k1", public_jwk: { kty: "OKP", crv: "Ed25519", x: BUILD_546_PRIMARY_KEY.publicKeyJwk.x, d: "secret" } }]),
    );
    expect(leak.ok).toBe(false);
  });

  it("does not accept signing-key env as trust substitute", async () => {
    const result = await resolveInstitutionalTrustEnv({
      extra_env: {
        ABRAXAS_SIGNING_KEY: JSON.stringify(BUILD_546_PRIMARY_KEY.privateKeyJwk),
        ABRAXAS_SIGNING_KEY_ID: BUILD_546_PRIMARY_KEY.signingKeyId,
      },
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe("trust_configuration_missing");
  });

  it("offline registry pin mismatch fails closed", async () => {
    const env = build546TrustRegistryEnv();
    const result = await resolveInstitutionalTrustEnv({
      receipt_verification_registry_json: env.ABRAXAS_RECEIPT_VERIFICATION_REGISTRY,
      pinned_receipt_key_document_digest: "wrong-pin",
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe("pin_mismatch");
  });

  it("digest stable for document fingerprinting", () => {
    const env = build546TrustRegistryEnv();
    const validated = validateInstitutionReceiptVerificationRegistryJson(env.ABRAXAS_RECEIPT_VERIFICATION_REGISTRY);
    expect(validated.ok).toBe(true);
    if (!validated.ok) return;
    const doc = {
      document: "abraxas_receipt_verification_keys" as const,
      algorithm: "Ed25519" as const,
      environment: "demo" as const,
      schema_versions: [DECISION_RECEIPT_SCHEMA_VERSION],
      notice: "test",
      keys: validated.keys.map((key) => ({
        key_id: key.key_id,
        algorithm: key.algorithm,
        public_jwk: key.public_jwk,
        fingerprint: key.fingerprint,
        environment: key.environment,
        status: key.status,
        issued_at: key.issued_at,
        not_before: key.not_before,
        expires_at: key.expires_at,
        issuer_label: key.issuer_label,
        schema_versions: key.schema_versions,
        reason_class: key.reason_class,
      })),
    };
    expect(digestReceiptVerificationKeyDocument(doc)).toBe(validated.digest);
  });
});
