import { describe, expect, it } from "vitest";
import { GUIDED_INTEGRATION_JOURNEY, guidedJourneyProgressLabel } from "./guidedIntegrationJourney";

describe("guidedIntegrationJourney", () => {
  it("defines five meaningful milestones", () => {
    expect(GUIDED_INTEGRATION_JOURNEY).toHaveLength(5);
    expect(GUIDED_INTEGRATION_JOURNEY[0]?.id).toBe("prove_wallet_control");
  });

  it("formats progress labels", () => {
    expect(guidedJourneyProgressLabel(2)).toBe("2 of 5");
    expect(guidedJourneyProgressLabel(99)).toBe("5 of 5");
  });
});
