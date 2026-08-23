// @vitest-environment jsdom
// FILE: lib/admin/productionAdminSessionUi.test.ts

import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createElement } from "react";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { SITE_URL } from "@/lib/siteUrl";
import {
  ProductionAdminSessionStatus,
  PRODUCTION_ADMIN_UNAUTHORIZED_MESSAGE,
  shouldUseProductionBrowserSessionAdminUi,
  useProductionAdminSessionGate,
} from "@/lib/admin/productionAdminSessionUi";

vi.mock("next/navigation", () => ({
  useSearchParams: () => new URLSearchParams(),
}));

vi.mock("@/components/admin/PartnerOnboardingConsole", () => ({
  PartnerOnboardingConsole: ({
    adminRequest,
  }: {
    adminRequest?: (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;
  }) => {
    const { useEffect } = require("react") as typeof import("react");
    useEffect(() => {
      void adminRequest?.("/api/admin/partners/onboarding");
    }, [adminRequest]);
    return createElement("div", { "data-testid": "onboarding-console" });
  },
}));

vi.mock("@/components/admin/AdminPartnerKeysPanel", () => ({
  AdminPartnerKeysPanel: () => null,
}));

vi.mock("@/components/admin/PartnerMeteringPanel", () => ({
  PartnerMeteringPanel: () => null,
}));

vi.mock("@/components/admin/PartnerWebhooksPanel", () => ({
  PartnerWebhooksPanel: () => null,
}));

import AdminPartnersPage from "@/app/admin/partners/page";

function readSource(rel: string): string {
  return readFileSync(resolve(process.cwd(), rel), "utf8");
}

function SessionHarness() {
  const gate = useProductionAdminSessionGate();

  if (gate.loading) {
    return createElement("div", null, "loading");
  }

  if (!gate.authorized && gate.usePinUnlock) {
    return createElement("input", { placeholder: "Admin PIN", readOnly: true });
  }

  return createElement(ProductionAdminSessionStatus, { gate });
}

function mockAccessFetch(payload: { authorized: boolean; method?: string | null }) {
  vi.stubGlobal("fetch", vi.fn(async (input: RequestInfo) => {
    const url = String(input);
    if (url.includes("/api/admin/access")) {
      return new Response(JSON.stringify(payload), { status: 200 });
    }
    return new Response(JSON.stringify({ receipts: [] }), { status: payload.authorized ? 200 : 401 });
  }));
}

afterEach(() => {
  cleanup();
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  sessionStorage.clear();
});

beforeEach(() => {
  vi.spyOn(console, "error").mockImplementation(() => {});
});

describe("shouldUseProductionBrowserSessionAdminUi", () => {
  it("is true only on canonical Production configured origin", () => {
    expect(
      shouldUseProductionBrowserSessionAdminUi({
        NODE_ENV: "production",
        NEXT_PUBLIC_APP_URL: SITE_URL,
      }),
    ).toBe(true);
  });

  it("is false on demo, localhost, and test fallbacks", () => {
    expect(
      shouldUseProductionBrowserSessionAdminUi({
        NODE_ENV: "production",
        NEXT_PUBLIC_APP_URL: "https://demo.abraxasworld.xyz",
      }),
    ).toBe(false);

    expect(
      shouldUseProductionBrowserSessionAdminUi({
        NODE_ENV: "development",
      }),
    ).toBe(false);

    expect(
      shouldUseProductionBrowserSessionAdminUi({
        NODE_ENV: "test",
      }),
    ).toBe(false);
  });
});

describe("Production browser-session admin UX", () => {
  it("shows authorized state without PIN UI on Production", async () => {
    vi.stubEnv("NEXT_PUBLIC_APP_URL", SITE_URL);
    vi.stubEnv("NODE_ENV", "production");
    mockAccessFetch({ authorized: true, method: "email" });

    render(createElement(SessionHarness));

    expect(await screen.findByText("Signed in · authorized")).toBeInTheDocument();
    expect(screen.queryByPlaceholderText("Admin PIN")).not.toBeInTheDocument();
  });

  it("shows Google sign-in recovery copy on Production 401", async () => {
    vi.stubEnv("NEXT_PUBLIC_APP_URL", SITE_URL);
    vi.stubEnv("NODE_ENV", "production");
    mockAccessFetch({ authorized: false, method: null });

    render(createElement(SessionHarness));

    expect(await screen.findByRole("alert")).toHaveTextContent(PRODUCTION_ADMIN_UNAUTHORIZED_MESSAGE);
    expect(screen.queryByPlaceholderText("Admin PIN")).not.toBeInTheDocument();
  });

  it("preserves PIN UI on demo origin", async () => {
    vi.stubEnv("NEXT_PUBLIC_APP_URL", "https://demo.abraxasworld.xyz");
    vi.stubEnv("NODE_ENV", "production");
    mockAccessFetch({ authorized: false, method: null });

    render(createElement(SessionHarness));

    expect(await screen.findByPlaceholderText("Admin PIN")).toBeInTheDocument();
    expect(screen.queryByText(PRODUCTION_ADMIN_UNAUTHORIZED_MESSAGE)).not.toBeInTheDocument();
  });

  it("preserves PIN UI on localhost development", async () => {
    vi.stubEnv("NODE_ENV", "development");
    mockAccessFetch({ authorized: false, method: null });

    render(createElement(SessionHarness));

    expect(await screen.findByPlaceholderText("Admin PIN")).toBeInTheDocument();
  });

  it("uses credentials without x-admin-pin on Production adminRequest", async () => {
    vi.stubEnv("NEXT_PUBLIC_APP_URL", SITE_URL);
    vi.stubEnv("NODE_ENV", "production");
    const fetchMock = vi.fn(async (input: RequestInfo, init?: RequestInit) => {
      const url = String(input);
      if (url.includes("/api/admin/access")) {
        return new Response(JSON.stringify({ authorized: true, method: "email" }), { status: 200 });
      }
      if (url.endsWith("/api/admin/receipts")) {
        expect(new Headers(init?.headers).has("x-admin-pin")).toBe(false);
        expect(init?.credentials).toBe("include");
        return new Response(JSON.stringify({ receipts: [] }), { status: 200 });
      }
      return new Response("{}", { status: 404 });
    });
    vi.stubGlobal("fetch", fetchMock);

    function FetchHarness() {
      const gate = useProductionAdminSessionGate();
      if (gate.loading || !gate.authorized) return null;
      void gate.adminRequest("/api/admin/receipts");
      return createElement("div", null, "ready");
    }

    render(createElement(FetchHarness));

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringContaining("/api/admin/receipts"),
        expect.objectContaining({ credentials: "include" }),
      );
    });
  });
});

