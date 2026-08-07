import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  buildGoogleOAuthUrl,
  getZkLoginRedirectUri,
  isLegacyZkLoginRecoveryConfigured,
  isZkLoginConfigured,
  ZKLOGIN_CALLBACK_PATH,
} from "@/lib/sui/zklogin/config";

const ENV_KEYS = [
  "NEXT_PUBLIC_APP_URL",
  "ABRAXAS_ISSUER_URL",
  "VERCEL_URL",
  "NEXT_PUBLIC_ZKLOGIN_REDIRECT_URI",
  "NEXT_PUBLIC_GOOGLE_ZKLOGIN_CLIENT_ID",
  "NEXT_PUBLIC_GOOGLE_ZKLOGIN_LEGACY_CLIENT_ID",
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

    const oauthState = "signed-oauth-state-token-value";
    const url = buildGoogleOAuthUrl("nonce-test-value", oauthState, "canonical");
    expect(url).toBeTruthy();

    const parsed = new URL(url!);
    expect(parsed.searchParams.get("redirect_uri")).toBe(
      `https://abraxasworld.xyz${ZKLOGIN_CALLBACK_PATH}`,
    );
    expect(parsed.searchParams.get("client_id")).toBe("test-client.apps.googleusercontent.com");
    expect(parsed.searchParams.get("state")).toBe(oauthState);
    expect(url).not.toContain("abraxas-app.vercel.app");
  });

  it("buildGoogleOAuthUrl uses legacy client id with signed OAuth state", () => {
    process.env.NEXT_PUBLIC_GOOGLE_ZKLOGIN_CLIENT_ID = "canonical-client.apps.googleusercontent.com";
    process.env.NEXT_PUBLIC_GOOGLE_ZKLOGIN_LEGACY_CLIENT_ID = "legacy-client.apps.googleusercontent.com";

    vi.stubGlobal("window", {
      location: { origin: "https://abraxasworld.xyz" },
    });

    const oauthState = "signed-legacy-oauth-state";
    const url = buildGoogleOAuthUrl("nonce-legacy", oauthState, "legacy_recovery");
    expect(url).toBeTruthy();
    expect(new URL(url!).searchParams.get("client_id")).toBe("legacy-client.apps.googleusercontent.com");
    expect(new URL(url!).searchParams.get("state")).toBe(oauthState);
  });

  it("buildGoogleOAuthUrl returns null for legacy mode when public legacy client is unset", () => {
    process.env.NEXT_PUBLIC_GOOGLE_ZKLOGIN_CLIENT_ID = "canonical-client.apps.googleusercontent.com";
    delete process.env.NEXT_PUBLIC_GOOGLE_ZKLOGIN_LEGACY_CLIENT_ID;

    vi.stubGlobal("window", {
      location: { origin: "https://abraxasworld.xyz" },
    });

    expect(buildGoogleOAuthUrl("nonce-legacy", "signed-state", "legacy_recovery")).toBeNull();
  });

  it("isZkLoginConfigured reflects embedded NEXT_PUBLIC canonical client id", () => {
    process.env.NEXT_PUBLIC_GOOGLE_ZKLOGIN_CLIENT_ID = "embedded-client.apps.googleusercontent.com";
    expect(isZkLoginConfigured()).toBe(true);
  });

  it("isLegacyZkLoginRecoveryConfigured reflects embedded NEXT_PUBLIC legacy client id", () => {
    process.env.NEXT_PUBLIC_GOOGLE_ZKLOGIN_LEGACY_CLIENT_ID = "legacy-embedded.apps.googleusercontent.com";
    expect(isLegacyZkLoginRecoveryConfigured()).toBe(true);
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
