// FILE: lib/partner/launchpad/institutionalActivationMilestones.ts
// Tenant-scoped institutional sandbox activation evidence (Build #583).

import type { LaunchpadJourneyResolution } from "@/lib/partner/launchpad/journeyState";
import type { IntegrationOperationalHealth } from "@/lib/partner/integrationObservability/health";

export type InstitutionalActivationMilestoneStatus =
  | "complete"
  | "current"
  | "pending"
  | "failed"
  | "unavailable";

export type InstitutionalActivationMilestoneId =
  | "sandbox_application_provisioned"
  | "integration_configured"
  | "credentials_generated"
  | "integration_connected"
  | "hosted_verification_ready"
  | "first_request_received"
  | "holder_consent_completed"
  | "signed_receipt_issued"
  | "independent_verification_succeeded"
  | "needs_attention";

export interface InstitutionalActivationMilestone {
  id: InstitutionalActivationMilestoneId;
  label: string;
  status: InstitutionalActivationMilestoneStatus;
  detail: string;
  observed_at: string | null;
}

export interface InstitutionalActivationEvidence {
  contract_version: "1.0.0";
  current_milestone_id: InstitutionalActivationMilestoneId;
  needs_attention_reason: string | null;
  time_to_first_server_side_verify_ms: number | null;
  time_to_first_server_side_verify_quality: "measured" | "unavailable";
  /** External RP/SDK verification timing — not inferred from integration events. */
  time_to_first_independent_verify_ms: number | null;
  time_to_first_independent_verify_quality: "measured" | "unavailable";
  milestones: InstitutionalActivationMilestone[];
}

function proofObserved(
  health: IntegrationOperationalHealth | null,
  stageLabel: string,
): { observed: boolean; at: string | null; failed: boolean } {
  const row = health?.technical_proof?.find((item) => item.stage === stageLabel);
  if (!row) return { observed: false, at: null, failed: false };
  return {
    observed: row.status === "observed",
    at: row.at,
    failed: row.status === "failed",
  };
}

