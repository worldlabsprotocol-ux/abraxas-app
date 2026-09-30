// FILE: lib/partner/launchpad/journeyState.ts
// Merchant-facing Launchpad journey derived from authoritative backend state.

import { buildPolicyPresentationFromTemplateId } from "@/lib/partner/launchpad/policyPresentation";
import { validateLaunchpadReturnUrl } from "@/lib/partner/launchpad/returnUrl";
import type { StarterKitPlatform } from "@/lib/partner/starterKit/contract";

export type MerchantJourneyStageId = "verify" | "test_app" | "connect" | "test" | "go_live";

export type LaunchpadJourneyStateId =
  | "policy_selected"
  | "sandbox_created"
  | "connection_required"
  | "connection_in_progress"
  | "ready_to_test"
  | "test_passed"
  | "production_review_required"
  | "production_ready"
  | "live";

export type MerchantJourneyStageStatus = "complete" | "current" | "pending" | "blocked";

export interface LaunchpadJourneyApplication {
  id: string;
  status: string;
  environment: string;
  policy_template_id: string;
  policy_id: string;
  integration_status: string;
  allowed_return_urls: string[];
  key_prefix: string | null;
  display_name?: string;
  application_name?: string;
  public_slug?: string;
  partner_id?: string;
}

export interface LaunchpadJourneyInput {
  application: LaunchpadJourneyApplication;
  configuredPolicyCount: number;
  verifiedReceiptCount: number;
  activeSandboxKey: boolean;
  starterKitEvidenced: boolean;
  starterKitPlatform?: StarterKitPlatform | null;
  harnessPassed?: boolean;
  productionActivated?: boolean;
  productionRequestPending?: boolean;
  productionRequestApproved?: boolean;
}

export interface MerchantJourneyStage {
  id: MerchantJourneyStageId;
  label: string;
  status: MerchantJourneyStageStatus;
  detail?: string;
}

export interface LaunchpadJourneyResolution {
  state: LaunchpadJourneyStateId;
  stages: MerchantJourneyStage[];
  completedCount: number;
  totalStages: number;
  currentStage: MerchantJourneyStageId;
  primaryAction: {
    label: string;
    detail: string;
    cta: string;
    stage: MerchantJourneyStageId;
    enabled: boolean;
    blockedReason?: string;
  };
  statusLine: string;
  environmentLabel: string;
  verificationLabel: string;
  testAvailable: boolean;
  testPassed: boolean;
  privacySummary?: {
    shared: string[];
    withheld: string[];
  };
  goLiveChecklist: Array<{ id: string; label: string; complete: boolean }>;
}

const STAGE_ORDER: MerchantJourneyStageId[] = [
  "verify",
  "test_app",
  "connect",
  "test",
  "go_live",
];

const STAGE_LABELS: Record<MerchantJourneyStageId, string> = {
  verify: "Verify",
  test_app: "Test app",
  connect: "Connect",
  test: "Test",
  go_live: "Go live",
};

export function callbackConfigured(urls: string[]): boolean {
  return urls.length > 0 && urls.every((url) => validateLaunchpadReturnUrl(url).ok);
}

export function isVerifyComplete(input: LaunchpadJourneyInput): boolean {
  return input.configuredPolicyCount > 0 && Boolean(input.application.policy_template_id);
}

export function isTestAppComplete(input: LaunchpadJourneyInput): boolean {
  return input.application.status === "active"
    && input.application.environment === "sandbox"
    && input.activeSandboxKey;
}

export function isConnectComplete(input: LaunchpadJourneyInput): boolean {
  // Website connection is evidenced by starter-kit generation or a verified sandbox receipt.
  // Application "integration ready" only means the Abraxas sandbox app is active.
  if (input.starterKitEvidenced) return true;
  return input.verifiedReceiptCount > 0;
}

export function isTestComplete(input: LaunchpadJourneyInput): boolean {
  return input.verifiedReceiptCount > 0 || Boolean(input.harnessPassed);
}

export function isGoLiveComplete(input: LaunchpadJourneyInput): boolean {
  return Boolean(input.productionActivated) || input.application.environment === "production";
}

