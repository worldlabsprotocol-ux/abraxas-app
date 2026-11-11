import { readFileSync } from "node:fs";
import { join } from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import pg from "pg";
import { applySovereignSliceSchema } from "@/lib/persistence/boundary/sovereignSlice/bootstrap";
import { GOVERNANCE_OPERATOR_PG_URL_ENV } from "@/lib/persistence/boundary/governanceOperatorPg";
import { resetGovernanceOperatorPgPoolForTests } from "@/lib/persistence/boundary/governanceOperatorPg";
import { resetSovereignStagingPgPoolForTests } from "@/lib/persistence/boundary/sovereignStagingPg";
import { generateTestSigningKeyPair } from "@/lib/decisionReceipts/signing";
import {
  applyGovernanceTrustPinMigration,
  provisionDisposableSovereignRoleUrls,
} from "./disposableSovereignRoles";
import {
  buildGovernanceTrustBootstrapBundle,
  disposableGovernanceWitnessSha256,
  installDisposableGovernanceTrustPin,
} from "./governanceTrustCeremony";
import { establishGovernanceTrustPin, readEstablishedGovernancePin, rotateEstablishedGovernancePin } from "./governanceTrustPin";
import { signGovernanceSuccession } from "./governanceApproval";
import { createHash } from "node:crypto";

const PROOF = process.env.ABRAXAS_SOVEREIGN_OPERATIONAL_PROOF === "1";
const describeProof = PROOF ? describe.sequential : describe.skip;

