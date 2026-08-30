// FILE: lib/partner/partnerOnboardingPositioning.test.ts

import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  PARTNER_CONSENT_MOCKUP_CONTROLS,
  PARTNER_ONBOARDING_AVAILABLE_NOW,
  PARTNER_ONBOARDING_FALSE_LIVE_CLAIM_PATTERNS,
  PARTNER_ONBOARDING_HEADLINE,
  PARTNER_ONBOARDING_HOW_IT_WORKS,
  PARTNER_ONBOARDING_IN_DEVELOPMENT,
  PARTNER_ONBOARDING_PRIVACY_PRINCIPLES,
  PARTNER_ONBOARDING_SUPPORTING_COPY,
  PARTNER_ONBOARDING_DOC_LINKS,
  scanForFalseLiveOnboardingClaims,
} from "@/lib/partner/partnerOnboardingPositioning";

const SURFACE_FILES = [
  "lib/partner/partnerOnboardingPositioning.ts",
  "lib/activation/activationCopy.ts",
  "components/home/HomePartnerOnboardingStrip.tsx",
  "components/integrate/PartnerOnboardingPositioningPanel.tsx",
  "app/integrations/page.tsx",
  "app/design-partner/page.tsx",
  "app/docs/partner-flow/page.tsx",
  "app/developers/page.tsx",
  "lib/partner/partnerFlowIntegratorKit.ts",
  "README.md",
  "docs/PARTNER_PASSWORDLESS_ONBOARDING_PLAN.md",
];

function readRepo(rel: string): string {
  return readFileSync(join(process.cwd(), rel), "utf8");
}

describe("partnerOnboardingPositioning copy", () => {
  it("uses required headline and supporting copy", () => {
    expect(PARTNER_ONBOARDING_HEADLINE).toBe("One verification. Faster onboarding. Fewer forms.");
    expect(PARTNER_ONBOARDING_SUPPORTING_COPY).toContain("prove eligibility");
    expect(PARTNER_ONBOARDING_SUPPORTING_COPY).not.toMatch(/\bpasswordless\b/i);
  });

  it("lists available-now capabilities without planned account bootstrap", () => {
    expect(PARTNER_ONBOARDING_AVAILABLE_NOW.map((c) => c.id)).toEqual([
      "partner-flow",
      "passport",
      "policy-eligibility",
      "signed-receipts",
      "privacy-callbacks",
      "sandbox-design-partner",
    ]);
    expect(PARTNER_ONBOARDING_AVAILABLE_NOW.every((c) => c.availability === "available_now")).toBe(true);
  });

  it("labels future capabilities in development", () => {
    expect(PARTNER_ONBOARDING_IN_DEVELOPMENT.every((c) => c.availability === "in_development")).toBe(true);
    expect(PARTNER_ONBOARDING_IN_DEVELOPMENT.some((c) => c.id === "passwordless-account")).toBe(true);
    expect(PARTNER_ONBOARDING_IN_DEVELOPMENT.some((c) => c.id === "newsletter-consent")).toBe(true);
  });

  it("defines seven-step how-it-works sequence", () => {
    expect(PARTNER_ONBOARDING_HOW_IT_WORKS).toHaveLength(7);
    expect(PARTNER_ONBOARDING_HOW_IT_WORKS[0].title).toContain("Continue with Abraxas Passport");
    expect(PARTNER_ONBOARDING_HOW_IT_WORKS[5].body.toLowerCase()).toContain("planned");
  });

  it("requires privacy principles including no DOB/photos to partners", () => {
    const joined = PARTNER_ONBOARDING_PRIVACY_PRINCIPLES.join(" ");
    expect(joined).toContain("does not send ID photos or date of birth");
    expect(joined).toContain("pairwise");
    expect(joined).toContain("marketing consent");
  });

  it("mockup consent controls do not preselect newsletter", () => {
    const newsletter = PARTNER_CONSENT_MOCKUP_CONTROLS.find((c) => c.id === "newsletter");
    expect(newsletter?.defaultChecked).toBe(false);
    expect(PARTNER_CONSENT_MOCKUP_CONTROLS.find((c) => c.id === "verify-eligibility")?.defaultChecked).toBe(true);
  });

  it("doc links point to existing routes only", () => {
    const routeChecks: Record<string, string> = {
      [PARTNER_ONBOARDING_DOC_LINKS.partnerFlow]: "app/docs/partner-flow/page.tsx",
      [PARTNER_ONBOARDING_DOC_LINKS.designPartner]: "app/design-partner/page.tsx",
      [PARTNER_ONBOARDING_DOC_LINKS.integrations]: "app/integrations/page.tsx",
      [PARTNER_ONBOARDING_DOC_LINKS.developersPartner]: "app/developers/partner/page.tsx",
      [PARTNER_ONBOARDING_DOC_LINKS.goodTroublePilot]: "app/good-trouble/page.tsx",
    };

    for (const [href, file] of Object.entries(routeChecks)) {
      const path = href.split("#")[0];
      expect(path.startsWith("/")).toBe(true);
      expect(existsSync(join(process.cwd(), file)), `missing route file for ${href}`).toBe(true);
    }

    const partnerFlowDoc = readRepo("app/docs/partner-flow/page.tsx");
    expect(partnerFlowDoc).toContain('id="planned-passwordless-onboarding"');
  });
});

describe("stale live-claim scan across positioning surfaces", () => {
  it("does not falsely claim account bootstrap or newsletter enrollment is live", () => {
    for (const file of SURFACE_FILES) {
      const text = readRepo(file);
      const violations = scanForFalseLiveOnboardingClaims(text);
      expect(violations, `false live claims in ${file}`).toEqual([]);
    }
  });

  it("planning doc states capabilities are not deployed", () => {
    const plan = readRepo("docs/PARTNER_PASSWORDLESS_ONBOARDING_PLAN.md");
    expect(plan).toMatch(/not deployed|planning only|in development/i);
    expect(scanForFalseLiveOnboardingClaims(plan)).toEqual([]);
  });

  it("false-live patterns are defined", () => {
    expect(PARTNER_ONBOARDING_FALSE_LIVE_CLAIM_PATTERNS.length).toBeGreaterThan(3);
  });
});
