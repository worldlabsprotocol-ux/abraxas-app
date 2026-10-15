// FILE: lib/product/build577.productionPersistenceCompatibility.test.ts

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { isPassportReusableCredentialStorageEnabled } from "@/lib/passport/reusableCredential/storageGate";
import { generateTestSigningKeyPair } from "@/lib/decisionReceipts/signing";
import {
  credentialIssuerRegistryFromKeyPair,
  PASSPORT_CREDENTIAL_ISSUER_REGISTRY_ENV,
} from "@/lib/passport/reusableCredential/credentialIssuerRegistry";
import {
  PASSPORT_CREDENTIAL_SIGNING_KEY_ENV,
  PASSPORT_CREDENTIAL_SIGNING_KEY_ID_ENV,
} from "@/lib/passport/reusableCredential/passportCredentialSigning";
import { CLAIM_ISSUERS } from "@/lib/credentials/claimSchema";

describe("Build #577 production persistence compatibility", () => {
  it("documents hybrid passport pg env in persistence layer", () => {
    const envTs = readFileSync(join(process.cwd(), "lib/persistence/env.ts"), "utf8");
    expect(envTs).toContain("ABRAXAS_PASSPORT_TRANSACTION_PG");
    expect(envTs).toContain("isPassportDirectPostgresEnabled");
    expect(envTs).toContain("resolveHybridPassportExplicitDatabaseUrl");
    const pgPool = readFileSync(join(process.cwd(), "lib/persistence/pgPool.ts"), "utf8");
    expect(pgPool).toContain("isPassportDirectPostgresEnabled");
  });

  it("allows reusable storage gate on supabase_postgrest plus passport transaction pg", () => {
    const key = generateTestSigningKeyPair("build577-gate");
    const registry = [
      credentialIssuerRegistryFromKeyPair({
        issuerId: CLAIM_ISSUERS.abraxas,
        key,
      }),
    ];
    const env: Record<string, string> = {
      ABRAXAS_PERSISTENCE_BACKEND: "supabase_postgrest",
      NEXT_PUBLIC_SUPABASE_URL: "https://example.supabase.co",
      SUPABASE_SERVICE_ROLE_KEY: "role",
      ABRAXAS_PASSPORT_TRANSACTION_PG: "1",
      ABRAXAS_PASSPORT_DATABASE_URL: "postgresql://postgres:pw@db.example.supabase.co:5432/postgres",
      ABRAXAS_PASSPORT_HYBRID_PRODUCTION_AUTHORIZED: "true",
      ABRAXAS_PASSPORT_REUSABLE_CREDENTIAL_STORAGE: "1",
      VERCEL_ENV: "production",
      NODE_ENV: "production",
      [PASSPORT_CREDENTIAL_ISSUER_REGISTRY_ENV]: JSON.stringify(registry),
      [PASSPORT_CREDENTIAL_SIGNING_KEY_ENV]: JSON.stringify(key.privateKeyJwk),
      [PASSPORT_CREDENTIAL_SIGNING_KEY_ID_ENV]: key.signingKeyId,
    };
    Object.assign(process.env, env);
    expect(isPassportReusableCredentialStorageEnabled(env)).toBe(true);
  });

  it("ships read only schema probe script for migrations 140 through 143", () => {
    const sql = readFileSync(
      join(process.cwd(), "scripts/build-577/schema-compatibility-probes.sql"),
      "utf8",
    );
    expect(sql).toContain("passport_reusable_credentials");
    expect(sql).toContain("passport_institutional_authorization_commits");
    expect(sql).toContain("140_passport");
  });
});
