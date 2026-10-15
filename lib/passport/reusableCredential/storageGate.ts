// FILE: lib/passport/reusableCredential/storageGate.ts

import { isPassportDirectPostgresEnabled } from "@/lib/persistence/env";
import { loadPassportCredentialIssuerRegistry } from "./credentialIssuerRegistry";
import { loadPassportCredentialSigningKey } from "./passportCredentialSigning";

/** Sovereign issuer-backed reusable credentials (Build #567), not sandbox synthetic demo. */
export function isPassportReusableCredentialStorageEnabled(
  env: Record<string, string | undefined> = process.env as Record<string, string | undefined>,
): boolean {
  if (env.ABRAXAS_PASSPORT_REUSABLE_CREDENTIAL_STORAGE === "0") return false;
  if (!isPassportDirectPostgresEnabled(env)) return false;
  if (!loadPassportCredentialSigningKey()) return false;
  if (!loadPassportCredentialIssuerRegistry(env).length) return false;
  if (env.ABRAXAS_PASSPORT_REUSABLE_CREDENTIAL_STORAGE === "1") return true;
  const vercelEnv = env.VERCEL_ENV?.trim();
  if (vercelEnv === "preview" || vercelEnv === "development") return true;
  return env.NODE_ENV !== "production";
}
