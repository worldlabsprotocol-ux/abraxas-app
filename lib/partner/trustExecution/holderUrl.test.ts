import { describe, expect, it } from "vitest";
import { buildHolderTrustExecutionUrl } from "./holderUrl";

describe("holder trust-execution URL", () => {
  it("preserves the default auto-continue behavior", () => {
    expect(buildHolderTrustExecutionUrl({
      origin: "https://abraxas.test",
      challengeId: "challenge 1",
    })).toBe("https://abraxas.test/partner/trust-execution?challenge_id=challenge+1");
  });

  it("lets Integration Studio defer execution until it can inspect the result", () => {
    expect(buildHolderTrustExecutionUrl({
      origin: "https://abraxas.test",
      challengeId: "challenge-1",
      deferExecution: true,
    })).toBe("https://abraxas.test/partner/trust-execution?challenge_id=challenge-1&defer_execution=1");
  });
});
