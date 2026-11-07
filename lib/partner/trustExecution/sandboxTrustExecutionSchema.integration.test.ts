/**
 * Fresh disposable Postgres proof for the sandbox trust-execution schema.
 * Skipped unless ABRAXAS_SOVEREIGN_OPERATIONAL_PROOF=1. Does not touch Neon or Production.
 */
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import pg from "pg";
import { applySovereignSliceSchema } from "@/lib/persistence/boundary/sovereignSlice/bootstrap";
import { resetSovereignStagingPgPoolForTests } from "@/lib/persistence/boundary/sovereignStagingPg";
import { requireBoundInstitutionalAuthority } from "./institutionalAuthorityGate";
import {
  institutionalAuthorityFromLaunchpad,
  type InstitutionalAuthorityRecord,
} from "./institutionalAuthorityBinding";

const PROOF = process.env.ABRAXAS_SOVEREIGN_OPERATIONAL_PROOF === "1";
const describeProof = PROOF ? describe : describe.skip;

const ADMIN_URL = "postgresql://postgres:postgres@127.0.0.1:5432/postgres";
const DATABASE = "abraxas_sandbox_trust_schema_proof";
const DATABASE_URL = `postgresql://postgres:postgres@127.0.0.1:5432/${DATABASE}`;
const PARTNER = "partner-sandbox-proof";
const POLICY = "policy-sandbox-proof";
const APP_ID = "00000000-0000-4000-8000-00000000a942";
const REVISION = "2026-11-07T20:00:00.000Z";

const REQUIRED_TABLES = [
  "partners",
  "partner_policies",
  "issuer_signing_keys",
  "decision_receipts",
  "partner_launchpad_applications",
  "wallet_scoped_trust_challenges",
  "wallet_scoped_trust_execution_outcomes",
  "sovereign_receipt_status_checkpoints",
  "wallet_scoped_trust_authoritative_evidence",
  "sovereign_claim_status",
  "sovereign_evidence_sources",
];

function source(overrides: Partial<InstitutionalAuthorityRecord> = {}): InstitutionalAuthorityRecord {
  return {
    applicationId: APP_ID,
    partnerId: PARTNER,
    policyId: POLICY,
    policyVersion: 1,
    status: "active",
    sourceRevision: REVISION,
    environment: "sandbox",
    ...overrides,
  };
}

async function publicTables(pool: pg.Pool): Promise<string[]> {
  const result = await pool.query<{ relname: string }>(
    `select c.relname
     from pg_class c
     join pg_namespace n on n.oid = c.relnamespace
     where n.nspname = 'public' and c.relkind = 'r'
     order by 1`,
  );
  return result.rows.map((row) => row.relname);
}

