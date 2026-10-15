// FILE: lib/passport/reusableCredential/build569.sovereignExecutionProof.test.ts

import { randomBytes } from "node:crypto";
import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
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
  BUILD_566_PARTNER_B,
  BUILD_566_POLICY_ID,
  buildFreshPortableRevocationSnapshotForCredential,
  buildFreshPortableRevocationSnapshotForReceiptIds,
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
import { bootstrapTrustFromArtifact } from "@/lib/protocol/portableRevocation";
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
import {
  verifyPassportInstitutionalBundleInMemoryForTests,
  verifyPassportInstitutionalBundleOperational,
  type PassportInstitutionalVerificationBundle,
} from "./independentPassportVerifier";
import { PORTABLE_REVOCATION_ISSUER_TRUST_ENV } from "./independentInstitutionConfig";
import {
  build569IndependentInstitutionConfig,
  build569PortableRevocationIssuerTrustJson,
} from "./build569IndependentInstitutionTestHelpers";
import { signPassportReusableCredential } from "./sign";

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

function publicTrustEnv(credentialKey: ReturnType<typeof generateTestSigningKeyPair>): Record<string, string> {
  return {
    ...build546TrustRegistryEnv(),
    [PASSPORT_CREDENTIAL_ISSUER_REGISTRY_ENV]: process.env[PASSPORT_CREDENTIAL_ISSUER_REGISTRY_ENV] ?? "[]",
    [PORTABLE_REVOCATION_ISSUER_TRUST_ENV]: build569PortableRevocationIssuerTrustJson(credentialKey),
  };
}

