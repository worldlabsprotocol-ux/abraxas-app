// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { PolicyProposalForm } from "./PolicyProposalForm";
import { POLICY_PROPOSAL_NOTICE } from "@/lib/partner/policyProposal/contract";

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe("PolicyProposalForm", () => {
  it("exposes accessible structured choices and existing product paths", () => {
    render(<PolicyProposalForm />);
    expect(screen.getByRole("heading", { name: "Tell us the gate your product needs" })).toBeInTheDocument();
    expect(screen.getByText(POLICY_PROPOSAL_NOTICE)).toBeInTheDocument();
    expect(screen.getByText("What the partner receives")).toBeInTheDocument();
    expect(screen.getByText("What stays private")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Policy Fit" })).toHaveAttribute("href", "/developers/integration-studio");
    expect(screen.getByRole("link", { name: "Starter Kit" })).toHaveAttribute("href", "/docs/starter-kit");
    expect(screen.getByRole("link", { name: "Partner Flow" })).toHaveAttribute("href", "/docs/partner-flow");
    expect(screen.getByRole("link", { name: "Design Partner" })).toHaveAttribute("href", "/design-partner");
    expect(screen.getByRole("form")).toHaveStyle({ display: "grid" });
  });

  it("asks unsigned partners to sign in to Launchpad", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify({ error: "unauthorized" }), { status: 401 })));
    render(<PolicyProposalForm />);
    await userEvent.click(screen.getByRole("button", { name: "Submit proposal" }));
    expect(await screen.findByRole("alert")).toHaveTextContent(/Sign in to Launchpad|unauthorized/i);
  });
});
