// @vitest-environment jsdom
// FILE: components/admin/AdminPartnersPage.test.tsx

import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import AdminPartnersPage from "@/app/admin/partners/page";
import { SITE_URL } from "@/lib/siteUrl";

const fetchMock = vi.fn();
const pushMock = vi.fn();
let searchParams = new URLSearchParams();

function stubRuntimeOrigin(origin: string) {
  Object.defineProperty(window, "location", {
    value: { ...window.location, origin },
    writable: true,
    configurable: true,
  });
}

vi.mock("next/navigation", () => ({
  useSearchParams: () => searchParams,
  useRouter: () => ({ push: pushMock }),
}));

vi.mock("@/components/admin/PartnerOnboardingConsole", () => ({
  PartnerOnboardingConsole: ({
    adminRequest,
    initialSelectedPartnerId,
  }: {
    adminRequest: (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;
    initialSelectedPartnerId?: string;
  }) => {
    void adminRequest("/api/admin/partners/onboarding", { cache: "no-store" });
    return (
      <div data-testid="onboarding-panel" data-initial-partner-id={initialSelectedPartnerId ?? ""}>
        onboarding
      </div>
    );
  },
}));

vi.mock("@/components/admin/AdminPartnerKeysPanel", () => ({
  AdminPartnerKeysPanel: () => <div>keys</div>,
}));
vi.mock("@/components/admin/PartnerMeteringPanel", () => ({
  PartnerMeteringPanel: () => <div>metering</div>,
}));
vi.mock("@/components/admin/PartnerWebhooksPanel", () => ({
  PartnerWebhooksPanel: () => <div>webhooks</div>,
}));
vi.mock("@/components/admin/PartnerWebhookObservabilityPanel", () => ({
  PartnerWebhookObservabilityPanel: ({ initialPartnerId }: { initialPartnerId?: string }) => (
    <div data-testid="observability-panel" data-initial-partner-id={initialPartnerId ?? ""}>
      observability
    </div>
  ),
}));
vi.mock("@/components/admin/PartnerWebhookSandboxReceiptsPanel", () => ({
  PartnerWebhookSandboxReceiptsPanel: ({ initialPartnerId }: { initialPartnerId?: string }) => (
    <div data-testid="sandbox-receipts-panel" data-initial-partner-id={initialPartnerId ?? ""}>
      sandbox
    </div>
  ),
}));

beforeEach(() => {
  vi.spyOn(console, "error").mockImplementation(() => {});
  vi.stubGlobal("fetch", fetchMock);
  searchParams = new URLSearchParams();
  pushMock.mockReset();
  fetchMock.mockImplementation(async (input: RequestInfo) => {
    const url = String(input);
    if (url.includes("/api/admin/access")) {
      return new Response(JSON.stringify({ authorized: true, method: "email" }), { status: 200 });
    }
    if (url.includes("/api/admin/partners/onboarding")) {
      return new Response(JSON.stringify({ partners: [] }), { status: 200 });
    }
    return new Response("{}", { status: 404 });
  });
});

afterEach(() => {
  cleanup();
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  sessionStorage.clear();
});

describe("AdminPartnersPage session mode", () => {
  it("does not render PIN input on Production runtime origin without client env", async () => {
    vi.stubEnv("NODE_ENV", "production");
    stubRuntimeOrigin(SITE_URL);

    render(<AdminPartnersPage />);

    expect(screen.getByTestId("admin-partners-session-loading")).toBeInTheDocument();
    expect(screen.queryByTestId("admin-partners-pin-input")).not.toBeInTheDocument();

    await waitFor(() => {
      expect(screen.queryByTestId("admin-partners-pin-input")).not.toBeInTheDocument();
    });
    expect(screen.queryByPlaceholderText("Admin PIN (if not signed in)")).not.toBeInTheDocument();
  });

  it("does not flash PIN before session mode resolves on Production", () => {
    vi.stubEnv("NODE_ENV", "production");
    stubRuntimeOrigin(SITE_URL);

    render(<AdminPartnersPage />);

    expect(screen.getByTestId("admin-partners-session-loading")).toBeInTheDocument();
    expect(screen.queryByTestId("admin-partners-pin-input")).not.toBeInTheDocument();
  });

  it("routes onboarding through adminRequest without x-admin-pin on Production", async () => {
    vi.stubEnv("NODE_ENV", "production");
    stubRuntimeOrigin(SITE_URL);

    render(<AdminPartnersPage />);

    await waitFor(() => {
      expect(screen.getByTestId("onboarding-panel")).toBeInTheDocument();
    });

    const onboardingCall = fetchMock.mock.calls.find(([url]) => String(url).includes("/api/admin/partners/onboarding"));
    expect(onboardingCall).toBeTruthy();
    const init = onboardingCall?.[1] as RequestInit | undefined;
    expect(new Headers(init?.headers).has("x-admin-pin")).toBe(false);
    expect(init?.credentials).toBe("include");
  });

  it("preserves PIN input on demo origin", async () => {
    vi.stubEnv("NODE_ENV", "production");
    stubRuntimeOrigin("https://demo.abraxasworld.xyz");

    render(<AdminPartnersPage />);

    expect(await screen.findByTestId("admin-partners-pin-input")).toBeInTheDocument();
  });

  it("preserves PIN input on localhost", async () => {
    vi.stubEnv("NODE_ENV", "development");
    stubRuntimeOrigin("http://localhost:3000");

    render(<AdminPartnersPage />);

    expect(await screen.findByTestId("admin-partners-pin-input")).toBeInTheDocument();
  });

  it("shows observability tab content when authorized on Production", async () => {
    vi.stubEnv("NODE_ENV", "production");
    stubRuntimeOrigin(SITE_URL);

    const user = userEvent.setup();
    render(<AdminPartnersPage />);

    await waitFor(() => {
      expect(screen.queryByTestId("admin-partners-session-loading")).not.toBeInTheDocument();
    });

    await user.click(screen.getByRole("button", { name: "Delivery observability" }));
    expect(pushMock).toHaveBeenCalledWith("/admin/partners?tab=observability");
  });
});

describe("AdminPartnersPage deep links", () => {
  it("opens observability tab with validated partner_id prefilled from query", async () => {
    vi.stubEnv("NODE_ENV", "production");
    stubRuntimeOrigin(SITE_URL);
    searchParams = new URLSearchParams("tab=observability&partner_id=acme-v1");

    render(<AdminPartnersPage />);

    await waitFor(() => {
      expect(screen.getByTestId("observability-panel")).toBeInTheDocument();
    });
    expect(screen.getByTestId("observability-panel")).toHaveAttribute("data-initial-partner-id", "acme-v1");
  });

  it("opens sandbox receipts tab with validated partner_id prefilled from query", async () => {
    vi.stubEnv("NODE_ENV", "production");
    stubRuntimeOrigin(SITE_URL);
    searchParams = new URLSearchParams("tab=sandbox-receipts&partner_id=acme-v1");

    render(<AdminPartnersPage />);

    await waitFor(() => {
      expect(screen.getByTestId("sandbox-receipts-panel")).toBeInTheDocument();
    });
    expect(screen.getByTestId("sandbox-receipts-panel")).toHaveAttribute("data-initial-partner-id", "acme-v1");
  });

  it("falls back to onboarding for invalid tab and ignores invalid partner_id", async () => {
    vi.stubEnv("NODE_ENV", "production");
    stubRuntimeOrigin(SITE_URL);
    searchParams = new URLSearchParams("tab=not-a-tab&partner_id=bad%20id");

    render(<AdminPartnersPage />);

    await waitFor(() => {
      expect(screen.getByTestId("onboarding-panel")).toBeInTheDocument();
    });
    expect(screen.getByTestId("onboarding-panel")).toHaveAttribute("data-initial-partner-id", "");
  });

  it("uses router.push with partner_id preserved when switching tabs", async () => {
    vi.stubEnv("NODE_ENV", "production");
    stubRuntimeOrigin(SITE_URL);
    searchParams = new URLSearchParams("tab=observability&partner_id=acme-v1");

    const user = userEvent.setup();
    render(<AdminPartnersPage />);

    await waitFor(() => {
      expect(screen.getByTestId("observability-panel")).toBeInTheDocument();
    });

    await user.click(screen.getByRole("button", { name: "Sandbox receipts" }));
    expect(pushMock).toHaveBeenCalledWith("/admin/partners?tab=sandbox-receipts&partner_id=acme-v1");
  });
});
