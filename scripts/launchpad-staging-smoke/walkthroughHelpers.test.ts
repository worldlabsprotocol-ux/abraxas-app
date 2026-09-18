// FILE: scripts/launchpad-staging-smoke/walkthroughHelpers.test.ts

import { describe, expect, it } from "vitest";

function isCredentialRejected(status: number): boolean {
  return status === 401 || status === 403;
}

function buildVercelBypassHeaders(bypass?: string): Record<string, string> {
  if (!bypass) return {};
  return {
    "x-vercel-protection-bypass": bypass,
    "x-vercel-set-bypass-cookie": "true",
  };
}

describe("launchpad staging smoke helpers", () => {
  it("treats Abraxas 401 and revoked-key 403 as credential rejection", () => {
    expect(isCredentialRejected(401)).toBe(true);
    expect(isCredentialRejected(403)).toBe(true);
    expect(isCredentialRejected(200)).toBe(false);
  });

  it("builds Vercel bypass headers without echoing token in keys", () => {
    expect(buildVercelBypassHeaders()).toEqual({});
    const headers = buildVercelBypassHeaders("secret-token");
    expect(headers["x-vercel-protection-bypass"]).toBe("secret-token");
    expect(headers["x-vercel-set-bypass-cookie"]).toBe("true");
    expect(Object.keys(headers)).toEqual([
      "x-vercel-protection-bypass",
      "x-vercel-set-bypass-cookie",
    ]);
  });
});
