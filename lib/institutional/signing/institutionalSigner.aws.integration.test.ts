import { describe, expect, it } from "vitest";
import {
  ISSUER_AUTHORITY_STATEMENT_DOCUMENT,
  ISSUER_AUTHORITY_STATEMENT_SCHEMA_VERSION,
  verifySignedIssuerAuthorityStatement,
} from "@abraxas/independent-verifier";
import { bindAwsKmsEd25519Client, createAwsKmsSdkClient } from "./awsKmsClient";
import { openInstitutionalSigner } from "./institutionalSigner";

const live = process.env.ABRAXAS_AWS_KMS_SIGNING_TEST === "1";

describe.skipIf(!live)("live non-production AWS KMS", () => {
  it("signs a demo issuer statement with two real KMS keys and the independent verifier accepts it", async () => {
    const region = process.env.ABRAXAS_AWS_KMS_REGION?.trim() ?? "";
    const issuerKeyId = process.env.ABRAXAS_AWS_KMS_ISSUER_KEY_ID?.trim() ?? "";
    const statusKeyId = process.env.ABRAXAS_AWS_KMS_STATUS_KEY_ID?.trim() ?? "";
    const issuerIdentity = process.env.ABRAXAS_AWS_KMS_ISSUER_IDENTITY?.trim() ?? "";
    const statusIdentity = process.env.ABRAXAS_AWS_KMS_STATUS_IDENTITY?.trim() ?? "";
    expect(region).not.toBe("");
    expect(issuerKeyId).not.toBe(statusKeyId);
    expect(issuerIdentity).not.toBe(statusIdentity);

    const issuerKms = createAwsKmsSdkClient({ region });
    const statusKms = createAwsKmsSdkClient({ region });
    const issuerClient = bindAwsKmsEd25519Client({ identityId: issuerIdentity, keyId: issuerKeyId, kms: issuerKms });
    const statusClient = bindAwsKmsEd25519Client({ identityId: statusIdentity, keyId: statusKeyId, kms: statusKms });
    const issuerPublic = await issuerClient.getPublicKey();
    const statusPublic = await statusClient.getPublicKey();
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
  });
});
