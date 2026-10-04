// FILE: lib/partner/launchpad/firstSuccessUx.test.ts

import { describe, expect, it } from "vitest";
import { resolveLaunchpadJourneyState } from "@/lib/partner/launchpad/journeyState";
import {
  deriveLaunchpadFirstSuccess,
  humanIntegrationEventLabel,
} from "@/lib/partner/launchpad/firstSuccessUx";

describe("firstSuccessUx", () => {
  it("humanizes integration event labels", () => {
    expect(humanIntegrationEventLabel("receipt_verification_succeeded")).toBe("Result verified on your server");
    expect(humanIntegrationEventLabel("custom_event")).toBe("custom event");
  });

  it("prioritizes server verification after holder callback", () => {
    const journey = resolveLaunchpadJourneyState({
      application: {
        id: "app-1",
        status: "active",
        environment: "sandbox",
        policy_template_id: "identity_liveness",
        policy_id: "demo-identity_liveness-v1",
        integration_status: "ready",
        allowed_return_urls: ["https://app.example/callback"],
        key_prefix: "abx_test_",
      },
      configuredPolicyCount: 1,
      verifiedReceiptCount: 0,
      activeSandboxKey: true,
      starterKitEvidenced: true,
    });
    const view = deriveLaunchpadFirstSuccess({
      journey,
      evidence: {
        verified_receipt_count: 0,
        starter_kit_evidenced: true,
        active_sandbox_key: true,
        hosted_handoff_completed_count: 1,
      },
      callbackUrls: ["https://app.example/callback"],
      productionActivated: false,
    });
    expect(view.primaryLabel).toContain("Verify the result on your server");
    expect(view.showCallbackEducation).toBe(true);
    expect(view.whyItMatters).toContain("Callbacks tell you");
  });

  it("shows reuse and production transition after sandbox success", () => {
    const journey = resolveLaunchpadJourneyState({
      application: {
        id: "app-1",
        status: "active",
        environment: "sandbox",
        policy_template_id: "identity_liveness",
        policy_id: "demo-identity_liveness-v1",
        integration_status: "ready",
        allowed_return_urls: ["https://app.example/callback"],
        key_prefix: "abx_test_",
      },
      configuredPolicyCount: 1,
      verifiedReceiptCount: 1,
      activeSandboxKey: true,
      starterKitEvidenced: true,
    });
    const view = deriveLaunchpadFirstSuccess({
      journey,
      evidence: {
        verified_receipt_count: 1,
        starter_kit_evidenced: true,
        active_sandbox_key: true,
        receipt_verification_succeeded_count: 1,
      },
      callbackUrls: ["https://app.example/callback"],
      productionActivated: false,
    });
    expect(view.showServerVerificationSuccess).toBe(true);
    expect(view.showReuseDiscovery).toBe(true);
    expect(view.showProductionTransition).toBe(true);
  });
});
