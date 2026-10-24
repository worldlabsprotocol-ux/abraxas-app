/**
 * Build #815 — sovereign operational proof on isolated PostgreSQL.
 * Requires: Postgres service, ABRAXAS_SOVEREIGN_OPERATIONAL_PROOF=1
 * Does not use Supabase SDK or credentials.
 */
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import pg from "pg";
import {
  buildCanonicalPayload,
} from "@/lib/decisionReceipts/canonical";
import {
  generateTestSigningKeyPair,
  signReceiptPayload,
  verifyReceiptSignature,
} from "@/lib/decisionReceipts/signing";
import { subjectPseudonymId } from "@/lib/decisionReceipts/pseudonym";
import type { DecisionReceiptRecord } from "@/lib/decisionReceipts/types";
import { loadReceiptProvenanceFromSovereignPg } from "./verticalSlice/receiptProvenance";
import { loadMeteringAttributionFromSovereignPg } from "./verticalSlice/meteringAttribution";
import { evaluateReceiptFreshnessFromSovereignPg } from "./verticalSlice/freshnessEvaluation";
import {
  applySovereignSliceSchema,
  seedSovereignSliceFixtures,
  truncateSovereignSlice,
} from "./sovereignSlice/bootstrap";
import {
  exportSovereignSliceBackup,
  restoreSovereignSliceBackup,
  evaluateRestoreDrillEnv,
} from "./sovereignSlice/backupRestore";
import {
  assertReconciliationEqual,
  reconcileSovereignSlice,
} from "./sovereignSlice/reconciliation";
import { assertSovereignStagingWriteAllowed } from "./isolationGuard";
import { buildPartnerFlowReceiptMeteringKey } from "@/lib/partner/partnerMetering";
import { resetSovereignStagingPgPoolForTests } from "./sovereignStagingPg";
import {
  exportEncryptedSovereignSliceBackup,
  restoreEncryptedSovereignSliceBackup,
} from "./sovereignSlice/encryptedBackup";
import { computeRecoveryMetrics } from "./staging/recoveryMetrics";
import {
  readIssuerSigningKeyStatus,
  revokeIssuerSigningKeyOnSovereignPg,
} from "./staging/issuerTrustRecovery";
import { insertMeteringFixtureOnSovereignPg } from "./verticalSlice/meteringAttribution";
import { DECISION_RECEIPT_SCHEMA_VERSION } from "@/lib/decisionReceipts/types";
import { publicReceiptJwkFingerprint } from "@/lib/decisionReceipts/verificationKeyLifecycle/fingerprint";
import { publishSignedIssuerAuthorityFromRegistry } from "./issuerAuthority/buildFromRegistry";
import { evaluateSovereignCurrentValidity } from "./sovereignCurrentValidity/evaluate";
import { publishSignedReceiptStatusFromSovereignEvaluation } from "./trustDistribution/publishSignedReceiptStatus";
import { buildTrustAnchorBundleV1 } from "./trustDistribution/buildTrustAnchorBundle";
import { verifyAbraxasReceiptIndependently } from "@abraxas/independent-verifier";

const ANCHOR_KEY = generateTestSigningKeyPair();
const STATUS_SIGNER_KEY = generateTestSigningKeyPair("status-signer-integration");

const PROOF_ENABLED = process.env.ABRAXAS_SOVEREIGN_OPERATIONAL_PROOF === "1";
const describeProof = PROOF_ENABLED ? describe : describe.skip;

const TEST_KEY = generateTestSigningKeyPair();
const PRIMARY_DB = "abraxas_sovereign_slice_primary";
const RESTORE_DB = "abraxas_sovereign_slice_restore";
const PG_HOST = process.env.ABRAXAS_SOVEREIGN_PG_HOST ?? "127.0.0.1";
const PG_USER = process.env.ABRAXAS_SOVEREIGN_PG_USER ?? "postgres";
const PG_PASSWORD = process.env.ABRAXAS_SOVEREIGN_PG_PASSWORD ?? "postgres";

function adminUrl(): string {
  return `postgresql://${PG_USER}:${PG_PASSWORD}@${PG_HOST}:5432/postgres`;
}

function dbUrl(dbName: string): string {
  return `postgresql://${PG_USER}:${PG_PASSWORD}@${PG_HOST}:5432/${dbName}`;
}

