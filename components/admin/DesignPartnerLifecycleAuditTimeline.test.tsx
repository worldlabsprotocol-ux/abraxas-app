// FILE: components/admin/DesignPartnerLifecycleAuditTimeline.test.tsx
// @vitest-environment jsdom

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { DesignPartnerLifecycleAuditTimeline } from "@/components/admin/DesignPartnerLifecycleAuditTimeline";

const APPLICATION_ID = "00000000-0000-4000-8000-000000000010";
const OTHER_APPLICATION_ID = "00000000-0000-4000-8000-000000000011";

const gateState = vi.hoisted(() => ({
  loading: false,
  authorized: true,
  usePinUnlock: true,
  pin: "test-pin",
}));

const adminFetchMock = vi.hoisted(() => vi.fn());

vi.mock("@/lib/admin/productionAdminSessionUi", () => ({
  useProductionAdminSessionGate: () => ({
    loading: gateState.loading,
    authorized: gateState.authorized,
    usePinUnlock: gateState.usePinUnlock,
    pin: gateState.pin,
    setPin: vi.fn(),
    unlockWithPin: vi.fn(),
    unauthorizedMessage: "Sign in",
    authorizedLabel: "Signed in",
    adminRequest: vi.fn(),
  }),
}));

vi.mock("@/lib/admin/adminFetch", () => ({
  adminFetch: (...args: unknown[]) => adminFetchMock(...args),
}));

function pageResponse(events: Array<Record<string, unknown>>, nextCursor: string | null = null) {
  return {
    application_id: APPLICATION_ID,
    events,
    next_cursor: nextCursor,
  };
}

const approvedEvent = {
  event_type: "admin.design_partner.approved",
  from_status: "submitted",
  to_status: "approved",
  promoted_partner_id: null,
  occurred_at: "2026-06-02T12:00:00.000Z",
  operator_label: "Authorized operator",
};

const promotedEvent = {
  event_type: "admin.design_partner.promoted",
  from_status: "approved",
  to_status: "onboarded",
  promoted_partner_id: "acme-v1",
  occurred_at: "2026-06-01T12:00:00.000Z",
  operator_label: "PIN session",
};

describe("DesignPartnerLifecycleAuditTimeline", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    gateState.loading = false;
    gateState.authorized = true;
    gateState.usePinUnlock = true;
    gateState.pin = "test-pin";
    adminFetchMock.mockReset();
    global.fetch = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes("cursor=page-2")) {
        return {
          ok: true,
          status: 200,
          json: async () => pageResponse([promotedEvent]),
        } as Response;
      }
      return {
        ok: true,
        status: 200,
        json: async () => pageResponse([approvedEvent], "page-2"),
      } as Response;
    }) as typeof fetch;
  });

  afterEach(() => {
    cleanup();
  });

  it("performs one initial request per mount and does not duplicate on rerender", async () => {
    const { rerender } = render(<DesignPartnerLifecycleAuditTimeline applicationId={APPLICATION_ID} />);
    await waitFor(() => expect(global.fetch).toHaveBeenCalledTimes(1));
    const initialUrl = String((global.fetch as ReturnType<typeof vi.fn>).mock.calls[0]?.[0]);
    expect(initialUrl).toContain(`/api/admin/design-partners/${APPLICATION_ID}/lifecycle-audit`);
    expect(initialUrl).not.toContain("cursor=");

    rerender(<DesignPartnerLifecycleAuditTimeline applicationId={APPLICATION_ID} />);
    expect(global.fetch).toHaveBeenCalledTimes(1);
  });

  it("does not fetch when admin session is not authorized", async () => {
    gateState.authorized = false;
    render(<DesignPartnerLifecycleAuditTimeline applicationId={APPLICATION_ID} />);
    await waitFor(() => {
      expect(global.fetch).not.toHaveBeenCalled();
      expect(adminFetchMock).not.toHaveBeenCalled();
    });
  });

  it("aborts or ignores stale responses on unmount and application change", async () => {
    let resolveFirst: ((value: Response) => void) | undefined;
    const firstPromise = new Promise<Response>((resolve) => {
      resolveFirst = resolve;
    });
    (global.fetch as ReturnType<typeof vi.fn>)
      .mockImplementationOnce(() => firstPromise)
      .mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => pageResponse([approvedEvent]),
      } as Response);

    const { rerender, unmount } = render(
      <DesignPartnerLifecycleAuditTimeline applicationId={APPLICATION_ID} />,
    );
    rerender(<DesignPartnerLifecycleAuditTimeline applicationId={OTHER_APPLICATION_ID} />);
    await waitFor(() => expect(global.fetch).toHaveBeenCalledTimes(2));

    resolveFirst?.({
      ok: true,
      status: 200,
      json: async () => pageResponse([approvedEvent], null),
    } as Response);

    unmount();
    expect(screen.queryByTestId(`design-partner-lifecycle-audit-${APPLICATION_ID}`)).toBeNull();
  });

  it("renders empty state, labels, and incomplete-history notice", async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => pageResponse([]),
    } as Response);
    render(<DesignPartnerLifecycleAuditTimeline applicationId={APPLICATION_ID} />);
    await waitFor(() => {
      expect(screen.getByTestId("design-partner-lifecycle-audit-status").textContent)
        .toBe("No lifecycle events recorded for this application.");
    });
    expect(screen.getByTestId("design-partner-lifecycle-audit-notice").textContent)
      .toContain("Approve/reject history before atomic wiring may be incomplete.");
  });

  it("renders timeline labels for lifecycle actions", async () => {
    render(<DesignPartnerLifecycleAuditTimeline applicationId={APPLICATION_ID} />);
    await waitFor(() => {
      expect(screen.getByText("Approved")).toBeTruthy();
    });
    expect(screen.getByText("submitted → approved")).toBeTruthy();
  });

  it("supports manual load more without duplicate cursor requests", async () => {
    render(<DesignPartnerLifecycleAuditTimeline applicationId={APPLICATION_ID} />);
    await waitFor(() => screen.getByTestId("design-partner-lifecycle-audit-load-more"));
    const button = screen.getByTestId("design-partner-lifecycle-audit-load-more");
    fireEvent.click(button);
    fireEvent.click(button);
    await waitFor(() => expect(global.fetch).toHaveBeenCalledTimes(2));
    const secondUrl = String((global.fetch as ReturnType<typeof vi.fn>).mock.calls[1]?.[0]);
    expect(secondUrl).toContain("cursor=page-2");
    expect(screen.getByText("Promoted to sandbox")).toBeTruthy();
    expect(screen.getByText("Approved")).toBeTruthy();
  });

  it("does not issue lifecycle mutation requests", async () => {
    render(<DesignPartnerLifecycleAuditTimeline applicationId={APPLICATION_ID} />);
    await waitFor(() => expect(global.fetch).toHaveBeenCalled());
    for (const call of (global.fetch as ReturnType<typeof vi.fn>).mock.calls) {
      const init = call[1] as RequestInit | undefined;
      expect(init?.method ?? "GET").toBe("GET");
      const url = String(call[0]);
      expect(url).not.toContain("/promote");
      expect(url).not.toMatch(/\/api\/admin\/design-partners$/);
    }
  });
});
