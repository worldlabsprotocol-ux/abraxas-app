// FILE: lib/assurance/evidenceStorage.ts
// Backward-compatible evidence storage — fail closed when required, degrade when optional.

export const AGE_EVIDENCE_TABLE = "age_evidence_records";

/** PostgREST / Postgres signals that a relation does not exist yet (pre-migration 078). */
export function isMissingRelationError(message: string | undefined): boolean {
  if (!message) return false;
  const lower = message.toLowerCase();
  return (
    lower.includes("age_evidence_records")
    && (
      lower.includes("does not exist")
      || lower.includes("could not find the table")
      || lower.includes("schema cache")
      || lower.includes("42p01")
    )
  );
}

export type EvidenceStorageAvailability =
  | { available: true }
  | { available: false; reason: "not_configured" | "table_missing" };
