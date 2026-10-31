// @vitest-environment jsdom

import "@testing-library/jest-dom/vitest";
import React from "react";
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { TryAbraxasClient } from "@/app/try/TryAbraxasClient";

vi.mock("next/link", () => ({
  default: ({ href, children, ...props }: React.AnchorHTMLAttributes<HTMLAnchorElement> & { href: string }) => (
    <a href={href} {...props}>{children}</a>
  ),
}));

vi.mock("@/components/redesign/ui", () => ({
  Btn: ({ href, children, onClick }: { href?: string; children: React.ReactNode; onClick?: () => void }) => href
    ? <a href={href}>{children}</a>
    : <button type="button" onClick={onClick}>{children}</button>,
}));

describe("TryAbraxasClient", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false }));
  });

  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it("offers a concise no-auth preview and routes building to Integration Studio", async () => {
    render(<TryAbraxasClient />);

    expect(screen.getByRole("heading", { name: "Explore private eligibility." })).toBeInTheDocument();
    expect(screen.getByText("See what a policy checks and what stays private. No account needed.")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Build in Integration Studio" })).toHaveAttribute(
      "href",
      "/developers/integration-studio",
    );
    expect(screen.getByRole("link", { name: "Explore the preview" })).toHaveAttribute("href", "#try-explorer");
    expect(screen.queryByRole("button", { name: /connect wallet|sign in/i })).not.toBeInTheDocument();
    await waitFor(() => expect(fetch).toHaveBeenCalledWith("/api/launchpad/policies", { cache: "no-store" }));
  });

  it("keeps the policy preview interactive and preserves the real sandbox route", () => {
    render(<TryAbraxasClient />);

    fireEvent.change(screen.getByLabelText("Recommended policy"), { target: { value: "residency" } });
    expect(screen.getByText("Confirm a jurisdiction rule passed without sharing a full address.")).toBeInTheDocument();
    expect(screen.getByText("Current policy result")).toBeInTheDocument();
    expect(screen.getByText("Street address")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Run a sandbox test" })).toHaveAttribute(
      "href",
      "/developers/launchpad",
    );
    expect(screen.getByText(/not saved · no credentials issued · no production access/)).toBeInTheDocument();
  });

  it("keeps technical request details behind a keyboard-accessible disclosure", () => {
    render(<TryAbraxasClient />);

    const details = screen.getByText("Developer reference").closest("details");
    expect(details).not.toHaveAttribute("open");
    fireEvent.click(screen.getByText("Developer reference"));
    expect(details).toHaveAttribute("open");
    expect(within(details as HTMLElement).getByLabelText("Callback URL")).toBeInTheDocument();
    expect(within(details as HTMLElement).getByRole("button", { name: "Copy server request" })).toBeInTheDocument();
  });

  it("lets visitors describe a custom goal without changing the authentication flow", () => {
    render(<TryAbraxasClient />);

    fireEvent.change(screen.getByLabelText("What do you want Abraxas to enable?"), { target: { value: "custom" } });
    expect(screen.getByLabelText("Describe the result your product needs")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Open Integration Studio" })).toHaveAttribute(
      "href",
      "/developers/integration-studio",
    );
  });
});
