// FILE: components/admin/PartnerSandboxSignoffPanel.test.tsx
// @vitest-environment jsdom

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { PartnerSandboxSignoffPanel } from "@/components/admin/PartnerSandboxSignoffPanel";
import { defaultSandboxPilotSignoff } from "@/lib/admin/partnerSandboxSignoff";

const signoff = defaultSandboxPilotSignoff("app-1");

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
