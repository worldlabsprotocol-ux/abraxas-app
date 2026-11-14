import { createAwsKmsSdkClient, bindAwsKmsEd25519Client } from "../awsKmsClient";
import { openInstitutionalSigner, type OpenedInstitutionalSigning } from "../institutionalSigner";
import { exposeInstitutionalSigningWorkerSurface, type InstitutionalSigningWorkerSurface } from "../signingDeploymentBoundary";
import { assertInstitutionalWorkerProcessEnv } from "./runtimeGuards";
import { generateTestSigningKeyPair } from "@/lib/decisionReceipts/signing";
import type { CustodyClient } from "../contract";
import { bindSoftwareEd25519Custody } from "../softwareEd25519Custody";
import { readEd25519SeedFile } from "../selfHostedSeedFile";
import {
  institutionalSignerProviderLabel,
  resolveInstitutionalCustodyProvider,
} from "../resolveInstitutionalCustodyProvider";

export type InstitutionalWorkerBootstrapResult =
  | {
      ok: true;
      opened: Extract<OpenedInstitutionalSigning, { ok: true }>;
      surface: InstitutionalSigningWorkerSurface;
      environment: "demo" | "production";
      env: Record<string, string | undefined>;
      custodyProvider: string;
    }
  | { ok: false; reason: string };

function demoMemoryCustody(key: ReturnType<typeof generateTestSigningKeyPair>, identityId: string, keyId: string): CustodyClient {
  const seed = Buffer.from(key.privateKeyJwk.d!, "base64url");
  return bindSoftwareEd25519Custody({
    identityId,
    keyId,
    seed: Uint8Array.from(seed.subarray(0, 32)),
  });
}

