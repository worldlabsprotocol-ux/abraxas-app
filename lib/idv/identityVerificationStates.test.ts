// FILE: lib/idv/identityVerificationStates.test.ts

import { describe, expect, it } from "vitest";
import { computePassportSetupState } from "./identityVerificationStates";

describe("computePassportSetupState holder order", () => {
  it("starts with sign-in before wallet bind", () => {
    const setup = computePassportSetupState({
      walletDone: false,
      identityStatus: "not_started",
      credentialStatus: "not_issued",
      walletBindingL3: false,
    });

    expect(setup.step).toBe(1);
    expect(setup.nextAction).toBe("sign_in");
    expect(setup.accountComplete).toBe(false);
    expect(setup.walletBound).toBe(false);
  });

  it("requires wallet bind after sign-in and before optional identity", () => {
    const setup = computePassportSetupState({
      walletDone: true,
      identityStatus: "not_started",
      credentialStatus: "not_issued",
      walletBindingL3: false,
    });

    expect(setup.step).toBe(2);
    expect(setup.nextAction).toBe("bind_wallet");
    expect(setup.accountComplete).toBe(true);
    expect(setup.profileComplete).toBe(false);
    expect(setup.identityComplete).toBe(false);
  });

  it("marks profile ready only after wallet bind, with identity still optional", () => {
    const setup = computePassportSetupState({
      walletDone: true,
      identityStatus: "not_started",
      credentialStatus: "not_issued",
      walletBindingL3: true,
    });

    expect(setup.step).toBe(3);
    expect(setup.profileComplete).toBe(true);
    expect(setup.nextAction).toBe("ready");
    expect(setup.nextActionLabel).toContain("Profile ready");
    expect(setup.identityComplete).toBe(false);
  });

  it("reaches passport ready only with approved identity and active credential", () => {
    const setup = computePassportSetupState({
      walletDone: true,
      identityStatus: "approved",
      credentialStatus: "active",
      walletBindingL3: true,
    });

    expect(setup.step).toBe(3);
    expect(setup.identityComplete).toBe(true);
    expect(setup.profileComplete).toBe(true);
    expect(setup.nextAction).toBe("ready");
    expect(setup.nextActionLabel).toBe("Passport ready");
  });

  it("surfaces review state before profile-ready identity completion", () => {
    const setup = computePassportSetupState({
      walletDone: true,
      identityStatus: "in_progress",
      credentialStatus: "not_issued",
      walletBindingL3: true,
    });

    expect(setup.profileComplete).toBe(true);
    expect(setup.nextAction).toBe("wait_review");
    expect(setup.identityComplete).toBe(false);
  });
});
