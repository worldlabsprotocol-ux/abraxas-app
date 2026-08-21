// @vitest-environment jsdom
// FILE: lib/admin/partnerFlowReadinessUi.test.tsx

import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createElement } from "react";
import { PartnerFlowProductionReadinessPanel } from "@/components/admin/PartnerFlowProductionReadinessPanel";
import AdminPartnerFlowReadinessPage from "@/app/admin/partner-flow/readiness/page";
import * as adminFetchModule from "@/lib/admin/adminFetch";
import {
  parseProvisioningPreflightResponse,
  parseSigningHealthResponse,
  provisioningPreflightCheckItems,
  signingHealthCheckItems,
} from "@/lib/admin/partnerFlowReadinessUi";

const signingHealthOk = {
  ok: true,
  signing_key_configured: true,
  signing_key_parse_ok: true,
  public_key_configured: true,
  public_key_parse_ok: true,
  seed_matches_embedded_x: true,
  seed_matches_public_env: true,
  receipt_env_roundtrip_ok: true,
  production_origin_exact: true,
  demo_sandbox_flag_disabled: true,
  demo_subject_id_unset: true,
  signing_key_not_demo_key: true,
  browser_session_secret_configured: true,
};

const preflightNotReady = {
  ok: false,
  query_valid: true,
  partner_row_exists: false,
  partner_status_usable: false,
  partner_is_external: false,
  return_urls_configured: false,
  return_url_allowlisted: false,
  policy_row_exists: false,
  policy_active: false,
  policy_partner_match: false,
  policy_not_sandbox: false,
  onboarding_fields_present: false,
};

const preflightReady = {
  ...preflightNotReady,
  ok: true,
  partner_row_exists: true,
  partner_status_usable: true,
  partner_is_external: true,
  return_urls_configured: true,
  return_url_allowlisted: true,
  policy_row_exists: true,
  policy_active: true,
  policy_partner_match: true,
  policy_not_sandbox: true,
  onboarding_fields_present: true,
};

function mockAdminFetch(handlers: {
  signingHealth?: Response;
  preflight?: Response;
}) {
  vi.spyOn(adminFetchModule, "adminFetch").mockImplementation(async (url) => {
    const path = String(url);
    if (path.includes("/api/admin/partner-flow/signing-health")) {
      return handlers.signingHealth ?? new Response(JSON.stringify(signingHealthOk), { status: 200 });
    }
    if (path.includes("/api/admin/partner-flow/provisioning-preflight")) {
      return handlers.preflight ?? new Response(JSON.stringify(preflightNotReady), { status: 200 });
    }
    return new Response(JSON.stringify({ error: "Not found" }), { status: 404 });
  });
}

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

beforeEach(() => {
  vi.spyOn(console, "error").mockImplementation(() => {});
});

describe("partnerFlowReadinessUi parsers", () => {
  it("keeps client key sets aligned with server readiness endpoints", async () => {
    const [{ PRODUCTION_SIGNING_HEALTH_KEYS }, { PROVISIONING_PREFLIGHT_KEYS }] = await Promise.all([
      import("@/lib/admin/productionEnvironmentDiagnostics"),
      import("@/lib/admin/partnerProvisioningPreflight"),
    ]);
    expect(PRODUCTION_SIGNING_HEALTH_KEYS.size).toBe(13);
    expect(PROVISIONING_PREFLIGHT_KEYS.size).toBe(12);
  });

  it("accepts boolean-only signing health payloads", () => {
    const report = parseSigningHealthResponse(signingHealthOk);
    expect(report.ok).toBe(true);
    expect(signingHealthCheckItems(report)).toHaveLength(12);
  });

  it("accepts boolean-only provisioning preflight payloads", () => {
    const report = parseProvisioningPreflightResponse(preflightReady);
    expect(report.ok).toBe(true);
    expect(provisioningPreflightCheckItems(report).every((item) => item.pass)).toBe(true);
  });
});

