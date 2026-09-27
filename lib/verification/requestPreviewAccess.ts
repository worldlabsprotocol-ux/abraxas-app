// Holder-safe access check for verification request previews.
// A pre-addressed request may only be previewed by that Passport subject.

import { normalizeSuiAddress } from "@mysten/sui/utils";

export function requestPreviewMatchesSubject(
  request: { subject_id?: unknown; sui_address?: unknown },
  subjectId: string,
): boolean {
  let subject: string;
  try {
    subject = normalizeSuiAddress(subjectId);
  } catch {
    return false;
  }

  const stored = [request.subject_id, request.sui_address]
    .filter((value): value is string => typeof value === "string" && value.trim().length > 0);

  return stored.every(value => {
    try {
      return normalizeSuiAddress(value) === subject;
    } catch {
      return false;
    }
  });
}
