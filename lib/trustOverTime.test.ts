import { describe, expect, it } from "vitest";
import {
  TRUST_IS_TIME_BOUND_HEADLINE,
  REAL_ESTATE_REFRESH_TRIGGERS,
  TRUST_OVER_TIME_VERIFY,
  TRUST_FAIL_CLOSED,
} from "./trustOverTime";

describe("trustOverTime", () => {
  it("headline frames time-bound trust", () => {
    expect(TRUST_IS_TIME_BOUND_HEADLINE.toLowerCase()).toContain("time-bound");
  });

  it("lists real estate refresh triggers", () => {
    expect(REAL_ESTATE_REFRESH_TRIGGERS.length).toBeGreaterThanOrEqual(4);
    expect(REAL_ESTATE_REFRESH_TRIGGERS.some(r => r.event.toLowerCase().includes("sale"))).toBe(true);
  });

  it("points relying parties to verify API", () => {
    expect(TRUST_OVER_TIME_VERIFY.api).toContain("/api/credentials/verify");
    expect(TRUST_OVER_TIME_VERIFY.docsHref).toBe("/integrations/relying-parties");
  });

  it("requires fail-closed at transaction time", () => {
    expect(TRUST_FAIL_CLOSED.toLowerCase()).toContain("fail closed");
  });
});
