// @vitest-environment jsdom
// FILE: lib/admin/productionAdminSessionUi.test.ts

import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createElement } from "react";
import { SITE_URL } from "@/lib/siteUrl";
import {
  ProductionAdminSessionStatus,
  PRODUCTION_ADMIN_UNAUTHORIZED_MESSAGE,
  shouldUseProductionBrowserSessionAdminUi,
  useProductionAdminSessionGate,
} from "@/lib/admin/productionAdminSessionUi";

function stubRuntimeOrigin(origin: string) {
  Object.defineProperty(window, "location", {
    value: { ...window.location, origin },
    writable: true,
    configurable: true,
  });
}

function SessionHarness() {
  const gate = useProductionAdminSessionGate();

  if (gate.loading) {
    return createElement("div", { "data-testid": "session-loading" }, "loading");
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
  it("is true on canonical Production runtime origin without client env", () => {
    expect(
      shouldUseProductionBrowserSessionAdminUi(
        { NODE_ENV: "production" },
        SITE_URL,
      ),
    ).toBe(true);
  });

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
      shouldUseProductionBrowserSessionAdminUi(
        { NODE_ENV: "production", NEXT_PUBLIC_APP_URL: "https://demo.abraxasworld.xyz" },
        "https://demo.abraxasworld.xyz",
      ),
    ).toBe(false);

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
  it("selects browser-session mode from runtime origin when NEXT_PUBLIC_APP_URL is missing", async () => {
    vi.stubEnv("NODE_ENV", "production");
    stubRuntimeOrigin(SITE_URL);
    mockAccessFetch({ authorized: true, method: "email" });

    render(createElement(SessionHarness));

    expect(await screen.findByText("Signed in · authorized")).toBeInTheDocument();
    expect(screen.queryByPlaceholderText("Admin PIN")).not.toBeInTheDocument();
  });

  it("shows authorized state without PIN UI on Production", async () => {
    vi.stubEnv("NEXT_PUBLIC_APP_URL", SITE_URL);
    vi.stubEnv("NODE_ENV", "production");
    stubRuntimeOrigin(SITE_URL);
    mockAccessFetch({ authorized: true, method: "email" });

    render(createElement(SessionHarness));

    expect(await screen.findByText("Signed in · authorized")).toBeInTheDocument();
    expect(screen.queryByPlaceholderText("Admin PIN")).not.toBeInTheDocument();
  });

  it("shows Google sign-in recovery copy on Production unauthorized access", async () => {
    vi.stubEnv("NODE_ENV", "production");
    stubRuntimeOrigin(SITE_URL);
    mockAccessFetch({ authorized: false, method: null });

    render(createElement(SessionHarness));

    expect(await screen.findByRole("alert")).toHaveTextContent(PRODUCTION_ADMIN_UNAUTHORIZED_MESSAGE);
    expect(screen.queryByPlaceholderText("Admin PIN")).not.toBeInTheDocument();
  });

  it("fails closed as unauthorized when access fetch throws", async () => {
    vi.stubEnv("NODE_ENV", "production");
    stubRuntimeOrigin(SITE_URL);
    vi.stubGlobal("fetch", vi.fn(async (input: RequestInfo) => {
      if (String(input).includes("/api/admin/access")) {
        throw new Error("network down");
      }
      return new Response("{}", { status: 500 });
    }));

    render(createElement(SessionHarness));

    expect(await screen.findByRole("alert")).toHaveTextContent(PRODUCTION_ADMIN_UNAUTHORIZED_MESSAGE);
  });

  it("fails closed as unauthorized when access JSON parsing fails", async () => {
    vi.stubEnv("NODE_ENV", "production");
    stubRuntimeOrigin(SITE_URL);
    vi.stubGlobal("fetch", vi.fn(async (input: RequestInfo) => {
      if (String(input).includes("/api/admin/access")) {
        return new Response("not-json", { status: 200 });
      }
      return new Response("{}", { status: 500 });
    }));

    render(createElement(SessionHarness));

    expect(await screen.findByRole("alert")).toHaveTextContent(PRODUCTION_ADMIN_UNAUTHORIZED_MESSAGE);
  });

  it("preserves PIN UI on demo origin", async () => {
    vi.stubEnv("NEXT_PUBLIC_APP_URL", "https://demo.abraxasworld.xyz");
    vi.stubEnv("NODE_ENV", "production");
    stubRuntimeOrigin("https://demo.abraxasworld.xyz");
    mockAccessFetch({ authorized: false, method: null });

    render(createElement(SessionHarness));

    expect(await screen.findByPlaceholderText("Admin PIN")).toBeInTheDocument();
    expect(screen.queryByText(PRODUCTION_ADMIN_UNAUTHORIZED_MESSAGE)).not.toBeInTheDocument();
  });

  it("preserves PIN UI on localhost development", async () => {
    vi.stubEnv("NODE_ENV", "development");
    stubRuntimeOrigin("http://localhost:3000");
    mockAccessFetch({ authorized: false, method: null });

    render(createElement(SessionHarness));

    expect(await screen.findByPlaceholderText("Admin PIN")).toBeInTheDocument();
  });

  it("does not flash PIN UI before runtime mode resolves on Production", () => {
    vi.stubEnv("NODE_ENV", "production");
    stubRuntimeOrigin(SITE_URL);
    mockAccessFetch({ authorized: true, method: "email" });

    render(createElement(SessionHarness));

    expect(screen.getByTestId("session-loading")).toBeInTheDocument();
    expect(screen.queryByPlaceholderText("Admin PIN")).not.toBeInTheDocument();
  });

  it("uses credentials without x-admin-pin on Production adminRequest", async () => {
    vi.stubEnv("NODE_ENV", "production");
    stubRuntimeOrigin(SITE_URL);
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

  it("sends x-admin-pin on demo adminRequest when PIN is set", async () => {
    vi.stubEnv("NODE_ENV", "production");
    stubRuntimeOrigin("https://demo.abraxasworld.xyz");
    const fetchMock = vi.fn(async (input: RequestInfo, init?: RequestInit) => {
      const url = String(input);
      if (url.endsWith("/api/admin/partners/onboarding")) {
        expect(new Headers(init?.headers).get("x-admin-pin")).toBe("demo-pin");
        return new Response(JSON.stringify({ partners: [] }), { status: 200 });
      }
      return new Response("{}", { status: 404 });
    });
    vi.stubGlobal("fetch", fetchMock);

    function PinHarness() {
      const gate = useProductionAdminSessionGate();
      if (gate.loading) return null;
      if (!gate.pin) {
        gate.setPin("demo-pin");
        return null;
      }
      void gate.adminRequest("/api/admin/partners/onboarding");
      return createElement("div", null, "ready");
    }

    render(createElement(PinHarness));

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalled();
    });
  });
});
