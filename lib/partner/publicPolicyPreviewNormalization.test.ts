import { describe, expect, it } from "vitest";
import { normalizePublicPolicyItems } from "./publicPolicyPreview";

describe("normalizePublicPolicyItems", () => {
  it("wraps the catalog partner-receives sentence as one display item", () => {
    expect(normalizePublicPolicyItems("Signed result age_eligible_21.")).toEqual([
      "Signed result age_eligible_21.",
    ]);
  });

  it("keeps list-shaped privacy fields and removes invalid entries", () => {
    expect(normalizePublicPolicyItems(["date of birth", " government ID images ", null])).toEqual([
      "date of birth",
      "government ID images",
    ]);
  });

  it("fails closed for missing or malformed catalog fields", () => {
    expect(normalizePublicPolicyItems(undefined)).toEqual([]);
    expect(normalizePublicPolicyItems({ value: "unexpected" })).toEqual([]);
  });
});
