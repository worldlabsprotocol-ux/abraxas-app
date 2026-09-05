// FILE: lib/partner/partnerHolderCopy.test.ts

import { describe, expect, it } from "vitest";
import { resolvePartnerHolderPresentation } from "./partnerHolderCopy";

describe("partnerHolderCopy", () => {
  it("never implies sign-in verifies age", () => {
    const copy = resolvePartnerHolderPresentation("confirm_account");
    expect(copy.message.toLowerCase()).toContain("does not verify your age");
  });

  it("uses partner name in return label", () => {
    const copy = resolvePartnerHolderPresentation("return_to_partner", "Good Trouble");
    expect(copy.title).toContain("Good Trouble");
  });

  it("covers all required holder states", () => {
    const states = [
      "confirm_account",
      "verify_age",
      "under_review",
      "age_confirmed",
      "return_to_partner",
      "verification_expired",
    ] as const;
    for (const state of states) {
      const copy = resolvePartnerHolderPresentation(state);
      expect(copy.title.length).toBeGreaterThan(0);
      expect(copy.message.length).toBeGreaterThan(0);
    }
  });
});
