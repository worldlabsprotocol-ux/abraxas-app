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

/** Institutional protocol verification — not age-gated Partner Flow commerce. */
export const INSTITUTIONAL_JOURNEY_SCOPE_NOTICE =
  "This sequence is for institutional protocol access and signed decision receipts. Age-gated commerce Partner Flow remains a separate integration path." as const;

export const INSTITUTIONAL_DEVELOPER_JOURNEY_STEPS: InstitutionalDeveloperJourneyStep[] = [
  {
    id: "create_application",
    order: 1,
    title: "Create your application",
    detail: "Provision or select a Launchpad sandbox application for your authorized partner tenant.",
    href: INSTITUTIONAL_SANDBOX_LAUNCHPAD_HREF,
    action_label: "Partner Launchpad",
  },
  {
    id: "choose_verification",
    order: 2,
    title: "Choose what to verify",
    detail:
      "Select organization protocol access for institutional receipts, or use advanced eligibility policies only when authorized for your tenant.",
    href: `${INSTITUTIONAL_SANDBOX_LAUNCHPAD_HREF}&step=verify`,
    action_label: "Verification requirements",
  },
  {
    id: "configure_policy",
    order: 3,
    title: "Connect your application",
    detail: "Allowlist callbacks, issue sandbox credentials, and confirm policy binding for this application.",
    href: `${INSTITUTIONAL_SANDBOX_LAUNCHPAD_HREF}&step=connect`,
    action_label: "Connection settings",
  },
  {
    id: "test_verification",
    order: 4,
    title: "Test verification",
    detail: "Run sandbox tests and complete hosted holder verification to obtain an authorized signed receipt.",
    href: `${INSTITUTIONAL_SANDBOX_LAUNCHPAD_HREF}&step=test`,
    action_label: "Sandbox testing",
  },
  {
    id: "view_receipt",
    order: 5,
    title: "View decision receipt",
    detail: "Inspect signed receipt evidence, integration export events, and SDK inspection guidance.",
    href: INSTITUTIONAL_INTEGRATION_WORKSPACE_HREF,
    action_label: "Integration workspace",
  },
  {
    id: "production_activation",
    order: 6,
    title: "Request Production activation",
    detail:
      "Review verification evidence and request Production authorization — explicit operator approval required.",
    href: INSTITUTIONAL_SANDBOX_HANDOFF_HREF,
    action_label: "Production handoff",
  },
];

export function institutionalDeveloperJourneyStep(id: InstitutionalDeveloperJourneyStepId): InstitutionalDeveloperJourneyStep {
  const step = INSTITUTIONAL_DEVELOPER_JOURNEY_STEPS.find((row) => row.id === id);
  if (!step) throw new Error(`unknown_journey_step:${id}`);
  return step;
}

/** Deep-link institutional verifier reference (advanced, not a guided step). */
export const INSTITUTIONAL_INDEPENDENT_VERIFIER_STEP_HREF = INSTITUTIONAL_INDEPENDENT_VERIFIER_HREF;
