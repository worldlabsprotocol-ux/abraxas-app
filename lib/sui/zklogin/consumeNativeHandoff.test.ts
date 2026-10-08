// FILE: lib/sui/zklogin/consumeNativeHandoff.test.ts
// @vitest-environment jsdom

import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  consumeNativeHandoffFromQuery,
  resetNativeHandoffConsumeInflightForTests,
} from "./consumeNativeHandoff";
import { NATIVE_CONSUME_VERIFIER_SESSION_KEY, NATIVE_HANDOFF_CODE_QUERY } from "./nativeHandoff";
import { NATIVE_HANDOFF_SETTLED_EVENT, storeNativeConsumeVerifier } from "./nativeHandoffClient";

vi.mock("./session", () => ({
  saveUserSession: vi.fn(),
  saveEphemeralSecretKey: vi.fn(),
}));

vi.mock("./signingSession", () => ({
  saveSigningSession: vi.fn(),
}));

vi.mock("@/lib/auth/ensureBrowserSession", () => ({
  ensureBrowserSession: vi.fn(async () => ({ ok: true })),
}));

const VALID_CODE = "abcdefghijklmnopqrstuvwxyz012345";
const OAUTH_STATE = "signed-oauth-state-token";

function seedVerifier(verifier: string): void {
  storeNativeConsumeVerifier(verifier, OAUTH_STATE);
}

describe("consumeNativeHandoffFromQuery", () => {
  beforeEach(() => {
    sessionStorage.clear();
    localStorage.clear();
    resetNativeHandoffConsumeInflightForTests();
    vi.restoreAllMocks();
  });

  it("keeps consume verifier on transient consume API failure", async () => {
    seedVerifier("verifier-keep");

    vi.stubGlobal("fetch", vi.fn(async () => ({
      ok: false,
      status: 503,
    })));

    const settled = vi.fn();
    window.addEventListener(NATIVE_HANDOFF_SETTLED_EVENT, settled);

    const params = new URLSearchParams();
    params.set(NATIVE_HANDOFF_CODE_QUERY, VALID_CODE);
    const result = await consumeNativeHandoffFromQuery(params);

    expect(result).toBeNull();
    expect(localStorage.getItem(NATIVE_CONSUME_VERIFIER_SESSION_KEY)).toContain("verifier-keep");
    expect(settled).toHaveBeenCalled();

    window.removeEventListener(NATIVE_HANDOFF_SETTLED_EVENT, settled);
  });

  it("clears consume verifier on terminal consume API failure", async () => {
    seedVerifier("verifier-terminal");

    vi.stubGlobal("fetch", vi.fn(async () => ({
      ok: false,
      status: 401,
    })));

    const params = new URLSearchParams();
    params.set(NATIVE_HANDOFF_CODE_QUERY, VALID_CODE);
    await consumeNativeHandoffFromQuery(params);

    expect(localStorage.getItem(NATIVE_CONSUME_VERIFIER_SESSION_KEY)).toBeNull();
  });

  it("clears consume verifier and restores session on success", async () => {
    seedVerifier("verifier-ok");

    vi.stubGlobal("fetch", vi.fn(async () => ({
      ok: true,
      json: async () => ({
        sui_address: "0xabc",
        id_token: "id-token",
        user_salt: "salt",
        randomness: "rand",
        ephemeral_secret_key: "secret",
        provider: "google",
        max_epoch: 100,
      }),
    })));

    const params = new URLSearchParams();
    params.set(NATIVE_HANDOFF_CODE_QUERY, VALID_CODE);
    const result = await consumeNativeHandoffFromQuery(params);

    expect(result?.suiAddress).toBe("0xabc");
    expect(localStorage.getItem(NATIVE_CONSUME_VERIFIER_SESSION_KEY)).toBeNull();
  });

  it("dedupes duplicate consumption for the same handoff code", async () => {
    seedVerifier("verifier-dedupe");
    const fetchMock = vi.fn(async () => ({
      ok: true,
      json: async () => ({
        sui_address: "0xabc",
        id_token: "id-token",
        user_salt: "salt",
        randomness: "rand",
        ephemeral_secret_key: "secret",
        provider: "google",
        max_epoch: 100,
      }),
    }));
    vi.stubGlobal("fetch", fetchMock);

    const params = new URLSearchParams();
    params.set(NATIVE_HANDOFF_CODE_QUERY, VALID_CODE);
    const [first, second] = await Promise.all([
      consumeNativeHandoffFromQuery(params),
      consumeNativeHandoffFromQuery(params),
    ]);

    expect(first?.suiAddress).toBe("0xabc");
    expect(second?.suiAddress).toBe("0xabc");
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("rejects malformed handoff codes before calling consume API", async () => {
    seedVerifier("verifier-ok");
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    const params = new URLSearchParams();
    params.set(NATIVE_HANDOFF_CODE_QUERY, "too-short");
    const result = await consumeNativeHandoffFromQuery(params);

    expect(result).toBeNull();
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