describe("Build #569 sovereign Passport execution and independent verifier proof", () => {
  if (!PG_URL) {
    it.skip("requires disposable PostgreSQL (ABRAXAS_SOVEREIGN_PG_URL)", () => {});
    return;
  }

  let evidenceDir: string;
  let checkpointDir: string;
  const CREDENTIAL_KEY = generateTestSigningKeyPair("passport-credential-569");
  const holderKeys = nacl.sign.keyPair.fromSeed(Uint8Array.from(Buffer.alloc(32, 71)));

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
    evidenceDir = mkdtempSync(join(tmpdir(), "abx-b569-evidence-"));
    checkpointDir = mkdtempSync(join(tmpdir(), "abx-b569-checkpoint-"));
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
    process.env[PASSPORT_CREDENTIAL_SIGNING_KEY_ENV] = JSON.stringify(CREDENTIAL_KEY.privateKeyJwk);
    process.env[PASSPORT_CREDENTIAL_SIGNING_KEY_ID_ENV] = CREDENTIAL_KEY.signingKeyId;
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
    vi.restoreAllMocks();
    rmSync(evidenceDir, { recursive: true, force: true });
    rmSync(checkpointDir, { recursive: true, force: true });
    resetAbraxasPgPoolForTests();
    resetPersistenceClientForTests();
  });

  async function holderJourneyCredential() {
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
      eventSource: "build569_execution_proof",
    });
    if (!backfill.ok) throw new Error(backfill.code);
    const creds = await listPassportReusableCredentialsForHolderDirect(wallet.subjectId);
    return { holder: wallet.subjectId, credential: creds[0]! };
  }

  async function presentInstitution(input: {
    holder: string;
    credential: Awaited<ReturnType<typeof holderJourneyCredential>>["credential"];
    partnerId: string;
    policyId: string;
    requestId: string;
    snapshot: ReturnType<typeof buildFreshPortableRevocationSnapshotForCredential>;
  }) {
    const entry = await resolveInstitutionalPartnerCatalogEntry({
      partnerId: input.partnerId,
      policyId: input.policyId,
    });
    if (!entry) throw new Error("catalog");
    const hash = hashInstitutionalConsentBinding({
      holder_subject_id: input.holder,
      credential_id: input.credential.payload.credential_id,
      partner_id: input.partnerId,
      policy_id: input.policyId,
      policy_version: entry.policy_version,
      requested_attribute: entry.requested_attribute,
    });
    const consent = await insertInstitutionalPresentationConsentDirect({
      holderSubjectId: input.holder,
      credentialId: input.credential.payload.credential_id,
      partnerId: input.partnerId,
      policyId: input.policyId,
      policyVersion: entry.policy_version,
      disclosureHash: hash,
    });
    if (!consent.ok) throw new Error(consent.code);
    const challenge = issuePassportPossessionChallenge({
      credentialId: input.credential.payload.credential_id,
      partnerId: input.partnerId,
      policyId: input.policyId,
    });
    await insertPassportPossessionChallengeDirect(challenge);
    const proof = {
      challenge_id: challenge.challenge_id,
      signature: signPassportPossessionChallenge(challenge, holderKeys.secretKey),
    };
    process.env[PORTABLE_REVOCATION_BOOTSTRAP_TRUSTS_ENV] = JSON.stringify([
      bootstrapTrustFromArtifact({ artifact: input.snapshot }),
    ]);
    process.env.ABRAXAS_PORTABLE_REVOCATION_PUBLISHER_URL = "https://publisher.test";
    mockPortableRevocationPublisher(input.snapshot);
    return authorizeIssuerBackedPresentation({
      credential: input.credential,
      holderSubjectId: input.holder,
      partnerId: input.partnerId,
      policyId: input.policyId,
      consentId: consent.consentId,
      requestId: input.requestId,
      challenge,
      holderPossessionProof: proof,
      receiptSigningKey: BUILD_546_PRIMARY_KEY,
    });
  }

  it("executes holder journey and independently verifies two institutions without identity DB", async () => {
    const { holder, credential } = await holderJourneyCredential();
    const snapshot = buildFreshPortableRevocationSnapshotForCredential(credential.payload.credential_id);
    const trustEnv = publicTrustEnv(CREDENTIAL_KEY);

    const instA = await presentInstitution({
      holder,
      credential,
      partnerId: BUILD_566_PARTNER_A,
      policyId: BUILD_566_POLICY_ID,
      requestId: `req_569_a_${randomBytes(4).toString("hex")}`,
      snapshot,
    });
    expect(instA.ok).toBe(true);
    if (!instA.ok) return;

    const instB = await presentInstitution({
      holder,
      credential,
      partnerId: BUILD_566_PARTNER_B,
      policyId: BUILD_568_PARTNER_B_POLICY_ID,
      requestId: `req_569_b_${randomBytes(4).toString("hex")}`,
      snapshot,
    });
    expect(instB.ok).toBe(true);
    if (!instB.ok) return;

    const consumptionA = join(tmpdir(), `abx-b569-consume-a-${randomBytes(4).toString("hex")}`);
    const consumptionB = join(tmpdir(), `abx-b569-consume-b-${randomBytes(4).toString("hex")}`);

    async function verifySide(
      label: string,
      auth: typeof instA,
      partnerId: string,
      policyId: string,
      requestId: string,
      consumptionDir: string,
    ) {
      if (!auth.ok) throw new Error("auth");
      const verifySnapshot = buildFreshPortableRevocationSnapshotForReceiptIds([
        credential.payload.credential_id,
        auth.authorized.receipt.id,
      ]);
      const bundle: PassportInstitutionalVerificationBundle = {
        credential,
        presentation: auth.authorized.presentation,
        portable_revocation_snapshot: verifySnapshot,
        partner_id: partnerId,
        policy_id: policyId,
        request_id: `${requestId}_independent_verify`,
      };
      const bundlePath = join(evidenceDir, `${label}-bundle.json`);
      writeFileSync(bundlePath, JSON.stringify(bundle, null, 2));
      const institution = build569IndependentInstitutionConfig({
        partnerId,
        policyId,
        trustEnv,
        trustedBootstrapSnapshot: verifySnapshot,
      });
      const institutionPath = join(evidenceDir, `${label}-institution.json`);
      writeFileSync(institutionPath, JSON.stringify(institution, null, 2));

      const inProcessConsumption = join(consumptionDir, "in-process");
      const cliConsumption = join(consumptionDir, "cli");
      const inProcessCheckpoint = join(checkpointDir, label);
      const cliCheckpoint = join(checkpointDir, `${label}-cli`);

      const inProcess = await verifyPassportInstitutionalBundleOperational(bundle, {
        institution,
        consumptionDir: inProcessConsumption,
        checkpointDir: inProcessCheckpoint,
      });
      expect(inProcess.ok).toBe(true);

      const cliOut = execFileSync(
        join(process.cwd(), "node_modules/.bin/tsx"),
        [
          "scripts/build-569/independent-passport-verifier-cli.ts",
          bundlePath,
          "--institution-config",
          institutionPath,
          "--consumption-dir",
          cliConsumption,
          "--checkpoint-dir",
          cliCheckpoint,
        ],
        {
          encoding: "utf8",
          cwd: process.cwd(),
          env: { ...process.env, ...trustEnv },
          stdio: ["ignore", "pipe", "pipe"],
        },
      );
      const cliParsed = JSON.parse(cliOut) as { ok: boolean };
      expect(cliParsed.ok).toBe(true);
      return bundle;
    }

    const bundleA = await verifySide(
      "institution-a",
      instA,
      BUILD_566_PARTNER_A,
      BUILD_566_POLICY_ID,
      "req_569_a",
      consumptionA,
    );
    const bundleB = await verifySide(
      "institution-b",
      instB,
      BUILD_566_PARTNER_B,
      BUILD_568_PARTNER_B_POLICY_ID,
      "req_569_b",
      consumptionB,
    );

    expect(bundleA.presentation.signed_decision_receipt.partner_id).toBe(BUILD_566_PARTNER_A);
    expect(bundleB.presentation.signed_decision_receipt.partner_id).toBe(BUILD_566_PARTNER_B);
    expect(bundleA.presentation.signed_decision_receipt.id).not.toBe(
      bundleB.presentation.signed_decision_receipt.id,
    );
  });

  it("independent verifier rejects audience mismatch, forged issuer signature, and replay", async () => {
    const { holder, credential } = await holderJourneyCredential();
    const snapshot = buildFreshPortableRevocationSnapshotForCredential(credential.payload.credential_id);
    const trustEnv = publicTrustEnv(CREDENTIAL_KEY);
    const auth = await presentInstitution({
      holder,
      credential,
      partnerId: BUILD_566_PARTNER_A,
      policyId: BUILD_566_POLICY_ID,
      requestId: `req_569_neg_${randomBytes(4).toString("hex")}`,
      snapshot,
    });
    expect(auth.ok).toBe(true);
    if (!auth.ok) return;

    const verifySnapshot = buildFreshPortableRevocationSnapshotForReceiptIds([
      credential.payload.credential_id,
      auth.authorized.receipt.id,
    ]);
    const bundle: PassportInstitutionalVerificationBundle = {
      credential,
      presentation: auth.authorized.presentation,
      portable_revocation_snapshot: verifySnapshot,
      partner_id: BUILD_566_PARTNER_B,
      policy_id: BUILD_568_PARTNER_B_POLICY_ID,
      request_id: "req_569_wrong_audience",
    };
    const wrongInstitution = build569IndependentInstitutionConfig({
      partnerId: BUILD_566_PARTNER_B,
      policyId: BUILD_568_PARTNER_B_POLICY_ID,
      trustEnv,
      trustedBootstrapSnapshot: verifySnapshot,
    });
    const wrongAudience = await verifyPassportInstitutionalBundleInMemoryForTests(
      {
        ...bundle,
        partner_id: BUILD_566_PARTNER_A,
        policy_id: BUILD_566_POLICY_ID,
      },
      { institution: wrongInstitution, testMemoryStores: true },
    );
    expect(wrongAudience.ok).toBe(false);

    const forgedKey = generateTestSigningKeyPair("forged-569");
    const forgedCredential = signPassportReusableCredential(credential.payload, forgedKey);
    const forgedBundle: PassportInstitutionalVerificationBundle = {
      ...bundle,
      credential: forgedCredential,
      partner_id: BUILD_566_PARTNER_A,
      policy_id: BUILD_566_POLICY_ID,
    };
    const goodInstitution = build569IndependentInstitutionConfig({
      partnerId: BUILD_566_PARTNER_A,
      policyId: BUILD_566_POLICY_ID,
      trustEnv,
      trustedBootstrapSnapshot: verifySnapshot,
    });
    const forged = await verifyPassportInstitutionalBundleInMemoryForTests(forgedBundle, {
      institution: goodInstitution,
      testMemoryStores: true,
    });
    expect(forged.ok).toBe(false);

    const consumptionDir = mkdtempSync(join(tmpdir(), "abx-b569-replay-"));
    const checkpointDirReplay = mkdtempSync(join(tmpdir(), "abx-b569-checkpoint-replay-"));
    const goodBundle: PassportInstitutionalVerificationBundle = {
      credential,
      presentation: auth.authorized.presentation,
      portable_revocation_snapshot: verifySnapshot,
      partner_id: BUILD_566_PARTNER_A,
      policy_id: BUILD_566_POLICY_ID,
      request_id: "req_569_replay_first",
    };
    const first = await verifyPassportInstitutionalBundleOperational(goodBundle, {
      institution: goodInstitution,
      consumptionDir,
      checkpointDir: checkpointDirReplay,
    });
    expect(first.ok).toBe(true);
    const replay = await verifyPassportInstitutionalBundleOperational(
      { ...goodBundle, request_id: "req_569_replay_second" },
      { institution: goodInstitution, consumptionDir, checkpointDir: checkpointDirReplay },
    );
    expect(replay.ok).toBe(false);
    if (!replay.ok && replay.stage === "relying_party" && replay.decision) {
      expect(replay.decision.replay_detected).toBe(true);
    }
  });
});
