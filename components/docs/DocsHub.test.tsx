// @vitest-environment jsdom

import "@testing-library/jest-dom/vitest";
import React from "react";
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import DocsPage from "@/app/docs/page";
import { DOCS_HUB_GROUPS } from "@/lib/docs/docsHub";

vi.mock("next/link", () => ({
  default: ({ href, children, ...props }: React.AnchorHTMLAttributes<HTMLAnchorElement> & { href: string }) => (
    <a href={href} {...props}>{children}</a>
  ),
}));

vi.mock("@/components/design/AbxInnerPage", () => ({
  AbxInnerPage: ({ title, children }: { title: string; children: React.ReactNode }) => (
    <main><h1>{title}</h1>{children}</main>
  ),
}));

vi.mock("@/components/redesign/RedesignPage", () => ({
  RedesignPage: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

describe("DocsPage", () => {
  afterEach(cleanup);

  it("uses anchored section navigation and progressive topic disclosure", () => {
    render(<DocsPage />);

    expect(screen.getByRole("heading", { name: "Protocol docs", level: 1 })).toBeInTheDocument();
    const navigation = screen.getByRole("navigation", { name: "Documentation sections" });
    expect(within(navigation).getByRole("link", { name: "Developer Docs" })).toHaveAttribute(
      "href",
      "#docs-group-developer",
    );

    const section = screen.getByRole("region", { name: "Developer Docs" });
    expect(within(section).getByText("API").closest("details")).not.toHaveAttribute("open");
    fireEvent.click(within(section).getByText("API"));
    expect(within(section).getByText("API").closest("details")).toHaveAttribute("open");
  });

  it("keeps every catalog reference available as a link", () => {
    render(<DocsPage />);

    const expectedHrefs = DOCS_HUB_GROUPS.flatMap((group) => group.topics.flatMap((topic) => [
      ...(topic.readMore ? [topic.readMore.href] : []),
      ...(topic.links?.map((link) => link.href) ?? []),
    ])).sort();
    const actualHrefs = Array.from(document.querySelectorAll("main a[href^='/']"))
      .map((link) => link.getAttribute("href") ?? "")
      .filter((href) => !href.startsWith("#"))
      .sort();

    expect(actualHrefs).toEqual(expectedHrefs);
    expect(actualHrefs).toContain("/docs/partner-flow");
  });
});
