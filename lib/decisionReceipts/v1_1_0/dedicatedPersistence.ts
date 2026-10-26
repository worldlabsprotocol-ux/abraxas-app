// FILE: lib/decisionReceipts/v1_1_0/dedicatedPersistence.ts
// Migration 152 persistence semantics (browser-safe types + pure rules).

import type { EvidenceCommitmentEntryV1, EvidenceCommitmentV1 } from "@/lib/decisionReceipts/schema/v1_1_0.types";

export type V11IssuancePhase = "pending" | "final" | null;

/** Which migration-152 columns existed as keys on the source DB row. */
export type V11DedicatedColumnPresence = {
  application_binding_ref: boolean;
  evidence_commitment: boolean;
  evidence_commitment_manifest: boolean;
  v11_issuance_phase: boolean;
};

export interface V11DedicatedPersistenceContext {
  columns: V11DedicatedColumnPresence;
  /** Dedicated column when present; otherwise sidecar phase. */
  issuance_phase: V11IssuancePhase;
}

export const V11_MIGRATION_152_COLUMN_KEYS = [
  "application_binding_ref",
  "evidence_commitment",
  "evidence_commitment_manifest",
  "v11_issuance_phase",
] as const;

export function readV11DedicatedColumnPresence(row: Record<string, unknown>): V11DedicatedColumnPresence {
  return {
    application_binding_ref: Object.prototype.hasOwnProperty.call(row, "application_binding_ref"),
    evidence_commitment: Object.prototype.hasOwnProperty.call(row, "evidence_commitment"),
    evidence_commitment_manifest: Object.prototype.hasOwnProperty.call(row, "evidence_commitment_manifest"),
    v11_issuance_phase: Object.prototype.hasOwnProperty.call(row, "v11_issuance_phase"),
  };
}

export function resolveV11IssuancePhaseFromRow(
  row: Record<string, unknown>,
  sidecarPhase: V11IssuancePhase,
): V11IssuancePhase {
  if (!Object.prototype.hasOwnProperty.call(row, "v11_issuance_phase")) {
    return sidecarPhase;
  }
  const raw = row.v11_issuance_phase;
  if (raw === "pending" || raw === "final") return raw;
  return null;
}

/** Phase used for dedicated vs sidecar parity (unbackfilled SQL NULL is not sidecar-final). */
export function resolveParityIssuancePhase(
  persistence: V11DedicatedPersistenceContext,
  sidecarPhase: V11IssuancePhase,
): V11IssuancePhase {
  if (persistence.columns.v11_issuance_phase) {
    return persistence.issuance_phase;
  }
  return persistence.issuance_phase ?? sidecarPhase;
}

/**
 * When true, dedicated column value must match sidecar (including null vs non-null).
 * - Column absent: never enforce (legacy sidecar-only).
 * - Column present + final phase: always enforce.
 * - Column present + non-final + dedicated null: unbackfilled — sidecar remains authoritative.
 * - Column present + any non-null dedicated value: enforce (partial migration must agree).
 */
export function shouldEnforceDedicatedSidecarParity(
  columnPresent: boolean,
  dedicatedValue: unknown,
  issuancePhase: V11IssuancePhase,
): boolean {
  if (!columnPresent) return false;
  if (issuancePhase === "final") return true;
  if (dedicatedValue != null) return true;
  return false;
}

export function dedicatedValueDiffersFromSidecar(
  dedicatedValue: unknown,
  sidecarValue: unknown,
): boolean {
  const left = dedicatedValue === undefined ? null : dedicatedValue;
  const right = sidecarValue === undefined ? null : sidecarValue;
  if (left === null && right === null) return false;
  if (left !== null && right !== null && typeof left === "object" && typeof right === "object") {
    return JSON.stringify(left) !== JSON.stringify(right);
  }
  return left !== right;
}

export function resolveAuthoritativeV11Field<T>(
  dedicated: T | null | undefined,
  sidecar: T | null,
  columnPresent: boolean,
  issuancePhase: V11IssuancePhase,
): T | null {
  if (!columnPresent) return sidecar;
  if (shouldEnforceDedicatedSidecarParity(columnPresent, dedicated, issuancePhase)) {
    return (dedicated ?? null) as T | null;
  }
  return (dedicated ?? sidecar ?? null) as T | null;
}

export type V11DedicatedMismatchReason =
  | "application_binding_persistence_mismatch"
  | "evidence_commitment_persistence_mismatch"
  | "evidence_commitment_manifest_persistence_mismatch";

export function collectDedicatedSidecarMismatches(input: {
  persistence: V11DedicatedPersistenceContext;
  dedicated: {
    application_binding_ref?: string | null;
    evidence_commitment?: EvidenceCommitmentV1 | null;
    evidence_commitment_manifest?: EvidenceCommitmentEntryV1[] | null;
  };
  sidecar: {
    application_binding_ref: string | null;
    evidence_commitment: EvidenceCommitmentV1 | null;
    evidence_commitment_manifest: EvidenceCommitmentEntryV1[] | null;
    issuance_phase?: V11IssuancePhase;
  };
}): V11DedicatedMismatchReason[] {
  const reasons: V11DedicatedMismatchReason[] = [];
  const phase = resolveParityIssuancePhase(
    input.persistence,
    input.sidecar.issuance_phase ?? null,
  );
  const { columns } = input.persistence;

  if (
    shouldEnforceDedicatedSidecarParity(
      columns.application_binding_ref,
      input.dedicated.application_binding_ref,
      phase,
    )
    && dedicatedValueDiffersFromSidecar(
      input.dedicated.application_binding_ref,
      input.sidecar.application_binding_ref,
    )
  ) {
    reasons.push("application_binding_persistence_mismatch");
  }

  if (
    shouldEnforceDedicatedSidecarParity(
      columns.evidence_commitment,
      input.dedicated.evidence_commitment,
      phase,
    )
    && dedicatedValueDiffersFromSidecar(
      input.dedicated.evidence_commitment,
      input.sidecar.evidence_commitment,
    )
  ) {
    reasons.push("evidence_commitment_persistence_mismatch");
  }

  if (
    shouldEnforceDedicatedSidecarParity(
      columns.evidence_commitment_manifest,
      input.dedicated.evidence_commitment_manifest,
      phase,
    )
    && dedicatedValueDiffersFromSidecar(
      input.dedicated.evidence_commitment_manifest,
      input.sidecar.evidence_commitment_manifest,
    )
  ) {
    reasons.push("evidence_commitment_manifest_persistence_mismatch");
  }

  return reasons;
}

/** Build persistence context from a raw DB row (for mapReceiptRow and tests). */
export function v11PersistenceContextFromRow(
  row: Record<string, unknown>,
  sidecarPhase: V11IssuancePhase,
): V11DedicatedPersistenceContext {
  return {
    columns: readV11DedicatedColumnPresence(row),
    issuance_phase: resolveV11IssuancePhaseFromRow(row, sidecarPhase),
  };
}
