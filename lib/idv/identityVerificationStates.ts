// FILE: lib/idv/identityVerificationStates.ts
// Identity verification + credential status state machine.
// Profile complete = account + wallet bind. Identity is optional until policy requires it.

export type IdentityVerificationStatus =
  | "not_started"
  | "session_created"
  | "in_progress"
  | "submitted"
  | "approved"
  | "declined"
  | "requires_resubmission"
  | "expired"
  | "error";

export type CredentialStatus =
  | "not_issued"
  | "active"
  | "suspended"
  | "revoked"
  | "expired";

export type SetupStep = 1 | 2 | 3;

export interface PassportSetupState {
  step: SetupStep;
  stepLabel: string;
  accountComplete: boolean;
  identityComplete: boolean;
  profileComplete: boolean;
  walletBound: boolean;
  identityStatus: IdentityVerificationStatus;
  credentialStatus: CredentialStatus;
  nextAction: "sign_in" | "verify_identity" | "wait_review" | "retry_verify" | "bind_wallet" | "ready" | "manual_review";
  nextActionLabel: string;
}

/** Map legacy `identity_verifications.status` + optional new columns to machine state. */
export function resolveIdentityVerificationStatus(row: {
  status?: string | null;
  identity_verification_status?: string | null;
  credential_status?: string | null;
  credential_jti?: string | null;
  veriff_session_id?: string | null;
} | null): IdentityVerificationStatus {
  if (row?.identity_verification_status) {
    return row.identity_verification_status as IdentityVerificationStatus;
  }
  if (!row) return "not_started";
  if (row.status === "approved") return "approved";
  if (row.status === "revoked") return "declined";
  if (row.status === "suspended") return "error";
  if (row.status === "pending") {
    return row.veriff_session_id ? "in_progress" : "session_created";
  }
  return "not_started";
}

export function resolveCredentialStatus(row: {
  status?: string | null;
  credential_status?: string | null;
  credential_jti?: string | null;
} | null): CredentialStatus {
  if (row?.credential_status) {
    return row.credential_status as CredentialStatus;
  }
  if (row?.status === "approved" && row.credential_jti) return "active";
  if (row?.status === "revoked") return "revoked";
  if (row?.status === "suspended") return "suspended";
  return "not_issued";
}

export function computePassportSetupState(input: {
  walletDone: boolean;
  identityStatus: IdentityVerificationStatus;
  credentialStatus: CredentialStatus;
  walletBindingL3: boolean;
}): PassportSetupState {
  const accountComplete = input.walletDone;
  const identityComplete =
    input.identityStatus === "approved" && input.credentialStatus === "active";
  const walletBound = input.walletBindingL3;
  const profileComplete = accountComplete && walletBound;

  // Step 1: account · Step 2: bind wallet · Step 3: optional identity
  let step: SetupStep = 1;
  if (accountComplete && !walletBound) step = 2;
  else if (accountComplete && walletBound) step = 3;

  let nextAction: PassportSetupState["nextAction"] = "sign_in";
  let nextActionLabel = "Sign in with Google";

  if (!accountComplete) {
    nextAction = "sign_in";
    nextActionLabel = "Sign in with Google";
  } else if (!walletBound) {
    nextAction = "bind_wallet";
    nextActionLabel = "Sign to bind wallet";
  } else   if (
    input.identityStatus === "declined" ||
    input.identityStatus === "expired" ||
    input.identityStatus === "error"
  ) {
    nextAction = "retry_verify";
    nextActionLabel = "Retry optional ID check";
  } else if (input.identityStatus === "requires_resubmission") {
    nextAction = "retry_verify";
    nextActionLabel = "Upload new documents";
  } else if (
    input.identityStatus === "in_progress" ||
    input.identityStatus === "submitted" ||
    input.identityStatus === "session_created"
  ) {
    nextAction = "wait_review";
    nextActionLabel = "ID review in progress (optional)";
  } else if (profileComplete && !identityComplete) {
    nextAction = "ready";
    nextActionLabel = "Profile ready — add ID anytime";
  } else if (profileComplete) {
    nextAction = "ready";
    nextActionLabel = "Passport ready";
  }

  const completedSteps = [
    accountComplete,
    walletBound,
    identityComplete,
  ].filter(Boolean).length;

  return {
    step,
    stepLabel: `Step ${step} of 3 · ${completedSteps}/3 complete`,
    accountComplete,
    identityComplete,
    profileComplete,
    walletBound,
    identityStatus: input.identityStatus,
    credentialStatus: input.credentialStatus,
    nextAction,
    nextActionLabel,
  };
}

export function mapVeriffToIdentityStatus(
  veriffStatus: string,
): IdentityVerificationStatus {
  switch (veriffStatus) {
    case "approved":
      return "approved";
    case "declined":
      return "declined";
    case "resubmission_requested":
      return "requires_resubmission";
    case "submitted":
    case "review":
      return "submitted";
    case "expired":
    case "abandoned":
      return "expired";
    default:
      return "in_progress";
  }
}
