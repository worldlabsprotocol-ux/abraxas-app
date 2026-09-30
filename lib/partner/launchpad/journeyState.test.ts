// FILE: lib/partner/launchpad/journeyState.test.ts

import { describe, expect, it } from "vitest";
import {
  isConnectComplete,
  isTestComplete,
  mapLegacyLaunchpadStep,
  merchantPolicySubtitle,
  resolveLaunchpadJourneyState,
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
    expect(journey.primaryAction.cta).toBe("Connect website");
    expect(journey.primaryAction.label).toContain("Good Trouble");
    expect(journey.verificationLabel).toBe("Waiting for your first test");
    expect(journey.environmentLabel).toBe("Sandbox");
  });

  it("blocks test until connect is complete", () => {
    const journey = resolveLaunchpadJourneyState(baseInput({
      starterKitEvidenced: false,
      application: {
        ...baseInput().application,
        integration_status: "pending",
      },
    }));
    expect(journey.testAvailable).toBe(false);
    const testStage = journey.stages.find((stage) => stage.id === "test");
    expect(testStage?.status).toBe("blocked");
    expect(testStage?.detail).toContain("Connect your website first");
  });

  it("enables test after starter kit evidence", () => {
    const journey = resolveLaunchpadJourneyState(baseInput({ starterKitEvidenced: true }));
    expect(journey.testAvailable).toBe(true);
    expect(journey.currentStage).toBe("test");
    expect(journey.primaryAction.cta).toBe("Run test verification");
  });

  it("shows success state after verified receipt", () => {
    const journey = resolveLaunchpadJourneyState(baseInput({
      starterKitEvidenced: true,
      verifiedReceiptCount: 1,
    }));
    expect(journey.testPassed).toBe(true);
    expect(journey.currentStage).toBe("go_live");
    expect(journey.primaryAction.cta).toBe("Prepare to go live");
    expect(journey.privacySummary?.shared[0]).toContain("age_eligible_21");
    expect(journey.privacySummary?.withheld.join(" ").toLowerCase()).toContain("date of birth");
  });

  it("maps legacy wizard steps to merchant stages", () => {
    expect(mapLegacyLaunchpadStep("test")).toBe("test");
    expect(mapLegacyLaunchpadStep("configure")).toBe("connect");
    expect(mapLegacyLaunchpadStep("production")).toBe("go_live");
  });
});

describe("journey completion helpers", () => {
  it("treats starter kit or verified receipts as connected", () => {
    expect(isConnectComplete(baseInput({ starterKitEvidenced: true }))).toBe(true);
    expect(isConnectComplete(baseInput({ verifiedReceiptCount: 1 }))).toBe(true);
    expect(isConnectComplete(baseInput({
      starterKitEvidenced: false,
      verifiedReceiptCount: 0,
    }))).toBe(false);
  });

  it("accepts harness pass or verified receipts as test complete", () => {
    expect(isTestComplete(baseInput({ verifiedReceiptCount: 1 }))).toBe(true);
    expect(isTestComplete(baseInput({ harnessPassed: true }))).toBe(true);
    expect(isTestComplete(baseInput())).toBe(false);
  });

  it("formats merchant policy subtitles", () => {
    expect(merchantPolicySubtitle("age_21_retail")).toBe("Private 21+ verification");
  });
});
