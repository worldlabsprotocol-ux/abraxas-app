// @vitest-environment jsdom
// FILE: components/partner/PartnerSandboxIntegrationPanel.test.tsx

import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { PartnerDashboardReadiness } from "@/lib/partner/partnerPortalReadiness";
import { PartnerSandboxIntegrationPanel } from "./PartnerSandboxIntegrationPanel";

vi.mock("./PartnerWebhookSandboxPanel", () => ({
  PartnerWebhookSandboxPanel: ({ enabled }: { enabled?: boolean }) =>
    enabled ? <div data-testid="webhook-sandbox-panel">webhook panel</div> : null,
}));

const baseReadiness: PartnerDashboardReadiness = {
  partner_row_ready: false,
  assigned_policy_configured: false,
  active_sandbox_policy_ready: false,
  active_policy_id: null,
  active_policy_ambiguous: false,
  callback_allowlist_configured: false,
  partner_flow_config_ready: false,
  verify_scopes_available: true,
  key_environment: "sandbox",
  webhook_track: {
    applicable: false,
    scope_ready: false,
    endpoint_configured: false,
    delivery_enabled: false,
    sandbox_test_available: false,
  },
  sandbox_notice: "Sandbox configuration cannot authorize Production access.",
};

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

beforeEach(() => {
  vi.spyOn(console, "error").mockImplementation(() => {});
});

