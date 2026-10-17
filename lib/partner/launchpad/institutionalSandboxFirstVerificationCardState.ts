// FILE: lib/partner/launchpad/institutionalSandboxFirstVerificationCardState.ts

import type { LaunchpadJourneyResolution, MerchantJourneyStageId } from "@/lib/partner/launchpad/journeyState";
import type { InstitutionalActivationEvidence } from "@/lib/partner/launchpad/institutionalActivationMilestones";
import type { InstitutionalFirstVerifiedOutcomeView } from "@/lib/partner/launchpad/institutionalFirstVerifiedOutcome";

export type IntegrationHealthLoadState =
  | { kind: "idle" }
  | { kind: "loading" }
  | { kind: "ready"; health: OperationalHealthPayload }
  | { kind: "error"; message: string; httpStatus: number | null; retryable: boolean }
  | { kind: "session_expired"; message: string };

export type OperationalHealthPayload = {
  status: string;
  verification_successes: number;
  verification_failures?: number;
  verification_attempts?: number;
  last_receipt_verified_at: string | null;
  technical_proof?: Array<{ stage: string; status: string }>;
  institutional_activation?: InstitutionalActivationEvidence;
  institutional_first_verified_outcome?: InstitutionalFirstVerifiedOutcomeView;
};

export type InstitutionalCardEvidenceState =
  | "loading"
  | "empty"
  | "ready"
  | "unavailable"
  | "error"
  | "session_expired";

export function parseOperationalHealthPayload(body: unknown): OperationalHealthPayload | null {
  if (!body || typeof body !== "object") return null;
  const record = body as Record<string, unknown>;
  if (record.ok === false && typeof record.error === "string") return null;
  if (typeof record.verification_successes !== "number") return null;
  return {
    status: typeof record.status === "string" ? record.status : "unknown",
    verification_successes: record.verification_successes,
    verification_failures:
      typeof record.verification_failures === "number" ? record.verification_failures : 0,
    verification_attempts:
      typeof record.verification_attempts === "number" ? record.verification_attempts : 0,
    last_receipt_verified_at:
      typeof record.last_receipt_verified_at === "string" ? record.last_receipt_verified_at : null,
    technical_proof: Array.isArray(record.technical_proof)
      ? record.technical_proof as OperationalHealthPayload["technical_proof"]
      : undefined,
    institutional_activation: record.institutional_activation as InstitutionalActivationEvidence | undefined,
    institutional_first_verified_outcome: record.institutional_first_verified_outcome as
      | InstitutionalFirstVerifiedOutcomeView
      | undefined,
  };
}

export function integrationHealthErrorMessage(input: {
  httpStatus: number | null;
  body: unknown;
  networkError: boolean;
}): { message: string; retryable: boolean; sessionExpired: boolean } {
  if (input.networkError) {
    return {
      message: "Could not reach integration health. Check your network and try again.",
      retryable: true,
      sessionExpired: false,
    };
  }
  const body = input.body as { error?: string } | null;
  const apiError = typeof body?.error === "string" ? body.error : null;
  if (input.httpStatus === 401 || input.httpStatus === 403) {
    return {
      message: apiError ?? "Launchpad session expired or unauthorized. Sign in again with your sandbox API key.",
      retryable: true,
      sessionExpired: true,
    };
  }
  if (input.httpStatus === 404) {
    return {
      message: "Application not found for this partner session.",
      retryable: false,
      sessionExpired: false,
    };
  }
  if (input.httpStatus != null && input.httpStatus >= 500) {
    return {
      message: apiError ?? "Integration evidence is temporarily unavailable.",
      retryable: true,
      sessionExpired: false,
    };
  }
  return {
    message: apiError ?? "Integration health returned an unexpected response.",
    retryable: true,
    sessionExpired: false,
  };
}

export function deriveInstitutionalCardEvidenceState(
  load: IntegrationHealthLoadState,
): InstitutionalCardEvidenceState {
  if (load.kind === "loading" || load.kind === "idle") return "loading";
  if (load.kind === "session_expired") return "session_expired";
  if (load.kind === "error") return "error";
  if (!load.health.institutional_activation?.milestones?.length) return "unavailable";
  return "ready";
}

export function serverSideVerificationObserved(health: OperationalHealthPayload | null): boolean {
  if (!health) return false;
  return health.verification_successes > 0;
}

/** @deprecated Prefer serverSideVerificationObserved — counts server-side integration telemetry only. */
export function independentVerificationObserved(health: OperationalHealthPayload | null): boolean {
  return serverSideVerificationObserved(health);
}

export function resolveInstitutionalCardNextAction(input: {
  journey: LaunchpadJourneyResolution | null;
  activation: InstitutionalActivationEvidence | undefined;
}): { label: string; detail: string; stage: MerchantJourneyStageId } {
  if (input.activation?.needs_attention_reason) {
    return {
      label: "Review integration status",
      detail: input.activation.needs_attention_reason,
      stage: input.journey?.primaryAction.stage ?? "test",
    };
  }
  if (input.journey?.connectComplete && input.journey.testAvailable) {
    return {
      label: "Run hosted verification test",
      detail:
        "Send a synthetic holder through hosted authorization, then verify the signed decision receipt on your server.",
      stage: "test",
    };
  }
  if (input.journey?.connectComplete) {
    return {
      label: "Finish integration files",
      detail: "Generate starter kit files and deploy them before the first verification attempt.",
      stage: "connect",
    };
  }
  if (input.journey && input.journey.state !== "policy_selected") {
    return {
      label: input.journey.primaryAction.label,
      detail: input.journey.primaryAction.detail,
      stage: input.journey.primaryAction.stage,
    };
  }
  return {
    label: "Create sandbox application",
    detail: "Provision a Launchpad application pinned to organization protocol eligibility.",
    stage: "verify",
  };
}

export function formatTimeToFirstServerSideVerify(
  activation: InstitutionalActivationEvidence | undefined,
): string {
  if (
    activation?.time_to_first_server_side_verify_quality === "measured"
    && activation.time_to_first_server_side_verify_ms != null
  ) {
    return `${Math.round(activation.time_to_first_server_side_verify_ms / 1000)}s from application create to first server-side verification event`;
  }
  return "Unavailable until a server-side verification event is recorded for this application.";
}

/** @deprecated Prefer formatTimeToFirstServerSideVerify. Independent timing is not inferred from integration events. */
export function formatTimeToFirstIndependentVerify(
  activation: InstitutionalActivationEvidence | undefined,
): string {
  return formatTimeToFirstServerSideVerify(activation);
}

export function currentActivationStageLabel(
  activation: InstitutionalActivationEvidence | undefined,
  journey: LaunchpadJourneyResolution | null,
): string {
  if (activation?.needs_attention_reason) return "Needs attention";
  const current = activation?.milestones.find((m) => m.id === activation.current_milestone_id);
  if (current) return current.label;
  return journey?.statusLine ?? "Not started";
}
