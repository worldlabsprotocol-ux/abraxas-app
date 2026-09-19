import { describe, expect, it } from "vitest";
import { shouldShowPartnerConsent } from "./partnerConsentVisibility";

const readyForConsent = {
  verificationRequestId: "vr_test",
  consentDismissed: false,
  identityComplete: true,
  evidenceComplete: true,
  qualifyingMethodSucceeded: true,
  underReview: false,
  handoffReady: false,
};

describe("partner consent visibility", () => {
  it("shows one consent action after a qualifying method succeeds", () => {
    expect(shouldShowPartnerConsent(readyForConsent)).toBe(true);
    expect(shouldShowPartnerConsent({
      ...readyForConsent,
      identityComplete: false,
      evidenceComplete: false,
      methodQualified: true,
      qualifyingMethodSucceeded: true,
    })).toBe(true);
  });

  it("does not show final approval after sign-in or method selection alone", () => {
    expect(shouldShowPartnerConsent({
      ...readyForConsent,
      methodQualified: false,
      qualifyingMethodSucceeded: false,
    })).toBe(false);
    expect(shouldShowPartnerConsent({
      verificationRequestId: "vr_test",
      consentDismissed: false,
      identityComplete: true,
      evidenceComplete: true,
      methodSelected: true,
      methodQualified: false,
      underReview: false,
      handoffReady: false,
    })).toBe(false);
  });

  it("does not present incomplete policy evidence as a denied partner decision", () => {
    expect(shouldShowPartnerConsent({
      ...readyForConsent,
      identityComplete: false,
      evidenceComplete: false,
      methodQualified: false,
      qualifyingMethodSucceeded: false,
    })).toBe(false);
  });

  it("does not duplicate consent during review or after handoff is ready", () => {
    expect(shouldShowPartnerConsent({ ...readyForConsent, underReview: true })).toBe(false);
    expect(shouldShowPartnerConsent({ ...readyForConsent, handoffReady: true })).toBe(false);
  });
});
