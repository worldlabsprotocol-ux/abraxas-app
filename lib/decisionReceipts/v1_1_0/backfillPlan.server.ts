// FILE: lib/decisionReceipts/v1_1_0/backfillPlan.server.ts
import "server-only";

import { verifyEvidenceCommitment } from "@/lib/decisionReceipts/schema/v1_1_0.server";
import { decodeReceiptV11Sidecar } from "@/lib/decisionReceipts/v1_1_0/sidecar";
import {
  classifyV11DedicatedPersistenceEpoch,
  isCompleteAuthoritativeV11DedicatedSet,
} from "@/lib/decisionReceipts/v1_1_0/persistenceState";
import { collectDedicatedSidecarMismatches } from "@/lib/decisionReceipts/v1_1_0/dedicatedPersistence";
import { mapReceiptRow } from "@/lib/decisionReceipts/mapReceiptRow";
import { v11PersistenceContextFromRow } from "@/lib/decisionReceipts/v1_1_0/dedicatedPersistence";
import { DECISION_RECEIPT_SCHEMA_V1_1 } from "@/lib/decisionReceipts/schema/v1_1_0.constants";

export type BackfillRowDisposition = "eligible" | "already_final" | "conflict" | "reject";

export type BackfillRowAssessment = {
  receipt_id: string;
  disposition: BackfillRowDisposition;
  reasons: string[];
};

export type BackfillPlanSummary = {
  eligible: number;
  already_final: number;
  conflict: number;
  reject: number;
  rows: BackfillRowAssessment[];
};

/**
 * Idempotent dry-run planner for sidecar → dedicated backfill (no writes).
 * Requires separate founder approval before any execute path.
 */
export function planV11DedicatedBackfillFromRows(
  rows: Record<string, unknown>[],
): BackfillPlanSummary {
  const summary: BackfillPlanSummary = {
    eligible: 0,
    already_final: 0,
    conflict: 0,
    reject: 0,
    rows: [],
  };

  for (const row of rows) {
    const id = String(row.id ?? "");
    const assessment: BackfillRowAssessment = { receipt_id: id, disposition: "reject", reasons: [] };

    if (row.schema_version !== DECISION_RECEIPT_SCHEMA_V1_1) {
      assessment.reasons.push("not_v11");
      summary.reject += 1;
      summary.rows.push(assessment);
      continue;
    }

    if (row.status === "pending_finalization") {
      assessment.reasons.push("still_pending");
      summary.reject += 1;
      summary.rows.push(assessment);
      continue;
    }

    if (isCompleteAuthoritativeV11DedicatedSet(row)) {
      assessment.disposition = "already_final";
      summary.already_final += 1;
      summary.rows.push(assessment);
      continue;
    }

    const sidecar = decodeReceiptV11Sidecar(row.anchor_reference as string | null);
    if (!sidecar.ok || sidecar.sidecar.issuance_phase !== "final") {
      assessment.reasons.push(`sidecar_${sidecar.ok ? "not_final" : sidecar.reason}`);
      summary.reject += 1;
      summary.rows.push(assessment);
      continue;
    }

    const manifest = sidecar.sidecar.evidence_commitment_manifest ?? [];
    const commitmentOk = verifyEvidenceCommitment({
      commitment: sidecar.sidecar.evidence_commitment,
      manifest,
    });
    if (!commitmentOk.ok) {
      assessment.reasons.push("commitment_digest_invalid");
      summary.reject += 1;
      summary.rows.push(assessment);
      continue;
    }

    const epoch = classifyV11DedicatedPersistenceEpoch(DECISION_RECEIPT_SCHEMA_V1_1, row);
    if (epoch === "partially_backfilled") {
      const mapped = mapReceiptRow(row);
      const mismatches = collectDedicatedSidecarMismatches({
        persistence: mapped.v11_dedicated_persistence ?? {
          columns: v11PersistenceContextFromRow(row, "final").columns,
          issuance_phase: "final",
        },
        dedicated: {
          application_binding_ref: mapped.application_binding_ref,
          evidence_commitment: mapped.evidence_commitment,
          evidence_commitment_manifest: mapped.evidence_commitment_manifest,
        },
        sidecar: {
          application_binding_ref: sidecar.sidecar.application_binding_ref,
          evidence_commitment: sidecar.sidecar.evidence_commitment,
          evidence_commitment_manifest: sidecar.sidecar.evidence_commitment_manifest,
          issuance_phase: sidecar.sidecar.issuance_phase,
        },
      });
      if (mismatches.length) {
        assessment.disposition = "conflict";
        assessment.reasons.push(...mismatches);
        summary.conflict += 1;
        summary.rows.push(assessment);
        continue;
      }
    }

    assessment.disposition = "eligible";
    summary.eligible += 1;
    summary.rows.push(assessment);
  }

  return summary;
}
