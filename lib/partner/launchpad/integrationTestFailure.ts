import { formatLaunchpadPublicError, launchpadErrorFromResponse } from "./publicErrorMessages";

export type IntegrationTestFailurePresentation = {
  kind: "action_required" | "test_failed";
  headline: string;
  detail: string;
  actionLabel: string;
  refreshSession: boolean;
};

type PublicFailureBody = {
  code?: string;
  error?: string;
  retry_after_sec?: number;
};

export function presentIntegrationTestFailure(
  status: number,
  body: PublicFailureBody,
): IntegrationTestFailurePresentation {
  if (status === 401 || status === 403) {
    return {
      kind: "action_required",
      headline: "Sign-in required",
      detail: "Your test app session ended. Sign in again before running the test.",
      actionLabel: "Resume sign-in",
      refreshSession: true,
    };
  }

  if (body.code === "scoped_challenge_store_unavailable") {
    return {
      kind: "action_required",
      headline: "Authorization service is not configured",
      detail: "Abraxas could not store and consume this one-time authorization safely, so the test was not executed. An authorized operator must restore the Production trust-execution store before this action can continue.",
      actionLabel: "",
      refreshSession: false,
    };
  }

  if (body.code === "launchpad_signing_unavailable") {
    return {
      kind: "action_required",
      headline: "Sandbox receipt service unavailable",
      detail: "Abraxas could not issue the verifiable sandbox receipt, so no test was run. Check again after the receipt service is restored.",
      actionLabel: "Check again",
      refreshSession: false,
    };
  }

  if (body.code === "launchpad_return_url_rejected") {
    return {
      kind: "action_required",
      headline: "Callback URL needs attention",
      detail: launchpadErrorFromResponse(body, "The callback URL is not approved for this test app."),
      actionLabel: "Try test again",
      refreshSession: false,
    };
  }

  if (body.code === "launchpad_rate_limited" || body.code === "sandbox_rate_limited" || status === 429) {
    return {
      kind: "action_required",
      headline: "Wait before retrying",
      detail: formatLaunchpadPublicError(body.code, undefined, { retryAfterSec: body.retry_after_sec }),
      actionLabel: "Try test again",
      refreshSession: false,
    };
  }

  if (body.code === "launchpad_application_not_found" || status === 404) {
    return {
      kind: "action_required",
      headline: "Test app unavailable",
      detail: "This sandbox app is missing or no longer available. Return to the previous step and create or select a test app.",
      actionLabel: "Check again",
      refreshSession: false,
    };
  }

  return {
    kind: "test_failed",
    headline: "Test could not complete",
    detail: launchpadErrorFromResponse(body, "Abraxas could not complete the test. Try again, and contact support if it continues."),
    actionLabel: "Try test again",
    refreshSession: false,
  };
}

