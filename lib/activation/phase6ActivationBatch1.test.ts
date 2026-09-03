// @vitest-environment jsdom
// FILE: lib/activation/phase6ActivationBatch1.test.ts
// Regression guards for Phase 6 UI Activation Batch 1.

import "@testing-library/jest-dom/vitest";
import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import React from "react";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  ACTIVATION_FORBIDDEN_TERMS,
  ACTIVATION_AVAILABILITY,
  POLICY_OUTCOME_STEPS,
  AUDIENCE_HOLDER,
  AUDIENCE_PARTNER,
  AUDIENCE_OPERATOR,
  METRICS_EMPTY_HREF,
  METRICS_ERROR,
} from "@/lib/activation/activationCopy";
import {
  SIMPLIFIED_HOME_HEADLINE,
  SIMPLIFIED_HOME_SUBHEAD,
} from "@/lib/home/simplifiedHomeCopy";
import { HomeAudienceFork } from "@/components/home/HomeAudienceFork";
import { HomeLiveStats } from "@/components/home/HomeLiveStats";
import { HomeSharpHero } from "@/components/home/HomeSharpHero";
import { RedesignNav } from "@/components/redesign/RedesignNav";
import {
  buildHomepageMetricsView,
  buildHomepageStatCards,
  HOMEPAGE_METRIC_MIN_VOLUME,
} from "@/lib/home/publicMetrics";

const ROOT = resolve(__dirname, "../..");

function read(rel: string): string {
  const path = resolve(ROOT, rel);
  expect(existsSync(path), `missing protected file: ${rel}`).toBe(true);
  return readFileSync(path, "utf8");
}

function assertNoForbiddenTerms(text: string) {
  const lower = text.toLowerCase();
  for (const term of ACTIVATION_FORBIDDEN_TERMS) {
    expect(lower, `forbidden term: ${term}`).not.toContain(term);
  }
}

vi.mock("next/navigation", () => ({
  usePathname: () => "/",
}));

vi.mock("next/image", () => ({
  default: () => null,
}));

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
  Btn: ({
    href,
    children,
    onClick,
  }: {
    href?: string;
    children: React.ReactNode;
    onClick?: () => void;
  }) => (href
    ? React.createElement("a", { href }, children)
    : React.createElement("button", { type: "button", onClick }, children)),
}));

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe("phase 6 activation static guards", () => {
  it("uses simplified five-section homepage shell", () => {
    const home = read("components/redesign/RedesignHome.tsx");
    expect(home).not.toContain("AbraxasBootScreen");
    expect(home).not.toContain("bootReady");
    expect(home).toContain("HomeHowItWorks");
    expect(home).toContain("HomeAudiencePanels");
    expect(home).toContain("HomeTrustClose");
    expect(home).not.toContain("HomeAssuranceNetwork");
    expect(home).not.toContain("HomeLiveStats");
  });

  it("uses simplified human copy in hero", () => {
    const hero = read("components/home/HomeSharpHero.tsx");
    expect(hero).toContain("SIMPLIFIED_HOME_HEADLINE");
    expect(hero).toContain("SIMPLIFIED_HOME_SUBHEAD");
    expect(read("lib/home/simplifiedHomeCopy.ts")).not.toContain("Partner Flow receipt contract");
    const renderedCopy = [
      SIMPLIFIED_HOME_HEADLINE,
      SIMPLIFIED_HOME_SUBHEAD,
      ACTIVATION_AVAILABILITY,
      ...POLICY_OUTCOME_STEPS.map((s) => `${s.title} ${s.body}`),
      AUDIENCE_HOLDER.title,
      AUDIENCE_HOLDER.body,
      AUDIENCE_PARTNER.title,
      AUDIENCE_PARTNER.body,
      AUDIENCE_OPERATOR.title,
      AUDIENCE_OPERATOR.body,
    ].join(" ");
    assertNoForbiddenTerms(renderedCopy);
  });

  it("exposes public nav links without partner verify in primary navigation", () => {
    const nav = read("components/redesign/RedesignNav.tsx");
    const surface = read("lib/design/publicSurface.ts");
    expect(nav).toContain("PUBLIC_NAV_LINKS");
    expect(surface).toContain('label: "For businesses"');
    expect(surface).toContain('href: "/docs/partner-flow"');
    expect(surface).toContain('label: "Docs"');
    expect(nav).not.toMatch(/href:\s*"\/verify"/);
    expect(nav).not.toContain("NAV_PARTNER_VERIFY_LABEL");
  });
});

