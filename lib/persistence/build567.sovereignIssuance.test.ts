import { randomBytes } from "node:crypto";
import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeAll, beforeEach, describe, expect, it } from "vitest";
import nacl from "tweetnacl";
import { generateTestSigningKeyPair } from "@/lib/decisionReceipts/signing";
import { caip10Evm } from "@/lib/auth/holderSubject/caip";
import { resolveSubjectForVerifiedWalletDirect } from "@/lib/persistence/holderSubjectDirect";
import { issueManualIdentityCredential } from "@/lib/idv/issueIdentityCredential";
import { SOVEREIGN_RUNTIME_SCHEMA_MANIFEST } from "@/lib/databaseRecovery/sovereignSchemaManifest";
import { resetAbraxasPgPoolForTests } from "@/lib/persistence/pgPool";
import { resetPersistenceClientForTests } from "@/lib/persistence/admin";
import {
  listPassportReusableCredentialsForHolderDirect,
  tryBackfillPassportReusableCredentialForSubjectDirect,
  upsertPassportHolderPossessionKeyDirect,
} from "@/lib/persistence/passportReusableCredentialDirectStore";
import { build566TrustEnv } from "@/lib/passport/reusableCredential/fixtures";
import {
  credentialIssuerRegistryFromKeyPair,
  PASSPORT_CREDENTIAL_ISSUER_REGISTRY_ENV,
} from "@/lib/passport/reusableCredential/credentialIssuerRegistry";
import {
  PASSPORT_CREDENTIAL_SIGNING_KEY_ENV,
  PASSPORT_CREDENTIAL_SIGNING_KEY_ID_ENV,
} from "@/lib/passport/reusableCredential/passportCredentialSigning";
import { CLAIM_ISSUERS } from "@/lib/credentials/claimSchema";
import { resetPassportPossessionChallengeStoreForTests } from "@/lib/passport/reusableCredential/holderPossessionChallenge";
import { BUILD_546_PRIMARY_KEY } from "@/lib/institutionalCertification/build546/fixtures";
import { resolvePassportCredentialIssuerTrust } from "@/lib/passport/reusableCredential/credentialIssuerRegistry";
import { verifyPassportReusableCredentialSignature } from "@/lib/passport/reusableCredential/sign";
import { PORTABLE_REVOCATION_TEST_ISSUER_ID } from "@/lib/protocol/portableRevocation/fixtures";
import { queryAbraxasPg } from "@/lib/persistence/pgPool";

const PG_URL = process.env.ABRAXAS_SOVEREIGN_PG_URL?.trim()
  || process.env.MIGRATION_136_PG_URL?.trim()
  || process.env.ABRAXAS_DATABASE_URL?.trim()
  || undefined;

