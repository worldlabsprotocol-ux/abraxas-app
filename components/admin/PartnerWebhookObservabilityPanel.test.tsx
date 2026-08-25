// @vitest-environment jsdom
// FILE: components/admin/PartnerWebhookObservabilityPanel.test.tsx

import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { PartnerWebhookObservabilityPanel } from "./PartnerWebhookObservabilityPanel";

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

const observabilityPayload = {
  partner_id: "partner-a",
  webhook_configured: true,
  webhook_delivery_enabled: true,
  status_counts: {
    pending: 0,
    delivering: 0,
    retrying: 0,
    delivered: 1,
    failed: 0,
    unknown: 0,
  },
  dispatch_summary_available: false,
  follow_up: { recommended: false, reasons: [] },
  deliveries: [
    {
      event_id: "evt-1",
      event_type: "partner.receipt.issued",
      status: "delivered",
      delivery_state: "delivered",
      occurred_at: "2026-08-08T00:00:00.000Z",
      delivered_at: "2026-08-08T00:00:05.000Z",
      attempt_count: 1,
      last_error_code: null,
    },
  ],
  disclaimer: "Queued, delivering, or retrying does not mean delivered.",
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

describe("PartnerWebhookObservabilityPanel", () => {
  it("does not request observability data before Load is clicked", async () => {
    render(<PartnerWebhookObservabilityPanel />);

    expect(screen.getByTestId("observability-partner-input")).toBeInTheDocument();
    expect(adminRequestMock).not.toHaveBeenCalled();
  });

  it("uses adminRequest after explicit partner entry and Load click", async () => {
    const user = userEvent.setup();
    adminRequestMock.mockResolvedValue(
      new Response(JSON.stringify({ observability: observabilityPayload }), { status: 200 }),
    );

    render(<PartnerWebhookObservabilityPanel />);

    await user.type(screen.getByTestId("observability-partner-input"), "partner-a");
    await user.click(screen.getByTestId("observability-load-button"));

    await waitFor(() => {
      expect(adminRequestMock).toHaveBeenCalledTimes(1);
    });

    const [url, init] = adminRequestMock.mock.calls[0] as [string, RequestInit];
    expect(url).toContain("partner_id=partner-a");
    expect(url).not.toContain("event_id=");
    expect(init?.cache).toBe("no-store");
  });

  it("does not render a Production Admin PIN field", () => {
    render(<PartnerWebhookObservabilityPanel />);
    expect(screen.queryByPlaceholderText("Admin PIN")).not.toBeInTheDocument();
    expect(screen.queryByPlaceholderText("Admin PIN (if not signed in)")).not.toBeInTheDocument();
  });

  it("renders scheduler-unavailable copy when dispatch summary is unavailable", async () => {
    const user = userEvent.setup();
    adminRequestMock.mockResolvedValue(
      new Response(JSON.stringify({ observability: observabilityPayload }), { status: 200 }),
    );

    render(<PartnerWebhookObservabilityPanel />);
    await user.type(screen.getByTestId("observability-partner-input"), "partner-a");
    await user.click(screen.getByTestId("observability-load-button"));

    expect(await screen.findByTestId("scheduler-unavailable-copy")).toHaveTextContent(
      "Scheduler context unavailable in this environment.",
    );
  });

  it("requests attempts with both partner_id and event_id on expansion", async () => {
    const user = userEvent.setup();
    adminRequestMock
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ observability: observabilityPayload }), { status: 200 }),
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify({
          attempts: [{ attempt_number: 1, http_status: 200, error_code: null, attempted_at: "2026-08-08T00:00:00.000Z" }],
        }), { status: 200 }),
      );

    render(<PartnerWebhookObservabilityPanel />);
    await user.type(screen.getByTestId("observability-partner-input"), "partner-a");
    await user.click(screen.getByTestId("observability-load-button"));
    await screen.findByTestId("expand-attempts-evt-1");
    await user.click(screen.getByTestId("expand-attempts-evt-1"));

    await waitFor(() => {
      expect(adminRequestMock).toHaveBeenCalledTimes(2);
    });

    const attemptUrl = adminRequestMock.mock.calls[1]?.[0] as string;
    expect(attemptUrl).toContain("partner_id=partner-a");
    expect(attemptUrl).toContain("event_id=evt-1");
  });

  it("never renders endpoint URLs, secrets, prefixes, payloads, or response snippets", async () => {
    const user = userEvent.setup();
    adminRequestMock.mockResolvedValue(
      new Response(JSON.stringify({ observability: observabilityPayload }), { status: 200 }),
    );

    const { container } = render(<PartnerWebhookObservabilityPanel />);
    await user.type(screen.getByTestId("observability-partner-input"), "partner-a");
    await user.click(screen.getByTestId("observability-load-button"));
    await screen.findByTestId("observability-delivery-table");

    const text = container.textContent ?? "";
    expect(text).toContain("delivered");
    expect(text).not.toContain("https://partner.example.com/webhook");
    expect(text).not.toContain("abx_whsec_");
    expect(text).not.toContain("signing_secret");
    expect(text).not.toContain("response_snippet");
    expect(text).not.toContain("\"payload\"");
  });

  it("shows Google sign-in copy when unauthorized in browser-session mode", () => {
    gateState.usePinUnlock = false;
    gateState.loading = false;
    gateState.authorized = false;

    render(<PartnerWebhookObservabilityPanel />);

    expect(screen.getByText("Sign in with an authorized Google account.")).toBeInTheDocument();
    expect(screen.queryByText(/Sign in via the admin layout gate/i)).not.toBeInTheDocument();
  });
});
