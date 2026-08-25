// @vitest-environment jsdom
// FILE: components/partner/PartnerWebhookSandboxPanel.test.tsx

import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { PartnerWebhookSandboxPanel } from "./PartnerWebhookSandboxPanel";
import { PARTNER_WEBHOOK_TEST_EVENT_TYPE } from "@/lib/partner/webhooks/types";

const statusPayload = {
  key_environment: "sandbox",
  has_webhooks_read_scope: true,
  webhook_configured: true,
  webhook_delivery_enabled: true,
  sandbox_notice: "Sandbox access notice",
  sandbox_test: {
    event_type: PARTNER_WEBHOOK_TEST_EVENT_TYPE,
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

const emptyDeliveriesPayload = { deliveries: [] as Array<Record<string, unknown>> };

const deliveredSandboxTestPayload = {
  deliveries: [
    {
      event_id: "evt-delivered-test-1",
      event_type: PARTNER_WEBHOOK_TEST_EVENT_TYPE,
      status: "delivered",
      occurred_at: "2026-08-08T00:00:00.000Z",
      delivered_at: "2026-08-08T00:00:05.000Z",
      attempt_count: 1,
      last_error_code: null,
    },
  ],
};

const deliveredNonTestPayload = {
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

function postCalls(fetchMock: ReturnType<typeof vi.fn>) {
  return fetchMock.mock.calls.filter(([url, init]) =>
    String(url).includes("/api/partner/webhooks/test-delivery") && init?.method === "POST",
  );
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
  it("does not fetch when enabled is false", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    render(<PartnerWebhookSandboxPanel apiKey="abx_test_secret" enabled={false} />);

    await new Promise((resolve) => setTimeout(resolve, 50));
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("does not POST to test-delivery on mount", async () => {
    const fetchMock = mockFetchSequence([
      () => new Response(JSON.stringify({ webhook_status: statusPayload }), { status: 200 }),
      () => new Response(JSON.stringify(emptyDeliveriesPayload), { status: 200 }),
    ]);

    render(<PartnerWebhookSandboxPanel apiKey="abx_test_secret" />);

    await waitFor(() => {
      expect(screen.getByTestId("sandbox-test-button")).toBeInTheDocument();
    });

    expect(postCalls(fetchMock)).toHaveLength(0);
  });

  it("does not POST when delivery history refresh is clicked", async () => {
    const user = userEvent.setup();
    const fetchMock = mockFetchSequence([
      () => new Response(JSON.stringify({ webhook_status: statusPayload }), { status: 200 }),
      () => new Response(JSON.stringify(emptyDeliveriesPayload), { status: 200 }),
      () => new Response(JSON.stringify({ webhook_status: statusPayload }), { status: 200 }),
      () => new Response(JSON.stringify(emptyDeliveriesPayload), { status: 200 }),
    ]);

    render(<PartnerWebhookSandboxPanel apiKey="abx_test_secret" />);

    await screen.findByTestId("delivery-history-refresh");
    await user.click(screen.getByTestId("delivery-history-refresh"));

    await waitFor(() => {
      expect(fetchMock.mock.calls.length).toBeGreaterThanOrEqual(4);
    });
    expect(postCalls(fetchMock)).toHaveLength(0);
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
      () => new Response(JSON.stringify(emptyDeliveriesPayload), { status: 200 }),
    ]);

    render(<PartnerWebhookSandboxPanel apiKey="abx_test_secret" />);

    await screen.findByText(/Sandbox test enqueue is not available/i);
    expect(screen.queryByTestId("sandbox-test-button")).not.toBeInTheDocument();
    expect(screen.queryByTestId("sandbox-test-repeat-button")).not.toBeInTheDocument();
  });

  it("POSTs test-delivery only after first-send click and shows queued success copy", async () => {
    const user = userEvent.setup();
    const fetchMock = mockFetchSequence([
      () => new Response(JSON.stringify({ webhook_status: statusPayload }), { status: 200 }),
      () => new Response(JSON.stringify(emptyDeliveriesPayload), { status: 200 }),
      () => new Response(JSON.stringify({
        ok: true,
        queued: true,
        event_id: "evt-queued-1",
      }), { status: 200 }),
      () => new Response(JSON.stringify({ webhook_status: statusPayload }), { status: 200 }),
      () => new Response(JSON.stringify(emptyDeliveriesPayload), { status: 200 }),
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

    expect(postCalls(fetchMock)).toHaveLength(1);
  });

  it("shows repeat mode when a delivered sandbox test exists", async () => {
    mockFetchSequence([
      () => new Response(JSON.stringify({ webhook_status: statusPayload }), { status: 200 }),
      () => new Response(JSON.stringify(deliveredSandboxTestPayload), { status: 200 }),
    ]);

    render(<PartnerWebhookSandboxPanel apiKey="abx_test_secret" />);

    await screen.findByTestId("sandbox-test-completed");
    expect(screen.getByTestId("sandbox-test-repeat-button")).toBeInTheDocument();
    expect(screen.queryByTestId("sandbox-test-button")).not.toBeInTheDocument();
  });

  it("does not enter repeat mode for delivered non-test events", async () => {
    mockFetchSequence([
      () => new Response(JSON.stringify({ webhook_status: statusPayload }), { status: 200 }),
      () => new Response(JSON.stringify(deliveredNonTestPayload), { status: 200 }),
    ]);

    render(<PartnerWebhookSandboxPanel apiKey="abx_test_secret" />);

    await screen.findByTestId("sandbox-test-button");
    expect(screen.queryByTestId("sandbox-test-repeat-button")).not.toBeInTheDocument();
  });

  it("does not POST when opening the repeat confirmation dialog", async () => {
    const user = userEvent.setup();
    const fetchMock = mockFetchSequence([
      () => new Response(JSON.stringify({ webhook_status: statusPayload }), { status: 200 }),
      () => new Response(JSON.stringify(deliveredSandboxTestPayload), { status: 200 }),
    ]);

    render(<PartnerWebhookSandboxPanel apiKey="abx_test_secret" />);

    await user.click(await screen.findByTestId("sandbox-test-repeat-button"));

    expect(screen.getByTestId("sandbox-test-repeat-dialog")).toBeInTheDocument();
    expect(screen.getByText(/queues a new partner\.webhook\.test event with a new event ID/i)).toBeInTheDocument();
    expect(postCalls(fetchMock)).toHaveLength(0);
  });

  it("focuses cancel first in the repeat confirmation dialog", async () => {
    const user = userEvent.setup();
    mockFetchSequence([
      () => new Response(JSON.stringify({ webhook_status: statusPayload }), { status: 200 }),
      () => new Response(JSON.stringify(deliveredSandboxTestPayload), { status: 200 }),
    ]);

    render(<PartnerWebhookSandboxPanel apiKey="abx_test_secret" />);

    await user.click(await screen.findByTestId("sandbox-test-repeat-button"));

    const cancelButton = screen.getByTestId("sandbox-test-repeat-cancel");
    await waitFor(() => {
      expect(document.activeElement).toBe(cancelButton);
    });
  });

  it("dismisses repeat confirmation on Escape without POST", async () => {
    const user = userEvent.setup();
    const fetchMock = mockFetchSequence([
      () => new Response(JSON.stringify({ webhook_status: statusPayload }), { status: 200 }),
      () => new Response(JSON.stringify(deliveredSandboxTestPayload), { status: 200 }),
    ]);

    render(<PartnerWebhookSandboxPanel apiKey="abx_test_secret" />);

    const repeatButton = await screen.findByTestId("sandbox-test-repeat-button");
    await user.click(repeatButton);
    expect(screen.getByTestId("sandbox-test-repeat-dialog")).toBeInTheDocument();

    await user.keyboard("{Escape}");

    await waitFor(() => {
      expect(screen.queryByTestId("sandbox-test-repeat-dialog")).not.toBeInTheDocument();
    });
    expect(postCalls(fetchMock)).toHaveLength(0);
    await waitFor(() => {
      expect(document.activeElement).toBe(screen.getByTestId("sandbox-test-repeat-button"));
    });
  });

  it("does not POST when repeat confirmation is cancelled", async () => {
    const user = userEvent.setup();
    const fetchMock = mockFetchSequence([
      () => new Response(JSON.stringify({ webhook_status: statusPayload }), { status: 200 }),
      () => new Response(JSON.stringify(deliveredSandboxTestPayload), { status: 200 }),
    ]);

    render(<PartnerWebhookSandboxPanel apiKey="abx_test_secret" />);

    await user.click(await screen.findByTestId("sandbox-test-repeat-button"));
    await user.click(screen.getByTestId("sandbox-test-repeat-cancel"));

    expect(screen.queryByTestId("sandbox-test-repeat-dialog")).not.toBeInTheDocument();
    expect(postCalls(fetchMock)).toHaveLength(0);
  });

  it("POSTs only after confirming repeat", async () => {
    const user = userEvent.setup();
    const fetchMock = mockFetchSequence([
      () => new Response(JSON.stringify({ webhook_status: statusPayload }), { status: 200 }),
      () => new Response(JSON.stringify(deliveredSandboxTestPayload), { status: 200 }),
      () => new Response(JSON.stringify({
        ok: true,
        queued: true,
        event_id: "evt-queued-2",
        message: "Test delivery queued. Delivery is asynchronous; confirm receipt in your handler and via delivery history.",
      }), { status: 200 }),
      () => new Response(JSON.stringify({ webhook_status: statusPayload }), { status: 200 }),
      () => new Response(JSON.stringify(deliveredSandboxTestPayload), { status: 200 }),
    ]);

    render(<PartnerWebhookSandboxPanel apiKey="abx_test_secret" />);

    await user.click(await screen.findByTestId("sandbox-test-repeat-button"));
    await user.click(screen.getByTestId("sandbox-test-repeat-confirm"));

    await waitFor(() => {
      expect(screen.getByTestId("sandbox-test-success")).toBeInTheDocument();
    });

    const successText = screen.getByTestId("sandbox-test-success").textContent ?? "";
    expect(successText.toLowerCase()).toContain("queued");
    expect(postCalls(fetchMock)).toHaveLength(1);
  });

  it("shows safe rate-limit guidance from Retry-After", async () => {
    const user = userEvent.setup();
    mockFetchSequence([
      () => new Response(JSON.stringify({ webhook_status: statusPayload }), { status: 200 }),
      () => new Response(JSON.stringify(emptyDeliveriesPayload), { status: 200 }),
      () => new Response(JSON.stringify({
        error: "Rate limit exceeded",
        code: "rate_limited",
      }), {
        status: 429,
        headers: { "Retry-After": "45" },
      }),
    ]);

    render(<PartnerWebhookSandboxPanel apiKey="abx_test_secret" />);

    await user.click(await screen.findByTestId("sandbox-test-button"));

    const error = await screen.findByTestId("sandbox-test-error");
    expect(error.textContent).toContain("45 seconds");
    expect(error.textContent).not.toContain("SQL");
    expect(error.textContent).not.toContain("enqueue_partner");
  });

  it("renders webhook progress steps without inferring signature verified from delivery", async () => {
    mockFetchSequence([
      () => new Response(JSON.stringify({ webhook_status: statusPayload }), { status: 200 }),
      () => new Response(JSON.stringify(deliveredSandboxTestPayload), { status: 200 }),
    ]);

    render(
      <PartnerWebhookSandboxPanel
        apiKey="abx_test_secret"
        signatureVerifiedAcknowledged={false}
      />,
    );

    await screen.findByTestId("webhook-progress");
    expect(screen.getByTestId("webhook-progress-delivered")).toBeInTheDocument();
    expect(screen.getByTestId("webhook-progress-signature_verified").textContent).not.toMatch(/^✓/);
  });

  it("marks signature verified only when manually acknowledged", async () => {
    mockFetchSequence([
      () => new Response(JSON.stringify({ webhook_status: statusPayload }), { status: 200 }),
      () => new Response(JSON.stringify(deliveredSandboxTestPayload), { status: 200 }),
    ]);

    render(
      <PartnerWebhookSandboxPanel
        apiKey="abx_test_secret"
        signatureVerifiedAcknowledged
      />,
    );

    await screen.findByTestId("webhook-progress");
    const sigStep = screen.getByTestId("webhook-progress-signature_verified").textContent ?? "";
    expect(sigStep).toMatch(/^✓/);
  });

  it("renders delivery history delivered status without exposing endpoint or secret", async () => {
    mockFetchSequence([
      () => new Response(JSON.stringify({ webhook_status: statusPayload }), { status: 200 }),
      () => new Response(JSON.stringify(deliveredNonTestPayload), { status: 200 }),
    ]);

    const { container } = render(<PartnerWebhookSandboxPanel apiKey="abx_test_secret" />);

    await screen.findByTestId("delivery-history-table");
    expect(screen.getByTestId("delivery-history-table").textContent).toContain("delivered");

    const text = container.textContent ?? "";
    expect(text).not.toContain("https://partner.example.com/webhook");
    expect(text).not.toContain("abx_whsec_");
    expect(text).not.toContain("signing_secret");
    expect(text).not.toContain("abx_test_secret");
  });
});
