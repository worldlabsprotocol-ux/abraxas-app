import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { describe, expect, it } from "vitest";
import {
  ISSUER_AUTHORITY_STATEMENT_DOCUMENT,
  ISSUER_AUTHORITY_STATEMENT_SCHEMA_VERSION,
  verifySignedIssuerAuthorityStatement,
} from "@abraxas/independent-verifier";
import { generateTestSigningKeyPair } from "@/lib/decisionReceipts/signing";
import { openInstitutionalSigner } from "./institutionalSigner";
import { bindSoftwareEd25519Custody } from "./softwareEd25519Custody";
import { INSTITUTIONAL_WORKER_ENV_FLAG } from "./custodyImplementation";
import { bootstrapInstitutionalSigningWorker } from "./worker/workerBootstrap";

function seedFile(seed: Uint8Array): string {
  const dir = join(tmpdir(), `abraxas-self-hosted-${process.pid}`);
  mkdirSync(dir, { recursive: true });
  const path = join(dir, `${seed[0]}.seed`);
  writeFileSync(path, Buffer.from(seed).toString("base64url"), { mode: 0o600 });
  return path;
}

describe("provider-independent institutional workflow (AWS-free)", () => {
  it("signs issuer authority and verifies without AWS", async () => {
    const issuerKey = generateTestSigningKeyPair("np-issuer");
    const statusKey = generateTestSigningKeyPair("np-status");
    const issuerSeed = Buffer.from(issuerKey.privateKeyJwk.d!, "base64url").subarray(0, 32);
    const statusSeed = Buffer.from(statusKey.privateKeyJwk.d!, "base64url").subarray(0, 32);

    const opened = await openInstitutionalSigner({
      provider: "self-hosted-software",
      environment: "demo",
      anchorKeyId: "np-anchor",
      statusSignerKeyId: "np-status",
      publicKeys: { issuer_anchor: issuerKey.publicKeyJwk, status_signer: statusKey.publicKeyJwk },
      issuer: bindSoftwareEd25519Custody({ identityId: "issuer-np", keyId: "np-anchor", seed: issuerSeed }),
      status: bindSoftwareEd25519Custody({ identityId: "status-np", keyId: "np-status", seed: statusSeed }),
    });
    expect(opened.ok).toBe(true);
    if (!opened.ok) return;

    const signed = await opened.issuer.signIssuerAuthorityStatement({
      document: ISSUER_AUTHORITY_STATEMENT_DOCUMENT,
      schema_version: ISSUER_AUTHORITY_STATEMENT_SCHEMA_VERSION,
      registry_version: 1,
      supersedes_registry_version: null,
      environment: "demo",
      issued_at: "2026-06-01T00:00:00.000Z",
      not_before: "2020-01-01T00:00:00.000Z",
      anchor_key_id: "np-anchor",
      keys: [{
        key_id: "np-receipt",
        environment: "demo",
        status: "active",
        not_before: "2020-01-01T00:00:00.000Z",
        expires_at: null,
        public_jwk: issuerKey.publicKeyJwk,
        schema_versions: ["1.0.0"],
        allow_historical_verification: false,
        historical_verify_until: null,
        reason_class: "active",
      }],
    });
    expect(signed.ok).toBe(true);
    if (!signed.ok) return;

    const verified = verifySignedIssuerAuthorityStatement({
      statement: signed.statement,
      trustAnchorPublicJwk: issuerKey.publicKeyJwk,
    });
    expect(verified.ok).toBe(true);
  });

  it("worker bootstraps from self-hosted seed files without KMS env", async () => {
    const issuerKey = generateTestSigningKeyPair("worker-issuer-file");
    const statusKey = generateTestSigningKeyPair("worker-status-file");
    const issuerPath = seedFile(Buffer.from(issuerKey.privateKeyJwk.d!, "base64url").subarray(0, 32));
    const statusPath = seedFile(Buffer.from(statusKey.privateKeyJwk.d!, "base64url").subarray(0, 32));

    const boot = await bootstrapInstitutionalSigningWorker({
      [INSTITUTIONAL_WORKER_ENV_FLAG]: "1",
      ABRAXAS_INSTITUTIONAL_WORKER_ENVIRONMENT: "demo",
      ABRAXAS_INSTITUTIONAL_CUSTODY_PROVIDER: "self-hosted-file",
      ABRAXAS_SELF_HOSTED_ISSUER_SEED_PATH: issuerPath,
      ABRAXAS_SELF_HOSTED_STATUS_SEED_PATH: statusPath,
      ABRAXAS_ISSUER_AUTHORITY_ANCHOR_KEY_ID: "file-anchor",
      ABRAXAS_STATUS_SIGNER_KEY_ID: "file-status",
    });
    expect(boot.ok).toBe(true);
    if (!boot.ok) return;
    expect(boot.custodyProvider).toBe("self-hosted-file");

    rmSync(join(tmpdir(), `abraxas-self-hosted-${process.pid}`), { recursive: true, force: true });
  });
});