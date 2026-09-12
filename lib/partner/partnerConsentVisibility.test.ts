import { describe, expect, it } from "vitest";
import { shouldShowPartnerConsent } from "./partnerConsentVisibility";

const readyForConsent = {
  verificationRequestId: "vr_test",
  consentDismissed: false,
  identityComplete: true,
  underReview: false,
  handoffReady: false,
};

describe("partner consent visibility", () => {
  it("shows one consent action after required identity evidence is ready", () => {
    expect(shouldShowPartnerConsent(readyForConsent)).toBe(true);
  });

  it("does not present an incomplete Passport as a denied partner decision", () => {
    expect(shouldShowPartnerConsent({
      ...readyForConsent,
      identityComplete: false,
    })).toBe(false);
  });

  it("does not duplicate consent during review or after handoff is ready", () => {
    expect(shouldShowPartnerConsent({ ...readyForConsent, underReview: true })).toBe(false);
    expect(shouldShowPartnerConsent({ ...readyForConsent, handoffReady: true })).toBe(false);
  });
});
