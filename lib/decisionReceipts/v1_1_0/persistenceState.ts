// FILE: lib/decisionReceipts/v1_1_0/persistenceState.ts
// Migration compatibility states (key presence — never treat absent columns as SQL NULL).

import {
  readV11DedicatedColumnPresence,
  type V11IssuancePhase,
} from "@/lib/decisionReceipts/v1_1_0/dedicatedPersistence";
import { DECISION_RECEIPT_SCHEMA_V1_1 } from "@/lib/decisionReceipts/schema/v1_1_0.constants";

export type ReceiptStorageSchemaEpoch =
  | "pre_151_legacy"
  | "post_151_pre_152"
  | "post_152_capable";

export type V11DedicatedPersistenceEpoch =
  | "sidecar_only_v11"
  | "post_152_unbackfilled"
  | "partially_backfilled"
  | "fully_finalized_dedicated";

export function hasIssuanceFinalizationColumn(row: Record<string, unknown>): boolean {
  return Object.prototype.hasOwnProperty.call(row, "issuance_finalized_at");
}

export function classifyStorageSchemaEpoch(row: Record<string, unknown>): ReceiptStorageSchemaEpoch {
  const v152 = readV11DedicatedColumnPresence(row);
  if (v152.application_binding_ref) return "post_152_capable";
  if (hasIssuanceFinalizationColumn(row)) return "post_151_pre_152";
  return "pre_151_legacy";
}

/** Whether dedicated columns form a complete authoritative final set (all-or-nothing). */
export function isCompleteAuthoritativeV11DedicatedSet(row: Record<string, unknown>): boolean {
  const columns = readV11DedicatedColumnPresence(row);
  if (!columns.v11_issuance_phase || !columns.evidence_commitment || !columns.evidence_commitment_manifest) {
    return false;
  }
  if (row.v11_issuance_phase !== "final") return false;
  if (row.evidence_commitment == null) return false;
  if (!Array.isArray(row.evidence_commitment_manifest)) return false;
  return true;
}

export function hasAnyDedicatedV11FieldPopulated(row: Record<string, unknown>): boolean {
  const columns = readV11DedicatedColumnPresence(row);
  if (columns.application_binding_ref && row.application_binding_ref != null) return true;
  if (columns.evidence_commitment && row.evidence_commitment != null) return true;
  if (columns.evidence_commitment_manifest && row.evidence_commitment_manifest != null) return true;
  if (columns.v11_issuance_phase && (row.v11_issuance_phase === "pending" || row.v11_issuance_phase === "final")) {
    return true;
  }
  return false;
}

export function classifyV11DedicatedPersistenceEpoch(
  schemaVersion: string,
  row: Record<string, unknown>,
): V11DedicatedPersistenceEpoch | null {
  if (schemaVersion !== DECISION_RECEIPT_SCHEMA_V1_1) return null;
  const columns = readV11DedicatedColumnPresence(row);
  const any152 = columns.application_binding_ref
    || columns.evidence_commitment
    || columns.evidence_commitment_manifest
    || columns.v11_issuance_phase;
  if (!any152) return "sidecar_only_v11";
  if (isCompleteAuthoritativeV11DedicatedSet(row)) return "fully_finalized_dedicated";
  if (hasAnyDedicatedV11FieldPopulated(row)) return "partially_backfilled";
  return "post_152_unbackfilled";
}

export type AtomicFinalizationWritePayload = {
  payload_hash: string;
  signature: string;
  anchor_reference: string;
  application_binding_ref: string | null;
  evidence_commitment: Record<string, unknown>;
  evidence_commitment_manifest: unknown[];
  issuance_finalized_at: string;
  v11_issuance_phase: "final";
};

/** Fail closed before DB: incomplete authoritative sets must not commit. */
export function assertAtomicFinalizationWritePayload(
  payload: AtomicFinalizationWritePayload,
): void {
  if (!payload.payload_hash?.trim() || !payload.signature?.trim()) {
    throw new Error("atomic_finalization_incomplete:crypto");
  }
  if (!payload.anchor_reference?.trim()) {
    throw new Error("atomic_finalization_incomplete:anchor");
  }
  if (payload.v11_issuance_phase !== "final") {
    throw new Error("atomic_finalization_incomplete:phase");
  }
  if (!payload.issuance_finalized_at?.trim()) {
    throw new Error("atomic_finalization_incomplete:timestamp");
  }
  if (payload.evidence_commitment == null || typeof payload.evidence_commitment !== "object") {
    throw new Error("atomic_finalization_incomplete:commitment");
  }
  if (!Array.isArray(payload.evidence_commitment_manifest)) {
    throw new Error("atomic_finalization_incomplete:manifest");
  }
}
