// FILE: components/admin/DesignPartnersPage.test.tsx
// @vitest-environment jsdom

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { mapDesignPartnerApplicationRows } from "@/lib/admin/designPartnerApplicationDetail";
import { encodeDesignPartnerQueueCursor } from "@/lib/admin/designPartnerApplicationQueueCursor";

vi.mock("@/components/redesign/RedesignPage", () => ({
  RedesignPage: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

vi.mock("@/components/redesign/RedesignContent", () => ({
  PageHeader: ({ title }: { title: string }) => <h1>{title}</h1>,
  ContentCard: ({ title, children }: { title: string; children: React.ReactNode }) => (
    <section>
      <h2>{title}</h2>
      {children}
    </section>
  ),
}));

vi.mock("next/link", () => ({
  default: ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  ),
}));

vi.mock("@/components/admin/AdminConfirmDialog", () => ({
  AdminConfirmDialog: ({
    open,
    actionKey,
    context,
    onConfirm,
    onCancel,
  }: {
    open: boolean;
    actionKey: string | null;
    context: Record<string, string>;
    onConfirm: () => void;
    onCancel: () => void;
  }) => (
    open ? (
      <div>
        <div data-testid="confirm-action-key">{actionKey}</div>
        <div data-testid="confirm-company">{context.company}</div>
        <button type="button" onClick={onCancel}>Cancel</button>
        <button type="button" onClick={onConfirm}>
          {actionKey === "design_partner.approve"
            ? "Approve application"
            : actionKey === "design_partner.promote"
              ? "Promote application"
              : "Reject application"}
        </button>
      </div>
    ) : null
  ),
}));

const gateState = vi.hoisted(() => ({
  loading: false,
  authorized: true,
  usePinUnlock: false,
  pin: "",
  unauthorizedMessage: "Sign in",
  adminRequest: vi.fn(),
}));

vi.mock("@/lib/admin/productionAdminSessionUi", () => ({
  PRODUCTION_ADMIN_UNAUTHORIZED_MESSAGE: "Sign in with an authorized Google account.",
  ProductionAdminSessionStatus: () => null,
  useProductionAdminSessionGate: () => ({
    loading: gateState.loading,
    authorized: gateState.authorized,
    usePinUnlock: gateState.usePinUnlock,
    pin: gateState.pin,
    setPin: vi.fn(),
    unlockWithPin: vi.fn(),
    unauthorizedMessage: gateState.unauthorizedMessage,
    authorizedLabel: "Signed in",
    adminRequest: gateState.adminRequest,
  }),
}));

vi.mock("@/components/admin/PartnerSandboxSignoffPanel", () => ({
  PartnerSandboxSignoffPanel: () => <div data-testid="signoff-panel" />,
}));

vi.mock("@/components/admin/DesignPartnerPilotSummaryBar", () => ({
  DesignPartnerPilotSummaryBar: () => <div data-testid="pilot-summary" />,
}));

vi.mock("@/components/admin/DesignPartnerIntakeHealthCard", () => ({
  DesignPartnerIntakeHealthCard: () => null,
}));

vi.mock("@/components/admin/DesignPartnerLifecycleAuditTimeline", () => ({
  DesignPartnerLifecycleAuditTimeline: () => <div data-testid="lifecycle-timeline-mock" />,
}));

import AdminDesignPartnersPage from "@/app/admin/design-partners/page";

const submittedDbRow = {
  id: "00000000-0000-4000-8000-000000000010",
  company: "Test Co",
  contact_name: null,
  email: "hidden@example.com",
  website: null,
  use_case: null,
  monthly_volume: null,
  public_name_ok: false,
  integration_type: "passport_gate",
  status: "submitted",
  promoted_partner_id: null,
  reviewer_notes: null,
  created_at: "2026-01-01T00:00:00.000Z",
  reviewed_at: null,
};

const submittedApp = mapDesignPartnerApplicationRows([submittedDbRow])[0]!;

const approvedApp = {
  ...submittedApp,
  id: "00000000-0000-4000-8000-000000000011",
  company: "Approved Co",
  status: "approved",
};

const rejectedApp = {
  ...submittedApp,
  id: "00000000-0000-4000-8000-000000000012",
  company: "Rejected Co",
  status: "rejected",
};

const pageTwoApp = {
  ...submittedApp,
  id: "00000000-0000-4000-8000-000000000013",
  company: "Second Co",
  created_at: "2025-12-31T23:59:59.999Z",
};

type MockPage = {
  status: string;
  apps: unknown[];
  next_cursor?: string | null;
  has_more?: boolean;
};

function mockQueue(pages: MockPage[]) {
  gateState.adminRequest.mockImplementation(async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = new URL(String(input), "http://localhost");
    if (url.pathname.includes("/pilot-summary")) {
      return new Response(JSON.stringify({ summaries: [] }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }
    if (url.pathname.includes("/intake-health")) {
      return new Response(JSON.stringify({}), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }
    if (url.pathname === "/api/admin/design-partners" && (!init || init.method === undefined)) {
      const status = url.searchParams.get("status") ?? "submitted";
      const cursor = url.searchParams.get("cursor");
      if (cursor) {
        return new Response(JSON.stringify({
          applications: [pageTwoApp],
          next_cursor: null,
          has_more: false,
        }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      }
      const page = pages.find((entry) => entry.status === status) ?? pages[0];
      return new Response(JSON.stringify({
        applications: page.apps,
        next_cursor: page.next_cursor ?? null,
        has_more: page.has_more ?? false,
      }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }
    if (url.pathname.includes("/design-partners") && init?.method === "PATCH") {
      return new Response(JSON.stringify({ application: rejectedApp }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }
    return new Response(JSON.stringify({}), { status: 404 });
  });
}

describe("AdminDesignPartnersPage", () => {
  beforeEach(() => {
    gateState.loading = false;
    gateState.authorized = true;
    gateState.adminRequest.mockReset();
  });

  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it("hides promote for submitted applications and shows approve", async () => {
    mockQueue([{ status: "submitted", apps: [submittedApp] }]);
    render(<AdminDesignPartnersPage />);
    await waitFor(() => screen.getByText("Test Co"));
    expect(screen.getByText("Approve")).toBeTruthy();
    expect(screen.queryByTestId(`promote-${submittedApp.id}`)).toBeNull();
  });

  it("shows promote only for approved applications", async () => {
    mockQueue([
      { status: "submitted", apps: [] },
      { status: "approved", apps: [approvedApp] },
    ]);
    render(<AdminDesignPartnersPage />);
    fireEvent.click(screen.getByTestId("design-partner-status-tab-approved"));
    await waitFor(() => screen.getByTestId(`promote-${approvedApp.id}`));
  });

  it("renders View application details for sparse GET DTOs with mostly null optional fields", async () => {
    mockQueue([{ status: "submitted", apps: mapDesignPartnerApplicationRows([submittedDbRow]) }]);
    render(<AdminDesignPartnersPage />);
    await waitFor(() => screen.getByTestId("design-partner-detail-toggle-00000000-0000-4000-8000-000000000010"));
    expect(screen.getByText("View application details")).toBeTruthy();
    expect(screen.queryByTestId("design-partner-detail-panel-00000000-0000-4000-8000-000000000010")).toBeNull();
  });

  it("expands and collapses read-only detail without network calls", async () => {
    mockQueue([{ status: "submitted", apps: [submittedApp] }]);
    render(<AdminDesignPartnersPage />);
    await waitFor(() => screen.getByTestId("design-partner-detail-toggle-00000000-0000-4000-8000-000000000010"));
    const initialCalls = gateState.adminRequest.mock.calls.length;

    fireEvent.click(screen.getByTestId("design-partner-detail-toggle-00000000-0000-4000-8000-000000000010"));
    await waitFor(() => {
      expect(screen.getByTestId("design-partner-detail-panel-00000000-0000-4000-8000-000000000010")).toBeTruthy();
      expect(screen.getByTestId("design-partner-detail-email").textContent).toBe("hidden@example.com");
    });
    expect(gateState.adminRequest.mock.calls.length).toBe(initialCalls);

    fireEvent.click(screen.getByTestId("design-partner-detail-toggle-00000000-0000-4000-8000-000000000010"));
    await waitFor(() => {
      expect(screen.queryByTestId("design-partner-detail-panel-00000000-0000-4000-8000-000000000010")).toBeNull();
    });
    expect(gateState.adminRequest.mock.calls.length).toBe(initialCalls);
  });

  it("places disclosure before reviewer notes and mutation controls", async () => {
    mockQueue([{ status: "submitted", apps: [submittedApp] }]);
    render(<AdminDesignPartnersPage />);
    await waitFor(() => screen.getByTestId(`design-partner-app-${submittedApp.id}`));
    const card = screen.getByTestId(`design-partner-app-${submittedApp.id}`);
    const disclosure = within(card).getByTestId("design-partner-detail-toggle-00000000-0000-4000-8000-000000000010");
    const notes = within(card).getByTestId(`reviewer-notes-${submittedApp.id}`);
    const approve = within(card).getByText("Approve");
    expect(disclosure.compareDocumentPosition(notes) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(disclosure.compareDocumentPosition(approve) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it("loads more once and appends without duplicates", async () => {
    const nextCursor = encodeDesignPartnerQueueCursor(
      "submitted",
      submittedApp.created_at,
      submittedApp.id,
    );
    mockQueue([{
      status: "submitted",
      apps: [submittedApp],
      next_cursor: nextCursor,
      has_more: true,
    }]);
    render(<AdminDesignPartnersPage />);
    await waitFor(() => screen.getByTestId("design-partner-load-more"));
    const before = gateState.adminRequest.mock.calls.length;
    fireEvent.click(screen.getByTestId("design-partner-load-more"));
    await waitFor(() => screen.getByText("Second Co"));
    expect(gateState.adminRequest.mock.calls.length).toBe(before + 1);
    expect(screen.getAllByText("Test Co")).toHaveLength(1);
    expect(screen.getAllByText("Second Co")).toHaveLength(1);
  });

  it("resets results and cursor when status changes", async () => {
    mockQueue([
      {
        status: "submitted",
        apps: [submittedApp],
        next_cursor: encodeDesignPartnerQueueCursor("submitted", submittedApp.created_at, submittedApp.id),
        has_more: true,
      },
      { status: "rejected", apps: [rejectedApp] },
    ]);
    render(<AdminDesignPartnersPage />);
    await waitFor(() => screen.getByTestId("design-partner-load-more"));
    fireEvent.click(screen.getByTestId("design-partner-status-tab-rejected"));
    await waitFor(() => screen.getByText("Rejected Co"));
    expect(screen.queryByText("Test Co")).toBeNull();
    expect(screen.queryByTestId("design-partner-load-more")).toBeNull();
  });

  it("opens approve confirm with company only and zero requests before confirmation", async () => {
    mockQueue([{ status: "submitted", apps: [submittedApp] }]);
    render(<AdminDesignPartnersPage />);
    await waitFor(() => screen.getByText("Approve"));
    const before = gateState.adminRequest.mock.calls.length;
    fireEvent.click(screen.getByText("Approve"));
    await waitFor(() => {
      expect(screen.getByTestId("confirm-action-key").textContent).toBe("design_partner.approve");
      expect(screen.getByTestId("confirm-company").textContent).toBe("Test Co");
      expect(screen.getByTestId("confirm-company").textContent).not.toContain("@");
    });
    expect(gateState.adminRequest.mock.calls.length).toBe(before);
  });

  it("opens reject confirm with company only", async () => {
    mockQueue([{ status: "submitted", apps: [submittedApp] }]);
    render(<AdminDesignPartnersPage />);
    await waitFor(() => screen.getByTestId(`reject-${submittedApp.id}`));
    fireEvent.click(screen.getByTestId(`reject-${submittedApp.id}`));
    await waitFor(() => {
      expect(screen.getByTestId("confirm-action-key").textContent).toBe("design_partner.reject");
      expect(screen.getByTestId("confirm-company").textContent).toBe("Test Co");
      expect(screen.getByTestId("confirm-company").textContent).not.toContain("@");
    });
  });

  it("shows rejected applications on the rejected status tab", async () => {
    mockQueue([
      { status: "submitted", apps: [] },
      { status: "rejected", apps: [rejectedApp] },
    ]);
    render(<AdminDesignPartnersPage />);
    fireEvent.click(screen.getByTestId("design-partner-status-tab-rejected"));
    await waitFor(() => {
      expect(screen.getByText("Rejected Co")).toBeTruthy();
      expect(screen.getByText(/Rejected applications are retained for audit/)).toBeTruthy();
    });
  });

  it("keeps mutation success when queue refresh fails", async () => {
    let patchCount = 0;
    let queueGetCount = 0;
    gateState.adminRequest.mockImplementation(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = new URL(String(input), "http://localhost");
      if (url.pathname.includes("/pilot-summary")) {
        return new Response(JSON.stringify({ summaries: [] }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      }
      if (url.pathname.includes("/intake-health")) {
        return new Response(JSON.stringify({}), { status: 200 });
      }
      if (url.pathname === "/api/admin/design-partners" && (!init || init.method === undefined)) {
        queueGetCount += 1;
        if (queueGetCount > 1) {
          return new Response(JSON.stringify({ error: "queue_failed" }), { status: 500 });
        }
        return new Response(JSON.stringify({
          applications: [submittedApp],
          next_cursor: null,
          has_more: false,
        }), { status: 200, headers: { "Content-Type": "application/json" } });
      }
      if (init?.method === "PATCH") {
        patchCount += 1;
        return new Response(JSON.stringify({
          application: {
            id: submittedApp.id,
            status: "approved",
            promoted_partner_id: null,
            reviewer_notes: "",
          },
        }), { status: 200, headers: { "Content-Type": "application/json" } });
      }
      return new Response(JSON.stringify({}), { status: 404 });
    });

    render(<AdminDesignPartnersPage />);
    await waitFor(() => screen.getByText("Approve"));
    fireEvent.click(screen.getByText("Approve"));
    await waitFor(() => screen.getByText("Approve application"));
    fireEvent.click(screen.getByText("Approve application"));
    await waitFor(() => {
      expect(patchCount).toBe(1);
      expect(screen.getByText(`Approved ${submittedApp.company}`)).toBeTruthy();
      expect(screen.getByTestId("design-partner-queue-refresh-notice").textContent)
        .toContain("Queue refresh failed");
    });
  });

  it("omits reviewer notes from reject patch when textarea is empty", async () => {
    mockQueue([{ status: "submitted", apps: [submittedApp] }]);
    render(<AdminDesignPartnersPage />);
    await waitFor(() => screen.getByTestId(`reject-${submittedApp.id}`));
    fireEvent.click(screen.getByTestId(`reject-${submittedApp.id}`));
    await waitFor(() => screen.getByText("Reject application"));
    fireEvent.click(screen.getByText("Reject application"));
    await waitFor(() => {
      const patchCall = gateState.adminRequest.mock.calls.find((call) => {
        const init = call[1] as RequestInit | undefined;
        return init?.method === "PATCH";
      });
      expect(patchCall).toBeTruthy();
      const body = JSON.parse(String((patchCall?.[1] as RequestInit).body)) as Record<string, unknown>;
      expect(body.status).toBe("rejected");
      expect(body.reviewer_notes).toBe("");
    });
  });

  it("disables promote for invalid partner_id without sending a promote request", async () => {
    mockQueue([
      { status: "submitted", apps: [] },
      { status: "approved", apps: [approvedApp] },
    ]);
    render(<AdminDesignPartnersPage />);
    fireEvent.click(screen.getByTestId("design-partner-status-tab-approved"));
    await waitFor(() => screen.getByTestId(`promote-${approvedApp.id}`));
    const partnerInput = screen.getByTestId(`partner-id-${approvedApp.id}`) as HTMLInputElement;
    fireEvent.change(partnerInput, { target: { value: "-invalid" } });
    const promoteButton = screen.getByTestId(`promote-${approvedApp.id}`) as HTMLButtonElement;
    expect(promoteButton.disabled).toBe(true);
    fireEvent.click(promoteButton);
    const promoteCalls = gateState.adminRequest.mock.calls.filter((call) => {
      const init = call[1] as RequestInit | undefined;
      return init?.method === "POST" && String(call[0]).includes("/promote");
    });
    expect(promoteCalls).toHaveLength(0);
  });

  it("shows approved promote guidance and readiness panel without extra GET/PATCH/POST", async () => {
    mockQueue([
      { status: "submitted", apps: [] },
      { status: "approved", apps: [approvedApp] },
    ]);
    render(<AdminDesignPartnersPage />);
    fireEvent.click(screen.getByTestId("design-partner-status-tab-approved"));
    await waitFor(() => screen.getByTestId(`approved-promote-guidance-${approvedApp.id}`));
    const before = gateState.adminRequest.mock.calls.length;
    fireEvent.click(screen.getByTestId(`design-partner-detail-toggle-${approvedApp.id}`));
    await waitFor(() => screen.getByTestId("design-partner-promote-readiness-panel"));
    expect(gateState.adminRequest.mock.calls.length).toBe(before);
    expect(screen.queryByTestId("handoff-policy-id-copy")).toBeNull();
    expect(screen.queryByTestId("handoff-return-url-copy")).toBeNull();
  });

  it("copies the revealed sandbox API key on explicit click only", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal("navigator", { clipboard: { writeText } });
    mockQueue([
      { status: "submitted", apps: [] },
      { status: "approved", apps: [approvedApp] },
    ]);
    gateState.adminRequest.mockImplementation(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = new URL(String(input), "http://localhost");
      if (url.pathname.includes("/promote") && init?.method === "POST") {
        return new Response(JSON.stringify({
          api_key: "abx_test_fixture_key",
          partner_id: "approved-co",
          key_prefix: "abx_test_fixture",
        }), { status: 200, headers: { "Content-Type": "application/json" } });
      }
      if (url.pathname.includes("/pilot-summary")) {
        return new Response(JSON.stringify({ summaries: [] }), { status: 200 });
      }
      if (url.pathname.includes("/intake-health")) {
        return new Response(JSON.stringify({}), { status: 200 });
      }
      if (url.pathname === "/api/admin/design-partners" && (!init || init.method === undefined)) {
        const status = url.searchParams.get("status") ?? "submitted";
        const page = status === "approved"
          ? { applications: [approvedApp] }
          : { applications: [] };
        return new Response(JSON.stringify({
          applications: page.applications,
          next_cursor: null,
          has_more: false,
        }), { status: 200, headers: { "Content-Type": "application/json" } });
      }
      return new Response(JSON.stringify({}), { status: 404 });
    });

    render(<AdminDesignPartnersPage />);
    fireEvent.click(screen.getByTestId("design-partner-status-tab-approved"));
    await waitFor(() => screen.getByTestId(`promote-${approvedApp.id}`));
    fireEvent.click(screen.getByTestId(`promote-${approvedApp.id}`));
    await waitFor(() => screen.getByText("Promote application"));
    fireEvent.click(screen.getByText("Promote application"));
    await waitFor(() => screen.getByTestId("sandbox-api-key-reveal"));
    expect(writeText).not.toHaveBeenCalled();
    fireEvent.click(screen.getByTestId("sandbox-api-key-copy"));
    await waitFor(() => {
      expect(writeText).toHaveBeenCalledWith("abx_test_fixture_key");
      expect(screen.getByTestId("sandbox-api-key-copy-status").textContent).toBe("Copied");
    });
    expect(String(new URL(String(gateState.adminRequest.mock.calls.at(-1)?.[0]), "http://localhost"))).not
      .toContain("abx_test_fixture_key");
  });

  it("prevents duplicate promotion while a promote request is in flight", async () => {
    let resolvePromote: ((value: Response) => void) | undefined;
    const promotePromise = new Promise<Response>((resolve) => {
      resolvePromote = resolve;
    });

    gateState.adminRequest.mockImplementation(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = new URL(String(input), "http://localhost");
      if (url.pathname.includes("/promote") && init?.method === "POST") {
        return promotePromise;
      }
      if (url.pathname.includes("/pilot-summary")) {
        return new Response(JSON.stringify({ summaries: [] }), { status: 200 });
      }
      if (url.pathname.includes("/intake-health")) {
        return new Response(JSON.stringify({}), { status: 200 });
      }
      if (url.pathname === "/api/admin/design-partners" && (!init || init.method === undefined)) {
        return new Response(JSON.stringify({
          applications: [approvedApp],
          next_cursor: null,
          has_more: false,
        }), { status: 200, headers: { "Content-Type": "application/json" } });
      }
      return new Response(JSON.stringify({}), { status: 404 });
    });

    render(<AdminDesignPartnersPage />);
    fireEvent.click(screen.getByTestId("design-partner-status-tab-approved"));
    await waitFor(() => screen.getByTestId(`promote-${approvedApp.id}`));
    const promoteButton = screen.getByTestId(`promote-${approvedApp.id}`) as HTMLButtonElement;
    fireEvent.click(promoteButton);
    await waitFor(() => screen.getByText("Promote application"));
    fireEvent.click(screen.getByText("Promote application"));
    await waitFor(() => expect(promoteButton.disabled).toBe(true));
    fireEvent.click(promoteButton);
    const promoteCalls = gateState.adminRequest.mock.calls.filter((call) => {
      const init = call[1] as RequestInit | undefined;
      return init?.method === "POST" && String(call[0]).includes("/promote");
    });
    expect(promoteCalls).toHaveLength(1);

    resolvePromote?.(new Response(JSON.stringify({
      api_key: "abx_test_fixture_key",
      partner_id: "approved-co",
      key_prefix: "abx_test_fixture",
    }), { status: 200, headers: { "Content-Type": "application/json" } }));
    await waitFor(() => screen.getByTestId("sandbox-api-key-reveal"));
  });
});
