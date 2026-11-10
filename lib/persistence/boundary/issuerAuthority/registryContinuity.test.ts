import { readFileSync } from "node:fs";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import pg from "pg";
import { issuerAuthorityStateDigest } from "@abraxas/independent-verifier";
import { DECISION_RECEIPT_SCHEMA_VERSION } from "@/lib/decisionReceipts/types";
import { generateTestSigningKeyPair } from "@/lib/decisionReceipts/signing";
import { publicReceiptJwkFingerprint } from "@/lib/decisionReceipts/verificationKeyLifecycle/fingerprint";
import { applySovereignSliceSchema } from "@/lib/persistence/boundary/sovereignSlice/bootstrap";
import { resetSovereignStagingPgPoolForTests } from "@/lib/persistence/boundary/sovereignStagingPg";
import {
  RECEIPT_KEY_DOCUMENT_DIGEST,
  RECEIPT_KEY_ID,
} from "../../../../scripts/operations/productionSigningAuthority";
import {
  buildIssuerAuthorityStatementFromRegistry,
  publishSignedIssuerAuthorityFromRegistry,
} from "./buildFromRegistry";
import { resolveIssuerKeyFromSignedStatement } from "./resolveIssuerKey";
import {
  approveIssuerAuthorityStateChange,
  decideIssuerAuthorityContinuity,
  resolveIssuerAuthorityRegistryContinuity,
} from "./registryContinuity";

const PROOF = process.env.ABRAXAS_SOVEREIGN_OPERATIONAL_PROOF === "1";
const describeProof = PROOF ? describe : describe.skip;

type KeyStatus = "active" | "retiring" | "retired" | "revoked";

function registryEnv(
  keys: Array<{ id: string; publicJwk: JsonWebKey; status?: KeyStatus }>,
  databaseUrl?: string,
  statusSigner?: { id: string; publicJwk: JsonWebKey },
): Record<string, string> {
  return {
    VERCEL_ENV: "production",
    ABRAXAS_SOVEREIGN_ENV_CLASS: "disposable",
    ...(databaseUrl ? { ABRAXAS_DISPOSABLE_PG_TEST_URL: databaseUrl } : {}),
    ...(statusSigner
      ? {
          ABRAXAS_STATUS_SIGNER_KEY_ID: statusSigner.id,
          ABRAXAS_STATUS_SIGNER_PUBLIC_JWK: JSON.stringify(statusSigner.publicJwk),
        }
      : {}),
    ABRAXAS_RECEIPT_VERIFICATION_REGISTRY: JSON.stringify(keys.map((key) => {
      const status = key.status ?? "active";
      return {
        key_id: key.id,
        environment: "production",
        status,
        public_jwk: key.publicJwk,
        fingerprint: publicReceiptJwkFingerprint(key.publicJwk as { kty: "OKP"; crv: "Ed25519"; x: string }),
        issued_at: "2020-01-01T00:00:00.000Z",
        not_before: "2020-01-01T00:00:00.000Z",
        expires_at: null,
        schema_versions: [DECISION_RECEIPT_SCHEMA_VERSION],
        reason_class: status === "revoked" ? "compromise" : status === "active" ? "active" : "rotation",
        allow_historical_verification: status !== "active",
        historical_verify_until: status === "active" ? null : "2099-01-01T00:00:00.000Z",
      };
    })),
  };
}

describe("issuer authority continuity decisions", () => {
  it("reuses one version for an unchanged authority state", () => {
    const first = decideIssuerAuthorityContinuity({
      rows: [],
      authorityStateDigest: "a".repeat(64),
      authorityChangeApproved: false,
    });
    expect(first).toMatchObject({ action: "insert", registryVersion: 854 });
    const current = {
      registryVersion: 854,
      authorityStateDigest: "a".repeat(64),
      supersedesRegistryVersion: null,
    };
    const repeated = decideIssuerAuthorityContinuity({
      rows: [current],
      authorityStateDigest: current.authorityStateDigest,
      authorityChangeApproved: false,
    });
    expect(repeated).toMatchObject({ action: "reuse", registryVersion: 854 });
  });

  it("rejects rollback and refuses to reuse a version for a different state", () => {
    const rows = [
      { registryVersion: 854, authorityStateDigest: "a".repeat(64), supersedesRegistryVersion: null },
      { registryVersion: 855, authorityStateDigest: "b".repeat(64), supersedesRegistryVersion: 854 },
    ];
    expect(decideIssuerAuthorityContinuity({
      rows,
      authorityStateDigest: "a".repeat(64),
      authorityChangeApproved: true,
    })).toEqual({ action: "reject", reason: "authority_state_rollback" });
    expect(decideIssuerAuthorityContinuity({
      rows,
      authorityStateDigest: "c".repeat(64),
      authorityChangeApproved: false,
    })).toEqual({ action: "reject", reason: "authority_state_change_unapproved" });
    expect(decideIssuerAuthorityContinuity({
      rows,
      authorityStateDigest: "c".repeat(64),
      authorityChangeApproved: true,
    })).toMatchObject({ action: "insert", registryVersion: 856, supersedesRegistryVersion: 855 });
  });

  it("keeps the published receipt key and trust-contract digest", () => {
    expect(RECEIPT_KEY_ID).toBe("abraxas-primary");
    expect(RECEIPT_KEY_DOCUMENT_DIGEST).toBe(
      "4b4dc882928403fc622299d932b80aa985aaa990d6474cfa76a044dddfbb5489",
    );
    const execution = readFileSync(
      "lib/partner/trustExecution/executeTrustExecutionAuthoritative.ts",
      "utf8",
    );
    expect(execution.includes("registryVersion: 854")).toBe(false);
  });
});

