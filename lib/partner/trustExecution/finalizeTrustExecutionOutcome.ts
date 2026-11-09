// FILE: lib/partner/trustExecution/finalizeTrustExecutionOutcome.ts

import type { PoolClient } from "pg";
import type { DecisionReceiptRecord } from "@/lib/decisionReceipts/types";
import { getSovereignStagingPgPool } from "@/lib/persistence/boundary/sovereignStagingPg";
import { ScopedChallengeStoreUnavailableError } from "@/lib/auth/walletAuthorization/errors";
import {
  assertAuthorizedIssuerSigningKey,
  assertAuthorizedPartnerPolicy,
  assertLaunchpadApplicationBinding,
} from "./validateAuthorizedExecutionState";

type TrustExecutionOutcomeWrite = {
  authorizationRef: string;
  partnerId: string;
  applicationId: string;
  challengeId: string;
  correlationId: string;
  record: DecisionReceiptRecord;
  env?: Record<string, string | undefined>;
};

type OutcomeWriteResult =
  | { ok: true; receipt_id: string; created: boolean }
  | { ok: false; code: string };

async function assertOutcomePreconditions(
  input: TrustExecutionOutcomeWrite,
): Promise<{ ok: true } | { ok: false; code: string }> {
  const policyOk = await assertAuthorizedPartnerPolicy({
    partnerId: input.partnerId,
    policyId: input.record.policy_id,
    policyVersion: input.record.policy_version,
  });
  if (!policyOk.ok) return policyOk;

  const keyOk = await assertAuthorizedIssuerSigningKey(input.record.signing_key_id);
  if (!keyOk.ok) return keyOk;

  return assertLaunchpadApplicationBinding({
    partnerId: input.partnerId,
    applicationId: input.applicationId,
    policyId: input.record.policy_id,
    policyVersion: input.record.policy_version,
  });
}

function receiptInsertValues(
  input: TrustExecutionOutcomeWrite,
  status: DecisionReceiptRecord["status"],
  issuanceFinalizedAt: string | null,
): unknown[] {
  return [
    input.record.id,
    input.record.verification_decision_id,
    input.record.partner_id,
    input.record.policy_id,
    input.record.policy_version,
    input.record.subject_pseudonym_id,
    input.record.wallet_binding_ref,
    input.record.decision_result,
    input.record.reason_codes,
    JSON.stringify(input.record.evaluated_claim_refs),
    input.record.issuer_refs,
    input.record.decision_context,
    input.record.evaluated_at,
    input.record.expires_at,
    status,
    issuanceFinalizedAt,
    input.record.schema_version,
    input.record.payload_hash,
    input.record.signature,
    input.record.signing_key_id,
    input.correlationId,
    input.record.created_at,
  ];
}

const RECEIPT_INSERT_SQL = `insert into public.decision_receipts (
  id, verification_decision_id, partner_id, policy_id, policy_version,
  subject_pseudonym_id, wallet_binding_ref, decision_result, reason_codes,
  evaluated_claim_refs, issuer_refs, decision_context, evaluated_at, expires_at,
  status, issuance_finalized_at, schema_version, payload_hash, signature, signing_key_id,
  idempotency_key, created_at
) values (
  $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22
) on conflict (id) do nothing
returning id`;

async function resolveInsertedReceiptId(
  client: PoolClient,
  input: TrustExecutionOutcomeWrite,
  insertedId: string | undefined,
): Promise<{ ok: true; receiptId: string } | { ok: false; code: string }> {
  if (insertedId) return { ok: true, receiptId: insertedId };
  const byIdempotency = await client.query(
    `select id from public.decision_receipts where idempotency_key = $1 limit 1`,
    [input.correlationId],
  );
  const receiptId = byIdempotency.rows[0]?.id;
  if (!receiptId) return { ok: false, code: "receipt_persist_failed" };
  if (receiptId !== input.record.id) return { ok: false, code: "idempotency_receipt_mismatch" };
  return { ok: true, receiptId };
}

async function linkLaunchpadReceipt(
  client: PoolClient,
  receiptId: string,
  input: TrustExecutionOutcomeWrite,
): Promise<{ ok: true } | { ok: false; code: string }> {
  const link = await client.query(
    `insert into public.partner_launchpad_signed_receipts (receipt_id, application_id, partner_id)
     values ($1, $2::uuid, $3)
     on conflict (receipt_id) do nothing
     returning receipt_id`,
    [receiptId, input.applicationId, input.partnerId],
  );
  if (link.rowCount === 0) {
    const existingLink = await client.query(
      `select application_id::text as application_id from public.partner_launchpad_signed_receipts where receipt_id = $1`,
      [receiptId],
    );
    const linkedApp = existingLink.rows[0]?.application_id;
    if (linkedApp && linkedApp !== input.applicationId) {
      return { ok: false, code: "receipt_application_binding_conflict" };
    }
  }
  return { ok: true };
}

