// @vitest-environment jsdom
// FILE: lib/wayfinding/holderJourneyBatch1.test.ts
// Regression guards for Phase 9 Batch 1 holder journey integrity.

import "@testing-library/jest-dom/vitest";
import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import React from "react";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  DASHBOARD_LEGACY_BODY,
  DASHBOARD_LEGACY_TITLE,
  FOOTER_PASSPORT_TOOLS_LABEL,
  FOOTER_TAGLINE,
  HOLDER_ACCOUNT_SIGNED_OUT_SUBHEAD,
  HOLDER_ACCOUNT_SUBHEAD,
  HOLDER_ACCOUNT_TITLE,
  HOLDER_ACCOUNT_ERROR_BODY,
  HOLDER_ACCOUNT_ERROR_TITLE,
  HOLDER_VERIFIED_HERO_SECONDARY_CTA,
  HOLDER_VERIFY_CREDENTIAL_PATH,
  HOLDER_VERIFY_DEFAULT_PATH,
  NAV_PARTNER_VERIFY_LABEL,
  PARTNER_CONVERSION_FORBIDDEN_TERMS,
  PARTNER_RECEIPT_VERIFIER_PATH,
} from "@/lib/integrate/partnerJourney";

const ROOT = resolve(__dirname, "../..");

const PROTECTED_PATHS = [
  "lib/integrate/partnerJourney.ts",
  "app/account/page.tsx",
  "app/dashboard/page.tsx",
  "components/passport/PassportDashboard.tsx",
  "components/passport/PassportSetupPanel.tsx",
  "components/passport/PassportVerifiedHero.tsx",
  "components/redesign/RedesignNav.tsx",
  "components/redesign/RedesignFooter.tsx",
  "components/sui/NavProfileMenu.tsx",
] as const;

const HOLDER_SURFACES = [
  "components/passport/PassportDashboard.tsx",
  "components/passport/PassportSetupPanel.tsx",
  "components/passport/PassportVerifiedHero.tsx",
  "app/account/page.tsx",
] as const;

function read(rel: string): string {
  const path = resolve(ROOT, rel);
  expect(existsSync(path), `missing protected file: ${rel}`).toBe(true);
  return readFileSync(path, "utf8");
}

