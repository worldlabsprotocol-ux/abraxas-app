import { describe, expect, it } from "vitest";
import {
  PASSPORT_PRIVACY_HREF,
  PASSPORT_SUPPORT_HREF,
  resolvePassportPageView,
} from "./passportPrivacyNavigation";

describe("Passport privacy navigation", () => {
  it("exposes a stable holder privacy route", () => {
    expect(PASSPORT_PRIVACY_HREF).toBe("/passport?view=privacy");
    expect(PASSPORT_SUPPORT_HREF).toBe("/passport?view=support");
  });

  it("selects only supported Passport views", () => {
    expect(resolvePassportPageView("privacy")).toBe("privacy");
    expect(resolvePassportPageView("verify")).toBe("verify");
    expect(resolvePassportPageView("support")).toBe("support");
    expect(resolvePassportPageView("anything-else")).toBe("passport");
    expect(resolvePassportPageView(null)).toBe("passport");
  });
});
