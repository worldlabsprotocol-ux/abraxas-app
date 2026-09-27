// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
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

  it("shows a reassuring empty state and a three-step sandbox demo on the Requests page", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify({
      ok: true,
      requests: [],
    }), { status: 200 })));

    render(wrap(<PassportRequestInbox showEmpty />));
    expect(await screen.findByText("No requests waiting")).toBeInTheDocument();
    expect(screen.getByText(/before anything is shared/i)).toBeInTheDocument();
    expect(screen.getByText("Try the real consent flow")).toBeInTheDocument();
    expect(screen.getByText("Create a sandbox partner request.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Create demo request →" })).toBeEnabled();
    expect(screen.getByText(/does not create a production decision/i)).toBeInTheDocument();
  });

  it("creates the demo through the session-bound Passport endpoint and shows a safe error", async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({ ok: true, requests: [] }), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ error: "Demo temporarily unavailable" }), { status: 400 }));
    vi.stubGlobal("fetch", fetchMock);

    render(wrap(<PassportRequestInbox showEmpty />));
    fireEvent.click(await screen.findByRole("button", { name: "Create demo request →" }));

    await waitFor(() => expect(fetchMock).toHaveBeenCalledWith(
      "/api/passport/demo-partner-request",
      expect.objectContaining({
        method: "POST",
        credentials: "include",
        body: JSON.stringify({ policy_id: "abraxas-core-v1" }),
      }),
    ));
    expect(await screen.findByRole("alert")).toHaveTextContent("Demo temporarily unavailable");
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
