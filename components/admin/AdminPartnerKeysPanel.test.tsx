// @vitest-environment jsdom
// FILE: components/admin/AdminPartnerKeysPanel.test.tsx

import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AdminPartnerKeysPanel } from "./AdminPartnerKeysPanel";

const fetchMock = vi.fn();

vi.mock("@/lib/admin/useAdminConfirm", () => ({
  useAdminConfirm: () => ({
    requestConfirm: ({ onConfirmed }: { onConfirmed: () => void }) => onConfirmed(),
    confirmDialogProps: { busy: false },
  }),
}));

vi.mock("@/components/admin/AdminConfirmDialog", () => ({
  AdminConfirmDialog: () => null,
}));

beforeEach(() => {
  vi.stubGlobal("fetch", fetchMock);
  fetchMock.mockImplementation(async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input);

    if (url.includes("/api/admin/partner-keys") && (!init?.method || init.method === "GET")) {
      return new Response(JSON.stringify({ keys: [] }), { status: 200 });
    }

    if (url.includes("/api/admin/partners/onboarding")) {
      return new Response(JSON.stringify({
        partner: { allowed_environments: ["sandbox"] },
      }), { status: 200 });
    }

    if (url.includes("/api/admin/partner-keys") && init?.method === "POST") {
      return new Response(JSON.stringify({
        api_key: "abx_test_secret_value_once",
        key: { scopes: ["webhooks:read"] },
      }), { status: 200 });
    }

    return new Response(JSON.stringify({}), { status: 404 });
  });
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.clearAllMocks();
  localStorage.clear();
  sessionStorage.clear();
});

describe("AdminPartnerKeysPanel", () => {
  it("defaults to sandbox environment and webhook sandbox scopes", () => {
    render(<AdminPartnerKeysPanel pin="" />);

    expect(screen.getByTestId("partner-key-env-test")).toHaveStyle({ color: "#10B981" });
    expect(screen.getByTestId("partner-key-scope-webhooks-read")).toBeChecked();
    expect(screen.getByTestId("partner-key-scope-verify-credential")).not.toBeChecked();
  });

  it("disables live issuance for sandbox-only partners after lookup", async () => {
    const user = userEvent.setup();
    render(<AdminPartnerKeysPanel pin="" />);

    await user.type(screen.getByTestId("partner-key-partner-input"), "sandbox-partner");
    await user.tab();

    await screen.findByTestId("partner-key-lookup-message");
    expect(screen.getByTestId("partner-key-env-live")).toBeDisabled();
    expect(screen.getByTestId("partner-key-lookup-message")).toHaveTextContent("Sandbox-only partner");
  });

  it("posts explicit non-empty webhooks:read scopes", async () => {
    const user = userEvent.setup();
    render(<AdminPartnerKeysPanel pin="" />);

    await user.type(screen.getByTestId("partner-key-partner-input"), "sandbox-partner");
    await user.type(screen.getByTestId("partner-key-display-name-input"), "Webhook sandbox");
    await user.click(screen.getByTestId("partner-key-generate-button"));

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        "/api/admin/partner-keys",
        expect.objectContaining({
          method: "POST",
          body: JSON.stringify({
            partner_id: "sandbox-partner",
            display_name: "Webhook sandbox",
            environment: "test",
            scopes: ["webhooks:read"],
          }),
        }),
      );
    });
  });

  it("does not persist the raw key in browser storage", async () => {
    const user = userEvent.setup();
    render(<AdminPartnerKeysPanel pin="" />);

    await user.type(screen.getByTestId("partner-key-partner-input"), "sandbox-partner");
    await user.type(screen.getByTestId("partner-key-display-name-input"), "Webhook sandbox");
    await user.click(screen.getByTestId("partner-key-generate-button"));

    await screen.findByTestId("partner-key-reveal");
    expect(localStorage.getItem("abx_test_secret_value_once")).toBeNull();
    expect(sessionStorage.getItem("abx_test_secret_value_once")).toBeNull();
    expect([...Object.keys(localStorage), ...Object.keys(sessionStorage)]).not.toContain("api_key");
  });
});
