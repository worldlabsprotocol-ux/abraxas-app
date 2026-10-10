// FILE: lib/passport/passportPresentationState.ts
// Holder-facing Passport verification labels mapped from backend states.

import type { CredentialStatus, IdentityVerificationStatus } from "@/lib/idv/identityVerificationStates";

export type PassportPresentationState =
  | "NOT_STARTED"
  | "SUBMITTED"
  | "UNDER_REVIEW"
  | "VERIFIED"
  | "REQUIRES_ACTION"
  | "EXPIRED"
  | "REVOKED";

export function mapPassportPresentationState(input: {
  identityStatus: IdentityVerificationStatus;
  credentialStatus: CredentialStatus;
}): PassportPresentationState {
  if (input.credentialStatus === "revoked") return "REVOKED";
  if (input.credentialStatus === "expired" || input.identityStatus === "expired") return "EXPIRED";

  if (input.identityStatus === "approved" && input.credentialStatus === "active") {
    return "VERIFIED";
  }

  if (input.identityStatus === "requires_resubmission") return "REQUIRES_ACTION";
  if (input.identityStatus === "declined" || input.identityStatus === "error") return "REQUIRES_ACTION";

  if (
    input.identityStatus === "submitted"
    || input.identityStatus === "in_progress"
    || input.identityStatus === "session_created"
  ) {
    return input.identityStatus === "submitted" ? "SUBMITTED" : "UNDER_REVIEW";
  }

  return "NOT_STARTED";
}
