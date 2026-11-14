// Environment contract for opt-in live AWS KMS proofs. Not used by receipt runtime.

import type { AwsCredentialIdentity } from "@aws-sdk/types";

export const LIVE_AWS_KMS_REQUIRED_ENV_VARS = [
  "ABRAXAS_AWS_KMS_REGION",
  "ABRAXAS_AWS_KMS_ISSUER_KEY_ID",
  "ABRAXAS_AWS_KMS_STATUS_KEY_ID",
  "ABRAXAS_AWS_KMS_ISSUER_IDENTITY",
  "ABRAXAS_AWS_KMS_STATUS_IDENTITY",
  "ABRAXAS_AWS_KMS_ISSUER_ACCESS_KEY_ID",
  "ABRAXAS_AWS_KMS_ISSUER_SECRET_ACCESS_KEY",
  "ABRAXAS_AWS_KMS_STATUS_ACCESS_KEY_ID",
  "ABRAXAS_AWS_KMS_STATUS_SECRET_ACCESS_KEY",
] as const;

export type LiveAwsKmsTestConfig = {
  region: string;
  issuerKeyId: string;
  statusKeyId: string;
  issuerIdentity: string;
  statusIdentity: string;
  issuerCredentials: AwsCredentialIdentity;
  statusCredentials: AwsCredentialIdentity;
};

function roleCredentials(role: "ISSUER" | "STATUS"): AwsCredentialIdentity | null {
  const accessKeyId = process.env[`ABRAXAS_AWS_KMS_${role}_ACCESS_KEY_ID`]?.trim() ?? "";
  const secretAccessKey = process.env[`ABRAXAS_AWS_KMS_${role}_SECRET_ACCESS_KEY`]?.trim() ?? "";
  const sessionToken = process.env[`ABRAXAS_AWS_KMS_${role}_SESSION_TOKEN`]?.trim();
  if (!accessKeyId || !secretAccessKey) return null;
  return sessionToken
    ? { accessKeyId, secretAccessKey, sessionToken }
    : { accessKeyId, secretAccessKey };
}

/** Returns missing variable names when the live proof cannot run with isolated identities. */
export function missingLiveAwsKmsTestEnv(): string[] {
  const missing: string[] = [];
  for (const name of LIVE_AWS_KMS_REQUIRED_ENV_VARS) {
    if (!process.env[name]?.trim()) missing.push(name);
  }
  return missing;
}

export function loadLiveAwsKmsTestConfig():
  | { ok: true; config: LiveAwsKmsTestConfig }
  | { ok: false; missing: string[] } {
  const missing = missingLiveAwsKmsTestEnv();
  if (missing.length > 0) return { ok: false, missing };

  const region = process.env.ABRAXAS_AWS_KMS_REGION!.trim();
  const issuerKeyId = process.env.ABRAXAS_AWS_KMS_ISSUER_KEY_ID!.trim();
  const statusKeyId = process.env.ABRAXAS_AWS_KMS_STATUS_KEY_ID!.trim();
  const issuerIdentity = process.env.ABRAXAS_AWS_KMS_ISSUER_IDENTITY!.trim();
  const statusIdentity = process.env.ABRAXAS_AWS_KMS_STATUS_IDENTITY!.trim();
  const issuerCredentials = roleCredentials("ISSUER");
  const statusCredentials = roleCredentials("STATUS");
  if (!issuerCredentials || !statusCredentials) {
    return {
      ok: false,
      missing: missingLiveAwsKmsTestEnv(),
    };
  }
  if (issuerKeyId === statusKeyId) {
    return { ok: false, missing: ["distinct ABRAXAS_AWS_KMS_ISSUER_KEY_ID and STATUS_KEY_ID"] };
  }
  if (issuerIdentity === statusIdentity) {
    return { ok: false, missing: ["distinct ABRAXAS_AWS_KMS_ISSUER_IDENTITY and STATUS_IDENTITY"] };
  }

  return {
    ok: true,
    config: {
      region,
      issuerKeyId,
      statusKeyId,
      issuerIdentity,
      statusIdentity,
      issuerCredentials,
      statusCredentials,
    },
  };
}
