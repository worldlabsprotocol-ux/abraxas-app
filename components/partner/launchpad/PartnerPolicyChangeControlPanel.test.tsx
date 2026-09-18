// @vitest-environment jsdom
import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { cleanup, render, waitFor } from "@testing-library/react";
import { createElement } from "react";
import { PartnerPolicyChangeControlPanel } from "@/components/partner/launchpad/PartnerPolicyChangeControlPanel";

describe("PartnerPolicyChangeControlPanel dark-launch", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    global.fetch = vi.fn(async () => new Response(JSON.stringify({ ok: true }), { status: 200 })) as typeof fetch;
  });

  afterEach(() => {
    cleanup();
  });

  it("does not render the Policies card or fetch when schema is unavailable", async () => {
    const { queryByText } = render(createElement(PartnerPolicyChangeControlPanel, {
      applicationId: "app-1",
      enabled: false,
    }));
    await waitFor(() => {
      expect(queryByText("Policies")).toBeNull();
    });
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it("loads the Policies overview when DEMO schema is available", async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue(new Response(JSON.stringify({
      ok: true,
      policy_id: "policy-v1",
      pinned_version: 1,
      active: {
        version: 1,
        status: "active",
        name: "Age 21",
        required_claims: ["identity_verified"],
        assurance_level: "L2",
        purpose: [],
        result_fields: ["identity_verified"],
        withheld_fields: ["date of birth"],
      },
      draft: null,
      comparison: null,
      applications: [],
      next_action: "No policy version action required.",
      blocker_code: null,
      fixture_label: "Offline / simulated — this does not issue a production receipt.",
      google_sign_in_is_not_eligibility: "Google sign-in creates an Abraxas account.",
      audit: [],
    }), { status: 200 }));

    const { findByText } = render(createElement(PartnerPolicyChangeControlPanel, {
      applicationId: "app-1",
      enabled: true,
    }));
    expect(await findByText("Policies")).toBeTruthy();
    expect(await findByText(/pinned/i)).toBeTruthy();
    expect(String((global.fetch as ReturnType<typeof vi.fn>).mock.calls[0]?.[0])).toContain(
      "/api/launchpad/applications/app-1/policies",
    );
  });
});
