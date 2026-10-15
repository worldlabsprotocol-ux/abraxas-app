// FILE: lib/passport/reusableCredential/build568.issuerBackedPresentation.test.ts

import { randomBytes } from "node:crypto";
import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import nacl from "tweetnacl";
import { generateTestSigningKeyPair } from "@/lib/decisionReceipts/signing";
import { caip10Evm } from "@/lib/auth/holderSubject/caip";
import { resolveSubjectForVerifiedWalletDirect } from "@/lib/persistence/holderSubjectDirect";
import { issueManualIdentityCredential } from "@/lib/idv/issueIdentityCredential";
import { SOVEREIGN_RUNTIME_SCHEMA_MANIFEST } from "@/lib/databaseRecovery/sovereignSchemaManifest";
import { resetAbraxasPgPoolForTests } from "@/lib/persistence/pgPool";
import { resetPersistenceClientForTests } from "@/lib/persistence/admin";
import {
  tryBackfillPassportReusableCredentialForSubjectDirect,
  upsertPassportHolderPossessionKeyDirect,
  listPassportReusableCredentialsForHolderDirect,
} from "@/lib/persistence/passportReusableCredentialDirectStore";
import { queryAbraxasPg } from "@/lib/persistence/pgPool";
import { BUILD_566_PARTNER_A, BUILD_566_PARTNER_B, BUILD_566_POLICY_ID } from "./fixtures";
import { build546TrustRegistryEnv, BUILD_546_PRIMARY_KEY } from "@/lib/institutionalCertification/build546/fixtures";
import {
  credentialIssuerRegistryFromKeyPair,
  PASSPORT_CREDENTIAL_ISSUER_REGISTRY_ENV,
} from "./credentialIssuerRegistry";
import {
  PASSPORT_CREDENTIAL_SIGNING_KEY_ENV,
  PASSPORT_CREDENTIAL_SIGNING_KEY_ID_ENV,
} from "./passportCredentialSigning";
import { CLAIM_ISSUERS } from "@/lib/credentials/claimSchema";
import { PORTABLE_REVOCATION_TEST_ISSUER_ID } from "@/lib/protocol/portableRevocation/fixtures";
import {
  bootstrapTrustFromArtifact,
  buildSyntheticPortableRevocationSnapshot,
} from "@/lib/protocol/portableRevocation";
import {
  PORTABLE_REVOCATION_BOOTSTRAP_TRUSTS_ENV,
  PORTABLE_REVOCATION_CHECKPOINT_MEMORY_TEST_ENV,
} from "./portableRevocationRuntime";
import {
  issuePassportPossessionChallenge,
  signPassportPossessionChallenge,
} from "./holderPossessionChallenge";
import { insertInstitutionalPresentationConsentDirect } from "@/lib/persistence/passportInstitutionalConsentDirect";
import { hashInstitutionalConsentBinding } from "./institutionalConsentBinding";
import { authorizeIssuerBackedPresentation } from "./issuerBackedPresentationOrchestration";
import { seedBuild568InstitutionalPartnerPoliciesForTests, BUILD_568_PARTNER_B_POLICY_ID } from "./testInstitutionalPolicySeed";
import { resolveInstitutionalPartnerCatalogEntry } from "./institutionalPartnerCatalog";
import { insertPassportPossessionChallengeDirect } from "@/lib/persistence/postgresPassportPossessionChallengeStore";
import { validateInstitutionalPresentationConsentDirect } from "@/lib/persistence/passportInstitutionalConsentDirect";
import { PASSPORT_AUTH_INJECT_FAIL_AFTER_RESOURCE_COMMIT_ENV } from "./issuerBackedPresentationOrchestration";

const PG_URL = process.env.ABRAXAS_SOVEREIGN_PG_URL?.trim()
  || process.env.MIGRATION_136_PG_URL?.trim()
  || process.env.ABRAXAS_DATABASE_URL?.trim()
  || undefined;

