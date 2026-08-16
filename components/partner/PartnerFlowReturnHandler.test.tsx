// @vitest-environment jsdom
// FILE: components/partner/PartnerFlowReturnHandler.test.tsx

import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { PartnerFlowReturnHandler } from "./PartnerFlowReturnHandler";

const baseProps = {
  suiAddress: "0x1234567890abcdef1234567890abcdef12345678",
  identityStatus: "earned",
  hasCredential: true,
  returnPath: encodeURIComponent("https://partner.example/callback"),
  partnerId: "demo_partner",
  policyId: "demo-policy-v1",
  verificationRequestId: "vr_demo",
};

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

beforeEach(() => {
  vi.spyOn(console, "error").mockImplementation(() => {});
  vi.spyOn(console, "log").mockImplementation(() => {});
});

describe("PartnerFlowReturnHandler", () => {
  it("renders nothing when handoff preconditions are not met", () => {
    const { container } = render(
      <PartnerFlowReturnHandler
        {...baseProps}
        identityStatus="pending"
        hasCredential={false}
      />,
    );
    expect(container).toBeEmptyDOMElement();
  });

  it("shows completing copy while the handoff request is in flight", async () => {
    let resolveFetch!: (value: Response) => void;
    vi.stubGlobal("fetch", vi.fn(() => new Promise<Response>((resolve) => {
      resolveFetch = resolve;
    })));

    render(<PartnerFlowReturnHandler {...baseProps} />);

    expect(await screen.findByText("Returning you to the partner app…")).toBeInTheDocument();

    resolveFetch(new Response(JSON.stringify({ redirect_url: "https://partner.example/done" }), { status: 200 }));
  });

  it("shows fixed handoff failure copy without raw API error text", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ error: "internal_secret_code" }), { status: 500 }),
    ));

    render(<PartnerFlowReturnHandler {...baseProps} />);

    expect(await screen.findByText("Couldn't return you to the partner app.")).toBeInTheDocument();
    expect(screen.queryByText("internal_secret_code")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Try again" })).toBeInTheDocument();
  });

  it("shows network failure copy on fetch throw", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("network_down_secret")));

    render(<PartnerFlowReturnHandler {...baseProps} />);

    expect(await screen.findByText("Connection problem during handoff.")).toBeInTheDocument();
    expect(screen.queryByText("network_down_secret")).not.toBeInTheDocument();
  });

  it("redirects when complete returns redirect_url", async () => {
    const locationSpy = { href: "" };
    Object.defineProperty(window, "location", {
      configurable: true,
      value: locationSpy,
    });

    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ redirect_url: "https://partner.example/done" }), { status: 200 }),
    ));

    render(<PartnerFlowReturnHandler {...baseProps} />);

    await waitFor(() => {
      expect(locationSpy.href).toBe("https://partner.example/done");
    });
  });

  it("retries handoff when Try again is clicked", async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({ error: "fail" }), { status: 500 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ redirect_url: "https://partner.example/done" }), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);

    const locationSpy = { href: "" };
    Object.defineProperty(window, "location", {
      configurable: true,
      value: locationSpy,
    });

    render(<PartnerFlowReturnHandler {...baseProps} />);

    const user = userEvent.setup();
    await screen.findByRole("button", { name: "Try again" });
    await user.click(screen.getByRole("button", { name: "Try again" }));

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledTimes(2);
    });
  });
});
