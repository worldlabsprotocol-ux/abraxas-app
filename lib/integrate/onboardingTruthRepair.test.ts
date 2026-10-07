// FILE: lib/integrate/onboardingTruthRepair.test.ts
// Regression guards: public onboarding must not require operator/founder for sandbox.

import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import {
  CANONICAL_SANDBOX_STUDIO_PATH,
  CANONICAL_SANDBOX_LAUNCHPAD_PATH,
  CANONICAL_SANDBOX_SUMMARY,
  INTEGRATOR_START_HERE_STEPS,
  LEGACY_SANDBOX_GATE_PATTERNS,
  PARTNER_FLOW_FIRST_TASKS,
} from "@/lib/integrate/partnerJourney";
import { ACTIVATION_AVAILABILITY, AUDIENCE_PARTNER } from "@/lib/activation/activationCopy";

const ROOT = resolve(__dirname, "../..");

const PUBLIC_ONBOARDING_SURFACES = [
  "lib/activation/activationCopy.ts",
  "app/docs/partner-flow/page.tsx",
  "app/integrations/page.tsx",
  "app/design-partner/page.tsx",
  "app/developers/page.tsx",
  "app/onboarding/page.tsx",
  "components/docs/PartnerFlowDocToc.tsx",
  "components/integrations/DesignPartnerApplicationForm.tsx",
  "components/integrate/IntegratorStartHerePanel.tsx",
] as const;

function read(rel: string): string {
  const path = resolve(ROOT, rel);
  expect(existsSync(path), `missing ${rel}`).toBe(true);
  return readFileSync(path, "utf8");
}

describe("onboarding truth repair — canonical sandbox path", () => {
  it("defines self-service studio and launchpad entry points", () => {
    expect(CANONICAL_SANDBOX_STUDIO_PATH).toBe("/developers/integration-studio");
    expect(CANONICAL_SANDBOX_LAUNCHPAD_PATH).toBe("/developers/launchpad");
    expect(CANONICAL_SANDBOX_SUMMARY.toLowerCase()).toContain("abx_test_");
    expect(CANONICAL_SANDBOX_SUMMARY.toLowerCase()).not.toContain("operator");
  });

  it("routes integrators to Integration Studio first", () => {
    expect(INTEGRATOR_START_HERE_STEPS[0]?.cta.href).toBe(CANONICAL_SANDBOX_STUDIO_PATH);
    expect(INTEGRATOR_START_HERE_STEPS[0]?.title.toLowerCase()).toContain("sandbox");
    expect(PARTNER_FLOW_FIRST_TASKS[0]).toContain(CANONICAL_SANDBOX_STUDIO_PATH);
    expect(AUDIENCE_PARTNER.href).toBe(CANONICAL_SANDBOX_STUDIO_PATH);
  });

  it("redirects /onboarding to Integration Studio", () => {
    const page = read("app/onboarding/page.tsx");
    expect(page).toContain("CANONICAL_SANDBOX_STUDIO_PATH");
    expect(page).not.toContain('redirect("/design-partner")');
  });

  it("aligns edge redirects with canonical sandbox studio path", () => {
    const nextConfig = read("next.config.js");
    const publicOrigin = read("lib/product/publicOrigin.ts");
    expect(nextConfig).toContain("/developers/integration-studio?source=onboarding");
    expect(nextConfig).not.toContain('destination: "/design-partner"');
    expect(publicOrigin).toContain("/developers/integration-studio?source=onboarding");
    expect(publicOrigin).not.toContain('destination: "/design-partner"');
  });

  it("does not state sandbox requires operator provisioning on public surfaces", () => {
    for (const rel of PUBLIC_ONBOARDING_SURFACES) {
      const text = read(rel).toLowerCase();
      for (const pattern of LEGACY_SANDBOX_GATE_PATTERNS) {
        expect(text, `${rel} contains legacy gate: ${pattern}`).not.toContain(pattern.toLowerCase());
      }
    }
  });

  it("does not state sandbox requires operator provisioning in root README", () => {
    const readme = read("README.md").toLowerCase();
    for (const pattern of LEGACY_SANDBOX_GATE_PATTERNS) {
      expect(readme, `README contains legacy gate: ${pattern}`).not.toContain(pattern.toLowerCase());
    }
    expect(readme).toContain("integration studio");
    expect(readme).toContain("abx_test_");
  });

  it("preserves production review boundary in activation copy", () => {
    expect(ACTIVATION_AVAILABILITY.toLowerCase()).toContain("production access requires reviewed activation");
    expect(ACTIVATION_AVAILABILITY.toLowerCase()).toContain("self-service");
  });

  it("prioritizes Integration Studio CTA on integrations hub", () => {
    const integrations = read("app/integrations/page.tsx");
    const studioIdx = integrations.indexOf("CANONICAL_SANDBOX_STUDIO_PATH");
    expect(studioIdx).toBeGreaterThan(-1);
    expect(integrations).toContain("Open Integration Studio");
  });

  it("replaces operator provisioning section on partner flow docs", () => {
    const docs = read("app/docs/partner-flow/page.tsx");
    expect(docs).toContain("Sandbox provisioning (self-service)");
    expect(docs).not.toContain("Operator provisioning");
    expect(docs).toContain("/developers/integration-studio");
  });
});