function resolveStateId(input: LaunchpadJourneyInput): LaunchpadJourneyStateId {
  if (isGoLiveComplete(input)) return "live";
  if (isTestComplete(input)) {
    if (input.productionRequestApproved) return "production_ready";
    if (input.productionRequestPending) return "production_review_required";
    return "test_passed";
  }
  if (isConnectComplete(input)) return "ready_to_test";
  if (input.starterKitEvidenced || callbackConfigured(input.application.allowed_return_urls)) {
    return "connection_in_progress";
  }
  if (isTestAppComplete(input)) return "connection_required";
  if (isVerifyComplete(input)) return "sandbox_created";
  return "policy_selected";
}

function buildStages(input: LaunchpadJourneyInput): MerchantJourneyStage[] {
  const completion = {
    verify: isVerifyComplete(input),
    test_app: isTestAppComplete(input),
    connect: isConnectComplete(input),
    test: isTestComplete(input),
    go_live: isGoLiveComplete(input),
  };

  const firstIncomplete = STAGE_ORDER.find((stage) => !completion[stage]) ?? "go_live";

  return STAGE_ORDER.map((id) => {
    let status: MerchantJourneyStageStatus = "pending";
    if (completion[id]) status = "complete";
    else if (!completion.connect && STAGE_ORDER.indexOf(id) > STAGE_ORDER.indexOf("connect")) {
      status = "blocked";
    } else if (id === firstIncomplete) {
      status = "current";
    }
    return {
      id,
      label: STAGE_LABELS[id],
      status,
      detail: stageDetail(id, input, completion),
    };
  });
}

function stageDetail(
  stage: MerchantJourneyStageId,
  input: LaunchpadJourneyInput,
  completion: Record<MerchantJourneyStageId, boolean>,
): string | undefined {
  const appName = input.application.display_name || input.application.application_name || "your app";
  switch (stage) {
    case "verify":
      return completion.verify ? "Verification requirement selected" : "Choose what customers must prove";
    case "test_app":
      return completion.test_app ? "Private sandbox environment ready" : "Create your test application";
    case "connect":
      return completion.connect
        ? "Website integration configured"
        : `Connect Abraxas to ${appName}`;
    case "test":
      if (!completion.connect) return "Connect your website first";
      return completion.test ? "Test verification passed" : "Run a customer verification";
    case "go_live":
      return completion.go_live ? "Production active" : "Activate production when ready";
    default:
      return undefined;
  }
}

function merchantVerificationLabel(input: LaunchpadJourneyInput): string {
  if (!isConnectComplete(input) && !isTestComplete(input)) {
    return "Waiting for your first test";
  }
  if (isTestComplete(input)) return "Test passed";
  if (isConnectComplete(input)) return "Ready to test";
  return "Connect your website";
}

function environmentLabel(input: LaunchpadJourneyInput): string {
  if (isGoLiveComplete(input)) return "Live";
  return "Sandbox";
}