export async function bootstrapInstitutionalSigningWorker(
  env: Record<string, string | undefined> = process.env,
): Promise<InstitutionalWorkerBootstrapResult> {
  const guard = assertInstitutionalWorkerProcessEnv(env);
  if (!guard.ok) return guard;

  const environment = env.ABRAXAS_INSTITUTIONAL_WORKER_ENVIRONMENT?.trim() === "production" ? "production" : "demo";
  const anchorKeyId = env.ABRAXAS_ISSUER_AUTHORITY_ANCHOR_KEY_ID?.trim() ?? "";
  const statusSignerKeyId = env.ABRAXAS_STATUS_SIGNER_KEY_ID?.trim() ?? "";
  const issuerIdentity = env.ABRAXAS_AWS_KMS_ISSUER_IDENTITY?.trim() ?? "issuer-worker";
  const statusIdentity = env.ABRAXAS_AWS_KMS_STATUS_IDENTITY?.trim() ?? "status-worker";
  const issuerKeyId = env.ABRAXAS_AWS_KMS_ISSUER_KEY_ID?.trim() ?? "";
  const statusKeyId = env.ABRAXAS_AWS_KMS_STATUS_KEY_ID?.trim() ?? "";
  const region = env.ABRAXAS_AWS_KMS_REGION?.trim() ?? "";

  if (!anchorKeyId || !statusSignerKeyId) {
    return { ok: false, reason: "worker_anchor_or_status_key_id_missing" };
  }

  const custodyResolution = resolveInstitutionalCustodyProvider(env);
  if ("ok" in custodyResolution && custodyResolution.ok === false) return custodyResolution;
  const resolved = custodyResolution as Exclude<typeof custodyResolution, { ok: false }>;

  let issuer: CustodyClient;
  let status: CustodyClient;
  let issuerPublicJwk: JsonWebKey;
  let statusPublicJwk: JsonWebKey;

  if (resolved.provider === "demo-memory") {
    const issuerKey = generateTestSigningKeyPair("worker-demo-issuer");
    const statusKey = generateTestSigningKeyPair("worker-demo-status");
    issuer = demoMemoryCustody(issuerKey, issuerIdentity, issuerKeyId || "demo-issuer-key");
    status = demoMemoryCustody(statusKey, statusIdentity, statusKeyId || "demo-status-key");
    issuerPublicJwk = issuerKey.publicKeyJwk;
    statusPublicJwk = statusKey.publicKeyJwk;
  } else if (resolved.provider === "self-hosted-file") {
    const issuerSeed = readEd25519SeedFile(resolved.issuerSeedPath);
    const statusSeed = readEd25519SeedFile(resolved.statusSeedPath);
    issuer = bindSoftwareEd25519Custody({
      identityId: issuerIdentity,
      keyId: issuerKeyId || anchorKeyId,
      seed: issuerSeed,
    });
    status = bindSoftwareEd25519Custody({
      identityId: statusIdentity,
      keyId: statusKeyId || statusSignerKeyId,
      seed: statusSeed,
    });
    const issuerPub = await issuer.getPublicKey();
    const statusPub = await status.getPublicKey();
    issuerPublicJwk = { kty: "OKP", crv: "Ed25519", x: Buffer.from(issuerPub.publicKey).toString("base64url") };
    statusPublicJwk = { kty: "OKP", crv: "Ed25519", x: Buffer.from(statusPub.publicKey).toString("base64url") };
  } else {
    if (!region || !issuerKeyId || !statusKeyId) {
      return { ok: false, reason: "worker_kms_configuration_incomplete" };
    }
    const issuerCreds = env.ABRAXAS_AWS_KMS_ISSUER_ACCESS_KEY_ID?.trim() && env.ABRAXAS_AWS_KMS_ISSUER_SECRET_ACCESS_KEY?.trim()
      ? {
          accessKeyId: env.ABRAXAS_AWS_KMS_ISSUER_ACCESS_KEY_ID.trim(),
          secretAccessKey: env.ABRAXAS_AWS_KMS_ISSUER_SECRET_ACCESS_KEY.trim(),
          sessionToken: env.ABRAXAS_AWS_KMS_ISSUER_SESSION_TOKEN?.trim(),
        }
      : undefined;
    const statusCreds = env.ABRAXAS_AWS_KMS_STATUS_ACCESS_KEY_ID?.trim() && env.ABRAXAS_AWS_KMS_STATUS_SECRET_ACCESS_KEY?.trim()
      ? {
          accessKeyId: env.ABRAXAS_AWS_KMS_STATUS_ACCESS_KEY_ID.trim(),
          secretAccessKey: env.ABRAXAS_AWS_KMS_STATUS_SECRET_ACCESS_KEY.trim(),
          sessionToken: env.ABRAXAS_AWS_KMS_STATUS_SESSION_TOKEN?.trim(),
        }
      : undefined;
    if (!issuerCreds || !statusCreds) {
      return { ok: false, reason: "worker_isolated_kms_credentials_required" };
    }
    const issuerKms = createAwsKmsSdkClient({ region, credentials: issuerCreds });
    const statusKms = createAwsKmsSdkClient({ region, credentials: statusCreds });
    issuer = bindAwsKmsEd25519Client({ identityId: issuerIdentity, keyId: issuerKeyId, kms: issuerKms });
    status = bindAwsKmsEd25519Client({ identityId: statusIdentity, keyId: statusKeyId, kms: statusKms });
    const issuerPub = await issuer.getPublicKey();
    const statusPub = await status.getPublicKey();
    issuerPublicJwk = { kty: "OKP", crv: "Ed25519", x: Buffer.from(issuerPub.publicKey).toString("base64url") };
    statusPublicJwk = { kty: "OKP", crv: "Ed25519", x: Buffer.from(statusPub.publicKey).toString("base64url") };
  }

  const opened = await openInstitutionalSigner({
    provider: institutionalSignerProviderLabel(resolved),
    environment,
    anchorKeyId,
    statusSignerKeyId,
    publicKeys: { issuer_anchor: issuerPublicJwk, status_signer: statusPublicJwk },
    issuer,
    status,
  });
  if (!opened.ok) return opened;
  return {
    ok: true,
    opened,
    surface: exposeInstitutionalSigningWorkerSurface(opened),
    environment,
    env,
    custodyProvider: resolved.provider,
  };
}