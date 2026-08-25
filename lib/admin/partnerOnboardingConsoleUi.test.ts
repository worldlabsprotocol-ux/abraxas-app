// @vitest-environment jsdom
// FILE: lib/admin/partnerOnboardingConsoleUi.test.ts

import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createElement } from "react";
import { PartnerOnboardingConsole } from "@/components/admin/PartnerOnboardingConsole";

const partner = {
  partner_id: "demo_partner",
  company: "Demo Co",
  status: "pilot",
  is_external: true,
  allowed_environments: ["sandbox"],
  allowed_return_urls: [],
  assigned_policy_id: null,
  use_case: null,
  active_policy: null,
  draft_policy: null,
  readiness: {
    partner_row: "pass" as const,
    active_policy: "pending" as const,
    callback_allowlist: "pending" as const,
    conformance_config: "pending" as const,
    overall: "not_ready" as const,
    blockers: [],
  },
  pilot_checklist: [],
  conformance_command: null,
};

function createAdminRequestFromFetch() {
  return async (input: RequestInfo | URL, init?: RequestInit) => fetch(input, init);
}

function mockOnboardingFetch() {
  vi.stubGlobal("fetch", vi.fn(async (input: RequestInfo, init?: RequestInit) => {
    const url = String(input);
    if (url.endsWith("/api/admin/partners/onboarding") && !init?.method) {
      return new Response(JSON.stringify({ partners: [partner] }), { status: 200 });
    }
    if (url.endsWith("/api/admin/partners/onboarding") && init?.method === "POST") {
      return new Response(JSON.stringify({
        partner: { partner_id: "new_partner", status: "pilot" },
      }), { status: 200 });
    }
    if (url.endsWith("/api/admin/partners/onboarding/return-urls") && init?.method === "POST") {
      return new Response(JSON.stringify({ ok: true, allowed_return_urls: ["https://app.example.com/callback"] }), { status: 200 });
    }
    if (url.endsWith("/api/admin/partners/onboarding/policies") && init?.method === "POST") {
      return new Response(JSON.stringify({
        ok: true,
        policy: { id: "policy_v1", version: 1 },
      }), { status: 200 });
    }
    return new Response(JSON.stringify({ partners: [partner] }), { status: 200 });
  }));
}

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

beforeEach(() => {
  vi.spyOn(console, "error").mockImplementation(() => {});
});

describe("PartnerOnboardingConsole notices", () => {
  it("shows notice after creating a pilot partner", async () => {
    mockOnboardingFetch();
    render(createElement(PartnerOnboardingConsole, { adminRequest: createAdminRequestFromFetch() }));
    await screen.findByText("Demo Co");

    const user = userEvent.setup();
    await user.type(screen.getByPlaceholderText("partner_id"), "new_partner");
    await user.type(screen.getByPlaceholderText("Company name"), "New Co");
    await user.click(screen.getByRole("button", { name: "Create pilot partner" }));

    await waitFor(() => {
      expect(screen.getByText(/Pilot partner created: new_partner \(New Co\)/i)).toBeInTheDocument();
    });
  });

  it("shows notice after saving a callback URL", async () => {
    mockOnboardingFetch();
    render(createElement(PartnerOnboardingConsole, { adminRequest: createAdminRequestFromFetch() }));
    await screen.findByText("Demo Co");

    const user = userEvent.setup();
    await user.type(
      screen.getByPlaceholderText("https://your-app.example.com/auth/abraxas/callback"),
      "https://app.example.com/callback",
    );
    await user.click(screen.getByRole("button", { name: "Add URL" }));

    await waitFor(() => {
      expect(screen.getByText(/Callback URL saved for demo_partner/i)).toBeInTheDocument();
    });
  });

  it("shows notice after creating a policy draft", async () => {
    mockOnboardingFetch();
    render(createElement(PartnerOnboardingConsole, { adminRequest: createAdminRequestFromFetch() }));
    await screen.findByText("Demo Co");

    const user = userEvent.setup();
    await user.type(screen.getByPlaceholderText("policy_id (e.g. your-protocol-policy-v1)"), "policy_v1");
    await user.click(screen.getByRole("button", { name: "Create draft policy" }));

    await waitFor(() => {
      expect(screen.getByText(/Draft policy created: policy_v1 v1 for demo_partner/i)).toBeInTheDocument();
    });
  });

  it("clears notice when switching partners", async () => {
    const partners = [
      partner,
      { ...partner, partner_id: "other_partner", company: "Other Co" },
    ];
    vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify({ partners }), { status: 200 })));

    render(createElement(PartnerOnboardingConsole, { adminRequest: createAdminRequestFromFetch() }));
    await screen.findByText("Demo Co");

    const user = userEvent.setup();
    await user.type(screen.getByPlaceholderText("partner_id"), "new_partner");
    await user.type(screen.getByPlaceholderText("Company name"), "New Co");
    await user.click(screen.getByRole("button", { name: "Create pilot partner" }));
    await screen.findByText(/Pilot partner created/i);

    await user.click(screen.getByRole("button", { name: /Other Co/i }));
    expect(screen.queryByText(/Pilot partner created/i)).not.toBeInTheDocument();
  });
});
