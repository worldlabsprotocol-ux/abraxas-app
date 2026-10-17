// FILE: lib/partner/launchpad/institutionalTaskOnboarding.test.ts

import { describe, expect, it } from "vitest";
import { buildInstitutionalActivationEvidence } from "@/lib/partner/launchpad/institutionalActivationMilestones";
import { deriveInstitutionalTaskOnboarding } from "@/lib/partner/launchpad/institutionalTaskOnboarding";

describe("institutionalTaskOnboarding", () => {
  const binding = {
    policy_id: "sandbox_institutional_protocol_access",
    policy_template_id: "sandbox_institutional_protocol_access",
  };

  it("starts at create_application when no institutional app exists", () => {
    const view = deriveInstitutionalTaskOnboarding({
      hasInstitutionalApplication: false,
      applicationId: null,
      binding: null,
      activation: null,
      hostedVerificationHref: null,
    });
    expect(view.current_step_id).toBe("create_application");
    expect(view.steps[0]?.status).toBe("current");
  });

  it("advances to choose_verification after application exists without pinned policy", () => {
    const view = deriveInstitutionalTaskOnboarding({
      hasInstitutionalApplication: true,
      applicationId: "app-1",
      binding: { ...binding, policy_id: "other", policy_template_id: "other" },
      activation: null,
      hostedVerificationHref: "https://example.com/partner/verify?app=acme",
    });
    expect(view.current_step_id).toBe("choose_verification");
    expect(view.steps.find((s) => s.id === "create_application")?.status).toBe("complete");
  });

  it("surfaces configure_policy as current when policy is pinned but callbacks incomplete", () => {
    const activation = buildInstitutionalActivationEvidence({
      applicationCreatedAt: "2026-01-01T00:00:00.000Z",
      journey: null,
      health: null,
      activeSandboxKey: false,
      starterKitEvidenced: false,
      callbackConfigured: false,
    });
    const view = deriveInstitutionalTaskOnboarding({
      hasInstitutionalApplication: true,
      applicationId: "app-1",
      binding,
      activation,
      hostedVerificationHref: "https://example.com/partner/verify?app=acme",
    });
    expect(view.steps.find((s) => s.id === "choose_verification")?.status).toBe("complete");
    expect(view.current_step_id).toBe("configure_policy");
    expect(view.connect_your_application_heading).toBe("Connect application");
  });
});