describe("PartnerSandboxIntegrationPanel", () => {
  it("renders Partner Flow entry fields with placeholders when policy is not ready", () => {
    render(
      <PartnerSandboxIntegrationPanel
        apiKey="abx_test_secret"
        partnerId="acme-v1"
        scopes={["verify:credential", "verify:registry"]}
        readiness={baseReadiness}
      />,
    );

    expect(screen.getByTestId("entry-url-fields")).toBeInTheDocument();
    expect(screen.getByTestId("entry-field-partner_id").textContent).toContain("acme-v1");
    expect(screen.getByTestId("entry-field-policy_id").textContent).toContain("<policy_id>");
    expect(screen.getByTestId("entry-field-return_url").textContent).toContain("Abraxas ops supplies");
    expect(screen.queryByTestId("entry-url-template")).not.toBeInTheDocument();
  });

  it("shows assigned active_policy_id when readiness provides it", () => {
    render(
      <PartnerSandboxIntegrationPanel
        apiKey="abx_test_secret"
        partnerId="acme-v1"
        scopes={["verify:credential", "verify:registry"]}
        readiness={{
          ...baseReadiness,
          active_policy_id: "sandbox-policy-v1",
          active_sandbox_policy_ready: true,
        }}
      />,
    );

    expect(screen.getByTestId("entry-field-policy_id").textContent).toContain("sandbox-policy-v1");
    expect(screen.getByTestId("entry-field-policy_id").textContent).not.toContain("<policy_id>");
  });

  it("shows ambiguous policy warning without exposing foreign identifiers", () => {
    const { container } = render(
      <PartnerSandboxIntegrationPanel
        apiKey="abx_test_secret"
        partnerId="acme-v1"
        scopes={["verify:credential"]}
        readiness={{
          ...baseReadiness,
          active_policy_ambiguous: true,
        }}
      />,
    );

    expect(screen.getByTestId("policy-ambiguous-warning")).toBeInTheDocument();
    expect(container.textContent).not.toContain("foreign-policy");
  });

  it("hides Partner Flow track for webhook-only keys", () => {
    render(
      <PartnerSandboxIntegrationPanel
        apiKey="abx_test_secret"
        partnerId="acme-v1"
        scopes={["webhooks:read"]}
        readiness={{
          ...baseReadiness,
          verify_scopes_available: false,
          webhook_track: {
            applicable: true,
            scope_ready: true,
            endpoint_configured: true,
            delivery_enabled: true,
            sandbox_test_available: false,
          },
        }}
      />,
    );

    expect(screen.queryByTestId("partner-flow-track")).not.toBeInTheDocument();
    expect(screen.getByTestId("webhook-track")).toBeInTheDocument();
    expect(screen.getByTestId("webhook-sandbox-panel")).toBeInTheDocument();
    expect(screen.getByTestId("signature-verified-ack")).toBeInTheDocument();
  });

  it("hides webhook track and panel for verify-only keys", () => {
    render(
      <PartnerSandboxIntegrationPanel
        apiKey="abx_test_secret"
        partnerId="acme-v1"
        scopes={["verify:credential", "verify:registry"]}
        readiness={baseReadiness}
      />,
    );

    expect(screen.getByTestId("partner-flow-track")).toBeInTheDocument();
    expect(screen.queryByTestId("webhook-track")).not.toBeInTheDocument();
    expect(screen.queryByTestId("webhook-sandbox-panel")).not.toBeInTheDocument();
    expect(screen.queryByTestId("signature-verified-ack")).not.toBeInTheDocument();
  });

  it("shows both tracks for combined-scope keys", () => {
    render(
      <PartnerSandboxIntegrationPanel
        apiKey="abx_test_secret"
        partnerId="acme-v1"
        scopes={["verify:credential", "webhooks:read"]}
        readiness={{
          ...baseReadiness,
          webhook_track: {
            applicable: true,
            scope_ready: true,
            endpoint_configured: true,
            delivery_enabled: true,
            sandbox_test_available: false,
          },
        }}
      />,
    );

    expect(screen.getByTestId("partner-flow-track")).toBeInTheDocument();
    expect(screen.getByTestId("webhook-track")).toBeInTheDocument();
    expect(screen.getByTestId("webhook-sandbox-panel")).toBeInTheDocument();
  });

  it("shows unsupported-scope guidance without integration tracks", () => {
    render(
      <PartnerSandboxIntegrationPanel
        apiKey="abx_test_secret"
        partnerId="acme-v1"
        scopes={[]}
        readiness={{
          ...baseReadiness,
          verify_scopes_available: false,
        }}
      />,
    );

    expect(screen.getByTestId("unsupported-scope")).toBeInTheDocument();
    expect(screen.queryByTestId("partner-flow-track")).not.toBeInTheDocument();
    expect(screen.queryByTestId("webhook-track")).not.toBeInTheDocument();
    expect(screen.queryByTestId("webhook-sandbox-panel")).not.toBeInTheDocument();
  });

  it("includes other-keys scope disclaimer", () => {
    render(
      <PartnerSandboxIntegrationPanel
        apiKey="abx_test_secret"
        partnerId="acme-v1"
        scopes={["webhooks:read"]}
        readiness={{
          ...baseReadiness,
          verify_scopes_available: false,
          webhook_track: {
            applicable: true,
            scope_ready: true,
            endpoint_configured: false,
            delivery_enabled: false,
            sandbox_test_available: false,
          },
        }}
      />,
    );

    expect(screen.getByTestId("portal-scope-disclaimer").textContent).toMatch(/other keys/i);
  });

  it("signature verified acknowledgment is manual session state only", async () => {
    const user = userEvent.setup();
    const setItemSpy = vi.spyOn(Storage.prototype, "setItem");

    render(
      <PartnerSandboxIntegrationPanel
        apiKey="abx_test_secret"
        partnerId="acme-v1"
        scopes={["webhooks:read"]}
        readiness={{
          ...baseReadiness,
          verify_scopes_available: false,
          webhook_track: {
            applicable: true,
            scope_ready: true,
            endpoint_configured: false,
            delivery_enabled: false,
            sandbox_test_available: false,
          },
        }}
      />,
    );

    const checkbox = screen.getByRole("checkbox");
    expect(checkbox).not.toBeChecked();

    await user.click(checkbox);
    expect(checkbox).toBeChecked();

    const storageCalls = setItemSpy.mock.calls.filter(([key]) =>
      String(key).includes("signature") || String(key).includes("webhook"),
    );
    expect(storageCalls).toHaveLength(0);
  });

  it("does not expose API key or callback URLs in rendered output", () => {
    const { container } = render(
      <PartnerSandboxIntegrationPanel
        apiKey="abx_test_super_secret_key_value"
        partnerId="acme-v1"
        scopes={["verify:credential"]}
        readiness={{
          ...baseReadiness,
          callback_allowlist_configured: true,
        }}
      />,
    );

    expect(container.textContent).not.toContain("abx_test_super_secret_key_value");
    expect(container.textContent).not.toContain("https://app.example.com");
  });
});
