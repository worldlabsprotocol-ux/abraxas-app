import { afterEach, describe, expect, it, vi } from "vitest";
import { resolveInstitutionalStagingTarget } from "./resolveInstitutionalStagingTarget";

describe("resolveInstitutionalStagingTarget", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("blocks production hosts and missing bypass", () => {
    const result = resolveInstitutionalStagingTarget({
      LAUNCHPAD_STAGING_URL: "https://abraxasworld.xyz",
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.blockers.some((b) => b.includes("blocked production"))).toBe(true);
    }
  });

  it("accepts institutional sandbox base url with bypass", () => {
    const result = resolveInstitutionalStagingTarget({
      INSTITUTIONAL_SANDBOX_BASE_URL: "https://preview-example.vercel.app/",
      VERCEL_PROTECTION_BYPASS: "test-bypass",
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.target.stagingUrl).toBe("https://preview-example.vercel.app");
    }
  });
});
