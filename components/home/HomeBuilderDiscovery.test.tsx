// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import React from "react";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { HomeBuilderDiscovery } from "./HomeBuilderDiscovery";
import { readHomeBuilderDiscoveryDraft, readHomeBuilderDiscoveryIntent } from "@/lib/home/homeBuilderDiscovery";

vi.mock("@/components/brand/AbraxasLogo", () => ({ AbraxasLogo: () => <span /> }));
vi.mock("@/components/developers/AbraxasJourneyEmblemStatus", () => ({ AbraxasJourneyEmblemStatus: () => <span /> }));
vi.mock("@/lib/partner/integrationStudio", () => ({
  listStudioPackSummaries: () => [{ pack_id: "age_21_retail", display_name: "Age 21 eligibility" }],
}));
vi.mock("@/components/redesign/ui", () => ({
  Btn: ({ children, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement>) => <button {...props}>{children}</button>,
}));

describe("homepage builder discovery", () => {
  afterEach(() => {
    cleanup();
    window.sessionStorage.clear();
    window.localStorage.clear();
  });

  it("replaces the platform choice with policy choice and advances only after both selections", () => {
    const onComplete = vi.fn();
    render(<HomeBuilderDiscovery onComplete={onComplete} />);
    expect(screen.getByRole("heading", { name: "What are you building?" })).toHaveFocus();
    expect(screen.queryByRole("heading", { name: "What should Abraxas verify?" })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("radio", { name: /Website/ }));
    fireEvent.click(screen.getByRole("button", { name: "Continue" }));
    expect(screen.queryByRole("heading", { name: "What are you building?" })).not.toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "What should Abraxas verify?" })).toHaveFocus();
    fireEvent.click(screen.getByRole("radio", { name: "Age 21 eligibility" }));
    fireEvent.click(screen.getByRole("button", { name: "Continue to builder" }));
    expect(onComplete).toHaveBeenCalledOnce();
    expect(readHomeBuilderDiscoveryDraft()).toBeNull();
    expect(readHomeBuilderDiscoveryIntent()).toMatchObject({ platform: "website", policyPackId: "age_21_retail" });
  });

  it("resumes unfinished platform and policy choices after remounting", () => {
    const first = render(<HomeBuilderDiscovery onComplete={vi.fn()} />);
    fireEvent.click(screen.getByRole("radio", { name: /Website/ }));
    expect(readHomeBuilderDiscoveryDraft()).toMatchObject({ step: "platform", platform: "website" });
    first.unmount();

    const second = render(<HomeBuilderDiscovery onComplete={vi.fn()} />);
    expect(screen.getByRole("radio", { name: /Website/ })).toHaveAttribute("aria-checked", "true");
    fireEvent.click(screen.getByRole("button", { name: "Continue" }));
    fireEvent.click(screen.getByRole("radio", { name: "Age 21 eligibility" }));
    second.unmount();

    render(<HomeBuilderDiscovery onComplete={vi.fn()} />);
    expect(screen.getByRole("heading", { name: "What should Abraxas verify?" })).toBeInTheDocument();
    expect(screen.getByRole("radio", { name: "Age 21 eligibility" })).toHaveAttribute("aria-checked", "true");
    expect(screen.getByRole("button", { name: "Continue to builder" })).toBeEnabled();
  });
});
