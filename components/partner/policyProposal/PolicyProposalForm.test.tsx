// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { PolicyProposalForm } from "./PolicyProposalForm";

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe("PolicyProposalForm", () => {
  it("exposes accessible structured choices and existing product paths", () => {
    render(<PolicyProposalForm />);
    expect(screen.getByRole("heading", { name: "Build the gate your product needs" })).toBeInTheDocument();
    expect(screen.getByText(/No sign-in is required/i)).toBeInTheDocument();
    expect(screen.getByText("What the partner receives")).toBeInTheDocument();
    expect(screen.getByText("What stays private")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Build this integration →" })).toHaveAttribute(
      "href",
      expect.stringContaining("/developers/integration-studio?"),
    );
    expect(screen.getByRole("link", { name: "Build this integration →" })).toHaveAttribute(
      "href",
      expect.stringContaining("pack=age_21_retail"),
    );
    expect(screen.getByRole("link", { name: "Starter Kit" })).toHaveAttribute("href", "/docs/starter-kit");
    expect(screen.getByRole("link", { name: "Partner Flow" })).toHaveAttribute("href", "/docs/partner-flow");
    expect(screen.getByRole("link", { name: "Design Partner" })).toHaveAttribute("href", "/design-partner");
    expect(screen.getByRole("form")).toHaveStyle({ display: "grid" });
  });

  it("builds an anonymous browser handoff without submitting a proposal", () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    render(<PolicyProposalForm />);
    const link = screen.getByRole("link", { name: "Build this integration →" });
    expect(link).toHaveAttribute("href", expect.stringContaining("source=browser-builder"));
    expect(link).toHaveAttribute("href", expect.stringContaining("path=hosted_partner_flow"));
    expect(screen.queryByRole("button", { name: "Submit proposal" })).not.toBeInTheDocument();
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
