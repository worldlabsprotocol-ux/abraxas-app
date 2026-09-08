// FILE: lib/partner/tieredAgePreviewRoute.test.ts

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  GOOD_TROUBLE_BROWSE_POLICY_ID,
  GOOD_TROUBLE_PARTNER_ID,
} from "@/lib/goodTrouble/constants";
import { TIERED_AGE_PREVIEW_PURPOSE } from "@/lib/partner/tieredAgePreview";
import {
  isPartnerHolderPreviewAllowed,
  isTieredAgePreviewAllowed,
} from "@/lib/partner/partnerPreviewGate";

function clearPreviewEnv() {
  vi.unstubAllEnvs();
}

function restorePreviewEnv() {
  vi.unstubAllEnvs();
}

describe("tiered age preview route guard", () => {
  beforeEach(() => clearPreviewEnv());
  afterEach(() => restorePreviewEnv());

  it("is unavailable in Production even when PARTNER_RELEASE_GATE_PREVIEW is set", () => {
    vi.stubEnv("VERCEL_ENV", "production");
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("PARTNER_RELEASE_GATE_PREVIEW", "true");

    expect(isTieredAgePreviewAllowed()).toBe(false);
  });

  it("allows Vercel Preview deployments", () => {
    vi.stubEnv("VERCEL_ENV", "preview");
    vi.stubEnv("NODE_ENV", "production");

    expect(isTieredAgePreviewAllowed()).toBe(true);
  });

  it("allows local development", () => {
    vi.stubEnv("NODE_ENV", "development");

    expect(isTieredAgePreviewAllowed()).toBe(true);
  });

  it("blocks unknown hosted environments without preview or development flags", () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("VERCEL_ENV", "staging");

    expect(isTieredAgePreviewAllowed()).toBe(false);
  });
});

describe("tiered age preview page contract", () => {
  const pageSource = readFileSync(
    resolve(process.cwd(), "app/partner/tiered-age-preview/page.tsx"),
    "utf8",
  );

  it("renders SelfAttestationBrowseForm with Good Trouble browse constants", () => {
    expect(pageSource).toContain("SelfAttestationBrowseForm");
    expect(pageSource).toContain(`partnerId={GOOD_TROUBLE_PARTNER_ID}`);
    expect(pageSource).toContain(`policyId={GOOD_TROUBLE_BROWSE_POLICY_ID}`);
    expect(pageSource).toContain(`purpose={TIERED_AGE_PREVIEW_PURPOSE}`);
    expect(GOOD_TROUBLE_PARTNER_ID).toBe("good-trouble-cannabis");
    expect(GOOD_TROUBLE_BROWSE_POLICY_ID).toBe("good-trouble-browse-v1");
  });

  it("labels the page as preview and excludes purchase eligibility copy", () => {
    expect(pageSource).toContain("Preview only");
    expect(pageSource).toMatch(/does not create[\s\S]*regulated purchase eligibility/);
    expect(pageSource).not.toMatch(/verify_purchase_eligibility|good-trouble-retail-v1/i);
  });

  it("calls notFound when the route guard denies access", () => {
    expect(pageSource).toContain("isTieredAgePreviewAllowed()");
    expect(pageSource).toContain("notFound()");
  });
});

describe("partner holder preview gate parity", () => {
  beforeEach(() => vi.unstubAllEnvs());
  afterEach(() => vi.unstubAllEnvs());

  it("also blocks production for release-gate preview routes", () => {
    vi.stubEnv("VERCEL_ENV", "production");
    vi.stubEnv("PARTNER_RELEASE_GATE_PREVIEW", "true");

    expect(isPartnerHolderPreviewAllowed()).toBe(false);
  });
});
