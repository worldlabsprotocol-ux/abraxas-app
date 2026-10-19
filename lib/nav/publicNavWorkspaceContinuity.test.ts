// FILE: lib/nav/publicNavWorkspaceContinuity.test.ts

import { describe, expect, it } from "vitest";
import { resolvePublicNavSignInPhase } from "./publicNavConnectBehavior";

describe("public nav workspace continuity", () => {
  it("shows workspace link phase when ephemeral session is authenticated", () => {
    expect(
      resolvePublicNavSignInPhase({
        nativeAuthenticated: true,
        nativeFlagEnabled: true,
        nativeOperational: true,
        nativeStateLoaded: true,
      }),
    ).toBe("native_account_link");
  });

  it("does not require sign in phase when session remains valid", () => {
    const phase = resolvePublicNavSignInPhase({
      nativeAuthenticated: true,
      nativeFlagEnabled: true,
      nativeOperational: true,
      nativeStateLoaded: true,
    });
    expect(phase).not.toBe("native_solana_sign_in");
  });
});
