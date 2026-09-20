// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import { PartnerWebhookDeliveryHealthPanel } from "@/components/partner/launchpad/PartnerWebhookDeliveryHealthPanel";
import { buildWebhookDeliveryHealthView } from "@/lib/partner/launchpad/webhookDeliveryHealth/view";

describe("PartnerWebhookDeliveryHealthPanel", () => {
  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it("renders optional empty state and docs links", async () => {
    const payload = buildWebhookDeliveryHealthView({
      applicationId: "app-1",
      partnerId: "partner-a",
      webhookConfigured: false,
      signingSecretConfigured: false,
      deliveryEnabled: false,
      endpointUrl: null,
      retryReady: false,
      schemaReady: true,
      deliveries: [],
      deliveryScope: "app_policy",
    });
    vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify(payload), { status: 200 })));
    const { container } = render(<PartnerWebhookDeliveryHealthPanel applicationId="app-1" />);
    await waitFor(() => {
      expect(screen.getAllByText(/Webhooks are optional/i).length).toBeGreaterThan(0);
    });
    expect(screen.getByRole("link", { name: /Sandbox HMAC fixture/i }).getAttribute("href")).toContain("capability=webhooks");
    expect(screen.getByRole("link", { name: /Starter Kit/i }).getAttribute("href")).toBe("/docs/starter-kit");
    expect(screen.getByRole("link", { name: /Integration Studio/i }).getAttribute("href")).toBe("/developers/integration-studio");
    expect(container.textContent).not.toMatch(/Send TEST EVENT|abx_whsec_|receipt_id|https:\/\/hooks/);
    expect(screen.getByRole("heading", { name: /This app’s policy deliveries/i })).toBeTruthy();
  });

  it("labels unattributable rows as partner-wide, not this app", async () => {
    const payload = buildWebhookDeliveryHealthView({
      applicationId: "app-1",
      partnerId: "partner-a",
      webhookConfigured: true,
      signingSecretConfigured: true,
      deliveryEnabled: true,
      endpointUrl: null,
      retryReady: true,
      schemaReady: true,
      deliveries: [{
        outbox_id: "out-unknown",
        event_type: "partner.receipt.issued",
        status: "failed",
        occurred_at: "2026-09-20T00:00:00.000Z",
        delivered_at: null,
        last_error_code: "timeout",
      }],
      deliveryScope: "partner_wide",
    });
    vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify(payload), { status: 200 })));
    const { container } = render(<PartnerWebhookDeliveryHealthPanel applicationId="app-1" />);
    await waitFor(() => {
      expect(screen.getByRole("heading", { name: /Partner-wide webhook delivery health/i })).toBeTruthy();
    });
    expect(container.textContent).toMatch(/not this app/i);
    expect(container.querySelector("caption")?.textContent).toMatch(/partner-wide/i);
    expect(container.textContent).not.toMatch(/Recent deliveries for this app/);
  });
});
