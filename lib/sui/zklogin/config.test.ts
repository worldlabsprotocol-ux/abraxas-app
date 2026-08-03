import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  buildGoogleOAuthUrl,
  getZkLoginRedirectUri,
  ZKLOGIN_CALLBACK_PATH,
} from "@/lib/sui/zklogin/config";

const ENV_KEYS = [
  "NEXT_PUBLIC_APP_URL",
  "ABRAXAS_ISSUER_URL",
  "VERCEL_URL",
  "NEXT_PUBLIC_ZKLOGIN_REDIRECT_URI",
  "NEXT_PUBLIC_GOOGLE_ZKLOGIN_CLIENT_ID",
] as const;

describe("zkLogin OAuth redirect URI — same-origin", () => {
  const saved: Partial<Record<typeof ENV_KEYS[number], string | undefined>> = {};

  beforeEach(() => {
    for (const key of ENV_KEYS) {
      saved[key] = process.env[key];
      delete process.env[key];
    }
    vi.unstubAllGlobals();
  });

  afterEach(() => {
    for (const key of ENV_KEYS) {
      if (saved[key] === undefined) delete process.env[key];
      else process.env[key] = saved[key];
    }
    vi.unstubAllGlobals();
  });

  it("uses browser origin on production canonical host", () => {
    vi.stubGlobal("window", {
      location: { origin: "https://abraxasworld.xyz" },
    });

    expect(getZkLoginRedirectUri()).toBe(
      `https://abraxasworld.xyz${ZKLOGIN_CALLBACK_PATH}`,
    );
  });

  it("uses browser origin on Vercel preview host", () => {
    vi.stubGlobal("window", {
      location: { origin: "https://abraxas-app-preview.vercel.app" },
    });

    expect(getZkLoginRedirectUri()).toBe(
      `https://abraxas-app-preview.vercel.app${ZKLOGIN_CALLBACK_PATH}`,
    );
  });

  it("uses browser origin on localhost development", () => {
    vi.stubGlobal("window", {
      location: { origin: "http://localhost:3000" },
    });

    expect(getZkLoginRedirectUri()).toBe(
      `http://localhost:3000${ZKLOGIN_CALLBACK_PATH}`,
    );
  });

  it("ignores pinned NEXT_PUBLIC_ZKLOGIN_REDIRECT_URI on the client", () => {
    process.env.NEXT_PUBLIC_ZKLOGIN_REDIRECT_URI =
      "https://abraxas-app.vercel.app/auth/zklogin/callback";

    vi.stubGlobal("window", {
      location: { origin: "https://abraxasworld.xyz" },
    });

    expect(getZkLoginRedirectUri()).toBe(
      `https://abraxasworld.xyz${ZKLOGIN_CALLBACK_PATH}`,
    );
  });

  it("buildGoogleOAuthUrl encodes same-origin redirect_uri for canonical production", () => {
    process.env.NEXT_PUBLIC_GOOGLE_ZKLOGIN_CLIENT_ID = "test-client.apps.googleusercontent.com";

    vi.stubGlobal("window", {
      location: { origin: "https://abraxasworld.xyz" },
    });

    const url = buildGoogleOAuthUrl("nonce-test-value");
    expect(url).toBeTruthy();

    const parsed = new URL(url!);
    expect(parsed.searchParams.get("redirect_uri")).toBe(
      `https://abraxasworld.xyz${ZKLOGIN_CALLBACK_PATH}`,
    );
    expect(url).not.toContain("abraxas-app.vercel.app");
  });

  it("server-side redirect uses NEXT_PUBLIC_APP_URL when set", () => {
    process.env.NEXT_PUBLIC_APP_URL = "https://abraxasworld.xyz";

    expect(getZkLoginRedirectUri()).toBe(
      `https://abraxasworld.xyz${ZKLOGIN_CALLBACK_PATH}`,
    );
  });

  it("server-side redirect uses VERCEL_URL for preview builds", () => {
    process.env.VERCEL_URL = "abraxas-app-preview.vercel.app";

    expect(getZkLoginRedirectUri()).toBe(
      `https://abraxas-app-preview.vercel.app${ZKLOGIN_CALLBACK_PATH}`,
    );
  });
});