describeProof("governance operator database isolation", () => {
  const dbName = "abraxas_governance_operator_isolation";
  const anchor = generateTestSigningKeyPair("operator-isolation-anchor");
  const governance = generateTestSigningKeyPair("operator-isolation-governance");
  const otherGovernance = generateTestSigningKeyPair("operator-isolation-governance-other");
  const receipt = generateTestSigningKeyPair("operator-isolation-receipt");
  let urls: Awaited<ReturnType<typeof provisionDisposableSovereignRoleUrls>>;
  let adminPool: pg.Pool;

  const runtimeEnv = () => ({
    ABRAXAS_SOVEREIGN_ENV_CLASS: "disposable",
    ABRAXAS_DISPOSABLE_PG_TEST_URL: urls.runtimeUrl,
    ABRAXAS_DISPOSABLE_PG_ADMIN_URL: urls.adminUrl,
    [GOVERNANCE_OPERATOR_PG_URL_ENV]: urls.operatorUrl,
  });

  const runtimeOnlyEnv = () => ({
    ABRAXAS_SOVEREIGN_ENV_CLASS: "disposable",
    ABRAXAS_DISPOSABLE_PG_TEST_URL: urls.runtimeUrl,
    ABRAXAS_DISPOSABLE_PG_ADMIN_URL: urls.adminUrl,
  });

  beforeAll(async () => {
    const admin = new pg.Pool({ connectionString: "postgresql://postgres:postgres@127.0.0.1:5432/postgres" });
    await admin.query(`drop database if exists "${dbName}" with (force)`);
    await admin.query(`create database "${dbName}"`);
    await admin.end();
    adminPool = new pg.Pool({ connectionString: `postgresql://postgres:postgres@127.0.0.1:5432/${dbName}` });
    await applySovereignSliceSchema(adminPool);
    urls = await provisionDisposableSovereignRoleUrls({ databaseName: dbName, adminPool });
    resetSovereignStagingPgPoolForTests();
    resetGovernanceOperatorPgPoolForTests();
  });

  afterAll(async () => {
    await adminPool?.end();
    resetSovereignStagingPgPoolForTests();
    resetGovernanceOperatorPgPoolForTests();
  });

  async function expectPermissionDenied(promise: Promise<unknown>) {
    await expect(promise).rejects.toMatchObject({ code: "42501" });
  }

  it("applies migration 012 idempotently without migration 011", async () => {
    await expect(applyGovernanceTrustPinMigration(adminPool)).resolves.toBeUndefined();
    const migration = readFileSync(
      join(process.cwd(), "database/sovereign/migrations/012_issuer_governance_trust_pin.sql"),
      "utf8",
    );
    expect(migration.toLowerCase()).toContain("create role abraxas_runtime");
    const owners = await adminPool.query<{ tablename: string; tableowner: string }>(
      `select tablename, tableowner from pg_tables where schemaname = 'public' and tablename like 'issuer_governance%'`,
    );
    expect(owners.rows.map((row) => row.tablename).sort()).toEqual([
      "issuer_governance_trust_events",
      "issuer_governance_trust_pin",
    ]);
    const continuityOnly = await adminPool.query<{ regclass: string | null }>(
      `select to_regclass('public.issuer_authority_registry_continuity') as regclass`,
    );
    expect(continuityOnly.rows[0]?.regclass).toBeTruthy();
  });

  it("blocks runtime writes and role escalation while allowing runtime select", async () => {
    const runtime = new pg.Client({ connectionString: urls.runtimeUrl });
  await runtime.connect();
    try {
      await expect(
        runtime.query(`select 1 from public.issuer_governance_trust_pin`),
      ).resolves.toBeDefined();
      await expectPermissionDenied(runtime.query(
        `insert into public.issuer_governance_trust_pin (
           environment, governance_key_id, public_jwk, public_key_fingerprint, operator_change_ticket
         ) values ('demo', 'attacker', '{}'::jsonb, '${"ab".repeat(32)}', 'forged')`,
      ));
      await expectPermissionDenied(runtime.query(
        `update public.issuer_governance_trust_pin set operator_change_ticket = 'forged' where environment = 'demo'`,
      ));
      await expectPermissionDenied(runtime.query(
        `delete from public.issuer_governance_trust_events`,
      ));
      await expectPermissionDenied(runtime.query(`set role abraxas_governance_operator`));
    } finally {
      await runtime.end();
    }
  });

  it("requires operator credentials for bootstrap and rejects issuer-controlled witness env", async () => {
    await adminPool.query(`delete from public.issuer_governance_trust_events`);
    await adminPool.query(`delete from public.issuer_governance_trust_pin`);
    resetSovereignStagingPgPoolForTests();
    resetGovernanceOperatorPgPoolForTests();

    const ceremony = buildGovernanceTrustBootstrapBundle({
      environment: "demo",
      governance,
      changeTicket: "operator-bootstrap",
    });
    const attackerWitness = createHash("sha256").update("attacker-witness", "utf8").digest("hex");
    expect(await establishGovernanceTrustPin({
      env: {
        ...runtimeOnlyEnv(),
        ABRAXAS_GOVERNANCE_OPERATOR_WITNESS_SHA256: attackerWitness,
      },
      environment: "demo",
      pin: { keyId: governance.signingKeyId, publicJwk: governance.publicKeyJwk },
      bootstrap: ceremony.bootstrap,
      bootstrapSignatureBase64Url: ceremony.bootstrapSignatureBase64Url,
      operatorWitnessSecret: ceremony.operatorWitnessSecret,
      authorizedWitnessSha256: ceremony.authorizedWitnessSha256,
    })).toEqual({ ok: false, reason: "governance_operator_database_unavailable" });

    const attackerBootstrap = buildGovernanceTrustBootstrapBundle({
      environment: "demo",
      governance: otherGovernance,
      changeTicket: "attacker",
    });
    expect(await establishGovernanceTrustPin({
      env: runtimeEnv(),
      environment: "demo",
      pin: { keyId: otherGovernance.signingKeyId, publicJwk: otherGovernance.publicKeyJwk },
      bootstrap: attackerBootstrap.bootstrap,
      bootstrapSignatureBase64Url: attackerBootstrap.bootstrapSignatureBase64Url,
      operatorWitnessSecret: "attacker-witness",
      authorizedWitnessSha256: attackerBootstrap.authorizedWitnessSha256,
      anchorKeyId: anchor.signingKeyId,
      anchorPublicJwk: anchor.publicKeyJwk,
      authorityKeys: [{ key_id: receipt.signingKeyId, public_jwk: receipt.publicKeyJwk }],
      statusSigners: [],
    })).toEqual({ ok: false, reason: "governance_bootstrap_witness_invalid" });

    const installed = await installDisposableGovernanceTrustPin({
      env: runtimeEnv(),
      environment: "demo",
      governance,
      anchorKeyId: anchor.signingKeyId,
      anchorPublicJwk: anchor.publicKeyJwk,
      authorityKeys: [{ key_id: receipt.signingKeyId, public_jwk: receipt.publicKeyJwk }],
      statusSigners: [],
      changeTicket: "operator-bootstrap",
    });
    expect(installed).toMatchObject({ ok: true });

    const runtimeRead = await readEstablishedGovernancePin({ env: runtimeOnlyEnv(), environment: "demo" });
    expect(runtimeRead.ok).toBe(true);
    if (!runtimeRead.ok) return;

    const operatorOnly = new pg.Client({ connectionString: urls.operatorUrl });
    await operatorOnly.connect();
    try {
      await expect(
        operatorOnly.query(`select governance_key_id from public.issuer_governance_trust_pin where environment = 'demo'`),
      ).resolves.toBeDefined();
    } finally {
      await operatorOnly.end();
    }

    const succession = {
      document: "abraxas_governance_succession/1.0.0" as const,
      schema_version: "1.0.0" as const,
      environment: "demo" as const,
      current_governance_key_id: governance.signingKeyId,
      successor_governance_key_id: otherGovernance.signingKeyId,
      successor_public_jwk: otherGovernance.publicKeyJwk,
    };
    expect(await rotateEstablishedGovernancePin({
      env: runtimeOnlyEnv(),
      environment: "demo",
      succession,
      signatureBase64Url: signGovernanceSuccession({ succession, governancePrivateJwk: governance.privateKeyJwk }),
      anchorKeyId: anchor.signingKeyId,
      anchorPublicJwk: anchor.publicKeyJwk,
      authorityKeys: [{ key_id: receipt.signingKeyId, public_jwk: receipt.publicKeyJwk }],
      statusSigners: [],
    })).toEqual({ ok: false, reason: "governance_operator_database_unavailable" });

    const rotated = await rotateEstablishedGovernancePin({
      env: runtimeEnv(),
      environment: "demo",
      succession,
      signatureBase64Url: signGovernanceSuccession({ succession, governancePrivateJwk: governance.privateKeyJwk }),
      anchorKeyId: anchor.signingKeyId,
      anchorPublicJwk: anchor.publicKeyJwk,
      authorityKeys: [{ key_id: receipt.signingKeyId, public_jwk: receipt.publicKeyJwk }],
      statusSigners: [],
    });
    expect(rotated.ok).toBe(true);
    if (!rotated.ok) return;

    resetSovereignStagingPgPoolForTests();
    expect(await readEstablishedGovernancePin({ env: runtimeOnlyEnv(), environment: "demo" })).toMatchObject({
      pin: { keyId: otherGovernance.signingKeyId },
    });
    expect(disposableGovernanceWitnessSha256()).not.toBe(attackerWitness);
  });
});
