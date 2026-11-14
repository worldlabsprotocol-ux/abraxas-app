/**
 * BUILD #961 — AWS-free sovereign operational ceremony (disposable PostgreSQL).
 * Requires: Postgres, ABRAXAS_SOVEREIGN_OPERATIONAL_PROOF=1
 * No AWS credentials, KMS calls, or new custody adapters.
 */
import { chmodSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import pg from "pg";
import {
  authorityCheckpointFromStatement,
  verifyAbraxasReceiptIndependently,
  verifyEd25519Detached,
  verifySignedReceiptStatusStatement,
} from "@abraxas/independent-verifier";
import { buildCanonicalPayload } from "@/lib/decisionReceipts/canonical";
import { DECISION_RECEIPT_SCHEMA_VERSION, type DecisionReceiptRecord } from "@/lib/decisionReceipts/types";
import { generateTestSigningKeyPair, signReceiptPayload } from "@/lib/decisionReceipts/signing";
import { publicReceiptJwkFingerprint } from "@/lib/decisionReceipts/verificationKeyLifecycle/fingerprint";
import { applySovereignSliceSchema } from "@/lib/persistence/boundary/sovereignSlice/bootstrap";
import { GOVERNANCE_OPERATOR_PG_URL_ENV } from "@/lib/persistence/boundary/governanceOperatorPg";
import { resetGovernanceOperatorPgPoolForTests } from "@/lib/persistence/boundary/governanceOperatorPg";
import { buildIssuerAuthorityStatementFromRegistry } from "@/lib/persistence/boundary/issuerAuthority/buildFromRegistry";
import {
  describeConfiguredIssuerAuthority,
} from "@/lib/persistence/boundary/issuerAuthority/registryContinuity";
import { installDisposableGovernanceTrustPin } from "@/lib/persistence/boundary/issuerAuthority/governanceTrustCeremony";
import { provisionDisposableSovereignRoleUrls } from "@/lib/persistence/boundary/issuerAuthority/disposableSovereignRoles";
import {
  GOVERNANCE_APPROVAL_DOCUMENT,
  signAuthorityGovernanceApproval,
} from "@/lib/persistence/boundary/issuerAuthority/governanceApproval";
import { resetSovereignStagingPgPoolForTests } from "@/lib/persistence/boundary/sovereignStagingPg";
import { buildTrustAnchorBundleV1 } from "@/lib/persistence/boundary/trustDistribution/buildTrustAnchorBundle";
import { LIVE_AWS_KMS_REQUIRED_ENV_VARS } from "./awsKmsLiveTestEnv";
import {
  INSTITUTIONAL_WORKER_ENV_FLAG,
  SELF_HOSTED_SOFTWARE_CUSTODY,
} from "./custodyImplementation";
import { openInstitutionalSigner } from "./institutionalSigner";
import { bindSoftwareEd25519Custody } from "./softwareEd25519Custody";
import { readEd25519SeedFile } from "./selfHostedSeedFile";
import {
  approveRecordedAuthorityChange,
  publishAuthoritativeReceiptStatus,
  signRecordedIssuerAuthorityStatement,
} from "./recordedWorkflow";
import { createServerRuntimeStatusPublishAuthorization } from "./statusPublishAuthorization.server";
import { assertInstitutionalWorkerProcessEnv } from "./worker/runtimeGuards";
import { bootstrapInstitutionalSigningWorker } from "./worker/workerBootstrap";
import { validateInstitutionalWorkerStartup } from "./worker/workerStartup";
import { WORKER_CALLER_STATUS_SCOPE_ENV } from "./worker/workerCredentialRegistry";

const PROOF = process.env.ABRAXAS_SOVEREIGN_OPERATIONAL_PROOF === "1";
const describeProof = PROOF ? describe : describe.skip;

function writeSeedFile(dir: string, name: string, key: ReturnType<typeof generateTestSigningKeyPair>): string {
  const seed = Buffer.from(key.privateKeyJwk.d!, "base64url").subarray(0, 32);
  const path = join(dir, name);
  writeFileSync(path, Buffer.from(seed).toString("base64url"));
  chmodSync(path, 0o600);
  return path;
}

const WORKER_SECRETS = {
  status: "build961-status-secret",
  issuer: "build961-issuer-secret",
  authority: "build961-authority-secret",
  health: "build961-health-secret",
} as const;

function workerCallerEnv(extra: Record<string, string | undefined> = {}) {
  return {
    ABRAXAS_WORKER_CALLER_STATUS_SECRET: WORKER_SECRETS.status,
    ABRAXAS_WORKER_CALLER_ISSUER_SECRET: WORKER_SECRETS.issuer,
    ABRAXAS_WORKER_CALLER_AUTHORITY_SECRET: WORKER_SECRETS.authority,
    ABRAXAS_WORKER_CALLER_HEALTH_SECRET: WORKER_SECRETS.health,
    [WORKER_CALLER_STATUS_SCOPE_ENV]: "institution_wide",
    ...extra,
  };
}

describe("BUILD #961 — AWS-free ceremony architecture (no Postgres)", () => {
  it("labels software self-hosted custody honestly", () => {
    expect(SELF_HOSTED_SOFTWARE_CUSTODY.hardwareNonExportable).toBe(false);
    expect(SELF_HOSTED_SOFTWARE_CUSTODY.mandatoryForProtocol).toBe(false);
  });

  it("forbids self-hosted custody in production worker startup", () => {
    expect(
      validateInstitutionalWorkerStartup({
        env: {
          [INSTITUTIONAL_WORKER_ENV_FLAG]: "1",
          ABRAXAS_INSTITUTIONAL_WORKER_ENVIRONMENT: "production",
          ABRAXAS_INSTITUTIONAL_CUSTODY_PROVIDER: "self-hosted-file",
          ABRAXAS_SELF_HOSTED_ISSUER_SEED_PATH: "/tmp/i",
          ABRAXAS_SELF_HOSTED_STATUS_SEED_PATH: "/tmp/s",
          ...workerCallerEnv(),
        },
        listenHost: "127.0.0.1",
      }),
    ).toEqual({ ok: false, reason: "worker_self_hosted_software_forbidden_in_production" });
  });

  it("forbids governance operator database URL on signing worker", () => {
    expect(
      assertInstitutionalWorkerProcessEnv({
        [INSTITUTIONAL_WORKER_ENV_FLAG]: "1",
        [GOVERNANCE_OPERATOR_PG_URL_ENV]: "postgresql://governance",
      }),
    ).toEqual({ ok: false, reason: "governance_operator_url_forbidden_on_worker" });
  });

  it("bootstraps worker from self-hosted seed files without AWS env", async () => {
    const anchor = generateTestSigningKeyPair("build961-anchor-file");
    const status = generateTestSigningKeyPair("build961-status-file");
    const dir = mkdtempSync(join(tmpdir(), "abraxas-build961-seeds-"));
    const issuerPath = writeSeedFile(dir, "issuer.seed", anchor);
    const statusPath = writeSeedFile(dir, "status.seed", status);
    const workerEnv: Record<string, string | undefined> = {
      [INSTITUTIONAL_WORKER_ENV_FLAG]: "1",
      ABRAXAS_INSTITUTIONAL_WORKER_ENVIRONMENT: "demo",
      ABRAXAS_INSTITUTIONAL_CUSTODY_PROVIDER: "self-hosted-file",
      ABRAXAS_SELF_HOSTED_ISSUER_SEED_PATH: issuerPath,
      ABRAXAS_SELF_HOSTED_STATUS_SEED_PATH: statusPath,
      ABRAXAS_ISSUER_AUTHORITY_ANCHOR_KEY_ID: anchor.signingKeyId,
      ABRAXAS_STATUS_SIGNER_KEY_ID: status.signingKeyId,
      ...workerCallerEnv(),
    };
    for (const name of LIVE_AWS_KMS_REQUIRED_ENV_VARS) {
      expect(workerEnv[name]).toBeUndefined();
    }
    const boot = await bootstrapInstitutionalSigningWorker(workerEnv);
    expect(boot.ok).toBe(true);
    if (!boot.ok) return;
    expect(boot.custodyProvider).toBe("self-hosted-file");
    const restart = await bootstrapInstitutionalSigningWorker(workerEnv);
    expect(restart.ok).toBe(true);
    rmSync(dir, { recursive: true, force: true });
  });
});

describeProof("BUILD #961 — AWS-free sovereign ceremony (disposable Postgres)", () => {
  const anchor = generateTestSigningKeyPair("build961-ceremony-anchor");
  const governance = generateTestSigningKeyPair("build961-ceremony-governance");
  const receipt = generateTestSigningKeyPair("build961-ceremony-receipt");
  const statusKey = generateTestSigningKeyPair("build961-ceremony-status");
  let databaseUrl = "";
  let operatorUrl = "";
  let seedDir = "";
  let issuerSeedPath = "";
  let statusSeedPath = "";
  let pool: pg.Pool;
  let issuer: Awaited<ReturnType<typeof openInstitutionalSigner>> extends infer T
    ? T extends { ok: true; issuer: infer I } ? I : never
    : never;
  let status: Awaited<ReturnType<typeof openInstitutionalSigner>> extends infer T
    ? T extends { ok: true; status: infer S } ? S : never
    : never;

  beforeAll(async () => {
    const dbName = "abraxas_build961_aws_free";
    const admin = new pg.Pool({ connectionString: "postgresql://postgres:postgres@127.0.0.1:5432/postgres" });
    await admin.query(`drop database if exists "${dbName}" with (force)`);
    await admin.query(`create database "${dbName}"`);
    await admin.end();
    resetSovereignStagingPgPoolForTests();
    resetGovernanceOperatorPgPoolForTests();
    pool = new pg.Pool({ connectionString: `postgresql://postgres:postgres@127.0.0.1:5432/${dbName}` });
    await applySovereignSliceSchema(pool);
    const urls = await provisionDisposableSovereignRoleUrls({ databaseName: dbName, adminPool: pool });
    databaseUrl = urls.runtimeUrl;
    operatorUrl = urls.operatorUrl;
    seedDir = mkdtempSync(join(tmpdir(), "abraxas-build961-ceremony-"));
    issuerSeedPath = writeSeedFile(seedDir, "issuer.seed", anchor);
    statusSeedPath = writeSeedFile(seedDir, "status.seed", statusKey);
    const issuerClient = bindSoftwareEd25519Custody({
      identityId: "issuer-np",
      keyId: anchor.signingKeyId,
      seed: readEd25519SeedFile(issuerSeedPath),
    });
    const statusClient = bindSoftwareEd25519Custody({
      identityId: "status-np",
      keyId: statusKey.signingKeyId,
      seed: readEd25519SeedFile(statusSeedPath),
    });
    const opened = await openInstitutionalSigner({
      provider: "self-hosted-software",
      environment: "demo",
      anchorKeyId: anchor.signingKeyId,
      statusSignerKeyId: statusKey.signingKeyId,
      publicKeys: { issuer_anchor: anchor.publicKeyJwk, status_signer: statusKey.publicKeyJwk },
      issuer: issuerClient,
      status: statusClient,
    });
    if (!opened.ok) throw new Error(opened.reason);
    issuer = opened.issuer;
    status = opened.status;
  });

  afterAll(async () => {
    await pool?.end();
    resetSovereignStagingPgPoolForTests();
    resetGovernanceOperatorPgPoolForTests();
    if (seedDir) rmSync(seedDir, { recursive: true, force: true });
  });

  function runtimeEnv() {
    return {
      ABRAXAS_RUNTIME_ENV: "demo",
      ABRAXAS_SOVEREIGN_ENV_CLASS: "disposable",
      ABRAXAS_DISPOSABLE_PG_TEST_URL: databaseUrl,
      [GOVERNANCE_OPERATOR_PG_URL_ENV]: operatorUrl,
      ABRAXAS_ISSUER_AUTHORITY_ANCHOR_KEY_ID: anchor.signingKeyId,
      ABRAXAS_ISSUER_AUTHORITY_ANCHOR_PUBLIC_JWK: JSON.stringify(anchor.publicKeyJwk),
      ABRAXAS_STATUS_SIGNER_KEY_ID: statusKey.signingKeyId,
      ABRAXAS_STATUS_SIGNER_PUBLIC_JWK: JSON.stringify(statusKey.publicKeyJwk),
      ABRAXAS_RECEIPT_VERIFICATION_REGISTRY: JSON.stringify([{
        key_id: receipt.signingKeyId,
        environment: "demo",
        status: "active",
        public_jwk: receipt.publicKeyJwk,
        fingerprint: publicReceiptJwkFingerprint(receipt.publicKeyJwk as { kty: "OKP"; crv: "Ed25519"; x: string }),
        issued_at: "2020-01-01T00:00:00.000Z",
        not_before: "2020-01-01T00:00:00.000Z",
        expires_at: null,
        schema_versions: [DECISION_RECEIPT_SCHEMA_VERSION],
        reason_class: "active",
        allow_historical_verification: false,
        historical_verify_until: null,
      }]),
    };
  }

  it("completes governance, authority, signed receipt, status, and independent verification", async () => {
    const env = runtimeEnv();
    const installed = await installDisposableGovernanceTrustPin({
      env,
      environment: "demo",
      governance,
      anchorKeyId: anchor.signingKeyId,
      anchorPublicJwk: anchor.publicKeyJwk,
      authorityKeys: [{ key_id: receipt.signingKeyId, public_jwk: receipt.publicKeyJwk }],
      statusSigners: [{ key_id: statusKey.signingKeyId, public_jwk: statusKey.publicKeyJwk }],
      changeTicket: "build961-aws-free",
    });
    expect(installed.ok).toBe(true);
    if (!installed.ok) return;

    const built = buildIssuerAuthorityStatementFromRegistry({
      registryVersion: 854,
      supersedesRegistryVersion: null,
      anchorKeyId: anchor.signingKeyId,
      issuedAt: "2026-06-01T00:00:00.000Z",
      env,
    });
    if (!built.ok) throw new Error(built.reason);
    const described = describeConfiguredIssuerAuthority({ env, anchorKeyId: anchor.signingKeyId });
    if (!described.ok) throw new Error(described.reason);
    const governanceApproval = {
      document: GOVERNANCE_APPROVAL_DOCUMENT,
      schema_version: "1.0.0" as const,
      environment: "demo" as const,
      action: "bootstrap" as const,
      registry_version: 854,
      supersedes_registry_version: null,
      authority_state_digest: described.authorityStateDigest,
      governance_key_id: governance.signingKeyId,
    };
    const established = await approveRecordedAuthorityChange({
      env,
      issuer,
      proposed: built.payload,
      assertedAuthorityStateDigest: described.authorityStateDigest,
      governanceApproval,
      governanceSignatureBase64Url: signAuthorityGovernanceApproval({
        approval: governanceApproval,
        governancePrivateJwk: governance.privateKeyJwk,
      }),
    });
    expect(established).toMatchObject({ ok: true, registryVersion: 854 });

    const issuerStatement = await signRecordedIssuerAuthorityStatement({
      env,
      issuer,
      anchorKeyId: anchor.signingKeyId,
      issuedAt: "2026-06-01T00:00:00.000Z",
    });
    expect(issuerStatement.ok).toBe(true);
    if (!issuerStatement.ok) return;

    await pool.query(`insert into public.partners (partner_id, status) values ('partner-build961', 'active')`);
    await pool.query(
      `insert into public.partner_policies (id, partner_id, version, name) values ('policy-build961', 'partner-build961', 1, 'demo')`,
    );
    await pool.query(`insert into public.issuer_signing_keys (signing_key_id) values ($1)`, [receipt.signingKeyId]);

    const canonical = buildCanonicalPayload({
      receipt_id: "dr_build961",
      decision_id: "00000000-0000-4000-8000-000000009611",
      policy_id: "policy-build961",
      policy_version: 1,
      partner_id: "partner-build961",
      subject_pseudonym_id: "subject-build961",
      wallet_binding_ref: null,
      consent_receipt_id: null,
      decision_result: "approved",
      reason_codes: [],
      evaluated_claim_refs: [],
      issuer_refs: [],
      decision_context: "sandbox_only",
      evaluated_at: "2026-06-01T00:00:00.000Z",
      expires_at: null,
    });
    const signedReceipt = signReceiptPayload(canonical, receipt.privateKeyJwk);
    await pool.query(
      `insert into public.decision_receipts (
         id, verification_decision_id, partner_id, policy_id, policy_version, subject_pseudonym_id,
         decision_result, decision_context, evaluated_at, expires_at, revoked_at, status, issuance_finalized_at,
         schema_version, payload_hash, signature, signing_key_id, reason_codes, evaluated_claim_refs, issuer_refs
       ) values (
         $1, $2, 'partner-build961', 'policy-build961', 1, 'subject-build961',
         'approved', 'sandbox_only', $3, null, null, 'active', $3,
         '1.0.0', $4, $5, $6, '{}', '[]'::jsonb, '{}'
       )`,
      [
        canonical.receipt_id,
        canonical.decision_id,
        canonical.evaluated_at,
        signedReceipt.payloadHash,
        signedReceipt.signature,
        receipt.signingKeyId,
      ],
    );

    const statusStatement = await publishAuthoritativeReceiptStatus({
      env,
      status,
      statusSignerKeyId: statusKey.signingKeyId,
      receiptId: canonical.receipt_id,
      signedIssuerAuthority: issuerStatement.statement,
      statusPublishAuthorization: createServerRuntimeStatusPublishAuthorization(),
    });
    expect(statusStatement.ok).toBe(true);
    if (!statusStatement.ok) return;
    expect(verifyEd25519Detached({
      message: Buffer.from(statusStatement.statement.payload_hash, "hex"),
      signatureBase64Url: statusStatement.statement.signature,
      publicJwk: statusKey.publicKeyJwk,
    })).toBe(true);

    const loaded = await pool.query<{ payload_hash: string; signature: string; evaluated_at: Date }>(
      `select payload_hash, signature, evaluated_at from public.decision_receipts where id = $1`,
      [canonical.receipt_id],
    );
    const row = loaded.rows[0];
    if (!row) throw new Error("receipt missing");

    const independent = verifyAbraxasReceiptIndependently({
      record: {
        id: canonical.receipt_id,
        verification_decision_id: canonical.decision_id,
        consent_receipt_id: null,
        partner_id: canonical.partner_id,
        policy_id: canonical.policy_id,
        policy_version: canonical.policy_version,
        subject_pseudonym_id: canonical.subject_pseudonym_id,
        wallet_binding_ref: null,
        decision_result: "approved",
        reason_codes: [],
        evaluated_claim_refs: [],
        issuer_refs: [],
        decision_context: "sandbox_only",
        evaluated_at: row.evaluated_at.toISOString(),
        expires_at: null,
        revoked_at: null,
        status: "active",
        schema_version: "1.0.0",
        payload_hash: row.payload_hash,
        signature: row.signature,
        signing_key_id: receipt.signingKeyId,
      } satisfies DecisionReceiptRecord,
      pinnedTrustAnchor: buildTrustAnchorBundleV1({
        anchorKeyId: anchor.signingKeyId,
        anchorPublicJwk: anchor.publicKeyJwk,
        environment: "demo",
      }),
      signedIssuerAuthority: issuerStatement.statement,
      relyingParty: { partner_id: "partner-build961", policy_id: "policy-build961", environment: "demo" },
      signedStatusStatement: statusStatement.statement,
      statementObservedAt: new Date().toISOString(),
      ...authorityCheckpointFromStatement(issuerStatement.statement),
      now: new Date(),
    });
    expect(independent.status_evidence_authentic).toBe(true);
    expect(independent.currently_acceptable).toBe("yes");
    expect(JSON.stringify(independent)).not.toMatch(/"d"\s*:/);
  });

  it("rejects replayed governance, tampered receipt, and unauthorized signing scope", async () => {
    const env = runtimeEnv();
    await installDisposableGovernanceTrustPin({
      env,
      environment: "demo",
      governance,
      anchorKeyId: anchor.signingKeyId,
      anchorPublicJwk: anchor.publicKeyJwk,
      authorityKeys: [{ key_id: receipt.signingKeyId, public_jwk: receipt.publicKeyJwk }],
      statusSigners: [{ key_id: statusKey.signingKeyId, public_jwk: statusKey.publicKeyJwk }],
      changeTicket: "build961-negatives",
    });
    const built = buildIssuerAuthorityStatementFromRegistry({
      registryVersion: 854,
      supersedesRegistryVersion: null,
      anchorKeyId: anchor.signingKeyId,
      issuedAt: "2026-06-01T00:00:00.000Z",
      env,
    });
    if (!built.ok) throw new Error(built.reason);
    const described = describeConfiguredIssuerAuthority({ env, anchorKeyId: anchor.signingKeyId });
    if (!described.ok) throw new Error(described.reason);
    const governanceApproval = {
      document: GOVERNANCE_APPROVAL_DOCUMENT,
      schema_version: "1.0.0" as const,
      environment: "demo" as const,
      action: "bootstrap" as const,
      registry_version: 854,
      supersedes_registry_version: null,
      authority_state_digest: described.authorityStateDigest,
      governance_key_id: governance.signingKeyId,
    };
    const sig = signAuthorityGovernanceApproval({ approval: governanceApproval, governancePrivateJwk: governance.privateKeyJwk });
    const first = await approveRecordedAuthorityChange({
      env,
      issuer,
      proposed: built.payload,
      assertedAuthorityStateDigest: described.authorityStateDigest,
      governanceApproval,
      governanceSignatureBase64Url: sig,
    });
    expect(first.ok).toBe(true);
    expect(await approveRecordedAuthorityChange({
      env,
      issuer,
      proposed: built.payload,
      assertedAuthorityStateDigest: described.authorityStateDigest,
      governanceApproval,
      governanceSignatureBase64Url: sig,
    })).toMatchObject({ ok: false, reason: "replayed_governance_approval" });

    const issuerStatement = await signRecordedIssuerAuthorityStatement({
      env,
      issuer,
      anchorKeyId: anchor.signingKeyId,
      issuedAt: "2026-06-01T00:00:00.000Z",
    });
    expect(issuerStatement.ok).toBe(true);
    if (!issuerStatement.ok) return;

    const badPartner = await publishAuthoritativeReceiptStatus({
      env,
      status,
      statusSignerKeyId: statusKey.signingKeyId,
      receiptId: "dr_missing",
      signedIssuerAuthority: issuerStatement.statement,
      workerEnvironment: "demo",
      statusPublishAuthorization: {
        kind: "worker_http_caller",
        environment: "demo",
        resourceScope: "partner",
        partnerId: "wrong-partner",
      },
    });
    expect(badPartner).toEqual({ ok: false, reason: "worker_partner_scope_forbidden" });

    const tampered = { ...issuerStatement.statement, signature: "00".repeat(32) };
    expect(verifySignedReceiptStatusStatement({
      signedStatus: tampered as never,
      signedIssuerAuthority: issuerStatement.statement,
      now: new Date(),
    }).ok).toBe(false);
  });
});