// @vitest-environment jsdom
import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { cleanup, render, waitFor } from "@testing-library/react";
import { createElement } from "react";
import { PolicyChangeControlLaunchpadSlot } from "@/components/partner/launchpad/PolicyChangeControlLaunchpadSlot";

describe("PolicyChangeControlLaunchpadSlot dark-launch", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    global.fetch = vi.fn(async () => new Response(JSON.stringify({
      ok: true,
      policy_id: "policy-v1",
      pinned_version: 1,
      active: {
        version: 1, status: "active", name: "Age 21", required_claims: ["identity_verified"],
        assurance_level: "L2", purpose: [], result_fields: ["identity_verified"], withheld_fields: [],
      },
      draft: null, comparison: null, applications: [],
      next_action: "No policy version action required.",
      blocker_code: null,
      fixture_label: "Offline / simulated",
      google_sign_in_is_not_eligibility: "Google sign-in",
      audit: [],
    }), { status: 200 })) as typeof fetch;
  });

  afterEach(() => {
    cleanup();
  });

  it("does not display or request Policies for Production-style missing schema", async () => {
    const { queryByRole } = render(createElement(PolicyChangeControlLaunchpadSlot, {
      available: false,
      applicationId: "app-1",
    }));
    await waitFor(() => {
      expect(queryByRole("heading", { name: "Policies" })).toBeNull();
    });
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it("displays and requests Policies for DEMO-style present schema", async () => {
    const { findByRole } = render(createElement(PolicyChangeControlLaunchpadSlot, {
      available: true,
      applicationId: "app-1",
    }));
    expect(await findByRole("heading", { name: "Policies" })).toBeTruthy();
    expect(String((global.fetch as ReturnType<typeof vi.fn>).mock.calls[0]?.[0])).toContain(
      "/api/launchpad/applications/app-1/policies",
    );
  });
});
