// @vitest-environment jsdom
// FILE: components/partner/PartnerPortalAuthenticatedView.test.tsx

import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { CapabilityAwarePortalOnboarding } from "@/lib/partner/partnerPortalCapabilities";
import type { PartnerDashboardReadiness } from "@/lib/partner/partnerPortalReadiness";
import { PartnerPortalAuthenticatedView } from "./PartnerPortalAuthenticatedView";

vi.mock("./PartnerSandboxIntegrationPanel", () => ({
  PartnerSandboxIntegrationPanel: () => <div data-testid="integration-panel-stub" />,
}));

const baseReadiness: PartnerDashboardReadiness = {
  partner_row_ready: true,
  assigned_policy_configured: true,
  active_sandbox_policy_ready: true,
  active_policy_id: "sandbox-policy-v1",
  active_policy_ambiguous: false,
  callback_allowlist_configured: true,
  partner_flow_config_ready: true,
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

const baseOnboarding: CapabilityAwarePortalOnboarding = {
  steps: [
    {
      id: "key_authenticated",
      title: "API key authenticated",
      description: "Signed in.",
      done: true,
    },
  ],
  completed: 1,
  total: 1,
};

const baseProps = {
  apiKey: "abx_test_secret",
  partnerId: "acme-v1",
  company: "Acme Co",
  status: "pilot",
  keyPrefix: "abx_test_abc",
  stats: {
    calls_30d: 0,
    success_30d: 0,
    success_rate: null,
    calls_7d: 0,
  },
  recentEvents: [],
  mainnetGate: {
    eligible: false,
    criteria: "Unaffiliated abx_live_ partner with decision: approved on a production verify call.",
  },
  onLogout: vi.fn(),
};

function renderView(overrides: {
  scopes?: string[];
  readiness?: PartnerDashboardReadiness;
  onboarding?: CapabilityAwarePortalOnboarding;
} = {}) {
  const scopes = overrides.scopes ?? ["verify:credential"];
  const readiness = overrides.readiness ?? {
    ...baseReadiness,
    verify_scopes_available: scopes.some((scope) => scope === "verify:credential" || scope === "verify:registry"),
  };

  return render(
    <PartnerPortalAuthenticatedView
      {...baseProps}
      scopes={scopes}
      readiness={readiness}
      onboarding={overrides.onboarding ?? baseOnboarding}
    />,
  );
}

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

beforeEach(() => {
  vi.spyOn(console, "error").mockImplementation(() => {});
});

describe("PartnerPortalAuthenticatedView", () => {
  it("hides Mainnet gate for sandbox webhook-only keys", () => {
    renderView({
      scopes: ["webhooks:read"],
      readiness: {
        ...baseReadiness,
        verify_scopes_available: false,
        key_environment: "sandbox",
        webhook_track: {
          applicable: true,
          scope_ready: true,
          endpoint_configured: true,
          delivery_enabled: true,
          sandbox_test_available: true,
        },
      },
      onboarding: {
        steps: [
          { id: "key_authenticated", title: "API key authenticated", description: "Signed in.", done: true },
          { id: "webhook_endpoint_configured", title: "Webhook endpoint configured", description: "Ops.", done: true },
          { id: "webhook_delivery_enabled", title: "Webhook delivery enabled", description: "Ops.", done: true },
          { id: "webhook_sandbox_test_available", title: "Sandbox test enqueue available", description: "Ops.", done: true },
        ],
        completed: 4,
        total: 4,
      },
    });

    expect(screen.queryByTestId("mainnet-gate-card")).not.toBeInTheDocument();
  });

  it("hides Mainnet gate for sandbox verify keys", () => {
    renderView({
      scopes: ["verify:credential"],
      readiness: {
        ...baseReadiness,
        key_environment: "sandbox",
      },
    });

    expect(screen.queryByTestId("mainnet-gate-card")).not.toBeInTheDocument();
  });

  it("shows Mainnet gate for production verify keys", () => {
    renderView({
      scopes: ["verify:credential"],
      readiness: {
        ...baseReadiness,
        key_environment: "production",
      },
    });

    expect(screen.getByTestId("mainnet-gate-card")).toBeInTheDocument();
    expect(screen.getByText("Mainnet gate #5")).toBeInTheDocument();
  });

  it("hides Mainnet gate for production webhook-only keys", () => {
    renderView({
      scopes: ["webhooks:read"],
      readiness: {
        ...baseReadiness,
        verify_scopes_available: false,
        key_environment: "production",
        webhook_track: {
          applicable: true,
          scope_ready: true,
          endpoint_configured: true,
          delivery_enabled: true,
          sandbox_test_available: true,
        },
      },
    });

    expect(screen.queryByTestId("mainnet-gate-card")).not.toBeInTheDocument();
  });

  it("shows webhook-only onboarding headline with the correct denominator", () => {
    renderView({
      scopes: ["webhooks:read"],
      readiness: {
        ...baseReadiness,
        verify_scopes_available: false,
        webhook_track: {
          applicable: true,
          scope_ready: true,
          endpoint_configured: true,
          delivery_enabled: false,
          sandbox_test_available: false,
        },
      },
      onboarding: {
        steps: [
          { id: "key_authenticated", title: "API key authenticated", description: "Signed in.", done: true },
          { id: "webhook_endpoint_configured", title: "Webhook endpoint configured", description: "Ops.", done: true },
          { id: "webhook_delivery_enabled", title: "Webhook delivery enabled", description: "Ops.", done: false },
          { id: "webhook_sandbox_test_available", title: "Sandbox test enqueue available", description: "Ops.", done: false },
        ],
        completed: 2,
        total: 4,
      },
    });

    expect(screen.getByTestId("onboarding-headline").textContent).toContain("2/4");
    expect(screen.getByTestId("onboarding-headline").textContent).not.toContain("/8");
    expect(screen.getByTestId("onboarding-headline").textContent).not.toContain("/6");
  });

  it("hides Test verifier link for webhook-only keys", () => {
    renderView({
      scopes: ["webhooks:read"],
      readiness: {
        ...baseReadiness,
        verify_scopes_available: false,
        webhook_track: {
          applicable: true,
          scope_ready: true,
          endpoint_configured: false,
          delivery_enabled: false,
          sandbox_test_available: false,
        },
      },
    });

    expect(screen.queryByRole("link", { name: /Test verifier/i })).not.toBeInTheDocument();
  });

  it("shows Test verifier link for verify-capable keys", () => {
    renderView({
      scopes: ["verify:credential"],
      readiness: {
        ...baseReadiness,
        key_environment: "sandbox",
      },
    });

    expect(screen.getByRole("link", { name: /Test verifier/i })).toBeInTheDocument();
  });

  it("shows 1/1 unsupported-scope onboarding guidance", () => {
    renderView({
      scopes: [],
      readiness: {
        ...baseReadiness,
        verify_scopes_available: false,
        webhook_track: {
          applicable: false,
          scope_ready: false,
          endpoint_configured: false,
          delivery_enabled: false,
          sandbox_test_available: false,
        },
      },
      onboarding: {
        steps: [
          { id: "key_authenticated", title: "API key authenticated", description: "Signed in.", done: true },
        ],
        completed: 1,
        total: 1,
      },
    });

    expect(screen.getByTestId("onboarding-headline").textContent).toContain("1/1");
    expect(screen.getByTestId("portal-capability-notice").textContent).toMatch(/does not include Partner Flow/i);
    expect(screen.queryByTestId("mainnet-gate-card")).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /Test verifier/i })).not.toBeInTheDocument();
  });
});