describeProof("issuer authority registry continuity on sovereign postgres", () => {
  const anchor = generateTestSigningKeyPair("continuity-anchor");
  const receipt = generateTestSigningKeyPair("continuity-receipt");
  const extra = generateTestSigningKeyPair("continuity-extra");
  const other = generateTestSigningKeyPair("continuity-other");
  let databaseUrl = "";
  let pool: pg.Pool;

  beforeAll(async () => {
    const dbName = "abraxas_registry_continuity";
    const admin = new pg.Pool({
      connectionString: "postgresql://postgres:postgres@127.0.0.1:5432/postgres",
    });
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

  function envFor(
    keys: Array<{ id: string; publicJwk: JsonWebKey; status?: KeyStatus }>,
    statusSigner?: { id: string; publicJwk: JsonWebKey },
  ) {
    return registryEnv(keys, databaseUrl, statusSigner);
  }

  it("accepts the current version for repeated statements and rejects the listed attacks", async () => {
    const active = envFor([{ id: receipt.signingKeyId, publicJwk: receipt.publicKeyJwk }]);
    const versions: number[] = [];
    for (let i = 0; i < 5; i += 1) {
      const resolved = await resolveIssuerAuthorityRegistryContinuity({
        env: active,
        anchorKeyId: anchor.signingKeyId,
      });
      expect(resolved.ok).toBe(true);
      if (!resolved.ok) return;
      versions.push(resolved.registryVersion);
      expect(resolved.repeated).toBe(i > 0);
    }
    expect(versions).toEqual([854, 854, 854, 854, 854]);

    const first = buildIssuerAuthorityStatementFromRegistry({
      registryVersion: 854,
      anchorKeyId: anchor.signingKeyId,
      issuedAt: "2026-11-10T16:00:00.000Z",
      env: active,
    });
    const second = buildIssuerAuthorityStatementFromRegistry({
      registryVersion: 854,
      anchorKeyId: anchor.signingKeyId,
      issuedAt: "2026-11-10T17:00:00.000Z",
      env: active,
    });
    expect(first.ok && second.ok).toBe(true);
    if (!first.ok || !second.ok) return;
    expect(issuerAuthorityStateDigest(first.payload)).toBe(issuerAuthorityStateDigest(second.payload));
    expect(first.payload.issued_at).not.toBe(second.payload.issued_at);

    const added = envFor(
      [{ id: receipt.signingKeyId, publicJwk: receipt.publicKeyJwk }],
      { id: extra.signingKeyId, publicJwk: extra.publicKeyJwk },
    );
    const unauthorized = await resolveIssuerAuthorityRegistryContinuity({
      env: added,
      anchorKeyId: anchor.signingKeyId,
    });
    expect(unauthorized).toEqual({ ok: false, reason: "authority_state_change_unapproved" });
    const unchanged = await pool.query(
      `select registry_version, authority_state_digest from public.issuer_authority_registry_continuity`,
    );
    expect(unchanged.rows).toHaveLength(1);
    expect(unchanged.rows[0].registry_version).toBe(854);

    const replacement = envFor([
      { id: receipt.signingKeyId, publicJwk: receipt.publicKeyJwk, status: "retiring" },
      { id: extra.signingKeyId, publicJwk: extra.publicKeyJwk },
    ]);
    const rotated = await approveIssuerAuthorityStateChange({
      env: replacement,
      anchorKeyId: anchor.signingKeyId,
    });
    expect(rotated).toMatchObject({ ok: true, registryVersion: 855, repeated: false });
    const oldStatement = publishSignedIssuerAuthorityFromRegistry({
      registryVersion: 854,
      anchorKeyId: anchor.signingKeyId,
      anchorPrivateJwk: anchor.privateKeyJwk,
      env: active,
    });
    expect("payload" in oldStatement).toBe(true);
    if (!("payload" in oldStatement)) return;
    expect(resolveIssuerKeyFromSignedStatement({
      statement: oldStatement,
      trustAnchorPublicJwk: anchor.publicKeyJwk,
      keyId: receipt.signingKeyId,
      schemaVersion: DECISION_RECEIPT_SCHEMA_VERSION,
      environment: "production",
      mode: "current_authorization",
      minimumRegistryVersion: 855,
      acceptedRegistryVersion: 855,
    }).ok).toBe(false);

    const revokedEnv = envFor([{
      id: receipt.signingKeyId,
      publicJwk: receipt.publicKeyJwk,
      status: "revoked",
    }]);
    const revoked = await approveIssuerAuthorityStateChange({
      env: revokedEnv,
      anchorKeyId: anchor.signingKeyId,
    });
    expect(revoked).toMatchObject({ ok: true, registryVersion: 856 });
    if (!revoked.ok) return;
    const revokedStatement = publishSignedIssuerAuthorityFromRegistry({
      registryVersion: revoked.registryVersion,
      supersedesRegistryVersion: revoked.supersedesRegistryVersion,
      anchorKeyId: anchor.signingKeyId,
      anchorPrivateJwk: anchor.privateKeyJwk,
      env: revokedEnv,
    });
    expect("payload" in revokedStatement).toBe(true);
    if (!("payload" in revokedStatement)) return;
    const current = resolveIssuerKeyFromSignedStatement({
      statement: revokedStatement,
      trustAnchorPublicJwk: anchor.publicKeyJwk,
      keyId: receipt.signingKeyId,
      schemaVersion: DECISION_RECEIPT_SCHEMA_VERSION,
      environment: "production",
      mode: "current_authorization",
      acceptedRegistryVersion: revoked.registryVersion,
      expectedAuthorityStateDigest: revoked.authorityStateDigest,
    });
    expect(current.ok).toBe(false);
    if (!current.ok) expect(current.reason).toBe("revoked");

    const restore = await approveIssuerAuthorityStateChange({
      env: active,
      anchorKeyId: anchor.signingKeyId,
    });
    expect(restore).toEqual({ ok: false, reason: "authority_state_rollback" });

    const unavailable = await resolveIssuerAuthorityRegistryContinuity({
      env: registryEnv([{ id: receipt.signingKeyId, publicJwk: receipt.publicKeyJwk }]),
      anchorKeyId: anchor.signingKeyId,
    });
    expect(unavailable).toEqual({ ok: false, reason: "authority_version_state_unavailable" });

    const replayedOldState = await resolveIssuerAuthorityRegistryContinuity({
      env: active,
      anchorKeyId: anchor.signingKeyId,
    });
    expect(replayedOldState).toEqual({ ok: false, reason: "authority_state_rollback" });
    const latest = await pool.query(
      `select max(registry_version) as version from public.issuer_authority_registry_continuity`,
    );
    expect(Number(latest.rows[0].version)).toBe(856);
  });

  it("assigns distinct versions to concurrent approved authority changes", async () => {
    const base = await pool.query(
      `select max(registry_version) as version from public.issuer_authority_registry_continuity`,
    );
    const start = Number(base.rows[0].version);
    const left = envFor(
      [{ id: receipt.signingKeyId, publicJwk: receipt.publicKeyJwk, status: "revoked" }],
      { id: other.signingKeyId, publicJwk: other.publicKeyJwk },
    );
    const right = envFor(
      [{ id: extra.signingKeyId, publicJwk: extra.publicKeyJwk, status: "revoked" }],
      { id: anchor.signingKeyId, publicJwk: anchor.publicKeyJwk },
    );
    const [first, second] = await Promise.all([
      approveIssuerAuthorityStateChange({ env: left, anchorKeyId: anchor.signingKeyId }),
      approveIssuerAuthorityStateChange({ env: right, anchorKeyId: anchor.signingKeyId }),
    ]);
    expect(first.ok && second.ok).toBe(true);
    if (!first.ok || !second.ok) return;
    expect(new Set([first.registryVersion, second.registryVersion]).size).toBe(2);
    expect([first.registryVersion, second.registryVersion].sort()).toEqual([start + 1, start + 2]);
    const stored = await pool.query(
      `select registry_version from public.issuer_authority_registry_continuity group by registry_version having count(*) > 1`,
    );
    expect(stored.rows).toHaveLength(0);
  });
});
