// FILE: components/admin/DesignPartnersPage.test.tsx
// @vitest-environment jsdom

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";

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
  }: {
    open: boolean;
    actionKey: string | null;
    context: Record<string, string>;
    onConfirm: () => void;
  }) => (
    open ? (
      <div>
        <div data-testid="confirm-action-key">{actionKey}</div>
        <div data-testid="confirm-company">{context.company}</div>
        <button type="button" onClick={onConfirm}>Reject application</button>
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

vi.mock("@/components/admin/DesignPartnerApplicationDetailPanel", () => ({
  DesignPartnerApplicationDetailPanel: ({
    application,
  }: {
    application: { id: string };
  }) => <div data-testid={`detail-panel-${application.id}`} />,
}));

import AdminDesignPartnersPage from "@/app/admin/design-partners/page";

const submittedApp = {
  id: "app-submitted",
  company: "Test Co",
  contact_name: "Ops",
  email: "hidden@example.com",
  website: "https://example.com",
  use_case: "sandbox",
  monthly_volume: "low",
  public_name_ok: false,
  integration_type: "passport_gate",
  status: "submitted",
  promoted_partner_id: null,
  reviewer_notes: null,
  created_at: "2026-01-01T00:00:00.000Z",
  reviewed_at: null,
};

const approvedApp = {
  ...submittedApp,
  id: "app-approved",
  company: "Approved Co",
  status: "approved",
};

const rejectedApp = {
  ...submittedApp,
  id: "app-rejected",
  company: "Rejected Co",
  status: "rejected",
};

function mockList(apps: unknown[]) {
  gateState.adminRequest.mockImplementation(async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input);
    if (url.includes("/pilot-summary")) {
      return new Response(JSON.stringify({ summaries: [] }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }
    if (url.includes("/design-partners") && (!init || init.method === undefined)) {
      return new Response(JSON.stringify({ applications: apps }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }
    if (url.includes("/design-partners") && init?.method === "PATCH") {
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
    mockList([submittedApp]);
    render(<AdminDesignPartnersPage />);
    await waitFor(() => screen.getByText("Test Co"));
    expect(screen.getByText("Approve")).toBeTruthy();
    expect(screen.queryByTestId(`promote-${submittedApp.id}`)).toBeNull();
  });

  it("shows promote only for approved applications", async () => {
    mockList([approvedApp]);
    render(<AdminDesignPartnersPage />);
    await waitFor(() => screen.getByTestId(`promote-${approvedApp.id}`));
  });

  it("renders detail panel mount point for pending applications", async () => {
    mockList([submittedApp]);
    render(<AdminDesignPartnersPage />);
    await waitFor(() => screen.getByTestId("detail-panel-app-submitted"));
  });

  it("opens reject confirm with company only", async () => {
    mockList([submittedApp]);
    render(<AdminDesignPartnersPage />);
    await waitFor(() => screen.getByTestId(`reject-${submittedApp.id}`));
    fireEvent.click(screen.getByTestId(`reject-${submittedApp.id}`));
    await waitFor(() => {
      expect(screen.getByTestId("confirm-action-key").textContent).toBe("design_partner.reject");
      expect(screen.getByTestId("confirm-company").textContent).toBe("Test Co");
      expect(screen.getByTestId("confirm-company").textContent).not.toContain("@");
    });
  });

  it("keeps rejected applications collapsed until expanded", async () => {
    mockList([rejectedApp]);
    render(<AdminDesignPartnersPage />);
    await waitFor(() => screen.getByTestId("toggle-rejected-section"));
    expect(screen.queryByText("Rejected Co")).toBeNull();
    fireEvent.click(screen.getByTestId("toggle-rejected-section"));
    await waitFor(() => {
      expect(screen.getByText("Rejected Co")).toBeTruthy();
      expect(screen.getByText(/Rejected applications are retained for audit/)).toBeTruthy();
    });
  });

  it("omits reviewer notes from reject patch when textarea is empty", async () => {
    mockList([submittedApp]);
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
});
