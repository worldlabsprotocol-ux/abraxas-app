// FILE: lib/sui/zklogin/startLogin.test.ts

import { describe, expect, it, beforeEach, afterEach, vi } from "vitest";

vi.mock("@/lib/sui/client", () => ({
  getSuiClient: () => ({
    getLatestSuiSystemState: async () => ({ epoch: "100" }),
  }),
}));

vi.mock("./config", () => ({
  isZkLoginConfigured: () => true,
  buildGoogleOAuthUrl: () => "https://accounts.google.com/o/oauth2/v2/auth?test=1",
}));

vi.mock("./session", () => ({
  savePendingSession: vi.fn(),
}));

import { savePendingSession } from "./session";
import { startGoogleZkLogin } from "./startLogin";

describe("startGoogleZkLogin", () => {
  const assign = vi.fn();
  let storage: Record<string, string>;

  beforeEach(() => {
    storage = {};
    vi.stubGlobal("sessionStorage", {
      getItem: (k: string) => storage[k] ?? null,
      setItem: (k: string, v: string) => { storage[k] = v; },
      removeItem: (k: string) => { delete storage[k]; },
      clear: () => { storage = {}; },
    });
    vi.stubGlobal("window", {
      location: { assign },
    });
    assign.mockClear();
    vi.mocked(savePendingSession).mockClear();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("blocks duplicate sign-in attempts while in flight", async () => {
    sessionStorage.setItem("abraxas_zklogin_login_in_flight", "1");
    const result = await startGoogleZkLogin();
    expect(result).toEqual({ ok: false, error: "Sign-in already in progress" });
    expect(assign).not.toHaveBeenCalled();
  });

  it("starts OAuth and marks in-flight", async () => {
    const result = await startGoogleZkLogin();
    expect(result).toEqual({ ok: true });
    expect(savePendingSession).toHaveBeenCalled();
    expect(sessionStorage.getItem("abraxas_zklogin_login_in_flight")).toBe("1");
    expect(assign).toHaveBeenCalled();
  });
});
