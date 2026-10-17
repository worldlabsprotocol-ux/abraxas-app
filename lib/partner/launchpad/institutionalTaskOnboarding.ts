// FILE: lib/partner/launchpad/institutionalTaskOnboarding.ts
// Task-based institutional developer onboarding (6-step guided path).

import {
  INSTITUTIONAL_INTEGRATION_WORKSPACE_HREF,
  INSTITUTIONAL_SANDBOX_HANDOFF_HREF,
  INSTITUTIONAL_SANDBOX_LAUNCHPAD_HREF,
  INSTITUTIONAL_SANDBOX_POLICY_TEMPLATE_ID,
} from "@/lib/partner/launchpad/institutionalActivationEntry";
import type { InstitutionalActivationEvidence } from "@/lib/partner/launchpad/institutionalActivationMilestones";
import type { InstitutionalApplicationBinding } from "@/lib/partner/launchpad/institutionalIntegrationWorkspace";

export const INSTITUTIONAL_TASK_ONBOARDING_VERSION = "593.v1" as const;

export type InstitutionalTaskStepId =
  | "create_application"
  | "choose_verification"
  | "configure_policy"
  | "test_verification"
  | "view_receipt"
  | "production_activation";

export type InstitutionalTaskStepStatus =
  | "complete"
  | "current"
  | "blocked"
  | "pending";

export interface InstitutionalTaskStep {
  id: InstitutionalTaskStepId;
  order: number;
  title: string;
  detail: string;
  status: InstitutionalTaskStepStatus;
  action_href: string | null;
  action_label: string | null;
  recovery_hint: string | null;
}

export interface InstitutionalTaskOnboardingView {
  contract_version: typeof INSTITUTIONAL_TASK_ONBOARDING_VERSION;
  connect_your_application_heading: string;
  current_step_id: InstitutionalTaskStepId;
  steps: InstitutionalTaskStep[];
}

function milestoneComplete(
  activation: InstitutionalActivationEvidence | null,
  id: string,
): boolean {
  const row = activation?.milestones.find((m) => m.id === id);
  return row?.status === "complete";
}

