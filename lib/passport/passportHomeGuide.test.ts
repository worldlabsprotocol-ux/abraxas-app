import { describe, expect, it } from "vitest";
import { resolvePassportHomeGuide } from "./passportHomeGuide";

describe("resolvePassportHomeGuide", () => {
  it("routes an unsecured Passport to the security confirmation", () => {
    expect(resolvePassportHomeGuide({
      walletBound: false,
      identityUi: "not_started",
      identityRequired: false,
    })).toMatchObject({
      eyebrow: "Next step",
      title: "Secure your Passport",
      action_href: "#passport-secure-heading",
    });
  });

  it("asks for identity only when the current service requires it", () => {
    const optional = resolvePassportHomeGuide({
      walletBound: true,
      identityUi: "not_started",
      identityRequired: false,
    });
    const required = resolvePassportHomeGuide({
      walletBound: true,
      identityUi: "not_started",
      identityRequired: true,
    });

    expect(optional).toMatchObject({
      eyebrow: "Ready",
      action_href: "/passport?view=activity",
    });
    expect(required).toMatchObject({
      eyebrow: "Next step",
      action_href: "#passport-identity-action",
    });
  });

  it("does not ask a holder to resubmit while review is pending", () => {
    expect(resolvePassportHomeGuide({
      walletBound: true,
      identityUi: "under_review",
      identityRequired: true,
    })).toMatchObject({
      eyebrow: "In progress",
      action_label: "View activity",
    });
  });

  it("surfaces a resubmission as action needed", () => {
    expect(resolvePassportHomeGuide({
      walletBound: true,
      identityUi: "needs_action",
      identityRequired: true,
    })).toMatchObject({
      eyebrow: "Action needed",
      action_label: "Update information",
      action_href: "#passport-identity-action",
    });
  });
});
