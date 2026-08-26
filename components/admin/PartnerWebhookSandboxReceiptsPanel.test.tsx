// @vitest-environment jsdom
// FILE: components/admin/PartnerWebhookSandboxReceiptsPanel.test.tsx

import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { PartnerWebhookSandboxReceiptsPanel } from "./PartnerWebhookSandboxReceiptsPanel";

const adminRequestMock = vi.fn();

const gateState = vi.hoisted(() => ({
  usePinUnlock: false,
  loading: false,
  authorized: true,
}));

vi.mock("@/lib/admin/productionAdminSessionUi", () => ({
  PRODUCTION_ADMIN_UNAUTHORIZED_MESSAGE: "Sign in with an authorized Google account.",
  ProductionAdminSessionStatus: () => <div>session-status</div>,
  useProductionAdminSessionGate: () => ({
    usePinUnlock: gateState.usePinUnlock,
    loading: gateState.loading,
    authorized: gateState.authorized,
    pin: "",
    setPin: vi.fn(),
    unlockWithPin: vi.fn(),
    unauthorizedMessage: "Sign in with an authorized Google account.",
    authorizedLabel: "Signed in · authorized",
    adminRequest: (...args: unknown[]) => adminRequestMock(...args),
  }),
}));

const receiptsPayload = {
  receipts: [
    {
      event_id: "evt-test-1",
      partner_id: "partner-sandbox",
      event_type: "partner.webhook.test",
      received_at: "2026-08-08T00:00:05.000Z",
    },
  ],
};

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

beforeEach(() => {
  vi.spyOn(console, "error").mockImplementation(() => {});
  gateState.usePinUnlock = false;
  gateState.loading = false;
  gateState.authorized = true;
});

describe("PartnerWebhookSandboxReceiptsPanel", () => {
  it("does not request receipt data before Load is clicked", () => {
    render(<PartnerWebhookSandboxReceiptsPanel />);

    expect(screen.getByTestId("sandbox-receipts-partner-input")).toBeInTheDocument();
    expect(adminRequestMock).not.toHaveBeenCalled();
  });

  it("prefills partner input from initialPartnerId without fetching", () => {
    render(<PartnerWebhookSandboxReceiptsPanel initialPartnerId="partner-sandbox" />);

    expect(screen.getByTestId("sandbox-receipts-partner-input")).toHaveValue("partner-sandbox");
    expect(adminRequestMock).not.toHaveBeenCalled();
  });

  it("clears stale receipt results when initialPartnerId changes", async () => {
    const user = userEvent.setup();
    adminRequestMock.mockResolvedValue(
      new Response(JSON.stringify(receiptsPayload), { status: 200 }),
    );

    const { rerender } = render(<PartnerWebhookSandboxReceiptsPanel initialPartnerId="partner-sandbox" />);
    await user.click(screen.getByTestId("sandbox-receipts-load-button"));
    await screen.findByTestId("sandbox-receipts-table");

    rerender(<PartnerWebhookSandboxReceiptsPanel initialPartnerId="partner-other" />);

    expect(screen.getByTestId("sandbox-receipts-partner-input")).toHaveValue("partner-other");
    expect(screen.queryByTestId("sandbox-receipts-table")).not.toBeInTheDocument();
    expect(adminRequestMock).toHaveBeenCalledTimes(1);
  });

  it("uses adminRequest after explicit partner entry and Load click", async () => {
    const user = userEvent.setup();
    adminRequestMock.mockResolvedValue(
      new Response(JSON.stringify(receiptsPayload), { status: 200 }),
    );

    render(<PartnerWebhookSandboxReceiptsPanel />);

    await user.type(screen.getByTestId("sandbox-receipts-partner-input"), "partner-sandbox");
    await user.click(screen.getByTestId("sandbox-receipts-load-button"));

    await waitFor(() => {
      expect(adminRequestMock).toHaveBeenCalledTimes(1);
    });

    const [url, init] = adminRequestMock.mock.calls[0] as [string, RequestInit];
    expect(url).toContain("partner_id=partner-sandbox");
    expect(init?.cache).toBe("no-store");
  });

  it("does not render a Production Admin PIN field", () => {
    render(<PartnerWebhookSandboxReceiptsPanel />);
    expect(screen.queryByPlaceholderText("Admin PIN")).not.toBeInTheDocument();
    expect(screen.queryByPlaceholderText("Admin PIN (if not signed in)")).not.toBeInTheDocument();
  });

  it("renders verified receipt metadata without secrets, payloads, or endpoint URLs", async () => {
    const user = userEvent.setup();
    adminRequestMock.mockResolvedValue(
      new Response(JSON.stringify(receiptsPayload), { status: 200 }),
    );

    const { container } = render(<PartnerWebhookSandboxReceiptsPanel />);
    await user.type(screen.getByTestId("sandbox-receipts-partner-input"), "partner-sandbox");
    await user.click(screen.getByTestId("sandbox-receipts-load-button"));
    await screen.findByTestId("sandbox-receipts-table");

    const text = container.textContent ?? "";
    expect(text).toContain("evt-test-1");
    expect(text).toContain("Sandbox test");
    expect(text).not.toContain("https://");
    expect(text).not.toContain("abx_whsec_");
    expect(text).not.toContain("signing_secret");
    expect(text).not.toContain("response_snippet");
    expect(text).not.toContain("\"payload\"");
  });

  it("shows Google sign-in copy when unauthorized in browser-session mode", () => {
    gateState.usePinUnlock = false;
    gateState.loading = false;
    gateState.authorized = false;

    render(<PartnerWebhookSandboxReceiptsPanel />);

    expect(screen.getByText("Sign in with an authorized Google account.")).toBeInTheDocument();
    expect(screen.queryByText(/Sign in via the admin layout gate/i)).not.toBeInTheDocument();
  });
});
