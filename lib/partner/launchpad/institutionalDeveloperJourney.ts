// FILE: lib/partner/launchpad/institutionalDeveloperJourney.ts
// Canonical external institutional developer progression (task-based onboarding).

import {
  INSTITUTIONAL_INTEGRATION_WORKSPACE_HREF,
  INSTITUTIONAL_SANDBOX_LAUNCHPAD_HREF,
  INSTITUTIONAL_INDEPENDENT_VERIFIER_HREF,
  INSTITUTIONAL_SANDBOX_HANDOFF_HREF,
} from "@/lib/partner/launchpad/institutionalActivationEntry";
import type { InstitutionalTaskStepId } from "@/lib/partner/launchpad/institutionalTaskOnboarding";

export const INSTITUTIONAL_DEVELOPER_JOURNEY_VERSION = "593.v1" as const;

export type InstitutionalDeveloperJourneyStepId = InstitutionalTaskStepId;

export interface InstitutionalDeveloperJourneyStep {
  id: InstitutionalDeveloperJourneyStepId;
  order: number;
  title: string;
  detail: string;
  href: string;
  action_label: string;
}

export const INSTITUTIONAL_JOURNEY_SCOPE_NOTICE =
  "Institutional protocol access and signed receipts. Commerce Partner Flow is a separate path." as const;

export const INSTITUTIONAL_DEVELOPER_JOURNEY_STEPS: InstitutionalDeveloperJourneyStep[] = [
  {
    id: "create_application",
    order: 1,
    title: "Create application",
    detail: "Create or select your sandbox application in Launchpad.",
    href: INSTITUTIONAL_SANDBOX_LAUNCHPAD_HREF,
    action_label: "Launchpad",
  },
  {
    id: "choose_verification",
    order: 2,
    title: "Choose verification",
    detail: "Select organization protocol access for this integration.",
    href: `${INSTITUTIONAL_SANDBOX_LAUNCHPAD_HREF}&step=verify`,
    action_label: "Verify",
  },
  {
    id: "configure_policy",
    order: 3,
    title: "Connect application",
    detail: "Add callbacks and sandbox credentials.",
    href: `${INSTITUTIONAL_SANDBOX_LAUNCHPAD_HREF}&step=connect`,
    action_label: "Connect",
  },
  {
    id: "test_verification",
    order: 4,
    title: "Test sandbox",
    detail: "Run tests and complete holder verification.",
    href: `${INSTITUTIONAL_SANDBOX_LAUNCHPAD_HREF}&step=test`,
    action_label: "Test",
  },
  {
    id: "view_receipt",
    order: 5,
    title: "View receipt",
    detail: "Review the signed receipt and integration activity.",
    href: INSTITUTIONAL_INTEGRATION_WORKSPACE_HREF,
    action_label: "Workspace",
  },
  {
    id: "production_activation",
    order: 6,
    title: "Request Production",
    detail: "Submit sandbox evidence for Production authorization.",
    href: INSTITUTIONAL_SANDBOX_HANDOFF_HREF,
    action_label: "Production",
  },
];

export function institutionalDeveloperJourneyStep(id: InstitutionalDeveloperJourneyStepId): InstitutionalDeveloperJourneyStep {
  const step = INSTITUTIONAL_DEVELOPER_JOURNEY_STEPS.find((row) => row.id === id);
  if (!step) throw new Error(`unknown_journey_step:${id}`);
  return step;
}

/** Deep-link institutional verifier reference (advanced, not a guided step). */
export const INSTITUTIONAL_INDEPENDENT_VERIFIER_STEP_HREF = INSTITUTIONAL_INDEPENDENT_VERIFIER_HREF;
