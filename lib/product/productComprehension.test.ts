import { describe, expect, it } from "vitest";
import { PRODUCT_STORY_TAGLINE, PARTNER_REQUEST_FOUR_QUESTIONS } from "./productStoryCopy";
import { primarySurfaceFreeOfJargon } from "@/lib/partner/holderExperience/presentation";

describe("product story copy", () => {
  it("states verify-once privacy story in plain language", () => {
    expect(PRODUCT_STORY_TAGLINE.toLowerCase()).toContain("verify once");
    expect(PRODUCT_STORY_TAGLINE.toLowerCase()).toContain("private");
  });

  it("frames partner consent as four explicit questions", () => {
    expect(PARTNER_REQUEST_FOUR_QUESTIONS.who).toMatch(/who/i);
    expect(PARTNER_REQUEST_FOUR_QUESTIONS.receive).toMatch(/receive/i);
    expect(PARTNER_REQUEST_FOUR_QUESTIONS.continue).toMatch(/continue/i);
  });

  it("keeps tagline free of protocol jargon on primary surfaces", () => {
    expect(primarySurfaceFreeOfJargon(PRODUCT_STORY_TAGLINE)).toBe(true);
  });
});
