// FILE: lib/partner/launchpad/journeyState.test.ts

import { describe, expect, it } from "vitest";
import {
  isConnectComplete,
  isStageNavigable,
  isTestComplete,
  mapLegacyLaunchpadStep,
  merchantPolicySubtitle,
  resolveLaunchpadJourneyState,
  stageNavigationTarget,
  type LaunchpadJourneyInput,
} from "@/lib/partner/launchpad/journeyState";

function baseInput(overrides: Partial<LaunchpadJourneyInput> = {}): LaunchpadJourneyInput {
  return {
    application: {
      id: "app-1",
      status: "active",
      environment: "sandbox",
      policy_template_id: "age_21_retail",
      policy_id: "good-trouble-age_21_retail-v1",
      integration_status: "ready",
      allowed_return_urls: ["https://www.goodtroublecanna.com/age-verification-result"],
      key_prefix: "abx_test_",
      display_name: "Good Trouble",
      application_name: "Good Trouble",
    },
    configuredPolicyCount: 1,
    verifiedReceiptCount: 0,
    activeSandboxKey: true,
    starterKitEvidenced: false,
    ...overrides,
  };
}

describe("resolveLaunchpadJourneyState", () => {
  it("places freshly provisioned Good Trouble at Connect with one primary action", () => {
    const journey = resolveLaunchpadJourneyState(baseInput());
    expect(journey.currentStage).toBe("connect");
    expect(journey.completedCount).toBe(2);
    expect(journey.connectComplete).toBe(false);
    expect(journey.primaryAction.cta).toBe("Connect website");
    expect(journey.primaryAction.label).toContain("Good Trouble");
    expect(journey.verificationLabel).toBe("Waiting for your first test");
  });

  it("does not mark connect complete when only starter kit is generated", () => {
    const journey = resolveLaunchpadJourneyState(baseInput({ starterKitEvidenced: true }));
    expect(journey.connectComplete).toBe(false);
    expect(journey.integrationFilesReady).toBe(true);
    expect(journey.currentStage).toBe("connect");
    expect(journey.testPassed).toBe(false);
    expect(journey.primaryAction.label).toBe("Integration files ready");
    expect(journey.stages.find((stage) => stage.id === "connect")?.detail)
      .toContain("Integration files ready");
    expect(journey.stages.find((stage) => stage.id === "test")?.status).toBe("current");
  });

  it("blocks test navigation until integration files exist", () => {
    const journey = resolveLaunchpadJourneyState(baseInput());
    const testStage = journey.stages.find((stage) => stage.id === "test");
    expect(testStage?.status).toBe("blocked");
    expect(testStage?.navigable).toBe(false);
    expect(stageNavigationTarget("test", baseInput())).toBe("connect");
  });

  it("enables first test after integration files without marking connect complete", () => {
    const input = baseInput({ starterKitEvidenced: true });
    const journey = resolveLaunchpadJourneyState(input);
    expect(journey.testAvailable).toBe(true);
    expect(journey.connectComplete).toBe(false);
    expect(isStageNavigable("test", input)).toBe(true);
  });

  it("marks connect and test complete after verified receipt", () => {
    const journey = resolveLaunchpadJourneyState(baseInput({
      starterKitEvidenced: true,
      verifiedReceiptCount: 1,
    }));
    expect(journey.connectComplete).toBe(true);
    expect(journey.testPassed).toBe(true);
    expect(journey.currentStage).toBe("go_live");
    expect(journey.completedCount).toBe(4);
    expect(journey.primaryAction.cta).toBe("Prepare to go live");
  });

  it("maps legacy wizard steps to merchant stages", () => {
    expect(mapLegacyLaunchpadStep("test")).toBe("test");
    expect(mapLegacyLaunchpadStep("configure")).toBe("connect");
    expect(mapLegacyLaunchpadStep("production")).toBe("go_live");
  });
});

describe("journey completion helpers", () => {
  it("requires verified receipts for connect and test completion", () => {
    expect(isConnectComplete(baseInput({ starterKitEvidenced: true }))).toBe(false);
    expect(isConnectComplete(baseInput({ verifiedReceiptCount: 1 }))).toBe(true);
    expect(isTestComplete(baseInput({ starterKitEvidenced: true }))).toBe(false);
    expect(isTestComplete(baseInput({ verifiedReceiptCount: 1 }))).toBe(true);
  });

  it("formats merchant policy subtitles", () => {
    expect(merchantPolicySubtitle("age_21_retail")).toBe("Private 21+ verification");
  });
});

describe("canonical journey input agreement", () => {
  it("produces identical progress for card and main journey using same input", () => {
    const input = baseInput({ starterKitEvidenced: true });
    const first = resolveLaunchpadJourneyState(input);
    const second = resolveLaunchpadJourneyState(input);
    expect(first.completedCount).toBe(second.completedCount);
    expect(first.currentStage).toBe(second.currentStage);
    expect(first.connectComplete).toBe(second.connectComplete);
    expect(first.testAvailable).toBe(second.testAvailable);
  });
});