describeProof("fresh sandbox trust-execution schema", () => {
  let pool: pg.Pool;

  beforeAll(async () => {
    const admin = new pg.Pool({ connectionString: ADMIN_URL });
    await admin.query(`drop database if exists "${DATABASE}"`);
    await admin.query(`create database "${DATABASE}"`);
    await admin.end();

    pool = new pg.Pool({ connectionString: DATABASE_URL });
    expect(await publicTables(pool)).toEqual([]);
    await applySovereignSliceSchema(pool);
    await applySovereignSliceSchema(pool);

    process.env.ABRAXAS_SOVEREIGN_ENV_CLASS = "disposable";
    process.env.ABRAXAS_DISPOSABLE_PG_TEST_URL = DATABASE_URL;
    delete process.env.ABRAXAS_DATABASE_URL;
    delete process.env.ABRAXAS_PERSISTENCE_BACKEND;
    delete process.env.ABRAXAS_SOVEREIGN_NATIVE_ACCOUNT;
    resetSovereignStagingPgPoolForTests();

    await pool.query(
      `insert into public.partners (partner_id, status) values ($1, 'active')`,
      [PARTNER],
    );
    await pool.query(
      `insert into public.partner_policies (id, partner_id, version, name, rules_json, status)
       values ($1, $2, 1, 'sandbox-proof', '{}', 'active')`,
      [POLICY, PARTNER],
    );
    await pool.query(
      `insert into public.partner_launchpad_applications
         (id, partner_id, status, policy_id, policy_version, authority_source_revision)
       values ($1::uuid, $2, 'active', $3, 1, $4::timestamptz)`,
      [APP_ID, PARTNER, POLICY, REVISION],
    );
  }, 60_000);

  afterAll(async () => {
    resetSovereignStagingPgPoolForTests();
    delete process.env.ABRAXAS_DISPOSABLE_PG_TEST_URL;
    await pool?.end().catch(() => undefined);
    const admin = new pg.Pool({ connectionString: ADMIN_URL });
    await admin.query(`drop database if exists "${DATABASE}"`).catch(() => undefined);
    await admin.end();
  });

  async function restoreBinding(): Promise<void> {
    await pool.query(
      `update public.partner_launchpad_applications
       set partner_id = $2, status = 'active', policy_id = $3, policy_version = 1,
           authority_source_revision = $4::timestamptz
       where id = $1::uuid`,
      [APP_ID, PARTNER, POLICY, REVISION],
    );
  }

  it("initializes the execution schema once and accepts a second apply", async () => {
    const tables = await publicTables(pool);
    for (const name of REQUIRED_TABLES) expect(tables).toContain(name);
    const functions = await pool.query<{ proname: string }>(
      `select proname from pg_proc
       where proname = 'abraxas_consume_wallet_scoped_trust_challenge_atomic'`,
    );
    expect(functions.rowCount).toBe(1);
    const revision = await pool.query(
      `select column_name from information_schema.columns
       where table_schema = 'public'
         and table_name = 'partner_launchpad_applications'
         and column_name = 'authority_source_revision'`,
    );
    expect(revision.rowCount).toBe(1);
  });

  it("enforces nonce, authorization, and correlation uniqueness", async () => {
    const indexes = await pool.query<{ indexdef: string }>(
      `select indexdef from pg_indexes where schemaname = 'public'`,
    );
    const definitions = indexes.rows.map((row) => row.indexdef).join("\n");
    expect(definitions).toContain("wallet_scoped_trust_challenges_nonce_uq");
    expect(definitions).toContain("wallet_scoped_trust_execution_outcomes_pkey");
    expect(definitions).toContain("wallet_scoped_trust_execution_outcomes_correlation_id_key");

    await pool.query(
      `insert into public.wallet_scoped_trust_challenges (
         id, partner_id, application_id, policy_id, policy_version, action, resource,
         wallet_address, origin, audience, uri, nonce, request_id, correlation_id,
         message_sha256, message, expires_at, subject_pseudonym_id
       ) values (
         'wstc_unique', $1, $2::uuid, $3, 1, 'partner_flow:evaluate', 'app',
         'wallet', 'https://ci.abraxas.test', 'abraxas', 'https://ci.abraxas.test/trust',
         'nonce-once', 'wstc_unique', 'corr-once', 'hash-once', 'message',
         now() + interval '5 minutes', 'subject-once'
       )`,
      [PARTNER, APP_ID, POLICY],
    );
    await expect(pool.query(
      `insert into public.wallet_scoped_trust_challenges (
         id, partner_id, application_id, policy_id, policy_version, action, resource,
         wallet_address, origin, audience, uri, nonce, request_id, correlation_id,
         message_sha256, message, expires_at, subject_pseudonym_id
       ) values (
         'wstc_unique_2', $1, $2::uuid, $3, 1, 'partner_flow:evaluate', 'app',
         'wallet', 'https://ci.abraxas.test', 'abraxas', 'https://ci.abraxas.test/trust',
         'nonce-once', 'wstc_unique_2', 'corr-other', 'hash-other', 'message',
         now() + interval '5 minutes', 'subject-other'
       )`,
      [PARTNER, APP_ID, POLICY],
    )).rejects.toMatchObject({ code: "23505" });
  });

  it("consumes one challenge atomically and rejects replay, expiry, and a mismatched partner", async () => {
    async function insertChallenge(id: string, expiresSql: string): Promise<void> {
      await pool.query(
        `insert into public.wallet_scoped_trust_challenges (
           id, partner_id, application_id, policy_id, policy_version, action, resource,
           wallet_address, origin, audience, uri, nonce, request_id, correlation_id,
           message_sha256, message, expires_at, subject_pseudonym_id
         ) values (
           $1, $2, $3::uuid, $4, 1, 'partner_flow:evaluate', 'app',
           'wallet-proof', 'https://ci.abraxas.test', 'abraxas', 'https://ci.abraxas.test/trust',
           $1, $1, $1, 'hash-' || $1, 'message-' || $1, ${expiresSql}, 'subject-' || $1
         )`,
        [id, PARTNER, APP_ID, POLICY],
      );
    }
    const consume = (id: string, partner = PARTNER) => pool.query<{ abraxas_consume_wallet_scoped_trust_challenge_atomic: { ok: boolean } }>(
      `select public.abraxas_consume_wallet_scoped_trust_challenge_atomic(
         $1, 'wallet-proof', 'hash-' || $1, $2, $3::uuid, 'partner_flow:evaluate'
       )`,
      [id, partner, APP_ID],
    );

    await insertChallenge("wstc_atomic", "now() + interval '5 minutes'");
    const [first, second] = await Promise.all([
      consume("wstc_atomic"),
      consume("wstc_atomic"),
    ]);
    const outcomes = [first, second].map((result) => result.rows[0]?.abraxas_consume_wallet_scoped_trust_challenge_atomic.ok);
    expect(outcomes.filter(Boolean)).toHaveLength(1);
    expect(outcomes.filter((ok) => ok === false)).toHaveLength(1);

    await insertChallenge("wstc_expired", "now() - interval '1 minute'");
    const expired = await consume("wstc_expired");
    expect(expired.rows[0]?.abraxas_consume_wallet_scoped_trust_challenge_atomic.ok).toBe(false);

    await insertChallenge("wstc_tenant", "now() + interval '5 minutes'");
    const mismatch = await consume("wstc_tenant", "other-partner");
    expect(mismatch.rows[0]?.abraxas_consume_wallet_scoped_trust_challenge_atomic.ok).toBe(false);
  });

  it("keeps one receipt and a monotonic status checkpoint per authorization", async () => {
    await pool.query(
      `insert into public.issuer_signing_keys (signing_key_id, status) values ('proof-key', 'active')`,
    );
    await pool.query(
      `insert into public.decision_receipts (
         id, verification_decision_id, partner_id, policy_id, policy_version,
         subject_pseudonym_id, decision_result, evaluated_at, payload_hash, signature, signing_key_id
       ) values (
         'dr_proof', '00000000-0000-4000-8000-00000000b942', $1, $2, 1,
         'subject-proof', 'approved', now(), 'hash', 'sig', 'proof-key'
       )`,
      [PARTNER, POLICY],
    );
    await pool.query(
      `insert into public.wallet_scoped_trust_execution_outcomes (
         authorization_ref, challenge_id, partner_id, application_id, receipt_id, correlation_id, decision_result
       ) values ('waev_proof', 'wstc_atomic', $1, $2::uuid, 'dr_proof', 'corr-proof', 'approved')`,
      [PARTNER, APP_ID],
    );
    await expect(pool.query(
      `insert into public.wallet_scoped_trust_execution_outcomes (
         authorization_ref, challenge_id, partner_id, application_id, receipt_id, correlation_id, decision_result
       ) values ('waev_proof', 'wstc_unique', $1, $2::uuid, 'dr_proof', 'corr-proof-2', 'approved')`,
      [PARTNER, APP_ID],
    )).rejects.toMatchObject({ code: "23505" });

    const bump = () => pool.query<{ status_version: number }>(
      `insert into public.sovereign_receipt_status_checkpoints (receipt_id, status_version)
       values ('dr_proof', 1)
       on conflict (receipt_id) do update
         set status_version = public.sovereign_receipt_status_checkpoints.status_version + 1
       returning status_version`,
    );
    expect((await bump()).rows[0]?.status_version).toBe(1);
    expect((await bump()).rows[0]?.status_version).toBe(2);
  });

  it("fails closed for missing, conflicting, stale, mismatched, and revoked authority", async () => {
    const agreed = await requireBoundInstitutionalAuthority({
      authorizedApplicationId: APP_ID,
      source: institutionalAuthorityFromLaunchpad({
        id: APP_ID,
        partner_id: PARTNER,
        policy_id: POLICY,
        policy_version: 1,
        status: "active",
        updated_at: REVISION,
        environment: "sandbox",
      }),
    });
    expect(agreed.ok).toBe(true);

    expect((await requireBoundInstitutionalAuthority({
      authorizedApplicationId: "00000000-0000-4000-8000-00000000c942",
      source: source({ applicationId: "00000000-0000-4000-8000-00000000c942" }),
    })).ok).toBe(false);

    await pool.query(
      `update public.partner_launchpad_applications set policy_id = 'other-policy' where id = $1::uuid`,
      [APP_ID],
    );
    expect(await requireBoundInstitutionalAuthority({
      authorizedApplicationId: APP_ID,
      source: source(),
    })).toMatchObject({ ok: false, code: "institutional_authority_conflict" });

    await restoreBinding();
    await pool.query(
      `update public.partner_launchpad_applications
       set authority_source_revision = '2026-11-06T20:00:00.000Z' where id = $1::uuid`,
      [APP_ID],
    );
    expect(await requireBoundInstitutionalAuthority({
      authorizedApplicationId: APP_ID,
      source: source(),
    })).toMatchObject({ ok: false, code: "institutional_authority_stale" });

    await restoreBinding();
    await pool.query(
      `update public.partner_launchpad_applications set status = 'suspended' where id = $1::uuid`,
      [APP_ID],
    );
    expect(await requireBoundInstitutionalAuthority({
      authorizedApplicationId: APP_ID,
      source: source(),
    })).toMatchObject({ ok: false, code: "institutional_authority_mismatch" });

    await restoreBinding();
    expect(await requireBoundInstitutionalAuthority({
      authorizedApplicationId: APP_ID,
      source: source({ status: "revoked" }),
    })).toMatchObject({ ok: false, code: "institutional_authority_mismatch" });
    await expect(pool.query(
      `update public.partner_launchpad_applications set status = 'revoked' where id = $1::uuid`,
      [APP_ID],
    )).rejects.toMatchObject({ code: "23514" });
  });
});
