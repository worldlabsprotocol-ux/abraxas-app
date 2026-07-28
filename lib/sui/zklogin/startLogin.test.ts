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
  buildGoogleOAuthUrl: () => "https://accounts.google.com/o/oauth2/v2/auth?test=1",
}));

vi.mock("./session", () => ({
  savePendingSession: vi.fn(),
}));

import { savePendingSession } from "./session";
import { fetchLoginMaxEpoch } from "./fetchLoginEpoch";
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

  it("starts OAuth and marks in-flight", async () => {
    const result = await startGoogleZkLogin();
    expect(result).toEqual({ ok: true });
    expect(fetchLoginMaxEpoch).toHaveBeenCalled();
    expect(savePendingSession).toHaveBeenCalled();
    expect(storage["abraxas_zklogin_login_in_flight"]).toBe("1");
    expect(assign).toHaveBeenCalled();
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
