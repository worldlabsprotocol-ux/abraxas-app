import { describe, expect, it } from "vitest";
import { resolvePublicNavConnectPhase } from "./publicNavConnectBehavior";

describe("resolvePublicNavConnectPhase", () => {
  it("prefers holder profile when Passport session exists", () => {
    expect(
      resolvePublicNavConnectPhase({
        holderSignedIn: true,
        nativeAuthenticated: true,
        nativeEnabled: true,
        nativeStateLoaded: true,
      }),
    ).toBe("holder_profile_menu");
  });

  it("links to account when native session exists without holder session", () => {
    expect(
      resolvePublicNavConnectPhase({
        holderSignedIn: false,
        nativeAuthenticated: true,
        nativeEnabled: true,
        nativeStateLoaded: true,
      }),
    ).toBe("native_account_link");
  });

  it("starts passkey connect when native auth is enabled", () => {
    expect(
      resolvePublicNavConnectPhase({
        holderSignedIn: false,
        nativeAuthenticated: false,
        nativeEnabled: true,
        nativeStateLoaded: true,
      }),
    ).toBe("native_passkey_connect");
  });

  it("uses recovery path when native auth is disabled", () => {
    expect(
      resolvePublicNavConnectPhase({
        holderSignedIn: false,
        nativeAuthenticated: false,
        nativeEnabled: false,
        nativeStateLoaded: true,
      }),
    ).toBe("native_unavailable_recovery");
  });
});
