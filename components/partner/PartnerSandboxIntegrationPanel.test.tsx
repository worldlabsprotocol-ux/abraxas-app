// @vitest-environment jsdom
// FILE: components/partner/PartnerSandboxIntegrationPanel.test.tsx

import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { PartnerSandboxIntegrationPanel } from "./PartnerSandboxIntegrationPanel";

vi.mock("./PartnerWebhookSandboxPanel", () => ({
  PartnerWebhookSandboxPanel: ({ enabled }: { enabled?: boolean }) =>
    enabled ? <div data-testid="webhook-sandbox-panel">webhook panel</div> : null,
}));

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

beforeEach(() => {
  vi.spyOn(console, "error").mockImplementation(() => {});
});

describe("PartnerSandboxIntegrationPanel", () => {
  it("renders Partner Flow track with placeholder entry URL", () => {
    render(
      <PartnerSandboxIntegrationPanel
        apiKey="abx_test_secret"
        partnerId="acme-v1"
        scopes={["verify:credential", "verify:registry"]}
      />,
    );

    expect(screen.getByTestId("partner-flow-track")).toBeInTheDocument();
    const template = screen.getByTestId("entry-url-template").textContent ?? "";
    expect(template).toContain("partner_id=acme-v1");
    expect(template).toMatch(/policy_id=%3Cpolicy_id%3E|policy_id=<policy_id>/);
    expect(template).toMatch(/return_url=%3Chttps|return_url=<https/);
    expect(template).not.toContain("abx_test_");
  });

  it("blocks webhook track without webhooks:read and does not mount webhook panel", () => {
    render(
      <PartnerSandboxIntegrationPanel
        apiKey="abx_test_secret"
        partnerId="acme-v1"
        scopes={["verify:credential", "verify:registry"]}
      />,
    );

    expect(screen.getByTestId("webhook-track-blocked")).toBeInTheDocument();
    expect(screen.queryByTestId("webhook-sandbox-panel")).not.toBeInTheDocument();
    expect(screen.queryByTestId("signature-verified-ack")).not.toBeInTheDocument();
  });

  it("mounts webhook panel only when webhooks:read scope is present", () => {
    render(
      <PartnerSandboxIntegrationPanel
        apiKey="abx_test_secret"
        partnerId="acme-v1"
        scopes={["verify:credential", "webhooks:read"]}
      />,
    );

    expect(screen.queryByTestId("webhook-track-blocked")).not.toBeInTheDocument();
    expect(screen.getByTestId("webhook-sandbox-panel")).toBeInTheDocument();
    expect(screen.getByTestId("signature-verified-ack")).toBeInTheDocument();
  });

  it("signature verified acknowledgment is manual session state only", async () => {
    const user = userEvent.setup();
    const setItemSpy = vi.spyOn(Storage.prototype, "setItem");

    render(
      <PartnerSandboxIntegrationPanel
        apiKey="abx_test_secret"
        partnerId="acme-v1"
        scopes={["webhooks:read"]}
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

  it("does not expose API key in rendered output", () => {
    const { container } = render(
      <PartnerSandboxIntegrationPanel
        apiKey="abx_test_super_secret_key_value"
        partnerId="acme-v1"
        scopes={["verify:credential"]}
      />,
    );

    expect(container.textContent).not.toContain("abx_test_super_secret_key_value");
  });
});
