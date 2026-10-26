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

/**
 * Atomically transition pending → active with the final v1.1.0 signature.
 * Never mutates active, revoked, or expired published receipts.
 */
export async function finalizePendingV11ReceiptCryptographic(input: {
  receiptId: string;
  applicationId: string | null;
  applicationScopeRequired: boolean;
  env?: Record<string, string | undefined>;
}): Promise<DecisionReceiptRecord> {
  const existing = await getReceiptById(input.receiptId);
  if (!existing) throw new Error("receipt_missing");
  if (existing.schema_version !== DECISION_RECEIPT_SCHEMA_V1_1) {
    throw new ReceiptCryptographicImmutabilityError(
      "not_v11_receipt",
      "receipt_immutability_violation",
    );
  }

  if (existing.status !== "pending_finalization") {
    if (existing.status === "active" && isReceiptIssuanceFinalized(existing)) {
      const sidecar = decodeReceiptV11Sidecar(existing.anchor_reference);
      if (sidecar.ok && sidecar.sidecar.issuance_phase === "final") {
        return existing;
      }
    }
    throw new ReceiptCryptographicImmutabilityError(
      `cannot_finalize_from_status:${existing.status}`,
      "receipt_immutability_violation",
    );
  }

  const application_binding_ref = await resolveAuthoritativeApplicationBindingRef({
    partnerId: existing.partner_id,
    policyId: existing.policy_id,
    policyVersion: existing.policy_version,
    decisionContext: existing.decision_context,
    applicationId: input.applicationId,
    applicationScopeRequired: input.applicationScopeRequired,
    env: input.env,
  });

  const { commitment, manifest } = await buildAuthoritativeEvidenceCommitmentAndManifest({
    receiptId: existing.id,
    requireFinalizedGraph: true,
    env: input.env,
  });

  const anchor_reference = encodeReceiptV11Sidecar({
    schema: V1_1_SIDECAR_SCHEMA,
    issuance_phase: "final",
    application_binding_ref,
    evidence_commitment: commitment,
    evidence_commitment_manifest: manifest,
  });

  const recordForSign = attachV11FieldsFromSidecar({
    ...existing,
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
  const persistenceCap = await resolveV11PersistenceCapability(input.env);

  if (persistenceCap.atomicFinalizeEnabled && persistenceCap.dedicatedColumnsEnabled) {
    return persistV11FinalizationAtomic({
      receiptId: existing.id,
      expectedProvisionalPayloadHash: existing.payload_hash,
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
    .eq("id", existing.id)
    .eq("status", "pending_finalization")
    .eq("payload_hash", existing.payload_hash)
    .select("*")
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!data) {
    const raced = await getReceiptById(existing.id);
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
