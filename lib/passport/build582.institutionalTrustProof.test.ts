// FILE: lib/passport/build582.institutionalTrustProof.test.ts

import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { resetAbraxasPgPoolForTests, queryAbraxasPg } from "@/lib/persistence/pgPool";
import { resetPersistenceClientForTests } from "@/lib/persistence/admin";
import { seedBuild568InstitutionalPartnerPoliciesForTests } from "@/lib/passport/reusableCredential/testInstitutionalPolicySeed";
import { buildFreshPortableRevocationSnapshotForCredential } from "@/lib/passport/reusableCredential/fixtures";
import { verifyPassportInstitutionalBundleOperational } from "@/lib/passport/reusableCredential/independentPassportVerifier";
import { signPassportReusableCredential } from "@/lib/passport/reusableCredential/sign";
import { BUILD_546_PRIMARY_KEY, BUILD_546_UNKNOWN_KEY } from "@/lib/institutionalCertification/build546/fixtures";
import {
  buildSyntheticPortableRevocationSnapshot,
  PORTABLE_REVOCATION_TEST_ISSUER_ID,
} from "@/lib/protocol/portableRevocation/fixtures";
import { portableRevocationStatusId } from "@/lib/protocol/portableRevocation/statusId";
import { build569IndependentInstitutionConfig } from "@/lib/passport/reusableCredential/build569IndependentInstitutionTestHelpers";
import {
  BUILD_582_CREDENTIAL_KEY,
  BUILD_582_TENANT_A,
  BUILD_582_TENANT_B,
  build582AuthorizePresentation,
  build582SyntheticApprovedHolder,
  build582TrustEnvBase,
  resetBuild582PublisherSnapshotsForTests,
  resolveBuild582PublisherSnapshot,
} from "@/lib/passport/build582/institutionalTrustProofHelpers";
import {
  applyBuild582TrustProofRuntimeEnv,
  applyBuild582TrustProofSchemaMigrations,
  clearBuild582TrustProofRuntimeEnv,
  dropBuild582IsolatedTrustProofDatabase,
  evaluateBuild582DisposableTrustProofBootstrap,
  provisionBuild582IsolatedTrustProofDatabase,
} from "@/lib/passport/build582/disposableTrustProofDatabase";
import {
  PASSPORT_CREDENTIAL_SIGNING_KEY_ENV,
  PASSPORT_CREDENTIAL_SIGNING_KEY_ID_ENV,
} from "@/lib/passport/reusableCredential/passportCredentialSigning";
import { PORTABLE_REVOCATION_CHECKPOINT_MEMORY_TEST_ENV } from "@/lib/passport/reusableCredential/portableRevocationRuntime";

const bootstrap = evaluateBuild582DisposableTrustProofBootstrap(process.env);
const canRun = bootstrap.ok;
const blockedReason = bootstrap.ok ? "" : bootstrap.reason;

describe("Build #582 institutional trust proof infrastructure", () => {
  it("reports disposable guard state explicitly", () => {
    if (canRun) {
      expect(bootstrap.ok).toBe(true);
      expect(bootstrap.databaseIdentity).toBe("abraxas_sovereign_disposable");
    } else {
      expect(blockedReason.length).toBeGreaterThan(0);
    }
  });
});

