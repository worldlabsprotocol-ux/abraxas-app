// FILE: lib/partner/launchpad/institutionalLaunchpadStepMapping.test.ts

import { describe, expect, it } from "vitest";
import { buildInstitutionalActivationEvidence } from "@/lib/partner/launchpad/institutionalActivationMilestones";
import {
  deriveInstitutionalLaunchpadBlocker,
  institutionalTaskStepToWizardStage,
  operationalMilestoneToTaskStep,
} from "@/lib/partner/launchpad/institutionalLaunchpadStepMapping";

describe("institutionalLaunchpadStepMapping", () => {
  it("maps task steps to wizard stages", () => {
    expect(institutionalTaskStepToWizardStage("configure_policy")).toBe("connect");
    expect(institutionalTaskStepToWizardStage("test_verification")).toBe("test");
    expect(institutionalTaskStepToWizardStage("production_activation")).toBe("go_live");
  });

  it("maps operational milestones to developer task steps", () => {
    expect(operationalMilestoneToTaskStep("signed_receipt_issued")).toBe("view_receipt");
    expect(operationalMilestoneToTaskStep("integration_connected")).toBe("configure_policy");
  });

  it("does not surface degraded health as blocker during early onboarding", () => {
    const activation = buildInstitutionalActivationEvidence({
      applicationCreatedAt: "2026-01-01T00:00:00.000Z",
      journey: null,
      health: { status: "degraded", verification_failures: 0, verification_attempts: 0 } as never,
      activeSandboxKey: true,
      starterKitEvidenced: false,
      callbackConfigured: true,
    });
    expect(activation.needs_attention_reason).toBeNull();
    const blocker = deriveInstitutionalLaunchpadBlocker({
      health: { status: "degraded", verification_failures: 0 } as never,
      activation,
      onboardingCompleteThroughTest: false,
    });
    expect(blocker).toBeNull();
  });

  it("surfaces verification failures as actionable blockers", () => {
    const blocker = deriveInstitutionalLaunchpadBlocker({
      health: { status: "degraded", verification_failures: 2 } as never,
      activation: null,
      onboardingCompleteThroughTest: true,
    });
    expect(blocker?.message).toMatch(/verification failed/i);
  });
});
