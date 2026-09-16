// FILE: scripts/launchpad-staging-smoke/guards.test.ts

import { describe, expect, it } from "vitest";
import { isVercelDeploymentProtection, parseStagingTargetFromEnv } from "./guards";

describe("launchpad staging guards", () => {
  it("requires explicit target and supabase ref", () => {
    expect(() => parseStagingTargetFromEnv()).toThrow(/LAUNCHPAD_STAGING_URL/);
  });

  it("detects Vercel deployment protection JSON", () => {
    expect(
      isVercelDeploymentProtection(
        401,
        { protection: { vercel_auth_enabled: true, vercel_auth_callback: "https://vercel.com/sso-api?url=x" } },
        {},
      ),
    ).toBe(true);
  });

  it("detects Vercel SSO redirect", () => {
    expect(
      isVercelDeploymentProtection(302, null, { location: "https://vercel.com/sso-api?url=x" }),
    ).toBe(true);
  });
});
