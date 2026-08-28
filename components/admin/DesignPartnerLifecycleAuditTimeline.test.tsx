// FILE: components/admin/DesignPartnerLifecycleAuditTimeline.test.tsx
// @vitest-environment jsdom

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { DesignPartnerLifecycleAuditTimeline } from "@/components/admin/DesignPartnerLifecycleAuditTimeline";
import {
  PRODUCTION_LIFECYCLE_AUDIT_APPLICATION_ID,
  PRODUCTION_LIFECYCLE_AUDIT_APPROVED_API_RESPONSE,
} from "@/lib/admin/designPartnerLifecycleAuditProductionFixture";

const APPLICATION_ID = "00000000-0000-4000-8000-000000000010";
const OTHER_APPLICATION_ID = "00000000-0000-4000-8000-000000000011";

const gateState = vi.hoisted(() => ({
  loading: false,
  authorized: true,
  usePinUnlock: true,
  pin: "test-pin",
}));

const adminRequestMock = vi.hoisted(() => vi.fn());
const adminRequestIdentity = vi.hoisted(() => ({ version: 0 }));

vi.mock("@/lib/admin/productionAdminSessionUi", () => ({
  useProductionAdminSessionGate: () => {
    adminRequestIdentity.version += 1;
    return {
      loading: gateState.loading,
      authorized: gateState.authorized,
      usePinUnlock: gateState.usePinUnlock,
      pin: gateState.pin,
      setPin: vi.fn(),
      unlockWithPin: vi.fn(),
      unauthorizedMessage: "Sign in",
      authorizedLabel: "Signed in",
      adminRequest: Object.assign(
        (...args: unknown[]) => adminRequestMock(...args),
        { identityVersion: adminRequestIdentity.version },
      ),
    };
  },
}));

