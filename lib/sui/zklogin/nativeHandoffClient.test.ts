// FILE: lib/sui/zklogin/nativeHandoffClient.test.ts
// @vitest-environment jsdom

import { describe, expect, it, beforeEach, afterEach, vi } from "vitest";
import {
  buildPassportHandoffUrl,
  clearNativeConsumeVerifier,
  createNativeHandoffIngressHandler,
  parseHandoffCodeFromUrl,
  readNativeConsumeVerifier,
  storeNativeConsumeVerifier,
  NATIVE_CONSUME_VERIFIER_TTL_MS,
} from "./nativeHandoffClient";
import { NATIVE_CONSUME_VERIFIER_SESSION_KEY } from "./nativeHandoff";

const VALID_CODE = "abcdefghijklmnopqrstuvwxyz012345";
const OAUTH_STATE = "signed-oauth-state-token";

describe("nativeHandoffClient", () => {
  beforeEach(() => {
    sessionStorage.clear();
    localStorage.clear();
    vi.stubEnv("NEXT_PUBLIC_APP_URL", "https://abraxasworld.xyz");
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("parses handoff code from approved custom-scheme and https URLs", () => {
    expect(
      parseHandoffCodeFromUrl(`xyz.abraxasworld.app://passport?holder_native_handoff_code=${VALID_CODE}`),
    ).toBe(VALID_CODE);
    expect(
      parseHandoffCodeFromUrl(`https://abraxasworld.xyz/passport?holder_native_handoff_code=${encodeURIComponent(VALID_CODE)}`),
    ).toBe(VALID_CODE);
  });

  it("rejects malicious or unrelated handoff URLs", () => {
    expect(parseHandoffCodeFromUrl(`https://evil.example/passport?holder_native_handoff_code=${VALID_CODE}`)).toBeNull();
    expect(parseHandoffCodeFromUrl(`xyz.abraxasworld.app://wallet?holder_native_handoff_code=${VALID_CODE}`)).toBeNull();
    expect(parseHandoffCodeFromUrl(`xyz.abraxasworld.app://passport/extra?holder_native_handoff_code=${VALID_CODE}`)).toBeNull();
    expect(parseHandoffCodeFromUrl(`javascript:alert(1)`)).toBeNull();
    expect(parseHandoffCodeFromUrl(`xyz.abraxasworld.app://passport?holder_native_handoff_code=short`)).toBeNull();
    expect(parseHandoffCodeFromUrl(`xyz.abraxasworld.app://passport?holder_native_handoff_code=${VALID_CODE}&evil=1`)).toBeNull();
    expect(parseHandoffCodeFromUrl(`xyz.abraxasworld.app://passport?holder_native_handoff_code=${VALID_CODE}%ZZ`)).toBeNull();
  });

  it("builds hosted passport URL only for validated handoff codes", () => {
    expect(buildPassportHandoffUrl(VALID_CODE)).toBe(
      `https://abraxasworld.xyz/passport?holder_native_handoff_code=${VALID_CODE}`,
    );
    expect(buildPassportHandoffUrl("too-short")).toBeNull();
  });

  it("stores consume verifier bound to oauth state in sessionStorage and localStorage", () => {
    storeNativeConsumeVerifier("verifier-1", OAUTH_STATE);
    const sessionRaw = sessionStorage.getItem(NATIVE_CONSUME_VERIFIER_SESSION_KEY);
    const localRaw = localStorage.getItem(NATIVE_CONSUME_VERIFIER_SESSION_KEY);
    expect(sessionRaw).toContain("verifier-1");
    expect(sessionRaw).toContain(OAUTH_STATE);
    expect(localRaw).toBe(sessionRaw);

    sessionStorage.removeItem(NATIVE_CONSUME_VERIFIER_SESSION_KEY);
    expect(readNativeConsumeVerifier()).toBe("verifier-1");
  });

  it("replaces verifier storage when a new login transaction starts", () => {
    storeNativeConsumeVerifier("verifier-old", "oauth-old");
    storeNativeConsumeVerifier("verifier-new", "oauth-new");
    expect(readNativeConsumeVerifier()).toBe("verifier-new");
    const stored = localStorage.getItem(NATIVE_CONSUME_VERIFIER_SESSION_KEY);
    expect(stored).toContain("oauth-new");
    expect(stored).not.toContain("verifier-old");
  });

  it("clears expired consume verifier on read", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-01-01T00:00:00Z"));
    storeNativeConsumeVerifier("verifier-expired", OAUTH_STATE);
    vi.setSystemTime(new Date(Date.now() + NATIVE_CONSUME_VERIFIER_TTL_MS + 1));
    expect(readNativeConsumeVerifier()).toBeNull();
    expect(localStorage.getItem(NATIVE_CONSUME_VERIFIER_SESSION_KEY)).toBeNull();
  });

  it("dedupes duplicate ingress events for warm resume", () => {
    const navigate = vi.fn();
    const ingress = createNativeHandoffIngressHandler(navigate);
    const url = `xyz.abraxasworld.app://passport?holder_native_handoff_code=${VALID_CODE}`;

    ingress.handleUrl(url);
    ingress.handleUrl(url);

    expect(navigate).toHaveBeenCalledTimes(1);
    expect(navigate).toHaveBeenCalledWith(VALID_CODE);
  });

  it("clears verifier storage explicitly", () => {
    storeNativeConsumeVerifier("verifier-1", OAUTH_STATE);
    clearNativeConsumeVerifier();
    expect(readNativeConsumeVerifier()).toBeNull();
  });
});
