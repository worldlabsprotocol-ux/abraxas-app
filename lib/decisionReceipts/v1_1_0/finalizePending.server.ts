// FILE: lib/decisionReceipts/v1_1_0/finalizePending.server.ts
import "server-only";

import { requireSupabaseAdmin } from "@/lib/supabase/admin";
import type { DecisionReceiptRecord } from "@/lib/decisionReceipts/types";
import { signReceiptPayload } from "@/lib/decisionReceipts/signing";
import { resolveIssuanceSigningKey } from "@/lib/decisionReceipts/verificationKeyLifecycle";
import { getReceiptById } from "@/lib/decisionReceipts/service";
import { mapReceiptRow } from "@/lib/decisionReceipts/mapReceiptRow";
import { DECISION_RECEIPT_SCHEMA_V1_1 } from "@/lib/decisionReceipts/schema/v1_1_0";
import {
  AuthoritativeIssuanceError,
  ReceiptCryptographicImmutabilityError,
  buildAuthoritativeEvidenceCommitmentAndManifest,
  resolveAuthoritativeApplicationBindingRef,
} from "@/lib/decisionReceipts/v1_1_0/authoritativeIssuance.server";
import { buildSignedCanonicalV11, attachV11FieldsFromSidecar } from "@/lib/decisionReceipts/v1_1_0/canonicalIssuance.server";
import { decodeReceiptV11Sidecar, encodeReceiptV11Sidecar, V1_1_SIDECAR_SCHEMA } from "@/lib/decisionReceipts/v1_1_0/sidecar";
import { isReceiptIssuanceFinalized } from "@/lib/decisionReceipts/issuanceFinalization";
import { persistV11FinalizationAtomic } from "@/lib/decisionReceipts/v1_1_0/atomicFinalization.server";
import { resolveV11PersistenceCapability } from "@/lib/decisionReceipts/v1_1_0/v11PersistenceCapability.server";
import { persistenceUsesDirectPostgres } from "@/lib/persistence/env";

type PgTransaction = { query: (sql: string, params: unknown[]) => Promise<{ rows: Array<Record<string, unknown>> }> };

/**
 * Atomically transition pending → active with the final v1.1.0 signature.
 * Never mutates active, revoked, or expired published receipts.
 */
