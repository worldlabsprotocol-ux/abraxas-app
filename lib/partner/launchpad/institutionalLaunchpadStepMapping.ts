// FILE: lib/partner/launchpad/institutionalLaunchpadStepMapping.ts
// Maps six-step institutional onboarding to Launchpad wizard stages and operational milestones.

import type { InstitutionalActivationEvidence, InstitutionalActivationMilestoneId } from "@/lib/partner/launchpad/institutionalActivationMilestones";
import type { InstitutionalTaskStepId } from "@/lib/partner/launchpad/institutionalTaskOnboarding";
import type { IntegrationOperationalHealth } from "@/lib/partner/integrationObservability/health";

export type InstitutionalLaunchpadWizardStage =
  | "verify"
  | "test_app"
  | "connect"
  | "test"
  | "go_live";

const TASK_TO_WIZARD: Record<InstitutionalTaskStepId, InstitutionalLaunchpadWizardStage> = {
  create_application: "verify",
  choose_verification: "verify",
  configure_policy: "connect",
  test_verification: "test",
  view_receipt: "test",
  production_activation: "go_live",
};

const OPERATIONAL_TO_TASK: Partial<Record<InstitutionalActivationMilestoneId, InstitutionalTaskStepId>> = {
  sandbox_application_provisioned: "create_application",
  integration_configured: "configure_policy",
  credentials_generated: "configure_policy",
  integration_connected: "configure_policy",
  hosted_verification_ready: "test_verification",
  first_request_received: "test_verification",
  holder_consent_completed: "test_verification",
  signed_receipt_issued: "view_receipt",
  independent_verification_succeeded: "view_receipt",
  needs_attention: "configure_policy",
};

export function institutionalTaskStepToWizardStage(
  stepId: InstitutionalTaskStepId,
): InstitutionalLaunchpadWizardStage {
  return TASK_TO_WIZARD[stepId];
}

export function operationalMilestoneToTaskStep(
  milestoneId: InstitutionalActivationMilestoneId,
): InstitutionalTaskStepId | null {
  return OPERATIONAL_TO_TASK[milestoneId] ?? null;
}

export function summarizeOperationalMapping(activation: InstitutionalActivationEvidence | null): Array<{
  milestone_id: InstitutionalActivationMilestoneId;
  milestone_label: string;
  task_step_id: InstitutionalTaskStepId | null;
  status: string;
}> {
  if (!activation) return [];
  return activation.milestones.map((m) => ({
    milestone_id: m.id,
    milestone_label: m.label,
    task_step_id: operationalMilestoneToTaskStep(m.id),
    status: m.status,
  }));
}

/** User-facing blocker — not onboarding incompleteness disguised as infrastructure failure. */
export function deriveInstitutionalLaunchpadBlocker(input: {
  health: Pick<IntegrationOperationalHealth, "status" | "verification_failures" | "verification_attempts"> | null;
  activation: InstitutionalActivationEvidence | null;
  onboardingCompleteThroughTest: boolean;
}): { message: string; recovery_label: string; recovery_href: string | null } | null {
  const activationReason = input.activation?.needs_attention_reason?.trim();
  if (activationReason && !activationReason.toLowerCase().includes("degraded")) {
    return {
      message: activationReason,
      recovery_label: "Review operations",
      recovery_href: null,
    };
  }

  if (input.health?.status === "blocked") {
    return {
      message: "Integration is blocked. Check credentials and callback configuration.",
      recovery_label: "Open connect step",
      recovery_href: null,
    };
  }

  if ((input.health?.verification_failures ?? 0) > 0) {
    return {
      message: "A recent receipt verification failed. Review the timeline in Partner operations.",
      recovery_label: "View operations",
      recovery_href: null,
    };
  }

  if (input.health?.status === "degraded" && input.onboardingCompleteThroughTest) {
    return {
      message: "Integration telemetry reports degraded status. Review recent events in Partner operations.",
      recovery_label: "View operations",
      recovery_href: null,
    };
  }

  return null;
}
