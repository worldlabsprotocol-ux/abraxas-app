import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { PUBLIC_NAV_LINKS } from "@/lib/design/publicSurface";
import {
  FOOTER_COMPANY_LINKS,
  FOOTER_DEVELOPER_LINKS,
  FOOTER_PRODUCT_LINKS,
} from "@/lib/design/footerLinks";
import {
  PUBLIC_JOURNEY_NEXT_STEPS,
  PUBLIC_JOURNEY_SURFACES,
  journeyHrefPath,
  publicApiRouteFile,
  publicJourneyPageFile,
} from "./publicJourneyManifest";

const ROOT = process.cwd();
const JUDGE = /judge demo|Judge Demo|Public Judge Demo/i;

function read(rel: string): string {
  return readFileSync(join(ROOT, rel), "utf8");
}

function exists(rel: string): boolean {
  return existsSync(join(ROOT, rel));
}

function targetExists(href: string): boolean {
  const path = journeyHrefPath(href);
  if (!path.startsWith("/")) return true;
  if (path.startsWith("/api/")) {
    return exists(publicApiRouteFile(path));
  }
  if (exists(publicJourneyPageFile(path))) return true;
  if (exists(`app${path}/route.ts`)) return true;
  if (path.startsWith("/verify/") && exists("app/verify/[recordId]/page.tsx")) return true;
  return false;
}

function collectInternalHrefs(source: string): string[] {
  const found = new Set<string>();
  const patterns = [
    /href=["'](\/[^"']+)["']/g,
    /href:\s*["'](\/[^"']+)["']/g,
    /Btn href=["'](\/[^"']+)["']/g,
  ];
  for (const pattern of patterns) {
    for (const match of source.matchAll(pattern)) {
      found.add(match[1]!);
    }
  }
  return [...found];
}

describe("public product journey", () => {
  it("keeps every audited surface on disk with a real primary destination", () => {
    const missingPages = PUBLIC_JOURNEY_SURFACES.filter((surface) => !exists(surface.file));
    expect(missingPages.map((surface) => surface.route)).toEqual([]);
    const missingCtas = PUBLIC_JOURNEY_SURFACES.filter((surface) => !targetExists(surface.primaryCta.href));
    expect(missingCtas.map((surface) => `${surface.route} -> ${surface.primaryCta.href}`)).toEqual([]);
  });

  it("keeps nav, footer, and next-step destinations available", () => {
    const hrefs = [
      ...PUBLIC_NAV_LINKS.map((link) => link.href),
      ...FOOTER_PRODUCT_LINKS.map((link) => link.href),
      ...FOOTER_DEVELOPER_LINKS.map((link) => link.href),
      ...FOOTER_COMPANY_LINKS.map((link) => link.href),
      ...PUBLIC_JOURNEY_NEXT_STEPS.map((step) => step.href),
    ];
    expect(hrefs.filter((href) => !targetExists(href))).toEqual([]);
  });

  it("does not leave broken internal links or judge-demo language on journey pages", () => {
    const broken: string[] = [];
    const extra = [
      "lib/docs/docsHub.ts",
      "lib/design/publicSurface.ts",
      "lib/design/footerLinks.ts",
      "components/redesign/RedesignNav.tsx",
    ];
    for (const surface of PUBLIC_JOURNEY_SURFACES) {
      const src = read(surface.file);
      expect(src, surface.route).not.toMatch(JUDGE);
      for (const href of collectInternalHrefs(src)) {
        if (!targetExists(href)) broken.push(`${surface.route} ${href}`);
      }
    }
    for (const file of extra) {
      const src = read(file);
      expect(src, file).not.toMatch(JUDGE);
      for (const href of collectInternalHrefs(src)) {
        if (!targetExists(href)) broken.push(`${file} ${href}`);
      }
    }
    expect(broken).toEqual([]);
  });

  it("shows a next step back to Studio, Starter Kit, Launchpad, or docs on technical surfaces", () => {
    const technical = [
      "app/verification/page.tsx",
      "app/docs/starter-kit/page.tsx",
      "app/examples/trading-venue/TradingVenueExampleClient.tsx",
      "app/examples/payment-authorization/PaymentAuthorizationExampleClient.tsx",
      "app/developers/page.tsx",
      "app/docs/partner-flow/page.tsx",
      "components/goodTrouble/GoodTroublePilotSection.tsx",
      "app/design-partner/page.tsx",
    ];
    for (const file of technical) {
      const src = read(file);
      const hasNext =
        src.includes("PublicJourneyNextSteps")
        || src.includes("/developers/integration-studio")
        || src.includes("/docs/starter-kit")
        || src.includes("/developers/launchpad")
        || src.includes("/docs/partner-flow");
      expect(hasNext, file).toBe(true);
    }
  });
});
