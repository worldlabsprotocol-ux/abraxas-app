// FILE: lib/product/abraxasIdentityExperienceCopy.test.ts

import { describe, expect, it } from "vitest";
import { ABRAXAS_ACCOUNT_NOT_VERIFICATION } from "@/lib/product/abraxasIdentityExperienceCopy";
import { GOOGLE_ACCOUNT_NOT_ELIGIBILITY } from "@/lib/partner/launchpad/policyPacks";

describe("abraxasIdentityExperienceCopy", () => {
  it("keeps launchpad policy API disclaimer Abraxas-native without Google branding", () => {
    expect(GOOGLE_ACCOUNT_NOT_ELIGIBILITY).toBe(ABRAXAS_ACCOUNT_NOT_VERIFICATION);
    expect(GOOGLE_ACCOUNT_NOT_ELIGIBILITY.toLowerCase()).not.toContain("google");
  });
});
