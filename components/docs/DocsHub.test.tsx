// @vitest-environment jsdom

import "@testing-library/jest-dom/vitest";
import React from "react";
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import DocsPage from "@/app/docs/page";

vi.mock("next/link", () => ({
  default: ({ href, children, ...props }: React.AnchorHTMLAttributes<HTMLAnchorElement> & { href: string }) => (
    <a href={href} {...props}>{children}</a>
  ),
}));

vi.mock("@/components/redesign/RedesignPage", () => ({
  RedesignPage: ({ children }: { children: React.ReactNode }) => <main>{children}</main>,
}));

vi.mock("@/components/redesign/RedesignContent", () => ({
  PageHeader: ({ title }: { title: string }) => <header><h1>{title}</h1></header>,
}));

describe("DocsPage", () => {
  afterEach(cleanup);

  it("keeps the hub concise and lets readers choose a topic category", () => {
    render(<DocsPage />);

    expect(screen.getByRole("heading", { name: "Developer documentation" })).toBeInTheDocument();
    expect(screen.getByRole("navigation", { name: "Documentation categories" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Overview" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("button", { name: "Developer Docs" })).toHaveAttribute("aria-pressed", "false");

    fireEvent.click(screen.getByRole("button", { name: "Developer Docs" }));

    expect(screen.getByRole("button", { name: "Developer Docs" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("region", { name: "Developer Docs topics" })).toBeInTheDocument();
    expect(screen.getByText("API").closest("details")).not.toHaveAttribute("open");
  });

  it("progressively reveals full summaries and preserves developer reference links", () => {
    render(<DocsPage />);
    fireEvent.click(screen.getByRole("button", { name: "Developer Docs" }));
    fireEvent.click(screen.getByText("API"));

    const topic = screen.getByText("API").closest("details");
    if (!topic) throw new Error("API topic disclosure was not rendered");
    expect(topic).toHaveAttribute("open");
    expect(within(topic).getByRole("link", { name: "Integration Kit" })).toHaveAttribute(
      "href",
      "/docs/integration-kit",
    );
    expect(within(topic).getByRole("link", { name: "Integration Studio" })).toHaveAttribute(
      "href",
      "/developers/integration-studio",
    );
    expect(within(topic).getByRole("link", { name: "Partner Flow" })).toHaveAttribute(
      "href",
      "/docs/partner-flow",
    );
  });
});
