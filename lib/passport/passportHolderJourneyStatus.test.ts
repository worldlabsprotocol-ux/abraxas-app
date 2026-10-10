import { describe, expect, it } from "vitest";
import { resolvePassportHolderJourneyStatus } from "@/lib/passport/passportHolderJourneyStatus";
import type { PassportSetupState } from "@/lib/idv/identityVerificationStates";

const baseSetup: PassportSetupState = {
  step: 3,
  stepLabel: "Ready",
  accountComplete: true,
  identityComplete: true,
  profileComplete: true,
  walletBound: true,
  identityStatus: "approved",
  credentialStatus: "active",
  nextAction: "ready",
  nextActionLabel: "Ready",
};

describe("passportHolderJourneyStatus", () => {
  it("prompts sign in when wallet not connected", () => {
    const s = resolvePassportHolderJourneyStatus({
      walletDone: false,
      setup: { ...baseSetup, walletBound: false, step: 1, nextAction: "sign_in" },
      identityStatus: "not_started",
      hasCredential: false,
      idvProvider: "manual",
      via: null,
    });
    expect(s.stepId).toBe("sign_in");
  });

  it("shows reuse when verified with credential", () => {
    const s = resolvePassportHolderJourneyStatus({
      walletDone: true,
      setup: baseSetup,
      identityStatus: "earned",
      hasCredential: true,
      idvProvider: "manual",
      via: "verification",
    });
    expect(s.stepId).toBe("verified_reuse");
  });
});
