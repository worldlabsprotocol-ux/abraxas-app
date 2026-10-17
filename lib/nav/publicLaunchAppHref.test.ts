import { describe, expect, it } from "vitest";
import { resolvePublicLaunchAppHref } from "./publicLaunchAppHref";

describe("resolvePublicLaunchAppHref", () => {
  it("routes native operators to applications", () => {
    expect(
      resolvePublicLaunchAppHref({ nativeAccountAuthenticated: true, holderPassportSignedIn: false }),
    ).toBe("/account/applications");
  });

  it("routes signed-in holders to Passport", () => {
    expect(
      resolvePublicLaunchAppHref({ nativeAccountAuthenticated: false, holderPassportSignedIn: true }),
    ).toBe("/passport");
  });

  it("defaults visitors to Launchpad", () => {
    expect(
      resolvePublicLaunchAppHref({ nativeAccountAuthenticated: false, holderPassportSignedIn: false }),
    ).toBe("/developers/launchpad");
  });
});
