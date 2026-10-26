// FILE: lib/decisionReceipts/v1_1_0/atomicFinalization.server.ts
import "server-only";

import { requireSupabaseAdmin } from "@/lib/supabase/admin";
import type { DecisionReceiptRecord } from "@/lib/decisionReceipts/types";
import { mapReceiptRow } from "@/lib/decisionReceipts/mapReceiptRow";
import {
  assertAtomicFinalizationWritePayload,
  type AtomicFinalizationWritePayload,
} from "@/lib/decisionReceipts/v1_1_0/persistenceState";
import { ReceiptCryptographicImmutabilityError } from "@/lib/decisionReceipts/v1_1_0/authoritativeIssuance.server";

export type AtomicFinalizeRpcResult =
  | { ok: true; row: Record<string, unknown> }
  | { ok: false; code: string };

export async function persistV11FinalizationAtomic(input: {
  receiptId: string;
  expectedProvisionalPayloadHash: string;
  write: AtomicFinalizationWritePayload;
}): Promise<DecisionReceiptRecord> {
  assertAtomicFinalizationWritePayload(input.write);

  const sb = requireSupabaseAdmin();
  const { data, error } = await sb.rpc("abraxas_finalize_v11_receipt_atomic", {
    p_receipt_id: input.receiptId,
    p_expected_payload_hash: input.expectedProvisionalPayloadHash,
    p_payload_hash: input.write.payload_hash,
    p_signature: input.write.signature,
    p_anchor_reference: input.write.anchor_reference,
    p_application_binding_ref: input.write.application_binding_ref,
    p_evidence_commitment: input.write.evidence_commitment,
    p_evidence_commitment_manifest: input.write.evidence_commitment_manifest,
    p_v11_issuance_phase: input.write.v11_issuance_phase,
    p_issuance_finalized_at: input.write.issuance_finalized_at,
  });

  if (error) {
    if (error.message.includes("42883") || error.message.toLowerCase().includes("does not exist")) {
      throw new Error("atomic_finalize_rpc_unavailable");
    }
    throw new Error(error.message);
  }

  const parsed = data as AtomicFinalizeRpcResult | { ok: boolean; code?: string; row?: Record<string, unknown> };
  if (!parsed || parsed.ok !== true || !("row" in parsed) || !parsed.row) {
    const code = (parsed && "code" in parsed && parsed.code) ? String(parsed.code) : "atomic_finalize_rejected";
    if (code === "finalization_race" || code === "status_not_pending") {
      throw new ReceiptCryptographicImmutabilityError(code, "finalization_race");
    }
    throw new ReceiptCryptographicImmutabilityError(code, "receipt_immutability_violation");
  }

  return mapReceiptRow(parsed.row);
}