describe("Build #568 issuer-backed presentation (disposable PG)", () => {
  if (!PG_URL) {
    it.skip("requires disposable PostgreSQL", () => {});
    return;
  }

  let evidenceDir: string;
  const JWT_KEY = generateTestSigningKeyPair("jwt-signer-568");
  const CREDENTIAL_KEY = generateTestSigningKeyPair("passport-credential-568");
  const holderKeys = nacl.sign.keyPair.fromSeed(Uint8Array.from(Buffer.alloc(32, 22)));

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
    evidenceDir = mkdtempSync(join(tmpdir(), "abx-b568-present-"));
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
    process.env[PORTABLE_REVOCATION_CHECKPOINT_MEMORY_TEST_ENV] = "1";
    process.env.ABRAXAS_SIGNING_KEY = JSON.stringify(BUILD_546_PRIMARY_KEY.privateKeyJwk);
    Object.assign(process.env, build546TrustRegistryEnv());
    const registryEntry = credentialIssuerRegistryFromKeyPair({
      issuerId: CLAIM_ISSUERS.abraxas,
      key: CREDENTIAL_KEY,
      revocationIssuerId: PORTABLE_REVOCATION_TEST_ISSUER_ID,
      snapshotSigningKeyIds: [BUILD_546_PRIMARY_KEY.signingKeyId],
    });
    process.env[PASSPORT_CREDENTIAL_ISSUER_REGISTRY_ENV] = JSON.stringify([registryEntry]);
    resetAbraxasPgPoolForTests();
    resetPersistenceClientForTests();
    await queryAbraxasPg("delete from public.passport_institutional_authorization_commits");
    await queryAbraxasPg("delete from public.passport_institutional_presentation_consents");
    await queryAbraxasPg("delete from public.passport_reusable_credentials");
    await queryAbraxasPg("delete from public.passport_possession_challenges");
    await seedBuild568InstitutionalPartnerPoliciesForTests();
  });

  afterEach(() => {
    rmSync(evidenceDir, { recursive: true, force: true });
    resetAbraxasPgPoolForTests();
    resetPersistenceClientForTests();
  });

  async function holderWithCredential() {
    const wallet = await resolveSubjectForVerifiedWalletDirect({
      caip: caip10Evm(11155111, `0x${randomBytes(20).toString("hex")}`),
      authMethod: "evm_wallet",
    });
    if (!wallet.ok) throw new Error("wallet");
    await upsertPassportHolderPossessionKeyDirect({
      holderSubjectId: wallet.subjectId,
      publicKeyB64Url: Buffer.from(holderKeys.publicKey).toString("base64url"),
    });
    const issued = await issueManualIdentityCredential(wallet.subjectId, {
      reviewId: `rev_${randomBytes(6).toString("hex")}`,
      jurisdiction: "US-MO",
      documentType: "passport",
      documentDateOfBirth: "1990-01-01",
      minimumAgeGate: 21,
      eligibilityEvidenceReference: `manual_review:test-${randomBytes(4).toString("hex")}`,
    });
    if (!issued.ok) throw new Error("idv");
    const backfill = await tryBackfillPassportReusableCredentialForSubjectDirect({
      subjectKey: wallet.subjectId,
      eventSource: "build568_presentation_test",
    });
    if (!backfill.ok) throw new Error(backfill.code);
    const creds = await listPassportReusableCredentialsForHolderDirect(wallet.subjectId);
    return { holder: wallet.subjectId, credential: creds[0]! };
  }

  async function consentFor(input: {
    holder: string;
    credentialId: string;
    partnerId: string;
    policyId: string;
    policyVersion: number;
    requestedAttribute: string;
  }) {
    const hash = hashInstitutionalConsentBinding({
      holder_subject_id: input.holder,
      credential_id: input.credentialId,
      partner_id: input.partnerId,
      policy_id: input.policyId,
      policy_version: input.policyVersion,
      requested_attribute: input.requestedAttribute,
    });
    const row = await insertInstitutionalPresentationConsentDirect({
      holderSubjectId: input.holder,
      credentialId: input.credentialId,
      partnerId: input.partnerId,
      policyId: input.policyId,
      policyVersion: input.policyVersion,
      disclosureHash: hash,
    });
    if (!row.ok) throw new Error(row.code);
    return row.consentId;
  }

  it("authorizes two configured institutions under server policies with consent", async () => {
    const { holder, credential } = await holderWithCredential();
    const snapshot = buildSyntheticPortableRevocationSnapshot({
      receiptId: credential.payload.credential_id,
      state: "active",
    });
    process.env[PORTABLE_REVOCATION_BOOTSTRAP_TRUSTS_ENV] = JSON.stringify([
      bootstrapTrustFromArtifact({ artifact: snapshot }),
    ]);
    process.env.ABRAXAS_PORTABLE_REVOCATION_PUBLISHER_URL = "https://publisher.test";
    vi.spyOn(global, "fetch").mockResolvedValue(
      new Response(JSON.stringify(snapshot), { status: 200 }),
    );

    const entryA = await resolveInstitutionalPartnerCatalogEntry({
      partnerId: BUILD_566_PARTNER_A,
      policyId: BUILD_566_POLICY_ID,
    });
    const entryB = await resolveInstitutionalPartnerCatalogEntry({
      partnerId: BUILD_566_PARTNER_B,
      policyId: BUILD_568_PARTNER_B_POLICY_ID,
    });
    expect(entryA).not.toBeNull();
    expect(entryB).not.toBeNull();
    if (!entryA || !entryB) return;

    async function present(partnerId: string, policyId: string, entry: NonNullable<typeof entryA>) {
      const consentId = await consentFor({
        holder,
        credentialId: credential.payload.credential_id,
        partnerId,
        policyId,
        policyVersion: entry.policy_version,
        requestedAttribute: entry.requested_attribute,
      });
      const challenge = issuePassportPossessionChallenge({
        credentialId: credential.payload.credential_id,
        partnerId,
        policyId,
      });
      await insertPassportPossessionChallengeDirect(challenge);
      const proof = {
        challenge_id: challenge.challenge_id,
        signature: signPassportPossessionChallenge(challenge, holderKeys.secretKey),
      };
      return authorizeIssuerBackedPresentation({
        credential,
        holderSubjectId: holder,
        partnerId,
        policyId,
        consentId,
        requestId: `req_568_pg_${partnerId}`,
        challenge,
        holderPossessionProof: proof,
        receiptSigningKey: BUILD_546_PRIMARY_KEY,
      });
    }

    const a = await present(BUILD_566_PARTNER_A, BUILD_566_POLICY_ID, entryA);
    expect(a.ok).toBe(true);
    const b = await present(BUILD_566_PARTNER_B, BUILD_568_PARTNER_B_POLICY_ID, entryB);
    expect(b.ok).toBe(true);
  });

  it("rejects forged consent binding", async () => {
    const { holder, credential } = await holderWithCredential();
    const snapshot = buildSyntheticPortableRevocationSnapshot({
      receiptId: credential.payload.credential_id,
      state: "active",
    });
    process.env[PORTABLE_REVOCATION_BOOTSTRAP_TRUSTS_ENV] = JSON.stringify([
      bootstrapTrustFromArtifact({ artifact: snapshot }),
    ]);
    process.env.ABRAXAS_PORTABLE_REVOCATION_PUBLISHER_URL = "https://publisher.test";
    vi.spyOn(global, "fetch").mockResolvedValue(
      new Response(JSON.stringify(snapshot), { status: 200 }),
    );

    const entry = await resolveInstitutionalPartnerCatalogEntry({
      partnerId: BUILD_566_PARTNER_A,
      policyId: BUILD_566_POLICY_ID,
    });
    if (!entry) throw new Error("entry");

    const wrongConsent = await insertInstitutionalPresentationConsentDirect({
      holderSubjectId: holder,
      credentialId: credential.payload.credential_id,
      partnerId: BUILD_566_PARTNER_B,
      policyId: BUILD_568_PARTNER_B_POLICY_ID,
      policyVersion: 1,
      disclosureHash: hashInstitutionalConsentBinding({
        holder_subject_id: holder,
        credential_id: credential.payload.credential_id,
        partner_id: BUILD_566_PARTNER_B,
        policy_id: BUILD_568_PARTNER_B_POLICY_ID,
        policy_version: 1,
        requested_attribute: entry.requested_attribute,
      }),
    });
    if (!wrongConsent.ok) throw new Error("consent");

    const challenge = issuePassportPossessionChallenge({
      credentialId: credential.payload.credential_id,
      partnerId: BUILD_566_PARTNER_A,
      policyId: BUILD_566_POLICY_ID,
    });
    await insertPassportPossessionChallengeDirect(challenge);
    const proof = {
      challenge_id: challenge.challenge_id,
      signature: signPassportPossessionChallenge(challenge, holderKeys.secretKey),
    };
    const result = await authorizeIssuerBackedPresentation({
      credential,
      holderSubjectId: holder,
      partnerId: BUILD_566_PARTNER_A,
      policyId: BUILD_566_POLICY_ID,
      consentId: wrongConsent.consentId,
      requestId: "req_forged_consent",
      challenge,
      holderPossessionProof: proof,
      receiptSigningKey: BUILD_546_PRIMARY_KEY,
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe("consent_binding_mismatch");
  });

  it("does not consume consent when possession signature is invalid", async () => {
    const { holder, credential } = await holderWithCredential();
    const entry = await resolveInstitutionalPartnerCatalogEntry({
      partnerId: BUILD_566_PARTNER_A,
      policyId: BUILD_566_POLICY_ID,
    });
    if (!entry) throw new Error("entry");
    const consentId = await consentFor({
      holder,
      credentialId: credential.payload.credential_id,
      partnerId: BUILD_566_PARTNER_A,
      policyId: BUILD_566_POLICY_ID,
      policyVersion: entry.policy_version,
      requestedAttribute: entry.requested_attribute,
    });
    const challenge = issuePassportPossessionChallenge({
      credentialId: credential.payload.credential_id,
      partnerId: BUILD_566_PARTNER_A,
      policyId: BUILD_566_POLICY_ID,
    });
    await insertPassportPossessionChallengeDirect(challenge);
    const wrongKeys = nacl.sign.keyPair.fromSeed(Uint8Array.from(Buffer.alloc(32, 44)));
    const proof = {
      challenge_id: challenge.challenge_id,
      signature: signPassportPossessionChallenge(challenge, wrongKeys.secretKey),
    };
    const result = await authorizeIssuerBackedPresentation({
      credential,
      holderSubjectId: holder,
      partnerId: BUILD_566_PARTNER_A,
      policyId: BUILD_566_POLICY_ID,
      consentId,
      requestId: "req_invalid_possession",
      challenge,
      holderPossessionProof: proof,
      receiptSigningKey: BUILD_546_PRIMARY_KEY,
    });
    expect(result.ok).toBe(false);
    const hash = hashInstitutionalConsentBinding({
      holder_subject_id: holder,
      credential_id: credential.payload.credential_id,
      partner_id: BUILD_566_PARTNER_A,
      policy_id: BUILD_566_POLICY_ID,
      policy_version: entry.policy_version,
      requested_attribute: entry.requested_attribute,
    });
    const stillValid = await validateInstitutionalPresentationConsentDirect({
      consentId,
      holderSubjectId: holder,
      credentialId: credential.payload.credential_id,
      partnerId: BUILD_566_PARTNER_A,
      policyId: BUILD_566_POLICY_ID,
      policyVersion: entry.policy_version,
      disclosureHash: hash,
    });
    expect(stillValid.ok).toBe(true);
  });

  it("recovers idempotently after resource commit when signing is deferred", async () => {
    const { holder, credential } = await holderWithCredential();
    const snapshot = buildSyntheticPortableRevocationSnapshot({
      receiptId: credential.payload.credential_id,
      state: "active",
    });
    process.env[PORTABLE_REVOCATION_BOOTSTRAP_TRUSTS_ENV] = JSON.stringify([
      bootstrapTrustFromArtifact({ artifact: snapshot }),
    ]);
    process.env.ABRAXAS_PORTABLE_REVOCATION_PUBLISHER_URL = "https://publisher.test";
    vi.spyOn(global, "fetch").mockResolvedValue(
      new Response(JSON.stringify(snapshot), { status: 200 }),
    );
    const entry = await resolveInstitutionalPartnerCatalogEntry({
      partnerId: BUILD_566_PARTNER_A,
      policyId: BUILD_566_POLICY_ID,
    });
    if (!entry) throw new Error("entry");
    const consentId = await consentFor({
      holder,
      credentialId: credential.payload.credential_id,
      partnerId: BUILD_566_PARTNER_A,
      policyId: BUILD_566_POLICY_ID,
      policyVersion: entry.policy_version,
      requestedAttribute: entry.requested_attribute,
    });
    const challenge = issuePassportPossessionChallenge({
      credentialId: credential.payload.credential_id,
      partnerId: BUILD_566_PARTNER_A,
      policyId: BUILD_566_POLICY_ID,
    });
    await insertPassportPossessionChallengeDirect(challenge);
    const proof = {
      challenge_id: challenge.challenge_id,
      signature: signPassportPossessionChallenge(challenge, holderKeys.secretKey),
    };
    const requestId = "req_idempotent_recovery_568";
    process.env[PASSPORT_AUTH_INJECT_FAIL_AFTER_RESOURCE_COMMIT_ENV] = "1";
    const deferred = await authorizeIssuerBackedPresentation({
      credential,
      holderSubjectId: holder,
      partnerId: BUILD_566_PARTNER_A,
      policyId: BUILD_566_POLICY_ID,
      consentId,
      requestId,
      challenge,
      holderPossessionProof: proof,
      receiptSigningKey: BUILD_546_PRIMARY_KEY,
    });
    expect(deferred.ok).toBe(false);
    delete process.env[PASSPORT_AUTH_INJECT_FAIL_AFTER_RESOURCE_COMMIT_ENV];
    const recovered = await authorizeIssuerBackedPresentation({
      credential,
      holderSubjectId: holder,
      partnerId: BUILD_566_PARTNER_A,
      policyId: BUILD_566_POLICY_ID,
      consentId,
      requestId,
      challenge,
      holderPossessionProof: proof,
      receiptSigningKey: BUILD_546_PRIMARY_KEY,
    });
    expect(recovered.ok).toBe(true);
  });
});