export async function finalizePendingV11ReceiptCryptographic(input: {
  receiptId: string;
  applicationId: string | null;
  applicationScopeRequired: boolean;
  env?: Record<string, string | undefined>;
  transaction?: PgTransaction;
}): Promise<DecisionReceiptRecord> {
  const existing = input.transaction && persistenceUsesDirectPostgres()
    ? null : await getReceiptById(input.receiptId);
  const locked = input.transaction && persistenceUsesDirectPostgres()
    ? await input.transaction.query(
        `select to_jsonb(r) as receipt from public.decision_receipts r
         where r.id = $1 for update`, [input.receiptId],
      ) : null;
  const pendingRecord = locked?.rows[0]?.receipt
    ? mapReceiptRow(locked.rows[0].receipt as Record<string, unknown>) : existing;
  if (!pendingRecord) throw new Error("receipt_missing");
  const receipt = pendingRecord;
  if (receipt.schema_version !== DECISION_RECEIPT_SCHEMA_V1_1) {
    throw new ReceiptCryptographicImmutabilityError(
      "not_v11_receipt",
      "receipt_immutability_violation",
    );
  }

  if (receipt.status !== "pending_finalization") {
    if (receipt.status === "active" && isReceiptIssuanceFinalized(receipt)) {
      const sidecar = decodeReceiptV11Sidecar(receipt.anchor_reference);
      if (sidecar.ok && sidecar.sidecar.issuance_phase === "final") {
        return receipt;
      }
    }
    throw new ReceiptCryptographicImmutabilityError(
      `cannot_finalize_from_status:${receipt.status}`,
      "receipt_immutability_violation",
    );
  }

  const application_binding_ref = await resolveAuthoritativeApplicationBindingRef({
    partnerId: receipt.partner_id,
    policyId: receipt.policy_id,
    policyVersion: receipt.policy_version,
    decisionContext: receipt.decision_context,
    applicationId: input.applicationId,
    applicationScopeRequired: input.applicationScopeRequired,
    env: input.env,
  });

  const { commitment, manifest } = await buildAuthoritativeEvidenceCommitmentAndManifest({
    receiptId: receipt.id,
    requireFinalizedGraph: true,
    env: input.env,
    transaction: input.transaction,
  });

  const anchor_reference = encodeReceiptV11Sidecar({
    schema: V1_1_SIDECAR_SCHEMA,
    issuance_phase: "final",
    application_binding_ref,
    evidence_commitment: commitment,
    evidence_commitment_manifest: manifest,
  });

  const recordForSign = attachV11FieldsFromSidecar({
    ...receipt,
    anchor_reference,
    application_binding_ref,
    evidence_commitment: commitment,
  });

  const { payload } = buildSignedCanonicalV11(recordForSign);
  const signingKey = resolveIssuanceSigningKey({
    schemaVersion: DECISION_RECEIPT_SCHEMA_V1_1,
    env: input.env,
  });
  if (!signingKey.ok) throw new Error("receipt_signing_unavailable");

  const { payloadHash, signature } = signReceiptPayload(
    payload as Parameters<typeof signReceiptPayload>[0],
    signingKey.privateKeyJwk,
  );

  const finalizedAt = new Date().toISOString();
  if (input.transaction && persistenceUsesDirectPostgres()) {
    const columns = await input.transaction.query(
      `select column_name from information_schema.columns
       where table_schema = 'public' and table_name = 'decision_receipts'
         and column_name = any($1::text[])`,
      [["application_binding_ref", "evidence_commitment", "evidence_commitment_manifest", "v11_issuance_phase"]],
    );
    const dedicated = columns.rows.length;
    if (dedicated !== 0 && dedicated !== 4) throw new Error("v11_dedicated_schema_incomplete");
    const dedicatedSet = dedicated === 4
      ? `, application_binding_ref = $7,
           evidence_commitment = $8::jsonb,
           evidence_commitment_manifest = $9::jsonb,
           v11_issuance_phase = 'final'` : "";
    const updated = await input.transaction.query(
      `update public.decision_receipts set status = 'active',
         issuance_finalized_at = $3::timestamptz, payload_hash = $4,
         signature = $5, anchor_reference = $6${dedicatedSet}
       where id = $1 and status = 'pending_finalization' and payload_hash = $2
       returning to_jsonb(decision_receipts) as receipt`,
      [receipt.id, receipt.payload_hash, finalizedAt, payloadHash, signature,
        anchor_reference, ...(dedicated === 4
          ? [application_binding_ref, JSON.stringify(commitment), JSON.stringify(manifest)] : [])],
    );
    const row = updated.rows[0]?.receipt;
    if (!row) throw new ReceiptCryptographicImmutabilityError("finalization_race", "finalization_race");
    return mapReceiptRow(row as Record<string, unknown>);
  }
  const persistenceCap = await resolveV11PersistenceCapability(input.env);

  if (persistenceCap.atomicFinalizeEnabled && persistenceCap.dedicatedColumnsEnabled) {
    return persistV11FinalizationAtomic({
      receiptId: receipt.id,
      expectedProvisionalPayloadHash: receipt.payload_hash,
      write: {
        payload_hash: payloadHash,
        signature,
        anchor_reference,
        application_binding_ref,
        evidence_commitment: commitment as Record<string, unknown>,
        evidence_commitment_manifest: manifest,
        issuance_finalized_at: finalizedAt,
        v11_issuance_phase: "final",
      },
    });
  }

  const sb = requireSupabaseAdmin();
  const { data, error } = await sb
    .from("decision_receipts")
    .update({
      status: "active",
      issuance_finalized_at: finalizedAt,
      payload_hash: payloadHash,
      signature,
      anchor_reference,
    })
    .eq("id", receipt.id)
    .eq("status", "pending_finalization")
    .eq("payload_hash", receipt.payload_hash)
    .select("*")
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!data) {
    const raced = await getReceiptById(receipt.id);
    if (raced && raced.status === "active" && isReceiptIssuanceFinalized(raced)) {
      const sidecar = decodeReceiptV11Sidecar(raced.anchor_reference);
      if (sidecar.ok && sidecar.sidecar.issuance_phase === "final") return raced;
    }
    throw new ReceiptCryptographicImmutabilityError("finalization_race", "finalization_race");
  }

  return mapReceiptRow(data as Record<string, unknown>);
}

/** Guarded entry — refuses to mutate non-pending receipts (for tests and audits). */
export async function attemptResignPublishedReceipt(input: {
  receiptId: string;
}): Promise<never> {
  const existing = await getReceiptById(input.receiptId);
  if (!existing) throw new Error("receipt_missing");
  if (existing.status !== "pending_finalization") {
    throw new ReceiptCryptographicImmutabilityError(
      `refused_resign_status:${existing.status}`,
      "receipt_immutability_violation",
    );
  }
  throw new Error("use_finalizePendingV11ReceiptCryptographic");
}
