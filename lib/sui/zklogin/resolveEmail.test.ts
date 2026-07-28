// FILE: lib/sui/zklogin/resolveEmail.test.ts

import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@mysten/sui/zklogin", () => ({
  decodeJwt: vi.fn(),
}));

vi.mock("./session", () => ({
  loadUserSession: vi.fn(),
  saveUserSession: vi.fn(),
}));

vi.mock("./signingSession", () => ({
  loadSigningSession: vi.fn(),
}));

vi.mock("./authDebug", () => ({
  logAuthEvent: vi.fn(),
}));

import { decodeJwt } from "@mysten/sui/zklogin";
import { loadUserSession, saveUserSession } from "./session";
import { loadSigningSession } from "./signingSession";
import { readLocalZkLoginEmail, resolveZkLoginEmail } from "./resolveEmail";

describe("resolveEmail", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal("fetch", vi.fn());
  });

  it("returns email from user session", () => {
    vi.mocked(loadUserSession).mockReturnValue({
      suiAddress: "0xabc",
      provider: "google",
      oauthSub: "sub",
      email: "user@example.com",
      maxEpoch: 1,
      loggedInAt: new Date().toISOString(),
    });

    expect(readLocalZkLoginEmail()).toBe("user@example.com");
  });

  it("hydrates email from signing id_token", () => {
    vi.mocked(loadUserSession).mockReturnValue({
      suiAddress: "0xabc",
      provider: "google",
      oauthSub: "sub",
      maxEpoch: 1,
      loggedInAt: new Date().toISOString(),
    });
    vi.mocked(decodeJwt).mockReturnValue({ sub: "sub", email: "from-jwt@example.com" } as never);
    vi.mocked(loadSigningSession).mockReturnValue({
      suiAddress: "0xabc",
      idToken: "token",
      userSalt: "1",
      jwtRandomness: "r",
      maxEpoch: 1,
    });

    expect(readLocalZkLoginEmail()).toBe("from-jwt@example.com");
    expect(saveUserSession).toHaveBeenCalled();
  });

  it("syncs email via API when local stores are empty", async () => {
    vi.mocked(loadUserSession).mockReturnValue({
      suiAddress: "0xabc",
      provider: "google",
      oauthSub: "sub",
      maxEpoch: 1,
      loggedInAt: new Date().toISOString(),
    });
    vi.mocked(decodeJwt).mockReturnValue({ sub: "sub" } as never);
    vi.mocked(loadSigningSession).mockReturnValue({
      suiAddress: "0xabc",
      idToken: "token",
      userSalt: "1",
      jwtRandomness: "r",
      maxEpoch: 1,
    });

    vi.mocked(fetch)
      .mockResolvedValueOnce(new Response(JSON.stringify({ email: null }), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ email: "synced@example.com" }), { status: 200 }));

    const email = await resolveZkLoginEmail("0xabc");
    expect(email).toBe("synced@example.com");
    expect(fetch).toHaveBeenCalledWith("/api/auth/zklogin/sync-email", expect.objectContaining({ method: "POST" }));
  });
});
