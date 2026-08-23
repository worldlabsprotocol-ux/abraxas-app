// @vitest-environment jsdom
// FILE: components/partner/PartnerWebhookSandboxPanel.test.tsx

import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { PartnerWebhookSandboxPanel } from "./PartnerWebhookSandboxPanel";

const statusPayload = {
  key_environment: "sandbox",
  has_webhooks_read_scope: true,
  webhook_configured: true,
  webhook_delivery_enabled: true,
  sandbox_notice: "Sandbox access notice",
  sandbox_test: {
    event_type: "partner.webhook.test",
    available: true,
    requires_sandbox_key: true,
    readiness: {
      schema_ready: true,
      test_enqueue_ready: true,
      delivery_enabled: true,
      dispatch_ready: true,
      signing_ready: true,
    },
    blocked_reasons: [],
  },
  disclaimer: "Webhook notifications are not proof of access.",
  endpoints: {
    delivery_history: "/api/v1/partner/webhooks/deliveries",
    sandbox_test_enqueue: "/api/partner/webhooks/test-delivery",
    status: "/api/partner/webhooks/status",
  },
};

const deliveriesPayload = {
  deliveries: [
    {
      event_id: "evt-delivered-1",
      event_type: "partner.receipt.issued",
      status: "delivered",
      occurred_at: "2026-08-08T00:00:00.000Z",
      delivered_at: "2026-08-08T00:00:05.000Z",
      attempt_count: 1,
      last_error_code: null,
    },
  ],
};

function mockFetchSequence(
  handlers: Array<(url: string, init?: RequestInit) => Response | Promise<Response>>,
) {
  const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = typeof input === "string" ? input : input.toString();
    const handler = handlers.shift();
    if (!handler) {
      throw new Error(`Unexpected fetch: ${url}`);
    }
    return handler(url, init);
  });
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

beforeEach(() => {
  vi.spyOn(console, "error").mockImplementation(() => {});
});

describe("PartnerWebhookSandboxPanel", () => {
  it("does not POST to test-delivery on mount", async () => {
    const fetchMock = mockFetchSequence([
      () => new Response(JSON.stringify({ webhook_status: statusPayload }), { status: 200 }),
      () => new Response(JSON.stringify(deliveriesPayload), { status: 200 }),
    ]);

    render(<PartnerWebhookSandboxPanel apiKey="abx_test_secret" />);

    await waitFor(() => {
      expect(screen.getByTestId("sandbox-test-button")).toBeInTheDocument();
    });

    const postCalls = fetchMock.mock.calls.filter(([, init]) => init?.method === "POST");
    expect(postCalls).toHaveLength(0);
  });

  it("disables the test button when sandbox test is unavailable", async () => {
    mockFetchSequence([
      () => new Response(JSON.stringify({
        webhook_status: {
          ...statusPayload,
          sandbox_test: {
            ...statusPayload.sandbox_test,
            available: false,
            blocked_reasons: ["test_enqueue_not_ready"],
          },
        },
      }), { status: 200 }),
      () => new Response(JSON.stringify(deliveriesPayload), { status: 200 }),
    ]);

    render(<PartnerWebhookSandboxPanel apiKey="abx_test_secret" />);

    const button = await screen.findByTestId("sandbox-test-button");
    expect(button).toBeDisabled();
  });

  it("POSTs test-delivery only after user click and shows queued success copy", async () => {
    const user = userEvent.setup();
    const fetchMock = mockFetchSequence([
      () => new Response(JSON.stringify({ webhook_status: statusPayload }), { status: 200 }),
      () => new Response(JSON.stringify(deliveriesPayload), { status: 200 }),
      () => new Response(JSON.stringify({
        ok: true,
        queued: true,
        event_id: "evt-queued-1",
        message: "Test event queued. Queued does not mean delivered.",
      }), { status: 200 }),
      () => new Response(JSON.stringify({ webhook_status: statusPayload }), { status: 200 }),
      () => new Response(JSON.stringify(deliveriesPayload), { status: 200 }),
    ]);

    render(<PartnerWebhookSandboxPanel apiKey="abx_test_secret" />);

    const button = await screen.findByTestId("sandbox-test-button");
    expect(button).toBeEnabled();

    await user.click(button);

    await waitFor(() => {
      expect(screen.getByTestId("sandbox-test-success")).toBeInTheDocument();
    });

    const successText = screen.getByTestId("sandbox-test-success").textContent ?? "";
    expect(successText.toLowerCase()).toContain("queued");
    expect(successText.toLowerCase()).not.toContain("delivered: true");
    expect(successText.toLowerCase()).not.toMatch(/\bwas delivered\b/);

    const postCalls = fetchMock.mock.calls.filter(([url, init]) =>
      String(url).includes("/api/partner/webhooks/test-delivery") && init?.method === "POST",
    );
    expect(postCalls).toHaveLength(1);
  });

  it("renders delivery history delivered status without exposing endpoint or secret", async () => {
    mockFetchSequence([
      () => new Response(JSON.stringify({ webhook_status: statusPayload }), { status: 200 }),
      () => new Response(JSON.stringify(deliveriesPayload), { status: 200 }),
    ]);

    const { container } = render(<PartnerWebhookSandboxPanel apiKey="abx_test_secret" />);

    await screen.findByTestId("delivery-history-table");
    expect(screen.getByText("delivered")).toBeInTheDocument();

    const text = container.textContent ?? "";
    expect(text).not.toContain("https://partner.example.com/webhook");
    expect(text).not.toContain("abx_whsec_");
    expect(text).not.toContain("signing_secret");
  });
});
