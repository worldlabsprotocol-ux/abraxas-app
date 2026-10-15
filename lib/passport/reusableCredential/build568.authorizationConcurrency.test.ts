// FILE: lib/passport/reusableCredential/build568.authorizationConcurrency.test.ts

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
import { resetAbraxasPgPoolForTests, queryAbraxasPg } from "@/lib/persistence/pgPool";
import { resetPersistenceClientForTests } from "@/lib/persistence/admin";
import {
  tryBackfillPassportReusableCredentialForSubjectDirect,
  upsertPassportHolderPossessionKeyDirect,
  listPassportReusableCredentialsForHolderDirect,
} from "@/lib/persistence/passportReusableCredentialDirectStore";
import {
  BUILD_566_PARTNER_A,
  BUILD_566_POLICY_ID,
  buildFreshPortableRevocationSnapshotForCredential,
} from "./fixtures";
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
import {
  authorizeIssuerBackedPresentation,
  buildInstitutionalAuthorizationIdempotencyKey,
  PASSPORT_AUTH_INJECT_FAIL_AFTER_RESOURCE_COMMIT_ENV,
} from "./issuerBackedPresentationOrchestration";
import { seedBuild568InstitutionalPartnerPoliciesForTests } from "./testInstitutionalPolicySeed";
import { resolveInstitutionalPartnerCatalogEntry } from "./institutionalPartnerCatalog";
import { insertPassportPossessionChallengeDirect } from "@/lib/persistence/postgresPassportPossessionChallengeStore";
import { deterministicAuthorizationReceiptIds } from "./institutionalAuthorizationReceiptIds";
import { loadInstitutionalAuthorizationCommitDirect } from "@/lib/persistence/passportInstitutionalAuthorizationAtomic";

const PG_URL = process.env.ABRAXAS_SOVEREIGN_PG_URL?.trim()
  || process.env.MIGRATION_136_PG_URL?.trim()
  || process.env.ABRAXAS_DATABASE_URL?.trim()
  || undefined;

function mockPortableRevocationPublisher(snapshot: import("@/lib/protocol/portableRevocation").PortableRevocationSignedArtifact) {
  vi.spyOn(global, "fetch").mockImplementation(async () =>
    new Response(JSON.stringify(snapshot), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    }),
  );
}

const PG_SKIP_REASON =
  "sovereign Postgres concurrency tests unexecuted: set ABRAXAS_SOVEREIGN_PG_URL or ABRAXAS_DATABASE_URL";

