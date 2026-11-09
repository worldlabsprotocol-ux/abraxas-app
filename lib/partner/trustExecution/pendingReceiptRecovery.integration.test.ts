/**
 * Pending-receipt recovery on disposable Postgres.
 * A different signature gets a new receipt id and an explicit supersession.
 * The original pending row is not rewritten.
 */
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import pg from "pg";
import { randomUUID } from "node:crypto";
import { applySovereignSliceSchema } from "@/lib/persistence/boundary/sovereignSlice/bootstrap";
import { resetSovereignStagingPgPoolForTests } from "@/lib/persistence/boundary/sovereignStagingPg";
import type { DecisionReceiptRecord } from "@/lib/decisionReceipts/types";
import {
  commitFinalizedTrustExecutionOutcome,
  planTrustExecutionReceiptIdentity,
  stagePendingTrustExecutionReceipt,
  trustExecutionBaseReceiptId,
} from "./finalizeTrustExecutionOutcome";
import { settleVerifiedAuthoritativeReceipt } from "./executeTrustExecutionAuthoritative";
import { trustExecutionAttemptMessage } from "./trustExecutionRecoveryCopy";
import { isReceiptSupersededOnSovereignPg } from "@/lib/persistence/boundary/verticalSlice/supersessionRead";

const PROOF = process.env.ABRAXAS_SOVEREIGN_OPERATIONAL_PROOF === "1";
const describeProof = PROOF ? describe : describe.skip;

const PARTNER = "partner-pending-recovery";
const APP_ID = "00000000-0000-4000-8000-00000000c944";
const POLICY = "policy-pending-recovery";
const SUBJECT = "subject-pending-recovery";
const AUTH = "waev_pending_recovery";
const CHALLENGE = "wstc_pending_recovery_challenge_0001";

function record(id: string, hash: string, wallet = AUTH): DecisionReceiptRecord {
  const at = "2026-11-09T18:00:00.000Z";
  return {
    id,
    verification_decision_id: randomUUID(),
    consent_receipt_id: null,
    partner_id: PARTNER,
    policy_id: POLICY,
    policy_version: 1,
    subject_pseudonym_id: SUBJECT,
    wallet_binding_ref: wallet,
    decision_result: "approved",
    reason_codes: ["trust_execution_recovery"],
    evaluated_claim_refs: [],
    issuer_refs: [],
    decision_context: "sandbox_only",
    evaluated_at: at,
    expires_at: "2026-11-10T18:00:00.000Z",
    revoked_at: null,
    status: "active",
    issuance_finalized_at: at,
    schema_version: "1.0.0",
    payload_hash: hash,
    signature: `sig-${hash}`,
    signing_key_id: "recovery-key",
    anchor_reference: null,
    idempotency_key: `idem-${id}`,
    created_at: at,
  };
}

function write(row: DecisionReceiptRecord, supersedesReceiptId?: string) {
  return {
    authorizationRef: AUTH,
    partnerId: PARTNER,
    applicationId: APP_ID,
    challengeId: CHALLENGE,
    correlationId: "corr-pending-recovery",
    record: row,
    supersedesReceiptId: supersedesReceiptId ?? null,
    env: process.env,
  };
}

describe("recovery explanation", () => {
  it("names the next action in plain language", () => {
    expect(trustExecutionAttemptMessage("pending_receipt_requires_new_identity")).toMatch(/kept for audit/);
    expect(trustExecutionAttemptMessage("receipt_scope_mismatch")).toMatch(/operator must review/);
    expect(trustExecutionAttemptMessage("receipt_recovery_contended")).toMatch(/Refresh status/);
    expect(trustExecutionAttemptMessage("unknown_code")).toBeNull();
  });
});