function rethrowOutcomeWrite(err: unknown): never {
  throw new ScopedChallengeStoreUnavailableError(err instanceof Error ? err.message : String(err));
}

async function waitForFinalizedOutcome(
  pool: NonNullable<ReturnType<typeof getSovereignStagingPgPool>>,
  authorizationRef: string,
): Promise<
  | { ok: true; receipt_id: string; staged: "finalized" }
  | { ok: false; code: string }
> {
  const deadline = Date.now() + 5_000;
  while (Date.now() < deadline) {
    const found = await pool.query<{ receipt_id: string | null }>(
      `select receipt_id from public.wallet_scoped_trust_execution_outcomes
        where authorization_ref = $1`,
      [authorizationRef],
    );
    const receiptId = found.rows[0]?.receipt_id;
    if (receiptId) return { ok: true, receipt_id: receiptId, staged: "finalized" };
    await new Promise((resolve) => setTimeout(resolve, 25));
  }
  return { ok: false, code: "receipt_finalization_in_progress" };
}

export async function finalizeTrustExecutionOutcome(
  input: TrustExecutionOutcomeWrite,
): Promise<OutcomeWriteResult> {
  const ready = await assertOutcomePreconditions(input);
  if (!ready.ok) return ready;

  const pool = getSovereignStagingPgPool(input.env ?? process.env);
  if (!pool) return { ok: false, code: "sovereign_staging_pg_unavailable" };

  const client = await pool.connect();
  try {
    await client.query("begin");

    const existing = await client.query<{ receipt_id: string | null }>(
      `select receipt_id from public.wallet_scoped_trust_execution_outcomes
       where authorization_ref = $1
       for update`,
      [input.authorizationRef],
    );
    const prior = existing.rows[0];
    if (prior?.receipt_id) {
      await client.query("commit");
      return { ok: true, receipt_id: prior.receipt_id, created: false };
    }

    const insertReceipt = await client.query<{ id: string }>(
      RECEIPT_INSERT_SQL,
      receiptInsertValues(input, input.record.status, input.record.issuance_finalized_at ?? null),
    );
    const resolved = await resolveInsertedReceiptId(client, input, insertReceipt.rows[0]?.id);
    if (!resolved.ok) {
      await client.query("rollback");
      return resolved;
    }

    const linked = await linkLaunchpadReceipt(client, resolved.receiptId, input);
    if (!linked.ok) {
      await client.query("rollback");
      return linked;
    }

    await client.query(
      `insert into public.wallet_scoped_trust_execution_outcomes (
         authorization_ref, challenge_id, partner_id, application_id, receipt_id, correlation_id, decision_result
       ) values ($1,$2,$3,$4::uuid,$5,$6,$7)`,
      [
        input.authorizationRef,
        input.challengeId,
        input.partnerId,
        input.applicationId,
        resolved.receiptId,
        input.correlationId,
        input.record.decision_result,
      ],
    );

    await client.query("commit");
    return { ok: true, receipt_id: resolved.receiptId, created: insertReceipt.rowCount === 1 };
  } catch (err) {
    await client.query("rollback").catch(() => undefined);
    if (err instanceof Error && err.message.includes("unique")) {
      const replay = await pool.query<{ receipt_id: string }>(
        `select receipt_id from public.wallet_scoped_trust_execution_outcomes where authorization_ref = $1`,
        [input.authorizationRef],
      );
      const rid = replay.rows[0]?.receipt_id;
      if (rid) return { ok: true, receipt_id: rid, created: false };
    }
    rethrowOutcomeWrite(err);
  } finally {
    client.release();
  }
}

export async function stagePendingTrustExecutionReceipt(
  input: TrustExecutionOutcomeWrite,
): Promise<
  | { ok: true; receipt_id: string; staged: "pending" | "finalized" }
  | { ok: false; code: string }
