// FILE: lib/partner/launchpad/publicErrors.ts
// Stable public reason codes for Partner Launchpad routes.

export const LAUNCHPAD_PUBLIC_ERRORS = {
  not_configured: "launchpad_not_configured",
  unauthorized: "launchpad_unauthorized",
  forbidden: "launchpad_forbidden",
  invalid_input: "launchpad_invalid_input",
  application_not_found: "launchpad_application_not_found",
  provision_failed: "launchpad_provision_failed",
  idempotency_replay: "launchpad_idempotency_replay",
  return_url_rejected: "launchpad_return_url_rejected",
  policy_template_invalid: "launchpad_policy_template_invalid",
  credential_rotate_failed: "launchpad_credential_rotate_failed",
  credential_revoke_failed: "launchpad_credential_revoke_failed",
  production_request_failed: "launchpad_production_request_failed",
  signing_unavailable: "launchpad_signing_unavailable",
  verify_config_unavailable: "launchpad_verify_config_unavailable",
  policy_version_blocked: "launchpad_policy_version_blocked",
  sandbox_rate_limited: "sandbox_rate_limited",
  sandbox_run_duplicate: "sandbox_run_duplicate",
} as const;

export type LaunchpadPublicErrorCode = typeof LAUNCHPAD_PUBLIC_ERRORS[keyof typeof LAUNCHPAD_PUBLIC_ERRORS];
