// @vitest-environment jsdom
// FILE: lib/wayfinding/holderLinkIntegrityBatch1.test.ts
// Regression guards for Phase 10 Batch 1 cross-surface holder link integrity.

import "@testing-library/jest-dom/vitest";
import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import React from "react";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  APPLE_WALLET_HEADLINE,
  BOTTOM_NAV_ACCOUNT_HREF,
  HOLDER_VERIFY_DEFAULT_PATH,
  PARTNERS_REFERENCE_ONLY_NOTE,
  PAYMENT_RETURN_LEAD,
  PAYMENT_RETURN_PRIMARY_CTA,
  PAYMENT_RETURN_SECONDARY_CTA,
  PAYMENT_RETURN_SECONDARY_HREF,
} from "@/lib/integrate/partnerJourney";

const ROOT = resolve(__dirname, "../..");

const PROTECTED_PATHS = [
  "lib/integrate/partnerJourney.ts",
  "components/BottomNav.tsx",
  "components/SiteFooter.tsx",
  "app/payment/success/page.tsx",
  "components/passport/AddToAppleWallet.tsx",
  "components/home/HomeSignedInModule.tsx",
  "app/verify/error.tsx",
  "app/partners/page.tsx",
  "components/passport/PassportSetupPanel.tsx",
] as const;

const HOLDER_ACTION_SURFACES = [
  "components/passport/AddToAppleWallet.tsx",
  "components/home/HomeSignedInModule.tsx",
  "components/passport/PassportSetupPanel.tsx",
] as const;

