// @vitest-environment jsdom
// FILE: lib/wayfinding/partnerConversionBatch1.test.ts
// Regression guards for Phase 7 Batch 1 partner/holder wayfinding.

import "@testing-library/jest-dom/vitest";
import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import React from "react";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  EXTERNAL_RP_ONBOARDING_STEPS,
} from "@/lib/externalRelyingPartyIntegration";
import {
  HOLDER_VERIFY_DEFAULT_PATH,
  HOLDER_VERIFY_SUBHEAD,
  INTEGRATOR_SANDBOX_BOUNDARY,
  INTEGRATOR_START_HERE_STEPS,
  PARTNER_APPLICATION_PATH,
  PARTNER_CONVERSION_FORBIDDEN_TERMS,
  PARTNER_RECEIPT_VERIFIER_PATH,
  VERIFY_HUB_HEADLINE,
  VERIFY_HUB_SUBHEAD,
} from "@/lib/integrate/partnerJourney";
import { PassportPageTabs } from "@/components/passport/PassportPageTabs";

const ROOT = resolve(__dirname, "../..");

const PROTECTED_PATHS = [
  "components/verify/VerifyPageIntro.tsx",
  "app/verify/page.tsx",
  "app/verify/VerifyClient.tsx",
  "components/passport/PassportPageTabs.tsx",
  "components/sui/NavProfileMenu.tsx",
  "app/passport/page.tsx",
  "lib/integrate/partnerJourney.ts",
  "lib/externalRelyingPartyIntegration.ts",
  "app/design-partner/page.tsx",
] as const;

function read(rel: string): string {
  const path = resolve(ROOT, rel);
  expect(existsSync(path), `missing protected file: ${rel}`).toBe(true);
  return readFileSync(path, "utf8");
}

function assertNoForbiddenTerms(text: string) {
  const lower = text.toLowerCase();
  for (const term of PARTNER_CONVERSION_FORBIDDEN_TERMS) {
    const needle = term.toLowerCase();
    let from = 0;
    while (true) {
      const idx = lower.indexOf(needle, from);
      if (idx === -1) break;
      const window = lower.slice(Math.max(0, idx - 16), idx);
      const negated = /(?:^|\s)no\s+$/.test(window);
      expect(negated, `forbidden term: ${term}`).toBe(true);
      from = idx + needle.length;
    }
  }
}

vi.mock("next/navigation", () => ({
  usePathname: () => "/verify",
  useSearchParams: () => new URLSearchParams("mode=receipt"),
}));

vi.mock("next/link", () => ({
  default: ({
    href,
    children,
    ...props
  }: {
    href: string;
    children: React.ReactNode;
  }) => React.createElement("a", { href, ...props }, children),
}));

afterEach(() => {
  cleanup();
});

describe("phase 7 partner conversion batch 1", () => {
  it("touches exactly the protected product paths", () => {
    for (const rel of PROTECTED_PATHS) {
      expect(existsSync(resolve(ROOT, rel)), rel).toBe(true);
    }
    expect(PROTECTED_PATHS).toHaveLength(9);
  });

  it("uses canonical apply path across partner journey and external onboarding", () => {
    expect(PARTNER_APPLICATION_PATH).toBe("/integrations#apply");
    expect(INTEGRATOR_START_HERE_STEPS[0]?.cta.href).toBe(PARTNER_APPLICATION_PATH);
    expect(EXTERNAL_RP_ONBOARDING_STEPS[0]?.body).toContain(PARTNER_APPLICATION_PATH);
    expect(EXTERNAL_RP_ONBOARDING_STEPS[0]?.body.toLowerCase()).toContain("manual");
    expect(EXTERNAL_RP_ONBOARDING_STEPS[0]?.body.toLowerCase()).toContain("no automatic api-key issuance");
    expect(read("app/design-partner/page.tsx")).toContain("PARTNER_APPLICATION_PATH");
    expect(read("app/design-partner/page.tsx")).not.toMatch(/href="\/design-partner"/);
  });

  it("routes holders away from partner receipt verifier as the default nav target", () => {
    const nav = read("components/sui/NavProfileMenu.tsx");
    expect(nav).toContain("HOLDER_VERIFY_DEFAULT_PATH");
    expect(nav).toContain("My records & credentials");
    expect(nav).not.toContain('href: "/verify"');
    expect(nav).not.toContain("Verify a record");

    const passport = read("app/passport/page.tsx");
    expect(passport).toContain("HOLDER_VERIFY_DEFAULT_PATH");
    expect(passport).not.toMatch(/Btn href="\/verify"/);

    const verifyIntro = read("components/verify/VerifyPageIntro.tsx");
    expect(verifyIntro).toContain("HOLDER_VERIFY_DEFAULT_PATH");
  });

  it("keeps holder copy conservative and partner receipt path explicit", () => {
    expect(HOLDER_VERIFY_SUBHEAD).toContain(
      "Look up public registry records or test a credential JWT against documented claims.",
    );
    expect(HOLDER_VERIFY_SUBHEAD.toLowerCase()).not.toContain("tied to your passport");

    const verifyClient = read("app/verify/VerifyClient.tsx");
    expect(verifyClient).toContain("HOLDER_VERIFY_SUBHEAD");
    expect(verifyClient).toContain("PARTNER_RECEIPT_VERIFIER_PATH");
    expect(verifyClient).not.toContain("tied to your Passport");
  });

  it("places verification demos below live tools on /verify", () => {
    const page = read("app/verify/page.tsx");
    const introIdx = page.indexOf("<VerifyPageIntro");
    const clientIdx = page.indexOf("<VerifyClient");
    const demoIdx = page.indexOf("<VerifyPageIntroDemo");
    expect(introIdx).toBeGreaterThan(-1);
    expect(clientIdx).toBeGreaterThan(introIdx);
    expect(demoIdx).toBeGreaterThan(clientIdx);
    expect(page).toContain("Reference demos (below the live tools)");
  });

  it("labels passport tabs for partner vs holder contexts", () => {
    render(React.createElement(PassportPageTabs, { active: "verify" }));
    expect(screen.getByRole("link", { name: "My Passport" })).toHaveAttribute("href", "/passport");
    expect(screen.getByRole("link", { name: "Partner verifier" })).toHaveAttribute(
      "href",
      PARTNER_RECEIPT_VERIFIER_PATH,
    );
    expect(screen.getByRole("link", { name: "Holder tools" })).toHaveAttribute(
      "href",
      HOLDER_VERIFY_DEFAULT_PATH,
    );
  });

  it("avoids forbidden partner marketing terms on touched surfaces", () => {
    const renderedCopy = [
      VERIFY_HUB_HEADLINE,
      VERIFY_HUB_SUBHEAD,
      HOLDER_VERIFY_SUBHEAD,
      ...INTEGRATOR_START_HERE_STEPS.map((s) => `${s.title} ${s.body}`),
      ...Object.values(INTEGRATOR_SANDBOX_BOUNDARY),
      ...EXTERNAL_RP_ONBOARDING_STEPS.map((s) => `${s.title} ${s.body}`),
    ].join("\n");
    assertNoForbiddenTerms(renderedCopy);
  });

  it("does not introduce partnerConversionCopy module", () => {
    expect(existsSync(resolve(ROOT, "lib/wayfinding/partnerConversionCopy.ts"))).toBe(false);
  });
});
