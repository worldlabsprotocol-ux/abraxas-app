// @vitest-environment jsdom
// FILE: lib/design/sitewideAxe.test.ts
// axe-core accessibility checks for sitewide unification surfaces.

import "@testing-library/jest-dom/vitest";
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import axe from "axe-core";
import React from "react";
import { HomeSharpHero } from "@/components/home/HomeSharpHero";
import { HomeHowItWorks } from "@/components/home/HomeHowItWorks";
import { HomePartnerProof } from "@/components/home/HomePartnerProof";
import { HomeAudiencePanels } from "@/components/home/HomeAudiencePanels";
import { HomeTrustClose } from "@/components/home/HomeTrustClose";
import { VerifyPageIntro } from "@/components/verify/VerifyPageIntro";
import { DeveloperContextBanner } from "@/components/redesign/DeveloperContextBanner";
import { RedesignNav } from "@/components/redesign/RedesignNav";
import { HOME_PARTNER_PROOF_FALLBACK } from "@/lib/home/partnerProof";

vi.mock("next/navigation", () => ({
  usePathname: () => "/",
}));

vi.mock("next/image", () => ({
  default: (props: Record<string, unknown>) => React.createElement("img", props),
}));

vi.mock("@/components/sui/SuiAuthProvider", () => ({
  useSuiAuthOptional: () => null,
}));

vi.mock("@/components/sui/ZkLoginSignInChooserProvider", () => ({
  useZkLoginSignInChooserOptional: () => null,
}));

vi.mock("@/components/LanguageSelector", () => ({
  LanguageSelector: () => null,
}));

vi.mock("@/components/sui/NavProfileMenu", () => ({
  NavProfileMenu: () => null,
  NavSignInButton: () => React.createElement("button", { type: "button" }, "Sign in"),
}));

vi.mock("@/components/redesign/ui", () => ({
  Btn: ({ href, children }: { href?: string; children: React.ReactNode }) =>
    React.createElement("a", { href }, children),
}));

async function assertNoSeriousViolations(container: HTMLElement) {
  const results = await new Promise<axe.AxeResults>((resolve, reject) => {
    axe.run(container, (err, report) => {
      if (err) reject(err);
      else resolve(report);
    });
  });
  const serious = results.violations.filter(
    (v) => v.impact === "serious" || v.impact === "critical",
  );
  expect(serious).toEqual([]);
}

afterEach(() => {
  cleanup();
});

describe("sitewide axe accessibility", () => {
  it("home sections have zero serious/critical violations", async () => {
    const { container } = render(
      <main>
        <HomeSharpHero />
        <HomeHowItWorks />
        <HomePartnerProof />
        <HomeAudiencePanels />
        <HomeTrustClose />
      </main>,
    );
    await assertNoSeriousViolations(container);
  });

  it("developer receipt tester intro has zero serious/critical violations", async () => {
    const { container } = render(
      <main>
        <DeveloperContextBanner />
        <VerifyPageIntro />
      </main>,
    );
    await assertNoSeriousViolations(container);
  });

  it("canonical nav has zero serious/critical violations", async () => {
    const { container } = render(<RedesignNav />);
    await assertNoSeriousViolations(container);
  });

  it("pilot journey fallback copy avoids unauthorized claims", () => {
    const copy = [
      HOME_PARTNER_PROOF_FALLBACK.title,
      HOME_PARTNER_PROOF_FALLBACK.badge,
      HOME_PARTNER_PROOF_FALLBACK.summary,
    ].join(" ").toLowerCase();
    expect(copy).not.toMatch(/good trouble/);
    expect(copy).not.toMatch(/live partner|paying customer|production partner/);
    expect(copy).not.toMatch(/regulator approved|legally certified/);
  });
});
