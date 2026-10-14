// FILE: lib/idv/holderSubjectAnchorSql.ts
// Shared subject-anchor validation (matches migration 137 CHECK constraints).

import { isChainNeutralHolderSubjectId } from "@/lib/auth/holderSubject/subjectId";
import { normalizeHolderSubjectKey } from "@/lib/idv/holderIdentityRef";

export type SubjectAnchorColumns = {
  sui_address: string | null;
  holder_subject_id: string | null;
};

export type SubjectAnchorValidation =
  | { ok: true }
  | { ok: false; code: "dual_subject_anchor" | "missing_subject_anchor" | "invalid_holder_subject_id" };

/** Exactly one authoritative anchor for review/biometric rows. */
export function validateExclusiveSubjectAnchor(columns: SubjectAnchorColumns): SubjectAnchorValidation {
  const hs = columns.holder_subject_id?.trim() || null;
  const sui = columns.sui_address?.trim() || null;
  if (hs && sui) return { ok: false, code: "dual_subject_anchor" };
  if (!hs && !sui) return { ok: false, code: "missing_subject_anchor" };
  if (hs && !isChainNeutralHolderSubjectId(hs)) {
    return { ok: false, code: "invalid_holder_subject_id" };
  }
  return { ok: true };
}

/**
 * Passport documents: legacy rows may have sui-only or email-only (both null).
 * Chain-neutral rows must use holder_subject_id exclusively.
 */
export function validatePassportDocumentSubjectAnchor(columns: SubjectAnchorColumns): SubjectAnchorValidation {
  const hs = columns.holder_subject_id?.trim() || null;
  const sui = columns.sui_address?.trim() || null;
  if (hs && sui) return { ok: false, code: "dual_subject_anchor" };
  if (hs && !isChainNeutralHolderSubjectId(hs)) {
    return { ok: false, code: "invalid_holder_subject_id" };
  }
  if (hs && sui === null) return { ok: true };
  return { ok: true };
}

export function assertExclusiveSubjectAnchorForWrite(
  subjectKey: string,
  columns: SubjectAnchorColumns,
): void {
  const key = normalizeHolderSubjectKey(subjectKey);
  const validation = validateExclusiveSubjectAnchor(columns);
  if (!validation.ok) {
    throw new Error(`subject_anchor_${validation.code}`);
  }
  if (columns.holder_subject_id && columns.holder_subject_id !== key) {
    throw new Error("subject_anchor_holder_mismatch");
  }
}