function read(rel: string): string {
  const path = resolve(ROOT, rel);
  expect(existsSync(path), `missing protected file: ${rel}`).toBe(true);
  return readFileSync(path, "utf8");
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

vi.mock("next/navigation", () => ({
  useSearchParams: () => new URLSearchParams("product=asset_verification"),
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

describe("phase 10 holder link integrity batch 1", () => {
  it("protects exactly ten batch paths including this test file", () => {
    expect(PROTECTED_PATHS).toHaveLength(9);
    expect(existsSync(resolve(ROOT, "lib/wayfinding/holderLinkIntegrityBatch1.test.ts"))).toBe(true);
  });

  it("routes BottomNav account item to /account not /dashboard", () => {
    const nav = read("components/BottomNav.tsx");
    const journey = read("lib/integrate/partnerJourney.ts");
    expect(nav).toContain("BOTTOM_NAV_ACCOUNT_HREF");
    expect(nav).toContain("BOTTOM_NAV_ACCOUNT_LABEL");
    expect(journey).toContain(`export const BOTTOM_NAV_ACCOUNT_HREF = "${BOTTOM_NAV_ACCOUNT_HREF}"`);
    expect(nav).not.toContain('href: "/dashboard"');
    expect(nav).not.toContain("/dashboard");
  });

  it("removes dashboard from SiteFooter and uses policy-outcome tagline", () => {
    const footer = read("components/SiteFooter.tsx");
    expect(footer).toContain("FOOTER_TAGLINE");
    expect(footer).not.toContain('href: "/dashboard"');
    expect(footer).not.toContain("Dashboard");
  });

  it("payment success does not claim payment was recorded, received, or confirmed", () => {
    const page = read("app/payment/success/page.tsx");
    const journey = read("lib/integrate/partnerJourney.ts");
    const lower = page.toLowerCase();
    expect(page).toContain("PAYMENT_RETURN_LEAD");
    expect(journey.toLowerCase()).toContain(PAYMENT_RETURN_LEAD.toLowerCase());
    expect(lower).not.toContain("payment confirmed");
    expect(lower).not.toContain("payment received");
    expect(lower).not.toContain("payment recorded");
    expect(lower).not.toContain("successfully processed");
    expect(page).toContain('href="/passport"');
    expect(page).toContain("PAYMENT_RETURN_PRIMARY_CTA");
    expect(page).toContain("PAYMENT_RETURN_SECONDARY_HREF");
    expect(page).not.toContain('href="/terminal"');
    expect(journey).toContain(PAYMENT_RETURN_SECONDARY_CTA);
  });

  it("apple wallet copy has no internal configuration terms and no /verify links", () => {
    const wallet = read("components/passport/AddToAppleWallet.tsx");
    const journey = read("lib/integrate/partnerJourney.ts");
    expect(wallet).toContain("APPLE_WALLET_HEADLINE");
    expect(journey).toContain(APPLE_WALLET_HEADLINE);
    expect(wallet.toLowerCase()).not.toContain("pass type id");
    expect(wallet.toLowerCase()).not.toContain("signing cert");
    expect(wallet.toLowerCase()).not.toContain("certificate");
    expect(wallet).not.toMatch(/href="\/verify"/);
    expect(wallet).toContain("APPLE_WALLET_RETRY_LABEL");
    expect(wallet).toContain("HOLDER_VERIFY_CREDENTIAL_PATH");
  });

  it("home signed-in module removes tab=wallets and links wallet actions to /passport", () => {
    const home = read("components/home/HomeSignedInModule.tsx");
    expect(home).not.toContain("tab=wallets");
    expect(home).toContain("HOME_WALLET_HREF");
    expect(home).not.toMatch(/href="\/verify"/);
  });

  it("verify error keeps partner recovery and adds holder escape to Passport", () => {
    const err = read("app/verify/error.tsx");
    expect(err).toContain('href="/verify"');
    expect(err).toContain("HOLDER_VERIFY_DEFAULT_PATH");
    expect(err).toContain("VERIFY_ERROR_HOLDER_LINK_LABEL");
  });

  it("partners CV5 reference copy makes no support or contact promise", () => {
    const partners = read("app/partners/page.tsx");
    const journey = read("lib/integrate/partnerJourney.ts");
    expect(partners).toContain("PARTNERS_REFERENCE_ONLY_NOTE");
    expect(journey).toContain(PARTNERS_REFERENCE_ONLY_NOTE);
    expect(partners).not.toContain('url: "#"');
    expect(partners.toLowerCase()).not.toContain("contact ");
    expect(partners.toLowerCase()).not.toContain("operator");
    expect(partners.toLowerCase()).not.toContain("support");
  });

  it("passport setup uses wallet-ready copy not profile-ready", () => {
    const setup = read("components/passport/PassportSetupPanel.tsx");
    expect(setup).toContain("SETUP_WALLET_READY_HEADLINE");
    expect(setup).not.toContain("Profile ready");
    expect(setup).not.toMatch(/href="\/verify"/);
  });

  it("protected surfaces contain no /dashboard links", () => {
    for (const rel of PROTECTED_PATHS) {
      const src = read(rel);
      if (rel === "lib/integrate/partnerJourney.ts") {
        expect(src).toContain("/dashboard");
        continue;
      }
      expect(src, rel).not.toContain('href="/dashboard"');
      expect(src, rel).not.toContain("href: \"/dashboard\"");
    }
  });

  it("audited holder action surfaces do not link directly to /verify", () => {
    for (const rel of HOLDER_ACTION_SURFACES) {
      const src = read(rel);
      expect(src, rel).not.toMatch(/href="\/verify"/);
      expect(src, rel).not.toMatch(/href="\/verify\?/);
    }
  });

  it("renders payment return page with conditional lead copy", async () => {
    const { default: PaymentSuccessPage } = await import("@/app/payment/success/page");
    render(React.createElement(PaymentSuccessPage));
    expect(screen.getByText(PAYMENT_RETURN_LEAD)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: new RegExp(PAYMENT_RETURN_PRIMARY_CTA.replace("→", "")) }))
      .toHaveAttribute("href", "/passport");
    expect(screen.getByRole("link", { name: PAYMENT_RETURN_SECONDARY_CTA }))
      .toHaveAttribute("href", PAYMENT_RETURN_SECONDARY_HREF);
  });
});
