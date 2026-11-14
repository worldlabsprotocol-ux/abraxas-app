import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import pg from "pg";
import {
  issuerAuthorityStateDigest,
  publicEd25519JwkFingerprint,
  verifySignedIssuerAuthorityStatement,
} from "@abraxas/independent-verifier";
import { DECISION_RECEIPT_SCHEMA_VERSION } from "@/lib/decisionReceipts/types";
import { generateTestSigningKeyPair } from "@/lib/decisionReceipts/signing";
import { publicReceiptJwkFingerprint } from "@/lib/decisionReceipts/verificationKeyLifecycle/fingerprint";
import { applySovereignSliceSchema } from "@/lib/persistence/boundary/sovereignSlice/bootstrap";
import { resetSovereignStagingPgPoolForTests } from "@/lib/persistence/boundary/sovereignStagingPg";
import {
  buildIssuerAuthorityStatementFromRegistry,
  loadIssuerAuthorityState,
  publishSignedIssuerAuthorityFromRegistry,
} from "./buildFromRegistry";
import {
  classifyGovernanceAction,
  signAuthorityGovernanceApproval,
  type AuthorityGovernanceApproval,
} from "./governanceApproval";
import { GOVERNANCE_OPERATOR_PG_URL_ENV } from "../governanceOperatorPg";
import { resetGovernanceOperatorPgPoolForTests } from "../governanceOperatorPg";
import { installDisposableGovernanceTrustPin } from "./governanceTrustCeremony";
import { provisionDisposableSovereignRoleUrls } from "./disposableSovereignRoles";
import { resolveIssuerKeyFromSignedStatement } from "./resolveIssuerKey";
import {
  applyIssuerAuthorityChangeAuthorization,
  decideIssuerAuthorityContinuity,
  describeConfiguredIssuerAuthority,
  resolveIssuerAuthorityRegistryContinuity,
  signIssuerAuthorityChangeAuthorization,
  type IssuerAuthorityChangeAuthorization,
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

function proposal(
  digest: string,
  change: IssuerAuthorityChangeAuthorization["change"],
  version: number,
  supersedes: number | null,
): IssuerAuthorityChangeAuthorization {
  return {
    document: "abraxas_issuer_authority_change/1.0.0",
    environment: "production",
    change,
    registry_version: version,
    supersedes_registry_version: supersedes,
    authority_state_digest: digest,
    anchor_key_id: "anchor",
    anchor_fingerprint: "f".repeat(64),
  };
}

describe("issuer authority continuity decisions", () => {
  it("requires explicit bootstrap and then reuses one version", () => {
    const digest = "a".repeat(64);
    expect(decideIssuerAuthorityContinuity({
      rows: [],
      authorityStateDigest: digest,
    })).toEqual({ action: "reject", reason: "authority_bootstrap_required" });
    const first = decideIssuerAuthorityContinuity({
      rows: [],
      authorityStateDigest: digest,
      authorization: proposal(digest, "bootstrap", 854, null),
    });
    expect(first).toMatchObject({ action: "insert", registryVersion: 854 });
    const current = {
      registryVersion: 854,
      authorityStateDigest: digest,
      supersedesRegistryVersion: null,
    };
    const repeated = decideIssuerAuthorityContinuity({
      rows: [current],
      authorityStateDigest: digest,
    });
    expect(repeated).toMatchObject({ action: "reuse", registryVersion: 854 });
  });

  it("rejects rollback, a different digest, and a stale version", () => {
    const rows = [
      { registryVersion: 854, authorityStateDigest: "a".repeat(64), supersedesRegistryVersion: null },
      { registryVersion: 855, authorityStateDigest: "b".repeat(64), supersedesRegistryVersion: 854 },
    ];
    expect(decideIssuerAuthorityContinuity({
      rows,
      authorityStateDigest: "a".repeat(64),
      authorization: proposal("a".repeat(64), "authority_change", 856, 855),
    })).toEqual({ action: "reject", reason: "authority_state_rollback" });
    expect(decideIssuerAuthorityContinuity({
      rows,
      authorityStateDigest: "c".repeat(64),
    })).toEqual({ action: "reject", reason: "authority_state_change_unapproved" });
    expect(decideIssuerAuthorityContinuity({
      rows,
      authorityStateDigest: "c".repeat(64),
      authorization: proposal("d".repeat(64), "authority_change", 856, 855),
    })).toEqual({ action: "reject", reason: "authority_state_change_unapproved" });
    expect(decideIssuerAuthorityContinuity({
      rows,
      authorityStateDigest: "c".repeat(64),
      authorization: proposal("c".repeat(64), "authority_change", 856, 854),
    })).toEqual({ action: "reject", reason: "stale_authority_approval" });
    expect(decideIssuerAuthorityContinuity({
      rows,
      authorityStateDigest: "c".repeat(64),
      authorization: proposal("c".repeat(64), "authority_change", 856, 855),
    })).toMatchObject({ action: "insert", registryVersion: 856, supersedesRegistryVersion: 855 });
  });

  it("keeps approval signing off application routes and receipt issuance", () => {
    const issuance = readFileSync(
      "lib/partner/trustExecution/executeTrustExecutionAuthoritative.ts",
      "utf8",
    );
    expect(issuance.includes("signIssuerAuthorityChangeAuthorization")).toBe(false);
    expect(issuance.includes("applyIssuerAuthorityChangeAuthorization")).toBe(false);
    expect(issuance.includes("generateProductionAuthorities")).toBe(false);

    const routes: string[] = [];
    const walk = (dir: string) => {
      for (const entry of readdirSync(dir)) {
        const path = join(dir, entry);
        if (statSync(path).isDirectory()) walk(path);
        else if (/\.(ts|tsx)$/.test(entry)) routes.push(path);
      }
    };
    walk("app");
    const exposed = routes.filter((path) => {
      const source = readFileSync(path, "utf8");
      return source.includes("signIssuerAuthorityChangeAuthorization")
        || source.includes("applyIssuerAuthorityChangeAuthorization")
        || source.includes("generateProductionAuthorities");
    });
    expect(exposed).toEqual([]);
  });

  it("adds the continuity table without writing a version or changing existing tables", () => {
    const sql = readFileSync(
      "database/sovereign/migrations/011_issuer_authority_registry_continuity.sql",
      "utf8",
    ).toLowerCase().replace(/--.*$/gm, "");
    expect(sql).toContain("create table if not exists public.issuer_authority_registry_continuity");
    expect(sql.includes("insert ")).toBe(false);
    expect(sql.includes("update ")).toBe(false);
    expect(sql.includes("delete ")).toBe(false);
    expect(sql.includes("drop ")).toBe(false);
    expect(sql.includes("alter ")).toBe(false);
  });

  it("keeps the published receipt key and trust-contract digest", () => {
    const ceremony = readFileSync("scripts/operations/productionSigningAuthority.ts", "utf8");
    expect(ceremony).toContain('export const RECEIPT_KEY_ID = "abraxas-primary"');
    expect(ceremony).toContain(
      'export const RECEIPT_KEY_DOCUMENT_DIGEST = "4b4dc882928403fc622299d932b80aa985aaa990d6474cfa76a044dddfbb5489"',
    );
    expect(ceremony).toContain('institutional_approval: "not_approved"');
    const execution = readFileSync(
      "lib/partner/trustExecution/executeTrustExecutionAuthoritative.ts",
      "utf8",
    );
    expect(execution.includes("registryVersion: 854")).toBe(false);
  });
});

describeProof("issuer authority registry continuity on sovereign postgres", () => {
  const anchor = generateTestSigningKeyPair("continuity-anchor");
  const governance = generateTestSigningKeyPair("continuity-governance");
  const receipt = generateTestSigningKeyPair("continuity-receipt");
  const extra = generateTestSigningKeyPair("continuity-extra");
  const other = generateTestSigningKeyPair("continuity-other");
  let databaseUrl = "";
  let governanceOperatorUrl = "";
  let adminUrl = "";
  let pool: pg.Pool;

  beforeAll(async () => {
    const dbName = "abraxas_registry_continuity";
    const admin = new pg.Pool({
      connectionString: "postgresql://postgres:postgres@127.0.0.1:5432/postgres",
    });
    await admin.query(`drop database if exists "${dbName}" with (force)`);
    await admin.query(`create database "${dbName}"`);
    await admin.end();
    resetSovereignStagingPgPoolForTests();
    resetGovernanceOperatorPgPoolForTests();
    pool = new pg.Pool({ connectionString: `postgresql://postgres:postgres@127.0.0.1:5432/${dbName}` });
    await applySovereignSliceSchema(pool);
    const urls = await provisionDisposableSovereignRoleUrls({ databaseName: dbName, adminPool: pool });
    databaseUrl = urls.runtimeUrl;
    governanceOperatorUrl = urls.operatorUrl;
    adminUrl = urls.adminUrl;
    const installed = await installDisposableGovernanceTrustPin({
      env: {
        ABRAXAS_SOVEREIGN_ENV_CLASS: "disposable",
        ABRAXAS_DISPOSABLE_PG_TEST_URL: databaseUrl,
        ABRAXAS_DISPOSABLE_PG_ADMIN_URL: adminUrl,
        [GOVERNANCE_OPERATOR_PG_URL_ENV]: governanceOperatorUrl,
      },
      environment: "production",
      governance,
      anchorKeyId: anchor.signingKeyId,
      anchorPublicJwk: anchor.publicKeyJwk,
      authorityKeys: [{ key_id: receipt.signingKeyId, public_jwk: receipt.publicKeyJwk }],
      statusSigners: [],
      changeTicket: "disposable-continuity-governance",
    });
    if (!installed.ok) throw new Error(installed.reason);
  });

  afterAll(async () => {
    await pool?.end();
    resetSovereignStagingPgPoolForTests();
    resetGovernanceOperatorPgPoolForTests();
  });

  function envFor(
    keys: Array<{ id: string; publicJwk: JsonWebKey; status?: KeyStatus }>,
    statusSigner?: { id: string; publicJwk: JsonWebKey },
  ) {
    return {
      ...registryEnv(keys, databaseUrl, statusSigner),
      ABRAXAS_ISSUER_AUTHORITY_ANCHOR_KEY_ID: anchor.signingKeyId,
      ABRAXAS_ISSUER_AUTHORITY_ANCHOR_PUBLIC_JWK: JSON.stringify(anchor.publicKeyJwk),
    };
  }

  function signedChange(
    env: Record<string, string>,
    change: IssuerAuthorityChangeAuthorization["change"],
    version: number,
    supersedes: number | null,
    signer: { signingKeyId: string; publicKeyJwk: JsonWebKey; privateKeyJwk: JsonWebKey } = anchor,
  ) {
    const described = describeConfiguredIssuerAuthority({ env, anchorKeyId: anchor.signingKeyId });
    if (!described.ok) throw new Error(described.reason);
    const authorization: IssuerAuthorityChangeAuthorization = {
      document: "abraxas_issuer_authority_change/1.0.0",
      environment: described.environment,
      change,
      registry_version: version,
      supersedes_registry_version: supersedes,
      authority_state_digest: described.authorityStateDigest,
      anchor_key_id: anchor.signingKeyId,
      anchor_fingerprint: publicEd25519JwkFingerprint(anchor.publicKeyJwk) ?? "",
    };
    return {
      authorization,
      signatureBase64Url: signIssuerAuthorityChangeAuthorization({
        authorization,
        anchorPrivateJwk: signer.privateKeyJwk,
      }),
    };
  }

  function governanceBundle(
    env: Record<string, string>,
    authorization: IssuerAuthorityChangeAuthorization,
    signer: { signingKeyId: string; publicKeyJwk: JsonWebKey; privateKeyJwk: JsonWebKey } = governance,
  ) {
    const state = loadIssuerAuthorityState(env);
    if (!state.ok) throw new Error(state.reason);
    const approval: AuthorityGovernanceApproval = {
      document: "abraxas_authority_governance_approval/1.0.0",
      schema_version: "1.0.0",
      environment: authorization.environment,
      action: classifyGovernanceAction({
        change: authorization.change,
        statuses: [...state.keys, ...state.statusSigners].map((key) => key.status),
      }),
      registry_version: authorization.registry_version,
      supersedes_registry_version: authorization.supersedes_registry_version,
      authority_state_digest: authorization.authority_state_digest,
      governance_key_id: signer.signingKeyId,
    };
    return {
      governanceApproval: approval,
      governanceSignatureBase64Url: signAuthorityGovernanceApproval({
        approval,
        governancePrivateJwk: signer.privateKeyJwk,
      }),
    };
  }

  function commit(
    env: Record<string, string>,
    signed: { authorization: IssuerAuthorityChangeAuthorization; signatureBase64Url: string },
  ) {
    return applyIssuerAuthorityChangeAuthorization({
      env,
      ...signed,
      ...governanceBundle(env, signed.authorization),
    });
  }

  it("accepts the current version for repeated statements and rejects the listed attacks", async () => {
    const active = envFor([{ id: receipt.signingKeyId, publicJwk: receipt.publicKeyJwk }]);
    const beforeBootstrap = await resolveIssuerAuthorityRegistryContinuity({
      env: active,
      anchorKeyId: anchor.signingKeyId,
    });
    expect(beforeBootstrap).toEqual({ ok: false, reason: "authority_bootstrap_required" });
    expect((await pool.query(`select 1 from public.issuer_authority_registry_continuity`)).rowCount).toBe(0);

    const intruder = signedChange(active, "bootstrap", 854, null, extra);
    const forgedApproval = await commit(active, intruder);
    expect(forgedApproval).toEqual({ ok: false, reason: "authority_approval_signature_invalid" });

    const bootstrap = signedChange(active, "bootstrap", 854, null);
    const established = await commit(active, bootstrap);
    expect(established).toMatchObject({ ok: true, registryVersion: 854, repeated: false });

    const versions: number[] = [];
    for (let i = 0; i < 5; i += 1) {
      const resolved = await resolveIssuerAuthorityRegistryContinuity({
        env: active,
        anchorKeyId: anchor.signingKeyId,
      });
      expect(resolved.ok).toBe(true);
      if (!resolved.ok) return;
      versions.push(resolved.registryVersion);
      expect(resolved.repeated).toBe(true);
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
    const wrongDigest = signedChange(active, "authority_change", 855, 854);
    const mismatched = await commit(added, wrongDigest);
    expect(mismatched).toEqual({ ok: false, reason: "authority_approval_digest_mismatch" });
    const unchanged = await pool.query(
      `select registry_version, authority_state_digest from public.issuer_authority_registry_continuity`,
    );
    expect(unchanged.rows).toHaveLength(1);
    expect(unchanged.rows[0].registry_version).toBe(854);

    const replacement = envFor([
      { id: receipt.signingKeyId, publicJwk: receipt.publicKeyJwk, status: "retiring" },
      { id: extra.signingKeyId, publicJwk: extra.publicKeyJwk },
    ]);
    const rotated = await commit(replacement, signedChange(replacement, "authority_change", 855, 854));
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
    const staleRevocation = await commit(revokedEnv, signedChange(revokedEnv, "authority_change", 856, 854));
    expect(staleRevocation).toEqual({ ok: false, reason: "stale_governance_approval" });
    const revoked = await commit(revokedEnv, signedChange(revokedEnv, "authority_change", 856, 855));
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

    const restore = await commit(active, signedChange(active, "authority_change", 857, 856));
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

  it("lets one signed approval win and rejects the concurrent approval as stale", async () => {
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
    const leftApproval = signedChange(left, "authority_change", start + 1, start);
    const rightApproval = signedChange(right, "authority_change", start + 1, start);
    const [first, second] = await Promise.all([
      commit(left, leftApproval),
      commit(right, rightApproval),
    ]);
    const outcomes = [first, second];
    expect(outcomes.filter((outcome) => outcome.ok)).toHaveLength(1);
    expect(outcomes.filter((outcome) => !outcome.ok && outcome.reason === "stale_governance_approval")).toHaveLength(1);
    const latest = await pool.query(
      `select max(registry_version) as version from public.issuer_authority_registry_continuity`,
    );
    expect(Number(latest.rows[0].version)).toBe(start + 1);
    const stored = await pool.query(
      `select registry_version from public.issuer_authority_registry_continuity group by registry_version having count(*) > 1`,
    );
    expect(stored.rows).toHaveLength(0);
  });

  it("fails closed when the continuity table is absent", async () => {
    const dbName = "abraxas_registry_continuity_absent";
    const admin = new pg.Pool({
      connectionString: "postgresql://postgres:postgres@127.0.0.1:5432/postgres",
    });
    await admin.query(`drop database if exists "${dbName}" with (force)`);
    await admin.query(`create database "${dbName}"`);
    await admin.end();
    const url = `postgresql://postgres:postgres@127.0.0.1:5432/${dbName}`;
    const env = {
      ...registryEnv([{ id: receipt.signingKeyId, publicJwk: receipt.publicKeyJwk }], url),
      ABRAXAS_ISSUER_AUTHORITY_ANCHOR_KEY_ID: anchor.signingKeyId,
      ABRAXAS_ISSUER_AUTHORITY_ANCHOR_PUBLIC_JWK: JSON.stringify(anchor.publicKeyJwk),
    };
    resetSovereignStagingPgPoolForTests();
    const missing = await resolveIssuerAuthorityRegistryContinuity({
      env,
      anchorKeyId: anchor.signingKeyId,
    });
    expect(missing).toEqual({ ok: false, reason: "authority_version_state_unavailable" });
    const approval = signedChange(env, "bootstrap", 854, null);
    const recorded = await commit(env, approval);
    expect(recorded).toEqual({ ok: false, reason: "authority_version_state_unavailable" });
    resetSovereignStagingPgPoolForTests();
  });

  it("lets a substituted configured key update the issuer database without moving an independent pin", async () => {
    const dbName = "abraxas_registry_pin_boundary";
    const admin = new pg.Pool({
      connectionString: "postgresql://postgres:postgres@127.0.0.1:5432/postgres",
    });
    await admin.query(`drop database if exists "${dbName}" with (force)`);
    await admin.query(`create database "${dbName}"`);
    await admin.end();
    const url = `postgresql://postgres:postgres@127.0.0.1:5432/${dbName}`;
    const boundaryPool = new pg.Pool({ connectionString: url });
    await applySovereignSliceSchema(boundaryPool);
    const boundaryRoles = await provisionDisposableSovereignRoleUrls({
      databaseName: dbName,
      adminPool: boundaryPool,
    });
    const columns = await boundaryPool.query<{ column_name: string }>(
      `select column_name from information_schema.columns
        where table_schema = 'public' and table_name = 'issuer_authority_registry_continuity'`,
    );
    expect(columns.rows.map((row) => row.column_name)).not.toContain("public_jwk");

    const substitute = generateTestSigningKeyPair("substituted-anchor");
    const original = {
      ...registryEnv([{ id: receipt.signingKeyId, publicJwk: receipt.publicKeyJwk }], boundaryRoles.runtimeUrl),
      ABRAXAS_SOVEREIGN_ENV_CLASS: "disposable",
      ABRAXAS_DISPOSABLE_PG_TEST_URL: boundaryRoles.runtimeUrl,
      ABRAXAS_DISPOSABLE_PG_ADMIN_URL: boundaryRoles.adminUrl,
      [GOVERNANCE_OPERATOR_PG_URL_ENV]: boundaryRoles.operatorUrl,
      ABRAXAS_ISSUER_AUTHORITY_ANCHOR_KEY_ID: anchor.signingKeyId,
      ABRAXAS_ISSUER_AUTHORITY_ANCHOR_PUBLIC_JWK: JSON.stringify(anchor.publicKeyJwk),
    };
    const substituted = {
      ...registryEnv(
        [{ id: receipt.signingKeyId, publicJwk: receipt.publicKeyJwk }],
        boundaryRoles.runtimeUrl,
        { id: extra.signingKeyId, publicJwk: extra.publicKeyJwk },
      ),
      ABRAXAS_SOVEREIGN_ENV_CLASS: "disposable",
      ABRAXAS_DISPOSABLE_PG_TEST_URL: boundaryRoles.runtimeUrl,
      ABRAXAS_DISPOSABLE_PG_ADMIN_URL: boundaryRoles.adminUrl,
      [GOVERNANCE_OPERATOR_PG_URL_ENV]: boundaryRoles.operatorUrl,
      ABRAXAS_ISSUER_AUTHORITY_ANCHOR_KEY_ID: anchor.signingKeyId,
      ABRAXAS_ISSUER_AUTHORITY_ANCHOR_PUBLIC_JWK: JSON.stringify(substitute.publicKeyJwk),
    };
    resetSovereignStagingPgPoolForTests();
    const unsigned = await resolveIssuerAuthorityRegistryContinuity({
      env: substituted,
      anchorKeyId: anchor.signingKeyId,
    });
    expect(unsigned).toEqual({ ok: false, reason: "authority_bootstrap_required" });

    const pinInstalled = await installDisposableGovernanceTrustPin({
      env: {
        ...original,
        ABRAXAS_SOVEREIGN_ENV_CLASS: "disposable",
        ABRAXAS_DISPOSABLE_PG_TEST_URL: boundaryRoles.runtimeUrl,
        ABRAXAS_DISPOSABLE_PG_ADMIN_URL: boundaryRoles.adminUrl,
        [GOVERNANCE_OPERATOR_PG_URL_ENV]: boundaryRoles.operatorUrl,
      },
      environment: "production",
      governance,
      anchorKeyId: anchor.signingKeyId,
      anchorPublicJwk: anchor.publicKeyJwk,
      authorityKeys: [{ key_id: receipt.signingKeyId, public_jwk: receipt.publicKeyJwk }],
      statusSigners: [{ key_id: extra.signingKeyId, public_jwk: extra.publicKeyJwk }],
      changeTicket: "pin-boundary-governance",
    });
    if (!pinInstalled.ok) throw new Error(pinInstalled.reason);

    const established = await commit(original, signedChange(original, "bootstrap", 854, null));
    expect(established.ok).toBe(true);

    const described = describeConfiguredIssuerAuthority({
      env: substituted,
      anchorKeyId: anchor.signingKeyId,
    });
    expect(described.ok).toBe(true);
    if (!described.ok) return;
    const authorization: IssuerAuthorityChangeAuthorization = {
      document: "abraxas_issuer_authority_change/1.0.0",
      environment: described.environment,
      change: "authority_change",
      registry_version: 855,
      supersedes_registry_version: 854,
      authority_state_digest: described.authorityStateDigest,
      anchor_key_id: anchor.signingKeyId,
      anchor_fingerprint: publicEd25519JwkFingerprint(substitute.publicKeyJwk) ?? "",
    };
    const recorded = await commit(substituted, {
      authorization,
      signatureBase64Url: signIssuerAuthorityChangeAuthorization({
        authorization,
        anchorPrivateJwk: substitute.privateKeyJwk,
      }),
    });
    expect(recorded).toMatchObject({ ok: true, registryVersion: 855 });

    const statement = publishSignedIssuerAuthorityFromRegistry({
      registryVersion: 855,
      supersedesRegistryVersion: 854,
      anchorKeyId: anchor.signingKeyId,
      anchorPrivateJwk: substitute.privateKeyJwk,
      env: substituted,
    });
    expect("payload" in statement).toBe(true);
    if (!("payload" in statement)) return;
    const independentPin = verifySignedIssuerAuthorityStatement({
      statement,
      trustAnchorPublicJwk: anchor.publicKeyJwk,
      acceptedRegistryVersion: 855,
      expectedAuthorityStateDigest: described.authorityStateDigest,
    });
    expect(independentPin).toEqual({ ok: false, reason: "statement_signature_invalid" });
    const replacedPin = verifySignedIssuerAuthorityStatement({
      statement,
      trustAnchorPublicJwk: substitute.publicKeyJwk,
      acceptedRegistryVersion: 855,
      expectedAuthorityStateDigest: described.authorityStateDigest,
    });
    expect(replacedPin.ok).toBe(true);

    await boundaryPool.end();
    resetSovereignStagingPgPoolForTests();
  });
});
