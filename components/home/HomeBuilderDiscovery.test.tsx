// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import React from "react";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { HomeBuilderDiscovery } from "./HomeBuilderDiscovery";

vi.mock("@/components/brand/AbraxasLogo", () => ({ AbraxasLogo: () => <span /> }));
vi.mock("@/components/developers/AbraxasJourneyEmblemStatus", () => ({ AbraxasJourneyEmblemStatus: () => <span /> }));
vi.mock("@/lib/partner/integrationStudio", () => ({
  listStudioPackSummaries: () => [{ pack_id: "age_21_retail", display_name: "Age 21 eligibility" }],
}));
vi.mock("@/lib/home/homeBuilderDiscovery", () => ({
  HOME_BUILDER_PLATFORMS: [{ id: "website", label: "Website", detail: "Storefront" }],
  writeHomeBuilderDiscoveryIntent: vi.fn(),
}));
vi.mock("@/components/redesign/ui", () => ({
  Btn: ({ children, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement>) => <button {...props}>{children}</button>,
}));

describe("homepage builder discovery", () => {
  afterEach(cleanup);

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
  });
});
