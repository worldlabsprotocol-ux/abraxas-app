// FILE: lib/home/commercialHomeContent.test.ts

import { describe, expect, it } from "vitest";
import {
  ALREADY_BUILT_CAPABILITIES,
  HOME_HOW_IT_WORKS_STEPS,
  PARTNER_DOES_NOT_RECEIVE_ITEMS,
  PARTNER_RECEIVES_ITEMS,
} from "./commercialHomeContent";
import { REGULATED_INDUSTRY_PILLARS } from "./ecosystemContent";

describe("commercialHomeContent", () => {
  it("defines a four-step how-it-works flow", () => {
    expect(HOME_HOW_IT_WORKS_STEPS).toHaveLength(4);
    expect(HOME_HOW_IT_WORKS_STEPS.map((s) => s.title)).toEqual([
      "Verify",
      "Receive a Passport",
      "Evaluate a policy",
      "Return a signed outcome",
    ]);
  });

  it("lists partner receive and withhold items with channel-aware wording", () => {
    expect(PARTNER_RECEIVES_ITEMS).toHaveLength(5);
    expect(PARTNER_DOES_NOT_RECEIVE_ITEMS).toHaveLength(6);
    expect(PARTNER_RECEIVES_ITEMS.join(" ")).toContain("public receipt");
    expect(PARTNER_DOES_NOT_RECEIVE_ITEMS.join(" ")).not.toContain("guarantee");
  });

  it("lists verified production capabilities without audit claims", () => {
    expect(ALREADY_BUILT_CAPABILITIES).toHaveLength(10);
    const joined = ALREADY_BUILT_CAPABILITIES.join(" ").toLowerCase();
    expect(joined).not.toContain("audited");
    expect(joined).not.toContain("regulator");
  });

  it("aligns commercial use cases with regulated industry pillars", () => {
    expect(REGULATED_INDUSTRY_PILLARS.map((p) => p.title)).toEqual([
      "Age-gated commerce",
      "Gaming and wagering",
      "Financial applications",
      "Tokenized real-world assets",
      "Digital marketplaces",
    ]);
  });
});