describe("Build #567 sovereign passport reusable credential issuance (disposable PG)", () => {
  if (!PG_URL) {
    it.skip("requires disposable PostgreSQL", () => {});
    return;
  }

  let evidenceDir: string;
  const JWT_KEY = generateTestSigningKeyPair("jwt-signer");
  const CREDENTIAL_KEY = generateTestSigningKeyPair("passport-credential-567");
  const holderKeys = nacl.sign.keyPair.fromSeed(Uint8Array.from(Buffer.alloc(32, 19)));

  beforeAll(() => {
    const dir = join(process.cwd(), "supabase/migrations");
    for (const file of SOVEREIGN_RUNTIME_SCHEMA_MANIFEST) {
      execFileSync("psql", [PG_URL!, "-v", "ON_ERROR_STOP=0"], {
        input: readFileSync(join(dir, file), "utf8"),
        encoding: "utf8",
      });
    }
  });

  beforeEach(async () => {
    resetPassportPossessionChallengeStoreForTests();
    evidenceDir = mkdtempSync(join(tmpdir(), "abx-b567-"));
    for (const k of ["NEXT_PUBLIC_SUPABASE_URL", "SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY"]) {
      delete process.env[k];
    }
    process.env.ABRAXAS_PERSISTENCE_BACKEND = "postgres_direct";
    process.env.ABRAXAS_DATABASE_URL = PG_URL;
    process.env.ABRAXAS_PASSPORT_REUSABLE_CREDENTIAL_STORAGE = "1";
    process.env.ABRAXAS_EVIDENCE_STORAGE_ROOT = evidenceDir;
    process.env.ABRAXAS_EVIDENCE_ENCRYPTION_KEY = Buffer.alloc(32, 3).toString("base64");
    process.env.ABRAXAS_SIGNING_KEY = JSON.stringify(JWT_KEY.privateKeyJwk);
    process.env[PASSPORT_CREDENTIAL_SIGNING_KEY_ENV] = JSON.stringify(CREDENTIAL_KEY.privateKeyJwk);
    process.env[PASSPORT_CREDENTIAL_SIGNING_KEY_ID_ENV] = CREDENTIAL_KEY.signingKeyId;
    const registryEntry = credentialIssuerRegistryFromKeyPair({
      issuerId: CLAIM_ISSUERS.abraxas,
      key: CREDENTIAL_KEY,
      revocationIssuerId: PORTABLE_REVOCATION_TEST_ISSUER_ID,
      snapshotSigningKeyIds: [BUILD_546_PRIMARY_KEY.signingKeyId],
    });
    Object.assign(process.env, build566TrustEnv(), {
      [PASSPORT_CREDENTIAL_ISSUER_REGISTRY_ENV]: JSON.stringify([registryEntry]),
    });
    resetAbraxasPgPoolForTests();
    resetPersistenceClientForTests();
    await queryAbraxasPg("delete from public.passport_reusable_credentials");
    await queryAbraxasPg("delete from public.passport_possession_challenges");
  });

  afterEach(() => {
    rmSync(evidenceDir, { recursive: true, force: true });
    resetAbraxasPgPoolForTests();
    resetPersistenceClientForTests();
  });

  async function subject(): Promise<string> {
    const wallet = await resolveSubjectForVerifiedWalletDirect({
      caip: caip10Evm(11155111, `0x${randomBytes(20).toString("hex")}`),
      authMethod: "evm_wallet",
    });
    if (!wallet.ok) throw new Error("wallet");
    return wallet.subjectId;
  }

  it("approved manual IDV issues durable reusable credential after possession key registration", async () => {
    const holder = await subject();
    await upsertPassportHolderPossessionKeyDirect({
      holderSubjectId: holder,
      publicKeyB64Url: Buffer.from(holderKeys.publicKey).toString("base64url"),
    });

    const issued = await issueManualIdentityCredential(holder, {
      reviewId: `rev_${randomBytes(6).toString("hex")}`,
      jurisdiction: "US-MO",
      documentType: "passport",
      documentDateOfBirth: "1990-01-01",
      minimumAgeGate: 21,
      eligibilityEvidenceReference: `manual_review:test-${randomBytes(4).toString("hex")}`,
    });
    if (!issued.ok) {
      throw new Error(`issueManualIdentityCredential failed: ${issued.message ?? "unknown"}`);
    }

    const backfill = await tryBackfillPassportReusableCredentialForSubjectDirect({
      subjectKey: holder,
      eventSource: "build567_test_backfill",
    });
    if (!backfill.ok) {
      throw new Error(`reusable_backfill_failed: ${backfill.code}`);
    }

    const stored = await listPassportReusableCredentialsForHolderDirect(holder);
    expect(stored.length).toBe(1);
    const credential = stored[0]!;
    expect(credential.payload.provenance.idv_method).not.toBe("sandbox_fixture");
    expect(credential.payload.holder_subject_id).toBe(holder);
    const trust = resolvePassportCredentialIssuerTrust({
      issuerId: credential.payload.issuer_id,
      signingKeyId: credential.payload.signing_key_id,
      env: process.env as Record<string, string | undefined>,
    });
    expect(trust.ok).toBe(true);
    if (trust.ok) {
      expect(verifyPassportReusableCredentialSignature(credential, trust.entry.public_jwk)).toBe(true);
    }
  });
});
