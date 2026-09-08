// FILE: lib/partner/tieredAgePreviewRoute.test.ts

import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  GOOD_TROUBLE_BROWSE_POLICY_ID,
  GOOD_TROUBLE_PARTNER_ID,
} from "@/lib/goodTrouble/constants";
import {
  isPartnerHolderPreviewAllowed,
  isTieredAgePreviewAllowed,
} from "@/lib/partner/partnerPreviewGate";

const ENV_KEYS = [
  "NODE_ENV",
  "VERCEL_ENV",
  "PARTNER_RELEASE_GATE_PREVIEW",
] as const;

const savedEnv: Partial<Record<(typeof ENV_KEYS)[number], string | undefined>> = {};

function clearPreviewEnv() {
  for (const key of ENV_KEYS) {
    savedEnv[key] = process.env[key];
    delete process.env[key];
  }
}

function restorePreviewEnv() {
  for (const key of ENV_KEYS) {
    if (savedEnv[key] === undefined) {
      delete process.env[key];
    } else {
      process.env[key] = savedEnv[key];
    }
  }
}

describe("tiered age preview route guard", () => {
  beforeEach(() => clearPreviewEnv());
  afterEach(() => restorePreviewEnv());

  it("is unavailable in Production even when PARTNER_RELEASE_GATE_PREVIEW is set", () => {
    process.env.VERCEL_ENV = "production";
    process.env.NODE_ENV = "production";
    process.env.PARTNER_RELEASE_GATE_PREVIEW = "true";

    expect(isTieredAgePreviewAllowed()).toBe(false);
  });

  it("allows Vercel Preview deployments", () => {
    process.env.VERCEL_ENV = "preview";
    process.env.NODE_ENV = "production";

    expect(isTieredAgePreviewAllowed()).toBe(true);
  });

  it("allows local development", () => {
    process.env.NODE_ENV = "development";

    expect(isTieredAgePreviewAllowed()).toBe(true);
  });

  it("blocks unknown hosted environments without preview or development flags", () => {
    process.env.NODE_ENV = "production";
    process.env.VERCEL_ENV = "staging";

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
    expect(pageSource).toContain('TIERED_AGE_PREVIEW_PURPOSE = "browse"');
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
  beforeEach(() => clearPreviewEnv());
  afterEach(() => restorePreviewEnv());

  it("also blocks production for release-gate preview routes", () => {
    process.env.VERCEL_ENV = "production";
    process.env.PARTNER_RELEASE_GATE_PREVIEW = "true";

    expect(isPartnerHolderPreviewAllowed()).toBe(false);
  });
});
