// FILE: lib/partner/hostedHandoff/launchpadCreateErrors.ts
// Map Launchpad hosted-handoff POST responses to safe operator-facing copy.

import { launchpadErrorFromResponse } from "@/lib/partner/launchpad/publicErrorMessages";

export interface LaunchpadHandoffErrorBody {
  ok?: boolean;
  code?: string;
  error?: string;
  retry_after_sec?: number;
}

export function hostedHandoffCreateErrorMessage(
  status: number,
  data: LaunchpadHandoffErrorBody | null | undefined,
): string {
  const code = data?.code ?? "";
  if (status === 401 || code === "launchpad_unauthorized") {
    return "Partner session expired. Sign in again, then create the handoff.";
  }
  if (status === 429 || code === "sandbox_rate_limited" || code === "launchpad_rate_limited") {
    return launchpadErrorFromResponse(data ?? {}, "Too many handoff requests. Wait a moment and try again.");
  }
  if (code === "not_configured") {
    return "Save Partner Flow configuration and an approved callback first.";
  }
  if (code === "callback_rejected") {
    return "Approved callback URL is missing or not on the application allowlist. Update Partner Flow configuration.";
  }
  if (code === "app_unpinned") {
    return "Pin a policy version on this application before creating a handoff.";
  }
  if (code === "AMBIGUOUS_POLICY_BINDING") {
    return "Select which integration policy to use, then create the handoff again.";
  }
  if (code === "POLICY_BINDING_NOT_FOUND" || code === "POLICY_BINDING_NOT_ACTIVE") {
    return "The selected integration policy is unavailable. Refresh Launchpad and choose an active policy.";
  }
  if (code === "POLICY_BINDING_ENVIRONMENT_MISMATCH" || code === "PRODUCTION_BINDING_NOT_AUTHORIZED") {
    return "This policy binding is not authorized for sandbox handoffs.";
  }
  if (code === "schema_unavailable" || code === "unavailable") {
    return "Handoff storage is temporarily unavailable. Try again shortly.";
  }
  if (code === "redacted") {
    return "Handoff response failed privacy checks. Contact support if this persists.";
  }
  if (data?.error && data.error !== code) {
    return data.error;
  }
  if (code) {
    return launchpadErrorFromResponse(data ?? {}, "Could not create a handoff.");
  }
  return "Could not create a handoff.";
}
