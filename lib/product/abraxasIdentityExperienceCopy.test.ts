// FILE: lib/product/abraxasIdentityExperienceCopy.test.ts

import { describe, expect, it } from "vitest";
import {
  ABRAXAS_ACCOUNT_NOT_VERIFICATION,
  ABRAXAS_CONTINUE_SECURELY_LABEL,
  ABRAXAS_SESSION_EXPIRED_BODY,
} from "@/lib/product/abraxasIdentityExperienceCopy";
import { PASSPORT_REAUTH_LABEL, PASSPORT_REAUTH_EXPLAINER } from "@/lib/passport/passportCustomerCopy";
import { GOOGLE_ACCOUNT_NOT_ELIGIBILITY } from "@/lib/partner/launchpad/policyPacks";

describe("abraxasIdentityExperienceCopy", () => {
  it("keeps launchpad policy API disclaimer Abraxas-native without Google branding", () => {
    expect(GOOGLE_ACCOUNT_NOT_ELIGIBILITY).toBe(ABRAXAS_ACCOUNT_NOT_VERIFICATION);
    expect(GOOGLE_ACCOUNT_NOT_ELIGIBILITY.toLowerCase()).not.toContain("google");
  });

  it("routes Passport session recovery through Abraxas-native copy", () => {
    expect(PASSPORT_REAUTH_LABEL).toBe(ABRAXAS_CONTINUE_SECURELY_LABEL);
    expect(PASSPORT_REAUTH_EXPLAINER).toBe(ABRAXAS_SESSION_EXPIRED_BODY);
    expect(PASSPORT_REAUTH_LABEL.toLowerCase()).not.toContain("google");
  });
});
