// @vitest-environment jsdom

import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import PartnerPortalPage from "./page";

const FULL_API_KEY = "abx_test_secret_key_value_once_only";

describe("PartnerPortalPage API key handling", () => {
  const sessionStorageSet = vi.spyOn(Storage.prototype, "setItem");
  const sessionStorageGet = vi.spyOn(Storage.prototype, "getItem");
  const localStorageSet = vi.spyOn(Storage.prototype, "setItem");

  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify({
      dashboard: {
        partner_id: "partner-1",
        display_name: "Partner",
        company: null,
        status: "active",
        key_prefix: "abx_test_…abc",
        scopes: ["verify:credential"],
        stats: { calls_30d: 0, success_30d: 0, success_rate: null, calls_7d: 0 },
        recent_events: [],
        onboarding: { steps: [], completed_count: 0, total_count: 0 },
        readiness: { ready: false, blockers: [], warnings: [] },
        mainnet_gate: { eligible: false, criteria: "sandbox" },
      },
    }), { status: 200 })));
    sessionStorage.clear();
    localStorage.clear();
    sessionStorageSet.mockClear();
    sessionStorageGet.mockClear();
    localStorageSet.mockClear();
  });

  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("never persists the full API key in browser storage", async () => {
    const user = userEvent.setup();
    render(<PartnerPortalPage />);

    const input = screen.getByPlaceholderText(/abx_test_/i);
    await user.type(input, FULL_API_KEY);
    await user.click(screen.getByRole("button", { name: "View dashboard" }));

    await waitFor(() => {
      expect(screen.getByText(/Partner/)).toBeInTheDocument();
    });

    const storageWrites = [
      ...sessionStorageSet.mock.calls,
      ...localStorageSet.mock.calls,
    ].map((call) => String(call[1] ?? ""));

    expect(storageWrites.some((value) => value.includes(FULL_API_KEY))).toBe(false);
    expect(sessionStorageGet).not.toHaveBeenCalled();
  });
});
