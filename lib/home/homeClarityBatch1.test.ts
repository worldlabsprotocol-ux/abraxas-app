// @vitest-environment jsdom
// FILE: lib/home/homeClarityBatch1.test.ts
// Regression guards for Homepage Clarity Batch 1 + Phase 6 nav alignment.

import "@testing-library/jest-dom/vitest";
import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import React from "react";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { METRICS_ERROR } from "@/lib/activation/activationCopy";
import { AbraxasBootScreen, BOOT_DISMISSED_SESSION_KEY } from "@/components/redesign/AbraxasBootScreen";
import { HomeLiveStats } from "@/components/home/HomeLiveStats";
import { RedesignNav } from "@/components/redesign/RedesignNav";

const ROOT = resolve(__dirname, "../..");

function read(rel: string): string {
  const path = resolve(ROOT, rel);
  expect(existsSync(path), `missing protected file: ${rel}`).toBe(true);
  return readFileSync(path, "utf8");
}

vi.mock("next/navigation", () => ({
  usePathname: () => "/",
}));

vi.mock("next/image", () => ({
  default: () => null,
}));

vi.mock("@/components/sui/SuiAuthProvider", () => ({
  useSuiAuthOptional: () => null,
}));

vi.mock("@/components/LanguageSelector", () => ({
  LanguageSelector: () => null,
}));

vi.mock("@/components/sui/NavProfileMenu", () => ({
  NavProfileMenu: () => null,
  NavSignInButton: () => React.createElement("button", { type: "button" }, "Sign in"),
}));

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  sessionStorage.clear();
});

describe("homepage clarity batch 1 static guards", () => {
  it("aligns homepage metadata to reusable identity with secondary RWA mention", () => {
    const page = read("app/page.tsx");
    expect(page).toContain("Reusable verification for regulated apps");
    expect(page).toContain("tokenized real-world asset (RWA)");
    expect(page).not.toContain("RWA Verification App. Real World Asset Tokenization");
  });

  it("removes broken flagship registry back link", () => {
    const flagship = read("app/flagship/page.tsx");
    expect(flagship).toContain('href="/"');
    expect(flagship).toContain("← Back to home");
    expect(flagship).not.toContain("/#registry");
  });

  it("replaces null Suspense fallbacks on touched routes", () => {
    const passport = read("app/passport/page.tsx");
    expect(passport).toContain('label="Loading navigation…"');
    expect(passport).not.toMatch(/Suspense fallback=\{null\}/);

    for (const route of [
      "app/cielo/pay/page.tsx",
      "app/cielo/status/page.tsx",
      "app/cielo/receipt/page.tsx",
    ]) {
      const src = read(route);
      expect(src).toContain("RedesignPageLoading");
      expect(src).not.toMatch(/Suspense fallback=\{null\}/);
    }
  });

  it("exposes desktop Verify/Docs and mobile drawer links without duplicate discovery entries", () => {
    const nav = read("components/redesign/RedesignNav.tsx");
    expect(nav).toContain("DESKTOP_LINKS");
    expect(nav).toContain("MOBILE_DRAWER_LINKS");
    expect(nav).toContain('href: "/docs/partner-flow"');
    expect(nav).toContain('href: "/docs"');
    expect(nav).toContain('href: "/verify"');
    expect(nav).toContain('label: "Verify proofs"');
    expect(nav).toContain('label: "Documentation"');
    expect(nav).toContain("aria-expanded={open}");
    expect(nav).toContain('id="rd-nav-mobile-drawer"');
    expect(nav).not.toContain("MOBILE_DISCOVERY_LINKS");
  });
});

describe("HomeLiveStats recovery", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
  });

  it("shows factual error copy and retries the metrics request", async () => {
    const fetchMock = vi.mocked(fetch);
    fetchMock
      .mockRejectedValueOnce(new Error("network"))
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ metrics: { zklogin_wallets: 12 } }),
      } as Response);

    render(React.createElement(HomeLiveStats));

    expect(await screen.findByText(METRICS_ERROR)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Try again" }));

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledTimes(2);
    });
    expect(fetchMock).toHaveBeenCalledWith("/api/metrics/public");
  });
});

describe("AbraxasBootScreen accessibility and persistence", () => {
  it("dismisses via skip intro and persists for the session", () => {
    const onReady = vi.fn();
    render(React.createElement(AbraxasBootScreen, { onReady }));

    expect(screen.getByRole("button", { name: "Enter Abraxas" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Skip intro" }));

    expect(sessionStorage.getItem(BOOT_DISMISSED_SESSION_KEY)).toBe("1");
    expect(onReady).toHaveBeenCalledTimes(1);
    expect(onReady).toHaveBeenCalledWith(true);
  });

  it("does not render when the session dismiss flag is already set", () => {
    sessionStorage.setItem(BOOT_DISMISSED_SESSION_KEY, "1");
    const onReady = vi.fn();
    render(React.createElement(AbraxasBootScreen, { onReady }));

    expect(screen.queryByRole("button", { name: "Enter Abraxas" })).not.toBeInTheDocument();
    expect(onReady).toHaveBeenCalledTimes(1);
    expect(onReady).toHaveBeenCalledWith(true);
  });
});

describe("RedesignNav mobile discoverability", () => {
  it("shows Documentation and Verify proofs links in the mobile drawer without duplicates", () => {
    render(React.createElement(RedesignNav));

    fireEvent.click(screen.getByRole("button", { name: "Menu" }));
    expect(screen.getByRole("button", { name: "Menu" })).toHaveAttribute("aria-expanded", "true");

    expect(screen.getByRole("link", { name: "Documentation" })).toHaveAttribute("href", "/docs");
    expect(screen.getByRole("link", { name: "Verify proofs" })).toHaveAttribute("href", "/verify");

    const drawerLinks = screen.getAllByRole("link");
    const verifyLabels = drawerLinks.map((link) => link.textContent?.trim()).filter((t) => t === "Verify" || t === "Verify proofs");
    const docsLabels = drawerLinks.map((link) => link.textContent?.trim()).filter((t) => t === "Docs" || t === "Documentation");
    expect(verifyLabels).toEqual(["Verify proofs"]);
    expect(docsLabels).toEqual(["Documentation"]);
  });
});
