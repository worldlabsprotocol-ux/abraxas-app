// FILE: lib/sui/zklogin/startLogin.test.ts

import { describe, expect, it, beforeEach, afterEach, vi } from "vitest";

vi.mock("./fetchLoginEpoch", () => ({
  fetchLoginMaxEpoch: vi.fn().mockResolvedValue({
    ok: true,
    maxEpoch: 110,
    network: "devnet",
    rpcHost: "rpc-devnet.suiscan.xyz",
  }),
}));

vi.mock("./config", () => ({
  isZkLoginConfigured: () => true,
  isLegacyZkLoginRecoveryConfigured: () => true,
  buildGoogleOAuthUrl: vi.fn((nonce: string, oauthState: string, mode: string) =>
    `https://accounts.google.com/o/oauth2/v2/auth?nonce=${nonce}&state=${oauthState}&mode=${mode}`),
}));

vi.mock("./session", () => ({
  savePendingSession: vi.fn(),
}));

import { savePendingSession } from "./session";
import { fetchLoginMaxEpoch } from "./fetchLoginEpoch";
import { buildGoogleOAuthUrl } from "./config";
import { startGoogleZkLogin } from "./startLogin";

const SIGNED_OAUTH_STATE = "signed-random-oauth-state-token";

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
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ oauth_state: SIGNED_OAUTH_STATE }),
    }));
    assign.mockClear();
    vi.mocked(savePendingSession).mockClear();
    vi.mocked(fetchLoginMaxEpoch).mockResolvedValue({
      ok: true,
      maxEpoch: 110,
      network: "devnet",
      rpcHost: "rpc-devnet.suiscan.xyz",
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("blocks duplicate sign-in attempts while in flight", async () => {
    storage["abraxas_zklogin_login_in_flight"] = "1";
    storage["abraxas_zklogin_login_in_flight_ts"] = String(Date.now());
    const result = await startGoogleZkLogin();
    expect(result).toEqual({ ok: false, error: "Sign-in already in progress. Wait a moment and try again." });
    expect(assign).not.toHaveBeenCalled();
  });

  it("mints server OAuth state and starts canonical sign-in", async () => {
    const result = await startGoogleZkLogin();
    expect(result).toEqual({ ok: true });
    expect(fetchLoginMaxEpoch).toHaveBeenCalled();
    expect(fetch).toHaveBeenCalledWith(
      "/api/auth/zklogin/login-state",
      expect.objectContaining({
        method: "POST",
        credentials: "include",
      }),
    );
    expect(savePendingSession).toHaveBeenCalledWith(
      expect.objectContaining({ loginMode: "canonical" }),
    );
    expect(buildGoogleOAuthUrl).toHaveBeenCalledWith(
      expect.any(String),
      SIGNED_OAUTH_STATE,
      "canonical",
    );
    expect(storage["abraxas_zklogin_login_in_flight"]).toBe("1");
    expect(assign).toHaveBeenCalled();
  });

  it("uses legacy client and signed OAuth state for existing Passport sign-in", async () => {
    const result = await startGoogleZkLogin({ mode: "legacy_recovery" });
    expect(result).toEqual({ ok: true });
    expect(savePendingSession).toHaveBeenCalledWith(
      expect.objectContaining({ loginMode: "legacy_recovery" }),
    );
    expect(buildGoogleOAuthUrl).toHaveBeenCalledWith(
      expect.any(String),
      SIGNED_OAUTH_STATE,
      "legacy_recovery",
    );
    expect(assign).toHaveBeenCalledWith(expect.stringContaining(SIGNED_OAUTH_STATE));
  });

  it("surfaces RPC prepare failure without generic fetch message", async () => {
    vi.mocked(fetchLoginMaxEpoch).mockResolvedValue({
      ok: false,
      error: "Sign-in failed during sui_epoch_fetch: timeout. Sui network=devnet, RPC host=rpc-devnet.suiscan.xyz.",
    });
    const result = await startGoogleZkLogin();
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toContain("sui_epoch_fetch");
      expect(result.error).toContain("rpc-devnet.suiscan.xyz");
    }
    expect(assign).not.toHaveBeenCalled();
  });
});
