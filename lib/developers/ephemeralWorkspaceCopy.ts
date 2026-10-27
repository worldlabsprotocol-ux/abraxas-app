// FILE: lib/developers/ephemeralWorkspaceCopy.ts

export const EPHEMERAL_WORKSPACE_PAGE_TITLE = "Your Abraxas workspace";
export const EPHEMERAL_WORKSPACE_PAGE_EYEBROW = "Sandbox";
export const EPHEMERAL_WORKSPACE_PAGE_SUBTITLE =
  "One continuous journey: prove wallet control, create your test app, run verification, and check the result independently.";

export const EPHEMERAL_WORKSPACE_SANDBOX_BADGE = "Sandbox";
/** Retention for sandbox workspace metadata and test result records in ephemeral storage (see EPHEMERAL_TTL). */
export const EPHEMERAL_WORKSPACE_SANDBOX_EXPIRY_NOTE =
  "Sandbox test records and workspace metadata are retained for 24 hours. Wallet signing challenges expire in minutes. Credential validity is separate and issuer-defined.";
export const EPHEMERAL_WORKSPACE_TEST_ONLY_NOTE = EPHEMERAL_WORKSPACE_SANDBOX_EXPIRY_NOTE;

export function mapSandboxEnterFailure(code?: string | null): string {
  switch (code) {
    case "ephemeral_state_unavailable":
      return "Sandbox storage is temporarily unavailable. Try again shortly or contact support with the correlation id below.";
    case "store_unavailable":
      return "Authorization storage is temporarily unavailable. Try again in a moment.";
    case "session_context_mismatch":
      return "Your authorization context expired. Open the workspace again.";
    case "invalid_signature":
      return "Wallet signature could not be verified. Try again.";
    case "wrong_signer":
      return "This wallet does not match your signed-in session.";
    case "expired":
      return "This request expired. Create a new request.";
    case "policy_mismatch":
      return "The signed authorization does not match the selected policy. Create a new request.";
    case "replay":
      return "This authorization was already used. Create a new request.";
    case "timeout":
      return "Phantom did not respond in time. Review the request in your wallet or create a new request.";
    case "cancelled":
    case "aborted":
      return "Signature request cancelled.";
    default:
      return code ? `Could not complete this step (${code}). Try again.` : "Could not complete this step. Try again.";
  }
}

export function verificationReviewTitle(policyId: string, policyLabel?: string): string {
  if (policyId === "wallet_control") return "Authorize wallet control verification";
  if (policyId === "age_21_retail") return "Authorize Age 21 demonstration request";
  return policyLabel ? `Verify ${policyLabel}` : "Authorize test verification";
}

export function verificationReviewScopeNote(policyId: string): string | null {
  if (policyId === "wallet_control") {
    return "This checks control of your connected wallet using a valid wallet signature.";
  }
  if (policyId === "age_21_retail") {
    return "Your signature authorizes this Age 21 demonstration only. It does not prove real world age eligibility.";
  }
  return null;
}

export function policyExperienceBanner(policyId: string, ageExperience?: string | null): string | null {
  if (policyId === "wallet_control") {
    return "Wallet control: genuine wallet signature verification.";
  }
  if (policyId === "age_21_retail") {
    if (ageExperience === "age_21_test") {
      return "Age 21 demonstration: issuer signed sandbox evidence only. Not real world age eligibility.";
    }
    if (ageExperience === "age_21_verification_pending") {
      return "Real age eligibility: requires Passport presentation of a credential from recognized cryptographic issuer authority. Not wired in this workspace yet.";
    }
    return "Real age eligibility requires recognized issuer authority and holder presentation. Sandbox demonstration is not enabled here.";
  }
  return null;
}