function buildPrimaryAction(
  input: LaunchpadJourneyInput,
  stages: MerchantJourneyStage[],
): LaunchpadJourneyResolution["primaryAction"] {
  const appName = input.application.display_name || input.application.application_name || "your app";
  const current = stages.find((stage) => stage.status === "current" || stage.status === "blocked")
    ?? stages[stages.length - 1];

  switch (current.id) {
    case "verify":
      return {
        label: "Choose what to verify",
        detail: "Select the eligibility question your customers must answer.",
        cta: "Choose verification",
        stage: "verify",
        enabled: true,
      };
    case "test_app":
      return {
        label: "Create your test app",
        detail: "Abraxas creates a private sandbox where you can integrate safely.",
        cta: "Create test app",
        stage: "test_app",
        enabled: true,
      };
    case "connect":
      return {
        label: `Connect ${appName}`,
        detail: `Add Abraxas to your website so customers can complete a private verification. ${appName} receives the eligibility result, not identity documents or date of birth.`,
        cta: "Connect website",
        stage: "connect",
        enabled: true,
      };
    case "test":
      if (!isConnectComplete(input)) {
        return {
          label: "Connect your website first",
          detail: "Finish connecting Abraxas before running a test verification.",
          cta: "Connect website",
          stage: "connect",
          enabled: true,
          blockedReason: "connection_required",
        };
      }
      return {
        label: "Run a test verification",
        detail: "Confirm the customer experience works and you receive the expected eligibility result.",
        cta: "Run test verification",
        stage: "test",
        enabled: true,
      };
    case "go_live":
      if (input.productionRequestPending) {
        return {
          label: "Production access under review",
          detail: "Abraxas is reviewing your production access request. Activation stays a reviewer decision.",
          cta: "View go-live status",
          stage: "go_live",
          enabled: true,
        };
      }
      return {
        label: "Prepare to go live",
        detail: "Complete the readiness checklist, then request production access when your integration is ready.",
        cta: "Prepare to go live",
        stage: "go_live",
        enabled: true,
      };
    default:
      return {
        label: "Continue setup",
        detail: "Follow the guided steps to finish your integration.",
        cta: "Continue",
        stage: current.id,
        enabled: true,
      };
  }
}

function buildPrivacySummary(input: LaunchpadJourneyInput): LaunchpadJourneyResolution["privacySummary"] {
  const presentation = buildPolicyPresentationFromTemplateId(input.application.policy_template_id);
  if (!presentation) return undefined;
  return {
    shared: [presentation.partner_receives],
    withheld: presentation.partner_does_not_receive.slice(0, 4),
  };
}

function buildGoLiveChecklist(input: LaunchpadJourneyInput): LaunchpadJourneyResolution["goLiveChecklist"] {
  return [
    { id: "website_connected", label: "Website connected", complete: isConnectComplete(input) },
    { id: "test_passed", label: "Test verification passed", complete: isTestComplete(input) },
    {
      id: "return_destination",
      label: "Return destination confirmed",
      complete: callbackConfigured(input.application.allowed_return_urls),
    },
    {
      id: "production_review",
      label: "Production access reviewed",
      complete: Boolean(input.productionRequestApproved || input.productionRequestPending),
    },
    {
      id: "live_credential",
      label: "Live credential ready",
      complete: Boolean(input.productionActivated),
    },
  ];
}

export function resolveLaunchpadJourneyState(input: LaunchpadJourneyInput): LaunchpadJourneyResolution {
  const stages = buildStages(input);
  const completedCount = stages.filter((stage) => stage.status === "complete").length;
  const currentStage = stages.find((stage) => stage.status === "current" || stage.status === "blocked")?.id
    ?? "go_live";

  return {
    state: resolveStateId(input),
    stages,
    completedCount,
    totalStages: STAGE_ORDER.length,
    currentStage,
    primaryAction: buildPrimaryAction(input, stages),
    statusLine: merchantVerificationLabel(input),
    environmentLabel: environmentLabel(input),
    verificationLabel: merchantVerificationLabel(input),
    testAvailable: isConnectComplete(input),
    testPassed: isTestComplete(input),
    privacySummary: isTestComplete(input) ? buildPrivacySummary(input) : undefined,
    goLiveChecklist: buildGoLiveChecklist(input),
  };
}

export function merchantPolicySubtitle(templateId: string): string {
  if (templateId.includes("age_21")) return "Private 21+ verification";
  if (templateId.includes("age_18")) return "Private 18+ verification";
  if (templateId.includes("residency")) return "Private residency verification";
  const presentation = buildPolicyPresentationFromTemplateId(templateId);
  return presentation?.title ?? templateId.replace(/_/g, " ");
}

export function mapLegacyLaunchpadStep(step: string): MerchantJourneyStageId {
  switch (step) {
    case "application":
    case "policy":
      return "verify";
    case "destinations":
    case "provisioned":
      return "test_app";
    case "configure":
    case "versions":
    case "networks":
      return "connect";
    case "test":
    case "readiness":
      return "test";
    case "production":
      return "go_live";
    default:
      return "connect";
  }
}