describe("Build #568 canonical authorization concurrency (disposable PG)", () => {
  if (!PG_URL) {
    it.skip(PG_SKIP_REASON, () => {});
    it.skip(PG_SKIP_REASON, () => {});
    it.skip(PG_SKIP_REASON, () => {});
    return;
  }

  let evidenceDir: string;
  const CREDENTIAL_KEY = generateTestSigningKeyPair("passport-credential-568-conc");
  const holderKeys = nacl.sign.keyPair.fromSeed(Uint8Array.from(Buffer.alloc(32, 91)));

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
    evidenceDir = mkdtempSync(join(tmpdir(), "abx-b568-conc-"));
    for (const k of ["NEXT_PUBLIC_SUPABASE_URL", "SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY"]) {
      delete process.env[k];
    }
    process.env.ABRAXAS_PERSISTENCE_BACKEND = "postgres_direct";
    process.env.ABRAXAS_DATABASE_URL = PG_URL;
    process.env.ABRAXAS_PASSPORT_REUSABLE_CREDENTIAL_STORAGE = "1";
    process.env.ABRAXAS_EVIDENCE_STORAGE_ROOT = evidenceDir;
    process.env.ABRAXAS_EVIDENCE_ENCRYPTION_KEY = Buffer.alloc(32, 3).toString("base64");
    process.env[PORTABLE_REVOCATION_CHECKPOINT_MEMORY_TEST_ENV] = "1";
    process.env.ABRAXAS_SIGNING_KEY = JSON.stringify(BUILD_546_PRIMARY_KEY.privateKeyJwk);
    process.env.ABRAXAS_SIGNING_KEY_ID = BUILD_546_PRIMARY_KEY.signingKeyId;
    Object.assign(process.env, build546TrustRegistryEnv());
    const registryEntry = credentialIssuerRegistryFromKeyPair({
      issuerId: CLAIM_ISSUERS.abraxas,
      key: CREDENTIAL_KEY,
      revocationIssuerId: PORTABLE_REVOCATION_TEST_ISSUER_ID,
      snapshotSigningKeyIds: [BUILD_546_PRIMARY_KEY.signingKeyId],
    });
    process.env[PASSPORT_CREDENTIAL_ISSUER_REGISTRY_ENV] = JSON.stringify([registryEntry]);
    process.env[PASSPORT_CREDENTIAL_SIGNING_KEY_ENV] = JSON.stringify(CREDENTIAL_KEY.privateKeyJwk);
    process.env[PASSPORT_CREDENTIAL_SIGNING_KEY_ID_ENV] = CREDENTIAL_KEY.signingKeyId;
    resetAbraxasPgPoolForTests();
    resetPersistenceClientForTests();
    await queryAbraxasPg("delete from public.passport_institutional_authorization_commits");
    await queryAbraxasPg("delete from public.passport_institutional_presentation_consents");
    await queryAbraxasPg("delete from public.passport_reusable_credentials");
    await queryAbraxasPg("delete from public.passport_possession_challenges");
    await seedBuild568InstitutionalPartnerPoliciesForTests();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    rmSync(evidenceDir, { recursive: true, force: true });
    resetAbraxasPgPoolForTests();
    resetPersistenceClientForTests();
    delete process.env[PASSPORT_AUTH_INJECT_FAIL_AFTER_RESOURCE_COMMIT_ENV];
  });

  async function buildPresentationContext() {
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
      eventSource: "build568_concurrency_test",
    });
    if (!backfill.ok) throw new Error(backfill.code);
    const creds = await listPassportReusableCredentialsForHolderDirect(wallet.subjectId);
    const credential = creds[0]!;

    const snapshot = buildFreshPortableRevocationSnapshotForCredential(
      credential.payload.credential_id,
    );
    process.env[PORTABLE_REVOCATION_BOOTSTRAP_TRUSTS_ENV] = JSON.stringify([
      bootstrapTrustFromArtifact({ artifact: snapshot }),
    ]);
    process.env.ABRAXAS_PORTABLE_REVOCATION_PUBLISHER_URL = "https://publisher.test";
    mockPortableRevocationPublisher(snapshot);

    const entry = await resolveInstitutionalPartnerCatalogEntry({
      partnerId: BUILD_566_PARTNER_A,
      policyId: BUILD_566_POLICY_ID,
    });
    if (!entry) throw new Error("entry");

    const hash = hashInstitutionalConsentBinding({
      holder_subject_id: wallet.subjectId,
      credential_id: credential.payload.credential_id,
      partner_id: BUILD_566_PARTNER_A,
      policy_id: BUILD_566_POLICY_ID,
      policy_version: entry.policy_version,
      requested_attribute: entry.requested_attribute,
    });
    const consentRow = await insertInstitutionalPresentationConsentDirect({
      holderSubjectId: wallet.subjectId,
      credentialId: credential.payload.credential_id,
      partnerId: BUILD_566_PARTNER_A,
      policyId: BUILD_566_POLICY_ID,
      policyVersion: entry.policy_version,
      disclosureHash: hash,
    });
    if (!consentRow.ok) throw new Error(consentRow.code);

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

    return {
      credential,
      holderSubjectId: wallet.subjectId,
      partnerId: BUILD_566_PARTNER_A,
      policyId: BUILD_566_POLICY_ID,
      consentId: consentRow.consentId,
      challenge,
      holderPossessionProof: proof,
    };
  }

  function authorizeWithContext(
    ctx: Awaited<ReturnType<typeof buildPresentationContext>>,
    requestId: string,
  ) {
    return authorizeIssuerBackedPresentation({
      ...ctx,
      requestId,
      receiptSigningKey: BUILD_546_PRIMARY_KEY,
    });
  }

  it("produces one canonical receipt id under concurrent finalization", async () => {
    const ctx = await buildPresentationContext();
    const requestId = `req_concurrent_${randomBytes(4).toString("hex")}`;
    const results = await Promise.all(
      Array.from({ length: 12 }, () => authorizeWithContext(ctx, requestId)),
    );
    const successes = results.filter((r) => r.ok);
    expect(successes.length).toBeGreaterThan(0);
    const receiptIds = successes.map((r) => (r.ok ? r.authorized.receipt.id : ""));
    expect(new Set(receiptIds).size).toBe(1);

    const idempotencyKey = buildInstitutionalAuthorizationIdempotencyKey({
      credentialId: ctx.credential.payload.credential_id,
      partnerId: BUILD_566_PARTNER_A,
      requestId,
    });
    const stored = await loadInstitutionalAuthorizationCommitDirect(idempotencyKey);
    expect(stored?.receipt_json).toBeTruthy();
    const expected = deterministicAuthorizationReceiptIds(idempotencyKey);
    const parsed = JSON.parse(stored!.receipt_json!) as { id: string };
    expect(parsed.id).toBe(expected.receiptId);
  });

  it("rejects mismatched retry context without leaking receipt", async () => {
    const ctx = await buildPresentationContext();
    const requestId = `req_mismatch_${randomBytes(4).toString("hex")}`;
    const first = await authorizeWithContext(ctx, requestId);
    expect(first.ok).toBe(true);
    if (!first.ok) return;

    const idempotencyKey = buildInstitutionalAuthorizationIdempotencyKey({
      credentialId: ctx.credential.payload.credential_id,
      partnerId: BUILD_566_PARTNER_A,
      requestId,
    });

    const stored = await loadInstitutionalAuthorizationCommitDirect(idempotencyKey);
    expect(stored).toBeTruthy();

    const wrongConsent = await insertInstitutionalPresentationConsentDirect({
      holderSubjectId: stored!.holder_subject_id,
      credentialId: stored!.credential_id,
      partnerId: BUILD_566_PARTNER_A,
      policyId: BUILD_566_POLICY_ID,
      policyVersion: 1,
      disclosureHash: hashInstitutionalConsentBinding({
        holder_subject_id: stored!.holder_subject_id,
        credential_id: stored!.credential_id,
        partner_id: BUILD_566_PARTNER_A,
        policy_id: BUILD_566_POLICY_ID,
        policy_version: 1,
        requested_attribute: "product_eligibility (authenticated issuer outcome)",
      }),
    });
    if (!wrongConsent.ok) throw new Error(wrongConsent.code);

    const retry = await authorizeIssuerBackedPresentation({
      credential: ctx.credential,
      holderSubjectId: ctx.holderSubjectId,
      partnerId: BUILD_566_PARTNER_A,
      policyId: BUILD_566_POLICY_ID,
      consentId: wrongConsent.consentId,
      requestId,
      challenge: ctx.challenge,
      holderPossessionProof: ctx.holderPossessionProof,
      receiptSigningKey: BUILD_546_PRIMARY_KEY,
    });
    expect(retry.ok).toBe(false);
    if (!retry.ok) expect(retry.code).toBe("authorization_context_mismatch");
  });

  it("returns pending when signing is deferred and never unpersisted success", async () => {
    const ctx = await buildPresentationContext();
    const requestId = `req_defer_${randomBytes(4).toString("hex")}`;
    process.env[PASSPORT_AUTH_INJECT_FAIL_AFTER_RESOURCE_COMMIT_ENV] = "1";
    const deferred = await authorizeWithContext(ctx, requestId);
    expect(deferred.ok).toBe(false);
    if (deferred.ok) return;
    expect(deferred.code).toBe("authorization_signing_deferred");

    delete process.env[PASSPORT_AUTH_INJECT_FAIL_AFTER_RESOURCE_COMMIT_ENV];
    const recovered = await authorizeWithContext(ctx, requestId);
    expect(recovered.ok).toBe(true);
  });
});
