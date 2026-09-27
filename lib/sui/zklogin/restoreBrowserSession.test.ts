import { describe, expect, it, vi } from "vitest";
import { restoreUserSessionFromBrowserSession } from "./restoreBrowserSession";

const ADDRESS = `0x${"a".repeat(64)}`;

describe("restoreUserSessionFromBrowserSession", () => {
  it("restores holder UI state from the secure browser session", async () => {
    const fetcher = vi.fn(async () => new Response(JSON.stringify({
      sui_address: ADDRESS,
      email: "holder@example.com",
      provider: "google",
    }), { status: 200 })) as unknown as typeof fetch;

    const restored = await restoreUserSessionFromBrowserSession(fetcher);

    expect(fetcher).toHaveBeenCalledWith("/api/auth/zklogin/me", {
      method: "GET",
      credentials: "include",
      cache: "no-store",
    });
    expect(restored).toMatchObject({
      suiAddress: ADDRESS,
      email: "holder@example.com",
      provider: "google",
      maxEpoch: 0,
    });
    expect(restored).not.toHaveProperty("oauthSub");
  });

  it("does not restore when the secure browser session is absent", async () => {
    const fetcher = vi.fn(async () => new Response(JSON.stringify({
      error: "Sign in required in this browser",
    }), { status: 401 })) as unknown as typeof fetch;

    await expect(restoreUserSessionFromBrowserSession(fetcher)).resolves.toBeNull();
  });

  it("rejects malformed profile data instead of trusting it", async () => {
    const fetcher = vi.fn(async () => new Response(JSON.stringify({
      sui_address: "not-a-sui-address",
      email: "holder@example.com",
    }), { status: 200 })) as unknown as typeof fetch;

    await expect(restoreUserSessionFromBrowserSession(fetcher)).resolves.toBeNull();
  });
});