describe("PartnerFlowProductionReadinessPanel", () => {
  it("loads signing health checks for signed-in Production session", async () => {
    mockAdminFetch({});
    render(createElement(PartnerFlowProductionReadinessPanel));

    expect(await screen.findByText("Production readiness check — does not provision a partner.")).toBeInTheDocument();
    expect(await screen.findByText("Environment & signing")).toBeInTheDocument();
    expect(await screen.findByText("Receipt signing key is configured")).toBeInTheDocument();
    expect(screen.getByText("Ready")).toBeInTheDocument();
  });

  it("shows Google sign-in guidance on 401", async () => {
    mockAdminFetch({
      signingHealth: new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 }),
    });
    render(createElement(PartnerFlowProductionReadinessPanel));

    expect(await screen.findByRole("alert")).toHaveTextContent("Sign in with an authorized Google account");
  });

  it("shows unavailable guidance on 404", async () => {
    mockAdminFetch({
      signingHealth: new Response(JSON.stringify({ error: "Not found" }), { status: 404 }),
    });
    render(createElement(PartnerFlowProductionReadinessPanel));

    expect(await screen.findByRole("alert")).toHaveTextContent("unavailable outside Production");
  });

  it("renders preflight failure and success after explicit admin action", async () => {
    const fetchSpy = vi.spyOn(adminFetchModule, "adminFetch");
    fetchSpy.mockImplementation(async (url) => {
      const path = String(url);
      if (path.includes("signing-health")) {
        return new Response(JSON.stringify(signingHealthOk), { status: 200 });
      }
      if (path.includes("provisioning-preflight")) {
        return new Response(JSON.stringify(preflightNotReady), { status: 200 });
      }
      return new Response(JSON.stringify({ error: "Not found" }), { status: 404 });
    });

    render(createElement(PartnerFlowProductionReadinessPanel));
    await screen.findByText("Environment & signing");

    const user = userEvent.setup();
    await user.type(screen.getByPlaceholderText("partner_id"), "good-trouble-cannabis");
    await user.type(screen.getByPlaceholderText("policy_id"), "good-trouble-retail-v1");
    await user.type(screen.getByPlaceholderText("https://…"), "https://abraxasworld.xyz/good-trouble/enter");
    await user.click(screen.getByRole("button", { name: "Run provisioning preflight" }));

    expect(await screen.findByText("Provisioning readiness")).toBeInTheDocument();
    expect(screen.getByText("Partner record exists")).toBeInTheDocument();
    expect(screen.getAllByText("Not ready").length).toBeGreaterThan(0);

    fetchSpy.mockImplementation(async (url) => {
      const path = String(url);
      if (path.includes("signing-health")) {
        return new Response(JSON.stringify(signingHealthOk), { status: 200 });
      }
      if (path.includes("provisioning-preflight")) {
        return new Response(JSON.stringify(preflightReady), { status: 200 });
      }
      return new Response(JSON.stringify({ error: "Not found" }), { status: 404 });
    });

    await user.click(screen.getByRole("button", { name: "Run provisioning preflight" }));

    await waitFor(() => {
      expect(screen.getAllByText("Ready").length).toBeGreaterThan(1);
    });
    expect(fetchSpy.mock.calls.some(([url]) => String(url).includes("provisioning-preflight"))).toBe(true);
    expect(fetchSpy.mock.calls.some(([url]) => String(url).includes("signing-health"))).toBe(true);
  });

  it("does not render any PIN UI", async () => {
    mockAdminFetch({});
    const { container } = render(createElement(PartnerFlowProductionReadinessPanel));
    await screen.findByText("Environment & signing");

    expect(container.textContent?.toLowerCase()).not.toContain("admin pin");
    expect(screen.queryByPlaceholderText("Admin PIN")).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/pin/i)).not.toBeInTheDocument();
  });
});

describe("AdminPartnerFlowReadinessPage", () => {
  it("does not render PIN UI on the page shell", () => {
    mockAdminFetch({});
    const { container } = render(createElement(AdminPartnerFlowReadinessPage));
    expect(container.textContent).toContain("Production Partner Activation");
    expect(container.textContent?.toLowerCase()).not.toContain("admin pin");
    expect(screen.queryByPlaceholderText("Admin PIN")).not.toBeInTheDocument();
  });
});
