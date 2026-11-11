import { afterAll, beforeAll, describe, expect, it } from "vitest";
import pg from "pg";
import { applySovereignSliceSchema } from "@/lib/persistence/boundary/sovereignSlice/bootstrap";
import { resetSovereignStagingPgPoolForTests } from "@/lib/persistence/boundary/sovereignStagingPg";
import { generateTestSigningKeyPair } from "@/lib/decisionReceipts/signing";
import { signGovernanceSuccession } from "./governanceApproval";
import {
  buildGovernanceTrustBootstrapBundle,
  disposableGovernanceWitnessEnv,
  installDisposableGovernanceTrustPin,
} from "./governanceTrustCeremony";
import {
  clearGovernanceTrustPinForTests,
  distrustEstablishedGovernancePin,
  establishGovernanceTrustPin,
  readEstablishedGovernancePin,
  rotateEstablishedGovernancePin,
} from "./governanceTrustPin";

const PROOF = process.env.ABRAXAS_SOVEREIGN_OPERATIONAL_PROOF === "1";
const describeProof = PROOF ? describe : describe.skip;

describeProof("durable governance trust pin", () => {
  const anchor = generateTestSigningKeyPair("governance-trust-anchor");
  const governance = generateTestSigningKeyPair("governance-trust-primary");
  const otherGovernance = generateTestSigningKeyPair("governance-trust-other");
  const receipt = generateTestSigningKeyPair("governance-trust-receipt");
  let databaseUrl = "";
  let pool: pg.Pool;

  const baseEnv = () => ({
    ABRAXAS_SOVEREIGN_ENV_CLASS: "disposable",
    ABRAXAS_DISPOSABLE_PG_TEST_URL: databaseUrl,
    ...disposableGovernanceWitnessEnv(),
  });

  beforeAll(async () => {
    const dbName = "abraxas_governance_trust_pin";
    const admin = new pg.Pool({ connectionString: "postgresql://postgres:postgres@127.0.0.1:5432/postgres" });
    await admin.query(`drop database if exists "${dbName}" with (force)`);
    await admin.query(`create database "${dbName}"`);
    await admin.end();
    databaseUrl = `postgresql://postgres:postgres@127.0.0.1:5432/${dbName}`;
    resetSovereignStagingPgPoolForTests();
    pool = new pg.Pool({ connectionString: databaseUrl });
    await applySovereignSliceSchema(pool);
  });

  afterAll(async () => {
    await pool?.end();
    resetSovereignStagingPgPoolForTests();
  });

  async function install() {
    await clearGovernanceTrustPinForTests({ env: baseEnv(), environment: "demo" });
    return installDisposableGovernanceTrustPin({
      env: baseEnv(),
      environment: "demo",
      governance,
      anchorKeyId: anchor.signingKeyId,
      anchorPublicJwk: anchor.publicKeyJwk,
      authorityKeys: [{ key_id: receipt.signingKeyId, public_jwk: receipt.publicKeyJwk }],
      statusSigners: [],
      changeTicket: "durable-governance-bootstrap",
    });
  }

  it("persists the pin across process restarts and matches across two pools", async () => {
    const installed = await install();
    expect(installed).toMatchObject({ ok: true });
    if (!installed.ok) return;
    resetSovereignStagingPgPoolForTests();
    const afterRestart = await readEstablishedGovernancePin({ env: baseEnv(), environment: "demo" });
    expect(afterRestart).toMatchObject({ ok: true, fingerprint: installed.fingerprint });
    const secondPool = new pg.Pool({ connectionString: databaseUrl });
    const secondRead = await readEstablishedGovernancePin({
      env: { ...baseEnv(), ABRAXAS_DISPOSABLE_PG_TEST_URL: databaseUrl },
      environment: "demo",
    });
    expect(secondRead).toMatchObject({ fingerprint: installed.fingerprint });
    await secondPool.end();
  });

  it("rejects unauthorized bootstrap, second install, issuer rotation, and silent reinstall", async () => {
    await clearGovernanceTrustPinForTests({ env: baseEnv(), environment: "demo" });
    const ceremony = buildGovernanceTrustBootstrapBundle({
      environment: "demo",
      governance,
      changeTicket: "no-witness",
    });
    expect(await establishGovernanceTrustPin({
      env: { ...baseEnv() },
      environment: "demo",
      pin: { keyId: governance.signingKeyId, publicJwk: governance.publicKeyJwk },
      bootstrap: ceremony.bootstrap,
      bootstrapSignatureBase64Url: ceremony.bootstrapSignatureBase64Url,
      operatorWitnessSecret: "wrong-witness",
      anchorKeyId: anchor.signingKeyId,
      anchorPublicJwk: anchor.publicKeyJwk,
      authorityKeys: [{ key_id: receipt.signingKeyId, public_jwk: receipt.publicKeyJwk }],
      statusSigners: [],
    })).toEqual({ ok: false, reason: "governance_bootstrap_witness_invalid" });

    const installed = await install();
    expect(installed.ok).toBe(true);
    if (!installed.ok) return;
    const ceremony2 = buildGovernanceTrustBootstrapBundle({
      environment: "demo",
      governance: otherGovernance,
      changeTicket: "second-install",
    });
    expect(await establishGovernanceTrustPin({
      env: baseEnv(),
      environment: "demo",
      pin: { keyId: otherGovernance.signingKeyId, publicJwk: otherGovernance.publicKeyJwk },
      bootstrap: ceremony2.bootstrap,
      bootstrapSignatureBase64Url: ceremony2.bootstrapSignatureBase64Url,
      operatorWitnessSecret: ceremony2.operatorWitnessSecret,
      anchorKeyId: anchor.signingKeyId,
      anchorPublicJwk: anchor.publicKeyJwk,
      authorityKeys: [{ key_id: receipt.signingKeyId, public_jwk: receipt.publicKeyJwk }],
      statusSigners: [],
    })).toEqual({ ok: false, reason: "governance_pin_already_established" });

    const succession = {
      document: "abraxas_governance_succession/1.0.0" as const,
      schema_version: "1.0.0" as const,
      environment: "demo" as const,
      current_governance_key_id: governance.signingKeyId,
      successor_governance_key_id: otherGovernance.signingKeyId,
      successor_public_jwk: otherGovernance.publicKeyJwk,
    };
    expect(await rotateEstablishedGovernancePin({
      env: baseEnv(),
      environment: "demo",
      succession,
      signatureBase64Url: signGovernanceSuccession({ succession, governancePrivateJwk: anchor.privateKeyJwk }),
      anchorKeyId: anchor.signingKeyId,
      anchorPublicJwk: anchor.publicKeyJwk,
      authorityKeys: [{ key_id: receipt.signingKeyId, public_jwk: receipt.publicKeyJwk }],
      statusSigners: [],
    })).toMatchObject({ ok: false, reason: "governance_succession_signature_invalid" });

    const rotated = await rotateEstablishedGovernancePin({
      env: baseEnv(),
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

    expect(await distrustEstablishedGovernancePin({
      env: baseEnv(),
      environment: "demo",
      fingerprint: rotated.fingerprint,
      reason: "operator emergency",
    })).toEqual({ ok: true });
    resetSovereignStagingPgPoolForTests();
    expect(await readEstablishedGovernancePin({ env: baseEnv(), environment: "demo" })).toEqual({
      ok: false,
      reason: "governance_pin_unavailable",
    });

    const reinstall = buildGovernanceTrustBootstrapBundle({
      environment: "demo",
      governance: otherGovernance,
      changeTicket: "reinstall-after-distrust",
    });
    expect(await establishGovernanceTrustPin({
      env: baseEnv(),
      environment: "demo",
      pin: { keyId: otherGovernance.signingKeyId, publicJwk: otherGovernance.publicKeyJwk },
      bootstrap: reinstall.bootstrap,
      bootstrapSignatureBase64Url: reinstall.bootstrapSignatureBase64Url,
      operatorWitnessSecret: reinstall.operatorWitnessSecret,
      anchorKeyId: anchor.signingKeyId,
      anchorPublicJwk: anchor.publicKeyJwk,
      authorityKeys: [{ key_id: receipt.signingKeyId, public_jwk: receipt.publicKeyJwk }],
      statusSigners: [],
    })).toEqual({ ok: false, reason: "governance_pin_distrusted_no_reinstall" });
  });
});
