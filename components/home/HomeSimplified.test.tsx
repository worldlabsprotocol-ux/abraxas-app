// @vitest-environment jsdom
// FILE: components/home/HomeSimplified.test.tsx

import "@testing-library/jest-dom/vitest";
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import axe from "axe-core";
import React from "react";
import { HomeSharpHero } from "./HomeSharpHero";
import { HomeHowItWorks } from "./HomeHowItWorks";
import { HomeAudiencePanels } from "./HomeAudiencePanels";
import { HomeTrustClose } from "./HomeTrustClose";
import {
  SIMPLIFIED_HOME_CTA_PRIMARY,
  SIMPLIFIED_HOME_CTA_SECONDARY,
  SIMPLIFIED_HOME_HEADLINE,
} from "@/lib/home/simplifiedHomeCopy";

vi.mock("@/components/sui/SuiAuthProvider", () => ({
  useSuiAuthOptional: () => null,
}));

vi.mock("@/components/sui/ZkLoginSignInChooserProvider", () => ({
  useZkLoginSignInChooserOptional: () => null,
}));

vi.mock("@/components/redesign/ui", () => ({
  Btn: ({ href, children }: { href?: string; children: React.ReactNode }) =>
    React.createElement("a", { href }, children),
}));

describe("simplified homepage sections", () => {
  afterEach(() => {
    cleanup();
  });

  it("renders hero with semantic heading and both CTAs", () => {
    render(<HomeSharpHero />);
    expect(screen.getByRole("heading", { level: 1, name: SIMPLIFIED_HOME_HEADLINE })).toBeTruthy();
    expect(screen.getByRole("link", { name: SIMPLIFIED_HOME_CTA_PRIMARY })).toHaveAttribute("href", "/passport");
    expect(screen.getByRole("link", { name: SIMPLIFIED_HOME_CTA_SECONDARY })).toHaveAttribute("href", "/integrations#apply");
  });

  it("renders how-it-works cards without overflow-prone jargon", () => {
    render(<HomeHowItWorks />);
    expect(screen.getByRole("heading", { level: 2, name: /how it works/i })).toBeTruthy();
    expect(screen.getByRole("list", { name: /how abraxas works/i })).toBeTruthy();
    expect(screen.getByText("Verify")).toBeTruthy();
    expect(screen.getByText("Keep")).toBeTruthy();
    expect(screen.getByText("Share")).toBeTruthy();
    expect(screen.getByText("Keep")).toBeTruthy();
    expect(screen.getByText("Share")).toBeTruthy();
  });

  it("renders audience panels and final CTAs", () => {
    render(
      <>
        <HomeAudiencePanels />
        <HomeTrustClose />
      </>,
    );
    expect(screen.getByText("For people")).toBeTruthy();
    expect(screen.getByText("For businesses")).toBeTruthy();
    expect(screen.getAllByRole("link", { name: SIMPLIFIED_HOME_CTA_PRIMARY })).toHaveLength(1);
    expect(screen.getAllByRole("link", { name: SIMPLIFIED_HOME_CTA_SECONDARY })).toHaveLength(1);
  });

  it("has zero axe violations across simplified homepage sections", async () => {
    const { container } = render(
      <main>
        <HomeSharpHero />
        <HomeHowItWorks />
        <HomeAudiencePanels />
        <HomeTrustClose />
      </main>,
    );

    const results = await new Promise<axe.AxeResults>((resolve, reject) => {
      axe.run(container, (err, report) => {
        if (err) reject(err);
        else resolve(report);
      });
    });

    expect(results.violations).toEqual([]);
  });
});
