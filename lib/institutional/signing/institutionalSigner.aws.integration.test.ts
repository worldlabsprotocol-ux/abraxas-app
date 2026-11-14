import { createHash, randomBytes } from "node:crypto";
import { beforeAll, describe, expect, it } from "vitest";
import { GetPublicKeyCommand, SignCommand } from "@aws-sdk/client-kms";
import {
  ISSUER_AUTHORITY_STATEMENT_DOCUMENT,
  ISSUER_AUTHORITY_STATEMENT_SCHEMA_VERSION,
  verifySignedIssuerAuthorityStatement,
} from "@abraxas/independent-verifier";
import { AWS_KMS_ED25519 } from "./awsKmsEd25519";
import { bindAwsKmsEd25519Client, createAwsKmsSdkClient } from "./awsKmsClient";
import { loadLiveAwsKmsTestConfig, type LiveAwsKmsTestConfig } from "./awsKmsLiveTestEnv";
import { openInstitutionalSigner } from "./institutionalSigner";

// Opt-in live proof. Requires isolated IAM credentials per role — not the shared default chain.
// ABRAXAS_AWS_KMS_SIGNING_TEST=1 plus loadLiveAwsKmsTestConfig() variables (see awsKmsLiveTestEnv.ts).
// This file does not create KMS keys or IAM roles.
const live = process.env.ABRAXAS_AWS_KMS_SIGNING_TEST === "1";
const describeLive = live ? describe.sequential : describe.skip;

function isAccessDenied(error: unknown): boolean {
  const record = error as { name?: string; Code?: string; $metadata?: { httpStatusCode?: number } };
  return (
    record?.name === "AccessDeniedException"
    || record?.Code === "AccessDeniedException"
    || record?.Code === "AccessDenied"
    || record?.$metadata?.httpStatusCode === 403
  );
}

describeLive("live non-production AWS KMS", () => {
  let config: LiveAwsKmsTestConfig;

  beforeAll(() => {
    const loaded = loadLiveAwsKmsTestConfig();
    if (!loaded.ok) {
      throw new Error(
        `Live KMS test requires isolated role credentials. Missing or invalid: ${loaded.missing.join(", ")}`,
      );
    }
    config = loaded.config;
  });

  it("rejects cross-key Sign with AccessDenied for each isolated IAM identity", async () => {
    const issuerKms = createAwsKmsSdkClient({ region: config.region, credentials: config.issuerCredentials });
    const statusKms = createAwsKmsSdkClient({ region: config.region, credentials: config.statusCredentials });
    const digest = randomBytes(AWS_KMS_ED25519.digestBytes);
    const signInput = {
      Message: digest,
      MessageType: AWS_KMS_ED25519.messageType,
      SigningAlgorithm: AWS_KMS_ED25519.signingAlgorithm,
    };

    await expect(
      issuerKms.send(new SignCommand({ ...signInput, KeyId: config.statusKeyId })),
    ).rejects.toSatisfy(isAccessDenied);
    await expect(
      statusKms.send(new SignCommand({ ...signInput, KeyId: config.issuerKeyId })),
    ).rejects.toSatisfy(isAccessDenied);

    await expect(
      issuerKms.send(new GetPublicKeyCommand({ KeyId: config.statusKeyId })),
    ).rejects.toSatisfy(isAccessDenied);
    await expect(
      statusKms.send(new GetPublicKeyCommand({ KeyId: config.issuerKeyId })),
    ).rejects.toSatisfy(isAccessDenied);
  });

  it("signs with ED25519_SHA_512 RAW on each key and the independent verifier accepts AWS signatures", async () => {
    const issuerKms = createAwsKmsSdkClient({ region: config.region, credentials: config.issuerCredentials });
    const statusKms = createAwsKmsSdkClient({ region: config.region, credentials: config.statusCredentials });
    const issuerClient = bindAwsKmsEd25519Client({
      identityId: config.issuerIdentity,
      keyId: config.issuerKeyId,
      kms: issuerKms,
    });
    const statusClient = bindAwsKmsEd25519Client({
      identityId: config.statusIdentity,
      keyId: config.statusKeyId,
      kms: statusKms,
    });
    const issuerPublic = await issuerClient.getPublicKey();
    const statusPublic = await statusClient.getPublicKey();
    expect(issuerPublic.keySpec).toBe(AWS_KMS_ED25519.keySpec);
    expect(statusPublic.keySpec).toBe(AWS_KMS_ED25519.keySpec);

    const opened = await openInstitutionalSigner({
      provider: "aws-kms",
      environment: "demo",
      anchorKeyId: "demo-live-kms-anchor",
      statusSignerKeyId: "demo-live-kms-status",
      publicKeys: {
        issuer_anchor: { kty: "OKP", crv: "Ed25519", x: Buffer.from(issuerPublic.publicKey).toString("base64url") },
        status_signer: { kty: "OKP", crv: "Ed25519", x: Buffer.from(statusPublic.publicKey).toString("base64url") },
      },
      issuer: issuerClient,
      status: statusClient,
    });
    expect(opened.ok).toBe(true);
    if (!opened.ok) return;

    const signed = await opened.issuer.signIssuerAuthorityStatement({
      document: ISSUER_AUTHORITY_STATEMENT_DOCUMENT,
      schema_version: ISSUER_AUTHORITY_STATEMENT_SCHEMA_VERSION,
      registry_version: 854,
      supersedes_registry_version: null,
      environment: "demo",
      issued_at: "2026-06-01T00:00:00.000Z",
      not_before: "2020-01-01T00:00:00.000Z",
      anchor_key_id: "demo-live-kms-anchor",
      keys: [{
        key_id: "demo-live-receipt-key",
        environment: "demo",
        status: "active",
        not_before: "2020-01-01T00:00:00.000Z",
        expires_at: null,
        public_jwk: opened.issuer.publicJwk,
        schema_versions: ["1.0.0"],
        allow_historical_verification: false,
        historical_verify_until: null,
        reason_class: "active",
      }],
    });
    expect(signed.ok).toBe(true);
    if (!signed.ok) return;
    expect(verifySignedIssuerAuthorityStatement({
      statement: signed.statement,
      trustAnchorPublicJwk: opened.issuer.publicJwk,
    }).ok).toBe(true);

    const tampered = {
      ...signed.statement,
      payload: {
        ...signed.statement.payload,
        registry_version: signed.statement.payload.registry_version + 1,
      },
    };
    expect(verifySignedIssuerAuthorityStatement({
      statement: tampered,
      trustAnchorPublicJwk: opened.issuer.publicJwk,
    }).ok).toBe(false);

    const rawSign = await issuerKms.send(new SignCommand({
      KeyId: config.issuerKeyId,
      Message: createHash("sha256").update("kms-live-contract-check", "utf8").digest(),
      MessageType: AWS_KMS_ED25519.messageType,
      SigningAlgorithm: AWS_KMS_ED25519.signingAlgorithm,
    }));
    expect(rawSign.SigningAlgorithm).toBe(AWS_KMS_ED25519.signingAlgorithm);
    expect(rawSign.Signature).toBeInstanceOf(Uint8Array);
    expect(rawSign.Signature?.byteLength).toBe(AWS_KMS_ED25519.signatureBytes);
  });
});
