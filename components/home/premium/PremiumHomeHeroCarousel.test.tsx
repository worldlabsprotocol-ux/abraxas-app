// @vitest-environment jsdom
// FILE: components/home/premium/PremiumHomeHeroCarousel.test.tsx

import "@testing-library/jest-dom/vitest";
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { PremiumHomeHeroCarousel } from "./PremiumHomeHeroCarousel";
import { CINEMATIC_HOME_CTA_PRIMARY } from "@/lib/home/cinematicHomeCopy";

vi.mock("framer-motion", () => ({
  useReducedMotion: () => false,
}));

vi.mock("@/components/home/premium/PremiumHomeHero", () => ({
  PremiumHomeHero: ({ emblemActive }: { emblemActive?: boolean }) => (
    <div data-testid="hero-slide">{emblemActive ? "emblem-on" : "emblem-off"}</div>
  ),
}));

vi.mock("@/components/home/HomeTrustContinuousArchitectureImage", () => ({
  HomeTrustContinuousArchitectureImage: () => <div data-testid="diagram-slide">diagram</div>,
}));

describe("PremiumHomeHeroCarousel", () => {
  afterEach(() => {
    cleanup();
  });

  it("keeps Start building accessible while on the architecture slide", () => {
    render(<PremiumHomeHeroCarousel />);
    fireEvent.click(screen.getByRole("button", { name: /Show slide 2/i }));
    expect(screen.getByRole("link", { name: CINEMATIC_HOME_CTA_PRIMARY })).toHaveAttribute("href", "#start-sandbox");
    expect(screen.getByRole("link", { name: /Start sandbox/i })).toHaveAttribute("href", "#start-sandbox");
  });

  it("exposes architecture stage scroll controls on slide 2", () => {
    render(<PremiumHomeHeroCarousel />);
    fireEvent.click(screen.getByRole("button", { name: /Show slide 2/i }));
    expect(screen.getByRole("button", { name: /Scroll architecture stages right/i })).toBeInTheDocument();
  });

  it("supports keyboard navigation between slides", () => {
    render(<PremiumHomeHeroCarousel />);
    const region = screen.getByRole("region", { name: /Abraxas introduction/i });
    region.focus();
    fireEvent.keyDown(region, { key: "ArrowRight" });
    expect(screen.getByTestId("hero-slide")).toHaveTextContent("emblem-off");
    fireEvent.keyDown(region, { key: "ArrowLeft" });
    expect(screen.getByTestId("hero-slide")).toHaveTextContent("emblem-on");
  });
});