async function recreateDatabase(dbName: string): Promise<void> {
  const admin = new pg.Pool({ connectionString: adminUrl() });
  try {
    await admin.query(`drop database if exists "${dbName}"`);
    await admin.query(`create database "${dbName}"`);
  } finally {
    await admin.end();
  }
}

function sampleRecord(overrides: Partial<DecisionReceiptRecord> = {}): DecisionReceiptRecord {
  const payload = buildCanonicalPayload({
    receipt_id: "dr_sovereign815",
    decision_id: "00000000-0000-4000-8000-000000008815",
    policy_id: "policy-sovereign815",
    policy_version: 1,
    partner_id: "partner-sovereign815",
    subject_pseudonym_id: subjectPseudonymId("wallet-sovereign815"),
    wallet_binding_ref: null,
    consent_receipt_id: null,
    decision_result: "approved",
    reason_codes: ["ok"],
    evaluated_claim_refs: [],
    issuer_refs: [],
    decision_context: "production",
    evaluated_at: "2026-06-01T12:00:00.000Z",
    expires_at: "2027-06-01T12:00:00.000Z",
  });
  const { payloadHash, signature } = signReceiptPayload(payload, TEST_KEY.privateKeyJwk);
  return {
    id: payload.receipt_id,
    verification_decision_id: payload.decision_id,
    consent_receipt_id: null,
    partner_id: payload.partner_id,
    policy_id: payload.policy_id,
    policy_version: payload.policy_version,
    subject_pseudonym_id: payload.subject_pseudonym_id,
    wallet_binding_ref: null,
    decision_result: "approved",
    reason_codes: payload.reason_codes,
    evaluated_claim_refs: [],
    issuer_refs: [],
    decision_context: "production",
    evaluated_at: payload.evaluated_at,
    expires_at: payload.expires_at,
    revoked_at: null,
    status: "active",
    schema_version: payload.schema_version,
    payload_hash: payloadHash,
    signature,
    signing_key_id: TEST_KEY.signingKeyId,
    anchor_reference: null,
    idempotency_key: null,
    created_at: payload.evaluated_at,
    ...overrides,
  };
}

