// FILE: lib/sui/zklogin/consumeNativeHandoff.test.ts
// @vitest-environment jsdom

import { beforeEach, describe, expect, it, vi } from "vitest";
import { consumeNativeHandoffFromQuery } from "./consumeNativeHandoff";
import { NATIVE_CONSUME_VERIFIER_SESSION_KEY, NATIVE_HANDOFF_CODE_QUERY } from "./nativeHandoff";
import { NATIVE_HANDOFF_SETTLED_EVENT } from "./nativeHandoffClient";

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

describe("consumeNativeHandoffFromQuery", () => {
  beforeEach(() => {
    sessionStorage.clear();
    localStorage.clear();
    vi.restoreAllMocks();
  });

  it("keeps consume verifier when consume API rejects", async () => {
    sessionStorage.setItem(NATIVE_CONSUME_VERIFIER_SESSION_KEY, "verifier-keep");
    localStorage.setItem(NATIVE_CONSUME_VERIFIER_SESSION_KEY, "verifier-keep");

    vi.stubGlobal("fetch", vi.fn(async () => ({
      ok: false,
      status: 409,
    })));

    const settled = vi.fn();
    window.addEventListener(NATIVE_HANDOFF_SETTLED_EVENT, settled);

    const params = new URLSearchParams();
    params.set(NATIVE_HANDOFF_CODE_QUERY, "handoff-code");
    const result = await consumeNativeHandoffFromQuery(params);

    expect(result).toBeNull();
    expect(sessionStorage.getItem(NATIVE_CONSUME_VERIFIER_SESSION_KEY)).toBe("verifier-keep");
    expect(localStorage.getItem(NATIVE_CONSUME_VERIFIER_SESSION_KEY)).toBe("verifier-keep");
    expect(settled).toHaveBeenCalled();

    window.removeEventListener(NATIVE_HANDOFF_SETTLED_EVENT, settled);
  });

  it("clears consume verifier and restores session on success", async () => {
    sessionStorage.setItem(NATIVE_CONSUME_VERIFIER_SESSION_KEY, "verifier-ok");
    localStorage.setItem(NATIVE_CONSUME_VERIFIER_SESSION_KEY, "verifier-ok");

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
    params.set(NATIVE_HANDOFF_CODE_QUERY, "handoff-code");
    const result = await consumeNativeHandoffFromQuery(params);

    expect(result?.suiAddress).toBe("0xabc");
    expect(sessionStorage.getItem(NATIVE_CONSUME_VERIFIER_SESSION_KEY)).toBeNull();
    expect(localStorage.getItem(NATIVE_CONSUME_VERIFIER_SESSION_KEY)).toBeNull();
  });
});
