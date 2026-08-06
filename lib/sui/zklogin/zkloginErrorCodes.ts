// FILE: lib/sui/zklogin/zkloginErrorCodes.ts
// Safe zkLogin API error codes — no JWTs, emails, or secrets in payloads.

export const ZKLOGIN_ERROR_CODES = {
  invalidToken: "zklogin_invalid_token",
  untrustedAudience: "zklogin_untrusted_audience",
  notConfigured: "zklogin_not_configured",
  legacyNotConfigured: "zklogin_legacy_not_configured",
  legacyClientRequired: "zklogin_legacy_client_required",
  noExistingAccount: "zklogin_no_existing_account",
  audienceMismatch: "zklogin_oauth_audience_mismatch",
  oauthSubMismatch: "zklogin_oauth_sub_mismatch",
  sessionMintFailed: "zklogin_session_mint_failed",
} as const;

export type ZkLoginErrorCode = (typeof ZKLOGIN_ERROR_CODES)[keyof typeof ZKLOGIN_ERROR_CODES];

export function mapZkLoginVerificationFailure(error: unknown): {
  code: ZkLoginErrorCode;
  internalReason: string;
} {
  const message = error instanceof Error ? error.message : "verify_failed";

  if (message === "Google OAuth client ID not configured") {
    return { code: ZKLOGIN_ERROR_CODES.notConfigured, internalReason: message };
  }
  if (message === "untrusted_oauth_audience") {
    return { code: ZKLOGIN_ERROR_CODES.untrustedAudience, internalReason: message };
  }
  if (message === "oauth_sub mismatch") {
    return { code: ZKLOGIN_ERROR_CODES.oauthSubMismatch, internalReason: message };
  }

  return { code: ZKLOGIN_ERROR_CODES.invalidToken, internalReason: message };
}