function assertNoPositiveForbiddenTerm(text: string) {
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

vi.mock("next/image", () => ({
  default: (props: Record<string, unknown>) => React.createElement("img", props),
}));

vi.mock("@/components/LanguageSelector", () => ({
  LanguageSelector: () => null,
}));

vi.mock("@/components/sui/NavProfileMenu", () => ({
  NavProfileMenu: () => null,
  NavSignInButton: () => null,
}));

vi.mock("@/components/sui/SuiAuthProvider", () => ({
  useSuiAuthOptional: () => ({ suiAddress: null }),
}));

vi.mock("@/components/WalletContextProvider", () => ({
  WalletContextProvider: ({ children }: { children: React.ReactNode }) =>
    React.createElement("div", null, children),
}));

vi.mock("@/components/redesign/RedesignFooter", () => ({
  RedesignFooter: () => null,
}));

vi.mock("@/components/redesign/AmbientGlow", () => ({
  AmbientGlow: () => null,
}));

vi.mock("@/components/redesign/RedesignNav", () => ({
  RedesignNav: () => null,
}));

afterEach(() => {
  cleanup();
});

describe("phase 9 holder journey batch 1", () => {
  it("protects exactly ten batch paths including this test file", () => {
    expect(PROTECTED_PATHS).toHaveLength(9);
    expect(existsSync(resolve(ROOT, "lib/wayfinding/holderJourneyBatch1.test.ts"))).toBe(true);
  });

  it("exports holder journey constants", () => {
    expect(HOLDER_VERIFY_DEFAULT_PATH).toBe("/passport?view=verify&mode=registry");
    expect(HOLDER_VERIFY_CREDENTIAL_PATH).toBe("/passport?view=verify&mode=credential");
    expect(HOLDER_ACCOUNT_TITLE).toContain("Passport status");
    expect(FOOTER_PASSPORT_TOOLS_LABEL).toBe("Passport tools");
    expect(NAV_PARTNER_VERIFY_LABEL).toBe("Partner verify");
    expect(DASHBOARD_LEGACY_TITLE).toContain("moved");
  });

  it("keeps public nav focused on Home, Passport, and For businesses", () => {
    const nav = read("components/redesign/RedesignNav.tsx");
    expect(nav).toContain("PUBLIC_NAV_LINKS");
    expect(nav).toContain("For businesses");
    expect(nav).not.toContain("NAV_PARTNER_VERIFY_LABEL");
    expect(nav).not.toMatch(/href:\s*"\/verify"/);
  });

  it("routes footer product links to passport and businesses surfaces", () => {
    const footer = read("components/redesign/RedesignFooter.tsx");
    expect(footer).toContain("FOOTER_PRODUCT_LINKS");
    expect(footer).toContain("FOOTER_DEVELOPER_LINKS");
    expect(footer).not.toContain("Tokenize");
    expect(footer).not.toMatch(/href:\s*"\/verify"/);
  });

  it("does not send holders to /verify from protected passport and account surfaces", () => {
    for (const rel of HOLDER_SURFACES) {
      const src = read(rel);
      expect(src, rel).not.toMatch(/href="\/verify"/);
      expect(src, rel).not.toMatch(/href="\/verify\?/);
    }
    const account = read("app/account/page.tsx");
    expect(account).toContain("HOLDER_VERIFY_DEFAULT_PATH");
    expect(account).toContain("HOLDER_VERIFY_CREDENTIAL_PATH");
  });

  it("dashboard is a legacy transition screen without demo pipeline imports", () => {
    const dashboard = read("app/dashboard/page.tsx");
    expect(dashboard).toContain("DASHBOARD_LEGACY_TITLE");
    expect(dashboard).toContain("DASHBOARD_LEGACY_BODY");
    expect(dashboard).not.toContain("$2M");
    expect(dashboard).not.toContain("userAssetStore");
    expect(dashboard).not.toContain("SophiaCircuit");
    expect(dashboard).not.toContain("PurchaseLifecycleAdmin");
    expect(dashboard).not.toContain("MyAbraxas");
    expect(dashboard).not.toContain("localStorage");
    expect(dashboard).toContain('href="/passport"');
  });

  it("account page supports error retry and avoids partner-ready claims", () => {
    const account = read("app/account/page.tsx");
    expect(account).toContain("isError");
    expect(account).toContain("refetch");
    expect(account).not.toContain("Ready to transact");
    expect(account).not.toContain("Partner-ready");
    expect(account).not.toContain("server-backed");
  });

  it("profile menu keeps holder verify path separate from account", () => {
    const menu = read("components/sui/NavProfileMenu.tsx");
    expect(menu).toContain("HOLDER_VERIFY_DEFAULT_PATH");
    expect(menu).toContain("Status summary and wallet");
  });

  it("protected copy avoids forbidden marketing terms", () => {
    const uiCorpus = PROTECTED_PATHS
      .filter((p) => p !== "lib/integrate/partnerJourney.ts")
      .map(read)
      .join("\n");
    const holderConstants = [
      DASHBOARD_LEGACY_BODY,
      DASHBOARD_LEGACY_TITLE,
      HOLDER_ACCOUNT_TITLE,
      HOLDER_ACCOUNT_SUBHEAD,
      HOLDER_ACCOUNT_SIGNED_OUT_SUBHEAD,
      HOLDER_ACCOUNT_ERROR_TITLE,
      HOLDER_ACCOUNT_ERROR_BODY,
      HOLDER_VERIFIED_HERO_SECONDARY_CTA,
      FOOTER_TAGLINE,
      FOOTER_PASSPORT_TOOLS_LABEL,
      NAV_PARTNER_VERIFY_LABEL,
    ].join("\n");
    assertNoPositiveForbiddenTerm(`${uiCorpus}\n${holderConstants}`);
  });

  it("renders dashboard legacy transition copy", async () => {
    const { default: DashboardPage } = await import("@/app/dashboard/page");
    render(React.createElement(DashboardPage));
    expect(screen.getByRole("heading", { name: DASHBOARD_LEGACY_TITLE })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Open Passport/i })).toHaveAttribute("href", "/passport");
  });

  it("keeps receipt tester path available outside primary navigation", () => {
    expect(PARTNER_RECEIPT_VERIFIER_PATH).toBe("/verify?mode=receipt");
    const nav = read("components/redesign/RedesignNav.tsx");
    expect(nav).not.toMatch(/href:\s*"\/verify"/);
    const footer = read("components/redesign/RedesignFooter.tsx");
    const footerLinks = read("lib/design/footerLinks.ts");
    expect(footer).toContain("FOOTER_DEVELOPER_LINKS");
    expect(footerLinks).toContain("Receipt verification");
    expect(footerLinks).toContain("/verify?mode=receipt");
  });
});