describe.skipIf(!canRun)("Build #582 institutional trust proof (isolated disposable PostgreSQL)", () => {
  let bootstrapDatabaseUrl: string;
  let isolatedDbName: string;
  let isolatedDatabaseUrl: string;

  beforeAll(() => {
    if (!bootstrap.ok) return;
    bootstrapDatabaseUrl = bootstrap.bootstrapDatabaseUrl;
    const provisioned = provisionBuild582IsolatedTrustProofDatabase({ bootstrapDatabaseUrl });
    isolatedDbName = provisioned.dbName;
    isolatedDatabaseUrl = provisioned.databaseUrl;
    applyBuild582TrustProofSchemaMigrations(isolatedDatabaseUrl);
    applyBuild582TrustProofRuntimeEnv(isolatedDatabaseUrl);
    resetAbraxasPgPoolForTests();
  });

  afterAll(() => {
    if (!bootstrap.ok) return;
    clearBuild582TrustProofRuntimeEnv();
    resetAbraxasPgPoolForTests();
    dropBuild582IsolatedTrustProofDatabase({
      bootstrapDatabaseUrl: bootstrapDatabaseUrl!,
      dbName: isolatedDbName!,
    });
  });

  async function cleanupFixtures() {
    await queryAbraxasPg("delete from public.passport_institutional_authorization_commits");
    await queryAbraxasPg("delete from public.passport_institutional_presentation_consents");
    await queryAbraxasPg("delete from public.passport_reusable_credentials");
    await queryAbraxasPg("delete from public.passport_possession_challenges");
  }

  beforeEach(async () => {
    for (const k of ["NEXT_PUBLIC_SUPABASE_URL", "SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY"]) {
      delete process.env[k];
    }
    applyBuild582TrustProofRuntimeEnv(isolatedDatabaseUrl);
    process.env[PORTABLE_REVOCATION_CHECKPOINT_MEMORY_TEST_ENV] = "1";
    process.env.ABRAXAS_SIGNING_KEY = JSON.stringify(BUILD_546_PRIMARY_KEY.privateKeyJwk);
    process.env.ABRAXAS_SIGNING_KEY_ID = BUILD_546_PRIMARY_KEY.signingKeyId;
    Object.assign(process.env, build582TrustEnvBase());
    process.env[PASSPORT_CREDENTIAL_SIGNING_KEY_ENV] = JSON.stringify(BUILD_582_CREDENTIAL_KEY.privateKeyJwk);
    process.env[PASSPORT_CREDENTIAL_SIGNING_KEY_ID_ENV] = BUILD_582_CREDENTIAL_KEY.signingKeyId;
    resetAbraxasPgPoolForTests();
    resetPersistenceClientForTests();
    await cleanupFixtures();
    await seedBuild568InstitutionalPartnerPoliciesForTests();
    resetBuild582PublisherSnapshotsForTests();
    vi.spyOn(global, "fetch").mockImplementation(async (input) => {
      const url = typeof input === "string" ? input : input.url;
      const statusId = decodeURIComponent(url.split("/status/")[1]?.split("?")[0] ?? "");
      const snapshot = resolveBuild582PublisherSnapshot(statusId);
      if (!snapshot) {
        return new Response(JSON.stringify({ error: "snapshot_missing" }), { status: 404 });
      }
      return new Response(JSON.stringify(snapshot), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    });
  });

  afterEach(async () => {
    vi.restoreAllMocks();
    try {
      await cleanupFixtures();
    } finally {
      resetAbraxasPgPoolForTests();
      resetPersistenceClientForTests();
    }
  });

  it("two tenants, one credential, two consents, two independently verified receipts", async () => {
    const holder = await build582SyntheticApprovedHolder();
    const tenantA = await build582AuthorizePresentation({
      ...holder,
      ...BUILD_582_TENANT_A,
      requestId: "req_582_tenant_a",
    });
    const tenantB = await build582AuthorizePresentation({
      ...holder,
      ...BUILD_582_TENANT_B,
      requestId: "req_582_tenant_b",
    });

    const verifyA = await verifyPassportInstitutionalBundleOperational(tenantA.bundle, {
      institution: tenantA.institution,
      consumptionDir: mkdtempSync(join(tmpdir(), "abx-582-a-consume-")),
      checkpointDir: mkdtempSync(join(tmpdir(), "abx-582-a-cp-")),
    });
    const verifyB = await verifyPassportInstitutionalBundleOperational(tenantB.bundle, {
      institution: tenantB.institution,
      consumptionDir: mkdtempSync(join(tmpdir(), "abx-582-b-consume-")),
      checkpointDir: mkdtempSync(join(tmpdir(), "abx-582-b-cp-")),
    });
    expect(verifyA.ok).toBe(true);
    expect(verifyB.ok).toBe(true);
    expect(tenantA.receiptId).not.toBe(tenantB.receiptId);
  });

  it("rejects cross tenant evaluation of tenant A bundle", async () => {
    const holder = await build582SyntheticApprovedHolder();
    const tenantA = await build582AuthorizePresentation({
      ...holder,
      ...BUILD_582_TENANT_A,
      requestId: "req_582_cross",
    });
    const institutionB = build569IndependentInstitutionConfig({
      partnerId: BUILD_582_TENANT_B.partnerId,
      policyId: BUILD_582_TENANT_B.policyId,
      trustEnv: build582TrustEnvBase(),
      trustedBootstrapSnapshot: tenantA.bundle.portable_revocation_snapshot,
    });
    const cross = await verifyPassportInstitutionalBundleOperational(
      { ...tenantA.bundle, request_id: "req_582_cross_wrong_tenant" },
      {
        institution: institutionB,
        consumptionDir: mkdtempSync(join(tmpdir(), "abx-582-cross-")),
        checkpointDir: mkdtempSync(join(tmpdir(), "abx-582-cross-cp-")),
      },
    );
    expect(cross.ok).toBe(false);
  });

  it("rejects wrong policy, forged issuer, and attacker supplied revocation snapshot", async () => {
    const holder = await build582SyntheticApprovedHolder();
    const tenantA = await build582AuthorizePresentation({
      ...holder,
      ...BUILD_582_TENANT_A,
      requestId: "req_582_adversarial",
    });
    const wrongPolicy = await verifyPassportInstitutionalBundleOperational(
      { ...tenantA.bundle, policy_id: BUILD_582_TENANT_B.policyId, request_id: "req_wrong_policy" },
      {
        institution: tenantA.institution,
        consumptionDir: mkdtempSync(join(tmpdir(), "abx-582-wp-")),
        checkpointDir: mkdtempSync(join(tmpdir(), "abx-582-wp-cp-")),
      },
    );
    expect(wrongPolicy.ok).toBe(false);

    const forgedCredential = signPassportReusableCredential(
      { ...tenantA.bundle.credential.payload, issuer_id: "issuer:attacker" },
      BUILD_582_CREDENTIAL_KEY,
    );
    const forged = await verifyPassportInstitutionalBundleOperational(
      { ...tenantA.bundle, credential: forgedCredential, request_id: "req_forged_issuer" },
      {
        institution: tenantA.institution,
        consumptionDir: mkdtempSync(join(tmpdir(), "abx-582-forged-")),
        checkpointDir: mkdtempSync(join(tmpdir(), "abx-582-forged-cp-")),
      },
    );
    expect(forged.ok).toBe(false);

    const attackerSnapshot = buildSyntheticPortableRevocationSnapshot({
      receiptId: tenantA.bundle.credential.payload.credential_id,
      sequence: 99,
      signingKey: BUILD_546_UNKNOWN_KEY,
    });
    const snapshotAttack = await verifyPassportInstitutionalBundleOperational(
      { ...tenantA.bundle, portable_revocation_snapshot: attackerSnapshot, request_id: "req_bad_snapshot" },
      {
        institution: tenantA.institution,
        consumptionDir: mkdtempSync(join(tmpdir(), "abx-582-snap-")),
        checkpointDir: mkdtempSync(join(tmpdir(), "abx-582-snap-cp-")),
      },
    );
    expect(snapshotAttack.ok).toBe(false);
  });

  it("rejects receipt replay and revoked credential in portable revocation snapshot", async () => {
    const holder = await build582SyntheticApprovedHolder();
    const tenantA = await build582AuthorizePresentation({
      ...holder,
      ...BUILD_582_TENANT_A,
      requestId: "req_582_replay",
    });
    const consumptionDir = mkdtempSync(join(tmpdir(), "abx-582-replay-consume-"));
    const checkpointDir = mkdtempSync(join(tmpdir(), "abx-582-replay-cp-"));
    const first = await verifyPassportInstitutionalBundleOperational(tenantA.bundle, {
      institution: tenantA.institution,
      consumptionDir,
      checkpointDir,
    });
    expect(first.ok).toBe(true);

    const replay = await verifyPassportInstitutionalBundleOperational(
      { ...tenantA.bundle, request_id: "req_582_replay_second" },
      { institution: tenantA.institution, consumptionDir, checkpointDir },
    );
    expect(replay.ok).toBe(false);

    const credentialId = tenantA.bundle.credential.payload.credential_id;
    const revokedSnapshot = buildSyntheticPortableRevocationSnapshot({
      receiptId: credentialId,
      state: "revoked",
      sequence: tenantA.bundle.portable_revocation_snapshot.payload.snapshot_sequence + 1,
    });
    expect(
      revokedSnapshot.payload.status_entries.some(
        (entry) => entry.status_id === portableRevocationStatusId(credentialId, PORTABLE_REVOCATION_TEST_ISSUER_ID)
          && entry.state === "revoked",
      ),
    ).toBe(true);
    const revokedBundle = { ...tenantA.bundle, portable_revocation_snapshot: revokedSnapshot, request_id: "req_582_revoked" };
    const revoked = await verifyPassportInstitutionalBundleOperational(revokedBundle, {
      institution: tenantA.institution,
      consumptionDir: mkdtempSync(join(tmpdir(), "abx-582-revoked-")),
      checkpointDir: mkdtempSync(join(tmpdir(), "abx-582-revoked-cp-")),
    });
    expect(revoked.ok).toBe(false);
  });

  it("rejects stale portable revocation snapshot sequence on second verify", async () => {
    const holder = await build582SyntheticApprovedHolder();
    const tenantA = await build582AuthorizePresentation({
      ...holder,
      ...BUILD_582_TENANT_A,
      requestId: "req_582_stale",
    });
    const consumptionDir = mkdtempSync(join(tmpdir(), "abx-582-stale-consume-"));
    const checkpointDir = mkdtempSync(join(tmpdir(), "abx-582-stale-cp-"));
    const first = await verifyPassportInstitutionalBundleOperational(tenantA.bundle, {
      institution: tenantA.institution,
      consumptionDir,
      checkpointDir,
    });
    expect(first.ok).toBe(true);

    const staleSnapshot = buildFreshPortableRevocationSnapshotForCredential(
      tenantA.bundle.credential.payload.credential_id,
    );
    const staleBundle = {
      ...tenantA.bundle,
      portable_revocation_snapshot: staleSnapshot,
      request_id: "req_582_stale_second",
    };
    const staleInstitution = build569IndependentInstitutionConfig({
      partnerId: BUILD_582_TENANT_A.partnerId,
      policyId: BUILD_582_TENANT_A.policyId,
      trustEnv: build582TrustEnvBase(),
      trustedBootstrapSnapshot: staleSnapshot,
    });
    const stale = await verifyPassportInstitutionalBundleOperational(staleBundle, {
      institution: staleInstitution,
      consumptionDir: mkdtempSync(join(tmpdir(), "abx-582-stale2-consume-")),
      checkpointDir,
    });
    expect(stale.ok).toBe(false);
  });
});
