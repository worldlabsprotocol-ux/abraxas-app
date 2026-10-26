// FILE: lib/partner/trustExecution/finalizeTrustExecutionOutcome.ts

import type { DecisionReceiptRecord } from "@/lib/decisionReceipts/types";
import { getSovereignStagingPgPool } from "@/lib/persistence/boundary/sovereignStagingPg";
import { ScopedChallengeStoreUnavailableError } from "@/lib/auth/walletAuthorization/errors";
import {
  assertAuthorizedIssuerSigningKey,
  assertAuthorizedPartnerPolicy,
  assertLaunchpadApplicationBinding,
} from "./validateAuthorizedExecutionState";

export async function finalizeTrustExecutionOutcome(input: {
  authorizationRef: string;
  partnerId: string;
  applicationId: string;
  challengeId: string;
  correlationId: string;
  record: DecisionReceiptRecord;
  env?: Record<string, string | undefined>;
}): Promise<
  | { ok: true; receipt_id: string; created: boolean }
  | { ok: false; code: string }
> {
  const policyOk = await assertAuthorizedPartnerPolicy({
    partnerId: input.partnerId,
    policyId: input.record.policy_id,
    policyVersion: input.record.policy_version,
  });
  if (!policyOk.ok) return policyOk;

  const keyOk = await assertAuthorizedIssuerSigningKey(input.record.signing_key_id);
  if (!keyOk.ok) return keyOk;

  const appOk = await assertLaunchpadApplicationBinding({
    partnerId: input.partnerId,
    applicationId: input.applicationId,
    policyId: input.record.policy_id,
    policyVersion: input.record.policy_version,
  });
  if (!appOk.ok) return appOk;

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

    const insertReceipt = await client.query(
      `insert into public.decision_receipts (
         id, verification_decision_id, partner_id, policy_id, policy_version,
         subject_pseudonym_id, wallet_binding_ref, decision_result, reason_codes,
         evaluated_claim_refs, issuer_refs, decision_context, evaluated_at, expires_at,
         status, issuance_finalized_at, schema_version, payload_hash, signature, signing_key_id,
         idempotency_key, created_at
       ) values (
         $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22
       ) on conflict (id) do nothing
       returning id`,
      [
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
        input.record.status,
        input.record.issuance_finalized_at,
        input.record.schema_version,
        input.record.payload_hash,
        input.record.signature,
        input.record.signing_key_id,
        input.correlationId,
        input.record.created_at,
      ],
    );

    let receiptId = insertReceipt.rows[0]?.id as string | undefined;
    if (!receiptId) {
      const byIdempotency = await client.query<{ id: string }>(
        `select id from public.decision_receipts where idempotency_key = $1 limit 1`,
        [input.correlationId],
      );
      receiptId = byIdempotency.rows[0]?.id;
      if (!receiptId) {
        await client.query("rollback");
        return { ok: false, code: "receipt_persist_failed" };
      }
      if (receiptId !== input.record.id) {
        await client.query("rollback");
        return { ok: false, code: "idempotency_receipt_mismatch" };
      }
    }

    const link = await client.query(
      `insert into public.partner_launchpad_signed_receipts (receipt_id, application_id, partner_id)
       values ($1, $2::uuid, $3)
       on conflict (receipt_id) do nothing
       returning receipt_id`,
      [receiptId, input.applicationId, input.partnerId],
    );
    if (link.rowCount === 0) {
      const existingLink = await client.query<{ application_id: string }>(
        `select application_id::text from public.partner_launchpad_signed_receipts where receipt_id = $1`,
        [receiptId],
      );
      const linkedApp = existingLink.rows[0]?.application_id;
      if (linkedApp && linkedApp !== input.applicationId) {
        await client.query("rollback");
        return { ok: false, code: "receipt_application_binding_conflict" };
      }
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
        receiptId,
        input.correlationId,
        input.record.decision_result,
      ],
    );

    await client.query("commit");
    return { ok: true, receipt_id: receiptId, created: insertReceipt.rowCount === 1 };
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
    throw new ScopedChallengeStoreUnavailableError(err instanceof Error ? err.message : String(err));
  } finally {
    client.release();
  }
}
