import { describe, expect, it } from "vitest";
import {
  PUBLIC_CONNECT_EXPLORE_HREF,
  PUBLIC_CONNECT_PASSPORT_LEGACY_HREF,
  resolvePublicNavConnectPhase,
} from "./publicNavConnectBehavior";

describe("resolvePublicNavConnectPhase", () => {
  it("prefers holder profile when browser session is active", () => {
    expect(
      resolvePublicNavConnectPhase({
        holderBrowserSessionActive: true,
        nativeAuthenticated: true,
        nativeFlagEnabled: true,
        nativeOperational: true,
        nativeStateLoaded: true,
      }),
    ).toBe("holder_profile_menu");
  });

  it("does not use holder menu without browser session even if native is signed in", () => {
    expect(
      resolvePublicNavConnectPhase({
        holderBrowserSessionActive: false,
        nativeAuthenticated: true,
        nativeFlagEnabled: true,
        nativeOperational: true,
        nativeStateLoaded: true,
      }),
    ).toBe("native_account_link");
  });

  it("starts passkey connect when native auth is operational", () => {
    expect(
      resolvePublicNavConnectPhase({
        holderBrowserSessionActive: false,
        nativeAuthenticated: false,
        nativeFlagEnabled: true,
        nativeOperational: true,
        nativeStateLoaded: true,
      }),
    ).toBe("native_passkey_connect");
  });

  it("shows unavailable when flag is on but service is degraded", () => {
    expect(
      resolvePublicNavConnectPhase({
        holderBrowserSessionActive: false,
        nativeAuthenticated: false,
        nativeFlagEnabled: true,
        nativeOperational: false,
        nativeStateLoaded: true,
      }),
    ).toBe("native_service_unavailable");
  });

  it("routes to explore when native auth is disabled (flag off)", () => {
    expect(
      resolvePublicNavConnectPhase({
        holderBrowserSessionActive: false,
        nativeAuthenticated: false,
        nativeFlagEnabled: false,
        nativeOperational: false,
        nativeStateLoaded: true,
      }),
    ).toBe("native_explore");
    expect(PUBLIC_CONNECT_EXPLORE_HREF).toBe("/developers/integration-studio");
    expect(PUBLIC_CONNECT_PASSPORT_LEGACY_HREF).toBe("/passport");
  });
});
