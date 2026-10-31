// Holder-safe access check for verification request previews.
// A pre-addressed request may only be previewed by that Passport subject.

import { normalizeStoredHolderKey } from "@/lib/auth/holderSubject/normalizeSubjectKey";

export function requestPreviewMatchesSubject(
  request: { subject_id?: unknown; sui_address?: unknown },
  subjectId: string,
): boolean {
  let subject: string;
  try {
    subject = normalizeStoredHolderKey(subjectId);
  } catch {
    return false;
  }

  const stored = [request.subject_id, request.sui_address]
    .filter((value): value is string => typeof value === "string" && value.trim().length > 0);

  return stored.length > 0 && stored.every(value => {
    try {
      return normalizeStoredHolderKey(value) === subject;
    } catch {
      return false;
    }
  });
}