describe("buildHomepageStatCards", () => {
  it("never emits n/a or sub-threshold cards", () => {
    const sparse = buildHomepageStatCards({
      zklogin_wallets: 3,
      active_credentials: undefined,
      verification_network: { manual_idv_approved: 9, credentials_issued_30d: 15 },
    });
    expect(sparse.some((c) => c.value === "n/a")).toBe(false);
    expect(sparse.some((c) => c.key === "zklogin_wallets")).toBe(false);
    expect(sparse.some((c) => c.key === "idv_approved")).toBe(false);
    expect(sparse.some((c) => c.key === "credentials_30d")).toBe(true);
  });

  it("includes phase and updatedAt in metrics view when present", () => {
    const view = buildHomepageMetricsView({
      metrics: {
        phase: "design_partner",
        zklogin_wallets: HOMEPAGE_METRIC_MIN_VOLUME,
      },
      updatedAt: "2026-08-17T12:00:00.000Z",
      sources: { database: "supabase" },
    });
    expect(view.phase).toBe("design_partner");
    expect(view.updatedAt).toBe("2026-08-17T12:00:00.000Z");
    expect(view.cards).toHaveLength(1);
  });
});

describe("HomeLiveStats mutually exclusive states", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
  });

  it("shows empty state with design-partner link when no qualifying metrics", async () => {
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        metrics: { phase: "design_partner", zklogin_wallets: 2 },
        updatedAt: "2026-08-17T12:00:00.000Z",
      }),
    } as Response);

    render(React.createElement(HomeLiveStats));

    expect(await screen.findByText(/below our public display threshold/i)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Apply as a design partner/i })).toHaveAttribute("href", METRICS_EMPTY_HREF);
    expect(screen.queryByText(METRICS_ERROR)).not.toBeInTheDocument();
  });

  it("shows error state without cards and retries fetch", async () => {
    const fetchMock = vi.mocked(fetch);
    fetchMock
      .mockRejectedValueOnce(new Error("network"))
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          metrics: { zklogin_wallets: 12, phase: "design_partner" },
          updatedAt: "2026-08-17T12:00:00.000Z",
        }),
      } as Response);

    render(React.createElement(HomeLiveStats));

    expect(await screen.findByText(METRICS_ERROR)).toBeInTheDocument();
    expect(screen.queryByText(/Passport wallets/i)).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Try again" }));

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledTimes(2);
    });
    expect(await screen.findByText("12")).toBeInTheDocument();
  });
});

describe("HomeAudienceFork routing", () => {
  it("links holder and partner paths", () => {
    render(React.createElement(HomeAudienceFork));

    expect(screen.getByRole("link", { name: AUDIENCE_HOLDER.cta })).toHaveAttribute("href", AUDIENCE_HOLDER.href);
    const partnerLink = screen.getAllByRole("link", { name: new RegExp(AUDIENCE_PARTNER.cta) })
      .find((link) => link.getAttribute("href") === AUDIENCE_PARTNER.href);
    expect(partnerLink).toBeTruthy();
    expect(screen.getByText(/operator-managed/i)).toBeInTheDocument();
  });
});

describe("HomeSharpHero and RedesignNav smoke", () => {
  it("renders simplified activation headline", () => {
    render(React.createElement(HomeSharpHero));
    expect(screen.getByRole("heading", { level: 1, name: SIMPLIFIED_HOME_HEADLINE })).toBeInTheDocument();
  });

  it("shows Docs in mobile drawer without partner verify entry", () => {
    render(React.createElement(RedesignNav));
    fireEvent.click(screen.getByRole("button", { name: "Menu" }));

    expect(screen.getByRole("link", { name: "Docs" })).toHaveAttribute("href", "/docs/partner-flow");
    expect(screen.queryByRole("link", { name: /Verify proofs/i })).not.toBeInTheDocument();
    const drawerLinks = screen.getAllByRole("link");
    const docsLabels = drawerLinks.map((link) => link.textContent?.trim()).filter((t) => t === "Docs");
    expect(docsLabels).toEqual(["Docs"]);
  });
});
