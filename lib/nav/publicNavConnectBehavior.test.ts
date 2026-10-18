import { describe, expect, it } from "vitest";
import {
  PUBLIC_CONNECT_NATIVE_UNAVAILABLE_HREF,
  resolvePublicNavConnectPhase,
} from "./publicNavConnectBehavior";

describe("resolvePublicNavConnectPhase", () => {
  it("prefers holder profile when browser session is active", () => {
    expect(
      resolvePublicNavConnectPhase({
        holderBrowserSessionActive: true,
        nativeAuthenticated: true,
        nativeEnabled: true,
        nativeStateLoaded: true,
      }),
    ).toBe("holder_profile_menu");
  });

  it("does not use holder menu without browser session even if native is signed in", () => {
    expect(
      resolvePublicNavConnectPhase({
        holderBrowserSessionActive: false,
        nativeAuthenticated: true,
        nativeEnabled: true,
        nativeStateLoaded: true,
      }),
    ).toBe("native_account_link");
  });

  it("starts passkey connect when native auth is enabled", () => {
    expect(
      resolvePublicNavConnectPhase({
        holderBrowserSessionActive: false,
        nativeAuthenticated: false,
        nativeEnabled: true,
        nativeStateLoaded: true,
      }),
    ).toBe("native_passkey_connect");
  });

  it("uses Passport recovery when native auth is disabled", () => {
    expect(
      resolvePublicNavConnectPhase({
        holderBrowserSessionActive: false,
        nativeAuthenticated: false,
        nativeEnabled: false,
        nativeStateLoaded: true,
      }),
    ).toBe("native_unavailable_recovery");
    expect(PUBLIC_CONNECT_NATIVE_UNAVAILABLE_HREF).toBe("/passport");
  });
});