export function buildInstitutionalActivationEvidence(input: {
  applicationCreatedAt: string | null;
  journey: LaunchpadJourneyResolution | null;
  health: IntegrationOperationalHealth | null;
  activeSandboxKey: boolean;
  starterKitEvidenced: boolean;
  callbackConfigured: boolean;
}): InstitutionalActivationEvidence {
  const requestProof = proofObserved(input.health, "Request created");
  const consentProof = proofObserved(input.health, "Holder consented");
  const receiptProof = proofObserved(input.health, "Receipt issued");
  const verifyProof = proofObserved(input.health, "Receipt verified server-side");

  const provisioned = Boolean(input.journey && input.journey.state !== "policy_selected");
  const configured = input.callbackConfigured && input.journey?.connectComplete !== false;
  const credentials = input.activeSandboxKey;
  const connected = input.starterKitEvidenced && input.callbackConfigured;
  const hostedReady = Boolean(input.journey?.testAvailable);
  const verified = (input.health?.verification_successes ?? 0) > 0 && verifyProof.observed;

  const milestones: InstitutionalActivationMilestone[] = [
    {
      id: "sandbox_application_provisioned",
      label: "Sandbox application provisioned",
      status: provisioned ? "complete" : "current",
      detail: provisioned
        ? "Launchpad created an active sandbox application pinned to institutional protocol access."
        : "Create a sandbox application in Partner Launchpad.",
      observed_at: provisioned ? input.applicationCreatedAt : null,
    },
    {
      id: "integration_configured",
      label: "Integration configured",
      status: configured ? "complete" : provisioned ? "current" : "pending",
      detail: configured
        ? "Callback URL and partner flow configuration are present."
        : "Add an allowlisted callback URL and save partner flow settings.",
      observed_at: configured ? input.applicationCreatedAt : null,
    },
    {
      id: "credentials_generated",
      label: "Sandbox credentials generated",
      status: credentials ? "complete" : provisioned ? "current" : "pending",
      detail: credentials
        ? "Sandbox API key issued for partner authentication."
        : "Provision or reveal the sandbox API key once.",
      observed_at: null,
    },
    {
      id: "integration_connected",
      label: "Integration files connected",
      status: connected ? "complete" : credentials ? "current" : "pending",
      detail: connected
        ? "Starter kit generated and callback configured."
        : "Generate starter kit files and deploy them to your test environment.",
      observed_at: null,
    },
    {
      id: "hosted_verification_ready",
      label: "Hosted verification ready",
      status: hostedReady ? "complete" : connected ? "current" : "pending",
      detail: hostedReady
        ? "Launchpad test harness can open hosted verification."
        : "Finish connect steps until hosted verification is enabled.",
      observed_at: null,
    },
    {
      id: "first_request_received",
      label: "First hosted verification initiated",
      status: requestProof.failed
        ? "failed"
        : requestProof.observed
          ? "complete"
          : hostedReady
            ? "current"
            : "pending",
      detail: requestProof.observed
        ? "A verification request or hosted handoff was recorded for this application."
        : "Run hosted verification from Launchpad or your integration server.",
      observed_at: requestProof.at,
    },
    {
      id: "holder_consent_completed",
      label: "Holder consent completed",
      status: consentProof.observed ? "complete" : requestProof.observed ? "current" : "pending",
      detail: consentProof.observed
        ? "Holder authorization consent recorded without identity evidence in integration telemetry."
        : "Complete holder consent in the hosted flow.",
      observed_at: consentProof.at,
    },
    {
      id: "signed_receipt_issued",
      label: "Signed decision receipt issued",
      status: receiptProof.observed ? "complete" : consentProof.observed ? "current" : "pending",
      detail: receiptProof.observed
        ? "Issuer-backed receipt persisted for this authorization."
        : "Finish holder presentation to receive a signed receipt.",
      observed_at: receiptProof.at,
    },
    {
      id: "independent_verification_succeeded",
      label: "Server-side receipt verification succeeded",
      status: verifyProof.failed
        ? "failed"
        : verified
          ? "complete"
          : receiptProof.observed
            ? "current"
            : "pending",
      detail: verified
        ? "Integration telemetry recorded receipt_verification_succeeded for this tenant (server-side, not external SDK proof)."
        : "Verify the receipt on your server with the SDK; external independent verification is confirmed only on your infrastructure.",
      observed_at: verifyProof.at ?? input.health?.last_receipt_verified_at ?? null,
    },
  ];

  let needsAttentionReason: string | null = null;
  if (input.health?.status === "blocked") {
    needsAttentionReason = "Integration health is blocked. Review credential and callback status.";
  } else if (verifyProof.failed) {
    needsAttentionReason = "Recent receipt verification failed. Inspect partner-safe failure codes.";
  } else if (input.health?.status === "degraded") {
    needsAttentionReason = "Integration health is degraded. Review recent timeline events.";
  }

  let current: InstitutionalActivationMilestoneId = "sandbox_application_provisioned";
  for (const milestone of milestones) {
    if (milestone.status === "current" || milestone.status === "failed") {
      current = milestone.id;
      break;
    }
    if (milestone.status === "pending") {
      current = milestone.id;
      break;
    }
  }
  if (needsAttentionReason) {
    current = "needs_attention";
  }

  const createdMs = input.applicationCreatedAt ? new Date(input.applicationCreatedAt).getTime() : null;
  const verifyMs = verifyProof.at ? new Date(verifyProof.at).getTime() : null;
  const ttfv =
    createdMs != null && verifyMs != null && verifyMs >= createdMs ? verifyMs - createdMs : null;

  return {
    contract_version: "1.0.0",
    current_milestone_id: current,
    needs_attention_reason: needsAttentionReason,
    time_to_first_server_side_verify_ms: ttfv,
    time_to_first_server_side_verify_quality: ttfv != null ? "measured" : "unavailable",
    time_to_first_independent_verify_ms: null,
    time_to_first_independent_verify_quality: "unavailable",
    milestones,
  };
}
