// @vitest-environment jsdom
// FILE: lib/wayfinding/partnerApplicationBatch1.test.ts
// Regression guards for Phase 8 Batch 1 partner application and mobile docs journey.

import "@testing-library/jest-dom/vitest";
import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import React from "react";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { getExternalRelyingPartyIntegrationGuide } from "@/lib/externalRelyingPartyIntegration";
import { AUDIENCE_PARTNER, METRICS_EMPTY_HREF } from "@/lib/activation/activationCopy";
import {
  INTEGRATIONS_HUB_SUBHEAD,
  PARTNER_APPLICATION_PATH,
  PARTNER_CONVERSION_FORBIDDEN_TERMS,
  PARTNER_FLOW_MOBILE_RECEIPT_JUMP_LABEL,
  PARTNER_POST_APPLY_STEPS,
  PARTNER_RECEIPT_DOCS_ANCHOR,
  PARTNER_RECEIPT_MIRROR_NOTE,
} from "@/lib/integrate/partnerJourney";
import {
  PRODUCTION_INTEGRATION_PATH,
  RELYING_PARTY_CHECKLIST,
  RELYING_PARTY_DEFINITION,
} from "@/lib/relyingPartyProgram";
import { PartnerFlowDocMobileJump } from "@/components/docs/PartnerFlowDocToc";

const ROOT = resolve(__dirname, "../..");

const PROTECTED_PATHS = [
  "lib/integrate/partnerJourney.ts",
  "app/integrations/page.tsx",
  "components/docs/PartnerFlowDocToc.tsx",
  "app/docs/partner-flow/page.tsx",
  "lib/activation/activationCopy.ts",
  "lib/externalRelyingPartyIntegration.ts",
  "lib/relyingPartyProgram.ts",
  "app/design-partner/page.tsx",
  "components/integrate/IntegratorStartHerePanel.tsx",
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

afterEach(() => {
  cleanup();
});

describe("phase 8 partner application batch 1", () => {
  it("touches exactly the protected product paths", () => {
    for (const rel of PROTECTED_PATHS) {
      expect(existsSync(resolve(ROOT, rel)), rel).toBe(true);
    }
    expect(PROTECTED_PATHS).toHaveLength(9);
  });

  it("aligns canonical apply path across activation and external guide", () => {
    expect(PARTNER_APPLICATION_PATH).toBe("/integrations#apply");
    expect(AUDIENCE_PARTNER.href).toBe(PARTNER_APPLICATION_PATH);
    expect(METRICS_EMPTY_HREF).toBe(PARTNER_APPLICATION_PATH);
    expect(getExternalRelyingPartyIntegrationGuide().apply).toContain("/integrations#apply");
    expect(getExternalRelyingPartyIntegrationGuide().apply).not.toContain("/design-partner");
  });

  it("removes KYC wording from relying party definition and sandbox checklist", () => {
    expect(RELYING_PARTY_DEFINITION.toLowerCase()).not.toContain("kyc");
    expect(RELYING_PARTY_CHECKLIST[1]?.body.toLowerCase()).not.toContain("abx_live_");
    expect(RELYING_PARTY_CHECKLIST[1]?.body.toLowerCase()).toContain("mirror");
    expect(PRODUCTION_INTEGRATION_PATH.join(" ").toLowerCase()).not.toContain("issue abx_live_");
    expect(PRODUCTION_INTEGRATION_PATH.join(" ").toLowerCase()).toContain("operator");
  });

  it("replaces integrations hero marketing drift", () => {
    const integrations = read("app/integrations/page.tsx");
    expect(integrations).toContain("INTEGRATIONS_HUB_SUBHEAD");
    expect(integrations).not.toContain("~4 lines");
    expect(integrations).not.toContain("live integration surfaces");
    expect(integrations).not.toContain("re-KYC");
    expect(INTEGRATIONS_HUB_SUBHEAD.toLowerCase()).toContain("manual");
  });

  it("prioritizes receipt verification docs over receipt tester in post-apply flows", () => {
    const integrations = read("app/integrations/page.tsx");
    expect(integrations).toContain("PARTNER_POST_APPLY_STEPS");
    expect(integrations).toContain("PARTNER_RECEIPT_DOCS_ANCHOR");
    expect(integrations).toContain("Receipt tester (mirror)");

    const panel = read("components/integrate/IntegratorStartHerePanel.tsx");
    const receiptDocsIdx = panel.indexOf("PARTNER_RECEIPT_DOCS_ANCHOR");
    const receiptTesterIdx = panel.indexOf("PARTNER_RECEIPT_VERIFIER_PATH");
    expect(receiptDocsIdx).toBeGreaterThan(-1);
    expect(receiptTesterIdx).toBeGreaterThan(receiptDocsIdx);
  });

  it("exposes keyboard-accessible mobile receipt verification jump control", () => {
    render(React.createElement(PartnerFlowDocMobileJump));
    const receiptLink = screen.getByRole("link", { name: PARTNER_FLOW_MOBILE_RECEIPT_JUMP_LABEL });
    expect(receiptLink).toHaveAttribute("href", "#receipt-verification");
    expect(screen.getByRole("navigation", { name: "Partner Flow section navigation" })).toBeInTheDocument();
  });

  it("includes mobile jump nav on partner flow docs page", () => {
    const page = read("app/docs/partner-flow/page.tsx");
    expect(page).toContain("PartnerFlowDocMobileJump");
    expect(page).toContain("PartnerFlowMobileReceiptCallout");
    expect(page).toContain("overflowX: \"auto\"");
  });

  it("avoids forbidden marketing terms on touched copy constants", () => {
    const renderedCopy = [
      INTEGRATIONS_HUB_SUBHEAD,
      PARTNER_RECEIPT_MIRROR_NOTE,
      ...PARTNER_POST_APPLY_STEPS,
      RELYING_PARTY_DEFINITION,
      ...RELYING_PARTY_CHECKLIST.map((s) => `${s.title} ${s.body}`),
      ...PRODUCTION_INTEGRATION_PATH,
      AUDIENCE_PARTNER.body,
    ].join("\n");
    assertNoPositiveForbiddenTerm(renderedCopy);
  });

  it("has no circular dependency between partnerJourney and externalRelyingPartyIntegration", () => {
    const journey = read("lib/integrate/partnerJourney.ts");
    const external = read("lib/externalRelyingPartyIntegration.ts");
    expect(journey).not.toContain("externalRelyingPartyIntegration");
    expect(external).toContain("PARTNER_APPLICATION_PATH");
    expect(external).toContain('from "@/lib/integrate/partnerJourney"');
  });
});
