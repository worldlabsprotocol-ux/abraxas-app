import { describe, expect, it } from "vitest";
import { PUBLIC_NAV_EXPLORE_HREF, resolvePublicNavSignInPhase } from "./publicNavConnectBehavior";

describe("resolvePublicNavSignInPhase", () => {
  it("shows account when native session is authenticated", () => {
    expect(
      resolvePublicNavSignInPhase({
        nativeAuthenticated: true,
        nativeFlagEnabled: true,
        nativeOperational: true,
        nativeStateLoaded: true,
      }),
    ).toBe("native_account_link");
  });

  it("shows Solana sign-in when operational", () => {
    expect(
      resolvePublicNavSignInPhase({
        nativeAuthenticated: false,
        nativeFlagEnabled: true,
        nativeOperational: true,
        nativeStateLoaded: true,
      }),
    ).toBe("native_solana_sign_in");
  });

  it("shows unavailable when flag on but degraded", () => {
    expect(
      resolvePublicNavSignInPhase({
        nativeAuthenticated: false,
        nativeFlagEnabled: true,
        nativeOperational: false,
        nativeStateLoaded: true,
      }),
    ).toBe("native_service_unavailable");
  });

  it("routes to workspace when native flag is off", () => {
    expect(
      resolvePublicNavSignInPhase({
        nativeAuthenticated: false,
        nativeFlagEnabled: false,
        nativeOperational: false,
        nativeStateLoaded: true,
      }),
    ).toBe("native_explore_only");
    expect(PUBLIC_NAV_EXPLORE_HREF).toBe("/developers/integration-studio");
  });
});
