import { describe, expect, it } from "vitest";
import {
  PASSPORT_PRIVACY_HREF,
  resolvePassportPageView,
} from "./passportPrivacyNavigation";

describe("Passport privacy navigation", () => {
  it("exposes a stable holder privacy route", () => {
    expect(PASSPORT_PRIVACY_HREF).toBe("/passport?view=privacy");
  });

  it("selects only supported Passport views", () => {
    expect(resolvePassportPageView("privacy")).toBe("privacy");
    expect(resolvePassportPageView("verify")).toBe("verify");
    expect(resolvePassportPageView("anything-else")).toBe("passport");
    expect(resolvePassportPageView(null)).toBe("passport");
  });
});
