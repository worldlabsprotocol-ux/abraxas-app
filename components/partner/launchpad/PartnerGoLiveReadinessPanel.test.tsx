// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { PartnerGoLiveReadinessPanel } from "./PartnerGoLiveReadinessPanel";

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe("PartnerGoLiveReadinessPanel", () => {
  it("does not advertise automatic production activation", () => {
    vi.stubGlobal("fetch", vi.fn(async () => ({
      ok: true,
      json: async () => ({
        lifecycle: "needs_setup",
        lifecycle_label: "Needs setup",
        policy_id: "acme-age_21_retail-v1",
        policy_version: 1,
        sandbox_key_configured: true,
        can_request_review: false,
        checks: [],
        next_steps: [],
        production: { notice: "Review only." },
      }),
    })));
    render(<PartnerGoLiveReadinessPanel applicationId="app-1" />);
    expect(screen.getByText("Go-live readiness")).toBeTruthy();
    expect(screen.queryByText(/Activate production automatically/i)).toBeNull();
    expect(screen.queryByText(/judge/i)).toBeNull();
  });
});
