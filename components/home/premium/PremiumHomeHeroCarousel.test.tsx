// @vitest-environment jsdom
// FILE: components/home/premium/PremiumHomeHeroCarousel.test.tsx

import "@testing-library/jest-dom/vitest";
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { PremiumHomeHeroCarousel } from "./PremiumHomeHeroCarousel";
import { CINEMATIC_HOME_CTA_PRIMARY } from "@/lib/home/cinematicHomeCopy";

const reducedMotion = vi.hoisted(() => ({ current: false }));

vi.mock("framer-motion", () => ({
  useReducedMotion: () => reducedMotion.current,
}));

vi.mock("next/navigation", () => ({
  usePathname: () => "/",
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
    reducedMotion.current = false;
    vi.useRealTimers();
  });

  it("keeps Start building accessible while on the architecture slide", () => {
    render(<PremiumHomeHeroCarousel />);
    fireEvent.click(screen.getByRole("button", { name: /How Abraxas works/i }));
    expect(screen.getByRole("link", { name: CINEMATIC_HOME_CTA_PRIMARY })).toHaveAttribute("href", "#start-sandbox");
    expect(screen.getByText(/does not issue a live approval/i)).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /Start sandbox/i })).not.toBeInTheDocument();
  });

  it("shows one architecture visual without nested stage scrolling", () => {
    render(<PremiumHomeHeroCarousel />);
    fireEvent.click(screen.getByRole("button", { name: /How Abraxas works/i }));
    expect(screen.getByTestId("diagram-slide")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Scroll architecture stages right/i })).not.toBeInTheDocument();
  });

  it("opens on the presentation and advances to the decision after five seconds", async () => {
    vi.useFakeTimers();
    render(<PremiumHomeHeroCarousel />);
    expect(screen.getByTestId("hero-slide")).toHaveTextContent("emblem-on");
    expect(screen.queryByRole("heading", { name: /signature is not the whole decision/i })).not.toBeInTheDocument();
    await vi.advanceTimersByTimeAsync(5000);
    expect(screen.getByRole("heading", { name: /signature is not the whole decision/i })).toBeVisible();
    expect(screen.getByRole("button", { name: /Evidence/i })).toBeVisible();
    expect(screen.getByRole("button", { name: /Authority/i })).toBeVisible();
    expect(screen.getByRole("button", { name: /Proof/i })).toBeVisible();
    expect(screen.getByRole("button", { name: /Continuity/i })).toBeVisible();
  });

  it("pauses on interaction and resumes when asked", async () => {
    vi.useFakeTimers();
    render(<PremiumHomeHeroCarousel />);
    fireEvent.click(screen.getByRole("button", { name: /Pause presentation/i }));
    await vi.advanceTimersByTimeAsync(5000);
    expect(screen.queryByRole("heading", { name: /signature is not the whole decision/i })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /Resume presentation/i }));
    await vi.advanceTimersByTimeAsync(5000);
    expect(screen.getByRole("heading", { name: /signature is not the whole decision/i })).toBeVisible();
  });

  it("keeps every chapter readable when motion is reduced", () => {
    reducedMotion.current = true;
    render(<PremiumHomeHeroCarousel />);
    expect(screen.getByRole("heading", { name: /signature is not the whole decision/i })).toBeVisible();
    expect(screen.getByRole("heading", { name: /Start building when the decision makes sense/i })).toBeVisible();
    expect(screen.queryByRole("button", { name: /Pause presentation/i })).not.toBeInTheDocument();
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
