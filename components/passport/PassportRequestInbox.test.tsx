// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { ReactNode } from "react";
import { PassportRequestInbox } from "./PassportRequestInbox";

function wrap(children: ReactNode) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe("PassportRequestInbox", () => {
  it("stays out of the Passport home when no action is waiting", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify({
      ok: true,
      requests: [],
    }), { status: 200 })));

    const { container } = render(wrap(<PassportRequestInbox />));
    await screen.findByText("Checking for requests…");
    await vi.waitFor(() => expect(container).toBeEmptyDOMElement());
  });

  it("shows a reassuring empty state on the dedicated Requests page", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify({
      ok: true,
      requests: [],
    }), { status: 200 })));

    render(wrap(<PassportRequestInbox showEmpty />));
    expect(await screen.findByText("No requests waiting")).toBeInTheDocument();
    expect(screen.getByText(/before anything is shared/i)).toBeInTheDocument();
  });

  it("puts the review action and plain-language disclosure first", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify({
      ok: true,
      requests: [{
        request_ref: "request:vr-123",
        partner_label: "Good Trouble",
        request_title: "Age eligibility",
        purpose: "browse storefront",
        shared_result: "age eligibility",
        received_at: "2026-09-27T10:00:00.000Z",
        expires_at: "2026-09-28T10:00:00.000Z",
        continue_href: "/partner/continue?verify_request=vr-123",
      }],
    }), { status: 200 })));

    render(wrap(<PassportRequestInbox />));
    expect(await screen.findByText("Good Trouble")).toBeInTheDocument();
    expect(screen.getByText("Why: browse storefront")).toBeInTheDocument();
    expect(screen.getByText("Would share: age eligibility")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Review request →" }))
      .toHaveAttribute("href", "/partner/continue?verify_request=vr-123");
    expect(screen.queryByText(/vr-123/)).not.toBeInTheDocument();
  });
});