> {
  const ready = await assertOutcomePreconditions(input);
  if (!ready.ok) return ready;

  const pool = getSovereignStagingPgPool(input.env ?? process.env);
  if (!pool) return { ok: false, code: "sovereign_staging_pg_unavailable" };

  let waitForWinner = false;
  const client = await pool.connect();
  try {
    await client.query("begin");
    const existingOutcome = await client.query<{ receipt_id: string | null }>(
      `select receipt_id from public.wallet_scoped_trust_execution_outcomes
       where authorization_ref = $1
       for update`,
      [input.authorizationRef],
    );
    if (existingOutcome.rows[0]?.receipt_id) {
      await client.query("commit");
      return { ok: true, receipt_id: existingOutcome.rows[0].receipt_id, staged: "finalized" };
    }

    const insertReceipt = await client.query<{ id: string }>(
      RECEIPT_INSERT_SQL,
      receiptInsertValues(input, "pending_finalization", null),
    );
    const resolved = await resolveInsertedReceiptId(client, input, insertReceipt.rows[0]?.id);
    if (!resolved.ok) {
      await client.query("rollback");
      return resolved;
    }

    const stored = await client.query<{ status: string; payload_hash: string }>(
      `select status, payload_hash from public.decision_receipts where id = $1`,
      [resolved.receiptId],
    );
    const row = stored.rows[0];
    if (!row) {
      await client.query("rollback");
      return { ok: false, code: "receipt_persist_failed" };
    }
    if (row.payload_hash !== input.record.payload_hash) {
      if (row.status === "pending_finalization") {
        waitForWinner = true;
        await client.query("commit");
      } else {
        await client.query("rollback");
        return { ok: false, code: "receipt_hash_mismatch" };
      }
    } else if (row.status === "pending_finalization") {
      const linked = await linkLaunchpadReceipt(client, resolved.receiptId, input);
      if (!linked.ok) {
        await client.query("rollback");
        return linked;
      }
      await client.query("commit");
      return { ok: true, receipt_id: resolved.receiptId, staged: "pending" };
    } else if (row.status === "active") {
      await client.query("commit");
      return { ok: true, receipt_id: resolved.receiptId, staged: "finalized" };
    } else {
      await client.query("rollback");
      return { ok: false, code: "receipt_not_pending" };
    }
  } catch (err) {
    await client.query("rollback").catch(() => undefined);
    rethrowOutcomeWrite(err);
  } finally {
    client.release();
  }

  if (waitForWinner) return waitForFinalizedOutcome(pool, input.authorizationRef);
  return { ok: false, code: "receipt_persist_failed" };
}

export async function commitFinalizedTrustExecutionOutcome(
  input: TrustExecutionOutcomeWrite,
): Promise<OutcomeWriteResult> {
  if (input.record.status !== "active" || !input.record.issuance_finalized_at) {
    return { ok: false, code: "receipt_not_finalized" };
  }

  const ready = await assertOutcomePreconditions(input);
  if (!ready.ok) return ready;

  const pool = getSovereignStagingPgPool(input.env ?? process.env);
  if (!pool) return { ok: false, code: "sovereign_staging_pg_unavailable" };

  const client = await pool.connect();
  try {
    await client.query("begin");
    const existing = await client.query<{ receipt_id: string | null }>(
      `select receipt_id from public.wallet_scoped_trust_execution_outcomes
       where authorization_ref = $1
       for update`,
      [input.authorizationRef],
    );
    if (existing.rows[0]?.receipt_id) {
      await client.query("commit");
      return { ok: true, receipt_id: existing.rows[0].receipt_id, created: false };
    }

    const promoted = await client.query(
      `update public.decision_receipts
          set status = 'active',
              issuance_finalized_at = $2
        where id = $1
          and status = 'pending_finalization'
          and payload_hash = $3`,
      [input.record.id, input.record.issuance_finalized_at, input.record.payload_hash],
    );
    if (promoted.rowCount !== 1) {
      const current = await client.query<{ status: string; payload_hash: string; issuance_finalized_at: string | null }>(
        `select status, payload_hash, issuance_finalized_at from public.decision_receipts where id = $1`,
        [input.record.id],
      );
      const row = current.rows[0];
      const alreadyFinal = row
        && row.status === "active"
        && row.payload_hash === input.record.payload_hash
        && row.issuance_finalized_at != null;
      if (!alreadyFinal) {
        await client.query("rollback");
        return { ok: false, code: "receipt_not_finalized" };
      }
    }

    const linked = await linkLaunchpadReceipt(client, input.record.id, input);
    if (!linked.ok) {
      await client.query("rollback");
      return linked;
    }

    await client.query(
      `insert into public.wallet_scoped_trust_execution_outcomes (
         authorization_ref, challenge_id, partner_id, application_id, receipt_id, correlation_id, decision_result
       ) values ($1,$2,$3,$4::uuid,$5,$6,$7)`,
      [
        input.authorizationRef,
        input.challengeId,
        input.partnerId,
        input.applicationId,
        input.record.id,
        input.correlationId,
        input.record.decision_result,
      ],
    );

    await client.query("commit");
    return { ok: true, receipt_id: input.record.id, created: true };
  } catch (err) {
    await client.query("rollback").catch(() => undefined);
    if (err instanceof Error && err.message.includes("unique")) {
      const replay = await pool.query<{ receipt_id: string }>(
        `select receipt_id from public.wallet_scoped_trust_execution_outcomes where authorization_ref = $1`,
        [input.authorizationRef],
      );
      const rid = replay.rows[0]?.receipt_id;
      if (rid === input.record.id) return { ok: true, receipt_id: rid, created: false };
    }
    rethrowOutcomeWrite(err);
  } finally {
    client.release();
  }
}
