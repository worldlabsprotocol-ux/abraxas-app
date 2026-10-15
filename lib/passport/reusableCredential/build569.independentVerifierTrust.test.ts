// FILE: lib/passport/reusableCredential/build569.independentVerifierTrust.test.ts

import { randomBytes } from "node:crypto";
import { execFileSync } from "node:child_process";
import { existsSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
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
import { BUILD_568_PARTNER_B_POLICY_ID } from "./testInstitutionalPolicySeed";
import { parseIndependentInstitutionConfig } from "./independentInstitutionConfig";
import {
  BUILD_546_PRIMARY_KEY,
  BUILD_546_UNKNOWN_KEY,
  build546TrustRegistryEnv,
} from "@/lib/institutionalCertification/build546/fixtures";
import {
  credentialIssuerRegistryFromKeyPair,
  PASSPORT_CREDENTIAL_ISSUER_REGISTRY_ENV,
} from "./credentialIssuerRegistry";
import {
  PASSPORT_CREDENTIAL_SIGNING_KEY_ENV,
  PASSPORT_CREDENTIAL_SIGNING_KEY_ID_ENV,
} from "./passportCredentialSigning";
import { CLAIM_ISSUERS } from "@/lib/credentials/claimSchema";
import {
  PORTABLE_REVOCATION_TEST_ISSUER_ID,
  buildSyntheticPortableRevocationSnapshot,
} from "@/lib/protocol/portableRevocation/fixtures";
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
import { seedBuild568InstitutionalPartnerPoliciesForTests } from "./testInstitutionalPolicySeed";
import { resolveInstitutionalPartnerCatalogEntry } from "./institutionalPartnerCatalog";
import { insertPassportPossessionChallengeDirect } from "@/lib/persistence/postgresPassportPossessionChallengeStore";
import {
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

describe("Build #569 independent verifier institution trust", () => {
  if (!PG_URL) {
    it.skip("requires disposable PostgreSQL (ABRAXAS_SOVEREIGN_PG_URL)", () => {});
    return;
  }

  const CREDENTIAL_KEY = generateTestSigningKeyPair("passport-credential-569-trust");
  const holderKeys = nacl.sign.keyPair.fromSeed(Uint8Array.from(Buffer.alloc(32, 82)));

  function trustEnvBase(): Record<string, string> {
    const registryEntry = credentialIssuerRegistryFromKeyPair({
      issuerId: CLAIM_ISSUERS.abraxas,
      key: CREDENTIAL_KEY,
      revocationIssuerId: PORTABLE_REVOCATION_TEST_ISSUER_ID,
      snapshotSigningKeyIds: [BUILD_546_PRIMARY_KEY.signingKeyId],
    });
    return {
      ...build546TrustRegistryEnv(),
      [PASSPORT_CREDENTIAL_ISSUER_REGISTRY_ENV]: JSON.stringify([registryEntry]),
      [PORTABLE_REVOCATION_ISSUER_TRUST_ENV]: build569PortableRevocationIssuerTrustJson(CREDENTIAL_KEY),
    };
  }

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
    for (const k of ["NEXT_PUBLIC_SUPABASE_URL", "SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY"]) {
      delete process.env[k];
    }
    process.env.ABRAXAS_PERSISTENCE_BACKEND = "postgres_direct";
    process.env.ABRAXAS_DATABASE_URL = PG_URL;
    process.env.ABRAXAS_PASSPORT_REUSABLE_CREDENTIAL_STORAGE = "1";
    process.env[PORTABLE_REVOCATION_CHECKPOINT_MEMORY_TEST_ENV] = "1";
    process.env.ABRAXAS_SIGNING_KEY = JSON.stringify(BUILD_546_PRIMARY_KEY.privateKeyJwk);
    process.env.ABRAXAS_SIGNING_KEY_ID = BUILD_546_PRIMARY_KEY.signingKeyId;
    Object.assign(process.env, trustEnvBase());
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
    resetAbraxasPgPoolForTests();
    resetPersistenceClientForTests();
  });

  async function authorizedBundle() {
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
    await tryBackfillPassportReusableCredentialForSubjectDirect({
      subjectKey: wallet.subjectId,
      eventSource: "build569_trust_adversarial",
    });
    const creds = await listPassportReusableCredentialsForHolderDirect(wallet.subjectId);
    const credential = creds[0]!;
    const snapshot = buildFreshPortableRevocationSnapshotForCredential(credential.payload.credential_id);
    const entry = await resolveInstitutionalPartnerCatalogEntry({
      partnerId: BUILD_566_PARTNER_A,
      policyId: BUILD_566_POLICY_ID,
    });
    if (!entry) throw new Error("catalog");
    const hash = hashInstitutionalConsentBinding({
      holder_subject_id: wallet.subjectId,
      credential_id: credential.payload.credential_id,
      partner_id: BUILD_566_PARTNER_A,
      policy_id: BUILD_566_POLICY_ID,
      policy_version: entry.policy_version,
      requested_attribute: entry.requested_attribute,
    });
    const consent = await insertInstitutionalPresentationConsentDirect({
      holderSubjectId: wallet.subjectId,
      credentialId: credential.payload.credential_id,
      partnerId: BUILD_566_PARTNER_A,
      policyId: BUILD_566_POLICY_ID,
      policyVersion: entry.policy_version,
      disclosureHash: hash,
    });
    if (!consent.ok) throw new Error(consent.code);
    const challenge = issuePassportPossessionChallenge({
      credentialId: credential.payload.credential_id,
      partnerId: BUILD_566_PARTNER_A,
      policyId: BUILD_566_POLICY_ID,
    });
    await insertPassportPossessionChallengeDirect(challenge);
    process.env[PORTABLE_REVOCATION_BOOTSTRAP_TRUSTS_ENV] = JSON.stringify([
      bootstrapTrustFromArtifact({ artifact: snapshot }),
    ]);
    process.env.ABRAXAS_PORTABLE_REVOCATION_PUBLISHER_URL = "https://publisher.test";
    mockPortableRevocationPublisher(snapshot);
    const auth = await authorizeIssuerBackedPresentation({
      credential,
      holderSubjectId: wallet.subjectId,
      partnerId: BUILD_566_PARTNER_A,
      policyId: BUILD_566_POLICY_ID,
      consentId: consent.consentId,
      requestId: `req_trust_${randomBytes(4).toString("hex")}`,
      challenge,
      holderPossessionProof: {
        challenge_id: challenge.challenge_id,
        signature: signPassportPossessionChallenge(challenge, holderKeys.secretKey),
      },
      receiptSigningKey: BUILD_546_PRIMARY_KEY,
    });
    if (!auth.ok) throw new Error("auth");
    const verifySnapshot = buildFreshPortableRevocationSnapshotForReceiptIds([
      credential.payload.credential_id,
      auth.authorized.receipt.id,
    ]);
    const bundle: PassportInstitutionalVerificationBundle = {
      credential,
      presentation: auth.authorized.presentation,
      portable_revocation_snapshot: verifySnapshot,
      partner_id: BUILD_566_PARTNER_A,
      policy_id: BUILD_566_POLICY_ID,
      request_id: "req_independent_operational",
    };
    const institution = build569IndependentInstitutionConfig({
      partnerId: BUILD_566_PARTNER_A,
      policyId: BUILD_566_POLICY_ID,
      trustEnv: trustEnvBase(),
      trustedBootstrapSnapshot: verifySnapshot,
    });
    return { bundle, institution, verifySnapshot, credential };
  }

  it("accepts authorized issuer credential and institution configured snapshot", async () => {
    const { bundle, institution } = await authorizedBundle();
    const consumptionDir = mkdtempSync(join(tmpdir(), "abx-b569-trust-consume-"));
    const checkpointDir = mkdtempSync(join(tmpdir(), "abx-b569-trust-checkpoint-"));
    const result = await verifyPassportInstitutionalBundleOperational(bundle, {
      institution,
      consumptionDir,
      checkpointDir,
    });
    expect(result.ok).toBe(true);
  });

  it("rejects attacker supplied snapshot that is not in institution bootstrap trust", async () => {
    const { bundle, institution, credential } = await authorizedBundle();
    const attackerSnapshot = buildSyntheticPortableRevocationSnapshot({
      receiptId: credential.payload.credential_id,
      sequence: 99,
      signingKey: BUILD_546_UNKNOWN_KEY,
    });
    const tampered = { ...bundle, portable_revocation_snapshot: attackerSnapshot };
    const consumptionDir = mkdtempSync(join(tmpdir(), "abx-b569-trust-attacker-"));
    const checkpointDir = mkdtempSync(join(tmpdir(), "abx-b569-trust-attacker-cp-"));
    const result = await verifyPassportInstitutionalBundleOperational(tampered, {
      institution,
      consumptionDir,
      checkpointDir,
    });
    expect(result.ok).toBe(false);
  });

  it("rejects unknown credential issuer and unbound receipt signing keys", async () => {
    const { bundle, institution, verifySnapshot } = await authorizedBundle();
    const unknownIssuerPayload = {
      ...bundle.credential.payload,
      issuer_id: "issuer:unknown-attacker",
    };
    const unknownCredential = signPassportReusableCredential(unknownIssuerPayload, CREDENTIAL_KEY);
    const unknownIssuerBundle = { ...bundle, credential: unknownCredential };
    const r1 = await verifyPassportInstitutionalBundleOperational(unknownIssuerBundle, {
      institution,
      consumptionDir: mkdtempSync(join(tmpdir(), "abx-b569-unknown-issuer-")),
      checkpointDir: mkdtempSync(join(tmpdir(), "abx-b569-unknown-issuer-cp-")),
    });
    expect(r1.ok).toBe(false);
    if (!r1.ok) expect(r1.stage).toBe("credential");

    const trustWithoutReceiptKey = {
      ...institution.trust_env,
      [PORTABLE_REVOCATION_ISSUER_TRUST_ENV]: JSON.stringify({
        bindings: [
          {
            receipt_signing_key_id: CREDENTIAL_KEY.signingKeyId,
            revocation_issuer_id: PORTABLE_REVOCATION_TEST_ISSUER_ID,
            snapshot_signing_key_ids: [BUILD_546_PRIMARY_KEY.signingKeyId],
          },
        ],
      }),
    };
    const narrowInstitution = build569IndependentInstitutionConfig({
      partnerId: BUILD_566_PARTNER_A,
      policyId: BUILD_566_POLICY_ID,
      trustEnv: trustWithoutReceiptKey,
      trustedBootstrapSnapshot: verifySnapshot,
    });
    const r2 = await verifyPassportInstitutionalBundleOperational(bundle, {
      institution: narrowInstitution,
      consumptionDir: mkdtempSync(join(tmpdir(), "abx-b569-unbound-receipt-")),
      checkpointDir: mkdtempSync(join(tmpdir(), "abx-b569-unbound-receipt-cp-")),
    });
    expect(r2.ok).toBe(false);
  });

  it("rejects stale or rolled back revocation snapshots", async () => {
    const { bundle, institution, verifySnapshot, credential } = await authorizedBundle();
    const consumptionDir = mkdtempSync(join(tmpdir(), "abx-b569-rollback-consume-"));
    const checkpointDir = mkdtempSync(join(tmpdir(), "abx-b569-rollback-cp-"));
    const first = await verifyPassportInstitutionalBundleOperational(bundle, {
      institution,
      consumptionDir,
      checkpointDir,
    });
    expect(first.ok).toBe(true);

    const staleSnapshot = buildFreshPortableRevocationSnapshotForCredential(credential.payload.credential_id);
    const staleBundle = {
      ...bundle,
      portable_revocation_snapshot: staleSnapshot,
      request_id: "req_stale_attempt",
    };
    const staleInstitution = build569IndependentInstitutionConfig({
      partnerId: BUILD_566_PARTNER_A,
      policyId: BUILD_566_POLICY_ID,
      trustEnv: institution.trust_env,
      trustedBootstrapSnapshot: staleSnapshot,
    });
    const second = await verifyPassportInstitutionalBundleOperational(staleBundle, {
      institution: staleInstitution,
      consumptionDir: mkdtempSync(join(tmpdir(), "abx-b569-stale-consume-")),
      checkpointDir,
    });
    expect(second.ok).toBe(false);
  });

  it("rejects receipt replay across separate CLI processes and retains durable state", async () => {
    const { bundle, institution } = await authorizedBundle();
    const workDir = mkdtempSync(join(tmpdir(), "abx-b569-cli-replay-"));
    const bundlePath = join(workDir, "bundle.json");
    const institutionPath = join(workDir, "institution.json");
    writeFileSync(bundlePath, JSON.stringify(bundle));
    writeFileSync(institutionPath, JSON.stringify(institution));
    const consumptionDir = join(workDir, "consumption");
    const checkpointDir = join(workDir, "checkpoints");

    const runCli = () =>
      execFileSync(
        join(process.cwd(), "node_modules/.bin/tsx"),
        [
          "scripts/build-569/independent-passport-verifier-cli.ts",
          bundlePath,
          "--institution-config",
          institutionPath,
          "--consumption-dir",
          consumptionDir,
          "--checkpoint-dir",
          checkpointDir,
        ],
        { encoding: "utf8", cwd: process.cwd() },
      );

    const firstOut = JSON.parse(runCli()) as { ok: boolean };
    expect(firstOut.ok).toBe(true);
    expect(existsSync(consumptionDir)).toBe(true);
    expect(readdirSync(checkpointDir).length).toBeGreaterThan(0);

    const replayBundle = { ...bundle, request_id: "req_cli_replay_second" };
    writeFileSync(bundlePath, JSON.stringify(replayBundle));
    let replayFailed = false;
    try {
      runCli();
    } catch {
      replayFailed = true;
    }
    expect(replayFailed).toBe(true);
  });

  it("Build #570: rejects cross institution evaluation of the same authorization bundle", async () => {
    const { bundle, institution, verifySnapshot } = await authorizedBundle();
    const institutionB = build569IndependentInstitutionConfig({
      partnerId: BUILD_566_PARTNER_B,
      policyId: BUILD_568_PARTNER_B_POLICY_ID,
      trustEnv: trustEnvBase(),
      trustedBootstrapSnapshot: verifySnapshot,
    });
    const consumptionRoot = mkdtempSync(join(tmpdir(), "abx-b570-cross-"));
    const checkpointRoot = mkdtempSync(join(tmpdir(), "abx-b570-cross-cp-"));
    const okA = await verifyPassportInstitutionalBundleOperational(bundle, {
      institution,
      consumptionDir: join(consumptionRoot, "a"),
      checkpointDir: join(checkpointRoot, "a"),
    });
    expect(okA.ok).toBe(true);
    const cross = await verifyPassportInstitutionalBundleOperational(
      { ...bundle, request_id: "req_cross_institution_reuse" },
      {
        institution: institutionB,
        consumptionDir: join(consumptionRoot, "b"),
        checkpointDir: join(checkpointRoot, "b"),
      },
    );
    expect(cross.ok).toBe(false);
  });

  it("Build #570: rejects missing institution portable revocation issuer trust", async () => {
    const parsed = parseIndependentInstitutionConfig({
      partner_id: BUILD_566_PARTNER_A,
      policy_id: BUILD_566_POLICY_ID,
      trust_env: { ABRAXAS_RECEIPT_VERIFICATION_REGISTRY: "[]" },
    });
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;
    const { bundle } = await authorizedBundle();
    const result = await verifyPassportInstitutionalBundleOperational(bundle, {
      institution: parsed.config,
      consumptionDir: mkdtempSync(join(tmpdir(), "abx-b570-no-trust-")),
      checkpointDir: mkdtempSync(join(tmpdir(), "abx-b570-no-trust-cp-")),
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.stage).toBe("institution_config");
  });

  it("Build #570: requires durable verifier store paths", async () => {
    const { bundle, institution } = await authorizedBundle();
    const result = await verifyPassportInstitutionalBundleOperational(bundle, {
      institution,
      consumptionDir: "  ",
      checkpointDir: "",
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe("durable_store_path_required");
  });
});
