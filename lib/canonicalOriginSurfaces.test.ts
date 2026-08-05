import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { SITE_URL } from "@/lib/siteUrl";
import {
  GOOD_TROUBLE_BATCH_VERIFY_EXAMPLE,
  GOOD_TROUBLE_VERIFY_EXAMPLE,
} from "@/lib/goodTrouble/retailEligibility";
import { INTEGRATION_SDK_SNIPPET } from "@/lib/protocolIntegrations";

const ROOT = join(__dirname, "..");
const STALE_HOST = "abraxas-app.vercel.app";

describe("canonicalOriginSurfaces", () => {
  it("uses abraxasworld.xyz as SITE_URL constant", () => {
    expect(SITE_URL).toBe("https://abraxasworld.xyz");
  });

  it("production-readiness-audit defaults to SITE_URL with AUDIT_BASE_URL override", () => {
    const src = readFileSync(join(ROOT, "scripts/production-readiness-audit.ts"), "utf8");
    expect(src).toContain("AUDIT_BASE_URL");
    expect(src).toContain("SITE_URL");
    expect(src).not.toContain(`?? "https://${STALE_HOST}"`);
    expect(src).not.toContain(STALE_HOST);
  });

  it("retail eligibility examples use canonical host only", () => {
    expect(GOOD_TROUBLE_VERIFY_EXAMPLE).toContain(SITE_URL);
    expect(GOOD_TROUBLE_BATCH_VERIFY_EXAMPLE).toContain(SITE_URL);
    expect(GOOD_TROUBLE_VERIFY_EXAMPLE).not.toContain(STALE_HOST);
    expect(GOOD_TROUBLE_BATCH_VERIFY_EXAMPLE).not.toContain(STALE_HOST);
  });

  it("protocol integration SDK snippet uses canonical host only", () => {
    expect(INTEGRATION_SDK_SNIPPET).toContain(SITE_URL);
    expect(INTEGRATION_SDK_SNIPPET).not.toContain(STALE_HOST);
  });

  it("SiteFooter links to canonical host only", () => {
    const footer = readFileSync(join(ROOT, "components/SiteFooter.tsx"), "utf8");
    expect(footer).toContain("SITE_URL");
    expect(footer).toContain("abraxasworld.xyz");
    expect(footer).not.toContain(STALE_HOST);
  });
});
