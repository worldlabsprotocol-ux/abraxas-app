// FILE: lib/decisionReceipts/v1_1_0/operationalIntegrity.server.ts
import "server-only";

import { DECISION_RECEIPT_SCHEMA_V1_1 } from "@/lib/decisionReceipts/schema/v1_1_0.constants";
import type { DecisionReceiptRecord } from "@/lib/decisionReceipts/types";
import { decodeReceiptV11Sidecar } from "@/lib/decisionReceipts/v1_1_0/sidecar";
import {
  attachV11FieldsFromSidecar,
  buildSignedCanonicalV11,
} from "@/lib/decisionReceipts/v1_1_0/canonicalIssuance.server";

export type V11OperationalIntegrityResult =
  | { ok: true }
  | { ok: false; reasons: string[] };

/** Fail-closed v1.1.0 signed-field and sidecar integrity (operational path). */
export function assertV11OperationalIntegrity(record: DecisionReceiptRecord): V11OperationalIntegrityResult {
  if (record.schema_version !== DECISION_RECEIPT_SCHEMA_V1_1) {
    return { ok: true };
  }
  const reasons: string[] = [];
  const sidecar = decodeReceiptV11Sidecar(record.anchor_reference);
  if (!sidecar.ok) {
    reasons.push(`v11_sidecar_${sidecar.reason}`);
    return { ok: false, reasons };
  }
  if (sidecar.sidecar.issuance_phase === "pending") {
    reasons.push("v11_issuance_pending");
    return { ok: false, reasons };
  }
  const v11 = attachV11FieldsFromSidecar(record);
  const { payloadHash } = buildSignedCanonicalV11(v11);
  if (record.payload_hash !== payloadHash) {
    reasons.push("payload_hash_mismatch");
  }
  if (record.application_binding_ref != null
    && sidecar.sidecar.application_binding_ref != null
    && record.application_binding_ref !== sidecar.sidecar.application_binding_ref) {
    reasons.push("application_binding_persistence_mismatch");
  }
  if (record.evidence_commitment != null
    && sidecar.sidecar.evidence_commitment != null
    && JSON.stringify(record.evidence_commitment) !== JSON.stringify(sidecar.sidecar.evidence_commitment)) {
    reasons.push("evidence_commitment_persistence_mismatch");
  }
  return reasons.length ? { ok: false, reasons } : { ok: true };
}