export function deriveInstitutionalTaskOnboarding(input: {
  hasInstitutionalApplication: boolean;
  applicationId: string | null;
  binding: Pick<InstitutionalApplicationBinding, "policy_id" | "policy_template_id"> | null;
  activation: InstitutionalActivationEvidence | null;
  hostedVerificationHref: string | null;
}): InstitutionalTaskOnboardingView {
  const launchpadHref = input.applicationId
    ? `${INSTITUTIONAL_SANDBOX_LAUNCHPAD_HREF}&application=${encodeURIComponent(input.applicationId)}`
    : INSTITUTIONAL_SANDBOX_LAUNCHPAD_HREF;

  const workspaceHref = input.applicationId
    ? `${INSTITUTIONAL_INTEGRATION_WORKSPACE_HREF}?application=${encodeURIComponent(input.applicationId)}`
    : INSTITUTIONAL_INTEGRATION_WORKSPACE_HREF;

  const policyPinned =
    input.binding?.policy_template_id === INSTITUTIONAL_SANDBOX_POLICY_TEMPLATE_ID
    && input.binding?.policy_id === INSTITUTIONAL_SANDBOX_POLICY_TEMPLATE_ID;

  const configured = milestoneComplete(input.activation, "integration_configured");
  const credentials = milestoneComplete(input.activation, "credentials_generated");
  const connected = milestoneComplete(input.activation, "integration_connected");
  const hostedReady = milestoneComplete(input.activation, "hosted_verification_ready");
  const receiptIssued = milestoneComplete(input.activation, "signed_receipt_issued");

  const createComplete = input.hasInstitutionalApplication;
  const chooseComplete = createComplete && policyPinned;
  const configureComplete = chooseComplete && configured && credentials && connected;
  const testComplete = configureComplete && (hostedReady || receiptIssued);
  const receiptComplete = receiptIssued;

  const steps: Omit<InstitutionalTaskStep, "status">[] = [
    {
      id: "create_application",
      order: 1,
      title: "Create application",
      detail: "Name the sandbox app that will request verification.",
      action_href: launchpadHref,
      action_label: createComplete ? "Open Launchpad" : "Create app",
      recovery_hint: createComplete
        ? null
        : "Sign in to Launchpad and create an app with the institutional protocol access template.",
    },
    {
      id: "choose_verification",
      order: 2,
      title: "Choose verification",
      detail: "Select organization protocol access for signed decision receipts.",
      action_href: `${launchpadHref}&step=verify`,
      action_label: chooseComplete ? "Review" : "Choose",
      recovery_hint: chooseComplete
        ? null
        : "In Launchpad, select the institutional protocol access pack.",
    },
    {
      id: "configure_policy",
      order: 3,
      title: "Connect application",
      detail: "Add a callback URL and copy your sandbox API key.",
      action_href: `${launchpadHref}&step=connect`,
      action_label: configureComplete ? "Review" : "Connect",
      recovery_hint: configureComplete
        ? null
        : "Allowlist a return URL and save your API key before testing.",
    },
    {
      id: "test_verification",
      order: 4,
      title: "Test sandbox",
      detail: "Run a sandbox test or complete hosted holder verification.",
      action_href: `${launchpadHref}&step=test`,
      action_label: testComplete ? "Test again" : "Test",
      recovery_hint: testComplete
        ? null
        : input.hostedVerificationHref
          ? "Finish holder consent on hosted verification, or run Launchpad test with your callback URL."
          : "Finish connection settings, then test.",
    },
    {
      id: "view_receipt",
      order: 5,
      title: "View receipt",
      detail: "Inspect the signed receipt and integration events for this request.",
      action_href: workspaceHref,
      action_label: receiptComplete ? "View receipt" : "Open workspace",
      recovery_hint: receiptComplete
        ? null
        : "Save signed_record JSON from your callback or integration export after holder verification.",
    },
    {
      id: "production_activation",
      order: 6,
      title: "Request Production",
      detail: "Production credentials require operator approval after sandbox proof.",
      action_href: INSTITUTIONAL_SANDBOX_HANDOFF_HREF,
      action_label: "Production",
      recovery_hint:
        receiptComplete
          ? null
          : "Issue a sandbox receipt before requesting Production.",
    },
  ];

  function statusFor(complete: boolean, prerequisite: boolean): InstitutionalTaskStepStatus {
    if (complete) return "complete";
    if (!prerequisite) return "pending";
    return "current";
  }

  const withStatus: InstitutionalTaskStep[] = steps.map((step) => {
    let status: InstitutionalTaskStepStatus = "pending";
    switch (step.id) {
      case "create_application":
        status = createComplete ? "complete" : "current";
        break;
      case "choose_verification":
        status = chooseComplete ? "complete" : statusFor(false, createComplete);
        break;
      case "configure_policy":
        status = configureComplete ? "complete" : statusFor(false, chooseComplete);
        break;
      case "test_verification":
        status = testComplete ? "complete" : statusFor(false, configureComplete);
        break;
      case "view_receipt":
        status = receiptComplete ? "complete" : statusFor(false, testComplete);
        break;
      case "production_activation":
        status = receiptComplete ? "current" : "pending";
        break;
      default:
        status = "pending";
    }
    return { ...step, status };
  });

  const current =
    withStatus.find((s) => s.status === "current")
    ?? withStatus.find((s) => s.status === "blocked")
    ?? withStatus[withStatus.length - 1]!;

  return {
    contract_version: INSTITUTIONAL_TASK_ONBOARDING_VERSION,
    connect_your_application_heading: "Connect application",
    current_step_id: current.id,
    steps: withStatus,
  };
}