describeProof("pending receipt recovery", () => {
  let pool: pg.Pool;

  beforeAll(async () => {
    process.env.ABRAXAS_SOVEREIGN_ENV_CLASS = "disposable";
    process.env.ABRAXAS_SOVEREIGN_STAGING_FIXTURE_WRITES = "true";
    const dbName = "abraxas_pending_recovery";
    const admin = new pg.Pool({ connectionString: "postgresql://postgres:postgres@127.0.0.1:5432/postgres" });
    await admin.query(`drop database if exists "${dbName}"`);
    await admin.query(`create database "${dbName}"`);
    await admin.end();
    const url = `postgresql://postgres:postgres@127.0.0.1:5432/${dbName}`;
    process.env.ABRAXAS_SOVEREIGN_STAGING_PG_URL = url;
    process.env.ABRAXAS_DISPOSABLE_PG_TEST_URL = url;
    process.env.ABRAXAS_DATABASE_URL = url;
    resetSovereignStagingPgPoolForTests();
    pool = new pg.Pool({ connectionString: url });
    await applySovereignSliceSchema(pool);
    await pool.query(
      `create unique index if not exists decision_receipts_idempotency_key_uidx
         on public.decision_receipts (idempotency_key)
       where idempotency_key is not null`,
    );
    await pool.query(`insert into public.partners (partner_id) values ($1)`, [PARTNER]);
    await pool.query(
      `insert into public.partner_policies (id, partner_id, version) values ($1, $2, 1)`,
      [POLICY, PARTNER],
    );
    await pool.query(
      `insert into public.issuer_signing_keys (signing_key_id) values ('recovery-key')`,
    );
    await pool.query(
      `insert into public.partner_launchpad_applications (id, partner_id, policy_id, policy_version)
       values ($1::uuid, $2, $3, 1)`,
      [APP_ID, PARTNER, POLICY],
    );
    await pool.query(
      `insert into public.wallet_scoped_trust_challenges (
         id, partner_id, application_id, policy_id, policy_version, action, resource,
         wallet_address, origin, audience, uri, nonce, request_id, correlation_id,
         message_sha256, message, expires_at, subject_pseudonym_id, authorization_ref
       ) values (
         $1, $2, $3::uuid, $4, 1, 'partner_flow:evaluate', 'app',
         'wallet', 'https://ci.abraxas.test', 'abraxas', 'https://ci.abraxas.test/trust',
         $1, $1, 'corr-pending-recovery', 'hash', 'message', now() + interval '5 minutes', $5, $6
       )`,
      [CHALLENGE, PARTNER, APP_ID, POLICY, SUBJECT, AUTH],
    );
  });

  afterAll(async () => {
    await pool?.end();
  });

  it("reuses the same pending receipt when the payload hash matches", async () => {
    const base = trustExecutionBaseReceiptId(CHALLENGE);
    const original = record(base, "hash-same");
    const first = await stagePendingTrustExecutionReceipt(write(original));
    const second = await stagePendingTrustExecutionReceipt(write(original));
    expect(first).toMatchObject({ ok: true, receipt_id: base, staged: "pending" });
    expect(second).toMatchObject({ ok: true, receipt_id: base, staged: "pending" });
    const committed = await commitFinalizedTrustExecutionOutcome(write(original));
    const replay = await commitFinalizedTrustExecutionOutcome(write(original));
    expect(committed).toMatchObject({ ok: true, receipt_id: base, created: true });
    expect(replay).toMatchObject({ ok: true, receipt_id: base, created: false });
    const outcomes = await pool.query(`select receipt_id from public.wallet_scoped_trust_execution_outcomes where authorization_ref = $1`, [AUTH]);
    expect(outcomes.rows).toHaveLength(1);
  });

  it("keeps a failed verification pending and refuses a different hash on that receipt", async () => {
    const base = trustExecutionBaseReceiptId(`${CHALLENGE}-fail`);
    const pending = record(base, "hash-failed-verification", "waev_fail");
    const staged = await stagePendingTrustExecutionReceipt({ ...write(pending), authorizationRef: "waev_fail", challengeId: `${CHALLENGE}-fail`, correlationId: "corr-fail" });
    expect(staged.ok).toBe(true);
    const settled = await settleVerifiedAuthoritativeReceipt({
      verify: async () => ({ ok: false, code: "wrong_environment" }),
      commit: async () => commitFinalizedTrustExecutionOutcome({ ...write(pending), authorizationRef: "waev_fail", challengeId: `${CHALLENGE}-fail`, correlationId: "corr-fail" }),
    });
    expect(settled.ok).toBe(false);
    const checkpoint = await settleVerifiedAuthoritativeReceipt({
      verify: async () => ({ ok: false, code: "status_checkpoint_unavailable" }),
      commit: async () => commitFinalizedTrustExecutionOutcome({ ...write(pending), authorizationRef: "waev_fail", challengeId: `${CHALLENGE}-fail`, correlationId: "corr-fail" }),
    });
    expect(checkpoint.ok).toBe(false);
    const started = Date.now();
    const mismatch = await stagePendingTrustExecutionReceipt({
      ...write(record(base, "hash-other", "waev_fail")),
      authorizationRef: "waev_fail",
      challengeId: `${CHALLENGE}-fail`,
      correlationId: "corr-fail",
    });
    expect(Date.now() - started).toBeLessThan(1000);
    expect(mismatch).toEqual({ ok: false, code: "pending_receipt_requires_new_identity" });
    const stored = await pool.query<{ status: string; payload_hash: string }>(
      `select status, payload_hash from public.decision_receipts where id = $1`,
      [base],
    );
    expect(stored.rows[0]).toEqual({ status: "pending_finalization", payload_hash: "hash-failed-verification" });
    const outcomes = await pool.query(`select receipt_id from public.wallet_scoped_trust_execution_outcomes where authorization_ref = 'waev_fail'`);
    expect(outcomes.rows).toHaveLength(0);
  });

  it("finalizes a distinct receipt and supersedes the original pending record", async () => {
    const challenge = `${CHALLENGE}-recover`;
    const base = trustExecutionBaseReceiptId(challenge);
    const auth = "waev_recover";
    await pool.query(
      `insert into public.wallet_scoped_trust_challenges (
         id, partner_id, application_id, policy_id, policy_version, action, resource,
         wallet_address, origin, audience, uri, nonce, request_id, correlation_id,
         message_sha256, message, expires_at, subject_pseudonym_id, authorization_ref
       ) values (
         $1, $2, $3::uuid, $4, 1, 'partner_flow:evaluate', 'app',
         'wallet', 'https://ci.abraxas.test', 'abraxas', 'https://ci.abraxas.test/trust',
         $1, $1, 'corr-recover', 'hash', 'message', now() + interval '5 minutes', $5, $6
       )`,
      [challenge, PARTNER, APP_ID, POLICY, SUBJECT, auth],
    );
    const original = record(base, "hash-original", auth);
    const scope = { ...write(original), authorizationRef: auth, challengeId: challenge, correlationId: "corr-recover" };
    expect(await stagePendingTrustExecutionReceipt(scope)).toMatchObject({ ok: true, staged: "pending" });
    const replacementId = `${base}_replacement`;
    const replacement = record(replacementId, "hash-replacement", auth);
    const stagedReplacement = await stagePendingTrustExecutionReceipt({ ...scope, record: replacement });
    expect(stagedReplacement).toMatchObject({ ok: true, receipt_id: replacementId, staged: "pending" });
    const before = await pool.query(`select count(*)::int as n from public.decision_receipt_supersessions where superseded_receipt_id = $1`, [base]);
    expect(before.rows[0]?.n).toBe(0);
    const committed = await commitFinalizedTrustExecutionOutcome({ ...scope, record: replacement, supersedesReceiptId: base });
    expect(committed).toMatchObject({ ok: true, receipt_id: replacementId, created: true });
    const originalRow = await pool.query<{ status: string; payload_hash: string; signature: string }>(
      `select status, payload_hash, signature from public.decision_receipts where id = $1`,
      [base],
    );
    expect(originalRow.rows[0]).toEqual({
      status: "pending_finalization",
      payload_hash: "hash-original",
      signature: "sig-hash-original",
    });
    const link = await pool.query<{ superseding_receipt_id: string; scope: string }>(
      `select superseding_receipt_id, scope from public.decision_receipt_supersessions where superseded_receipt_id = $1`,
      [base],
    );
    expect(link.rows[0]).toEqual({ superseding_receipt_id: replacementId, scope: "explicit_reissue" });
    const read = await isReceiptSupersededOnSovereignPg(base, process.env);
    expect(read).toMatchObject({ superseded: true, superseding_receipt_id: replacementId, scope: "explicit_reissue" });
    const current = await isReceiptSupersededOnSovereignPg(replacementId, process.env);
    expect(current).toEqual({ superseded: false });
    const outcomes = await pool.query(`select receipt_id from public.wallet_scoped_trust_execution_outcomes where authorization_ref = $1`, [auth]);
    expect(outcomes.rows.map((row) => row.receipt_id)).toEqual([replacementId]);
    const replayOriginal = await commitFinalizedTrustExecutionOutcome({ ...scope, record: original });
    expect(replayOriginal).toMatchObject({ ok: true, receipt_id: replacementId, created: false });
  });

  it("lets only one concurrent recovery finalize", async () => {
    const challenge = `${CHALLENGE}-race`;
    const base = trustExecutionBaseReceiptId(challenge);
    const auth = "waev_race";
    await pool.query(
      `insert into public.wallet_scoped_trust_challenges (
         id, partner_id, application_id, policy_id, policy_version, action, resource,
         wallet_address, origin, audience, uri, nonce, request_id, correlation_id,
         message_sha256, message, expires_at, subject_pseudonym_id, authorization_ref
       ) values (
         $1, $2, $3::uuid, $4, 1, 'partner_flow:evaluate', 'app',
         'wallet', 'https://ci.abraxas.test', 'abraxas', 'https://ci.abraxas.test/trust',
         $1, $1, 'corr-race', 'hash', 'message', now() + interval '5 minutes', $5, $6
       )`,
      [challenge, PARTNER, APP_ID, POLICY, SUBJECT, auth],
    );
    const original = record(base, "hash-race-original", auth);
    const scope = { ...write(original), authorizationRef: auth, challengeId: challenge, correlationId: "corr-race" };
    expect((await stagePendingTrustExecutionReceipt(scope)).ok).toBe(true);
    const left = record(`${base}_left`, "hash-left", auth);
    const right = record(`${base}_right`, "hash-right", auth);
    expect((await stagePendingTrustExecutionReceipt({ ...scope, record: left })).ok).toBe(true);
    expect((await stagePendingTrustExecutionReceipt({ ...scope, record: right })).ok).toBe(true);
    const [a, b] = await Promise.all([
      commitFinalizedTrustExecutionOutcome({ ...scope, record: left, supersedesReceiptId: base }),
      commitFinalizedTrustExecutionOutcome({ ...scope, record: right, supersedesReceiptId: base }),
    ]);
    expect(a.ok).toBe(true);
    expect(b.ok).toBe(true);
    if (a.ok && b.ok) expect(a.receipt_id).toBe(b.receipt_id);
    const outcomes = await pool.query<{ receipt_id: string }>(
      `select receipt_id from public.wallet_scoped_trust_execution_outcomes where authorization_ref = $1`,
      [auth],
    );
    expect(outcomes.rows).toHaveLength(1);
    const active = await pool.query<{ id: string }>(
      `select id from public.decision_receipts where status = 'active' and wallet_binding_ref = $1`,
      [auth],
    );
    expect(active.rows.map((row) => row.id)).toEqual([outcomes.rows[0]?.receipt_id]);
    const originalRow = await pool.query<{ payload_hash: string; status: string }>(
      `select payload_hash, status from public.decision_receipts where id = $1`,
      [base],
    );
    expect(originalRow.rows[0]).toEqual({ payload_hash: "hash-race-original", status: "pending_finalization" });
    const winnerId = a.ok ? a.receipt_id : "";
    const superseded = await pool.query<{ superseded_receipt_id: string }>(
      `select superseded_receipt_id from public.decision_receipt_supersessions where superseding_receipt_id = $1 order by superseded_receipt_id`,
      [winnerId],
    );
    expect(superseded.rows.map((row) => row.superseded_receipt_id)).toEqual(
      [base, `${base}_left`, `${base}_right`].filter((id) => id !== winnerId).sort(),
    );
  });

  it("refuses to finalize a receipt that is already superseded", async () => {
    const challenge = `${CHALLENGE}-stale`;
    const base = trustExecutionBaseReceiptId(challenge);
    const auth = "waev_stale";
    const replacementId = `${base}_kept`;
    const original = record(base, "hash-stale-original", auth);
    const replacement = record(replacementId, "hash-stale-kept", auth);
    const scope = { ...write(original), authorizationRef: auth, challengeId: challenge, correlationId: "corr-stale" };
    expect((await stagePendingTrustExecutionReceipt(scope)).ok).toBe(true);
    expect((await stagePendingTrustExecutionReceipt({ ...scope, record: replacement })).ok).toBe(true);
    await pool.query(
      `insert into public.decision_receipt_supersessions (
         superseded_receipt_id, superseding_receipt_id, partner_id, policy_id, policy_version, scope
       ) values ($1, $2, $3, $4, 1, 'explicit_reissue')`,
      [base, replacementId, PARTNER, POLICY],
    );
    const blocked = await commitFinalizedTrustExecutionOutcome(scope);
    expect(blocked).toEqual({ ok: false, code: "receipt_superseded" });
    const stored = await pool.query<{ status: string; payload_hash: string }>(
      `select status, payload_hash from public.decision_receipts where id = $1`,
      [base],
    );
    expect(stored.rows[0]).toEqual({ status: "pending_finalization", payload_hash: "hash-stale-original" });
    const outcomes = await pool.query(
      `select receipt_id from public.wallet_scoped_trust_execution_outcomes where authorization_ref = $1`,
      [auth],
    );
    expect(outcomes.rows).toHaveLength(0);
  });

  it("refuses a pending receipt whose scope does not match", async () => {
    const challenge = `${CHALLENGE}-scope`;
    const base = trustExecutionBaseReceiptId(challenge);
    await stagePendingTrustExecutionReceipt({
      ...write(record(base, "hash-scope", "waev_scope")),
      authorizationRef: "waev_scope",
      challengeId: challenge,
      correlationId: "corr-scope",
    });
    const planned = await planTrustExecutionReceiptIdentity({
      challengeId: challenge,
      authorizationRef: "waev_scope",
      partnerId: PARTNER,
      applicationId: APP_ID,
      policyId: POLICY,
      policyVersion: 1,
      subjectPseudonymId: "someone-else",
      walletBindingRef: "waev_scope",
      env: process.env,
    });
    expect(planned).toEqual({ ok: false, code: "receipt_scope_mismatch" });
  });
});
