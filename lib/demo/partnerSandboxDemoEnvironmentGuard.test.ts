// FILE: lib/demo/partnerSandboxDemoEnvironmentGuard.test.ts

import { describe, expect, it } from "vitest";
import { SITE_URL } from "@/lib/siteUrl";
import {
  DEMO_SANDBOX_APP_ORIGIN,
  evaluatePartnerSandboxDemoOriginGate,
  isPartnerSandboxDemoOriginAllowed,
  resolveConfiguredAppOrigin,
} from "@/lib/demo/partnerSandboxDemoEnvironmentGuard";

describe("partnerSandboxDemoEnvironmentGuard", () => {
  it("allows the demo sandbox origin", () => {
    const env = {
      NODE_ENV: "production",
      NEXT_PUBLIC_APP_URL: DEMO_SANDBOX_APP_ORIGIN,
    };

    expect(resolveConfiguredAppOrigin(env)).toBe(DEMO_SANDBOX_APP_ORIGIN);
    expect(evaluatePartnerSandboxDemoOriginGate(env)).toEqual({
      allowed: true,
      origin: DEMO_SANDBOX_APP_ORIGIN,
    });
    expect(isPartnerSandboxDemoOriginAllowed(env)).toBe(true);
  });

  it("blocks the production Abraxas origin even when the demo flag could be enabled", () => {
    const env = {
      NODE_ENV: "production",
      PARTNER_SANDBOX_DEMO_ENABLED: "true",
      NEXT_PUBLIC_APP_URL: SITE_URL,
      ABRAXAS_ISSUER_URL: DEMO_SANDBOX_APP_ORIGIN,
    };

    expect(evaluatePartnerSandboxDemoOriginGate(env)).toEqual({
      allowed: false,
      reason: "production_origin",
    });
    expect(isPartnerSandboxDemoOriginAllowed(env)).toBe(false);
  });

  it("blocks missing and invalid configured origins in production", () => {
    expect(
      evaluatePartnerSandboxDemoOriginGate({
        NODE_ENV: "production",
        PARTNER_SANDBOX_DEMO_ENABLED: "true",
      }),
    ).toEqual({ allowed: false, reason: "origin_not_configured" });

    expect(
      evaluatePartnerSandboxDemoOriginGate({
        NODE_ENV: "production",
        NEXT_PUBLIC_APP_URL: "not-a-valid-origin",
      }),
    ).toEqual({ allowed: false, reason: "invalid_origin" });

    expect(
      evaluatePartnerSandboxDemoOriginGate({
        NODE_ENV: "production",
        NEXT_PUBLIC_APP_URL: "ftp://demo.abraxasworld.xyz",
      }),
    ).toEqual({ allowed: false, reason: "invalid_origin" });
  });

  it("blocks non-demo production-like origins fail-closed", () => {
    expect(
      evaluatePartnerSandboxDemoOriginGate({
        NODE_ENV: "production",
        NEXT_PUBLIC_APP_URL: "https://preview-branch.vercel.app",
      }),
    ).toEqual({ allowed: false, reason: "origin_not_demo" });
  });

  it("allows local development when origin env vars are unset", () => {
    const env = { NODE_ENV: "development" };

    expect(resolveConfiguredAppOrigin(env)).toBe("http://localhost:3000");
    expect(evaluatePartnerSandboxDemoOriginGate(env)).toEqual({
      allowed: true,
      origin: "http://localhost:3000",
    });
    expect(isPartnerSandboxDemoOriginAllowed(env)).toBe(true);
  });

  it("allows localhost and 127.0.0.1 when explicitly configured", () => {
    expect(
      evaluatePartnerSandboxDemoOriginGate({
        NODE_ENV: "production",
        NEXT_PUBLIC_APP_URL: "http://127.0.0.1:3000",
      }),
    ).toEqual({ allowed: true, origin: "http://127.0.0.1:3000" });
  });
});
