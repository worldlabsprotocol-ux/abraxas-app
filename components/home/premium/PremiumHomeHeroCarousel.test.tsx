// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { PremiumHomeHeroCarousel } from "./PremiumHomeHeroCarousel";

vi.mock("next/navigation", () => ({ usePathname: () => "/" }));
vi.mock("@/components/home/premium/PremiumHomeHero", () => ({
  PremiumHomeHero: ({ cta }: { cta: { label: string; href: string } }) => (
    <header><h1>Trust, independently verifiable.</h1><a href={cta.href}>{cta.label}</a></header>
  ),
}));
vi.mock("@/components/home/premium/HomeDiscoveryStory", () => ({
  HomeDiscoveryStory: () => <div>Evidence, proof, authority, continuity</div>,
  HomeDiscoveryBegin: () => <div>Begin</div>,
}));
vi.mock("@/components/home/HomeTrustContinuousArchitectureImage", () => ({
  HomeTrustContinuousArchitectureImage: () => <div>Architecture</div>,
}));

describe("homepage introduction", () => {
  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it("keeps one primary builder link and leaves education optional", async () => {
    render(<PremiumHomeHeroCarousel />);
    expect(screen.getByRole("link", { name: "Start building" })).toHaveAttribute("href", "#start-sandbox");
    expect(screen.queryByRole("button", { name: /Next|Previous|Pause presentation/i })).not.toBeInTheDocument();
    const disclosure = screen.getByText("Explore how Abraxas works").closest("details");
    expect(disclosure).not.toHaveAttribute("open");
    fireEvent.click(screen.getByText("Explore how Abraxas works"));
    expect(disclosure).toHaveAttribute("open");
    await waitFor(() => expect(screen.getByText("Evidence, proof, authority, continuity")).toBeInTheDocument());
  });

  it("resumes the authenticated builder destination without requiring another introduction", async () => {
    vi.stubGlobal("fetch", vi.fn()
      .mockResolvedValueOnce({ json: async () => ({ auth_mode: "ephemeral_wallet" }) })
      .mockResolvedValueOnce({ json: async () => ({ authenticated: true }) }));
    render(<PremiumHomeHeroCarousel />);
    await waitFor(() => expect(screen.getByRole("link", { name: "Continue building" })).toHaveAttribute("href", "#start-sandbox"));
  });
});
