import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { resolveConnectDomain } from "@/lib/walletAuthority/service";
import { SITE_URL } from "@/lib/siteUrl";

const CANONICAL_HOST = new URL(SITE_URL).host;
const STALE_HOST = "abraxas-app.vercel.app";
const PREVIEW_HOST = "abraxas-app-preview.vercel.app";

describe("resolveConnectDomain", () => {
  const envKeys = ["NEXT_PUBLIC_APP_URL", "ABRAXAS_ISSUER_URL", "VERCEL_URL"] as const;
  const savedEnv: Partial<Record<typeof envKeys[number], string | undefined>> = {};

  beforeEach(() => {
    for (const key of envKeys) {
      savedEnv[key] = process.env[key];
      delete process.env[key];
    }
  });

  afterEach(() => {
    for (const key of envKeys) {
      if (savedEnv[key] === undefined) delete process.env[key];
      else process.env[key] = savedEnv[key];
    }
  });

  it("uses canonical production host when no env overrides are set", () => {
    expect(resolveConnectDomain()).toBe(CANONICAL_HOST);
    expect(resolveConnectDomain()).not.toBe(STALE_HOST);
  });

  it("uses trusted preview host from VERCEL_URL", () => {
    process.env.VERCEL_URL = PREVIEW_HOST;
    expect(resolveConnectDomain()).toBe(PREVIEW_HOST);
  });

  it("uses NEXT_PUBLIC_APP_URL when configured", () => {
    process.env.NEXT_PUBLIC_APP_URL = "http://localhost:3000";
    expect(resolveConnectDomain()).toBe("localhost:3000");
  });

  it("never falls back to stale abraxas-app.vercel.app", () => {
    expect(resolveConnectDomain()).not.toContain(STALE_HOST);
    process.env.VERCEL_URL = PREVIEW_HOST;
    expect(resolveConnectDomain()).not.toContain(STALE_HOST);
  });
});
