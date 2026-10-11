import { describe, expect, it } from "vitest";
import { resolveHolderJourneyState } from "@/lib/product/resolveHolderJourneyState";

describe("resolveHolderJourneyState", () => {
  it("maps pending review phase", () => {
    expect(resolveHolderJourneyState({ signedIn: true, walletBound: true, identityComplete: true, partnerPhase: "pending_review" })).toBe("under_review");
  });

  it("maps denied consent", () => {
    expect(resolveHolderJourneyState({ signedIn: true, walletBound: true, identityComplete: true, partnerPhase: "denied" })).toBe("consent_denied");
  });

  it("wallet without identity is not verified", () => {
    expect(resolveHolderJourneyState({ signedIn: true, walletBound: false, identityComplete: false })).toBe("wallet_connected_unverified");
  });

  it("first-time vs returning when signed out", () => {
    expect(resolveHolderJourneyState({ signedIn: false, walletBound: false, identityComplete: false })).toBe("first_time");
    expect(resolveHolderJourneyState({ signedIn: false, walletBound: false, identityComplete: false, returningSession: true })).toBe("returning");
  });
});
