// FILE: lib/sui/zklogin/nativeHandoffClient.test.ts
// @vitest-environment jsdom

import { describe, expect, it, beforeEach, vi } from "vitest";
import {
  buildPassportHandoffUrl,
  clearNativeConsumeVerifier,
  parseHandoffCodeFromUrl,
  readNativeConsumeVerifier,
  storeNativeConsumeVerifier,
} from "./nativeHandoffClient";
import { NATIVE_CONSUME_VERIFIER_SESSION_KEY } from "./nativeHandoff";

describe("nativeHandoffClient", () => {
  beforeEach(() => {
    sessionStorage.clear();
    localStorage.clear();
    vi.stubEnv("NEXT_PUBLIC_APP_URL", "https://abraxasworld.xyz");
  });

  it("parses handoff code from custom-scheme and https URLs", () => {
    expect(
      parseHandoffCodeFromUrl("xyz.abraxasworld.app://passport?holder_native_handoff_code=abc123"),
    ).toBe("abc123");
    expect(
      parseHandoffCodeFromUrl("https://abraxasworld.xyz/passport?holder_native_handoff_code=xyz%2B9"),
    ).toBe("xyz+9");
  });

  it("builds hosted passport URL with opaque handoff code", () => {
    expect(buildPassportHandoffUrl("opaque-code")).toBe(
      "https://abraxasworld.xyz/passport?holder_native_handoff_code=opaque-code",
    );
  });

  it("persists consume verifier in sessionStorage and localStorage", () => {
    storeNativeConsumeVerifier("verifier-1");
    expect(sessionStorage.getItem(NATIVE_CONSUME_VERIFIER_SESSION_KEY)).toBe("verifier-1");
    expect(localStorage.getItem(NATIVE_CONSUME_VERIFIER_SESSION_KEY)).toBe("verifier-1");

    sessionStorage.removeItem(NATIVE_CONSUME_VERIFIER_SESSION_KEY);
    expect(readNativeConsumeVerifier()).toBe("verifier-1");

    clearNativeConsumeVerifier();
    expect(readNativeConsumeVerifier()).toBeNull();
  });
});