describe("migrated admin pages", () => {
  it("design-partners uses production session gate with PIN fallback only off Production", () => {
    const source = readSource("app/admin/design-partners/page.tsx");
    expect(source).toContain("useProductionAdminSessionGate");
    expect(source).toContain("usePinUnlock");
    expect(source).toContain("gate.adminRequest");
    expect(source).toContain("gate.usePinUnlock ?");
  });

  it("receipts uses production session gate with PIN fallback only off Production", () => {
    const source = readSource("app/admin/receipts/page.tsx");
    expect(source).toContain("useProductionAdminSessionGate");
    expect(source).toContain("gate.usePinUnlock");
    expect(source).toContain("gate.adminRequest");
  });

  it("partners page uses production session gate with Demo-only PIN fallback", () => {
    const source = readSource("app/admin/partners/page.tsx");
    expect(source).toContain("useProductionAdminSessionGate");
    expect(source).toContain("gate.usePinUnlock");
    expect(source).toContain("gate.adminRequest");
    expect(source).toMatch(/gate\.usePinUnlock\s*&&/);
  });
});

describe("AdminPartnersPage Production session UX", () => {
  it("hides PIN UI on Production and passes session-only adminRequest to onboarding", async () => {
    vi.stubEnv("NEXT_PUBLIC_APP_URL", SITE_URL);
    vi.stubEnv("NODE_ENV", "production");

    const fetchMock = vi.fn(async (input: RequestInfo, init?: RequestInit) => {
      const url = String(input);
      if (url.includes("/api/admin/access")) {
        return new Response(JSON.stringify({ authorized: true, method: "email" }), { status: 200 });
      }
      if (url.endsWith("/api/admin/partners/onboarding")) {
        expect(new Headers(init?.headers).has("x-admin-pin")).toBe(false);
        expect(init?.credentials).toBe("include");
        return new Response(JSON.stringify({ partners: [] }), { status: 200 });
      }
      return new Response("{}", { status: 404 });
    });
    vi.stubGlobal("fetch", fetchMock);

    render(createElement(AdminPartnersPage));

    expect(await screen.findByTestId("onboarding-console")).toBeInTheDocument();
    expect(screen.queryByPlaceholderText("Admin PIN (if not signed in)")).not.toBeInTheDocument();
    expect(screen.queryByPlaceholderText("Admin PIN")).not.toBeInTheDocument();
    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        "/api/admin/partners/onboarding",
        expect.objectContaining({ credentials: "include" }),
      );
    });
  });

  it("shows PIN UI on demo origin when unauthorized", async () => {
    vi.stubEnv("NEXT_PUBLIC_APP_URL", "https://demo.abraxasworld.xyz");
    vi.stubEnv("NODE_ENV", "production");
    mockAccessFetch({ authorized: false, method: null });

    render(createElement(AdminPartnersPage));

    expect(await screen.findByPlaceholderText("Admin PIN")).toBeInTheDocument();
  });
});

describe("admin auth modules unchanged", () => {
  it("does not modify lib/adminAuth.ts", () => {
    const source = readSource("lib/adminAuth.ts");
    expect(source).toContain("resolveStrictProductionAdminAccess");
    expect(source).toContain("checkProductionSensitiveAdminAccess");
    expect(source).not.toContain("productionAdminSessionUi");
  });
});
