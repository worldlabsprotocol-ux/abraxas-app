// FILE: components/admin/PartnerSandboxSignoffPanel.test.tsx
// @vitest-environment jsdom

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { PartnerSandboxSignoffPanel } from "@/components/admin/PartnerSandboxSignoffPanel";
import {
  defaultSandboxPilotSignoff,
  WEBHOOK_EVENT_CHANGE_REQUIRES_GATE_RESET_MESSAGE,
} from "@/lib/admin/partnerSandboxSignoff";

const signoff = defaultSandboxPilotSignoff("app-1");
const SAMPLE_EVENT_ID = "11111111-1111-4111-8111-111111111111";

function mockFetchSequence(responses: Array<{ status: number; body?: unknown }>) {
  return vi.fn(async () => {
    const next = responses.shift();
    if (!next) throw new Error("unexpected fetch");
    return new Response(next.body ? JSON.stringify(next.body) : null, {
      status: next.status,
      headers: next.body ? { "Content-Type": "application/json" } : undefined,
    });
  });
}

describe("PartnerSandboxSignoffPanel", () => {
  beforeEach(() => {
    vi.stubGlobal(
      "fetch",
      mockFetchSequence([
        {
          status: 200,
          body: { signoff, reviewer_notes: "ops note", application: { id: "app-1", status: "onboarded" } },
        },
      ]),
    );
  });

  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it("renders separate save sign-off and save notes buttons", async () => {
    render(
      <PartnerSandboxSignoffPanel
        partnerId="acme-v1"
        applicationId="app-1"
        adminRequest={fetch}
        usePinUnlock={false}
      />,
    );
    await waitFor(() => {
      expect(screen.getByTestId("save-signoff")).toBeTruthy();
      expect(screen.getByTestId("save-notes")).toBeTruthy();
    });
  });

  it("shows production separation banner above continuation gate", async () => {
    render(
      <PartnerSandboxSignoffPanel
        partnerId="acme-v1"
        applicationId="app-1"
        adminRequest={fetch}
        usePinUnlock={false}
      />,
    );
    await waitFor(() => {
      expect(screen.getByText(/Sandbox completion does not grant Production access/)).toBeTruthy();
      expect(screen.getByTestId("gate-approved_for_pilot_continuation")).toBeTruthy();
    });
  });

  it("renders separate Partner Flow and webhook track sections", async () => {
    render(
      <PartnerSandboxSignoffPanel
        partnerId="acme-v1"
        applicationId="app-1"
        adminRequest={fetch}
        usePinUnlock={false}
      />,
    );
    await waitFor(() => {
      expect(screen.getByTestId("partner-flow-signoff-section")).toBeTruthy();
      expect(screen.getByTestId("webhook-track-signoff-section")).toBeTruthy();
      expect(screen.getByTestId("gate-webhook-queued")).toBeTruthy();
      expect(screen.getByTestId("gate-webhook-http-delivered")).toBeTruthy();
      expect(screen.getByTestId("gate-webhook-signature-verified")).toBeTruthy();
    });
  });

  it("toggling http delivered does not check signature verified", async () => {
    render(
      <PartnerSandboxSignoffPanel
        partnerId="acme-v1"
        applicationId="app-1"
        adminRequest={fetch}
        usePinUnlock={false}
      />,
    );
    await waitFor(() => screen.getByTestId("gate-webhook-queued"));
    fireEvent.click(screen.getByTestId("gate-webhook-queued"));
    fireEvent.click(screen.getByTestId("gate-webhook-http-delivered"));
    expect((screen.getByTestId("gate-webhook-http-delivered") as HTMLInputElement).checked).toBe(true);
    expect((screen.getByTestId("gate-webhook-signature-verified") as HTMLInputElement).checked).toBe(false);
  });

  it("blocks event_id replacement while webhook gates remain acknowledged", async () => {
    const loaded = defaultSandboxPilotSignoff("app-1");
    loaded.evidence.event_id = SAMPLE_EVENT_ID;
    loaded.gates.webhook_track = {
      queued: { operator_ack: true, acknowledged_at: "t" },
      http_delivered: { operator_ack: false, acknowledged_at: null },
      signature_verified_by_receiver: { operator_ack: false, acknowledged_at: null },
    };

    vi.stubGlobal(
      "fetch",
      mockFetchSequence([
        {
          status: 200,
          body: { signoff: loaded, reviewer_notes: "", application: { id: "app-1", status: "onboarded" } },
        },
      ]),
    );

    render(
      <PartnerSandboxSignoffPanel
        partnerId="acme-v1"
        applicationId="app-1"
        adminRequest={fetch}
        usePinUnlock={false}
      />,
    );

    await waitFor(() => screen.getByTestId("evidence-event-id"));
    const input = screen.getByTestId("evidence-event-id") as HTMLInputElement;
    fireEvent.change(input, { target: { value: "22222222-2222-4222-8222-222222222222" } });

    await waitFor(() => {
      expect(screen.getByTestId("event-id-blocked-message").textContent).toBe(
        WEBHOOK_EVENT_CHANGE_REQUIRES_GATE_RESET_MESSAGE,
      );
    });
    expect((screen.getByTestId("save-signoff") as HTMLButtonElement).disabled).toBe(true);
  });

  it("does not auto-reset webhook gates when event_id is edited", async () => {
    const loaded = defaultSandboxPilotSignoff("app-1");
    loaded.evidence.event_id = SAMPLE_EVENT_ID;
    loaded.gates.webhook_track = {
      queued: { operator_ack: true, acknowledged_at: "t" },
      http_delivered: { operator_ack: false, acknowledged_at: null },
      signature_verified_by_receiver: { operator_ack: false, acknowledged_at: null },
    };

    vi.stubGlobal(
      "fetch",
      mockFetchSequence([
        {
          status: 200,
          body: { signoff: loaded, reviewer_notes: "", application: { id: "app-1", status: "onboarded" } },
        },
      ]),
    );

    render(
      <PartnerSandboxSignoffPanel
        partnerId="acme-v1"
        applicationId="app-1"
        adminRequest={fetch}
        usePinUnlock={false}
      />,
    );

    await waitFor(() => screen.getByTestId("evidence-event-id"));
    fireEvent.change(screen.getByTestId("evidence-event-id"), {
      target: { value: "22222222-2222-4222-8222-222222222222" },
    });
    expect((screen.getByTestId("gate-webhook-queued") as HTMLInputElement).checked).toBe(true);
  });

  it("includes observability and sandbox receipt links with honest partner ID copy", async () => {
    render(
      <PartnerSandboxSignoffPanel
        partnerId="acme-v1"
        applicationId="app-1"
        adminRequest={fetch}
        usePinUnlock={false}
      />,
    );
    await waitFor(() => {
      expect(screen.getByTestId("link-webhook-observability").getAttribute("href")).toBe(
        "/admin/partners?tab=observability",
      );
      expect(screen.getByTestId("link-webhook-sandbox-receipts").getAttribute("href")).toBe(
        "/admin/partners?tab=sandbox-receipts",
      );
      expect(screen.getByText(/partner ID is not prefilled/)).toBeTruthy();
      expect(screen.getByText(/acme-v1/)).toBeTruthy();
    });
  });

  it("does not render webhook send, retry, or observability load controls", async () => {
    render(
      <PartnerSandboxSignoffPanel
        partnerId="acme-v1"
        applicationId="app-1"
        adminRequest={fetch}
        usePinUnlock={false}
      />,
    );
    await waitFor(() => screen.getByTestId("webhook-track-signoff-section"));
    expect(screen.queryByTestId("observability-load-button")).toBeNull();
    expect(screen.queryByText(/Send test/i)).toBeNull();
    expect(screen.queryByText(/Retry/i)).toBeNull();
  });

  it("keeps notes state unchanged when sign-off save returns 409", async () => {
    const adminRequest = vi.fn()
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({ signoff, reviewer_notes: "keep", application: { id: "app-1", status: "onboarded" } }),
          { status: 200, headers: { "Content-Type": "application/json" } },
        ),
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ error: "checklist_conflict" }), {
          status: 409,
          headers: { "Content-Type": "application/json" },
        }),
      );

    render(
      <PartnerSandboxSignoffPanel
        partnerId="acme-v1"
        applicationId="app-1"
        adminRequest={adminRequest}
        usePinUnlock={false}
      />,
    );

    await waitFor(() => screen.getByTestId("reviewer-notes"));
    const notes = screen.getByTestId("reviewer-notes") as HTMLTextAreaElement;
    expect(notes.value).toBe("keep");

    fireEvent.click(screen.getByTestId("gate-configured"));
    fireEvent.click(screen.getByTestId("save-signoff"));

    await waitFor(() => {
      expect(screen.getByText(/Another update occurred/)).toBeTruthy();
    });
    expect((screen.getByTestId("reviewer-notes") as HTMLTextAreaElement).value).toBe("keep");
    expect(adminRequest).toHaveBeenCalledTimes(2);
    const patchCall = adminRequest.mock.calls[1]?.[1] as RequestInit | undefined;
    expect(patchCall?.method).toBe("PATCH");
    expect(String(patchCall?.body)).not.toContain("/api/partner/webhooks");
  });

  it("wraps at narrow width without horizontal overflow class issues", async () => {
    render(
      <div style={{ width: 375 }}>
        <PartnerSandboxSignoffPanel
          partnerId="acme-v1"
          applicationId="app-1"
          adminRequest={fetch}
          usePinUnlock={false}
        />
      </div>,
    );
    await waitFor(() => screen.getByTestId("partner-sandbox-signoff-panel"));
    const panel = screen.getByTestId("partner-sandbox-signoff-panel");
    expect(panel.scrollWidth).toBeLessThanOrEqual(375);
  });
});