describeProof("sovereign operational proof (Build #815)", () => {
  let primaryPool: pg.Pool;
  let restorePool: pg.Pool;
  let testEnv: Record<string, string>;
  let record: DecisionReceiptRecord;

  beforeAll(async () => {
    await recreateDatabase(PRIMARY_DB);
    await recreateDatabase(RESTORE_DB);
    primaryPool = new pg.Pool({ connectionString: dbUrl(PRIMARY_DB) });
    restorePool = new pg.Pool({ connectionString: dbUrl(RESTORE_DB) });

    testEnv = {
      ABRAXAS_SOVEREIGN_ENV_CLASS: "disposable",
      ABRAXAS_SOVEREIGN_STAGING_FIXTURE_WRITES: "true",
      ABRAXAS_DISPOSABLE_PG_MIGRATION_AUTHORIZED: "true",
      ABRAXAS_DISPOSABLE_PG_TEST_DATABASE_ID: "abraxas_sovereign_disposable",
      ABRAXAS_DATABASE_URL: dbUrl(PRIMARY_DB),
      ABRAXAS_SOVEREIGN_STAGING_PG_URL: dbUrl(PRIMARY_DB),
      ABRAXAS_SOVEREIGN_RESTORE_PG_URL: dbUrl(RESTORE_DB),
      ABRAXAS_SOVEREIGN_STAGING_RESTORE_DRILL_AUTHORIZED: "true",
      ABRAXAS_SOVEREIGN_STAGING_RESTORE_OPERATOR_AUTHORIZATION: "build815-ci-drill",
      ABRAXAS_SOVEREIGN_STAGING_RESTORE_OPERATOR_AUTHORIZATION_EXPECTED: "build815-ci-drill",
      NEXT_PUBLIC_SUPABASE_URL: "",
      SUPABASE_SERVICE_ROLE_KEY: "",
      ABRAXAS_SIGNING_KEY: JSON.stringify(TEST_KEY.privateKeyJwk),
      ABRAXAS_BACKUP_ENCRYPTION_KEY: Buffer.alloc(32, 11).toString("base64"),
      VERCEL_ENV: "production",
      ABRAXAS_RECEIPT_VERIFICATION_REGISTRY: JSON.stringify([
        {
          key_id: TEST_KEY.signingKeyId,
          environment: "production",
          status: "active",
          public_jwk: TEST_KEY.publicKeyJwk,
          fingerprint: publicReceiptJwkFingerprint(
            TEST_KEY.publicKeyJwk as { kty: "OKP"; crv: "Ed25519"; x: string },
          ),
          issued_at: "2020-01-01T00:00:00.000Z",
          not_before: "2020-01-01T00:00:00.000Z",
          expires_at: null,
          schema_versions: [DECISION_RECEIPT_SCHEMA_VERSION],
          reason_class: "active",
          allow_historical_verification: false,
          historical_verify_until: null,
        },
      ]),
      ABRAXAS_STATUS_SIGNER_KEY_ID: STATUS_SIGNER_KEY.signingKeyId,
      ABRAXAS_STATUS_SIGNER_PRIVATE_JWK: JSON.stringify(STATUS_SIGNER_KEY.privateKeyJwk),
      ABRAXAS_STATUS_SIGNER_PUBLIC_JWK: JSON.stringify(STATUS_SIGNER_KEY.publicKeyJwk),
    };

    await applySovereignSliceSchema(primaryPool);
    await applySovereignSliceSchema(restorePool);
    record = sampleRecord();
    await seedSovereignSliceFixtures({ pool: primaryPool, record, env: testEnv });
  }, 120_000);

  afterAll(async () => {
    await primaryPool?.end().catch(() => undefined);
    await restorePool?.end().catch(() => undefined);
  });

  it("runs vertical slice reads without Supabase credentials", async () => {
    const provenance = await loadReceiptProvenanceFromSovereignPg(record.id, testEnv);
    expect(provenance?.payloadHash).toBe(record.payload_hash);
    const payload = buildCanonicalPayload({
      receipt_id: record.id,
      decision_id: record.verification_decision_id,
      policy_id: record.policy_id,
      policy_version: record.policy_version,
      partner_id: record.partner_id,
      subject_pseudonym_id: record.subject_pseudonym_id,
      wallet_binding_ref: record.wallet_binding_ref,
      consent_receipt_id: record.consent_receipt_id,
      decision_result: record.decision_result,
      reason_codes: record.reason_codes,
      evaluated_claim_refs: record.evaluated_claim_refs,
      issuer_refs: record.issuer_refs,
      decision_context: record.decision_context,
      evaluated_at: record.evaluated_at,
      expires_at: record.expires_at,
    });
    expect(verifyReceiptSignature(payload, record.signature, TEST_KEY.publicKeyJwk)).toBe(true);

    const metering = await loadMeteringAttributionFromSovereignPg(
      buildPartnerFlowReceiptMeteringKey(record.id),
      testEnv,
    );
    expect(metering.present).toBe(true);
    expect(metering.receiptId).toBe(record.id);
  });

  it("evaluates four-layer freshness on active receipt", async () => {
    const freshness = await evaluateReceiptFreshnessFromSovereignPg({
      record,
      issuerPublicJwk: TEST_KEY.publicKeyJwk,
      env: testEnv,
      now: new Date("2026-07-01T00:00:00.000Z"),
    });
    expect(freshness.signature_authentic).toBe(true);
    expect(freshness.issuer_authorized).toBe(true);
    expect(freshness.policy_and_audience_match).toBe(true);
    expect(freshness.currently_acceptable).toBe(true);
  });

  it("fails closed on revoked receipt without equating signature validity with authorization", async () => {
    await primaryPool.query(
      `update public.decision_receipts set status = 'revoked', revoked_at = now() where id = $1`,
      [record.id],
    );
    const revokedRecord = { ...record, status: "revoked" as const, revoked_at: "2026-07-02T00:00:00.000Z" };
    const freshness = await evaluateReceiptFreshnessFromSovereignPg({
      record: revokedRecord,
      issuerPublicJwk: TEST_KEY.publicKeyJwk,
      env: testEnv,
    });
    expect(freshness.signature_authentic).toBe(true);
    expect(freshness.currently_acceptable).toBe(false);
    expect(freshness.invalidation_reasons).toContain("receipt_revoked");
  });

  it("executes backup, restore drill, and reconciliation parity", async () => {
    await primaryPool.query(
      `update public.decision_receipts set status = 'active', revoked_at = null where id = $1`,
      [record.id],
    );

    const drill = evaluateRestoreDrillEnv(testEnv);
    expect(drill.ok).toBe(true);

    const primaryReconBefore = await reconcileSovereignSlice(primaryPool);
    const backup = await exportSovereignSliceBackup(primaryPool);
    await truncateSovereignSlice(restorePool);
    await restoreSovereignSliceBackup(restorePool, backup);

    const restoredRecon = await reconcileSovereignSlice(restorePool);
    const mismatches = assertReconciliationEqual(primaryReconBefore, restoredRecon);
    expect(mismatches).toEqual([]);

    const restoreEnv = { ...testEnv, ABRAXAS_DATABASE_URL: dbUrl(RESTORE_DB), ABRAXAS_SOVEREIGN_STAGING_PG_URL: dbUrl(RESTORE_DB) };
    resetSovereignStagingPgPoolForTests();
    const restoredProvenance = await loadReceiptProvenanceFromSovereignPg(record.id, restoreEnv);
    expect(restoredProvenance?.signature).toBe(record.signature);
    expect(restoredProvenance?.payloadHash).toBe(record.payload_hash);
  });

  it("rejects corrupted backup digest on restore", async () => {
    const backup = await exportSovereignSliceBackup(primaryPool);
    const corrupted = { ...backup, backup_digest: "0".repeat(64) };
    await expect(restoreSovereignSliceBackup(restorePool, corrupted)).rejects.toThrow(
      /sovereign_backup_digest_mismatch/,
    );
  });

  it("restores from encrypted backup and measures RPO/RTO bounds", async () => {
    const lastWriteAt = Date.now();
    const exportStarted = Date.now();
    const encrypted = await exportEncryptedSovereignSliceBackup(primaryPool, testEnv);
    const exportCompleted = Date.now();
    await truncateSovereignSlice(restorePool);
    await restoreEncryptedSovereignSliceBackup(restorePool, encrypted, testEnv);
    const restoreCompleted = Date.now();
    const recon = await reconcileSovereignSlice(restorePool);
    const reconcileCompleted = Date.now();
    const metrics = computeRecoveryMetrics({
      last_write_at_ms: lastWriteAt,
      export_started_at_ms: exportStarted,
      export_completed_at_ms: exportCompleted,
      restore_completed_at_ms: restoreCompleted,
      reconcile_completed_at_ms: reconcileCompleted,
    });
    expect(recon.receiptCount).toBeGreaterThan(0);
    expect(metrics.rto_observed_ms).toBeGreaterThan(0);
    expect(metrics.rpo_bound_ms).toBeLessThan(60_000);
  });

  it("fails closed when issuer key revoked after restore (compromise cannot be undone by backup alone)", async () => {
    await restoreEncryptedSovereignSliceBackup(
      restorePool,
      await exportEncryptedSovereignSliceBackup(primaryPool, testEnv),
      testEnv,
    );
    await revokeIssuerSigningKeyOnSovereignPg(restorePool, TEST_KEY.signingKeyId);
    expect(await readIssuerSigningKeyStatus(restorePool, TEST_KEY.signingKeyId)).toBe("revoked");

    const restoreEnv = { ...testEnv, ABRAXAS_DATABASE_URL: dbUrl(RESTORE_DB), ABRAXAS_SOVEREIGN_STAGING_PG_URL: dbUrl(RESTORE_DB) };
    resetSovereignStagingPgPoolForTests();
    const freshness = await evaluateReceiptFreshnessFromSovereignPg({
      record,
      issuerPublicJwk: TEST_KEY.publicKeyJwk,
      env: restoreEnv,
    });
    expect(freshness.signature_authentic).toBe(true);
    expect(freshness.currently_acceptable).toBe(false);
    expect(freshness.invalidation_reasons).toContain("issuer_not_authorized");
  });

  it("rejects cross-tenant policy audience mismatch", async () => {
    const freshness = await evaluateReceiptFreshnessFromSovereignPg({
      record,
      issuerPublicJwk: TEST_KEY.publicKeyJwk,
      expectedPartnerId: "other-partner",
      env: testEnv,
    });
    expect(freshness.currently_acceptable).toBe(false);
    expect(freshness.invalidation_reasons).toContain("environment_mismatch");
  });

  it("fails closed when sovereign backend unreachable", async () => {
    resetSovereignStagingPgPoolForTests();
    const badEnv = {
      ...testEnv,
      ABRAXAS_SOVEREIGN_STAGING_PG_URL: "postgresql://postgres:postgres@127.0.0.1:59999/missing",
      ABRAXAS_DATABASE_URL: "postgresql://postgres:postgres@127.0.0.1:59999/missing",
    };
    const freshness = await evaluateReceiptFreshnessFromSovereignPg({
      record,
      issuerPublicJwk: TEST_KEY.publicKeyJwk,
      env: badEnv,
    });
    expect(freshness.store_available).toBe(false);
    expect(freshness.currently_acceptable).toBe(false);
    resetSovereignStagingPgPoolForTests();
  });

  it("prevents duplicate metering idempotency on sovereign path", async () => {
    resetSovereignStagingPgPoolForTests();
    const dupReceiptId = `dr_dup_meter_816_${Date.now()}`;
    const idempotencyKey = buildPartnerFlowReceiptMeteringKey(dupReceiptId);
    const first = await insertMeteringFixtureOnSovereignPg(
      { partnerId: record.partner_id, receiptId: dupReceiptId },
      testEnv,
    );
    const second = await insertMeteringFixtureOnSovereignPg(
      { partnerId: record.partner_id, receiptId: dupReceiptId },
      testEnv,
    );
    expect(first.ok).toBe(true);
    expect(first.duplicate).toBe(false);
    expect(second.ok).toBe(true);
    expect(second.duplicate).toBe(true);
    const count = await primaryPool.query<{ count: string }>(
      `select count(*)::text as count from public.partner_metering_events where idempotency_key = $1`,
      [idempotencyKey],
    );
    expect(Number(count.rows[0]?.count)).toBe(1);
  });

  it("evaluates current validity using signed issuer authority (not DB trust root)", async () => {
    const signed = publishSignedIssuerAuthorityFromRegistry({
      registryVersion: 1,
      anchorKeyId: "anchor-integration",
      anchorPrivateJwk: ANCHOR_KEY.privateKeyJwk,
      env: testEnv,
    });
    if ("ok" in signed && signed.ok === false) throw new Error(signed.reason);
    const result = await evaluateSovereignCurrentValidity({
      record,
      signedIssuerAuthority: signed as Exclude<typeof signed, { ok: false; reason: string }>,
      trustAnchorPublicJwk: ANCHOR_KEY.publicKeyJwk,
      expectedEnvironment: "production",
      env: testEnv,
      now: new Date("2026-07-01T00:00:00.000Z"),
    });
    expect(result.cryptographically_valid).toBe(true);
    expect(result.issuer_authorized).toBe(true);
    expect(result.currently_acceptable).toBe(true);
  });

  it("publishes signed status evidence consumable by standalone verifier", async () => {
    const signedIssuer = publishSignedIssuerAuthorityFromRegistry({
      registryVersion: 4,
      anchorKeyId: "anchor-integration",
      anchorPrivateJwk: ANCHOR_KEY.privateKeyJwk,
      env: testEnv,
    });
    if ("ok" in signedIssuer && signedIssuer.ok === false) throw new Error(signedIssuer.reason);
    const evaluation = await evaluateSovereignCurrentValidity({
      record,
      signedIssuerAuthority: signedIssuer as Exclude<typeof signedIssuer, { ok: false; reason: string }>,
      trustAnchorPublicJwk: ANCHOR_KEY.publicKeyJwk,
      expectedEnvironment: "production",
      env: testEnv,
    });
    const signedStatus = await publishSignedReceiptStatusFromSovereignEvaluation({
      record,
      evaluation,
      signedIssuerAuthorityEnvironment: "production",
      env: testEnv,
    });
    if ("ok" in signedStatus && signedStatus.ok === false) throw new Error(signedStatus.reason);
    const bundle = buildTrustAnchorBundleV1({
      anchorKeyId: "anchor-integration",
      anchorPublicJwk: ANCHOR_KEY.publicKeyJwk,
      environment: "production",
    });
    const verified = verifyAbraxasReceiptIndependently({
      record,
      pinnedTrustAnchor: bundle,
      signedIssuerAuthority: signedIssuer as Exclude<typeof signedIssuer, { ok: false; reason: string }>,
      relyingParty: {
        partner_id: record.partner_id,
        policy_id: record.policy_id,
        environment: "production",
      },
      statementObservedAt: new Date().toISOString(),
      signedStatusStatement: signedStatus as Exclude<typeof signedStatus, { ok: false; reason: string }>,
    });
    expect(verified.status_evidence_authentic).toBe(true);
    expect(verified.currently_acceptable).toBe("yes");
  });

  it("rejects receipt when sovereign claim evidence is revoked", async () => {
    const claimId = "claim-sovereign818";
    await primaryPool.query(
      `insert into public.sovereign_claim_status (claim_id, status) values ($1, 'revoked')
       on conflict (claim_id) do update set status = excluded.status`,
      [claimId],
    );
    const claimPayload = buildCanonicalPayload({
      receipt_id: "dr_claim_rev_818",
      decision_id: "00000000-0000-4000-8000-000000008818",
      policy_id: record.policy_id,
      policy_version: record.policy_version,
      partner_id: record.partner_id,
      subject_pseudonym_id: record.subject_pseudonym_id,
      wallet_binding_ref: null,
      consent_receipt_id: null,
      decision_result: "approved",
      reason_codes: ["ok"],
      evaluated_claim_refs: [
        { claim_id: claimId, claim_type: "age21", status: "active", issued_at: record.evaluated_at },
      ],
      issuer_refs: [],
      decision_context: "production",
      evaluated_at: record.evaluated_at,
      expires_at: record.expires_at,
    });
    const signedClaim = signReceiptPayload(claimPayload, TEST_KEY.privateKeyJwk);
    const claimRecord: DecisionReceiptRecord = {
      ...record,
      id: claimPayload.receipt_id,
      verification_decision_id: claimPayload.decision_id,
      evaluated_claim_refs: claimPayload.evaluated_claim_refs,
      payload_hash: signedClaim.payloadHash,
      signature: signedClaim.signature,
    };
    await seedSovereignSliceFixtures({ pool: primaryPool, record: claimRecord, env: testEnv });
    const signed = publishSignedIssuerAuthorityFromRegistry({
      registryVersion: 3,
      anchorKeyId: "anchor-integration",
      anchorPrivateJwk: ANCHOR_KEY.privateKeyJwk,
      env: testEnv,
    });
    if ("ok" in signed && signed.ok === false) throw new Error(signed.reason);
    const result = await evaluateSovereignCurrentValidity({
      record: claimRecord,
      signedIssuerAuthority: signed as Exclude<typeof signed, { ok: false; reason: string }>,
      trustAnchorPublicJwk: ANCHOR_KEY.publicKeyJwk,
      expectedEnvironment: "production",
      env: testEnv,
    });
    expect(result.claims_current).toBe(false);
    expect(result.currently_acceptable).toBe(false);
    expect(result.invalidation_reasons).toContain("claim_revoked");
  });

  it("marks receipt superseded on sovereign current validity", async () => {
    await primaryPool.query(
      `insert into public.decision_receipt_supersessions (
         superseded_receipt_id, superseding_receipt_id, partner_id, policy_id, policy_version, scope
       ) values ($1, $2, $3, $4, $5, 'session_refresh')
       on conflict (superseded_receipt_id) do nothing`,
      [record.id, "dr_superseding_817", record.partner_id, record.policy_id, record.policy_version],
    );
    const signed = publishSignedIssuerAuthorityFromRegistry({
      registryVersion: 2,
      supersedesRegistryVersion: 1,
      anchorKeyId: "anchor-integration",
      anchorPrivateJwk: ANCHOR_KEY.privateKeyJwk,
      env: testEnv,
    });
    if ("ok" in signed && signed.ok === false) throw new Error(signed.reason);
    const result = await evaluateSovereignCurrentValidity({
      record,
      signedIssuerAuthority: signed as Exclude<typeof signed, { ok: false; reason: string }>,
      trustAnchorPublicJwk: ANCHOR_KEY.publicKeyJwk,
      expectedEnvironment: "production",
      env: testEnv,
    });
    expect(result.superseded).toBe(true);
    expect(result.currently_acceptable).toBe(false);
    expect(result.invalidation_reasons).toContain("receipt_superseded");
  });

  it("blocks shadow writes during compare mode", () => {
    expect(() =>
      assertSovereignStagingWriteAllowed({
        ...testEnv,
        ABRAXAS_SHADOW_PERSISTENCE_COMPARE: "true",
      }),
    ).toThrow(/shadow_compare_read_only/);
  });
});
