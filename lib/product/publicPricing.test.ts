// FILE: lib/product/publicPricing.test.ts

import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { PARTNER_COMMERCIAL_PLANS } from "@/lib/partner/partnerCommercialPlans";
import { PUBLIC_NAV_EXPLORE_LINKS } from "@/lib/design/publicSurface";
import { FOOTER_PRODUCT_LINKS } from "@/lib/design/footerLinks";
import { PUBLIC_PRODUCT_ROUTES, publicPageFile } from "@/lib/product/publicRouteManifest";
import {
  PUBLIC_PRICING_ENTERPRISE_HREF,
  PUBLIC_PRICING_INTEGRATION_STUDIO_HREF,
  PUBLIC_PRICING_LAUNCHPAD_HREF,
  PUBLIC_PRICING_PATH,
  PUBLIC_PRICING_TIERS,
  PUBLIC_PRODUCTION_PLAN_DISPLAYS,
  publicPricingAmountsMatchCanonicalPlans,
} from "@/lib/product/publicPricingCopy";

const ROOT = process.cwd();

function read(rel: string): string {
  return readFileSync(join(ROOT, rel), "utf8");
}

describe("public pricing surface", () => {
  it("exposes Pricing in public explore navigation and footer", () => {
    expect(PUBLIC_NAV_EXPLORE_LINKS.some((link) => link.href === PUBLIC_PRICING_PATH)).toBe(true);
    expect(PUBLIC_NAV_EXPLORE_LINKS.find((link) => link.href === PUBLIC_PRICING_PATH)?.label).toBe("Pricing");
    expect(FOOTER_PRODUCT_LINKS.some((link) => link.href === PUBLIC_PRICING_PATH)).toBe(true);
  });

  it("registers /pricing on the public route manifest with a page on disk", () => {
    expect(PUBLIC_PRODUCT_ROUTES).toContain(PUBLIC_PRICING_PATH);
    expect(existsSync(join(ROOT, publicPageFile(PUBLIC_PRICING_PATH)))).toBe(true);
  });

  it("renders without authentication requirements", () => {
    const page = read("app/pricing/page.tsx");
    expect(page).not.toMatch(/useSuiAuth|requireAuth|redirect\(/);
    expect(page).toContain("RedesignPage");
  });

  it("wires CTAs to existing product destinations", () => {
    const sandbox = PUBLIC_PRICING_TIERS.find((tier) => tier.id === "sandbox");
    const production = PUBLIC_PRICING_TIERS.find((tier) => tier.id === "production");
    const enterprise = PUBLIC_PRICING_TIERS.find((tier) => tier.id === "enterprise");
    expect(sandbox?.ctaHref).toBe(PUBLIC_PRICING_INTEGRATION_STUDIO_HREF);
    expect(production?.ctaHref).toBe(PUBLIC_PRICING_LAUNCHPAD_HREF);
    expect(enterprise?.ctaHref).toBe(PUBLIC_PRICING_ENTERPRISE_HREF);
    expect(existsSync(join(ROOT, publicPageFile(PUBLIC_PRICING_INTEGRATION_STUDIO_HREF as (typeof PUBLIC_PRODUCT_ROUTES)[number])))).toBe(true);
    expect(existsSync(join(ROOT, publicPageFile(PUBLIC_PRICING_LAUNCHPAD_HREF as (typeof PUBLIC_PRODUCT_ROUTES)[number])))).toBe(true);
  });

  it("uses canonical plan amounts from partnerCommercialPlans without fabrication", () => {
    expect(publicPricingAmountsMatchCanonicalPlans()).toBe(true);
    expect(PUBLIC_PRODUCTION_PLAN_DISPLAYS[0]?.monthlyPriceLabel).toBe("$99/mo");
    expect(PUBLIC_PRODUCTION_PLAN_DISPLAYS[1]?.monthlyPriceLabel).toBe("$499/mo");
    expect(PUBLIC_PRICING_TIERS[0]?.priceLabel).toBe("$0");
    expect(PUBLIC_PRICING_TIERS[1]?.priceLabel).toBe(`From $${PARTNER_COMMERCIAL_PLANS.launch.monthly_base_cents! / 100}/mo`);
    expect(PUBLIC_PRICING_TIERS[2]?.priceLabel).toBe("Custom");
  });

  it("keeps basic accessibility and responsive layout hooks on the pricing page", () => {
    const page = read("app/pricing/page.tsx");
    expect(page).toContain("ariaLabel");
    expect(page).toContain("public-pricing-grid");
    expect(page).toContain("repeat(auto-fit");
    expect(page).toContain("<dl");
    expect(page).toContain("<dt");
    expect(page).toContain("<dd");
  });

  it("does not introduce fake checkout or unsupported billing claims", () => {
    const copy = read("lib/product/publicPricingCopy.ts");
    const page = read("app/pricing/page.tsx");
    const corpus = `${copy}\n${page}`;
    expect(corpus).not.toMatch(/stripe|checkout session|credit card/i);
    expect(corpus).toMatch(/observe-only|estimate/i);
    expect(corpus).not.toMatch(/\$999|\$49\.99|\$9\.99/);
  });
});