function pageResponse(
  applicationId: string,
  events: Array<Record<string, unknown>>,
  nextCursor: string | null = null,
) {
  return {
    application_id: applicationId,
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

function mockLifecycleAuditFetch(
  handler?: (url: string) => Promise<Response>,
) {
  adminRequestMock.mockImplementation(async (input: RequestInfo | URL) => {
    const url = String(input);
    if (handler) {
      return handler(url);
    }
    if (url.includes("cursor=page-2")) {
      return {
        ok: true,
        status: 200,
        json: async () => pageResponse(APPLICATION_ID, [promotedEvent]),
      } as Response;
    }
    return {
      ok: true,
      status: 200,
      json: async () => pageResponse(APPLICATION_ID, [approvedEvent], "page-2"),
    } as Response;
  });
}

describe("DesignPartnerLifecycleAuditTimeline", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    gateState.loading = false;
    gateState.authorized = true;
    gateState.usePinUnlock = true;
    gateState.pin = "test-pin";
    adminRequestIdentity.version = 0;
    adminRequestMock.mockReset();
    mockLifecycleAuditFetch();
  });

  afterEach(() => {
    cleanup();
  });

  it("issues exactly one initial GET per application expansion", async () => {
    render(<DesignPartnerLifecycleAuditTimeline applicationId={APPLICATION_ID} />);
    await waitFor(() => expect(adminRequestMock).toHaveBeenCalledTimes(1));
    const initialUrl = String(adminRequestMock.mock.calls[0]?.[0]);
    expect(initialUrl).toContain(`/api/admin/design-partners/${APPLICATION_ID}/lifecycle-audit`);
    expect(initialUrl).not.toContain("cursor=");
  });

  it("issues zero additional GETs on ordinary rerenders", async () => {
    const { rerender } = render(<DesignPartnerLifecycleAuditTimeline applicationId={APPLICATION_ID} />);
    await waitFor(() => expect(adminRequestMock).toHaveBeenCalledTimes(1));

    rerender(<DesignPartnerLifecycleAuditTimeline applicationId={APPLICATION_ID} />);
    rerender(<DesignPartnerLifecycleAuditTimeline applicationId={APPLICATION_ID} />);
    expect(adminRequestMock).toHaveBeenCalledTimes(1);
  });

  it("issues zero additional GETs when adminRequest identity changes without gate transitions", async () => {
    const { rerender } = render(<DesignPartnerLifecycleAuditTimeline applicationId={APPLICATION_ID} />);
    await waitFor(() => expect(adminRequestMock).toHaveBeenCalledTimes(1));
    const callsBeforeRerender = adminRequestMock.mock.calls.length;

    rerender(<DesignPartnerLifecycleAuditTimeline applicationId={APPLICATION_ID} />);
    rerender(<DesignPartnerLifecycleAuditTimeline applicationId={APPLICATION_ID} />);

    expect(adminRequestMock.mock.calls.length).toBe(callsBeforeRerender);
  });

  it("issues exactly one GET when authorization transitions false to true", async () => {
    gateState.loading = true;
    gateState.authorized = false;
    gateState.usePinUnlock = false;

    adminRequestMock.mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => PRODUCTION_LIFECYCLE_AUDIT_APPROVED_API_RESPONSE,
    } as Response);

    const { rerender } = render(
      <DesignPartnerLifecycleAuditTimeline applicationId={PRODUCTION_LIFECYCLE_AUDIT_APPLICATION_ID} />,
    );
    expect(adminRequestMock).not.toHaveBeenCalled();

    gateState.loading = false;
    gateState.authorized = true;
    rerender(
      <DesignPartnerLifecycleAuditTimeline applicationId={PRODUCTION_LIFECYCLE_AUDIT_APPLICATION_ID} />,
    );

    await waitFor(() => expect(adminRequestMock).toHaveBeenCalledTimes(1));
    rerender(
      <DesignPartnerLifecycleAuditTimeline applicationId={PRODUCTION_LIFECYCLE_AUDIT_APPLICATION_ID} />,
    );
    expect(adminRequestMock).toHaveBeenCalledTimes(1);
  });

  it("does not fetch when admin session is not authorized", async () => {
    gateState.authorized = false;
    render(<DesignPartnerLifecycleAuditTimeline applicationId={APPLICATION_ID} />);
    await waitFor(() => {
      expect(adminRequestMock).not.toHaveBeenCalled();
    });
  });

  it("shows loading while production browser-session gate resolves", async () => {
    gateState.loading = true;
    gateState.authorized = false;
    gateState.usePinUnlock = false;
    render(<DesignPartnerLifecycleAuditTimeline applicationId={APPLICATION_ID} />);
    expect(screen.getByTestId("design-partner-lifecycle-audit-status").textContent)
      .toBe("Loading lifecycle history…");
    expect(adminRequestMock).not.toHaveBeenCalled();
  });

  it("renders the Production-shaped approved event instead of the empty state", async () => {
    gateState.loading = true;
    gateState.authorized = false;
    gateState.usePinUnlock = false;

    adminRequestMock.mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => PRODUCTION_LIFECYCLE_AUDIT_APPROVED_API_RESPONSE,
    } as Response);

    const { rerender } = render(
      <DesignPartnerLifecycleAuditTimeline applicationId={PRODUCTION_LIFECYCLE_AUDIT_APPLICATION_ID} />,
    );
    expect(screen.getByTestId("design-partner-lifecycle-audit-status").textContent)
      .toBe("Loading lifecycle history…");
    expect(screen.queryByText("No lifecycle events recorded for this application.")).toBeNull();

    gateState.loading = false;
    gateState.authorized = true;
    rerender(
      <DesignPartnerLifecycleAuditTimeline applicationId={PRODUCTION_LIFECYCLE_AUDIT_APPLICATION_ID} />,
    );

    await waitFor(() => {
      expect(screen.getByText("Approved")).toBeTruthy();
      expect(screen.getByTestId("design-partner-lifecycle-audit-item-0").textContent)
        .toContain("Authorized operator");
    });
    expect(screen.getByText("submitted → approved")).toBeTruthy();
    expect(screen.queryByText("No lifecycle events recorded for this application.")).toBeNull();
    const url = String(adminRequestMock.mock.calls[0]?.[0]);
    expect(url).toContain(PRODUCTION_LIFECYCLE_AUDIT_APPLICATION_ID);
  });

  it("aborts and ignores stale responses when the application changes", async () => {
    let resolveFirst: ((value: Response) => void) | undefined;
    const firstPromise = new Promise<Response>((resolve) => {
      resolveFirst = resolve;
    });

    adminRequestMock
      .mockImplementationOnce(() => firstPromise)
      .mockImplementation(async (input: RequestInfo | URL) => {
        const url = String(input);
        if (url.includes(OTHER_APPLICATION_ID)) {
          return {
            ok: true,
            status: 200,
            json: async () => pageResponse(OTHER_APPLICATION_ID, [promotedEvent]),
          } as Response;
        }
        return {
          ok: true,
          status: 200,
          json: async () => pageResponse(APPLICATION_ID, [approvedEvent]),
        } as Response;
      });

    const { rerender } = render(
      <DesignPartnerLifecycleAuditTimeline applicationId={APPLICATION_ID} />,
    );
    rerender(<DesignPartnerLifecycleAuditTimeline applicationId={OTHER_APPLICATION_ID} />);
    await waitFor(() => expect(adminRequestMock).toHaveBeenCalledTimes(2));

    resolveFirst?.({
      ok: true,
      status: 200,
      json: async () => pageResponse(APPLICATION_ID, [approvedEvent], null),
    } as Response);

    await waitFor(() => {
      expect(screen.getByText("Promoted to sandbox")).toBeTruthy();
    });
    expect(screen.queryByTestId(`design-partner-lifecycle-audit-${APPLICATION_ID}`)).toBeNull();
    expect(screen.queryByText("Approved")).toBeNull();
  });

  it("renders empty state, labels, and incomplete-history notice", async () => {
    adminRequestMock.mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => pageResponse(APPLICATION_ID, []),
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

  it("loads more with the current cursor and prevents duplicate cursor requests", async () => {
    render(<DesignPartnerLifecycleAuditTimeline applicationId={APPLICATION_ID} />);
    await waitFor(() => screen.getByTestId("design-partner-lifecycle-audit-load-more"));
    const button = screen.getByTestId("design-partner-lifecycle-audit-load-more");
    fireEvent.click(button);
    fireEvent.click(button);
    await waitFor(() => expect(adminRequestMock).toHaveBeenCalledTimes(2));
    const secondUrl = String(adminRequestMock.mock.calls[1]?.[0]);
    expect(secondUrl).toContain("cursor=page-2");
    expect(screen.getByText("Promoted to sandbox")).toBeTruthy();
    expect(screen.getByText("Approved")).toBeTruthy();
  });

  it("refetches page 1 when refreshToken changes without polling", async () => {
    const { rerender } = render(<DesignPartnerLifecycleAuditTimeline applicationId={APPLICATION_ID} />);
    await waitFor(() => expect(adminRequestMock).toHaveBeenCalledTimes(1));
    rerender(<DesignPartnerLifecycleAuditTimeline applicationId={APPLICATION_ID} refreshToken={1} />);
    await waitFor(() => expect(adminRequestMock).toHaveBeenCalledTimes(2));
    const secondUrl = String(adminRequestMock.mock.calls[1]?.[0]);
    expect(secondUrl).not.toContain("cursor=");
  });

  it("keeps timeline refresh failure local to timeline status", async () => {
    adminRequestMock.mockResolvedValue({
      ok: false,
      status: 500,
      json: async () => ({}),
    } as Response);
    render(<DesignPartnerLifecycleAuditTimeline applicationId={APPLICATION_ID} />);
    await waitFor(() => {
      expect(screen.getByTestId("design-partner-lifecycle-audit-status").textContent)
        .toBe("Lifecycle history unavailable.");
    });
  });

  it("treats malformed API payloads as unavailable", async () => {
    adminRequestMock.mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        application_id: APPLICATION_ID,
        events: [{ event_type: "admin.design_partner.approved", extra: true }],
        next_cursor: null,
      }),
    } as Response);
    render(<DesignPartnerLifecycleAuditTimeline applicationId={APPLICATION_ID} />);
    await waitFor(() => {
      expect(screen.getByTestId("design-partner-lifecycle-audit-status").textContent)
        .toBe("Lifecycle history unavailable.");
    });
  });

  it("does not issue lifecycle mutation requests", async () => {
    render(<DesignPartnerLifecycleAuditTimeline applicationId={APPLICATION_ID} />);
    await waitFor(() => expect(adminRequestMock).toHaveBeenCalled());
    for (const call of adminRequestMock.mock.calls) {
      const init = call[1] as RequestInit | undefined;
      expect(init?.method ?? "GET").toBe("GET");
      const url = String(call[0]);
      expect(url).not.toContain("/promote");
      expect(url).not.toMatch(/\/api\/admin\/design-partners$/);
    }
  });
});
